import { apiBaseURL } from '@/services/client'
import { readStoredConfig } from './config-storage'

const getApiOrigin = () => {
  if (!apiBaseURL) return window.location.origin
  return new URL(apiBaseURL, window.location.origin).origin
}

/**
 * 把后台配置的共享域名规范化为 origin（协议 + 主机 + 端口）。
 * 兼容 "example.com"、"https://example.com"、"https://example.com/" 等写法；
 * 空值或非法值返回空串，由调用方回退到当前访问地址。
 */
function normalizeShareOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return ''

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withProtocol).origin
  } catch {
    return ''
  }
}

// 按"原始配置值"缓存解析结果：配置没变就不重复解析，
// 避免列表渲染时逐条调用都要读一次 localStorage 并 new URL()
let cachedShareRaw: string | null = null
let cachedShareOrigin = ''

/**
 * 对外分享链接使用的站点地址。
 * 后台配置了共享域名时优先使用，否则回退到当前访问地址。
 * 读取公共配置缓存而非 store，保持工具层无页面状态依赖。
 */
export function resolveShareOrigin(): string {
  const raw = readStoredConfig()?.shareDomain ?? ''
  if (raw !== cachedShareRaw) {
    cachedShareRaw = raw
    cachedShareOrigin = normalizeShareOrigin(raw)
  }
  return cachedShareOrigin || window.location.origin
}

/**
 * 拼装**后端接口**的绝对地址（下载直链、wget 命令、二维码内容等）。
 *
 * 这里必须用真实 API 地址而不是共享域名：这些路径是接口而非页面，
 * 共享域名的反代不一定转发到 API，用它拼下载链接会直接 404。
 * 与 buildWebSocketUrl 保持同一原则（WS 同样始终连 API 地址）。
 */
export function buildAbsoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiOrigin()}${normalizedPath}`
}

export function buildRetrieveUrl(code: string): string {
  return `${resolveShareOrigin()}/#/?code=${code}`
}

/**
 * 构建应用内页面链接（hash 路由）
 * @param path 形如 "/collection/manage/ABC123" 的路由路径
 */
export function buildAppUrl(path = ''): string {
  return `${resolveShareOrigin()}/#${path}`
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
 * 把后台配置的 WS 地址规范成 `ws(s)://host[:port]`，非法/空返回空串。
 * 只保留 origin：用户误填的路径/查询会被丢掉，避免拼出重复的 `/ws/room/...`。
 */
function normalizeWsOrigin(value: string): string {
  let trimmed = value.trim()
  while (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1)
  if (!trimmed) return ''
  const withProtocol = trimmed.includes('://')
    ? trimmed
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${trimmed}`
  try {
    const u = new URL(withProtocol)
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol)) return ''
    const wsProtocol = u.protocol === 'https:' || u.protocol === 'wss:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${u.host}`
  } catch {
    return ''
  }
}

/**
 * 构建 WebSocket 连接地址（ws/wss），供 composable 使用。
 * @param path 形如 "/ws/room/ABC123"
 *
 * 优先用后台「WebSocket 独立接入地址」，否则回退同源 API 地址。
 * 为什么需要独立地址：CDN/边缘加速（尤其免费套餐）常不转发 Upgrade 头，
 * 同源 wss 会被当普通 HTTP 返回 404；该配置让 WS 直连源站、HTTP 仍走 CDN，
 * 且是运行时后台可配，不必重新构建镜像。
 *
 * 始终连接实际 API 地址而非共享域名：shareDomain 是面向外部访客的展示地址，
 * 其反代不一定转发 WebSocket 升级请求，用它建连会直接失败。
 */
export function buildWebSocketUrl(path: string): string {
  const configured = normalizeWsOrigin(readStoredConfig()?.wsBaseUrl ?? '')
  if (configured) {
    return `${configured}${path.startsWith('/') ? path : `/${path}`}`
  }
  const origin = getApiOrigin()
  const protocol = origin.startsWith('https') ? 'wss' : 'ws'
  return `${protocol}://${origin.replace(/^https?:\/\//, '')}${path}`
}
