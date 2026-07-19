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

type SubmitUnifiedOptions = {
  text: string
  selectedFile: File | null
  selectedFiles: File[]
  expireValue: number
  expireStyle: string
  enableChunk: boolean
  validateFileSize: (file: File) => boolean
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

  const submitUnified = async ({
    text,
    selectedFile,
    selectedFiles,
    expireValue,
    expireStyle,
    validateFileSize
  }: SubmitUnifiedOptions): Promise<ApiResponse | null> => {
    const hasFiles = selectedFile || selectedFiles.length > 0
    const hasText = text.trim().length > 0

    if (!hasFiles && !hasText) {
      throw new Error(options.translate('send.messages.selectFile'))
    }

    // 无文件 → 纯文本
    if (!hasFiles) {
      return await submitText({ text, expireValue, expireStyle })
    }

    // 有文件 → 走分块/预签名上传（支持文本备注）
    // 注：分块和预签名上传暂不支持文本备注，回退到统一接口
    const allFiles = selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : [])

    // 限流检查
    const uploadCount = options.getUploadCount()
    const uploadMinute = options.getUploadMinute()
    if (uploadCount > 0 && allFiles.length > uploadCount) {
      throw new Error(`每${uploadMinute}分钟最多上传${uploadCount}个文件`)
    }

    // 校验文件大小
    for (const file of allFiles) {
      if (!validateFileSize(file)) return null
    }

    // 计算第一个文件的哈希
    options.onHashCalculated(await calculateFileHash(allFiles[0]))

    // 使用统一接口上传（文件+可选文本备注）
    const res = await FileService.uploadUnified(
      {
        text: hasText ? text : undefined,
        files: allFiles,
        expireValue,
        expireStyle
      },
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
          is_multi_file: (res.detail as { code?: string; name?: string; is_multi_file?: boolean }).is_multi_file || allFiles.length > 1
        }
      }
    } else {
      throw new Error(options.translate('send.messages.sendFailed'))
    }
  }

  return {
    resetPresignUpload,
    submitFile,
    submitText,
    submitUnified
  }
}
