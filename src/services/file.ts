import api from './client'
import { multipartUploadConfig } from './shared'
import type {
  AdminBatchPolicyActionRequest,
  AdminBatchPolicyActionResponse,
  AdminBatchUpdateFilesRequest,
  AdminBatchUpdateFilesResponse,
  AdminFileDetailResponse,
  AdminFileListParams,
  AdminFileMetadataRequest,
  AdminFilePolicyActionRequest,
  AdminFileViewPreset,
  AdminFileViewPresetRequest,
  ApiResponse,
  CheckCodeResponse,
  ChunkUploadCompleteRequest,
  ChunkUploadInitRequest,
  ChunkUploadInitResponse,
  ChunkUploadResponse,
  FileListResponse,
  FileUploadResponse,
  ShareSelectResponse,
  TextSendResponse,
  UploadProgress
} from '@/types'



export class FileService {
  static async uploadFile(
    file: File,
    expireValue: number = 1,
    expireStyle: string = 'day',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<FileUploadResponse>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('expire_value', String(expireValue))
    formData.append('expire_style', expireStyle)

    return api.post('/share/file/', formData, multipartUploadConfig(onProgress))
  }

  static async uploadFiles(
    files: File[],
    expireValue: number = 1,
    expireStyle: string = 'day',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<FileUploadResponse>> {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    formData.append('expire_value', String(expireValue))
    formData.append('expire_style', expireStyle)

    return api.post('/share/file/', formData, multipartUploadConfig(onProgress))
  }

  static async uploadText(
    text: string,
    expireValue = 1,
    expireStyle = 'day'
  ): Promise<ApiResponse<TextSendResponse>> {
    const formData = new FormData()
    formData.append('text', text)
    formData.append('expire_value', String(expireValue))
    formData.append('expire_style', expireStyle)
    return api.post('/share/text/', formData, multipartUploadConfig())
  }

  static async uploadUnified(
    params: {
      text?: string
      files?: File[]
      expireValue: number
      expireStyle: string
    },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<FileUploadResponse>> {
    const formData = new FormData()
    if (params.text && params.text.trim()) {
      formData.append('text', params.text)
    }
    if (params.files && params.files.length > 0) {
      for (const file of params.files) {
        formData.append('files', file)
      }
    }
    formData.append('expire_value', String(params.expireValue))
    formData.append('expire_style', params.expireStyle)
    return api.post('/share/', formData, multipartUploadConfig(onProgress))
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
        expire_style: request.expire_style
      }
    )
  }

  static async selectFile(code: string): Promise<ApiResponse<ShareSelectResponse>> {
    return api.post('/share/select/', { code })
  }

  static async checkCodeType(code: string): Promise<ApiResponse<CheckCodeResponse>> {
    return api.get('/share/check_code/', { params: { code } })
  }

  static async getAdminFileList(params: AdminFileListParams): Promise<ApiResponse<FileListResponse>> {
    return api.get('/admin/file/list', { params })
  }

  static async getAdminFileDetail(id: number): Promise<ApiResponse<AdminFileDetailResponse>> {
    return api.get('/admin/file/detail', { params: { id } })
  }

  static async deleteAdminFile(id: number): Promise<ApiResponse> {
    return api.delete('/admin/file/delete', {
      data: { id }
    })
  }

  static async batchDeleteAdminFiles(ids: number[]): Promise<ApiResponse> {
    return api.delete('/admin/file/batch-delete', {
      data: { ids }
    })
  }

  static async batchUpdateAdminFiles(request: AdminBatchUpdateFilesRequest): Promise<ApiResponse<AdminBatchUpdateFilesResponse>> {
    return api.patch('/admin/file/batch-update', request)
  }

  static async applyAdminFilePolicyAction(request: AdminFilePolicyActionRequest): Promise<ApiResponse<AdminFileDetailResponse>> {
    return api.patch('/admin/file/policy-action', request)
  }

  static async applyAdminBatchPolicyAction(request: AdminBatchPolicyActionRequest): Promise<ApiResponse<AdminBatchPolicyActionResponse>> {
    return api.patch('/admin/file/batch-policy-action', request)
  }

  static async updateAdminFileMetadata(request: AdminFileMetadataRequest): Promise<ApiResponse<AdminFileDetailResponse>> {
    return api.patch('/admin/file/metadata', request)
  }

  static async getAdminFileViewPresets(): Promise<ApiResponse<{ presets?: AdminFileViewPreset[]; items?: AdminFileViewPreset[]; total?: number }>> {
    return api.get('/admin/file/view-presets')
  }

  static async saveAdminFileViewPreset(request: AdminFileViewPresetRequest): Promise<ApiResponse> {
    return api.post('/admin/file/view-presets', request)
  }

  static async deleteAdminFileViewPreset(id: string): Promise<ApiResponse> {
    return api.delete('/admin/file/view-presets', { data: { id } })
  }

  static async downloadAdminFile(id: number): Promise<Blob> {
    return api.get(`/admin/file/download?file_id=${id}`, {
      responseType: 'blob'
    })
  }

  static async previewAdminFile(id: number): Promise<ApiResponse> {
    return api.get(`/admin/file/preview/${id}`)
  }
}
