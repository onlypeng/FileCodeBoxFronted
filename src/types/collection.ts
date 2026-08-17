// 收件箱相关类型定义 - expire_style 模式

/** 创建收件箱请求 */
export interface CreateCollectionRequest {
  title: string
  description?: string
  password?: string
  max_files: number
  // 收件箱过期配置（创建后不可更改）
  expire_style: string
  expire_value: number
  // 投件码过期配置
  delivery_expire_style: string
  delivery_expire_value: number
  // 取件码过期配置
  retrieve_expire_style: string
  retrieve_expire_value: number
  // 向后兼容
  expire_days?: number
}

/** 创建收件箱响应（含三码） */
export interface CreateCollectionResponse {
  collection_code: string
  delivery_code: string
  retrieve_code: string
  title: string
  description: string
  max_files: number
  created_at: string | null
  expire_style: string
  expire_value: number
  expired_at: string | null
  delivery_expire_style: string
  delivery_expire_value: number
  delivery_expired_at: string | null
  retrieve_expire_style: string
  retrieve_expire_value: number
  retrieve_expired_at: string | null
}

/** 投递页面信息（通过 delivery_code 获取） */
export interface DeliveryPageInfo {
  delivery_code: string
  title: string
  description: string
  max_files: number
  file_count: number
  delivery_count: number
  delivery_used_count: number
  created_at: string | null
  expired_at: string | null
  expire_style: string
  expire_value: number
  delivery_expire_style: string
  delivery_expire_value: number
  delivery_expired_at: string | null
  // 投件码视角不返回取件码相关字段（权限收紧）
}

/** 收件箱文件项 */
export interface CollectionFileItem {
  id: number
  file_name: string
  file_size: number
  uploader_name: string
  status: 'uploading' | 'completed' | 'failed'
  created_at: string
}

/** 收件箱管理/状态响应（通过 collection_code 获取） */
export interface CollectionManageResponse {
  collection_code: string
  delivery_code: string
  retrieve_code: string
  title: string
  description: string
  max_files: number
  created_at: string | null
  expire_style: string
  expire_value: number
  expired_at: string | null
  delivery_expire_style: string
  delivery_expire_value: number
  delivery_expired_at: string | null
  retrieve_expire_style: string
  retrieve_expire_value: number
  retrieve_expired_at: string | null
  file_count: number
  files: CollectionFileItem[]
}

/** 取件码响应（只读，通过 retrieve_code 获取；不暴露管理码/投件码） */
export interface CollectionRetrieveResponse {
  retrieve_code: string
  title: string
  description: string
  file_count: number
  total_size: number
  created_at: string | null
  expired_at: string | null
  expire_style: string
  expire_value: number
  retrieve_expire_style: string
  retrieve_expire_value: number
  retrieve_expired_at: string | null
  files: CollectionFileItem[]
}

/** 投递文件响应 */
export interface CollectionUploadResponse {
  id: number
  filename: string
  file_size: number
  status: 'uploading' | 'completed' | 'failed'
}

/** 投递分片上传初始化响应 */
export interface DeliveryChunkInitResponse {
  upload_id: string
  file_id: number
  chunk_size: number
  total_chunks: number
  uploaded_chunks: number[]
}

/** WebSocket 消息类型 */
export interface CollectionWSMessage {
  type: 'file_uploading' | 'file_completed' | 'file_deleted' | 'file_delivery_failed' | 'file_progress' | 'user_joined' | 'user_left'
  filename?: string
  progress?: number
  uploader?: string
  file_id?: number
  file_size?: number
  error?: string
  nickname?: string
  online_users?: string[]
}

/** 上传进度信息（收件箱页面实时展示） */
export interface UploadProgressInfo {
  fileId?: number
  filename: string
  progress: number
  uploader: string
}

/** 多文件分享中的文件项 */
export interface MultiFileItem {
  id: number
  file_name: string
  file_size: number
}

/** 扩展的取件响应（支持多文件） */
export interface ShareSelectResponseMulti {
  code: string
  name: string
  size: number
  text: string
  is_multi_file?: boolean
  created_at?: string
  expired_at?: string | null
  expire_style?: string
  expire_value?: number
  items?: MultiFileItem[]
}

/** Dashboard 收件箱统计 */
export interface CollectionStats {
  totalCollections: number
  activeCollections: number
  totalDeliveries: number
  todayDeliveries: number
  todayDeliveriesSize: string
  yesterdayDeliveries: number
  yesterdayDeliveriesSize: string
}

/** 后台收件箱列表项 */
export interface AdminCollectionItem {
  id: number
  collection_code: string
  delivery_code: string
  retrieve_code: string
  title: string
  description: string
  max_files: number
  file_count: number
  used_count: number
  displayCreatedAt?: string
  is_expired: boolean
  is_delivery_expired: boolean
  is_retrieve_expired: boolean
  expire_style: string
  expire_value: number
  expired_at: string | null
  delivery_expire_style: string
  delivery_expire_value: number
  delivery_expired_at: string | null
  retrieve_expire_style: string
  retrieve_expire_value: number
  retrieve_expired_at: string | null
  created_at: string
  /** 投递次数上限（-1 表示不限）；用于次数模式剩余投递次数展示 */
  delivery_count?: number
  /** 已用投递次数 */
  delivery_used_count?: number
}

/** 更新收件箱配置请求（收件箱过期时间不可更改） */
export interface UpdateCollectionConfigRequest {
  delivery_expire_style?: string
  delivery_expire_value?: number
  retrieve_expire_style?: string
  retrieve_expire_value?: number
  max_files?: number
}

/** 更新收件箱配置响应（返回完整收件箱信息） */
export interface UpdateCollectionConfigResponse {
  collection_code: string
  delivery_code: string
  retrieve_code: string
  title: string
  description: string
  max_files: number
  created_at: string | null
  expire_style: string
  expire_value: number
  expired_at: string | null
  delivery_expire_style: string
  delivery_expire_value: number
  delivery_expired_at: string | null
  retrieve_expire_style: string
  retrieve_expire_value: number
  retrieve_expired_at: string | null
  file_count: number
  total_size: number
  files: CollectionFileItem[]
}
