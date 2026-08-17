import { STORAGE_KEYS } from '@/constants'
import type { ThemeId } from '@/theme'
import { isThemeId } from '@/theme'

/** 读取用户本地选择的主题 id；不存在或非法时返回 null */
export function readStoredThemeId(): ThemeId | null {
  const value = localStorage.getItem(STORAGE_KEYS.THEME_ID)
  return isThemeId(value) ? value : null
}

/** 写入用户本地选择的主题 id */
export function writeStoredThemeId(themeId: ThemeId) {
  localStorage.setItem(STORAGE_KEYS.THEME_ID, themeId)
}

/** 清除用户本地主题选择（恢复站点默认） */
export function removeStoredThemeId() {
  localStorage.removeItem(STORAGE_KEYS.THEME_ID)
}
