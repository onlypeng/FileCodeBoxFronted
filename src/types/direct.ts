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
  save_messages?: boolean
  cache_enabled?: boolean
}

/** 创建临时房间房间请求 */
export interface CreateDirectRoomRequest {
  title?: string
  expire_style: string
  expire_value: number
  /** 人员上限（1~后台配置 defaultMaxMembers；缺省用后台默认） */
  max_members?: number
  /** 是否保存聊天消息/文件元信息到服务器（随房间过期删除） */
  save_messages?: boolean
  /** 是否启用房间文件缓存（已接收成员作为多源转发，新成员可收取） */
  cache_enabled?: boolean
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
  /**
   * 完整性校验状态。
   * 'unknown' = 无法校验（如多源分片合并：缓存记录未下发整文件哈希），
   * 不得用 'ok' 冒充 —— 那会让损坏的文件显示为"校验通过"。
   */
  hashStatus?: 'pending' | 'verifying' | 'ok' | 'mismatch' | 'unknown'
  /** 接收侧：发送者 client_id（用于回复接受/拒绝） */
  offerFromId?: string
  /** 发送侧：各接收者的状态 */
  recipients?: FileRecipient[]
  /** 历史记录条目（来自 /room/history，只读展示，不参与实时传输逻辑） */
  archived?: boolean
  /** 多源缓存分片：所属原始缓存文件 transfer_id（分片条目用于合并为完整文件） */
  cacheOf?: string
  /** 服务器缓存（上传）状态：uploading 缓存中 / cached 已缓存（仅发送方卡片展示） */
  cacheStatus?: 'uploading' | 'cached'
  /** 服务器缓存上传进度（0-100） */
  cacheProgress?: number
  /** 该文件在服务器上已有缓存（可直接下载，无需发送方在线） */
  serverCached?: boolean
  /** 服务器直链（带短期签名）；仅 serverCached 为真时有效 */
  downloadUrl?: string
}

/** 房间历史记录条目（/room/history 返回） */
export interface RoomHistoryMessage {
  id: number
  sender: string
  content: string
  msg_type: 'text' | 'file'
  file_name: string
  file_size: number
  /** 文件消息：服务器是否已缓存（可直接下载，无需发送方在线） */
  server_cached?: boolean
  /** 文件消息：服务器直链（带短期签名） */
  download_url?: string
  /** 文件消息：缓存过期时间 */
  expires_at?: string | null
  ts: string | null
}

/** 房间历史记录响应：历史消息 + 历史缓存文件 */
export interface RoomHistoryResponse {
  room_code: string
  save_messages: boolean
  cache_enabled: boolean
  messages: RoomHistoryMessage[]
  files: Array<{ transfer_id: string; file_name: string; file_size: number; holders: string[]; holder_names?: string[] }>
}

/** 房间缓存文件（含服务器落盘信息） */
export interface RoomCacheFile {
  transfer_id: string
  file_name: string
  file_size: number
  /**
   * 内容 SHA-256（服务端落盘时流式计算，非客户端声明值）。
   * 多源分片合并后据此校验完整性；空串表示服务端未提供（旧数据），此时无法校验。
   */
  file_hash?: string
  /** 上传者昵称（列表展示用，client_id 重连后会变） */
  uploader_name: string
  owner_id: string
  /** P2P 持有者 client_id 列表：在线成员可作为多源直接收取 */
  holders: string[]
  holder_names: string[]
  /** 是否已真实落盘到服务器（true 时可点击直接下载，无需 P2P、发送方无需在线） */
  server_cached: boolean
  /** 服务器缓存过期时间（ISO）；null = 跟随房间生命周期，随房间过期一起清理 */
  expires_at: string | null
  cached_at: string | null
  /** 带短期签名的下载直链（仅落盘文件有）；签名会过期，需重新拉取列表获取新链接 */
  download_url?: string
}

/** 房间缓存文件列表响应 */
export interface RoomCacheListResponse {
  /** 房间是否启用文件缓存 */
  cache_enabled: boolean
  /** 后台是否开启服务器文件缓存（总开关） */
  server_cache_enabled: boolean
  files: RoomCacheFile[]
}

/** 缓存文件展示行：缓存文件 + 派生展示字段（由 composable 计算后传给面板组件） */
export interface RoomCacheRow extends RoomCacheFile {
  /** 剩余有效期文案 */
  expireText: string
  /** 当前用户是否为上传者（决定能否删除） */
  canDelete: boolean
  /** 服务器下载直链 */
  downloadUrl: string
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
    | 'file_cache_list'
    | 'file_cache_update'
    | 'file_cache_request'
    | 'room_cache_added'
    | 'room_cache_removed'
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
  // 房间文件缓存（cache_enabled）
  files?: Array<{ transfer_id?: string; file_name?: string; file_size?: number; holders?: string[]; holder_names?: string[] }>
  holder_id?: string
  holder_nickname?: string
  /** room_cache_added：已落盘到服务器的缓存文件完整信息 */
  file?: RoomCacheFile
  /** file_offer 定向发送：指定接收者 client_id 列表；为空 = 房间全体（旧语义广播） */
  targets?: string[]
  requester_id?: string
  requester_nickname?: string
  cache_source?: string
  /** 多源缓存分片：part_id 为该分片传输 id（transfer_id 形如 `${原tid}#${k}`） */
  part_id?: string
  /** 多源缓存分片：请求/重发的字节区间（start/end 均包含） */
  range_start?: number
  range_end?: number
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

