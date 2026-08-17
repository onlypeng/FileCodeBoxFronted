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

  // 方法
  const setToken = (newToken: string) => {
    token.value = newToken
    writeStoredToken(newToken)
  }

  const logout = () => {
    token.value = ''
    clearStoredAuth()
  }

  return {
    token,
    hasToken,
    setToken,
    logout
  }
})
