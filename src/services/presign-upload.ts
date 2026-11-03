/**
 * 预签名直传的三段式接口：init（换 URL）↦ put（传数据）↦ confirm（落库）。
 *
 * ## 为什么不用 `FileService.uploadChunk` 之类的方式
 * 对象存储场景下文件不该流经应用服务器，否则带宽与内存都扛不住。
 * 代价是**多了一次 round-trip**，且中间态（已 put 到 S3、未 confirm）难以回滚：
 * 一旦 put 成功而 confirm 超时，占用的空间只能靠后端定时清理，前端不应整体重传。
 *
 * ## 关键约定
 * init 返回的 `upload_url` 是**一次性、短期**的。延期后必须重新 init。
 * put 这一步分两条路走：
 * - `mode === 'direct'`：用 `directUploadToS3` 把 PUT 打到对象存储（跨域、不带我们的 token）
 * - `mode === 'proxy'`：用 `proxyUpload` 仍发给我们自己的后端
 * 上层不应对 mode 分支 —— 二者 confirm 完全一致。
 *
 * ## 刻意不做
 * 不自动替调用方判断该用哪条路：选路依赖 init 的返回值，而 init 由上层决定何时调用
 * （例如多文件上传时要先排队）。
 */
import api from './client'
import { multipartUploadConfig } from './shared'
import { uploadToExternalUrl } from './upload-client'
import type {
  ApiResponse,
  PresignConfirmRequest,
  PresignInitRequest,
  PresignInitResponse,
  PresignStatusResponse,
  PresignUploadResult,
  UploadProgress
} from '@/types'

export class PresignUploadService {
  static async initUpload(request: PresignInitRequest): Promise<ApiResponse<PresignInitResponse>> {
    return api.post('/presign/upload/init', request)
  }

  static async proxyUpload(
    uploadId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    remark?: string,
    accessCode?: string
  ): Promise<ApiResponse<PresignUploadResult>> {
    const formData = new FormData()
    formData.append('file', file)
    if (remark) {
      formData.append('remark', remark)
    }
    if (accessCode) {
      formData.append('access_code', accessCode)
    }

    return api.put(`/presign/upload/proxy/${uploadId}`, formData, multipartUploadConfig(onProgress))
  }

  static async confirmUpload(
    uploadId: string,
    request?: PresignConfirmRequest
  ): Promise<ApiResponse<PresignUploadResult>> {
    return api.post(`/presign/upload/confirm/${uploadId}`, request || {})
  }

  static async getUploadStatus(uploadId: string): Promise<ApiResponse<PresignStatusResponse>> {
    return api.get(`/presign/upload/status/${uploadId}`)
  }

  static async cancelUpload(uploadId: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete(`/presign/upload/${uploadId}`)
  }

  static async directUploadToS3(
    uploadUrl: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<boolean> {
    await uploadToExternalUrl(uploadUrl, file, onProgress)
    return true
  }
}
