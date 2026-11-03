/**
 * 后台登录的状态机：校验 → 换 token → 写 adminStore，成功与否用布尔值交回页面决定跳转。
 * 口令只做 ≥6 的即时反馈，真实校验留给后端，避免前端复刻一套规则后两边不一致。
 *
 * 刻意不做：口令绝不进 store 或持久化，只落 token；must_change_password 由服务端
 * 下发后置位，后台布局据此弹出不可关闭的改密弹窗。
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AuthService } from '@/services'
import { useAdminStore } from '@/stores/adminStore'
import { useAlertStore } from '@/stores/alertStore'
import { getErrorMessage } from '@/utils/common'

export function useAdminLogin() {
  const alertStore = useAlertStore()
  const adminStore = useAdminStore()
  const { t } = useI18n()
  const password = ref('')
  const isLoading = ref(false)

  const validateForm = () => {
    if (!password.value) {
      alertStore.showAlert(t('manage.login.invalidPassword'), 'error')
      return false
    }

    if (password.value.length < 6) {
      alertStore.showAlert(t('manage.login.passwordTooShort'), 'error')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return false

    isLoading.value = true
    try {
      const response = await AuthService.login(password.value)
      if (!response.detail?.token) {
        alertStore.showAlert(t('manage.login.noValidToken'), 'error')
        return false
      }

      adminStore.setToken(response.detail.token)
      // 默认口令未修改时置位，后台布局据此弹出不可关闭的改密弹窗
      adminStore.setMustChangePassword(!!response.detail.must_change_password)
      return true
    } catch (error: unknown) {
      alertStore.showAlert(getErrorMessage(error, t('manage.login.loginFailed')), 'error')
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    password,
    isLoading,
    handleSubmit
  }
}
