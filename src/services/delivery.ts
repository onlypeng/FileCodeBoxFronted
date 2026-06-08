import api from './client'
import { multipartUploadConfig } from './shared'
import type { ApiResponse, UploadProgress } from '@/types'
import type { DeliveryPageInfo, CollectionUploadResponse } from '@/types/collection'

export class DeliveryService {
  /** 获取投递页面信息（使用 delivery_code） */
  static async getDeliveryPage(
    deliveryCode: string
  ): Promise<ApiResponse<DeliveryPageInfo>> {
    return api.get(`/delivery/${deliveryCode}`)
  }

  /** 投递文件（使用 delivery_code 认证） */
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
}
