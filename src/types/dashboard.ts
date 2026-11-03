/**
 * 仪表盘统计数据的类型。
 *
 * ## 问题
 * 仪表盘是**唯一**需要同时展示文件、收件箱、房间三套子系统统计的页面，
 * 后端为了少一次 round-trip 把它们合并成一个扁平对象返回。
 *
 * ## 因此
 * `DashboardData` 刻意不做分层嵌套（可以用 `Dashboard{x}` 子对象，但没有）：
 * 扁平化让后端能直接 dict 展开，代价是新增指标必须改这里。
 * 字段粒度上保留了原始后端类型（size 是**字节数**， perdiem 文案是
 * 后端算好的字符串），前端不重复做单位换算。
 *
 * `DashboardViewData` 才是给界面用的：派生出 `xxText`（人类可读尺寸）
 * 与 `xxRatio`（百分比），**前端只读不做二次计算**。
 * 刻意不在这里定义任何请求/写入类型——仪表盘是纯读接口。
 */
export interface DashboardData {
  totalFiles: number
  /** 已占用存储容量，单位**字节**（不是 MB），格式化在 DashboardViewData 里做 */
  storageUsed: number
  yesterdayCount: number
  todayCount: number
  /** 昨日/今日上传增量字节数 */
  yesterdaySize: number
  todaySize: number
  /** 系统运行时长秒数；取不到时为 null（多实例下并非所有节点都能上报） */
  sysUptime: number | null
  activeCount: number
  expiredCount: number
  textCount: number
  fileCount: number
  /** 分片上传方式完成的数量，与 fileCount 有重叠，非互斥分类 */
  chunkedCount: number
  usedCount: number
  storageBackend: string
  /** 单文件大小上限，单位与 storageUsed 一致（字节） */
  uploadSizeLimit: number
  /** 开关量走 0/1 而非 boolean，与后端配置存储保持一致 */
  openUpload: number
  enableChunk: number
  maxSaveSeconds: number
  topSuffixes: DashboardSuffixStat[]
  recentFiles: DashboardRecentFile[]
  recentCollections: DashboardRecentCollection[]
  // 收件箱统计
  totalCollections: number
  activeCollections: number
  totalDeliveries: number
  todayDeliveries: number
  todayDeliveriesSize: string
  yesterdayDeliveries: number
  yesterdayDeliveriesSize: string
  // 房间统计（基本房间信息）
  totalRooms: number
  activeRooms: number
  todayRooms: number
  onlineRooms: number
}

export interface DashboardSuffixStat {
  suffix: string
  count: number
}

export interface DashboardRecentFile {
  id: number
  code: string
  name: string
  suffix: string
  size: number
  text: boolean
  expiredAt: string | null
  expiredCount: number
  usedCount: number
  createdAt: string | null
  isExpired: boolean
}

export interface DashboardRecentCollection {
  id: number
  title: string
  collection_code: string
  delivery_code: string
  retrieve_code: string
  file_count: number
  max_files: number
  is_expired: boolean
  created_at: string | null
}

export interface DashboardViewData extends DashboardData {
  hasExtendedStats: boolean
  storageUsedText: string
  yesterdaySizeText: string
  todaySizeText: string
  uploadSizeLimitText: string
  sysUptimeText: string
  activeRatio: number
  textRatio: number
  fileRatio: number
  todaySizeRatio: number
}
