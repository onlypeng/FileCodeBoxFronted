// 应用常量配置

// 存储键名
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

// 发送类型（文本已合并为文件，仅保留文件类型）
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
  REQUEST_TIMEOUT: 30000, // 30秒（此前误写为 300000000ms≈83小时）
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

// 正则表达式
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  CODE: /^[A-Za-z0-9]{4,12}$/ // 口令/码格式（兼容码位数配置调整前的旧码）
} as const

// 默认配置
export const DEFAULT_CONFIG = {
  name: 'FileCodeBox',
  description: '文件传输工具',
  maxFileSize: FILE_SIZE_LIMITS.MAX_FILE_SIZE,
  allowedFileTypes: ['*'] as string[],
  expireDays: 7
}
