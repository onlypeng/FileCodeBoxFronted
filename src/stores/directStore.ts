import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DirectService } from '@/services/direct'
import { STORAGE_KEYS } from '@/constants'
import { readPreference } from '@/utils/preference-storage'
import { Sha256 } from '@/utils/sha256'
import type {
  CreateDirectRoomRequest,
  DirectChatItem,
  DirectMember,
  DirectRoomInfo,
  DirectTransferMode,
  FileRecipient,
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
  const p2pActive = ref(false) // 是否已有可用的直连通道

  // ==================== 聊天流 ====================
  const items = ref<DirectChatItem[]>([])
  const typingUsers = ref<string[]>([])

  // ==================== 房间文件缓存（cache_enabled=1 时由服务器下发/广播） ====================
  /** 房间已缓存文件列表：{ transfer_id, file_name, file_size, holders[] } */
  const cachedFiles = ref<Array<{ transfer_id: string; file_name: string; file_size: number; holders: string[] }>>([])

  function setCachedFiles(list: Array<{ transfer_id: string; file_name: string; file_size: number; holders: string[] }>) {
    cachedFiles.value = list || []
  }

  /** 追加/更新一条缓存文件（file_cache_update 广播到达时） */
  function upsertCachedFile(entry: { transfer_id: string; file_name: string; file_size: number; holder_id: string }) {
    if (!entry.transfer_id) return
    const idx = cachedFiles.value.findIndex((c) => c.transfer_id === entry.transfer_id)
    if (idx >= 0) {
      const cur = cachedFiles.value[idx]
      if (!cur.holders.includes(entry.holder_id)) cur.holders.push(entry.holder_id)
      cachedFiles.value = [...cachedFiles.value]
    } else {
      cachedFiles.value = [
        ...cachedFiles.value,
        {
          transfer_id: entry.transfer_id,
          file_name: entry.file_name,
          file_size: entry.file_size,
          holders: [entry.holder_id],
        },
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
      }
    }
    item.fileStatus = 'done'
    item.hashStatus = 'ok'
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
    p2pActive.value = false
    items.value = []
    typingUsers.value = []
    cachedFiles.value = []
    outgoingHandles.clear()
    incomingChunks.clear()
    incomingHashers.clear()
    incomingNextIndex.clear()
    incomingWriteChains.clear()
    progressMap.clear()
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
    p2pActive,
    items,
    typingUsers,
    cachedFiles,
    setCachedFiles,
    upsertCachedFile,
    onlineUsers,
    onlineCount,
    typingText,
    isTransferring,
    createRoom,
    loadRoom,
    setConnected,
    setMyClientId,
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
