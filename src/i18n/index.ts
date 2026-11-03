/**
 * vue-i18n 实例与语言切换出口：启动时决定初始语言，之后只暴露 setLocale。
 *
 * ## 语言优先级的理由
 * 本地存储 > 浏览器语言：用户主动选过就不该被系统语言覆盖。繁体地区（tw/hk/mo、
 * 以及带 Hant 的 tag）单独落到 zh-TW，其余中文走 zh-CN，其余一律 en-US；
 * fallback 固定 zh-CN，保证语言包缺 key 时不至于显示空白。
 *
 * ## 副作用与刻意不做
 * 创建实例与每次 setLocale 都同步 document.documentElement.lang（影响字体与读屏）。
 * 三个语言包全量同步引入、不做按需懒加载：包体不大，且能避免切换瞬间的异步闪烁。
 */
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import zhTW from './locales/zh-TW'
import enUS from './locales/en-US'
import { readStoredLocale, writeStoredLocale } from '@/utils/preference-storage'

// 获取浏览器语言设置
const getDefaultLocale = (): string => {
  const savedLocale = readStoredLocale()
  if (savedLocale) {
    return savedLocale
  }
  
  const browserLocale = navigator.language.toLowerCase()
  // 繁体地区（台湾/香港/澳门）直接落到 zh-TW，其余中文地区用 zh-CN
  if (/^zh-(tw|hk|mo)\b/.test(browserLocale) || browserLocale.includes('hant')) {
    return 'zh-TW'
  }
  if (browserLocale.startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en-US'
}

const defaultLocale = getDefaultLocale()

const messages = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en-US': enUS
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: defaultLocale,
  fallbackLocale: 'zh-CN',
  messages,
  globalInjection: true // 全局注入 $t 函数
})

// 初始化时同步 html lang 属性，保证与界面语言一致（影响字体选择与可访问性）
document.documentElement.lang = defaultLocale

export default i18n

// 导出切换语言的函数
export const setLocale = (locale: string) => {
  i18n.global.locale.value = locale as 'zh-CN' | 'en-US'
  writeStoredLocale(locale)
  document.documentElement.lang = locale
}

// 导出获取当前语言的函数
export const getCurrentLocale = () => {
  return i18n.global.locale.value
}

// 导出可用语言列表
export const availableLocales = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'en-US', name: 'English' }
]
