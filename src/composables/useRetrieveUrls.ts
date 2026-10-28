/**
 * 取件/收件箱下载 URL 构造 composable
 * 包装 CollectionService 的纯字符串 URL 构造方法（不发请求），避免视图直接依赖 services
 */
import { CollectionService } from '@/services'

export function useRetrieveUrls() {
  /** 收件箱单文件下载 URL（需管理码或取件码校验） */
  const getDownloadUrl = (fileId: number, code: string): string =>
    CollectionService.getDownloadUrl(fileId, code)

  /** 收件箱 ZIP 打包下载 URL */
  const getZipDownloadUrl = (collectionCode: string): string =>
    CollectionService.getZipDownloadUrl(collectionCode)

  /** 多文件分享单文件下载 URL（key：提取口令分享取件后拿到的短期 token） */
  const getMultiFileDownloadUrl = (itemId: number, code: string, key?: string): string =>
    CollectionService.getMultiFileDownloadUrl(itemId, code, key)

  /** 多文件分享 ZIP 下载 URL（key：同上） */
  const getMultiFileZipUrl = (code: string, key?: string): string =>
    CollectionService.getMultiFileZipUrl(code, key)

  return {
    getDownloadUrl,
    getZipDownloadUrl,
    getMultiFileDownloadUrl,
    getMultiFileZipUrl,
  }
}
