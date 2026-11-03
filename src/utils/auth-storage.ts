/**
 * 管理员凭据的 localStorage 读写：只落 Token，绝不落口令。
 *
 * ## 为什么口令不持久化
 * 密码只在登录请求里用一次；一旦写进 localStorage，任何 XSS 都能直接读走明文，
 * 且用户改密后遗留字段会长期驻留。clearStoredAuth 额外删掉历史版本的
 * adminPassword 字段，就是为了回收这类旧数据。
 *
 * ## 刻意不做
 * 不在前端解析/校验 Token（签名密钥在服务端，校验见 router 的 /admin/verify）；
 * 也不做本地加密——密钥同样得放在前端，等于没加。
 */
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
