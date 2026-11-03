/**
 * 后台"统一房间管理"列表所需的类型。
 *
 * ## 取舍
 * 这里只有**列表/管理视角**的房间模型，房间内部的实时协议类型一律放在 `direct.ts`：
 * 管理列表是分页、蛇形、含过期派生字段的形状；实时协议则是 WS 帧、扁平、高频。
 * 两者混在一个文件会让每次改 WS 协议都要顾虑后台列表。
 *
 * `displayCreatedAt` / `displayExpiredAt` 是**前端注入**的展示字段（原始值可能为
 * null 或 UTC），刻意加 `display` 前缀以区别于后端下发的真值 —— 排序、筛选必须
 * 用原始字段，展示才用这里。
 */

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
