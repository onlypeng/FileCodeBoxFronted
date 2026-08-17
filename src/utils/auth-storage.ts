import { STORAGE_KEYS } from '@/constants'

// 注意：管理员密码仅用于登录瞬间，不做本地持久化（防止 XSS 窃取口令落盘）

export function readStoredToken(): string {
  return localStorage.getItem(STORAGE_KEYS.TOKEN) || ''
}

export function writeStoredToken(token: string) {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token)
}

export function clearStoredAuth() {
  // 兼容清理历史版本遗留的明文密码字段
  localStorage.removeItem('adminPassword')
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
}

export function clearStoredToken() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
}
