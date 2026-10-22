import api, { apiBaseURL } from './client'
import type { ApiResponse } from '@/types'
import type {
  CreateDirectRoomRequest,
  DirectRoomInfo,
  RoomHistoryResponse,
  RoomCacheFile,
  RoomCacheListResponse,
} from '@/types/direct'

export class DirectService {
  /** 创建临时房间房间（聊天 + 文件 + P2P 媒体，服务器中转兜底） */
  static async createRoom(
    data: CreateDirectRoomRequest
  ): Promise<ApiResponse<DirectRoomInfo>> {
    return api.post('/room/create/', data)
  }

  /** 获取房间信息（加入页展示） */
  static async getRoomInfo(roomCode: string): Promise<ApiResponse<DirectRoomInfo>> {
    return api.get(`/room/info/${roomCode}`)
  }

  /** 获取房间历史记录（保存消息/传输文件元信息 + 历史缓存文件） */
  static async getRoomHistory(
    roomCode: string,
    params?: { limit?: number; beforeId?: number }
  ): Promise<ApiResponse<RoomHistoryResponse>> {
    return api.get(`/room/history/${roomCode}`, {
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        // 上滑加载更早的消息：服务端只返回 id 小于 before_id 的记录
        ...(params?.beforeId ? { before_id: params.beforeId } : {}),
      },
    })
  }

  /**
   * 换取最新的下载直链。
   * 列表里下发的链接签名只有 30 分钟有效期，页面停留久了再点下载会报
   * "下载链接无效或已过期"——点下载前先换一次新链接。
   */
  static async getCacheDownloadLink(
    roomCode: string,
    transferId: string
  ): Promise<ApiResponse<{ download_url: string }>> {
    return api.get(`/room/${roomCode}/file/${transferId}/link`)
  }

  /** 获取房间缓存文件列表（含服务器落盘文件，可直接下载） */
  static async getCacheFiles(roomCode: string): Promise<ApiResponse<RoomCacheListResponse>> {
    return api.get(`/room/${roomCode}/files`)
  }

  /**
   * 上传文件到房间服务器缓存（双通道中的"落盘"通道；默认通道仍是 P2P 直连）
   * @param cacheHours 缓存小时数；0 = 跟随房间生命周期（随房间过期一起清理）
   */
  static async uploadCacheFile(
    roomCode: string,
    file: File,
    params: {
      transferId: string
      clientId: string
      uploaderName: string
      cacheHours: number
      /** 内容哈希（SHA-256）：服务端据此去重，相同文件只落盘一份 */
      fileHash?: string
    },
    /** 上传进度回调（0-100），驱动卡片上的"缓存到服务器"进度条 */
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<RoomCacheFile>> {
    const form = new FormData()
    form.append('file', file)
    form.append('transfer_id', params.transferId)
    form.append('client_id', params.clientId)
    form.append('uploader_name', params.uploaderName)
    form.append('cache_hours', String(params.cacheHours))
    if (params.fileHash) form.append('file_hash', params.fileHash)
    return api.post(`/room/${roomCode}/file/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (!onProgress) return
        const total = e.total || file.size || 0
        if (total > 0) {
          onProgress(Math.min(100, Math.round(((e.loaded || 0) / total) * 100)))
        }
      },
    })
  }

  /** 删除房间缓存文件（上传者本人可删；落盘文件会同时删除磁盘数据） */
  static async deleteCacheFile(
    roomCode: string,
    transferId: string,
    clientId: string
  ): Promise<ApiResponse> {
    return api.delete(`/room/${roomCode}/file/${transferId}`, { params: { client_id: clientId } })
  }

  /** 服务器缓存文件下载直链（可直接点击下载，无需 P2P、发送方无需在线） */
  static cacheFileDownloadUrl(roomCode: string, transferId: string): string {
    return `${apiBaseURL}/room/${roomCode}/file/${transferId}/download`
  }
}
