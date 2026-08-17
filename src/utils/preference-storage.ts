import { STORAGE_KEYS } from '@/constants'
import type { ThemeMode } from '@/types'

const LOCALE_STORAGE_KEY = 'locale'

export function readStoredThemeMode(): string | null {
  return localStorage.getItem(STORAGE_KEYS.COLOR_MODE)
}

export function writeStoredThemeMode(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEYS.COLOR_MODE, mode)
}

export function readStoredLocale(): string | null {
  return localStorage.getItem(LOCALE_STORAGE_KEY)
}

export function writeStoredLocale(locale: string) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

// ============ 通用存储读写（供视图/组件/仓库使用） ============

/** 读取字符串偏好；不存在时返回 fallback */
export function readPreference(key: string, fallback: string): string {
  const value = localStorage.getItem(key)
  return value ?? fallback
}

/** 读取 JSON 结构偏好；解析失败时返回 fallback */
export function readJsonPreference<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** 写入偏好（字符串或 JSON） */
export function writePreference(key: string, value: string | unknown) {
  if (typeof value === 'string') {
    localStorage.setItem(key, value)
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

/** 移除偏好 */
export function removePreference(key: string) {
  localStorage.removeItem(key)
}
