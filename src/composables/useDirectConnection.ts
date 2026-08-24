/**
 * 直连快传连接组合器：WebSocket 生命周期 + 消息路由 + 各域模块组装。
 *
 * 结构拆分说明（原 1900+ 行单体按能力域拆分）：
 * - direct/context.ts   共享状态与回调（依赖注入容器）
 * - direct/p2p.ts       WebRTC P2P 通道（建连/协商/ICE/码率控制）
 * - direct/media.ts     传屏幕/传视频（采集/质量档位/预览/服务器中转）
 * - direct/fileSend.ts  文件传输（offer/应答/队列/分片发送）
 * - direct/crypto.ts    中继分片端到端加密（ECDH + AES-GCM 握手）
 * 本文件保留：WebSocket 生命周期、消息路由（handleMessage）、二进制接收路由。
 */
import { onUnmounted, ref } from 'vue'
import { useDirectStore } from '@/stores/directStore'
import { useConfigStore } from '@/stores/configStore'
import { useI18n } from 'vue-i18n'
import { STORAGE_KEYS } from '@/constants'
import { buildWebSocketUrl } from '@/utils/share-url'
import { readPreference, writePreference } from '@/utils/preference-storage'
import { decodeDirectFrame } from '@/utils/direct-frame'
import { decryptRelayChunk, encryptRelayChunk } from '@/utils/relay-crypto'
import { createDirectCrypto } from './direct/crypto'
import { createDirectP2P } from './direct/p2p'
import { createDirectMedia } from './direct/media'
import { createDirectFileSend } from './direct/fileSend'
import type { DirectConnectionContext, MediaQualityPreset } from './direct/context'
import type { DirectWSMessage } from '@/types/direct'

interface UseDirectConnectionOptions {
  /** 自动重连间隔（毫秒），默认 3000（指数退避的基数） */
  reconnectInterval?: number
  /** 最大重连次数，默认 8 */
  maxReconnectAttempts?: number
  /** P2P 建连等待超时（毫秒），超时回退服务器中转 */
  p2pTimeout?: number
}

/**
 * client_id 由服务端在 join 时签发（welcome 返回），本地仅缓存用于断线重连复用。
 * 客户端不得自报 id 参与身份伪造：join 时若已有缓存的 id 则附带（服务端校验未被占用
 * 才允许沿用），否则由服务端签发。已过期/被占用的 id 会被服务端重新签发。
 */
function readPersistedClientId(): string {
  return readPreference(STORAGE_KEYS.DIRECT_CLIENT_ID, '')
}

function persistClientId(id: string) {
  if (id) writePreference(STORAGE_KEYS.DIRECT_CLIENT_ID, id)
}

export function useDirectConnection(options: UseDirectConnectionOptions = {}) {
  const { reconnectInterval = 3000, maxReconnectAttempts = 8, p2pTimeout = 4000 } = options

  const directStore = useDirectStore()
  const configStore = useConfigStore()
  const { t } = useI18n()
  const isConnected = ref(false)
  const roomFull = ref(false) // 房间已满（服务端 1013 关闭）

  // ============ 共享上下文：状态 + 跨域回调 ============
  const ctx: DirectConnectionContext = {
    directStore,
    configStore,
    t,

    ws: ref<WebSocket | null>(null),
    currentCode: ref(''),
    currentNickname: ref(''),

    p2p: new Map(),
    pendingIce: new Map(),
    rtcConfig: { iceServers: [] }, // turn_servers 信令到达后由 handleMessage 覆盖

    myRelayKeyPair: null,
    relayKeys: new Map(),
    cryptoWaiters: new Map(),

    localMediaStream: ref<MediaStream | null>(null),
    localCameraStreams: new Map(),
    shareCameraFailures: 0,
    localMediaType: ref<'screen' | 'video' | null>(null),
    mediaSystemAudioTracks: new Set(),
    previewStream: ref<MediaStream | null>(null),
    previewStreams: new Map(),
    cameraPreviewError: ref<string | null>(null),
    micFailed: ref(false),
    screenUsesCamera: ref(false),
    mediaRecorders: new Map(),
    mediaRelayTransferIds: new Map(),
    mediaRelayTransferToSharer: new Map(),
    sharerToRelayTransfer: new Map(),
    mediaRelayBuffer: new Map(),
    mediaRelaySending: false,
    mediaRelayIndex: new Map(),
    mediaRelayMime: 'video/webm;codecs=vp8',
    estimatedBandwidth: ref(0),
    estimatedRtt: ref(0),
    bandwidthTimer: null,
    currentMediaPreset: ref<MediaQualityPreset>({
      width: 640, height: 480, frameRate: 15, videoBitrate: 500_000, audioBitrate: 48_000, minBandwidth: 900_000,
    }),
    currentShareAudioKind: ref<'none' | 'mic' | 'system' | 'both'>('mic'),

    queueProcessing: false,

    sendSignal: (msg: object) => {
      if (ctx.ws.value && ctx.ws.value.readyState === WebSocket.OPEN) {
        ctx.ws.value.send(JSON.stringify(msg))
      }
    },
    sendBinary: async (buf: ArrayBuffer, key?: CryptoKey): Promise<boolean> => {
      if (!ctx.ws.value || ctx.ws.value.readyState !== WebSocket.OPEN) return false
      if (key) {
        try {
          buf = await encryptRelayChunk(key, buf)
        } catch {
          return false
        }
      }
      ctx.ws.value.send(buf)
      return true
    },
    handleP2PDataMessage: (e) => {
      if (typeof e.data === 'string') {
        let msg: DirectWSMessage
        try {
          msg = JSON.parse(e.data)
        } catch {
          return
        }
        if (msg.type === 'file_start' && msg.transfer_id) {
          directStore.onFileStart({
            transfer_id: msg.transfer_id,
            file_name: msg.file_name || '',
            file_size: msg.file_size || 0,
            sender: msg.sender || '',
            mode: 'p2p',
            from_id: msg.from_id,
          })
        } else if (msg.type === 'file_end' && msg.transfer_id) {
          void handleFileEnd(msg.transfer_id, msg.file_hash)
        }
      } else {
        void handleBinary(e.data as ArrayBuffer)
      }
    },
    onFileEnd: (transferId, fileHash) => handleFileEnd(transferId, fileHash),
  }

  // ============ 各域模块 ============
  const crypto = createDirectCrypto(ctx)
  const p2p = createDirectP2P(ctx, { p2pTimeout })
  const media = createDirectMedia(ctx)
  const fileSend = createDirectFileSend(ctx)

  // 跨域 API 注入（延迟绑定，消除模块间硬依赖）
  p2p.setMediaRelayRequest((sharerId) => media.requestMediaRelay(sharerId))
  media.setP2PApi({
    removeP2P: p2p.removeP2P,
    initiateP2P: p2p.initiateP2P,
    establishP2P: p2p.establishP2P,
    capP2PVideoBitrate: p2p.capP2PVideoBitrate,
  })
  fileSend.setP2PApi({ establishP2P: p2p.establishP2P })
  fileSend.setCryptoApi({
    establishRelayKey: crypto.establishRelayKey,
    relayKeys: ctx.relayKeys,
  })

  // TURN 凭据在 turn_servers 信令到达后动态覆盖（公共配置接口已剥离凭据）
  function applyTurnServers(servers: Array<{ urls: string; username?: string; credential?: string }>) {
    const withUrls = servers.filter((s) => s && s.urls)
    if (withUrls.length > 0) {
      ctx.rtcConfig = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          ...withUrls,
        ],
      }
    }
  }

  // ==================== WebSocket ====================
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectAttempts = 0

  function buildWSUrl(code: string): string {
    return buildWebSocketUrl(`/ws/room/${code}`)
  }

  function connect(code: string, nickname: string) {
    disconnect()

    roomFull.value = false
    ctx.currentCode.value = code
    ctx.currentNickname.value = nickname
    ctx.ws.value = new WebSocket(buildWSUrl(code))
    ctx.ws.value.binaryType = 'arraybuffer'

    ctx.ws.value.onopen = () => {
      isConnected.value = true
      directStore.setConnected(true)
      reconnectAttempts = 0
      if (ctx.ws.value && ctx.ws.value.readyState === WebSocket.OPEN) {
        ctx.ws.value.send(JSON.stringify({ type: 'join', nickname, client_id: readPersistedClientId() }))
      }
      heartbeatTimer = setInterval(() => {
        if (ctx.ws.value && ctx.ws.value.readyState === WebSocket.OPEN) ctx.ws.value.send('ping')
      }, 30000)
    }

    ctx.ws.value.onmessage = (event) => {
      if (typeof event.data === 'string') {
        let msg: DirectWSMessage
        try {
          msg = JSON.parse(event.data)
        } catch {
          return
        }
        handleMessage(msg)
      } else {
        // 服务器中继的二进制分片（帧头携带 transfer_id，多发送者并发不串台）
        void handleBinary(event.data as ArrayBuffer)
      }
    }

    ctx.ws.value.onclose = (event) => {
      isConnected.value = false
      directStore.setConnected(false)
      p2p.closeAllP2P()
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
      }
      // 中断中的接收任务标记为失败
      for (const it of directStore.items) {
        if (it.kind === 'file' && it.fileDirection === 'incoming' && (it.fileStatus === 'transferring' || it.fileStatus === 'awaiting_confirm')) {
          directStore.failIncomingFile(it.id)
        }
      }
      if (event && event.code === 1013) {
        // 房间已满：不自动重连
        roomFull.value = true
        return
      }
      if (reconnectAttempts < maxReconnectAttempts && ctx.currentCode.value) {
        // 指数退避 + 抖动
        const delay = Math.min(30000, reconnectInterval * 2 ** reconnectAttempts) + Math.floor(Math.random() * 500)
        reconnectTimer = setTimeout(() => {
          reconnectAttempts++
          connect(ctx.currentCode.value, ctx.currentNickname.value)
        }, delay)
      }
    }

    ctx.ws.value.onerror = () => {
      isConnected.value = false
      directStore.setConnected(false)
    }
  }

  // ==================== 二进制接收路由 ====================
  async function handleBinary(buf: ArrayBuffer) {
    const frame = decodeDirectFrame(buf)
    if (!frame) {
      // 帧头非法（首字节非 0xA5）：通常是中继加密分片在发送端的封装/接收端解包不一致。
      // 打日志便于发现"进度 0 + 发送失败"的静默丢片问题，而非无感知丢弃。
      console.warn('[direct] 收到无法解析的二进制分片（帧头非法，长度 ' + buf.byteLength + '），可能中继加密封装不一致')
      return
    }
    let payload = frame.payload
    if (frame.encrypted) {
      // 会话密钥按发送者 client_id 存储（接收侧从文件条目的 offerFromId 取）
      const item = directStore.getFileItem(frame.transferId)
      const key = item ? ctx.relayKeys.get(item.offerFromId || '') : undefined
      if (!key) {
        // 无会话密钥：帧可能先于握手到达（不应发生，因为 file_start 在握手后），丢弃
        return
      }
      const decrypted = await decryptRelayChunk(key, payload)
      if (decrypted === null) {
        // 认证失败：密钥不匹配（如同名文件多路并发）或数据被篡改，判定该文件失败
        if (item) {
          directStore.failIncomingFile(frame.transferId)
          if (item.offerFromId) {
            ctx.sendSignal({ type: 'file_error', transfer_id: frame.transferId, reason: 'decrypt_failed', target: item.offerFromId })
          }
        }
        return
      }
      payload = decrypted
    }
    if (frame.media) {
      // 媒体帧（服务器中转的屏幕/视频流）：经 transfer_id 反查共享者 client_id，
      // 再交给 MediaSource 流式播放（store 按 sharerId 索引）
      const sharerKey = ctx.mediaRelayTransferToSharer.get(frame.transferId)
      if (sharerKey) {
        const [sharerId, idxStr] = sharerKey.split(':')
        directStore.appendMediaChunk(sharerId, payload, Number(idxStr) || 0)
      }
      return
    }
    directStore.appendChunk(payload, frame.transferId, frame.index)
  }

  /** file_end 收尾：完整性校验，失败通知发送方 */
  async function handleFileEnd(transferId: string, fileHash?: string) {
    const result = await directStore.onFileEnd(transferId, fileHash)
    if (result === 'mismatch') {
      const item = directStore.getFileItem(transferId)
      if (item?.offerFromId) {
        ctx.sendSignal({ type: 'file_error', transfer_id: transferId, reason: 'hash_mismatch', target: item.offerFromId })
      }
    }
  }

  /** 接收侧回应：接受则加入发送队列开始传输，拒绝则标记状态 */
  function onFileResponse(msg: DirectWSMessage) {
    const transferId = msg.transfer_id || ''
    const fromId = msg.from_id || ''
    if (!transferId || !fromId) return
    if (msg.accept) {
      directStore.setRecipient(transferId, fromId, msg.nickname || '匿名', 'confirmed')
      fileSend.processSendQueue()
    } else {
      directStore.setRecipient(transferId, fromId, msg.nickname || '匿名', 'declined')
    }
  }

  // ==================== 文本消息路由 ====================
  function handleMessage(msg: DirectWSMessage) {
    switch (msg.type) {
      case 'welcome':
        if (msg.client_id) {
          directStore.setMyClientId(msg.client_id)
          // 服务端签发的身份：缓存供断线重连沿用（服务端校验未被占用才允许）
          persistClientId(msg.client_id)
          p2p.maybeInitP2P()
        }
        break
      case 'turn_servers':
        // 服务端在房间会话内下发完整 TURN 凭据（公共配置已剥离凭据）
        if (Array.isArray(msg.servers)) {
          applyTurnServers(msg.servers)
        }
        break
      case 'user_joined':
        if (msg.members) directStore.setMembers(msg.members)
        if (msg.nickname && msg.nickname !== ctx.currentNickname.value) {
          directStore.addSystem(`${msg.nickname} 加入了房间`)
        }
        // 成员变化 → 尝试与在线成员建立直连通道（预协商）
        p2p.maybeInitP2P()
        // 本端正在共享 → 重新广播"正在共享"，让新加入成员也能看到并决定是否查看
        // camera_count 用真实值（1 主流 + 附加摄像头路数），保证新成员声明正确数量的视频槽位，
        // 否则多摄共享时新成员只声明 1 槽 → 附加视频轨被丢 → 协商失败黑屏
        if (ctx.localMediaStream.value) {
          const camCount = ctx.localMediaType.value === 'video' ? 1 + ctx.localCameraStreams.size : undefined
          ctx.sendSignal({ type: 'media_available', media_type: ctx.localMediaType.value || 'screen', camera_count: camCount })
        }
        break
      case 'user_left':
        if (msg.members) directStore.setMembers(msg.members)
        if (msg.nickname) {
          directStore.addSystem(`${msg.nickname} 离开了房间`)
        }
        // 兜底清理：若离开者正在共享（或本端正查看其共享），清掉其媒体流/中转源与视频窗
        // （正常退出会收到 media_cancel，此处覆盖刷新/断网等未发 media_cancel 的场景）
        if (msg.from_id) {
          directStore.clearIncomingMediaStream(msg.from_id)
          directStore.clearMediaRelaySource(msg.from_id)
          directStore.removeActiveShare(msg.from_id)
        }
        p2p.maybeInitP2P()
        break
      case 'chat_message':
        directStore.onIncomingText({
          sender: msg.sender,
          content: msg.content,
          ts: msg.ts,
          client_id: msg.client_id,
          msg_id: msg.msg_id,
        })
        break
      case 'chat_message_error':
        if (msg.client_id) directStore.markTextFailed(msg.client_id)
        break
      case 'typing':
        if (msg.nickname !== undefined && msg.is_typing !== undefined) {
          directStore.setTyping(msg.nickname, msg.is_typing)
        }
        break
      // ---- WebRTC 信令 ----
      case 'rtc_offer':
        p2p.handleRtcOffer(msg)
        break
      case 'rtc_answer':
        p2p.handleRtcAnswer(msg)
        break
      case 'rtc_ice':
        p2p.handleRtcIce(msg)
        break
      // ---- 中继分片端到端加密握手（ECDH 公钥交换） ----
      case 'crypto_setup':
        void crypto.handleCryptoSetup(msg)
        break
      // ---- 传屏幕/传视频媒体信令 ----
      case 'media_available':
        media.handleMediaAvailable(msg)
        break
      case 'media_offer':
        void media.handleMediaOffer(msg)
        break
      case 'media_answer':
        void media.handleMediaAnswer(msg)
        break
      case 'media_cancel':
        media.handleMediaCancel(msg)
        break
      case 'media_unsubscribe':
        media.handleMediaUnsubscribe(msg)
        break
      case 'media_subscribe':
        void media.handleMediaSubscribe(msg)
        break
      // ---- 文件确认与中继 ----
      case 'file_offer':
        directStore.onFileOffer({
          transfer_id: msg.transfer_id || '',
          file_name: msg.file_name || '',
          file_size: msg.file_size || 0,
          sender: msg.sender || '匿名',
          from_id: msg.from_id || '',
        })
        break
      case 'file_response':
        onFileResponse(msg)
        break
      case 'file_start':
        if (msg.media_mime || msg.mode === 'media-relay') {
          // 媒体中转流：走 MediaSource 流式播放旁路（不建文件接收条目）
          media.handleRelayMediaStart(msg)
        } else {
          directStore.onFileStart({
            transfer_id: msg.transfer_id || '',
            file_name: msg.file_name || '',
            file_size: msg.file_size || 0,
            sender: msg.sender || '匿名',
            mode: msg.mode,
            from_id: msg.from_id,
          })
        }
        break
      case 'file_chunk':
        // 分片数据自带帧头路由，文本帧无需处理
        break
      case 'file_end':
        if (msg.transfer_id) void handleFileEnd(msg.transfer_id, msg.file_hash)
        break
      case 'file_cancel':
        if (msg.message === 'relay_disabled') {
          // 服务器中转已被后台关闭，发送方标记失败
          directStore.setFileStatus(msg.transfer_id || '', 'failed')
          directStore.addSystem(t('direct.file.relayDisabled'))
        } else if (msg.media_mime || msg.mode === 'media-relay' || (msg.transfer_id && msg.transfer_id.startsWith('m-'))) {
          // 媒体中转流结束（单路结束传 camera_idx，否则视为全部结束）→ 关闭对应 MediaSource
          if (msg.from_id) media.handleRelayMediaCancel(msg.from_id, msg.camera_idx)
        } else {
          if (msg.transfer_id) directStore.failIncomingFile(msg.transfer_id)
        }
        break
      case 'file_error':
        // 接收侧完整性校验失败等错误 → 发送侧对应接收者标记失败
        if (msg.transfer_id) {
          directStore.markRecipientFailed(msg.transfer_id, msg.from_id || '')
          directStore.addSystem(t('direct.file.hashMismatch'))
        }
        break
    }
  }

  // ==================== 聊天 ====================
  function sendChatMessage(message: { content: string; client_id: string }) {
    ctx.sendSignal({ type: 'chat_message', ...message })
  }

  function sendTyping(isTyping: boolean) {
    ctx.sendSignal({ type: 'typing', is_typing: isTyping })
  }

  // ==================== 断开 ====================
  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    p2p.closeAllP2P()
    crypto.clearRelayCrypto()
    media.clearLocalMedia()
    if (ctx.ws.value) {
      ctx.ws.value.onclose = null
      ctx.ws.value.close()
      ctx.ws.value = null
    }
    ctx.currentCode.value = ''
    isConnected.value = false
    directStore.setConnected(false)
  }

  onUnmounted(() => {
    disconnect()
  })

  /**
   * 成员连接状态（供头像悬停展示）：
   * - channel：connected=直连已建立 / connecting=协商中 / failed=连接失败 / none=未建立（走服务器中转）
   * - ice：ICE 连接状态（new/checking/connected/completed/failed/disconnected）
   * - rtt / bandwidth：全局 P2P 带宽采样（最近值，ms / bps）
   */
  function getMemberLinkInfo(clientId: string): { channel: string; ice: string; rtt: number; bandwidth: number } {
    const entry = ctx.p2p.get(clientId)
    let channel = 'none'
    let ice = 'new'
    if (entry) {
      ice = entry.pc.iceConnectionState || 'new'
      if (entry.ready) channel = 'connected'
      else if (['new', 'connecting', 'checking'].includes(entry.pc.connectionState || '')) channel = 'connecting'
      else if (entry.pc.connectionState === 'failed' || entry.pc.connectionState === 'disconnected') channel = 'failed'
    }
    return {
      channel,
      ice,
      rtt: ctx.estimatedRtt.value,
      bandwidth: ctx.estimatedBandwidth.value,
    }
  }

  return {
    isConnected,
    roomFull,
    connect,
    disconnect,
    sendChatMessage,
    sendTyping,
    offerFiles: fileSend.offerFiles,
    respondFileOffer: fileSend.respondFileOffer,
    cancelOutgoing: fileSend.cancelOutgoing,
    startMediaShare: media.startMediaShare,
    stopMediaShare: media.stopMediaShare,
    pullMedia: media.pullMedia,
    requestMediaRelay: media.requestMediaRelay,
    stopViewing: media.stopViewing,
    localMediaStream: ctx.localMediaStream,
    localCameraStreams: ctx.localCameraStreams,
    shareCameraFailures: ctx.shareCameraFailures,
    localMediaType: ctx.localMediaType,
    estimatedBandwidth: ctx.estimatedBandwidth,
    estimatedRtt: ctx.estimatedRtt,
    currentMediaPreset: ctx.currentMediaPreset,
    currentShareAudioKind: ctx.currentShareAudioKind,
    setMediaQuality: media.setMediaQuality,
    switchCamera: media.switchCamera,
    setMediaAudioEnabled: media.setMediaAudioEnabled,
    setMediaSystemAudioEnabled: media.setMediaSystemAudioEnabled,
    hasMediaAudio: media.hasMediaAudio,
    hasMediaSystemAudio: media.hasMediaSystemAudio,
    retryAddMicrophone: media.retryAddMicrophone,
    micFailed: ctx.micFailed,
    screenUsesCamera: ctx.screenUsesCamera,
    previewStream: ctx.previewStream,
    cameraPreviewError: ctx.cameraPreviewError,
    listVideoInputDevices: media.listVideoInputDevices,
    detectMultiCameraSupport: media.detectMultiCameraSupport,
    startSharePreview: media.startSharePreview,
    stopSharePreview: media.stopSharePreview,
    takePreviewStream: media.takePreviewStream,
    getPreviewStream: media.getPreviewStream,
    getMemberLinkInfo,
  }
}
