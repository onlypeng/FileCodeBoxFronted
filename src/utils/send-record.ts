import type { ApiResponse, SendType, SentFileRecord, SentRecordType } from '@/types'
import { formatFileSize } from '@/utils/common'

type Translate = (key: string, params?: Record<string, string | number>) => string

type BuildSentRecordInput = {
  response: ApiResponse
  sendType: SendType
  textContent: string
  selectedFile: File | null
  selectedFiles: File[]
  expirationMethod: string
  expirationValue: string
  translate: Translate
  getUnit: (method: string) => string
}

export function formatExpirationTime(
  method: string,
  value: string,
  translate: Translate,
  getUnit: (method: string) => string
): string {
  if (method === 'forever') return translate('send.expiration.units.forever')
  if (method === 'count') return translate('send.messages.expiresAfterCount', { count: value })

  const now = new Date()
  const expireValue = parseInt(value)

  switch (method) {
    case 'minute':
      now.setMinutes(now.getMinutes() + expireValue)
      break
    case 'hour':
      now.setHours(now.getHours() + expireValue)
      break
    case 'day':
      now.setDate(now.getDate() + expireValue)
      break
    default:
      return translate('send.messages.expiresAfter', { value, unit: getUnit(method) })
  }

  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  return translate('send.messages.expiresAt', { date: `${year}-${month}-${day} ${hours}:${minutes}` })
}

export function buildSentRecord(input: BuildSentRecordInput): SentFileRecord {
  const detail = input.response.detail as { code?: string; name?: string; is_multi_file?: boolean } | undefined
  const retrieveCode = detail?.code || ''
  const isMultiFile = detail?.is_multi_file || input.selectedFiles.length > 1
  const isText = input.sendType === 'text'
  // 多文件与单文件名称保持一致：多文件显示"第一个文件名 + 等N个文件"，数量由名称直接体现
  // 文本记录与文件记录合并：统一 type 为 file，名称直接显示文本正文
  const fileName = isText
    ? input.textContent
    : isMultiFile
      ? input.selectedFiles.length > 0
        ? input.translate('records.multiFileName', {
            name: input.selectedFiles[0].name,
            count: input.selectedFiles.length
          })
        : detail?.name || ''
      : detail?.name || ''
  const recordType: SentRecordType = isMultiFile ? 'multiFile' : 'file'

  const totalSelectedSize = input.selectedFiles.reduce((total, file) => total + file.size, 0)
  const displaySize =
    input.sendType === 'text'
      ? formatFileSize(input.textContent.length)
      : input.selectedFiles.length > 0
        ? formatFileSize(totalSelectedSize)
        : formatFileSize(input.selectedFile?.size || 0)

  return {
    id: Date.now(),
    filename: fileName,
    date: new Date().toLocaleString(),
    size: displaySize,
    expiration:
      input.expirationMethod === 'forever'
        ? input.translate('send.expiration.forever')
        : formatExpirationTime(
            input.expirationMethod,
            input.expirationValue,
            input.translate,
            input.getUnit
          ),
    retrieveCode,
    type: recordType,
    isMultiFile,
    fileCount: isMultiFile ? input.selectedFiles.length : undefined,
    files: isMultiFile
      ? input.selectedFiles.map((f) => ({ name: f.name, size: f.size }))
      : input.selectedFile
        ? [{ name: input.selectedFile.name, size: input.selectedFile.size }]
        : undefined,
    text: input.textContent || undefined,
  }
}
