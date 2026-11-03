/**
 * 用户显式选择的主题 id 的本地存取（与"跟随系统"的模式设置分开）。
 *
 * ## 为什么读取时要过 isThemeId
 * localStorage 里的值可能来自旧版本主题表或被人手改过；直接拿它去主题注册表查
 * 会拿到 undefined，进而让整套 CSS 变量失效。校验不过就返回 null，让上层回退到
 * 站点默认主题，而不是崩在渲染阶段。
 *
 * ## 刻意不做
 * 不在这里存 light/dark/system 模式（那是 preference-storage 的 COLOR_MODE 职责）；
 * remove 用于"清除覆盖、恢复站点默认"，与写入某个具体值语义不同，别合并。
 */
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
