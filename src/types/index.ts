/**
 * 类型 barrel：统一从 `@/types` 导入所有类型。
 *
 * ## 取舍
 * 只 re-export 各视图通用、且与单个子系统无强绑定的类型文件。
 * `collection.ts` / `room.ts` 不在此导出（调用方一律从 `@/types/collection`、
 * `@/types/room` 子路径导入）：这两个改动最频繁，挂到 barrel 上会让任何一处
 * 字段调整都触发整个 `@/types` 的重新检查。
 *
 * 注意：新增类型文件时要自行判断是否加入这里，**没加进来不会报错**，
 * 只会在有人从 `@/types` 导入时报"找不到导出"。
 */

export * from './api'
export * from './auth'
export * from './config'
export * from './dashboard'
export * from './direct'
export * from './file'
export * from './presign-upload'
export * from './ui'
