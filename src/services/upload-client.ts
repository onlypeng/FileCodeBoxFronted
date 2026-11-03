import axios from 'axios'
import type { UploadProgress } from '@/types'

/**
 * 直传到**外部地址**（对象存储预签名 URL）的上传实现。
 *
 * ## 为什么单独一个文件、且不用 client.ts 的 apiClient
 * - 目标往往**跨域**，且不应带上本项目的 Authorization 头——把管理员 token
 *   发到 S3 是实打实的凭据泄漏。
 * - 因此这里用裸 `axios.put`，完全绕开 client.ts 的请求/响应拦截器。
 *
 * ## 刻意不做
 * 不处理任何重试。预签名 URL 一次性且短期，重试通常意味着要重新换 URL，
 * 那是上层（usePresignedUpload）的职责。
 *
 * @param uploadUrl 必须是**完整**的外网地址（含协议），不接受相对路径
 * @returns 无返回值。成功与否由**是否抛异常**表达：网络失败、签名过期、
 *          返回非 2xx 都会 reject，调用方务必 try/catch。
 */
export async function uploadToExternalUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    timeout: 0,
    onUploadProgress: (progressEvent) => {
      if (!onProgress || !progressEvent.total) {
        return
      }

      onProgress({
        loaded: progressEvent.loaded,
        total: progressEvent.total,
        percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
      })
    }
  })
}
