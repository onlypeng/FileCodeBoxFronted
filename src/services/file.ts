import api, { rawApiClient } from './client'
import { multipartUploadConfig } from './shared'
import type {
  ApiResponse,
  ChunkUploadCompleteRequest,
  ChunkUploadInitRequest,
  ChunkUploadInitResponse,
  ChunkUploadResponse,
  FileListResponse,
  FileUploadResponse,
  ShareSelectResponse,
  UploadProgress
} from '@/types'

const urlEncodedConfig = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}

const toUrlEncodedForm = (data: Record<string, string | number>) => {
  const form = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    form.append(key, String(value))
  })
  return form
}

export class FileService {
  static async uploadFile(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<FileUploadResponse>> {
    const formData = new FormData()
    formData.append('file', file)

    return api.post('/share/file/', formData, multipartUploadConfig(onProgress))
  }

  static async uploadFiles(
    files: File[],
    expireValue: number = 1,
    expireStyle: string = 'day',
    onProgress?: (progress: UploadProgress) => void,
    remark?: string
  ): Promise<ApiResponse<FileUploadResponse>> {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    formData.append('expire_value', String(expireValue))
    formData.append('expire_style', expireStyle)
    if (remark) {
      formData.append('remark', remark)
    }

    return api.post('/share/file/', formData, multipartUploadConfig(onProgress))
  }

  static async initChunkUpload(
    request: ChunkUploadInitRequest
  ): Promise<ApiResponse<ChunkUploadInitResponse>> {
    return api.post(
      '/chunk/upload/init/',
      {
        file_name: request.file_name,
        file_size: request.file_size,
        chunk_size: request.chunk_size,
        file_hash: request.file_hash
      }
    )
  }

  static async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<ChunkUploadResponse>> {
    const formData = new FormData()
    formData.append('chunk', chunk)
    return api.post(
      `/chunk/upload/chunk/${uploadId}/${chunkIndex}`,
      formData,
      multipartUploadConfig(onProgress)
    )
  }

  static async completeChunkUpload(
    uploadId: string,
    request: ChunkUploadCompleteRequest
  ): Promise<ApiResponse<FileUploadResponse>> {
    return api.post(
      `/chunk/upload/complete/${uploadId}`,
      {
        expire_value: request.expire_value,
        expire_style: request.expire_style,
        remark: request.remark || ''
      }
    )
  }

  static async selectFile(code: string): Promise<ApiResponse<ShareSelectResponse>> {
    return api.post('/share/select/', { code })
  }

  /** 只读查询文件分享详情（不消耗取件次数），供记录查看刷新剩余次数/文件列表/过期状态 */
  static async getFileInfo(code: string): Promise<ApiResponse<ShareSelectResponse>> {
    return api.get('/share/select/info/', { params: { code } })
  }

  static async checkCodeType(code: string): Promise<ApiResponse<{ type: string; code: string; title?: string; expired?: boolean }>> {
    return api.get('/share/check_code/', { params: { code } })
  }

  static async downloadFile(code: string): Promise<Blob> {
    const response = await rawApiClient.get<Blob>(`/download/${code}`, {
      responseType: 'blob'
    })
    return response.data
  }

  static async getAdminFileList(params: {
    page: number
    size: number
    keyword?: string
    status?: string
  }): Promise<ApiResponse<FileListResponse>> {
    return api.get('/admin/file/list', { params })
  }

  /** 单文件详情（含完整文本内容） */
  static async getAdminFileDetail(id: number): Promise<ApiResponse> {
    return api.get(`/admin/file/${id}`)
  }

  static async deleteAdminFile(id: number): Promise<ApiResponse> {
    return api.delete('/admin/file/delete', {
      data: { id }
    })
  }

  /** 延长文件过期（day/hour/minute/count/forever） */
  static async extendAdminFile(id: number, expireStyle: string, expireValue: number): Promise<ApiResponse> {
    return api.post('/admin/file/extend', { id, expire_style: expireStyle, expire_value: expireValue })
  }

  /** 修改文件备注（文本分享内容） */
  static async updateAdminFile(id: number, remark: string): Promise<ApiResponse> {
    return api.patch(`/admin/file/${id}`, { remark })
  }

  /** 保存文件过期时间（按当前时间重设） */
  static async saveAdminFileExpire(id: number, expireStyle: string, expireValue: number): Promise<ApiResponse> {
    return api.patch(`/admin/file/${id}/expire`, { expire_style: expireStyle, expire_value: expireValue })
  }
}
