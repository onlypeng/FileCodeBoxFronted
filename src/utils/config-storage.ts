import { DEFAULT_CONFIG, FILE_SIZE_LIMITS, STORAGE_KEYS } from '@/constants'
import type { ConfigState, SystemConfig } from '@/types'

export type PublicConfig = SystemConfig & {
  uploadSize: number
  expireStyle: string[]
  openUpload: number
  enableChunk: number
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
}

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  ...DEFAULT_CONFIG,
  uploadSize: FILE_SIZE_LIMITS.MAX_FILE_SIZE,
  // 与后端 DEFAULT_CONFIG 保持一致：即使远程配置加载失败（如移动端局域网访问），
  // 过期单位选项也保持完整，而不是只回退到 ['day']
  expireStyle: ['day', 'hour', 'minute', 'forever', 'count'],
  openUpload: 1,
  enableChunk: 0,
  uploadRateLimitCount: 10,
  uploadMinute: 1,
  maxCollectionFiles: 100,
  maxSendFiles: 20,
  maxMultiFileCount: 20,
  maxTextLength: 200000,
  expiredRetentionStyle: 'day',
  expiredRetentionValue: 1,
  collectionDefaultMaxFiles: 20,
  collectionDefaultExpireDays: 7,
  codeLength: 6,
  directRelayEnabled: 1,
  directRelaySpeedLimit: 0,
  defaultMaxMembers: 10,
  mediaDefaultQuality: 'auto',
  directTurnServers: []
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
  opacity: 0.9,
  enableChunk: DEFAULT_PUBLIC_CONFIG.enableChunk,
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
  directRelayEnabled: 1,
  directRelaySpeedLimit: 0,
  defaultMaxMembers: 10,
  mediaDefaultQuality: 'auto',
  directTurnServers: [],
  fileTypeWhitelist: ''
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
    opacity: config.opacity
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
