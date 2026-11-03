/**
 * localStorage 偏好读写的薄封装：主题/语言，以及通用的字符串与 JSON 存取。
 *
 * ## 为什么 JSON 读取一定要吞异常
 * 这些值可能被旧版本格式、用户手改或半写入的脏数据污染；解析失败时返回 fallback
 * 让页面照常启动，比抛错白屏好。写入按 typeof 区分字符串与对象，避免把纯字符串
 * 再 JSON.stringify 一层，导致下次读出来带着引号。
 *
 * ## 刻意不做
 * 不做命名空间、版本迁移与 storage 事件监听（多标签同步目前不需要）；
 * 也不缓存读到的值，配置类数据由各 store 自己持有响应式状态。
 */
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
