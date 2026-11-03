/**
 * 预签名直传（put ↦ confirm 两段式）的类型定义。
 *
 * ## 问题
 * 文件经由对象存储时不想让文件流经应用服务器，否则带宽和内存都扛不住。
 * 因此拆成两步：先向后端换一个**短期** `upload_url`（可能是 S3 预签名，
 * 也可能是回落到本机的代理地址），前端直传完毕后回调 confirm 让服务端落库。
 *
 * ## 关键约定
 * `mode` 决定第二步怎么走：`direct` 表示前端真的把 PUT 打到了对象存储，
 * `proxy` 表示仍由服务端接收。二者**共用同一套后续流程**，调用方不应分支——
 * 一旦在业务层写 `if (mode === 'proxy')` 就等于把存储差异泄漏了出去。
 *
 * ## 取舍
 * 不在本文件定义任何"已上传文件"的业务模型：confirm 成功后只返回取件码，
 * 完整分享信息仍要查 `ShareSelectResponse`，避免同一份数据两处定义。
 */
import type { UploadProgress } from './file'

/**
 * 直传通道形态。
 * - `direct`：服务端返回对象存储预签名地址，文件不经过应用服务器
 * - `proxy`：对象存储不可用时的回落，仍由应用服务器接收
 *
 * 二者对上层是**透明**的：都只暴露同一个 `upload_url`，上层拿 URL 就传。
 */
export type PresignUploadMode = 'direct' | 'proxy'

/**
 * 一次预签名上传的生命周期状态。
 *
 * 刻意区分 `initializing`（换 URL）与 `confirming`（服务端落库）：这两段的失败
 * 归因完全不同——前者是签名服务问题，后者是配额/落盘问题，UI 给出的提示也不同。
 * 另外 `idle` 与 `success` 都允许重新发起，但 `error` 不允许续传，必须重来。
 */
export type PresignUploadStatus =
  | 'idle'
  | 'initializing'
  | 'uploading'
  | 'confirming'
  | 'success'
  | 'error'

export type ExpireStyle = 'day' | 'hour' | 'minute' | 'forever' | 'count'

export interface PresignInitRequest {
  file_name: string
  file_size: number
  expire_value?: number
  expire_style?: ExpireStyle
  /** 文件备注（可选） */
  remark?: string
}

export interface PresignInitResponse {
  upload_id: string
  /** 上传目标地址。**一次性且短期有效**，过期后必须重新 init，不能缓存复用 */
  upload_url: string
  mode: PresignUploadMode
  /** 签名有效秒数。用于决定是否需要在批量上传前重新换 URL */
  expires_in: number
}

export interface PresignConfirmRequest {
  expire_value?: number
  expire_style?: ExpireStyle
  /** 文件备注（可选） */
  remark?: string
  /** 提取口令（可选）：确认直传时提交，随记录落库 */
  access_code?: string
}

export interface PresignUploadResult {
  code: string
  name: string
}

export interface PresignStatusResponse {
  upload_id: string
  file_name: string
  file_size: number
  mode: PresignUploadMode
  created_at: string
  expires_at: string
  is_expired: boolean
}

export interface PresignUploadOptions {
  expireValue?: number
  expireStyle?: ExpireStyle
  /** 文件备注（可选） */
  remark?: string
  /** 提取口令（可选） */
  accessCode?: string
  onProgress?: (progress: UploadProgress) => void
}
