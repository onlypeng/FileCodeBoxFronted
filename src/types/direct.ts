// 临时房间（消息 + 文件一体，多人 + 确认）类型定义

/** 临时房间房间信息 */
export interface DirectRoomInfo {
  room_code: string
  title: string
  max_members: number
  expire_style: string
  expire_value: number
  expired_at: string | null
  created_at: string | null
}

/** 创建临时房间房间请求 */
export interface CreateDirectRoomRequest {
  title?: string
  expire_style: string
  expire_value: number
  /** 人员上限（1~后台配置 defaultMaxMembers；缺省用后台默认） */
  max_members?: number
}

/** 房间成员（在线） */
export interface DirectMember {
  client_id: string
  nickname: string
}

/** 文件发送状态（outgoing 侧按接收者跟踪） */
export type FileRecipientStatus = 'waiting' | 'confirmed' | 'transferring' | 'done' | 'declined' | 'failed'

export interface FileRecipient {
  client_id: string
  nickname: string
  status: FileRecipientStatus
}

/** 文件项状态 */
export type FileItemStatus =
  | 'awaiting_confirm' // 等待对方确认（发送侧）
  | 'transferring'
  | 'paused'
  | 'done'
  | 'canceled'
  | 'failed'
  | 'declined'

/** 传输方式 */
export type DirectTransferMode = 'p2p' | 'relay' | 'media-relay'

/** 聊天流条目（文本 / 文件 / 系统消息统一） */
export interface DirectChatItem {
  id: string // 唯一 key（文本: msg_id/client_id；文件: transfer_id；系统: uid）
  kind: 'text' | 'file' | 'system'
  sender: string
  isSelf: boolean
  ts: number
  // ---- 文本 ----
  content?: string
  sendStatus?: 'sending' | 'sent' | 'failed'
  // ---- 文件 ----
  transferId?: string
  fileName?: string
  fileSize?: number
  fileDirection?: 'outgoing' | 'incoming'
  fileStatus?: FileItemStatus
  mode?: DirectTransferMode // 传输方式：直连 / 服务器中转
  transferred?: number
  /** 传输速率（字节/秒，节流更新） */
  speed?: number
  /** 预计剩余秒数 */
  eta?: number
  /** 期望的 SHA-256（file_end 携带） */
  fileHash?: string
  /** 完整性校验状态 */
  hashStatus?: 'pending' | 'verifying' | 'ok' | 'mismatch'
  /** 接收侧：发送者 client_id（用于回复接受/拒绝） */
  offerFromId?: string
  /** 发送侧：各接收者的状态 */
  recipients?: FileRecipient[]
}

/** 文本消息（内存态） */
export interface DirectMessage {
  id: number
  sender_name: string
  content: string
  ts: number
  client_id?: string
  status?: 'sending' | 'sent' | 'failed'
  isSelf?: boolean
}

/** WebSocket 入站消息（文本帧） */
export interface DirectWSMessage {
  type:
    | 'welcome'
    | 'user_joined'
    | 'user_left'
    | 'chat_message'
    | 'chat_message_error'
    | 'typing'
    | 'file_offer'
    | 'file_response'
    | 'file_start'
    | 'file_chunk'
    | 'file_end'
    | 'file_cancel'
    | 'file_error'
    | 'rtc_offer'
    | 'rtc_answer'
    | 'rtc_ice'
    | 'crypto_setup'
    | 'media_available'
    | 'media_offer'
    | 'media_answer'
    | 'media_cancel'
    | 'media_unsubscribe'
    | 'media_subscribe'
    | 'turn_servers'
  // 通用
  client_id?: string
  nickname?: string
  online_users?: string[]
  members?: DirectMember[]
  sender?: string
  content?: string
  ts?: number
  msg_id?: number
  is_typing?: boolean
  message?: string
  // TURN 凭据（加入房间后服务端下发；公共配置接口已剥离凭据）
  servers?: Array<{ urls: string; username?: string; credential?: string }>
  // 文件确认
  transfer_id?: string
  file_name?: string
  file_size?: number
  from_id?: string
  accept?: boolean
  index?: number
  mode?: DirectTransferMode
  /** file_end 携带的 SHA-256（完整性校验） */
  file_hash?: string
  /** file_error 原因 */
  reason?: string
  // WebRTC 信令
  target?: string
  description?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  // 中继分片端到端加密（crypto_setup）：ECDH 公钥（SPKI base64）
  pub?: string
  // 传屏幕/传视频：共享类型（screen=屏幕，video=摄像头+麦克风）
  media_type?: 'screen' | 'video'
  /** 视频共享的摄像头数量（接收端据此声明对应数量的视频轨道槽位） */
  camera_count?: number
  /** 媒体中转流的 MIME（MediaSource 初始化用，如 video/webm;codecs=vp8,opus） */
  media_mime?: string
  /** 媒体中转流的摄像头索引（多摄像头同时传输时区分各路；缺省 0） */
  camera_idx?: number
}

