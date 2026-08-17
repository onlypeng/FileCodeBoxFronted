/**
 * 取件/多文件弹窗的复制与内容获取 composable
 * 封装 FileService.selectFile 与剪贴板操作，供组件使用
 */
import { useI18n } from 'vue-i18n'
import { FileService } from '@/services'
import { useAlertStore } from '@/stores/alertStore'
import { useClipboard } from '@/composables'

export function useRetrieveCopyActions() {
  const { t } = useI18n()
  const alertStore = useAlertStore()
  const { copy } = useClipboard()

  /** 复制文本；内容为空时提示失败 */
  const copyText = async (
    content: string,
    options: { successMsg?: string; errorMsg?: string } = {}
  ): Promise<boolean> => {
    if (!content) {
      alertStore.showAlert(options.errorMsg || t('retrieve.textMode.copyFailed'), 'error')
      return false
    }
    return copy(content, {
      successMsg: options.successMsg || t('retrieve.copySuccess'),
      errorMsg: options.errorMsg || t('retrieve.textMode.copyFailed')
    })
  }

  /** 联网获取取件码对应的文本正文（旧记录 text 为空时使用） */
  const fetchSelectText = async (code: string): Promise<string> => {
    try {
      const res = await FileService.selectFile(code)
      const detail = res.detail as { text?: string } | undefined
      return detail?.text || ''
    } catch {
      return ''
    }
  }

  return { copyText, fetchSelectText }
}
