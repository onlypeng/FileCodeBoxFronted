// 应用常量配置

// 存储键名
export const STORAGE_KEYS = {
  COLOR_MODE: 'colorMode',
  ADMIN_PASSWORD: 'adminPassword',
  TOKEN: 'token',
  CONFIG: 'config',
  NOTIFY: 'notify',
  UPLOADER_NICKNAME: 'uploaderNickname',
  RECENT_DELIVERY_CODES: 'recentDeliveryCodes',
  DELIVERY_UPLOAD_HISTORY: 'deliveryUploadHistory'
} as const

// 主题模式
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const

// 发送类型
export const SEND_TYPES = {
  FILE: 'file',
  TEXT: 'text'
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

// API 响应状态码
export const API_STATUS_CODES = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
} as const

// 文件大小限制 (字节)
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  CHUNK_SIZE: 1024 * 1024 // 1MB
} as const

// 时间相关常量
export const TIME_CONSTANTS = {
  ALERT_DURATION: 5000, // 5秒
  REQUEST_TIMEOUT: 300000000,
  PROGRESS_UPDATE_INTERVAL: 100 // 100毫秒
} as const

// 路由路径
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
  COLLECTION_SUBMIT: '/collection/submit',
  DELIVERY_ENTER: '/delivery/enter',
  DELIVERY_UPLOAD: '/delivery/upload',
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
  COLLECTION_SUBMIT: 'CollectionSubmit',
  DELIVERY_ENTER: 'DeliveryEnter',
  DELIVERY_UPLOAD: 'DeliveryUpload',
  UNIFIED_MANAGE: 'UnifiedManage'
} as const

// 正则表达式
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  CODE: /^[A-Z0-9]+$/ // 取件码格式：大写字母+数字
} as const

// 默认配置
export const DEFAULT_CONFIG = {
  name: 'FileCodeBox',
  description: '文件传输工具',
  maxFileSize: FILE_SIZE_LIMITS.MAX_FILE_SIZE,
  allowedFileTypes: ['*'] as string[],
  expireDays: 7
}
