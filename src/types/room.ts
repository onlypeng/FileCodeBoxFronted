// 后台统一房间管理类型定义（临时房间房间）

/** 后台管理-统一房间列表项 */
export interface AdminRoomItem {
  id: number
  room_code: string
  title: string
  max_members: number
  online_count: number
  is_expired: boolean
  expire_style: string
  expire_value: number
  expired_at: string | null
  created_at: string | null
  /** 次数模式剩余次数（-1 表示非次数模式） */
  expired_count?: number
  /** 保存聊天消息/文件元信息到服务器（随房间过期删除） */
  save_messages: boolean
  /** 启用房间文件缓存（已接收成员作为多源转发） */
  cache_enabled: boolean
  /** 已保存的房间消息数 */
  message_count?: number
  /** 房间缓存文件数 */
  cached_count?: number
  /** 前端展示：创建时间 */
  displayCreatedAt?: string
  /** 前端展示：过期时间 */
  displayExpiredAt?: string
}

export interface AdminRoomListResponse {
  page: number
  size: number
  data: AdminRoomItem[]
  total: number
}
