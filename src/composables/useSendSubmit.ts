import { FileService, uploadChunkedFile } from '@/services'
import type { AlertType, ApiResponse, ExpireStyle, UploadProgress } from '@/types'
import { calculateFileHash } from '@/utils/file-processing'
import { usePresignedUpload } from './usePresignedUpload'

type Translate = (
  key: string,
  params?: Record<string, string | number | undefined>
) => string

type UseSendSubmitOptions = {
  getMaxFileSize: () => number
  getUploadCount: () => number
  getUploadMinute: () => number
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
}

type SubmitTextOptions = {
  text: string
  expireValue: number
  expireStyle: string
}

export function useSendSubmit(options: UseSendSubmitOptions) {
  const { uploadFile: presignUploadFile, reset: resetPresignUpload } = usePresignedUpload({
    getMaxFileSize: options.getMaxFileSize,
    notify: options.notify
  })

  const handleChunkUpload = async (
    file: File,
    expireValue: number,
    expireStyle: string
  ): Promise<ApiResponse> => {
    return uploadChunkedFile(file, {
      expireValue,
      expireStyle,
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
    expireStyle: string
  ): Promise<ApiResponse<{ code?: string; name?: string }>> => {
    const code = await presignUploadFile(file, {
      expireValue,
      expireStyle: expireStyle as ExpireStyle,
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
    validateFileSize
  }: SubmitFileOptions): Promise<ApiResponse | null> => {
    // 限流检查
    const uploadCount = options.getUploadCount()
    const uploadMinute = options.getUploadMinute()
    if (uploadCount > 0 && selectedFiles.length > uploadCount) {
      throw new Error(`每${uploadMinute}分钟最多上传${uploadCount}个文件`)
    }

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
        }
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
        ? handleChunkUpload(file, expireValue, expireStyle)
        : handlePresignedUpload(file, expireValue, expireStyle)
    }

    // 单文件上传
    const fileToUpload = selectedFile
    if (!fileToUpload) {
      throw new Error(options.translate('send.messages.selectFile'))
    }

    return enableChunk
      ? handleChunkUpload(fileToUpload, expireValue, expireStyle)
      : handlePresignedUpload(fileToUpload, expireValue, expireStyle)
  }

  const submitText = ({ text, expireValue, expireStyle }: SubmitTextOptions) =>
    FileService.uploadText(text, expireValue, expireStyle)

  return {
    resetPresignUpload,
    submitFile,
    submitText
  }
}
