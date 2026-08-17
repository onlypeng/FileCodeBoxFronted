/**
 * 直连快传共享上下文：useDirectConnection 拆分后各域模块（P2P/媒体/文件/加密）
 * 共享的状态与回调。组合器（useDirectConnection）创建 context 实例并注入各域工厂，
 * 各域通过 ctx 读写共享状态、调用跨域能力（回调）。
 *
 * 设计：依赖注入容器——避免闭包 God Object，同时保持跨域双向调用
 * （媒体域需要 P2P 建连，文件域需要 P2P + 加密，消息路由需要全部域）。
 */
import type { Ref } from 'vue'
import type { useDirectStore } from '@/stores/directStore'
import type { useConfigStore } from '@/stores/configStore'

/** P2P 连接条目（按目标接收者 client_id 维护） */
export interface P2PEntry {
  pc: RTCPeerConnection
  dc: RTCDataChannel | null
  ready: boolean
  waiters: Array<(dc: RTCDataChannel | null) => void>
  timer?: ReturnType<typeof setTimeout>
}

/** 共享媒体质量档位参数（供 UI 展示带宽建议与类型安全） */
export interface MediaQualityPreset {
  width: number
  height: number
  frameRate: number
  videoBitrate: number
  audioBitrate: number
  /** 适用带宽区间下限（bps），供 UI 展示与 auto 匹配 */
  minBandwidth: number
}

/** 屏幕采集结果 */
export interface ScreenAcquireResult {
  ok: boolean
  stream: MediaStream | null
  /** 采集来源：display=真实屏幕 / camera=前置摄像头替代 */
  mode?: 'display' | 'camera'
  /** 失败原因：denied=用户/系统取消 / unsupported=API 缺失或不可用 */
  reason?: 'denied' | 'unsupported'
}

/** 翻译函数（来自 vue-i18n） */
export type TranslateFn = (key: string, params?: Record<string, unknown>) => string

export interface DirectConnectionContext {
  // ===== 外部 store =====
  directStore: ReturnType<typeof useDirectStore>
  configStore: ReturnType<typeof useConfigStore>
  t: TranslateFn

  // ===== WebSocket 连接状态 =====
  ws: Ref<WebSocket | null>
  currentCode: Ref<string>
  currentNickname: Ref<string>

  // ===== P2P 通道 =====
  p2p: Map<string, P2PEntry>
  /** 协商期间先到达的 ICE 候选，等待 pc 创建后补投 */
  pendingIce: Map<string, RTCIceCandidateInit[]>
  /** STUN 固定 + TURN 动态配置（turn_servers 信令覆盖） */
  rtcConfig: RTCConfiguration

  // ===== 中继分片端到端加密 =====
  myRelayKeyPair: CryptoKeyPair | null
  relayKeys: Map<string, CryptoKey>
  cryptoWaiters: Map<string, () => void>

  // ===== 媒体共享状态 =====
  /** 索引 0 的本地媒体流（兼容现有读取点：含音频轨） */
  localMediaStream: Ref<MediaStream | null>
  /** 多摄像头共享：idx → 该摄像头视频流（仅 video 轨；音频轨在索引 0 流上）。单摄像头时仅 {0} */
  localCameraStreams: Map<number, MediaStream>
  /** 本次共享中打开失败的附加摄像头数（成功后由视图读取并提示） */
  shareCameraFailures: number
  localMediaType: Ref<'screen' | 'video' | null>
  mediaSystemAudioTracks: Set<MediaStreamTrack>
  previewStream: Ref<MediaStream | null>
  /** 多摄像头预览流：key（deviceId 或 facing 值）→ MediaStream（多选预览时每路一路） */
  previewStreams: Map<string, MediaStream>
  /** 最近一次摄像头预览采集失败的 DOMException.name（NotFoundError=未检测到摄像头设备；NotAllowedError=权限被拒；null=未失败） */
  cameraPreviewError: Ref<string | null>
  micFailed: Ref<boolean>
  screenUsesCamera: Ref<boolean>
  /** 中转录制：idx → MediaRecorder（多摄像头每路一路） */
  mediaRecorders: Map<number, MediaRecorder>
  /** 中转录制：idx → transfer_id（多摄像头每路独立流） */
  mediaRelayTransferIds: Map<number, string>
  /** 中转媒体流 transfer_id → "sharerId:idx"（接收侧路由媒体帧到对应 MediaSource） */
  mediaRelayTransferToSharer: Map<string, string>
  /** 共享者 client_id → Map<idx, 当前中转媒体流 transfer_id>（检测共享者重启录制 → 接收侧重建 MediaSource） */
  sharerToRelayTransfer: Map<string, Map<number, string>>
  /** 中转录制缓冲：idx → Blob[]（每路独立） */
  mediaRelayBuffer: Map<number, Blob[]>
  mediaRelaySending: boolean
  /** 中转录制帧序号：idx → index */
  mediaRelayIndex: Map<number, number>
  mediaRelayMime: string
  estimatedBandwidth: Ref<number>
  estimatedRtt: Ref<number>
  bandwidthTimer: ReturnType<typeof setInterval> | null
  currentMediaPreset: Ref<MediaQualityPreset>
  currentShareAudioKind: Ref<'none' | 'mic' | 'system' | 'both'>

  // ===== 文件发送 =====
  queueProcessing: boolean

  // ===== 跨域能力（回调，由组合器注入） =====
  /** 经 WebSocket 发送文本帧（所有域共用） */
  sendSignal: (msg: object) => void
  /** 经 WebSocket 发送中继二进制分片（可选择端到端加密） */
  sendBinary: (buf: ArrayBuffer, key?: CryptoKey) => Promise<boolean>
  /** P2P 通道上的文件控制帧与二进制分片统一入口（setupP2PChannel 数据通道消息路由） */
  handleP2PDataMessage: (e: MessageEvent) => void
  /** 文件接收进度回调（media 域无需） */
  onFileEnd: (transferId: string, fileHash?: string) => Promise<void>
}
