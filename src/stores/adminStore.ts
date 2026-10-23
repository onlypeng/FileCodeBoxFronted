import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  clearStoredAuth,
  readStoredToken,
  writeStoredToken
} from '@/utils/auth-storage'

export const useAdminStore = defineStore('admin', () => {
  // 状态（管理员密码不做持久化，仅存登录 Token）
  const token = ref(readStoredToken())

  // 计算属性
  const hasToken = computed(() => !!token.value)

  /**
   * 是否仍在使用默认管理员口令（登录后 / verify 时由服务端告知）。
   * 默认口令是公开常量，为 true 时必须强制改密：前端弹出不可关闭的改密弹窗，
   * 后端中间件也会拦截除"改密所必需"之外的后台接口。
   */
  const mustChangePassword = ref(false)

  const setMustChangePassword = (value: boolean) => {
    mustChangePassword.value = !!value
  }

  // 方法
  const setToken = (newToken: string) => {
    token.value = newToken
    writeStoredToken(newToken)
  }

  const logout = () => {
    token.value = ''
    mustChangePassword.value = false
    clearStoredAuth()
  }

  return {
    token,
    hasToken,
    mustChangePassword,
    setMustChangePassword,
    setToken,
    logout
  }
})
