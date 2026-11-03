/**
 * 上传类请求共用的 axios 配置片段。
 *
 * ## 两个非直觉的点
 * - `timeout: 0`（不限时）：默认超时来自 client.ts，但大文件在弱网下远超该时长。
 *   上传是用户显式发起且带进度条的操作，宁可让它一直转也不要中途判失败。
 * - `Content-Type` 写死 `multipart/form-data` 而**不带 boundary**：
 *   浏览器必须根据 FormData 自己生成带 boundary 的 header，手动指定会替换掉它，
 *   boundary 丢失会导致服务端解析不出字段。
 *
 * ## 边界
 * `progressEvent.total` 可能为 0/undefined（服务端未给 Content-Length），
 * 此时**静默跳过**回调而不是报 0%：进度归零会让 UI 表现为"倒退"。
 */
import type { AxiosRequestConfig } from 'axios'
import type { UploadProgress } from '@/types'

export const multipartUploadConfig = (
  onProgress?: (progress: UploadProgress) => void
): AxiosRequestConfig => ({
  headers: {
    'Content-Type': 'multipart/form-data'
  },
  timeout: 0,
  onUploadProgress: (progressEvent) => {
    if (onProgress && progressEvent.total) {
      onProgress({
        loaded: progressEvent.loaded,
        total: progressEvent.total,
        percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
      })
    }
  }
})
