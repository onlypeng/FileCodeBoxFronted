export interface SystemConfig {
  name: string
  description?: string
  maxFileSize: number
  allowedFileTypes: string[]
  expireDays: number
  notify_title?: string
  notify_content?: string
}

export interface ThemeChoice {
  key: string
  name: string
  author: string
  version: string
}

export interface ConfigState {
  name: string
  description: string
  file_storage: string
  themesChoices: ThemeChoice[]
  expireStyle: string[]
  admin_token: string
  robotsText: string
  keywords: string
  notify_title: string
  notify_content: string
  openUpload: number
  uploadSize: number
  storage_path: string
  uploadMinute: number
  /** 过期保存时间：记录/收件箱/房间过期后再保留该时长，到期由后台任务自动清理（含文件）；forever 不自动清理 */
  expiredRetentionStyle: string
  expiredRetentionValue: number
  opacity: number
  enableChunk: number
  s3_access_key_id: string
  background: string
  showAdminAddr: number
  page_explain: string
  s3_secret_access_key: string
  aws_session_token: string
  s3_signature_version: string
  s3_region_name: string
  s3_bucket_name: string
  s3_endpoint_url: string
  s3_hostname: string
  uploadRateLimitCount: number
  errorMinute: number
  errorCount: number
  s3_proxy: number
  themesSelect: string
  /** 前端 SPA 站点默认主题（light / dark / enterprise），由后台主题管理模块写入 */
  spaTheme: string
  webdav_url: string
  webdav_username: string
  webdav_password: string
  /** OneDrive 存储配置 */
  onedrive_domain: string
  onedrive_client_id: string
  onedrive_username: string
  onedrive_password: string
  onedrive_root_path: string
  onedrive_proxy: number
  /** 收件箱默认配置（创建收件箱时的默认值） */
  collectionDefaultMaxFiles: number
  collectionDefaultExpireDays: number
  /** 口令/码位数（文件分享码、收件箱三码、房间码统一长度，范围 4~12） */
  codeLength: number
  maxCollectionFiles: number
  maxSendFiles: number
  maxMultiFileCount: number
  /** 文本分享/备注的最大字符数（发送页输入上限，与后端校验一致） */
  maxTextLength: number
  /** 临时房间-服务器中转开关（1=允许，0=关闭） */
  directRelayEnabled: number
  /** 临时房间-服务器中转限速（KB/s，0=不限速） */
  directRelaySpeedLimit: number
  /** 临时房间人员上限（房间内人员不能超过此限制；0 表示不限制） */
  defaultMaxMembers: number
  /** WebRTC TURN 中继服务器列表（对称 NAT 下 P2P 兜底） */
  directTurnServers: Array<{ urls: string; username?: string; credential?: string }>
  /** 共享视频流默认质量档位（low/sd/hd/auto） */
  mediaDefaultQuality: string
  /** 上传文件类型白名单（逗号分隔扩展名，如 "jpg,png,pdf"；空 = 不限制） */
  fileTypeWhitelist: string
}
