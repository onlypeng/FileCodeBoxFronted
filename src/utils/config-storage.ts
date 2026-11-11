/**
 * 公共配置的形状与本地兜底默认值（DEFAULT_PUBLIC_CONFIG / DEFAULT_CONFIG_STATE）。
 *
 * ## 为什么需要一份硬编码兜底
 * 首页在拿到远程配置前就要渲染，而移动端局域网、后端重启等场景会让配置请求失败；
 * 没有默认值时连"允许哪些后缀、过期单位有哪些"都显示不出来。这里的数值刻意与
 * 后端 core/settings.py 的 DEFAULT_CONFIG 逐项对齐——尤其 expireStyle、房间缓存
 * 72 小时这类会影响实际行为的项，对不上就会出现"前端让选、后端不认"的割裂。
 *
 * ## 刻意不做
 * 不把远程配置缓存进 localStorage：宁可拉取失败就用这份静态兜底，
 * 也不让上一次的旧值悄悄覆盖服务端新配置。
 */
import { DEFAULT_CONFIG, FILE_SIZE_LIMITS, STORAGE_KEYS } from '@/constants'
import type { ConfigState, SystemConfig } from '@/types'

export type PublicConfig = SystemConfig & {
  uploadSize: number
  expireStyle: string[]
  openUpload: number
  enableChunk: number
  /** 上传分片大小（MB，默认 5；仅 enableChunk=1 时分片上传生效） */
  uploadChunkSize: number
  /** 未完成分片会话回收时长（小时，>=1；由后台任务清理） */
  chunkExpireHours: number
  uploadRateLimitCount: number
  uploadMinute: number
  maxCollectionFiles: number
  maxSendFiles: number
  maxMultiFileCount: number
  /** 文本分享/备注的最大字符数 */
  maxTextLength: number
  /** 过期保存时间：记录/收件箱/房间过期后再保留该时长，到期由后台任务自动清理（含文件） */
  expiredRetentionStyle: string
  expiredRetentionValue: number
  /** 收件箱默认配置（创建收件箱时的默认值） */
  collectionDefaultMaxFiles?: number
  collectionDefaultExpireDays?: number
  /** 口令/码位数（文件分享码、收件箱三码、房间码统一长度，范围 4~12） */
  codeLength: number
  directRelayEnabled: number
  directRelaySpeedLimit: number
  /** 房间文件中转分片大小（KB，默认 64；越小越不易被网关 256KB 单帧上限拦截） */
  directRelayChunkSize: number
  /** 房间文件中转单文件大小上限（MB；0=不限制，走 P2P 直连不受此限） */
  directMaxRelaySize: number
  defaultMaxMembers: number
  /** 共享视频流默认质量档位（low/sd/hd/auto） */
  mediaDefaultQuality: string
  directTurnServers: Array<{ urls: string; username?: string; credential?: string }>
  notify_title?: string
  notify_content?: string
  page_explain?: string
  showAdminAddr?: number
  themesSelect?: string
  /** 前端 SPA 站点默认主题（light / dark / enterprise） */
  spaTheme?: string
  background?: string
  opacity?: number
  /** 共享域名：对外分享链接使用的站点地址（留空 = 使用当前访问地址） */
  shareDomain?: string
  /** WebSocket 独立接入地址（留空 = 同源）；随公共配置下发 */
  wsBaseUrl?: string
  /** 是否允许房间文件缓存到服务器（后台总开关，1=允许） */
  roomCacheEnabled?: number
  /** 单个房间缓存文件大小上限（MB；0 = 不限制）。超限文件只能走 P2P 直传 */
  roomCacheMaxSize?: number
  /** 房间文件服务器缓存默认时长（小时） */
  roomCacheDefaultHours?: number
  /** 全局存储配额（MB；0 = 不限制）：仅后台使用，不随公共配置下发 */
  globalStorageQuotaMB?: number
}

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  ...DEFAULT_CONFIG,
  uploadSize: FILE_SIZE_LIMITS.MAX_FILE_SIZE,
  // 与后端 DEFAULT_CONFIG 保持一致：即使远程配置加载失败（如移动端局域网访问），
  // 过期单位选项也保持完整，而不是只回退到 ['day']
  expireStyle: ['day', 'hour', 'minute', 'forever', 'count'],
  openUpload: 1,
  enableChunk: 0,
  uploadChunkSize: 5,
  uploadRateLimitCount: 10,
  uploadMinute: 1,
  // 全局存储配额（MB；0 = 不限制），与后端 DEFAULT_CONFIG 保持一致
  globalStorageQuotaMB: 0,
  maxCollectionFiles: 100,
  maxSendFiles: 20,
  maxMultiFileCount: 20,
  maxTextLength: 200000,
  expiredRetentionStyle: 'day',
  expiredRetentionValue: 1,
  chunkExpireHours: 24,
  collectionDefaultMaxFiles: 20,
  collectionDefaultExpireDays: 7,
  codeLength: 6,
  directRelayEnabled: 1,
  directRelaySpeedLimit: 0,
  directRelayChunkSize: 64,
  directMaxRelaySize: 0,
  defaultMaxMembers: 10,
  mediaDefaultQuality: 'auto',
  directTurnServers: [],
  shareDomain: '',
  wsBaseUrl: '',
  // 与后端 core/settings.py DEFAULT_CONFIG 保持一致（72 小时 = 3 天）：
  // 远程配置加载失败时房间缓存时长不会与服务端实际行为对不上
  roomCacheEnabled: 1,
  roomCacheMaxSize: 100,
  roomCacheDefaultHours: 72
}

export const DEFAULT_CONFIG_STATE: ConfigState = {
  name: DEFAULT_PUBLIC_CONFIG.name,
  description: DEFAULT_PUBLIC_CONFIG.description || '',
  file_storage: '',
  themesChoices: [],
  expireStyle: DEFAULT_PUBLIC_CONFIG.expireStyle,
  admin_token: '',
  robotsText: '',
  keywords: '',
  notify_title: '',
  notify_content: '',
  openUpload: DEFAULT_PUBLIC_CONFIG.openUpload,
  uploadSize: DEFAULT_PUBLIC_CONFIG.uploadSize,
  storage_path: '',
  uploadMinute: 1,
  globalStorageQuotaMB: 0,
  opacity: 0.9,
  enableChunk: DEFAULT_PUBLIC_CONFIG.enableChunk,
  uploadChunkSize: DEFAULT_PUBLIC_CONFIG.uploadChunkSize,
  s3_access_key_id: '',
  background: '',
  showAdminAddr: 0,
  page_explain: '',
  s3_secret_access_key: '',
  aws_session_token: '',
  s3_signature_version: '',
  s3_region_name: '',
  s3_bucket_name: '',
  s3_endpoint_url: '',
  s3_hostname: '',
  uploadRateLimitCount: 1,
  errorMinute: 1,
  errorCount: 1,
  s3_proxy: 0,
  themesSelect: '',
  spaTheme: '',
  webdav_url: '',
  webdav_username: '',
  webdav_password: '',
  onedrive_domain: '',
  onedrive_client_id: '',
  onedrive_username: '',
  onedrive_password: '',
  onedrive_root_path: 'filebox_storage',
  onedrive_proxy: 0,
  collectionDefaultMaxFiles: 20,
  collectionDefaultExpireDays: 7,
  codeLength: 6,
  maxCollectionFiles: 100,
  maxSendFiles: 20,
  maxMultiFileCount: 20,
  maxTextLength: 200000,
  expiredRetentionStyle: 'day',
  expiredRetentionValue: 1,
  chunkExpireHours: 24,
  directRelayEnabled: 1,
  directRelaySpeedLimit: 0,
  directRelayChunkSize: 64,
  directMaxRelaySize: 0,
  defaultMaxMembers: 10,
  mediaDefaultQuality: 'auto',
  directTurnServers: [],
  fileTypeWhitelist: '',
  shareDomain: '',
  wsBaseUrl: '',
  roomCacheEnabled: 1,
  roomCacheMaxSize: 100,
  // 与后端 DEFAULT_CONFIG 保持一致（72 小时 = 3 天）
  roomCacheDefaultHours: 72
}

export function readStoredConfig<T extends object = Partial<ConfigState>>(): T | null {
  try {
    const rawConfig = localStorage.getItem(STORAGE_KEYS.CONFIG)
    return rawConfig ? (JSON.parse(rawConfig) as T) : null
  } catch {
    return null
  }
}

export function toPublicConfig(config: Partial<ConfigState> | null | undefined): Partial<PublicConfig> {
  if (!config) return {}

  return {
    name: config.name,
    description: config.description,
    uploadSize: config.uploadSize,
    expireStyle: config.expireStyle,
    openUpload: config.openUpload,
    enableChunk: config.enableChunk,
    uploadChunkSize: config.uploadChunkSize,
    chunkExpireHours: config.chunkExpireHours,
    uploadRateLimitCount: config.uploadRateLimitCount,
    uploadMinute: config.uploadMinute,
    maxCollectionFiles: config.maxCollectionFiles,
    maxSendFiles: config.maxSendFiles,
    maxMultiFileCount: config.maxMultiFileCount,
    maxTextLength: config.maxTextLength,
    expiredRetentionStyle: config.expiredRetentionStyle,
    expiredRetentionValue: config.expiredRetentionValue,
    collectionDefaultMaxFiles: config.collectionDefaultMaxFiles,
    collectionDefaultExpireDays: config.collectionDefaultExpireDays,
    directRelayEnabled: config.directRelayEnabled,
    directRelaySpeedLimit: config.directRelaySpeedLimit,
    directRelayChunkSize: config.directRelayChunkSize,
    directMaxRelaySize: config.directMaxRelaySize,
    defaultMaxMembers: config.defaultMaxMembers,
    mediaDefaultQuality: config.mediaDefaultQuality,
    directTurnServers: config.directTurnServers,
    notify_title: config.notify_title,
    notify_content: config.notify_content,
    // 兼容旧后端返回 explain 字段名的情况
    page_explain: config.page_explain ?? (config as ConfigState & { explain?: string }).explain,
    showAdminAddr: config.showAdminAddr,
    themesSelect: config.themesSelect,
    spaTheme: config.spaTheme,
    background: config.background,
    opacity: config.opacity,
    shareDomain: config.shareDomain,
    wsBaseUrl: config.wsBaseUrl,
    roomCacheEnabled: config.roomCacheEnabled,
    roomCacheMaxSize: config.roomCacheMaxSize,
    roomCacheDefaultHours: config.roomCacheDefaultHours
  }
}

export function writeStoredConfig(config: object) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(toPublicConfig(config as Partial<ConfigState>)))
}

export function readNotifyKey(): string | null {
  return localStorage.getItem(STORAGE_KEYS.NOTIFY)
}

export function writeNotifyKey(notifyKey: string) {
  localStorage.setItem(STORAGE_KEYS.NOTIFY, notifyKey)
}
