import { saveAs } from 'file-saver'
import type { ReceivedFileRecord } from '@/types'
import { buildDownloadUrl } from '@/utils/share-url'
import { CollectionService } from '@/services/collection'

/** 非文件类 Content-Type（遇到这些类型视为错误响应） */
const NON_FILE_CONTENT_TYPES = ['text/html', 'application/json', 'text/plain']

/** 下载失败原因 */
export type DownloadFailReason = 'expired' | 'not_found' | 'auth_failed' | 'network' | 'other'

/** 下载结果 */
export interface DownloadResult {
  success: boolean
  reason?: DownloadFailReason
  errorMessage?: string
}

/** 提示回调（由调用方注入，避免工具层直接依赖 store） */
export type DownloadNotify = (message: string, type: 'success' | 'error') => void

/** 将 Blob 保存为本地文件（统一走 file-saver，saveAs 只允许出现在本文件内） */
export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename)
}

/**
 * 通过 fetch + blob 下载文件（替代 window.open）
 * - 后端返回错误时能捕获并通过 toast 提示
 * - 校验 Content-Type 防止下载到错误页面/HTML
 * - 返回结构化结果，调用方可根据 reason 更新记录状态
 */
export async function downloadFile(
  url: string,
  filename?: string,
  options?: {
    /** 下载前的前端过期预检，为 true 则阻止下载 */
    isExpired?: boolean
    /** 过期时的自定义提示文字 */
    expiredMessage?: string
    /** 是否静默模式（不弹 toast），由调用方自行处理提示 */
    silent?: boolean
    /** 提示回调（未传入且非静默时，仅输出到控制台） */
    notify?: DownloadNotify
  }
): Promise<DownloadResult> {
  const notify = options?.notify
  const showToast = !options?.silent

  const showMessage = (message: string, type: 'success' | 'error') => {
    if (showToast) {
      if (notify) notify(message, type)
      else console.error(message)
    }
  }

  // 前端过期预检
  if (options?.isExpired) {
    const msg = options.expiredMessage || '该取件码已过期，无法下载'
    showMessage(msg, 'error')
    return { success: false, reason: 'expired', errorMessage: msg }
  }

  try {
    const response = await fetch(url)

    // 1) 状态码检查：非 2xx 直接拦截
    if (!response.ok) {
      const { message, reason } = await extractErrorMessage(response, options)
      showMessage(message, 'error')
      return { success: false, reason, errorMessage: message }
    }

    // 2) Content-Type 检查：防止后端返回 200 但内容是错误页面
    const contentType = response.headers.get('Content-Type') || ''
    if (NON_FILE_CONTENT_TYPES.some(t => contentType.toLowerCase().startsWith(t))) {
      // 尝试读取 body 判断是否为错误信息
      const errorMsg = await tryReadErrorBody(response)
      if (errorMsg) {
        const reason = detectFailReason(errorMsg)
        showMessage(errorMsg, 'error')
        return { success: false, reason, errorMessage: errorMsg }
      } else {
        const msg = options?.expiredMessage || '下载失败：服务器返回了非文件内容'
        showMessage(msg, 'error')
        return { success: false, reason: 'other', errorMessage: msg }
      }
    }

    // 3) 获取文件名
    const contentDisposition = response.headers.get('Content-Disposition')
    let downloadName = filename
    if (!downloadName && contentDisposition) {
      const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(contentDisposition)
      if (match) downloadName = decodeURIComponent(match[1])
      else {
        const match2 = /filename="?([^"]+)"?/i.exec(contentDisposition)
        if (match2) downloadName = match2[1]
      }
    }
    if (!downloadName) downloadName = 'download'

    // 4) Blob 大小校验：异常小的 blob 可能是空页面
    const blob = await response.blob()
    if (blob.size < 10) {
      const msg = '下载失败：文件为空'
      showMessage(msg, 'error')
      return { success: false, reason: 'other', errorMessage: msg }
    }

    saveAs(blob, downloadName)
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    let reason: DownloadFailReason = 'other'
    let displayMsg = ''
    // Failed to fetch / NetworkError 等网络层异常，很可能是后端因过期/CORS等原因拒绝连接
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch') || msg.includes('Load failed')) {
      displayMsg = options?.expiredMessage || '下载失败，该取件码可能已过期'
      reason = 'network'
    } else if (msg) {
      displayMsg = msg
    } else {
      displayMsg = '下载失败，请稍后重试'
    }
    showMessage(displayMsg, 'error')
    return { success: false, reason, errorMessage: displayMsg }
  }
}

/** 需要从错误文本中过滤掉的无关内容（应用名、通用词汇等） */
const NOISE_PATTERNS = [
  /驿码[\s\-]*FileCodeBox?/g,
  /FileCodeBox[\s\-]*驿码/g,
  /口令传送箱/g,
  /匿名口令分享/g,
  /^[\s\r\n]{1,5}$/gm,  // 纯空白行
]

/** 清理从 HTML 中提取的错误文本，去除无关内容 */
function cleanExtractedText(raw: string): string {
  let cleaned = raw
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }
  // 去除多余空格
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim()
  return cleaned
}

/** 根据错误信息检测失败原因 */
function detectFailReason(errorMsg: string): DownloadFailReason {
  if (errorMsg.includes('过期') || errorMsg.includes('expired') || errorMsg.includes('Gone')) {
    return 'expired'
  }
  if (errorMsg.includes('不存在') || errorMsg.includes('not found') || errorMsg.includes('Not Found')) {
    return 'not_found'
  }
  if (errorMsg.includes('鉴权') || errorMsg.includes('Forbidden') || errorMsg.includes('unauthorized')) {
    return 'auth_failed'
  }
  return 'other'
}

/** 从错误响应中提取可读的错误信息和失败原因 */
async function extractErrorMessage(
  response: Response,
  options?: { expiredMessage?: string }
): Promise<{ message: string; reason: DownloadFailReason }> {
  // 410 过期 → 优先使用过期提示
  if (response.status === 410) {
    return { message: options?.expiredMessage || '已过期，无法下载', reason: 'expired' }
  }
  // 403 鉴权失败
  if (response.status === 403) {
    return { message: '下载鉴权失败', reason: 'auth_failed' }
  }

  let errorMsg = ''

  try {
    const text = await response.text()
    // 尝试解析 JSON 错误体
    try {
      const errData = JSON.parse(text)
      if (errData.detail) errorMsg = String(errData.detail)
    } catch {
      // 非 JSON，提取纯文本（去除 HTML 标签）
      const cleaned = text.replace(/<[^>]+>/g, '').trim()
      if (cleaned && cleaned.length < 500) errorMsg = cleaned
    }
  } catch { /* body 读取失败 */ }

  // 清理无关内容
  errorMsg = cleanExtractedText(errorMsg)

  // 404 特殊处理：读取后端返回的具体错误信息
  if (response.status === 404) {
    if (errorMsg.includes('没有文件') || errorMsg.includes('no file') || errorMsg.includes('No file')) {
      return { message: errorMsg, reason: 'other' }
    }
    return { message: options?.expiredMessage || '文件不存在或已过期', reason: 'not_found' }
  }

  if (!errorMsg) errorMsg = `下载失败 (${response.status})`

  const reason = detectFailReason(errorMsg)
  // 识别过期关键词
  if (reason === 'expired') {
    return { message: options?.expiredMessage || '已过期，无法下载', reason: 'expired' }
  }

  return { message: errorMsg, reason }
}

/** 尝试从非文件类型的响应体中提取错误信息 */
async function tryReadErrorBody(response: Response): Promise<string | null> {
  try {
    const text = await response.text()
    // JSON 格式
    try {
      const data = JSON.parse(text)
      if (data.detail) return String(data.detail)
    } catch { /* not json */ }
    // HTML 中提取纯文本（去除标签）
    const rawCleaned = text.replace(/<[^>]+>/g, '').trim()
    if (rawCleaned && rawCleaned.length < 500) {
      const cleaned = cleanExtractedText(rawCleaned)
      if (cleaned) return cleaned
    }
  } catch { /* ignore */ }
  return null
}

/** 兼容旧接口：根据记录类型自动选择下载方式 */
export function downloadReceivedRecord(
  record: ReceivedFileRecord,
  notify?: DownloadNotify
): Promise<DownloadResult> {
  // 过期检查
  if (record.isExpired) {
    const msg = '该取件码已过期，无法下载'
    notify?.(msg, 'error')
    return Promise.resolve({ success: false, reason: 'expired', errorMessage: msg })
  }

  if (record.content) {
    // 纯文本 → 本地 Blob 下载
    const blob = new Blob([record.content], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `${record.filename}.txt`)
    return Promise.resolve({ success: true })
  }

  // 收件箱：打包下载
  if (record.isCollection) {
    if (!record.collectionFiles || record.collectionFiles.length === 0) {
      const msg = '没有文件可下载'
      notify?.(msg, 'error')
      return Promise.resolve({ success: false, reason: 'not_found', errorMessage: msg })
    }
    return downloadFile(CollectionService.getZipDownloadUrl(record.code), `${record.filename}.zip`, { notify })
  }

  // 多文件：打包下载
  if (record.isMultiFile) {
    if (!record.multiFileItems || record.multiFileItems.length === 0) {
      const msg = '没有文件可下载'
      notify?.(msg, 'error')
      return Promise.resolve({ success: false, reason: 'not_found', errorMessage: msg })
    }
    return downloadFile(CollectionService.getMultiFileZipUrl(record.code), `${record.code}.zip`, { notify })
  }

  if (record.downloadUrl) {
    const url = buildDownloadUrl(record.downloadUrl)
    return downloadFile(url, record.filename || undefined, { notify })
  }

  return Promise.resolve({ success: false, reason: 'other', errorMessage: '无可下载内容' })
}
