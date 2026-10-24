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
