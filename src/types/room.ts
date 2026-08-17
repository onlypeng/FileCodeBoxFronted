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
