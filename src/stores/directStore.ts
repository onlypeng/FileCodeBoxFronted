/**
 * 临时房间的全部内存态：成员、聊天流、历史分页、缓存文件与多源合并计划。
 * 放进 Pinia 而非组件局部状态，是因为 WebSocket 回调、HTTP 响应、多个面板都要
 * 写同一份数据；组件卸载（切页面）也不该丢掉房间上下文。
 *
 * 刻意不做：Blob/OPFS 文件句柄、合并计划、成员令牌都只在内存里，绝不进 localStorage
 * （体积大、且是会话级凭据）；聊天流上限 300 条、合并计划带 TTL 清扫，防止长房间
 * 把内存吃满。仅昵称这类偏好由 preference-storage 单独持久化。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DirectService } from '@/services/direct'
import { STORAGE_KEYS } from '@/constants'
import { readPreference } from '@/utils/preference-storage'
import { hashBlob } from '@/utils/hash-worker'
import { Sha256 } from '@/utils/sha256'
import type {
  CreateDirectRoomRequest,
  DirectChatItem,
  DirectMember,
  DirectRoomInfo,
  DirectTransferMode,
  FileRecipient,
  RoomCacheFile,
} from '@/types/direct'

const MAX_ITEMS = 300 // 内存中最多保留的聊天流条目
const OPFS_MIN_SIZE = 4 * 1024 * 1024 // 超过 4MB 的文件走 OPFS 流式落盘，避免内存翻倍

/** 文件条目上的内部字段（非响应式，仅内部读写） */
interface InternalFileItem {
  _blob?: Blob
  _opfsHandle?: FileSystemFileHandle
  _assembled?: boolean
}

let uidCounter = 0
function genUid(prefix = 'id'): string {
  uidCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}-${Math.random().toString(36).slice(2, 6)}`
}

function myNickname(): string {
  return readPreference(STORAGE_KEYS.DIRECT_NICKNAME, '匿名')
}

/** OPFS（源私有文件系统）是否可用：安全上下文 + 现代浏览器 */
function supportsOpfs(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof (navigator.storage as unknown as { getDirectory?: unknown }).getDirectory === 'function'
  )
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

export const useDirectStore = defineStore('direct', () => {
  // ==================== 房间状态 ====================
  const activeRoom = ref<DirectRoomInfo | null>(null)
  const members = ref<DirectMember[]>([]) // 在线成员（含自己）
  const isConnected = ref(false)
  const myClientId = ref('')
  /**
   * 房间成员令牌（welcome 时由服务端下发，短期有效）。
   * 用于 HTTP 接口在 WS 断开期间仍能证明"我是本房间成员"，
   * 避免切后台/弱网重连后就管不了自己刚上传的文件。
   */
  const memberToken = ref('')
  const p2pActive = ref(false) // 是否已有可用的直连通道

  // ==================== 聊天流 ====================
  const items = ref<DirectChatItem[]>([])
  const typingUsers = ref<string[]>([])
  // 历史记录（save_messages 房间：进入时加载 /room/history，只读展示在实时流上方）
  const historyItems = ref<DirectChatItem[]>([])
  const historyLoadedCode = ref('')
  /** 是否还有更早的历史可加载（上滑到顶时分页拉取，微信式） */
  const historyHasMore = ref(false)
  // 进出房间等轻量事件：悬浮几秒自动消失（不占聊天流）
  const roomEvents = ref<Array<{ id: number; content: string }>>([])

  // ==================== 房间文件缓存（cache_enabled=1 时由服务器下发/广播） ====================
  /** 房间已缓存文件列表：{ transfer_id, file_name, file_size, holders[], holder_names[] } */
  const cachedFiles = ref<RoomCacheFile[]>([])

  /** 多源加速合并计划：tid -> { 文件名/大小/分段数/已收分片(k->Blob)/分片传输id(k->partTransferId)/发起时间 } */
  const cacheMergePlans = new Map<string, {
    name: string
    size: number
    total: number
    received: Map<number, Blob>
    partTransferIds: Map<number, string>
    startedAt: number
    /** 服务端下发的整文件 SHA-256；空串表示无法校验 */
    hash: string
  }>()

  /**
   * 我主动发起的"从缓存源收取"的 transfer_id 集合。
   *
   * 用途：收到的 file_offer 若带 cache_source，只有它在这个集合里才允许自动接受。
   * 否则任何房间成员都能伪造一条带 cache_source 的 offer，让受害者在没有点过
   * "接受"的情况下被动开始接收文件（吃带宽与磁盘）。
   */
  const myCacheRequests = new Set<string>()

  function markCacheRequested(tid: string) {
    if (tid) myCacheRequests.add(tid)
  }

  function isCacheRequested(tid: string): boolean {
    return !!tid && myCacheRequests.has(tid)
  }

  function clearCacheRequest(tid: string) {
    if (tid) myCacheRequests.delete(tid)
  }

  /** 合并计划存活上限：超时未收齐即丢弃（含已收分片 Blob），
   *  避免某个源掉线后计划与其持有的分片永久驻留内存 */
  const CACHE_MERGE_TTL = 5 * 60 * 1000

  /** 清理超时的合并计划，返回清理条数 */
  function sweepCacheMergePlans(): number {
    const now = Date.now()
    let removed = 0
    for (const [tid, plan] of cacheMergePlans) {
      if (now - plan.startedAt > CACHE_MERGE_TTL) {
        plan.received.clear()
        cacheMergePlans.delete(tid)
        myCacheRequests.delete(tid)
        removed += 1
      }
    }
    if (removed) console.warn(`[direct] 清理超时多源合并计划 ${removed} 个`)
    return removed
  }

  /** 发起多源收取前登记计划（total=分段数，hash=服务端下发的整文件 SHA-256，可为空） */
  function startCacheFetch(tid: string, name: string, size: number, total: number, hash = '') {
    sweepCacheMergePlans()
    cacheMergePlans.set(tid, {
      name,
      size,
      total,
      received: new Map(),
      partTransferIds: new Map(),
      startedAt: Date.now(),
      hash: hash || '',
    })
  }

  /** 标记某分片条目 belong 到缓存文件（file_offer 到达时调用；分片传输 id 形如 `${tid}#${k}`） */
  function registerCachePart(tid: string, k: number, partTransferId: string) {
    let plan = cacheMergePlans.get(tid)
    if (!plan) {
      // total=0 表示"未经 startCacheFetch 登记总数"，cachePartDone 会据此拒绝合并，
      // 否则 received.size(1) >= total(0) 会立刻成立、拼出空 Blob 当作成功结果
      plan = {
        name: '',
        size: 0,
        total: 0,
        received: new Map(),
        partTransferIds: new Map(),
        startedAt: Date.now(),
        hash: '',
      }
      cacheMergePlans.set(tid, plan)
    }
    plan.partTransferIds.set(k, partTransferId)
    const item = items.value.find((it) => it.kind === 'file' && it.id === partTransferId)
    if (item) {
      item.cacheOf = tid
      // 分片条目显示序号（合并完成前便于区分各源进度）
      if (plan.total > 0) item.fileName = `${plan.name || item.fileName || '文件'} (${k + 1}/${plan.total})`
    }
  }

  /**
   * 合并结果的 SHA-256：交给 Worker 计算，主线程不被 CPU 密集操作卡住。
   * 复用 utils/sha256.ts 的增量实现（与传输过程中的流式哈希同一套）。
   *
   * 注意：Worker 不可用时 hashBlob 会自动回退主线程（仍保持可响应地让出事件循环），
   * 因此这里不再需要体积上限——此前设 64MB 上限正是为了避免主线程长时间冻结。
   */
  async function sha256OfBlob(blob: Blob): Promise<string> {
    return hashBlob(blob)
  }

  /** 分片接收完成（file_end 到达时由组合器调用）：收集分片，全部到齐后合并为完整文件 */
  async function cachePartDone(tid: string, partTransferId: string) {
    const plan = cacheMergePlans.get(tid)
    if (!plan) return
    // 严格解析分片序号：非法/缺失时不得回退为 0（会把真实 k=0 的分片覆盖掉，
    // 进而导致 received.size 永远凑不满 total，条目永久卡在"接收中"）
    const k = Number(partTransferId.split('#').pop())
    if (!Number.isInteger(k) || k < 0) {
      console.warn(`[direct] 分片序号非法，忽略: ${partTransferId}`)
      return
    }
    const data = await consumeIncomingBlob(partTransferId)
    if (!data) return
    plan.received.set(k, data.blob)
    removeFileItem(partTransferId) // 分片条目完成即从聊天流移除，由合并后的完整文件条目取代
    // 未登记分段数（total<=0）时拒绝合并：否则 received.size(1) >= total(0) 立刻成立，
    // 会拼出空 Blob 却当作成功结果
    if (plan.total <= 0) return
    if (plan.received.size >= plan.total) {
      // 按分片序号升序拼接
      const parts: Blob[] = []
      for (let i = 0; i < plan.total; i++) {
        const b = plan.received.get(i)
        if (!b) {
          // 缺失分片：释放已收分片并丢弃计划，避免内存永久驻留、UI 永久卡住
          console.warn(`[direct] 分片 ${i} 缺失，放弃合并: ${tid}`)
          plan.received.clear()
          cacheMergePlans.delete(tid)
          clearCacheRequest(tid)
          return
        }
        parts.push(b)
      }
      const merged = new Blob(parts, { type: 'application/octet-stream' })
      // ===== 完整性校验 =====
      // 1) 大小校验：各分片来自不同 peer，任一源返回错误分片都会让总大小不符
      const sizeOk = plan.size <= 0 || merged.size === plan.size
      if (!sizeOk) {
        console.warn(`[direct] 多源合并大小不符: ${tid} 期望 ${plan.size} 实际 ${merged.size}`)
      }
      // 2) 内容校验：与服务端下发的整文件 SHA-256 比对。
      //    该哈希由服务端落盘时流式算出（非客户端声明），是权威值。
      let hashStatus: 'ok' | 'mismatch' | 'unknown' = 'unknown'
      if (plan.hash) {
        const actual = await sha256OfBlob(merged)
        hashStatus = actual === plan.hash ? 'ok' : 'mismatch'
        if (hashStatus === 'mismatch') {
          console.warn(`[direct] 多源合并内容校验失败: ${tid} 期望 ${plan.hash} 实际 ${actual}`)
        }
      }
      const mergedItem = {
        id: tid,
        kind: 'file' as const,
        sender: '',
        isSelf: false,
        ts: Date.now(),
        transferId: tid,
        fileName: plan.name || '缓存文件',
        fileSize: merged.size,
        fileDirection: 'incoming' as const,
        fileStatus: sizeOk && hashStatus !== 'mismatch' ? ('done' as const) : ('failed' as const),
        hashStatus,
        transferred: merged.size,
        _blob: merged,
      } as DirectChatItem & InternalFileItem
      items.value.push(mergedItem)
      trimItems()
      plan.received.clear()
      cacheMergePlans.delete(tid)
      clearCacheRequest(tid)
    }
  }

  /**
   * 把任意来源（历史接口 / WS 广播）的缓存文件数据补全为完整结构。
   * 历史接口只返回 P2P 持有者信息、缺少落盘字段，统一在此兜底。
   */
  function normalizeCacheFile(raw: Partial<RoomCacheFile> & { transfer_id: string }): RoomCacheFile {
    return {
      transfer_id: raw.transfer_id,
      file_name: raw.file_name || '',
      file_size: raw.file_size || 0,
      file_hash: raw.file_hash || '',
      uploader_name: raw.uploader_name || '',
      owner_id: raw.owner_id || '',
      holders: raw.holders || [],
      holder_names: raw.holder_names || [],
      server_cached: !!raw.server_cached,
      expires_at: raw.expires_at ?? null,
      cached_at: raw.cached_at ?? null,
    }
  }

  function setCachedFiles(list: Array<Partial<RoomCacheFile> & { transfer_id: string }>) {
    cachedFiles.value = (list || []).map(normalizeCacheFile)
  }

  /** 服务器落盘完成（room_cache_added 广播）：整体替换同名条目，保证拿到完整落盘信息 */
  function upsertServerCachedFile(entry: Partial<RoomCacheFile> & { transfer_id: string }) {
    if (!entry.transfer_id) return
    const next = normalizeCacheFile(entry)
    const idx = cachedFiles.value.findIndex((c) => c.transfer_id === entry.transfer_id)
    if (idx >= 0) {
      cachedFiles.value = cachedFiles.value.map((c, i) => (i === idx ? next : c))
    } else {
      cachedFiles.value = [...cachedFiles.value, next]
    }
  }

  /**
   * 已缓存文件进入聊天流：房间内其他人收到上传广播后，把文件作为一条普通文件消息
   * 追加到消息列表末尾（即按时间顺序，不强制置顶/插入固定位置）。
   * 上传者本地已有自己发出的那条消息，跳过以免重复。
   */
  function upsertCacheFileMessage(entry: RoomCacheFile) {
    if (!entry.transfer_id) return
    const exists = items.value.some(
      (it) => it.kind === 'file' && it.transferId === entry.transfer_id
    )
    if (exists) return

    // 服务器会把上传广播发给房间内所有人（含上传者自己）。
    // 上传者收到自己那条时，必须呈现为「自己发出的文件」，
    // 否则会走接收分支、给发送方显示本应只属于接收方的「接受」按钮。
    const isMine = !!entry.owner_id && entry.owner_id === myClientId.value
    items.value.push({
      id: `cache-${entry.transfer_id}`,
      kind: 'file',
      sender: isMine ? myNickname() : entry.uploader_name || '成员',
      isSelf: isMine,
      ts: entry.cached_at ? new Date(entry.cached_at).getTime() : Date.now(),
      transferId: entry.transfer_id,
      fileName: entry.file_name,
      fileSize: entry.file_size,
      // 自己上传：outgoing + done（文件已在服务器，显示"已发送"，无接受按钮）
      fileDirection: isMine ? 'outgoing' : 'incoming',
      fileStatus: isMine ? 'done' : 'awaiting_confirm',
      transferred: isMine ? entry.file_size : 0,
      // 这条广播本身来自"已落盘"，带上服务器缓存信息，
      // 接收方卡片才能直接给出下载入口（否则只能走 P2P，发送方离线就取不到）
      serverCached: !!entry.server_cached,
      downloadUrl: entry.download_url || '',
    })
    trimItems()
  }

  /** 缓存文件被删除（room_cache_removed 广播） */
  function removeCachedFile(transferId: string) {
    if (!transferId) return
    cachedFiles.value = cachedFiles.value.filter((c) => c.transfer_id !== transferId)
  }

  /** 拉取房间缓存文件列表（进入房间 / 打开缓存入口时调用） */
  async function refreshCacheFiles(roomCode: string) {
    if (!roomCode) return
    try {
      const res = await DirectService.getCacheFiles(roomCode)
      if (res.code === 200 && Array.isArray(res.detail?.files)) {
        setCachedFiles(res.detail.files)
      }
    } catch {
      // 静默失败：缓存入口不可用时不影响聊天与 P2P 传输
    }
  }

  /**
   * 把文件缓存到服务器（双通道中的"落盘"通道）；返回落盘后的缓存条目。
   *
   * 不在客户端计算文件哈希：
   * 1) 原实现用 file.arrayBuffer() + crypto.subtle 把整个文件读进内存算 SHA-256，
   *    大文件（缓存单文件上限默认 100MB）在移动端会 OOM；
   * 2) 客户端声明的哈希可被伪造，服务端无法据此信任去重（缓存投毒面）。
   * 现由服务端在落盘时流式计算权威哈希并随缓存条目下发。
   */

  async function uploadFileToCache(
    roomCode: string,
    file: File,
    opts: { transferId: string; clientId: string; uploaderName: string; cacheHours: number }
  ): Promise<RoomCacheFile> {
    // 卡片上立刻进入"缓存中"状态，让用户看到文件正在上传到服务器
    setCacheProgress(opts.transferId, 0, 'uploading')
    // 哈希由服务端落盘时流式计算，客户端不再预处理（避免大文件整块读进内存）
    const res = await DirectService.uploadCacheFile(
      roomCode,
      file,
      { ...opts, memberToken: memberToken.value },
      (percent) => setCacheProgress(opts.transferId, percent, 'uploading')
    )
    if (res.code === 200 && res.detail) {
      upsertServerCachedFile(res.detail)
      setCacheProgress(opts.transferId, 100, 'cached')
      return res.detail
    }
    // 失败则清掉缓存态，避免卡片一直停在"缓存中"
    setCacheProgress(opts.transferId, 0, undefined, true)
    throw new Error(res.message || '文件上传到服务器失败')
  }

  /** 更新发送方卡片上的"缓存到服务器"进度；clear=true 时清除缓存态（上传失败/取消） */
  function setCacheProgress(
    transferId: string,
    percent: number,
    status?: 'uploading' | 'cached',
    clear = false
  ) {
    const item = items.value.find((it) => it.kind === 'file' && it.transferId === transferId)
    if (!item) return
    if (clear) {
      item.cacheStatus = undefined
      item.cacheProgress = undefined
      return
    }
    item.cacheProgress = percent
    if (status) item.cacheStatus = status
  }

  /** 删除房间缓存文件（上传者本人） */
  async function deleteCacheFile(roomCode: string, transferId: string, clientId: string) {
    const res = await DirectService.deleteCacheFile(
      roomCode, transferId, clientId, memberToken.value
    )
    if (res.code === 200) {
      removeCachedFile(transferId)
    }
    return res
  }

  /** 追加/更新一条缓存文件（file_cache_update 广播到达时），含持有者昵称（展示共享用户名） */
  function upsertCachedFile(entry: { transfer_id: string; file_name: string; file_size: number; holder_id: string; holder_nickname?: string }) {
    if (!entry.transfer_id) return
    const idx = cachedFiles.value.findIndex((c) => c.transfer_id === entry.transfer_id)
    if (idx >= 0) {
      const cur = cachedFiles.value[idx]
      if (!cur.holders.includes(entry.holder_id)) cur.holders.push(entry.holder_id)
      if (entry.holder_nickname && !cur.holder_names.includes(entry.holder_nickname)) {
        cur.holder_names.push(entry.holder_nickname)
      }
      cachedFiles.value = [...cachedFiles.value]
    } else {
      cachedFiles.value = [
        ...cachedFiles.value,
        normalizeCacheFile({
          transfer_id: entry.transfer_id,
          file_name: entry.file_name,
          file_size: entry.file_size,
          holders: [entry.holder_id],
          holder_names: entry.holder_nickname ? [entry.holder_nickname] : [],
        }),
      ]
    }
  }

  // ==================== 文件传输 ====================
  const outgoingHandles = new Map<string, File>() // transfer_id -> File
  const incomingChunks = new Map<string, ArrayBuffer[]>() // 内存累积模式的分片
  const incomingWriters = new Map<string, FileSystemWritableFileStream>() // OPFS 流式写入器
  const incomingHandles = new Map<string, FileSystemFileHandle>() // OPFS 文件句柄
  const incomingHashers = new Map<string, Sha256>() // 接收侧完整性校验哈希
  const incomingNextIndex = new Map<string, number>() // 接收侧期望的下一个分片序号
  // OPFS 写入串行链：FileSystemWritableFileStream.write() 必须先 await 上一次写入完成才能下一次，
  // 用 promise 链保证分片严格串行落盘，避免大文件多分片快速到达时并发 write 触发 InvalidStateError
  const incomingWriteChains = new Map<string, Promise<void>>()

  // ==================== 媒体流（传屏幕/传视频） ====================
  // 远端媒体流：Map 存流（供 <video> srcObject），mediaStreamFromIds 为响应式 key 列表（触发渲染）
  const incomingMediaStreams = new Map<string, MediaStream>()
  const mediaStreamFromIds = ref<string[]>([])
  // 共享通知（"XX 正在共享屏幕/视频"）：供房间页横幅提示，接收者决定是否查看
  const activeShares = ref<Record<string, { mediaType: 'screen' | 'video'; nickname: string; cameraCount?: number }>>({})
  // 正在查看（已建立媒体拉流）的共享者
  const viewingShares = ref<string[]>([])

  /** 传输进度（内部精确计数，UI 节流更新，避免大文件频繁触发响应式渲染） */
  interface ProgressEntry {
    bytes: number
    tickBytes: number
    tickTs: number
    uiTs: number
    speed: number
  }
  const progressMap = new Map<string, ProgressEntry>()

  const onlineUsers = computed(() => members.value.map((m) => m.nickname))
  const onlineCount = computed(() => members.value.length)
  const typingText = computed(() => {
    if (typingUsers.value.length === 0) return ''
    if (typingUsers.value.length === 1) return typingUsers.value[0]
    return `${typingUsers.value[0]}等${typingUsers.value.length}人`
  })
  const isTransferring = computed(() =>
    items.value.some((it) => it.kind === 'file' && (it.fileStatus === 'transferring' || it.fileStatus === 'paused'))
  )

  // ==================== 房间操作 ====================
  async function createRoom(data: CreateDirectRoomRequest): Promise<DirectRoomInfo> {
    const res = await DirectService.createRoom(data)
    if (res.code === 200 && res.detail) {
      activeRoom.value = res.detail
      return res.detail
    }
    throw new Error(String(res.detail || '创建房间失败'))
  }

  /** 加载房间信息（聊天消息不落库，无历史加载） */
  async function loadRoom(code: string): Promise<DirectRoomInfo> {
    const infoRes = await DirectService.getRoomInfo(code)
    if (infoRes.code !== 200 || !infoRes.detail) {
      throw new Error(String(infoRes.detail || '房间不存在'))
    }
    activeRoom.value = infoRes.detail
    return infoRes.detail
  }

  function setConnected(connected: boolean) {
    isConnected.value = connected
  }

  function setMyClientId(id: string) {
    myClientId.value = id
  }

  function setMemberToken(token: string) {
    memberToken.value = token || ''
  }

  function setMembers(list: DirectMember[]) {
    members.value = list
  }

  function setP2PActive(active: boolean) {
    p2pActive.value = active
  }

  // ==================== 聊天 ====================
  function trimItems() {
    if (items.value.length > MAX_ITEMS) {
      items.value = items.value.slice(items.value.length - MAX_ITEMS)
    }
  }

  /** 发送文本：乐观插入 */
  function addTextMessage(content: string): DirectChatItem | null {
    const trimmed = content.trim()
    if (!trimmed || !activeRoom.value) return null
    const item: DirectChatItem = {
      id: genUid('txt'),
      kind: 'text',
      sender: myNickname(),
      isSelf: true,
      ts: Date.now(),
      content: trimmed,
      sendStatus: 'sending',
    }
    items.value.push(item)
    trimItems()
    return item
  }

  /** 处理文本回显/新消息 */
  function onIncomingText(payload: { sender?: string; content?: string; ts?: number; client_id?: string; msg_id?: number }) {
    const myName = myNickname()
    // 命中自己发送的消息：更新状态（服务器不落库，无 msg_id，靠 client_id 匹配回显）
    if (payload.client_id) {
      const local = items.value.find((it) => it.kind === 'text' && it.id === payload.client_id)
      if (local) {
        local.sendStatus = 'sent'
        return
      }
    }
    items.value.push({
      id: genUid('txt'),
      kind: 'text',
      sender: payload.sender || '匿名',
      isSelf: payload.sender === myName,
      ts: payload.ts || Date.now(),
      content: payload.content || '',
      sendStatus: 'sent',
    })
    trimItems()
  }

  function markTextFailed(clientId: string) {
    const item = items.value.find((it) => it.kind === 'text' && it.id === clientId)
    if (item) item.sendStatus = 'failed'
  }

  function setTyping(nickname: string, isTyping: boolean) {
    if (nickname === myNickname()) return
    if (isTyping) {
      if (!typingUsers.value.includes(nickname)) {
        typingUsers.value = [...typingUsers.value, nickname]
      }
    } else {
      typingUsers.value = typingUsers.value.filter((n) => n !== nickname)
    }
  }

  function clearTyping() {
    typingUsers.value = []
  }

  /** 系统消息（居中灰字） */
  function addSystem(content: string) {
    items.value.push({
      id: genUid('sys'),
      kind: 'system',
      sender: '',
      isSelf: false,
      ts: Date.now(),
      content,
    })
    trimItems()
  }

  /** 轻量房间事件（进出房间等）：悬浮提示条，由视图控制几秒后自动移除 */
  function pushRoomEvent(content: string) {
    if (!content) return
    roomEvents.value.push({ id: ++uidCounter, content })
    if (roomEvents.value.length > 5) roomEvents.value = roomEvents.value.slice(-5)
  }

  function removeRoomEvent(id: number) {
    roomEvents.value = roomEvents.value.filter((e) => e.id !== id)
  }

  /** 历史分页大小（微信式：上滑到顶再拉一页） */
  const HISTORY_PAGE = 50

  /** 加载房间历史（save_messages 房间：聊天消息 + 传输文件元信息；附历史缓存文件）。 */
  /**
   * 历史加载的请求序号。
   *
   * welcome 握手时以 `void loadHistory(code, true)` 触发且不等待，网络抖动造成
   * 重连风暴时会有多个请求并发进行、返回顺序不定 —— 先发出却后返回的请求会用
   * 旧数据覆盖新数据。用序号保证"只接受最后一次请求的结果"。
   */
  let historyLoadSeq = 0

  async function loadHistory(code: string, force = false) {
    if (!code) return
    // 此前是"每个房间仅加载一次"，导致断线重连后不再拉取 —— 断开期间别人发的
    // 消息永远看不到。改为可强制重载（force），由重连/主动刷新触发。
    if (!force && historyLoadedCode.value === code) return
    historyLoadedCode.value = code
    const seq = ++historyLoadSeq
    try {
      const res = await DirectService.getRoomHistory(code, { limit: HISTORY_PAGE })
      // 已有更新的加载请求发出，本次结果作废（避免乱序覆盖）
      if (seq !== historyLoadSeq) return
      if (res.code !== 200 || !res.detail) {
        historyItems.value = []
        historyHasMore.value = false
        return
      }
      const det = res.detail
      // 取满一页 → 可能还有更早的，上滑到顶时再拉（微信式分页）
      historyHasMore.value =
        Array.isArray(det.messages) && det.messages.length >= HISTORY_PAGE
      // 历史缓存文件并入缓存列表（去重；cache_enabled 房间的新成员收取入口），
      // 并登记 transfer_id 集合用于去重：缓存已展示的文件，历史区不再重复出现
      const cachedTids = new Set<string>()
      if (Array.isArray(det.files)) {
        for (const f of det.files) {
          if (f.transfer_id) cachedTids.add(f.transfer_id)
          if (f.transfer_id && !cachedFiles.value.some((c) => c.transfer_id === f.transfer_id)) {
            cachedFiles.value = [
              ...cachedFiles.value,
              normalizeCacheFile({ ...f, transfer_id: f.transfer_id }),
            ]
          }
        }
      }
      if (det.save_messages && Array.isArray(det.messages)) {
        // 历史消息（含文件消息）直接进消息流。此前会把"已缓存文件"的历史记录过滤掉，
        // 再以缓存条目形式另插一条，导致同一条消息出现两次、且文件被挤到后面；
        // 现在按微信的做法：同一个时间轴，文件就是其中一条普通消息。
        historyItems.value = det.messages
          .map((m) => {
          const ts = m.ts ? new Date(m.ts).getTime() : Date.now()
          const isSelf = (m.sender || '') === myNickname()
          if (m.msg_type === 'file') {
            return {
              id: `h-file-${m.id}`,
              kind: 'file' as const,
              sender: m.sender || '匿名',
              isSelf,
              ts,
              archived: true,
              transferId: m.content,
              fileName: m.file_name || '',
              fileSize: m.file_size || 0,
              fileDirection: 'incoming' as const,
              fileStatus: 'done' as const,
              // 服务器有缓存 → 气泡直接给下载入口（不依赖发送方在线）
              serverCached: !!m.server_cached,
              downloadUrl: m.download_url || '',
            }
          }
          return {
            id: `h-text-${m.id}`,
            kind: 'text' as const,
            sender: m.sender || '匿名',
            isSelf,
            ts,
            content: m.content || '',
            sendStatus: 'sent' as const,
            archived: true,
          }
        })
      } else {
        historyItems.value = []
      }

      // 兜底：仅当缓存文件「没有对应历史消息」时才补一条（旧房间、或发送时未开启
      // 保存消息的场景），避免同一个文件既在历史消息里、又作为缓存条目重复一次
      const historyTids = new Set(
        historyItems.value.filter((it) => it.kind === 'file').map((it) => it.transferId)
      )
      const extraCached = cachedFiles.value
        .filter((c) => !historyTids.has(c.transfer_id))
        .map((c) => ({
          id: `cache-${c.transfer_id}`,
          kind: 'file' as const,
          sender: c.uploader_name || (c.holder_names || [])[0] || '成员',
          isSelf: false,
          ts: c.cached_at ? new Date(c.cached_at).getTime() : Date.now(),
          transferId: c.transfer_id,
          fileName: c.file_name,
          fileSize: c.file_size,
          fileDirection: 'incoming' as const,
          fileStatus: 'awaiting_confirm' as const,
          transferred: 0,
          archived: true,
        }))
      historyItems.value = [...historyItems.value, ...extraCached]

      // 刷新/重进房间后：把 OPFS 里仍然存在的文件重新挂回条目，
      // 无需重新下载即可继续为其他成员供源（数据在磁盘，不占内存）
      await restoreOpfsHolds()
    } catch {
      // 过期请求不得清除标记：那会误伤更新一次加载的"已加载"状态
      if (seq !== historyLoadSeq) return
      // 历史加载失败不阻塞房间连接；清除标记允许重试
      historyLoadedCode.value = ''
    }
  }

  /** 取已加载历史里最旧一条的服务端消息 id（分页游标；历史 id 形如 h-text-123 / h-file-123） */
  function oldestHistoryServerId(): number {
    let oldest = 0
    for (const it of historyItems.value) {
      const m = /^h-(?:text|file)-(\d+)$/.exec(it.id)
      if (!m) continue
      const sid = Number(m[1])
      if (!oldest || sid < oldest) oldest = sid
    }
    return oldest
  }

  /**
   * 上滑到顶部时加载更早的历史（微信式）。
   * 以当前最旧一条的服务端 id 为游标向前取一页，结果前插到列表头部。
   */
  async function loadMoreHistory() {
    const code = historyLoadedCode.value
    if (!code || !historyHasMore.value) return
    const beforeId = oldestHistoryServerId()
    if (!beforeId) {
      historyHasMore.value = false
      return
    }
    try {
      const res = await DirectService.getRoomHistory(code, {
        limit: HISTORY_PAGE,
        beforeId,
      })
      const older =
        res.code === 200 && Array.isArray(res.detail?.messages) ? res.detail.messages : []
      historyHasMore.value = older.length >= HISTORY_PAGE
      if (older.length === 0) return

      const mapped: DirectChatItem[] = older.map((m) => {
        const ts = m.ts ? new Date(m.ts).getTime() : Date.now()
        const isSelf = (m.sender || '') === myNickname()
        if (m.msg_type === 'file') {
          return {
            id: `h-file-${m.id}`,
            kind: 'file' as const,
            sender: m.sender || '匿名',
            isSelf,
            ts,
            archived: true,
            transferId: m.content,
            fileName: m.file_name || '',
            fileSize: m.file_size || 0,
            fileDirection: 'incoming' as const,
            fileStatus: 'done' as const,
            serverCached: !!m.server_cached,
            downloadUrl: m.download_url || '',
          }
        }
        return {
          id: `h-text-${m.id}`,
          kind: 'text' as const,
          sender: m.sender || '匿名',
          isSelf,
          ts,
          content: m.content || '',
          sendStatus: 'sent' as const,
          archived: true,
        }
      })

      // 去重后前插（更早的在最上面）
      const seen = new Set(historyItems.value.map((it) => it.id))
      const fresh = mapped.filter((it) => !seen.has(it.id))
      historyItems.value = [...fresh, ...historyItems.value]
    } catch {
      // 拉取失败保持现状，用户再次上滑可重试
    }
  }

  // ==================== 传输进度（节流 + 速率/剩余时间） ====================
  function applyProgressToItem(transferId: string, p: ProgressEntry) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (!item) return
    item.transferred = p.bytes
    item.speed = p.speed
    if (item.fileSize && p.speed > 0) {
      item.eta = Math.max(0, Math.ceil((item.fileSize - p.bytes) / p.speed))
    } else {
      item.eta = undefined
    }
  }

  /** 按绝对字节数更新进度；UI 字段每 ~100ms 刷新一次 */
  function setProgressAbsolute(transferId: string, abs: number) {
    const now = Date.now()
    const prev = progressMap.get(transferId)
    const p: ProgressEntry = prev || { bytes: 0, tickBytes: 0, tickTs: now, uiTs: 0, speed: 0 }
    if (abs < p.bytes) return p.bytes
    p.bytes = abs
    if (now - p.uiTs >= 100) {
      const elapsed = now - p.tickTs
      if (elapsed > 0 && abs >= p.tickBytes) {
        p.speed = Math.max(0, Math.round(((abs - p.tickBytes) / elapsed) * 1000))
      }
      p.tickBytes = abs
      p.tickTs = now
      p.uiTs = now
      progressMap.set(transferId, p)
      applyProgressToItem(transferId, p)
    }
    return p.bytes
  }

  // ==================== 文件：发送侧 ====================
  /** 选择文件 → 加入聊天流（待确认），发送 file_offer */
  function offerFiles(files: File[]) {
    const created: DirectChatItem[] = []
    for (const file of files) {
      const transferId = genUid('tf')
      outgoingHandles.set(transferId, file)
      const item: DirectChatItem = {
        id: transferId,
        kind: 'file',
        sender: myNickname(),
        isSelf: true,
        ts: Date.now(),
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileDirection: 'outgoing',
        fileStatus: 'awaiting_confirm',
        transferred: 0,
        recipients: [],
      }
      items.value.push(item)
      created.push(item)
    }
    trimItems()
    return created
  }

  function getFileHandle(transferId: string): File | undefined {
    return outgoingHandles.get(transferId)
  }

  /** 以指定传输 id 发起发送条目（多源缓存分片：holder 重发某字节区间，id 必须用 part_id） */
  function offerFileWithId(file: File, itemId: string, senderName?: string): DirectChatItem {
    outgoingHandles.set(itemId, file)
    const item: DirectChatItem = {
      id: itemId,
      kind: 'file',
      sender: senderName || myNickname(),
      isSelf: true,
      ts: Date.now(),
      transferId: itemId,
      fileName: file.name,
      fileSize: file.size,
      fileDirection: 'outgoing',
      fileStatus: 'awaiting_confirm',
      transferred: 0,
      recipients: [],
    }
    items.value.push(item)
    trimItems()
    return item
  }

  /** 发送侧：更新某个接收者状态 */
  function setRecipient(transferId: string, clientId: string, nickname: string, status: FileRecipient['status']) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (!item || !item.recipients) return
    const existing = item.recipients.find((r) => r.client_id === clientId)
    if (existing) {
      existing.status = status
      existing.nickname = nickname || existing.nickname
    } else {
      item.recipients.push({ client_id: clientId, nickname, status })
    }
    refreshOutgoingStatus(item)
  }

  /** 根据各接收者状态聚合发送侧文件状态 */
  function refreshOutgoingStatus(item: DirectChatItem) {
    if (!item.recipients || item.recipients.length === 0) {
      item.fileStatus = 'awaiting_confirm'
      return
    }
    const all = item.recipients
    if (all.some((r) => r.status === 'transferring')) {
      item.fileStatus = 'transferring'
    } else if (all.every((r) => r.status === 'done')) {
      item.fileStatus = 'done'
    } else if (all.every((r) => r.status === 'declined')) {
      item.fileStatus = 'declined'
    } else if (
      all.every((r) => ['done', 'failed', 'declined', 'canceled'].includes(r.status)) &&
      all.some((r) => r.status === 'failed')
    ) {
      item.fileStatus = 'failed'
    } else if (all.some((r) => r.status === 'confirmed')) {
      item.fileStatus = 'awaiting_confirm' // 仍有待发送的接收者，等待队列处理
    } else {
      item.fileStatus = 'awaiting_confirm'
    }
    // 全部接收者已到终态 → 释放文件句柄与进度，避免内存常驻
    if (all.length > 0 && all.every((r) => ['done', 'failed', 'declined', 'canceled'].includes(r.status))) {
      outgoingHandles.delete(item.id)
      progressMap.delete(item.id)
    }
  }

  /** 取待发送的任务（接收者已确认但尚未传输），并标记为传输中 */
  function consumePendingSends(): Array<{ transferId: string; clientId: string; nickname: string }> {
    const tasks: Array<{ transferId: string; clientId: string; nickname: string }> = []
    for (const item of items.value) {
      if (item.kind !== 'file' || !item.recipients) continue
      for (const r of item.recipients) {
        if (r.status === 'confirmed') {
          r.status = 'transferring'
          tasks.push({ transferId: item.id, clientId: r.client_id, nickname: r.nickname })
        }
      }
      refreshOutgoingStatus(item)
    }
    return tasks
  }

  function updateFileProgress(transferId: string, transferred: number) {
    setProgressAbsolute(transferId, transferred)
  }

  /** 发送侧：单个接收者传输完成 */
  function markRecipientDone(transferId: string, clientId: string) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (!item || !item.recipients) return
    const r = item.recipients.find((x) => x.client_id === clientId)
    if (r) r.status = 'done'
    refreshOutgoingStatus(item)
  }

  function markRecipientFailed(transferId: string, clientId: string) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (!item || !item.recipients) return
    const r = item.recipients.find((x) => x.client_id === clientId)
    if (r) r.status = 'failed'
    refreshOutgoingStatus(item)
  }

  function setFileStatus(transferId: string, status: DirectChatItem['fileStatus']) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (item) item.fileStatus = status
  }

  /** 记录文件传输方式（直连 / 服务器中转） */
  function setFileMode(transferId: string, mode: DirectTransferMode) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (item) item.mode = mode
  }

  function removeFileItem(transferId: string) {
    outgoingHandles.delete(transferId)
    incomingChunks.delete(transferId)
    incomingHashers.delete(transferId)
    incomingNextIndex.delete(transferId)
    progressMap.delete(transferId)
    abortOpfsWrites(transferId)
    items.value = items.value.filter((it) => !(it.kind === 'file' && it.id === transferId))
  }

  // ==================== 文件：接收侧 ====================
  /** 收到 file_offer → 聊天流出现待确认文件气泡 */
  function onFileOffer(offer: { transfer_id: string; file_name: string; file_size: number; sender: string; from_id: string }) {
    if (items.value.some((it) => it.kind === 'file' && it.id === offer.transfer_id)) return
    items.value.push({
      id: offer.transfer_id,
      kind: 'file',
      sender: offer.sender || '匿名',
      isSelf: false,
      ts: Date.now(),
      transferId: offer.transfer_id,
      fileName: offer.file_name,
      fileSize: offer.file_size,
      fileDirection: 'incoming',
      fileStatus: 'awaiting_confirm',
      transferred: 0,
      offerFromId: offer.from_id,
    })
    trimItems()
  }

  /** 初始化接收存储：哈希器 + 序号 + OPFS/内存双模式（同步占位防止分片丢失） */
  async function initIncomingStorage(item: DirectChatItem) {
    const transferId = item.transferId || ''
    if (!transferId) return
    incomingHashers.set(transferId, new Sha256())
    incomingNextIndex.set(transferId, 0)
    progressMap.delete(transferId)
    incomingChunks.set(transferId, [])
    item.transferred = 0
    item.speed = undefined
    item.eta = undefined
    item.hashStatus = 'pending'
    // 大文件 + 支持 OPFS → 流式落盘，避免内存翻倍
    if ((item.fileSize || 0) >= OPFS_MIN_SIZE && supportsOpfs()) {
      try {
        const dir = await navigator.storage.getDirectory()
        const safeName = `${transferId}_${sanitizeFileName(item.fileName || 'file')}`.slice(0, 120)
        const handle = await dir.getFileHandle(safeName, { create: true })
        const writer = await handle.createWritable()
        const buffered = incomingChunks.get(transferId) || []
        for (const c of buffered) await writer.write(c)
        incomingChunks.delete(transferId)
        incomingWriters.set(transferId, writer)
        incomingHandles.set(transferId, handle)
      } catch {
        // OPFS 初始化失败 → 保持内存累积
      }
    }
  }

  /** 收到 file_start → 该文件开始接收（幂等：已在传输中的直接忽略） */
  function onFileStart(meta: {
    transfer_id: string
    file_name: string
    file_size: number
    sender: string
    mode?: DirectTransferMode
    from_id?: string
  }) {
    const existing = items.value.find((it) => it.kind === 'file' && it.id === meta.transfer_id)
    if (existing) {
      if (existing.fileStatus === 'transferring') return
      existing.fileStatus = 'transferring'
      if (meta.mode) existing.mode = meta.mode
      if (meta.from_id) existing.offerFromId = meta.from_id
      initIncomingStorage(existing)
    } else {
      // file_start 先于 offer 到达的兜底
      const item: DirectChatItem = {
        id: meta.transfer_id,
        kind: 'file',
        sender: meta.sender || '匿名',
        isSelf: false,
        ts: Date.now(),
        transferId: meta.transfer_id,
        fileName: meta.file_name,
        fileSize: meta.file_size,
        fileDirection: 'incoming',
        fileStatus: 'transferring',
        mode: meta.mode,
        transferred: 0,
        offerFromId: meta.from_id,
      }
      items.value.push(item)
      initIncomingStorage(item)
    }
    trimItems()
  }

  /** 追加一个已按帧头路由到 transferId 的分片（含序号连续性校验） */
  function appendChunk(payload: ArrayBuffer, transferId: string, index: number) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (!item || item.fileDirection !== 'incoming' || item.fileStatus !== 'transferring') return
    // 分片序号不连续 → 说明丢片/乱序，直接判定失败
    const expected = incomingNextIndex.get(transferId) ?? 0
    if (index !== expected) {
      failIncomingFile(transferId)
      return
    }
    incomingNextIndex.set(transferId, expected + 1)
    // 完整性哈希累积
    incomingHashers.get(transferId)?.update(new Uint8Array(payload))
    // OPFS 写入或内存累积
    const writer = incomingWriters.get(transferId)
    if (writer) {
      // FileSystemWritableFileStream.write() 需要严格串行（上一次 await 完成才能下一次）。
      // 用 promise 链排队，避免大文件多分片快速到达时并发 write 抛 InvalidStateError 导致误判失败。
      const prev = incomingWriteChains.get(transferId) || Promise.resolve()
      incomingWriteChains.set(
        transferId,
        prev.then(() => writer.write(payload)).catch((err) => {
          console.warn('[direct] OPFS 写入失败', err)
          failIncomingFile(transferId)
        })
      )
    } else {
      incomingChunks.get(transferId)?.push(payload)
    }
    const total = setProgressAbsolute(
      transferId,
      (progressMap.get(transferId)?.bytes || 0) + payload.byteLength
    )
    if (item.fileSize && total >= item.fileSize) {
      assembleIncoming(transferId)
    }
  }

  /** 组装接收数据：OPFS 关闭写入器 / 内存合并 Blob */
  async function assembleIncoming(transferId: string) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId) as (DirectChatItem & InternalFileItem) | undefined
    if (!item || item._assembled) return
    item._assembled = true
    const writer = incomingWriters.get(transferId)
    if (writer) {
      try {
        // 先等待 OPFS 写入串行链排空，再关闭写入器（否则可能因仍有未完成写入而 close 报错）
        await (incomingWriteChains.get(transferId) || Promise.resolve())
        await writer.close()
      } catch {
        failIncomingFile(transferId)
        return
      }
      incomingWriters.delete(transferId)
      incomingWriteChains.delete(transferId)
      item._opfsHandle = incomingHandles.get(transferId)
    } else {
      const chunks = incomingChunks.get(transferId)
      if (chunks && chunks.length > 0) {
        item._blob = new Blob(chunks, { type: 'application/octet-stream' })
      }
      incomingChunks.delete(transferId)
    }
    item.transferred = item.fileSize || item.transferred || 0
    item.speed = undefined
    item.eta = undefined
  }

  /** 收到 file_end → 完成接收 + 完整性校验，返回结果 */
  async function onFileEnd(transferId: string, fileHash?: string): Promise<'done' | 'mismatch' | 'ignored'> {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (!item || item.fileDirection !== 'incoming' || item.fileStatus !== 'transferring') return 'ignored'
    await assembleIncoming(transferId)
    if (item.fileStatus !== 'transferring') return 'ignored' // 组装过程中失败
    let verified = false
    if (fileHash) {
      const hasher = incomingHashers.get(transferId)
      if (hasher) {
        item.hashStatus = 'verifying'
        const digest = hasher.digestHex()
        if (digest !== fileHash) {
          item.hashStatus = 'mismatch'
          failIncomingFile(transferId)
          return 'mismatch'
        }
        verified = true
      }
    }
    item.fileStatus = 'done'
    // 只有真正比对过才置 'ok'：没有期望哈希（fileHash 为空）或本地没有 hasher
    // （如 OPFS 恢复路径）时置 'unknown'，避免把"未校验"显示成"校验通过"
    item.hashStatus = verified ? 'ok' : 'unknown'
    item.speed = undefined
    item.eta = undefined
    cleanupIncomingMeta(transferId)
    return 'done'
  }

  function cleanupIncomingMeta(transferId: string) {
    incomingHashers.delete(transferId)
    incomingNextIndex.delete(transferId)
    incomingWriteChains.delete(transferId)
    progressMap.delete(transferId)
  }

  /** 中止 OPFS 写入并删除落盘文件（幂等） */
  async function abortOpfsWrites(transferId: string) {
    const writer = incomingWriters.get(transferId)
    if (writer) {
      incomingWriters.delete(transferId)
      writer.abort().catch(() => {})
    }
    const handle = incomingHandles.get(transferId)
    incomingHandles.delete(transferId)
    if (handle) {
      try {
        const dir = await navigator.storage.getDirectory()
        await dir.removeEntry(handle.name, { recursive: true }).catch(() => {})
      } catch {
        /* ignore */
      }
    }
  }

  /** 接收侧：本地拒绝 */
  function declineIncomingFile(transferId: string) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (item && item.fileDirection === 'incoming' && item.fileStatus === 'awaiting_confirm') {
      item.fileStatus = 'declined'
    }
  }

  function failIncomingFile(transferId: string) {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId)
    if (item && item.fileDirection === 'incoming' && (item.fileStatus === 'transferring' || item.fileStatus === 'awaiting_confirm')) {
      item.fileStatus = 'failed'
    }
    incomingChunks.delete(transferId)
    cleanupIncomingMeta(transferId)
    abortOpfsWrites(transferId)
  }

  /** 取接收完成的 Blob（消费后由调用方移除条目）；OPFS 模式异步读取 */
  async function consumeIncomingBlob(transferId: string): Promise<{ name: string; blob: Blob } | null> {
    const item = items.value.find((it) => it.kind === 'file' && it.id === transferId) as (DirectChatItem & InternalFileItem) | undefined
    if (!item || item.fileStatus !== 'done') return null
    if (item._opfsHandle) {
      try {
        const file = await item._opfsHandle.getFile()
        return { name: item.fileName || 'file', blob: file }
      } catch {
        return null
      }
    }
    if (item._blob) {
      return { name: item.fileName || 'file', blob: item._blob }
    }
    return null
  }

  /**
   * 把「从服务器下载」的文件登记为本地持有：挂上 blob 并置为 done。
   * 这样它就和 P2P 接收完成的文件一样，能作为分片来源提供给其他成员
   * （只要不关闭当前页面，就能持续为别人供源）。
   */
  async function registerDownloadedFile(
    entry: { transfer_id: string; file_name: string; file_size: number; sender?: string; ts?: number },
    blob: Blob
  ): Promise<DirectChatItem> {
    const existing = items.value.find(
      (it) => it.kind === 'file' && it.transferId === entry.transfer_id
    ) as (DirectChatItem & InternalFileItem) | undefined

    let target: DirectChatItem & InternalFileItem
    if (existing) {
      existing.fileStatus = 'done'
      existing.transferred = blob.size
      target = existing
    } else {
      target = {
        id: `dl-${entry.transfer_id}`,
        kind: 'file' as const,
        sender: entry.sender || '成员',
        isSelf: false,
        ts: entry.ts || Date.now(),
        transferId: entry.transfer_id,
        fileName: entry.file_name,
        fileSize: entry.file_size || blob.size,
        fileDirection: 'incoming' as const,
        fileStatus: 'done' as const,
        transferred: blob.size,
      } as DirectChatItem & InternalFileItem
      items.value.push(target)
      trimItems()
    }

    // 数据写 OPFS（磁盘）而不是常驻内存：内存里只留一个文件句柄，
    // 其他成员来取时才 getFile() 从磁盘读出，没人取就不占内存。
    if (supportsOpfs()) {
      try {
        const dir = await navigator.storage.getDirectory()
        const safeName = `${entry.transfer_id}_${sanitizeFileName(entry.file_name || 'file')}`.slice(0, 120)
        const handle = await dir.getFileHandle(safeName, { create: true })
        const writer = await handle.createWritable()
        await writer.write(blob)
        await writer.close()
        target._opfsHandle = handle
        return target
      } catch {
        // OPFS 写失败 → 回退内存持有，至少当前会话内仍可供源
      }
    }
    target._blob = blob
    return target
  }

  /**
   * 恢复 OPFS 里已持有的文件句柄。
   * 刷新页面后内存 Map 会清空，但磁盘上的数据还在——按文件名前缀 `transferId_`
   * 把它们重新挂回对应条目，使其无需重新下载就能继续为其他成员供源。
   * 返回恢复的条数。
   */
  async function restoreOpfsHolds(): Promise<number> {
    if (!supportsOpfs()) return 0
    try {
      const dir = await navigator.storage.getDirectory()
      const entries = (dir as unknown as { entries: () => AsyncIterable<[string, FileSystemHandle]> }).entries()
      let restored = 0
      for await (const [name, handle] of entries) {
        if (handle.kind !== 'file') continue
        const tid = name.split('_')[0]
        if (!tid) continue
        // 条目可能在实时流，也可能在历史流（房间重进时历史才刚加载）
        const item = (items.value.find(
          (it) => it.kind === 'file' && it.transferId === tid
        ) || historyItems.value.find(
          (it) => it.kind === 'file' && it.transferId === tid
        )) as (DirectChatItem & InternalFileItem) | undefined
        if (!item || item._opfsHandle || item._blob) continue
        item._opfsHandle = handle as FileSystemFileHandle
        if (item.fileStatus !== 'done') item.fileStatus = 'done'
        restored += 1
      }
      return restored
    } catch {
      return 0
    }
  }

  /** 获取文件项（供 UI/组合函数查询） */
  function getFileItem(transferId: string): DirectChatItem | undefined {
    return items.value.find((it) => it.kind === 'file' && it.id === transferId)
  }

  // ==================== 媒体流 ====================
  /** 远端媒体流键：`fromId:idx`（idx=摄像头索引，多摄像头同时传输时按路渲染）。
   *  若传入的 fromId 已含 `:`（复合键），原样返回（供视图直接使用复合键访问）。 */
  function mediaKey(fromId: string, idx: number): string {
    if (fromId.includes(':')) return fromId
    return `${fromId}:${idx}`
  }

  /** 记录远端媒体流（keyed by 发送者 client_id + 摄像头索引），并触发响应式 key 列表更新 */
  function setIncomingMediaStream(fromId: string, stream: MediaStream, idx = 0) {
    incomingMediaStreams.set(mediaKey(fromId, idx), stream)
    if (!mediaStreamFromIds.value.includes(mediaKey(fromId, idx))) {
      mediaStreamFromIds.value = [...mediaStreamFromIds.value, mediaKey(fromId, idx)]
    }
  }

  /** 获取远端媒体流（供 <video> 渲染） */
  function getIncomingMediaStream(fromId: string, idx = 0): MediaStream | undefined {
    return incomingMediaStreams.get(mediaKey(fromId, idx))
  }

  /** 清除远端媒体流（对方结束分享/断开） */
  function clearIncomingMediaStream(fromId: string) {
    const prefix = `${fromId}:`
    for (const [key, stream] of Array.from(incomingMediaStreams)) {
      if (key === fromId || key.startsWith(prefix)) {
        for (const track of stream.getTracks()) track.stop()
        incomingMediaStreams.delete(key)
      }
    }
    mediaStreamFromIds.value = mediaStreamFromIds.value.filter((id) => id !== fromId && !id.startsWith(prefix))
    viewingShares.value = viewingShares.value.filter((id) => id !== fromId)
  }

  // ==================== 媒体服务器中转（MediaSource） ====================
  /** 中转媒体源：`sharerId:idx` -> { mediaSource, objectUrl, mime }（idx=摄像头索引，多摄像头同时传输） */
  const mediaRelaySources = new Map<string, { mediaSource: MediaSource; objectUrl: string; mime: string }>()
  /** SourceBuffer 未就绪前的预缓冲（有限长度防内存膨胀） */
  const mediaRelayPending = new Map<string, ArrayBuffer[]>()
  const mediaRelayFromIds = ref<string[]>([])

  /** 初始化中转媒体源：创建 MediaSource + objectURL（供 <video> src），触发渲染。
   * 若已存在但 mime 不同（如先按默认建、后收到实际 mime），重建以避免 SourceBuffer 初始化失败。 */
  function mediaRelayKey(sharerId: string, idx: number): string {
    return `${sharerId}:${idx}`
  }

  function initMediaRelaySource(sharerId: string, mime: string, idx = 0): boolean {
    const key = mediaRelayKey(sharerId, idx)
    if (mediaRelaySources.has(key)) {
      const existing = mediaRelaySources.get(key)!
      if (existing.mime === mime) return true
      clearMediaRelaySource(key) // mime 变更 → 重建
    }
    try {
      if (typeof MediaSource === 'undefined') return false
      const mediaSource = new MediaSource()
      const objectUrl = URL.createObjectURL(mediaSource)
      mediaRelaySources.set(key, { mediaSource, objectUrl, mime })
      if (!mediaRelayFromIds.value.includes(key)) {
        mediaRelayFromIds.value = [...mediaRelayFromIds.value, key]
      }
      // sourceopen 后建立 SourceBuffer，并把预缓冲分片转入追加队列
      mediaSource.addEventListener('sourceopen', async () => {
        try {
          const entry = mediaRelaySources.get(key)
          if (!entry || entry.mediaSource.readyState !== 'open') return
          // mime 降级链：完整 codec 组合（vp8,opus）在部分手机浏览器不支持 → 逐级降级，
          // 避免 addSourceBuffer 抛错导致中转视频无法接收（黑屏无提示）
          const mimeCandidates = [
            entry.mime || 'video/webm;codecs=vp8',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp8',
            'video/webm',
          ]
          let sb: SourceBuffer | null = null
          for (const m of mimeCandidates) {
            try {
              sb = entry.mediaSource.addSourceBuffer(m)
              if (sb) break
            } catch {
              /* 尝试下一个候选 */
            }
          }
          if (!sb) return
          const pending = mediaRelayPending.get(key) || []
          mediaRelayPending.delete(key)
          const q = mediaRelayAppendQueue.get(key) || []
          mediaRelayAppendQueue.set(key, [...pending, ...q])
          void drainAppendQueue(key, sb)
        } catch {
          /* 全部 mime 均不支持：无法播放中转媒体 */
        }
      })
      return true
    } catch {
      return false
    }
  }

  /** 获取中转媒体 objectURL（供 <video> 渲染；key 可传 `sharerId:idx` 或直接 `sharerId`=索引0） */
  function getMediaRelayUrl(sharerId: string, idx = 0): string | undefined {
    const key = sharerId.includes(':') ? sharerId : mediaRelayKey(sharerId, idx)
    return mediaRelaySources.get(key)?.objectUrl
  }

  /** 追加中转媒体分片：串行队列追加（SourceBuffer updating 时排队，不丢帧——WebM 流式追加对连续性敏感） */
  function appendMediaChunk(sharerId: string, payload: ArrayBuffer, idx = 0) {
    const key = sharerId.includes(':') ? sharerId : mediaRelayKey(sharerId, idx)
    const entry = mediaRelaySources.get(key)
    if (!entry || !entry.mediaSource) return
    if (entry.mediaSource.readyState !== 'open' || !entry.mediaSource.sourceBuffers || entry.mediaSource.sourceBuffers.length === 0) {
      // 尚未 open / SourceBuffer 未建：预缓冲（限制长度防内存膨胀）
      const pending = mediaRelayPending.get(key) || []
      if (pending.length < 400) pending.push(payload)
      mediaRelayPending.set(key, pending)
      return
    }
    const q = mediaRelayAppendQueue.get(key) || []
    q.push(payload)
    mediaRelayAppendQueue.set(key, q)
    void drainAppendQueue(key, entry.mediaSource.sourceBuffers[0])
  }

  /** 串行追加队列（每 sharer 一个 draining 标记，防止并发 appendBuffer）。
   *  队列超限（网络慢导致消费跟不上）时清空旧帧，只保最新——实时媒体可跳帧，
   *  避免延迟无限增长与内存堆积。 */
  const mediaRelayAppendQueue = new Map<string, ArrayBuffer[]>()
  const mediaRelayAppending = new Set<string>()
  const MEDIA_APPEND_QUEUE_MAX = 40 // 约 40 帧 ≈ 20s（500ms/帧），超出跳旧保新
  async function drainAppendQueue(sharerId: string, sb: SourceBuffer) {
    if (mediaRelayAppending.has(sharerId)) return
    mediaRelayAppending.add(sharerId)
    try {
      while (true) {
        let q = mediaRelayAppendQueue.get(sharerId) || []
        if (q.length === 0) break
        // 队列积压过多：丢弃旧帧只留最新（保持低延迟与实时性）
        if (q.length > MEDIA_APPEND_QUEUE_MAX) {
          q = q.slice(q.length - 1)
          mediaRelayAppendQueue.set(sharerId, q)
        }
        if (sb.updating) {
          await new Promise((r) => sb.addEventListener('updateend', r, { once: true }))
          continue
        }
        const chunk = q.shift()!
        try {
          sb.appendBuffer(chunk)
        } catch {
          /* 丢弃无法解析的帧 */
        }
      }
    } finally {
      mediaRelayAppending.delete(sharerId)
    }
  }

  /** 关闭中转媒体源（共享结束/退出查看；传入 sharerId 清除其全部摄像头索引） */
  function clearMediaRelaySource(sharerId: string) {
    const keys = sharerId.includes(':')
      ? [sharerId]
      : Array.from(mediaRelaySources.keys()).filter((k) => k === sharerId || k.startsWith(`${sharerId}:`))
    for (const key of keys) {
      const entry = mediaRelaySources.get(key)
      if (entry) {
        try {
          if (entry.mediaSource.readyState === 'open') entry.mediaSource.endOfStream()
        } catch {
          /* ignore */
        }
        URL.revokeObjectURL(entry.objectUrl)
        mediaRelaySources.delete(key)
      }
      mediaRelayPending.delete(key)
      mediaRelayAppendQueue.delete(key)
      mediaRelayAppending.delete(key)
    }
    mediaRelayFromIds.value = mediaRelayFromIds.value.filter((id) => !keys.includes(id))
    viewingShares.value = viewingShares.value.filter((id) => id !== sharerId)
  }

  // ==================== 共享通知 ====================
  /** 记录某人正在共享（广播 media_available 到达时） */
  function setActiveShare(fromId: string, mediaType: 'screen' | 'video', nickname: string, cameraCount?: number) {
    activeShares.value = { ...activeShares.value, [fromId]: { mediaType, nickname, cameraCount } }
  }

  /** 移除共享通知（media_cancel 到达或本地忽略） */
  function removeActiveShare(fromId: string) {
    const next = { ...activeShares.value }
    delete next[fromId]
    activeShares.value = next
  }

  /** 标记已发起拉流查看某共享 */
  function setViewingShare(fromId: string) {
    if (!viewingShares.value.includes(fromId)) {
      viewingShares.value = [...viewingShares.value, fromId]
    }
  }

  // ==================== 重置 ====================
  function reset() {
    activeRoom.value = null
    members.value = []
    isConnected.value = false
    myClientId.value = ''
    memberToken.value = ''
    p2pActive.value = false
    items.value = []
    typingUsers.value = []
    historyItems.value = []
    historyLoadedCode.value = ''
    roomEvents.value = []
    cachedFiles.value = []
    outgoingHandles.clear()
    incomingChunks.clear()
    incomingHashers.clear()
    incomingNextIndex.clear()
    incomingWriteChains.clear()
    progressMap.clear()
    cacheMergePlans.clear()
    myCacheRequests.clear()
  incomingWriters.forEach((w) => w.abort().catch(() => {}))
    incomingWriters.clear()
    incomingHandles.clear()
    // 清理远端媒体流与共享通知
    for (const stream of incomingMediaStreams.values()) {
      for (const track of stream.getTracks()) track.stop()
    }
    incomingMediaStreams.clear()
    mediaStreamFromIds.value = []
    activeShares.value = {}
    viewingShares.value = []
    // 清理中转媒体源
    for (const entry of mediaRelaySources.values()) {
      try {
        if (entry.mediaSource.readyState === 'open') entry.mediaSource.endOfStream()
      } catch {
        /* ignore */
      }
      URL.revokeObjectURL(entry.objectUrl)
    }
    mediaRelaySources.clear()
    mediaRelayPending.clear()
    mediaRelayAppendQueue.clear()
    mediaRelayAppending.clear()
    mediaRelayFromIds.value = []
  }

  return {
    activeRoom,
    members,
    isConnected,
    myClientId,
    memberToken,
    p2pActive,
    items,
    typingUsers,
    historyItems,
    historyLoadedCode,
    historyHasMore,
    loadMoreHistory,
    roomEvents,
    pushRoomEvent,
    removeRoomEvent,
    loadHistory,
    cachedFiles,
    setCachedFiles,
    upsertCachedFile,
    upsertServerCachedFile,
    upsertCacheFileMessage,
    removeCachedFile,
    refreshCacheFiles,
    uploadFileToCache,
    deleteCacheFile,
    startCacheFetch,
    registerCachePart,
    cachePartDone,
    markCacheRequested,
    isCacheRequested,
    clearCacheRequest,
    offerFileWithId,
    onlineUsers,
    onlineCount,
    typingText,
    isTransferring,
    createRoom,
    loadRoom,
    setConnected,
    setMyClientId,
    setMemberToken,
    setMembers,
    setP2PActive,
    addTextMessage,
    onIncomingText,
    markTextFailed,
    setTyping,
    clearTyping,
    addSystem,
    offerFiles,
    getFileHandle,
    setRecipient,
    consumePendingSends,
    updateFileProgress,
    markRecipientDone,
    markRecipientFailed,
    setFileStatus,
    setFileMode,
    removeFileItem,
    onFileOffer,
    onFileStart,
    appendChunk,
    onFileEnd,
    declineIncomingFile,
    failIncomingFile,
    consumeIncomingBlob,
    registerDownloadedFile,
    restoreOpfsHolds,
    getFileItem,
    mediaStreamFromIds,
    activeShares,
    viewingShares,
    setIncomingMediaStream,
    getIncomingMediaStream,
    clearIncomingMediaStream,
    initMediaRelaySource,
    getMediaRelayUrl,
    appendMediaChunk,
    clearMediaRelaySource,
    mediaRelayFromIds,
    setActiveShare,
    removeActiveShare,
    setViewingShare,
    reset,
  }
})
