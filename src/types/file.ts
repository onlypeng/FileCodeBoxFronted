export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  uploadTime: string
  downloadCount: number
  expireTime?: string
}

export interface FileListItem {
  id: number
  code: string
  prefix: string
  suffix: string
  size: number
  text?: string
  description?: string
  expired_at: string
  expired_count: number | null
  created_at: string
  is_collection?: boolean
  collection_code?: string
  collection_title?: string
  uploader_name?: string
}

export interface FileListResponse {
  data: FileListItem[]
  total: number
  page: number
  size: number
}

export interface FileUploadResponse {
  code: string
  name: string
}

export interface ShareSelectResponse {
  code: string
  name: string
  text: string
  size: number
}

// ==================== 取件记录类型 ====================
export type ReceiveRecordType = 'text' | 'file' | 'multiFile'

// ==================== 发件记录类型 ====================
export type SentRecordType = 'text' | 'file' | 'multiFile'

// ==================== 收件箱记录 ====================
export interface CollectionRecord {
  id: number
  title: string
  collectionCode: string
  deliveryCode: string
  retrieveCode: string
  date: string
  maxFiles: number
  expireInfo: string
  /** 收件箱（管理码）过期时间文案，查看时展示 */
  collectionExpire?: string
  /** 投件码过期时间文案，查看时展示 */
  deliveryExpire?: string
  /** 取件码过期时间文案，查看时展示 */
  retrieveExpire?: string
}

// ==================== 临时房间房间记录 ====================
export interface DirectRecord {
  id: number
  title: string
  roomCode: string
  date: string
}

export interface ReceivedFileRecord {
  id: number
  code: string
  filename: string
  size: string
  downloadUrl: string | null
  content: string | null
  date: string
  /** 记录类型：text=文本, file=单文件, multiFile=多文件(含收件箱) */
  type?: ReceiveRecordType
  /** 是否为收件箱记录（多文件子类型） */
  isCollection?: boolean
  /** 收件箱投递码 */
  collectionDeliveryCode?: string
  /** 收件箱取件码（用于单文件下载校验） */
  collectionRetrieveCode?: string
  /** 收件箱文件列表 */
  collectionFiles?: Array<{
    id: number
    file_name: string
    file_size: number
    uploader_name: string
  }>
  /** 是否为多文件分享记录 */
  isMultiFile?: boolean
  /** 多文件子项列表 */
  multiFileItems?: Array<{
    id: number
    file_name: string
    file_size: number
  }>
  /** 过期时间 ISO 字符串 */
  expiredAt?: string | null
  /** 过期方式：day/hour/minute/count/forever */
  expireStyle?: string
  /** 过期值 */
  expireValue?: number
  /** 实时剩余次数（count 模式，取件时后端返回的最新值） */
  expiredCount?: number | null
  /** 是否已确认过期（后端返回过期/不存在时标记） */
  isExpired?: boolean
  /** 文件备注（分享者填写的说明文字） */
  remark?: string | null
}

export interface SentFileRecord {
  id: number
  filename: string
  date: string
  size: string
  expiration: string
  retrieveCode: string
  /** 记录类型：text=文本, file=单文件, multiFile=多文件(含投件) */
  type?: SentRecordType
  /** 是否为投件记录（多文件子类型） */
  isDelivery?: boolean
  /** 投件时的收件箱标题 */
  collectionTitle?: string
  isMultiFile?: boolean
  fileCount?: number
  /** 多文件子项列表 */
  files?: Array<{
    name: string
    size: number
  }>
  /** 文本分享正文（发件记录中文本与文件合并后保存） */
  text?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface ChunkUploadInitRequest {
  file_name: string
  file_size: number
  chunk_size: number
  file_hash: string
}

export interface ChunkUploadInitResponse {
  code?: string
  name?: string
  upload_id?: string
  existed?: boolean
  uploaded_chunks?: number[]
}

export interface ChunkUploadCompleteRequest {
  expire_value: number
  expire_style: string
  /** 文件备注（可选） */
  remark?: string
}

export type ChunkUploadResponse = null
