/**
 * 文件分享（上传 / 列表 / 取件 / 记录）全链路的类型定义。
 *
 * ## 问题
 * 分享链路里有三组极易混淆的"码/凭证"和一组易混淆的"多文件标记"：
 *   - `code`：取件码，公开的，任何人拿到都能请求取件信息
 *   - `ownerToken`：发起者凭证，**只**下发给上传者，凭它可以提前作废分享
 *   - `accessKey`：二次口令通过后服务端下发的**短期**下载 token
 * 三者泄漏任一都会导致越权，因此在这里就把语义钉死，不允许用泛指的 `token` 命名。
 *
 * ## 取舍
 * 记录类类型（ReceivedFileRecord / SentFileRecord）刻意用**宽字段 + 全可选**：
 * 它们会被序列化进 localStorage，历史上已有多版结构。收窄成必填会在读取旧数据时
 * 全部变成 undefined 而编译期毫无察觉——宁可运行时判空，也不要假的类型安全。
 */

/**
 * 上传/列表场景的文件元信息。
 *
 * 注意这是**前端展示模型**，字段名是驼峰，且不与任何单个接口一一对应；
 * 后端原始响应用 `FileListItem`（蛇形），两者由 utils/record-display 之类做转换。
 */
export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  uploadTime: string
  downloadCount: number
  expireTime?: string
}

/**
 * 后台文件列表项（GET /admin/file/list）。
 *
 * 字段全部蛇形，与后端 `FileStorage` 模型对齐；取名不为可读性，
 * 而是为了让 tsc 在后端改字段名时能一次性暴露所有引用点。
 */
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
  /** 服务端落盘时算出的权威 SHA-256（多文件打包场景不下发） */
  file_hash?: string
  /** 是否为多文件分享。**这个字段决定界面走哪套逻辑**：为 true 时 `items`
   *  才是有效数据、`name`/`size` 只是打包后的汇总值；为 false 时必须忽略 `items`。
   *  后端在单文件场景不下发该字段，故判真要写 `=== true` 之外的宽松写法。
   */
  is_multi_file?: boolean
  items?: Array<{ id: number; file_name: string; file_size: number }>
  /** 该分享是否设置了提取口令（二次口令）
   *  语义陷阱：它只是"是否需要口令"的**预告**。为 true 时后续取件/下载请求
   *  都必须先换到 `accessKey`，否则后端会拒绝；为 false 不代表能直接下载
   *  （还可能受次数、过期限制）。
   */
  require_access_code?: boolean
  /** 口令通过后下发的短期下载 token，多文件单项/打包下载需带上 */
  access_key?: string
  expired_count?: number
  created_at?: string | null
  expired_at?: string | null
  expire_style?: string
  expire_value?: number
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
  /**
   * 服务端落盘时算出的 SHA-256（权威值），用于下载后校验文件完整性。
   * 空串表示无可用基准（多文件打包、旧数据未回填等），此时跳过校验。
   */
  fileHash?: string
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
  /**
   * 发起者凭证：上传成功时服务端随取件码下发，凭它可提前作废。
   * 旧记录（升级前创建的）没有这个值，此时不显示"撤销"。
   */
  ownerToken?: string
  /** 是否为投件记录（多文件子类型） */
  isDelivery?: boolean
  /** 投件时的收件箱标题 */
  collectionTitle?: string
  /** 是否为多文件分享：为 true 时用 `files` 渲染子项列表，忽略顶层的 size 语义 */
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

/** 秒传判定用的完整文件 SHA-256：后端据此查是否已有同一份物理文件 */
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
  /** 命中秒传：服务端已存在同哈希文件，无需再传任何分片。
   *  此时 `code`/`name` 已直接可用，`upload_id` 不必再走 complete 流程。 */
  existed?: boolean
  uploaded_chunks?: number[]
}

export interface ChunkUploadCompleteRequest {
  expire_value: number
  expire_style: string
  /** 文件备注（可选） */
  remark?: string
  /** 提取口令（可选）：分享创建时可选的二次口令 */
  access_code?: string
}

/**
 * 分片合并接口的返回值固定为空。
 *
 * 刻意写成 `null` 而非 `void`/`unknown`：合并成功后取件码要从
 * `ChunkUploadInitResponse.code` 拿，合并接口本身什么都不给，
 * 用具体的 null 阻止调用方误以为这里有新数据。
 */
export type ChunkUploadResponse = null
