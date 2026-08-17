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
