/**
 * services 层的公共导出面。
 *
 * ## 约定
 * 所有 service 都是**静态方法的 class**，不持有状态、不持有 axios 实例。
 * 因此这里导出的只是命名空间，不存在"单例需要初始化"的问题，`import` 即可用。
 *
 * ## 刻意不做
 * 不提供 `import { services } from '@/services'` 这种聚合对象：树摇会失效，
 * 打出来的包会把后台管理接口的 service 也塞进访客端首屏。
 * 另外 `uploadChunkedFile` 是唯一的普通函数（它有编排逻辑，不是纯转发），
 * 与其它 class 形态不一致，但刻意不包成 class——它没有可复用的第二组方法。
 */
export { AUTH_EVENTS } from './client'
export { AuthService } from './auth'
export { ConfigService } from './config'
export { FileService } from './file'
export { PresignUploadService } from './presign-upload'
export { StatsService } from './stats'
export { uploadChunkedFile } from './upload-strategy'
export { CollectionService } from './collection'
export { DeliveryService } from './delivery'
export { DirectService } from './direct'
export { RoomService } from './room'
export { AuditService } from './audit'
export type { AuditLogItem, AuditLogResponse } from './audit'
export type { AdminRoomCacheFile, AdminRoomCacheFilesResponse } from './room'
