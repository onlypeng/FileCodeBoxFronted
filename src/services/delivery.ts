/**
 * 收件箱"投递侧"的接口：投递页信息与文件上传/分片上传生命周期。
 * 认证用 delivery_code 随表单提交，不依赖管理员 token——投件人本就是匿名访客，
 * 若套用带 Authorization 的通用客户端反而会误带凭据。
 *
 * 边界：init/complete/cancel 三件套里 cancel 负责回滚已占的投递次数，
 * 前端取消上传必须显式调它，否则次数会被一直占着；分片走独立的 /delivery/chunk/*。
 */
import api from './client'
import { multipartUploadConfig } from './shared'
import type { ApiResponse, UploadProgress } from '@/types'
import type {
  DeliveryPageInfo,
  CollectionUploadResponse,
  DeliveryChunkInitResponse
} from '@/types/collection'

export class DeliveryService {
  /** 获取投递页面信息（使用 delivery_code） */
  static async getDeliveryPage(
    deliveryCode: string
  ): Promise<ApiResponse<DeliveryPageInfo>> {
    return api.get(`/delivery/${deliveryCode}`)
  }

  /** 投递文件（使用 delivery_code 认证，非分片模式） */
  static async uploadFile(
    deliveryCode: string,
    file: File,
    uploaderName: string = '',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<CollectionUploadResponse>> {
    const formData = new FormData()
    formData.append('delivery_code', deliveryCode)
    formData.append('file', file)
    formData.append('uploader_name', uploaderName)
    return api.post(
      '/delivery/upload/',
      formData,
      multipartUploadConfig(onProgress)
    )
  }

  /** 投递分片上传初始化（占位投递次数并创建上传会话） */
  static async initDeliveryChunkUpload(request: {
    delivery_code: string
    uploader_name?: string
    file_name: string
    file_size: number
    chunk_size: number
    file_hash: string
  }): Promise<ApiResponse<DeliveryChunkInitResponse>> {
    return api.post('/delivery/chunk/init/', request)
  }

  /** 投递分片上传完成（合并分片并创建投递记录） */
  static async completeDeliveryChunkUpload(
    deliveryCode: string,
    uploadId: string,
    uploaderName: string = ''
  ): Promise<ApiResponse<CollectionUploadResponse>> {
    const formData = new FormData()
    formData.append('delivery_code', deliveryCode)
    formData.append('upload_id', uploadId)
    formData.append('uploader_name', uploaderName)
    return api.post(
      '/delivery/chunk/complete/',
      formData,
      multipartUploadConfig()
    )
  }

  /** 取消投递分片上传（清理分片并回滚投递次数） */
  static async cancelDeliveryChunkUpload(
    deliveryCode: string,
    uploadId: string
  ): Promise<ApiResponse> {
    const formData = new FormData()
    formData.append('delivery_code', deliveryCode)
    formData.append('upload_id', uploadId)
    return api.post('/delivery/chunk/cancel/', formData, multipartUploadConfig())
  }
}
