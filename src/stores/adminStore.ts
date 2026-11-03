/**
 * 管理员会话的单一来源。token 从 localStorage 初始化、登录时写回，是为了刷新页面
 * 不必重新登录；但权限判断只看 hasToken，不信任本地 token 的有效性——过期由
 * client 的 401 拦截器统一清掉并广播事件。
 *
 * 刻意不做：管理员口令绝不落任何存储，mustChangePassword 也不持久化（改密状态以
 * 服务端为准，刷新后由 verify 重新下发），避免本地被篡改绕过强制改密。
 */
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
