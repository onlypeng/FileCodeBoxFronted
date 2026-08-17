/**
 * 下载动作 composable
 * 封装 download-action 工具，注入 alertStore 提示回调，供视图/组件使用
 */
import { useAlertStore } from '@/stores/alertStore'
import { downloadFile, downloadReceivedRecord } from '@/utils/download-action'
import type { DownloadResult } from '@/utils/download-action'
import type { ReceivedFileRecord } from '@/types'

export function useDownload() {
  const alertStore = useAlertStore()

  const notify = (message: string, type: 'success' | 'error') => {
    alertStore.showAlert(message, type)
  }

  /** 下载文件（自动弹出错误提示） */
  const download = (
    url: string,
    filename?: string,
    options?: {
      isExpired?: boolean
      expiredMessage?: string
      silent?: boolean
    }
  ): Promise<DownloadResult> => {
    return downloadFile(url, filename, { ...options, notify })
  }

  /** 根据取件记录自动选择下载方式 */
  const downloadRecord = (record: ReceivedFileRecord): Promise<DownloadResult> => {
    return downloadReceivedRecord(record, notify)
  }

  return { download, downloadRecord }
}
