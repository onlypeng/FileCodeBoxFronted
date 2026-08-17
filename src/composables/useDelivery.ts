/**
 * 投递（delivery）composable
 * 封装 DeliveryService 调用，供投递相关视图使用，避免视图直接依赖 services
 */
import { DeliveryService, FileService } from '@/services'
import type { UploadProgress } from '@/types'

export function useDelivery() {
  /** 获取投递页面信息（使用 delivery_code） */
  const getDeliveryPage = (deliveryCode: string) => DeliveryService.getDeliveryPage(deliveryCode)

  /** 投递文件（使用 delivery_code 认证，非分片模式） */
  const uploadFile = (
    deliveryCode: string,
    file: File,
    uploaderName = '',
    onProgress?: (progress: UploadProgress) => void
  ) => DeliveryService.uploadFile(deliveryCode, file, uploaderName, onProgress)

  /** 投递分片上传初始化 */
  const initChunkUpload = (request: {
    delivery_code: string
    uploader_name?: string
    file_name: string
    file_size: number
    chunk_size: number
    file_hash: string
  }) => DeliveryService.initDeliveryChunkUpload(request)

  /** 上传单个分片（与普通分片上传共用 /chunk 接口，复用 FileService.uploadChunk） */
  const uploadChunk = (
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
    onProgress?: (progress: UploadProgress) => void
  ) => FileService.uploadChunk(uploadId, chunkIndex, chunk, onProgress)

  /** 投递分片上传完成 */
  const completeChunkUpload = (deliveryCode: string, uploadId: string, uploaderName = '') =>
    DeliveryService.completeDeliveryChunkUpload(deliveryCode, uploadId, uploaderName)

  /** 取消投递分片上传 */
  const cancelChunkUpload = (deliveryCode: string, uploadId: string) =>
    DeliveryService.cancelDeliveryChunkUpload(deliveryCode, uploadId)

  return {
    getDeliveryPage,
    uploadFile,
    initChunkUpload,
    uploadChunk,
    completeChunkUpload,
    cancelChunkUpload
  }
}
