import api from './client'
import type { ApiResponse } from '@/types'
import type {
  AdminRoomItem,
  AdminRoomListResponse,
} from '@/types/room'

export class RoomService {
  /** 后台：统一房间列表（临时房间房间） */
  static async getAdminRoomList(params: {
    page: number
    size: number
    keyword?: string
    status?: string
  }): Promise<ApiResponse<AdminRoomListResponse>> {
    return api.get('/admin/room/list', { params })
  }

  /** 后台：删除房间 */
  static async deleteAdminRoom(roomId: number): Promise<ApiResponse> {
    return api.delete(`/admin/room/${roomId}`)
  }

  /** 后台：延长房间过期（day/hour/minute/count/forever） */
  static async extendAdminRoom(roomId: number, expireStyle: string, expireValue: number): Promise<ApiResponse> {
    return api.post(`/admin/room/${roomId}/extend`, { expire_style: expireStyle, expire_value: expireValue })
  }

  /** 后台：修改房间人员上限（1~后台 defaultMaxMembers） */
  static async updateAdminRoom(roomId: number, maxMembers: number): Promise<ApiResponse> {
    return api.patch(`/admin/room/${roomId}`, { max_members: maxMembers })
  }

  /** 后台：保存房间过期时间（按当前时间重设） */
  static async saveAdminRoomExpire(roomId: number, expireStyle: string, expireValue: number): Promise<ApiResponse> {
    return api.patch(`/admin/room/${roomId}/expire`, { expire_style: expireStyle, expire_value: expireValue })
  }
}
