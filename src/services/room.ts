/**
 * 后台管理视角的房间接口：列表、删除、延期、改设置，以及强制清理缓存文件。
 * 与 direct.ts 的成员接口刻意分开：这里走管理员鉴权，能删任意成员上传的缓存文件
 * （不受"仅上传者可删"限制），路径也统一挂在 /admin/room/*。
 *
 * 边界：返回的缓存条目同时含"已落盘"与"仅 P2P 持有"两类，靠 server_cached 区分，
 * 后台清理只该针对前者；download_url 是短期签名，不落地缓存。
 */
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

  /** 后台：修改房间设置（人员上限 / 保存消息 / 文件缓存） */
  static async updateAdminRoom(roomId: number, data: {
    max_members?: number
    save_messages?: number
    cache_enabled?: number
  }): Promise<ApiResponse> {
    return api.patch(`/admin/room/${roomId}`, data)
  }

  /** 后台：保存房间过期时间（按当前时间重设） */
  static async saveAdminRoomExpire(roomId: number, expireStyle: string, expireValue: number): Promise<ApiResponse> {
    return api.patch(`/admin/room/${roomId}/expire`, { expire_style: expireStyle, expire_value: expireValue })
  }

  /** 后台：查看指定房间的缓存文件（含落盘与仅 P2P 持有的条目） */
  static async getAdminRoomCacheFiles(roomId: number): Promise<ApiResponse<AdminRoomCacheFilesResponse>> {
    return api.get(`/admin/room/${roomId}/files`)
  }

  /** 后台：强制删除任意房间缓存文件（不受"仅上传者可删"限制） */
  static async deleteAdminRoomCacheFile(fileId: number): Promise<ApiResponse> {
    return api.delete(`/admin/room/cache-file/${fileId}`)
  }
}

/** 后台视角的房间缓存文件条目 */
export interface AdminRoomCacheFile {
  id: number
  transfer_id: string
  file_name: string
  file_size: number
  uploader_name: string
  /** 是否已落盘到服务器磁盘（可强制清理以释放空间） */
  server_cached: boolean
  expires_at: string | null
  cached_at: string | null
  /** 带短期签名的下载直链（仅落盘文件有） */
  download_url: string
}

export interface AdminRoomCacheFilesResponse {
  room_code: string
  files: AdminRoomCacheFile[]
}
