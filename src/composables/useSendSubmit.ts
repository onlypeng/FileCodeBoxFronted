import { FileService, uploadChunkedFile, CollectionService } from '@/services'
import type { AlertType, ApiResponse, ExpireStyle, UploadProgress } from '@/types'
import { calculateFileHash } from '@/utils/file-processing'
import { usePresignedUpload } from './usePresignedUpload'

type Translate = (
  key: string,
  params?: Record<string, string | number | undefined>
) => string

type UseSendSubmitOptions = {
  getMaxFileSize: () => number
  notify: (message: string, type: AlertType) => void
  translate: Translate
  onProgress: (progress: number) => void
  onHashCalculated: (hash: string) => void
}

type SubmitFileOptions = {
  selectedFile: File | null
  selectedFiles: File[]
  expireValue: number
  expireStyle: string
  enableChunk: boolean
  validateFileSize: (file: File) => boolean
  /** 文件备注（可选）；仅备注分享（无文件）时也走此接口 */
  remark?: string
}

export function useSendSubmit(options: UseSendSubmitOptions) {
  const { uploadFile: presignUploadFile, reset: resetPresignUpload } = usePresignedUpload({
    getMaxFileSize: options.getMaxFileSize,
    notify: options.notify
  })

  const handleChunkUpload = async (
    file: File,
    expireValue: number,
    expireStyle: string,
    remark?: string
  ): Promise<ApiResponse> => {
    return uploadChunkedFile(file, {
      expireValue,
      expireStyle,
      remark,
      onHashCalculated: options.onHashCalculated,
      onProgress: (progress: UploadProgress) => {
        options.onProgress(progress.percentage)
      },
      messages: {
        initFailed: options.translate('send.messages.initChunkUploadFailed'),
        chunkFailed: (index) => options.translate('send.messages.chunkUploadFailed', { index }),
        completeFailed: options.translate('send.messages.completeUploadFailed')
      }
    })
  }

  const handlePresignedUpload = async (
    file: File,
    expireValue: number,
    expireStyle: string,
    remark?: string
  ): Promise<ApiResponse<{ code?: string; name?: string }>> => {
    const code = await presignUploadFile(file, {
      expireValue,
      expireStyle: expireStyle as ExpireStyle,
      remark,
      onProgress: (progress) => {
        options.onProgress(progress.percentage)
      }
    })

    if (!code) {
      throw new Error(options.translate('send.messages.uploadFailed'))
    }

    return {
      code: 200,
      detail: {
        code,
        name: file.name
      }
    }
  }

  const submitFile = async ({
    selectedFile,
    selectedFiles,
    expireValue,
    expireStyle,
    enableChunk,
    validateFileSize,
    remark
  }: SubmitFileOptions): Promise<ApiResponse | null> => {
    // 多文件共用一个取件码上传
    if (selectedFiles.length > 1) {
      // 校验每个文件大小
      for (const file of selectedFiles) {
        if (!validateFileSize(file)) return null
      }

      // 计算第一个文件的哈希作为参考
      options.onHashCalculated(await calculateFileHash(selectedFiles[0]))

      // 使用 uploadFiles 一次上传所有文件，共用一个取件码
      const res = await FileService.uploadFiles(
        selectedFiles,
        expireValue,
        expireStyle,
        (progress: UploadProgress) => {
          options.onProgress(progress.percentage)
        },
        remark
      )

      if (res.code === 200 && res.detail) {
        return {
          code: 200,
          detail: {
            code: (res.detail as { code?: string; name?: string; is_multi_file?: boolean }).code,
            name: (res.detail as { code?: string; name?: string; is_multi_file?: boolean }).name,
            is_multi_file: (res.detail as { code?: string; name?: string; is_multi_file?: boolean }).is_multi_file || true
          }
        }
      } else {
        throw new Error(options.translate('send.messages.sendFailed'))
      }
    }

    // 单文件列表（selectedFiles.length === 1）
    if (selectedFiles.length === 1) {
      const file = selectedFiles[0]
      if (!validateFileSize(file)) return null
      options.onHashCalculated(await calculateFileHash(file))

      return enableChunk
        ? handleChunkUpload(file, expireValue, expireStyle, remark)
        : handlePresignedUpload(file, expireValue, expireStyle, remark)
    }

    // 仅备注分享（无文件）：走发送文件接口，后端创建仅备注记录
    if (!selectedFiles.length && !selectedFile) {
      const res = await FileService.uploadFiles([], expireValue, expireStyle, () => {}, remark)
      if (res.code === 200 && res.detail) {
        return {
          code: 200,
          detail: {
            code: (res.detail as { code?: string; name?: string }).code,
            name: (res.detail as { code?: string; name?: string }).name || remark || '',
            is_multi_file: false,
          }
        }
      }
      throw new Error(options.translate('send.messages.sendFailed'))
    }

    // 单文件上传
    const fileToUpload = selectedFile
    if (!fileToUpload) {
      throw new Error(options.translate('send.messages.selectFile'))
    }

    return enableChunk
      ? handleChunkUpload(fileToUpload, expireValue, expireStyle, remark)
      : handlePresignedUpload(fileToUpload, expireValue, expireStyle, remark)
  }

  /** 取件（发件记录详情页刷新多文件列表用） */
  const selectFile = (code: string) => FileService.selectFile(code)

  /** 多文件分享 ZIP 下载 URL */
  const getMultiFileZipUrl = (code: string) => CollectionService.getMultiFileZipUrl(code)

  /** 多文件分享单文件下载 URL */
  const getMultiFileDownloadUrl = (itemId: number, code: string) =>
    CollectionService.getMultiFileDownloadUrl(itemId, code)

  return {
    resetPresignUpload,
    submitFile,
    selectFile,
    getMultiFileZipUrl,
    getMultiFileDownloadUrl,
  }
}
