import { apiBaseURL } from '@/services/client'

const getApiOrigin = () => {
  if (!apiBaseURL) return window.location.origin
  return new URL(apiBaseURL, window.location.origin).origin
}

export function buildAbsoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiOrigin()}${normalizedPath}`
}

export function buildRetrieveUrl(code: string): string {
  return `${window.location.origin}/#/?code=${code}`
}

/**
 * 构建应用内页面链接（hash 路由）
 * @param path 形如 "/collection/manage/ABC123" 的路由路径
 */
export function buildAppUrl(path = ''): string {
  return `${window.location.origin}/#${path}`
}

export function buildDownloadUrl(downloadUrl: string | null): string {
  return downloadUrl ? buildAbsoluteUrl(downloadUrl) : ''
}

export function buildReceivedRecordQrValue(record: {
  code: string
  downloadUrl: string | null
}): string {
  return record.downloadUrl ? buildDownloadUrl(record.downloadUrl) : buildRetrieveUrl(record.code)
}

export function buildSentRecordQrValue(record: { retrieveCode: string }): string {
  return buildRetrieveUrl(record.retrieveCode)
}

export function buildWgetCommand(retrieveCode: string, fileName: string): string {
  return `wget ${buildAbsoluteUrl(`/share/select?code=${retrieveCode}`)} -O "${fileName}"`
}

/**
 * 构建 WebSocket 连接地址（ws/wss），供 composable 使用
 * @param path 形如 "/ws/chat/ABC123"
 */
export function buildWebSocketUrl(path: string): string {
  const origin = getApiOrigin()
  const protocol = origin.startsWith('https') ? 'wss' : 'ws'
  return `${protocol}://${origin.replace(/^https?:\/\//, '')}${path}`
}
