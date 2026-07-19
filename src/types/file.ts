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
  name?: string
  type?: 'text' | 'file'
  status?: 'active' | 'expired'
  isText?: boolean
  is_text?: boolean
  isExpired?: boolean
  is_expired?: boolean
  isChunked?: boolean
  is_chunked?: boolean
  statusInsights?: AdminFileDetailStatusInsights
  status_insights?: AdminFileDetailStatusInsights
  remainingDownloads?: number | null
  remaining_downloads?: number | null
  usedCount?: number
  used_count?: number
  fileHash?: string | null
  file_hash?: string | null
  // 多文件相关字段（后端返回，前端展示用）
  isMultiFile?: boolean
  is_multi_file?: boolean
  fileCount?: number
  file_count?: number
  // 健康状态字段（后端返回）
  expiringSoon?: boolean
  expiring_soon?: boolean
  permanent?: boolean
  isPermanent?: boolean
  is_permanent?: boolean
  // 多文件详情字段（后端返回）
  file_items?: Array<{ id: number; file_name: string; file_size: number }>
}

export interface FileListResponse {
  data: FileListItem[]
  total: number
  page: number
  size: number
  summary?: AdminFileSummary
}

export interface FileUploadResponse {
  code: string
  name: string
}

export interface TextSendResponse {
  code: string
}

export interface ShareSelectResponse {
  code: string
  name: string
  text: string
  size: number
}

/** /share/check_code/ 接口返回结构（已扩展为完整过期信息） */
export interface CheckCodeResponse {
  type: 'file' | 'collection' | 'retrieve' | 'delivery' | 'unknown'
  code: string
  expired?: boolean
  title?: string
  name?: string | null
  size?: number
  is_multi_file?: boolean
  file_count?: number
  max_files?: number
  expired_at?: string | null
  expire_style?: string
  expire_value?: number
  used_count?: number
  expired_count?: number
  is_permanent?: boolean
}

export type ReceiveRecordType = 'text' | 'file' | 'multiFile'

export type SentRecordType = 'text' | 'file' | 'multiFile'

export interface CollectionRecord {
  id: number
  title: string
  collectionCode: string
  deliveryCode: string
  retrieveCode: string
  date: string
  maxFiles: number
  expireInfo: string
}

export interface ReceivedFileRecord {
  id: number
  code: string
  filename: string
  size: string
  downloadUrl: string | null
  content: string | null
  date: string
  type?: ReceiveRecordType
  isCollection?: boolean
  collectionDeliveryCode?: string
  collectionRetrieveCode?: string
  collectionFiles?: Array<{
    id: number
    file_name: string
    file_size: number
    uploader_name: string
    status?: string
    created_at?: string
  }>
  isMultiFile?: boolean
  multiFileItems?: Array<{
    id: number
    file_name: string
    file_size: number
  }>
  expiredAt?: string | null
  expireStyle?: string
  expireValue?: number
  isExpired?: boolean
  isRetrieveCode?: boolean
  textNote?: string
}

export interface SentFileRecord {
  id: number
  filename: string
  date: string
  size: string
  expiration: string
  retrieveCode: string
  type?: SentRecordType
  isDelivery?: boolean
  collectionTitle?: string
  isMultiFile?: boolean
  fileCount?: number
  files?: Array<{
    name: string
    size: number
    uploadTime?: string
  }>
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
}

export type ChunkUploadResponse = null

export interface AdminFileViewItem extends FileListItem {
  displayName: string
  displaySize: string
  displayExpiredAt: string
  displayUsage: string
  displayHealthState: string
  displayHealthAction: string
  isTextFile: boolean
  isExpiredFile: boolean
  isChunkedFile: boolean
  remainingDownloadsValue: number | null
  canPreviewText: boolean
  statusInsightSeverity: AdminFileInsightSeverity
  statusInsightState: string
  statusInsightNextAction: string
  statusInsightReasons: string[]
}

export interface AdminFileSummary {
  totalFiles: number
  activeCount: number
  expiredCount: number
  textCount: number
  fileCount: number
  chunkedCount: number
  healthAttentionCount: number
  healthDangerCount: number
  healthWarningCount: number
  expiringSoonCount: number
  storageIssueCount: number
  neverRetrievedCount: number
  healthyCount: number
  permanentCount: number
  storageUsed: number
  usedCount: number
}

export type AdminFileStatusFilter = 'all' | 'active' | 'expired'
export type AdminFileTypeFilter = 'all' | 'file' | 'text' | 'chunked'
export type AdminFileHealthFilter =
  | 'all'
  | 'attention'
  | 'danger'
  | 'warning'
  | 'healthy'
  | 'expired'
  | 'expiring_soon'
  | 'storage_issue'
  | 'never_retrieved'
  | 'permanent'
export type AdminFileSortBy = 'created_at' | 'expired_at' | 'name' | 'size' | 'used_count' | 'code'
export type AdminFileSortOrder = 'asc' | 'desc'

export interface AdminFileListParams {
  page: number
  size: number
  keyword?: string
  status?: AdminFileStatusFilter
  type?: AdminFileTypeFilter
  health?: AdminFileHealthFilter
  sortBy?: AdminFileSortBy
  sortOrder?: AdminFileSortOrder
}

export interface AdminFileViewPresetParams {
  keyword: string
  status: AdminFileStatusFilter
  type: AdminFileTypeFilter
  health: AdminFileHealthFilter
  sortBy: AdminFileSortBy
  sortOrder: AdminFileSortOrder
  size: number
}

export interface AdminFileViewPreset {
  id: string
  name: string
  filters?: AdminFileViewPresetParams
  params?: AdminFileViewPresetParams
  isBuiltIn?: boolean
  isDefault?: boolean
  is_default?: boolean
  createdAt?: string | null
  created_at?: string | null
  updatedAt?: string | null
  updated_at?: string | null
}

export interface AdminFileViewPresetRequest {
  id?: string
  name: string
  filters: AdminFileViewPresetParams
  params?: AdminFileViewPresetParams
}

export interface AdminFileViewPresetsResponse {
  presets?: AdminFileViewPreset[]
  items?: AdminFileViewPreset[]
  total?: number
}

export interface FileEditForm {
  id: number | null
  code: string
  prefix: string
  suffix: string
  expired_at: string
  expired_count: number | null
}

export interface AdminBatchEditForm {
  mode: 'expiresAt' | 'expiresCount'
  expired_at: string
  expired_count: number | null
}

export interface AdminFilePatchPayload {
  id: number
  code?: string
  prefix?: string
  suffix?: string
  expired_at?: string | null
  expired_count?: number | null
}

export type AdminFilePolicyAction =
  | 'extend_24h'
  | 'extend_7d'
  | 'make_permanent'
  | 'reset_download_limit'

export interface AdminFilePolicyActionRequest {
  id: number
  action: AdminFilePolicyAction
  downloadLimit?: number
  download_limit?: number
}

export interface AdminFileMetadata {
  note: string
  tags: string[]
  updatedAt?: string | null
  updated_at?: string | null
}

export interface AdminFileMetadataRequest {
  id: number
  note?: string
  tags?: string[]
}

export interface AdminBatchUpdateFilesRequest {
  ids: number[]
  expired_at?: string
  expired_count?: number | null
  clearExpiredAt?: boolean
  clear_expired_at?: boolean
}

export interface AdminBatchUpdateFilesResponse {
  requestedCount: number
  requested_count: number
  uniqueCount: number
  unique_count: number
  updatedCount: number
  updated_count: number
  missingCount: number
  missing_count: number
  failedCount: number
  failed_count: number
  updated: number[]
  missing: number[]
  failed: Array<{ id: number; reason: string }>
}

export interface AdminBatchDeleteFilesResponse {
  requestedCount: number
  requested_count: number
  uniqueCount: number
  unique_count: number
  deletedCount: number
  deleted_count: number
  missingCount: number
  missing_count: number
  failedCount: number
  failed_count: number
  deleted: number[]
  missing: number[]
  failed: Array<{ id: number; reason: string }>
}

export interface AdminBatchPolicyActionRequest {
  ids: number[]
  action: AdminFilePolicyAction
  downloadLimit?: number
  download_limit?: number
}

export interface AdminBatchPolicyActionResponse {
  requestedCount: number
  requested_count: number
  uniqueCount: number
  unique_count: number
  updatedCount: number
  updated_count: number
  missingCount: number
  missing_count: number
  failedCount: number
  failed_count: number
  updated: number[]
  missing: number[]
  failed: Array<{ id: number; reason: string }>
}

export interface AdminFilePreviewResponse {
  id: number
  code: string
  name: string
  type: 'text'
  content: string
  length: number
  previewLength?: number
  preview_length?: number
  truncated: boolean
  maxChars?: number
  max_chars?: number
  createdAt?: string | null
  created_at?: string | null
  expiredAt?: string | null
  expired_at?: string | null
}

export interface AdminFileDetailPolicy {
  expiredAt?: string | null
  expired_at?: string | null
  expiredCount?: number | null
  expired_count?: number | null
  remainingDownloads?: number | null
  remaining_downloads?: number | null
  isExpired?: boolean
  is_expired?: boolean
  isPermanent?: boolean
  is_permanent?: boolean
}

export interface AdminFileDetailStorage {
  backend?: string
  filePath?: string | null
  file_path?: string | null
  uuidFileName?: string | null
  uuid_file_name?: string | null
  fileHash?: string | null
  file_hash?: string | null
  isChunked?: boolean
  is_chunked?: boolean
  uploadId?: string | null
  upload_id?: string | null
}

export type AdminFileInsightSeverity = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface AdminFileDetailInsightMetrics {
  ageSeconds?: number
  age_seconds?: number
  secondsUntilExpiration?: number | null
  seconds_until_expiration?: number | null
  remainingDownloads?: number | null
  remaining_downloads?: number | null
  usedCount?: number
  used_count?: number
}

export interface AdminFileDetailStatusInsights {
  severity?: AdminFileInsightSeverity
  state?: string
  nextAction?: string
  next_action?: string
  reasons?: string[]
  metrics?: AdminFileDetailInsightMetrics
}

export interface AdminFileDetailTimelineItem {
  key: string
  status?: string
  severity?: AdminFileInsightSeverity
  timestamp?: string | null
  value?: number | string | null
  detail?: string | null
}

export interface AdminFileDetailTimelineViewItem extends AdminFileDetailTimelineItem {
  severity: AdminFileInsightSeverity
  displayTitle: string
  displayDescription: string
  displayMeta: string
}

export interface AdminFileDetailResponse extends FileListItem {
  filename?: string
  displayName?: string
  display_name?: string
  isPermanent?: boolean
  is_permanent?: boolean
  hasDownloadLimit?: boolean
  has_download_limit?: boolean
  hasExpirationTime?: boolean
  has_expiration_time?: boolean
  textLength?: number
  text_length?: number
  canPreviewText?: boolean
  can_preview_text?: boolean
  canDownload?: boolean
  can_download?: boolean
  storageBackend?: string
  storage_backend?: string
  filePath?: string | null
  file_path?: string | null
  uuidFileName?: string | null
  uuid_file_name?: string | null
  uploadId?: string | null
  upload_id?: string | null
  fileHash?: string | null
  file_hash?: string | null
  is_chunked?: boolean
  isChunked?: boolean
  remainingDownloads?: number | null
  remaining_downloads?: number | null
  statusInsights?: AdminFileDetailStatusInsights
  status_insights?: AdminFileDetailStatusInsights
  metadata?: AdminFileMetadata
}

export interface AdminFileDetailViewItem extends AdminFileDetailResponse {
  displayName: string
  displaySize: string
  displayExpiredAt: string
  displayExpiredCount: string
  displayUsage: string
  displayHealthState: string
  displayHealthAction: string
  isTextFile: boolean
  isExpiredFile: boolean
  isChunkedFile: boolean
  canPreviewText: boolean
  canDownload: boolean
  statusInsightSeverity: AdminFileInsightSeverity
  statusInsightState: string
  statusInsightNextAction: string
  statusInsightReasons: string[]
  timelineItems: AdminFileDetailTimelineViewItem[]
  metadataForm: AdminFileMetadata
}
