import api from './client'
import type { ApiResponse } from '@/types'
import type {
  CreateDirectRoomRequest,
  DirectRoomInfo,
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
}
