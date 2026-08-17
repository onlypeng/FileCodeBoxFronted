/**
 * 剪贴板操作 composable
 * 统一封装 copyToClipboard，供视图/组件使用，避免直接依赖 utils/clipboard
 */
import { useI18n } from 'vue-i18n'
import { copyToClipboard } from '@/utils/clipboard'
import { useAlertStore } from '@/stores/alertStore'

interface CopyOptions {
  successMsg?: string
  errorMsg?: string
}

export function useClipboard() {
  const alertStore = useAlertStore()
  const { t } = useI18n()

  const copy = async (text: string, options: CopyOptions = {}): Promise<boolean> => {
    return copyToClipboard(text, {
      successMsg: options.successMsg || t('common.copySuccess'),
      errorMsg: options.errorMsg || t('common.copyFailed'),
      notify: (message, type) => alertStore.showAlert(message, type)
    })
  }

  return { copy }
}
