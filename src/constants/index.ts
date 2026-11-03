/**
 * 应用常量集中定义。
 *
 * 这里的每个分组都对应一处"跨层约束"：谁会读它决定了它能不能随便改。
 * - STORAGE_KEYS：localStorage 的命名空间。改任何一个值等于让老用户的数据
 *   （主题、昵称、历史记录）静默失效，所以这里维护清单而不是各处写字符串字面量。
 * - FILE_SIZE_LIMITS / TIME_CONSTANTS：前端的**兜底**阈值，用于本地拦截明显不可能
 *   成功的请求（超限不发请求、分片按此切）。真正的生效值以后端下发 config 为准——
 *   两者不一致时以服务端为准，前端只负责少发一次必然失败的请求。
 * - ROUTES / ROUTE_NAMES：路径与路由名分离，跳转统一用 name 或这里的常量，
 *   避免字符串散落；`name` 用而不用 path，是为了将来改路径不必改调用点。
 *
 * 刻意不做：不放能通过 /api/config 下发的东西（站点名、主题、过期策略等），
 * 那些属于配置而非常量，应走 configStore。
 */

// ---------- 存储键名 ----------
// 全部带作用域前缀，只有 COLOR_MODE / TOKEN / CONFIG 是历史遗留的裸键：
// 它们已在大量用户浏览器里落盘，重命名等于让用户"被登出"或主题被重置。
export const STORAGE_KEYS = {
  COLOR_MODE: 'colorMode',
  THEME_ID: 'filecodebox:themeId',
  TOKEN: 'token',
  CONFIG: 'config',
  NOTIFY: 'notify',
  UPLOADER_NICKNAME: 'uploaderNickname',
  RECENT_DELIVERY_CODES: 'recentDeliveryCodes',
  DELIVERY_UPLOAD_HISTORY: 'deliveryUploadHistory',
  DIRECT_NICKNAME: 'directNickname',
  DIRECT_CLIENT_ID: 'directClientId',
  RECENT_DIRECT_ROOMS: 'recentDirectRooms'
} as const

// 主题模式
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const

// ---------- 发送类型 ----------
// 历史上还有 'text' 分支；文本现在统一走"文本即文件"上传到同一个接口，
// 保留 FILE 单值是为了让调用点仍能写成 SEND_TYPES.FILE 而不散落裸字符串。
export const SEND_TYPES = {
  FILE: 'file'
} as const

// 警告类型
export const ALERT_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const

// 上传状态
export const UPLOAD_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error'
} as const

// ---------- API 响应码 ----------
// 同一组数值被用在两种语境里，读代码时要分清：
// services/client.ts 用它比 HTTP status（error.response.status === UNAUTHORIZED 时广播
// 全局登出事件），router/index.ts 用它比响应体里的业务 code（res.code === SUCCESS）。
// 两者都成立是因为后端让业务 code 与 HTTP status 取值一致；
// 一旦后端改为统一 200 + 业务码，这里的 UNAUTHORIZED 判定就会失效。
export const API_STATUS_CODES = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
} as const

// ---------- 文件大小限制（字节）----------
// MAX_FILE_SIZE：本地预检阈值。超限直接在前端拦截，不必把注定被后端拒绝的
// 请求发出去（几百 MB 的上传在失败前会白白占满上行带宽）。server 端可能配置得更小。
// CHUNK_SIZE：分片大小，同时决定 hash 计算的切片粒度和断点续传的最小单位。
// 1MB 是内存占用与请求数的折中——再小会让大文件产生上千个请求，再大则单片失败重传成本高。
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  CHUNK_SIZE: 1024 * 1024 // 1MB
} as const

// ---------- 时间常量（毫秒）----------
// ALERT_DURATION 5s：足够读一行提示，又不至于需要用户手动关闭。
// REQUEST_TIMEOUT 30s：普通 JSON 接口的超时。此前误写成 300000000ms（≈83 小时），
//   等于永不超时——上传以外的接口卡死时 loading 会一直转。注意这只是默认兜底，
//   上传等长任务有独立的超时策略，不适用此值。
// PROGRESS_UPDATE_INTERVAL 100ms：进度条刷新节流间隔。onUploadProgress 触发
//   频率可达每帧数十次，直接赋值会让每个包都触发一次组件重渲染。
export const TIME_CONSTANTS = {
  ALERT_DURATION: 5000, // 5秒
  REQUEST_TIMEOUT: 30000, // 30秒（此前误写为 300000000ms≈83小时）
  PROGRESS_UPDATE_INTERVAL: 100 // 100毫秒
} as const

// ---------- 路由路径 ----------
// COLLECTION_RETRIEVE / COLLECTION_DETAIL 等对外开放分享链接必须在这里登记：
// 它们是用户贴到聊天窗口里的 URL，改动=让已发出的链接失效（旧前缀只能靠重定向兼容）。
export const ROUTES = {
  HOME: '/',
  SEND: '/send',
  ADMIN: '/admin',
  LOGIN: '/login',
  DASHBOARD: '/admin/dashboard',
  SETTINGS: '/admin/settings',
  COLLECTION_CREATE: '/collection/create',
  COLLECTION_MANAGE: '/collection/manage',
  COLLECTION_RETRIEVE: '/collection/retrieve',
  COLLECTION_DETAIL: '/collection/manage',
  DELIVERY_UPLOAD: '/delivery/upload',
  DIRECT: '/direct',
  DIRECT_ROOM: '/direct/room',
  UNIFIED_MANAGE: '/admin/unified'
} as const

export const ROUTE_NAMES = {
  HOME: 'Home',
  RETRIEVE: 'Retrieve',
  SEND: 'Send',
  ADMIN: 'Manage',
  LOGIN: 'Login',
  DASHBOARD: 'Dashboard',
  SETTINGS: 'Settings',
  COLLECTION_CREATE: 'CollectionCreate',
  COLLECTION_MANAGE: 'CollectionManage',
  COLLECTION_RETRIEVE: 'CollectionRetrieve',
  COLLECTION_DETAIL: 'CollectionDetail',
  DELIVERY_UPLOAD: 'DeliveryUpload',
  DIRECT_HOME: 'DirectHome',
  DIRECT_ROOM: 'DirectRoom',
  UNIFIED_MANAGE: 'UnifiedManage'
} as const

// ---------- 正则 ----------
// CODE：4~12 位字母数字，用于前端"看起来像取件码"的合法性预判——
// 放宽到 4 位是为了兼容码位数配置调大前的旧码；真正的格式/位数校验在服务端。
// EMAIL / PHONE：仅用于表单即时提示，不做注册校验依据。
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  CODE: /^[A-Za-z0-9]{4,12}$/ // 口令/码格式（兼容码位数配置调整前的旧码）
} as const

// ---------- 默认配置 ----------
// 只在"后端配置还没拉到"的首屏窗口期兜底，避免 UI 出现 undefined 或空标题。
// 拿到 /api/config 后立即被真实值覆盖，不要把它当成默认站的期望值。
export const DEFAULT_CONFIG = {
  name: 'FileCodeBox',
  description: '文件传输工具',
  maxFileSize: FILE_SIZE_LIMITS.MAX_FILE_SIZE,
  allowedFileTypes: ['*'] as string[],
  expireDays: 7
}
