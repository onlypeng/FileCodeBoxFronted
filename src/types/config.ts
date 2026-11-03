/**
 * 系统配置的三组形状。
 *
 * ## 三组各自解决什么问题
 * - `SystemConfig`：**给普通访客看的**公开配置（站点名、大小上限、允许的后缀）。
 *   不含任何凭据或内部路径，因此可以随首页一起无条件下发。
 * - `ConfigState`：**管理后台读写的**全量配置，包含 S3 密钥、绝对路径等敏感字段。
 *   只在管理员鉴权后返回。
 * - `ThemeChoice`：可选主题包清单。
 *
 * ## 取舍
 * 刻意保留 `SystemConfig` 与 `ConfigState` 两套而不是共用一个"按需裁剪"的大接口：
 * 前者多一个 nullable 字段都会让所有访客端调用处补判空。
 * 同理，开关类字段一律用 `number`（0/1）而不是 `boolean` 与后端 keep 一致 ——
 * 后端是动态配置项存储，布尔值在不同存储后端上的序列化结果不统一。
 *
 * 字段粒度注释只写"值域/单位/取值范围有坑"的项（MB vs 字节、0 表示不限、
 * 空串表示不限），其余不重复字段名本就说明的事。
 */
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
  /** 全局存储配额（MB；0 = 不限制）。超过后不阻止上传，但会持续告警并在后台显示占比 */
  globalStorageQuotaMB: number
  /** 过期保存时间：记录/收件箱/房间过期后再保留该时长，到期由后台任务自动清理（含文件）；forever 不自动清理 */
  expiredRetentionStyle: string
  expiredRetentionValue: number
  opacity: number
  enableChunk: number
  /** 上传分片大小（MB，默认 5；仅 enableChunk=1 时分片上传生效） */
  uploadChunkSize: number
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
  /** 房间文件中转分片大小（KB，默认 64；越小越不易被网关单帧上限拦截） */
  directRelayChunkSize: number
  /** 房间文件中转单文件大小上限（MB；0=不限制） */
  directMaxRelaySize: number
  /** 临时房间人员上限（房间内人员不能超过此限制；0 表示不限制） */
  defaultMaxMembers: number
  /** WebRTC TURN 中继服务器列表（对称 NAT 下 P2P 兜底） */
  directTurnServers: Array<{ urls: string; username?: string; credential?: string }>
  /** 共享视频流默认质量档位（low/sd/hd/auto） */
  mediaDefaultQuality: string
  /** 上传文件类型白名单（逗号分隔扩展名，如 "jpg,png,pdf"；空 = 不限制） */
  fileTypeWhitelist: string
  /** 共享域名：生成对外分享链接时使用的站点地址（留空 = 使用当前访问地址） */
  shareDomain: string
  /** 是否允许房间文件缓存到服务器（1=允许，0=仅 P2P） */
  roomCacheEnabled: number
  /** 单个房间缓存文件大小上限（MB；0 = 不限制）。超限文件只能走 P2P 直传 */
  roomCacheMaxSize: number
  /** 房间文件服务器缓存默认时长（小时） */
  roomCacheDefaultHours: number
}
