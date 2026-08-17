import { defineStore } from 'pinia'
import { ref } from 'vue'
import { THEME_MODES } from '@/constants'
import type { ThemeMode } from '@/types'
import { readStoredThemeMode, writeStoredThemeMode } from '@/utils/preference-storage'
import { readStoredThemeId, writeStoredThemeId } from '@/utils/theme-storage'
import {
  DEFAULT_THEME_ID,
  getThemeById,
  resolveThemeId,
  THEME_IDS,
  THEMES,
  type ThemeId
} from '@/theme'

/**
 * 主题状态仓库（全局单一状态源）
 *
 * - `themeId`：当前实际生效的主题（light / dark / enterprise）
 * - `isDarkMode` / `themeMode`：向后兼容旧的明暗模式逻辑，驱动 Tailwind dark 变体
 * - 持久化：用户显式选择写入 localStorage（themeId）；站点默认主题由后台下发
 * - 性能：切换时先挂 .theme-switching 类临时禁用过渡，再原子修改
 *   data-theme / dark 类，避免全量元素过渡造成重排重绘，保证 <300ms 完成
 */
export const useThemeStore = defineStore('theme', () => {
  // 实际生效的主题 id
  const themeId = ref<ThemeId>(DEFAULT_THEME_ID)
  // 兼容旧逻辑的暗色状态（驱动 Tailwind dark 变体与组件 isDarkMode 分支）
  const isDarkMode = ref(false)
  // 兼容旧逻辑的主题模式（light / dark / system）
  const themeMode = ref<ThemeMode>(THEME_MODES.SYSTEM)

  // 检查系统颜色模式
  const checkSystemColorScheme = (): boolean => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  /** 跟随系统时的实际主题 */
  const resolveSystemTheme = (): ThemeId =>
    checkSystemColorScheme() ? THEME_IDS.DARK : THEME_IDS.LIGHT

  /**
   * 将主题原子应用到文档。
   * 先禁用过渡动画 → 同帧内修改 data-theme 与 dark 类 → 双 rAF 后恢复，
   * 避免大量元素同时执行颜色过渡（重排重绘）造成切换卡顿。
   */
  const applyToDocument = (id: ThemeId) => {
    const html = document.documentElement
    const theme = getThemeById(id)
    html.classList.add('theme-switching')
    html.setAttribute('data-theme', id)
    if (theme.mode === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => html.classList.remove('theme-switching'))
    })
  }

  /**
   * 设置具体主题
   * @param options.persist 是否写入用户本地偏好（默认 true；站点默认/跟随系统应用时传 false）
   */
  const setTheme = (id: ThemeId, options?: { persist?: boolean }) => {
    themeId.value = id
    const theme = getThemeById(id)
    isDarkMode.value = theme.mode === 'dark'
    applyToDocument(id)
    if (options?.persist !== false) {
      writeStoredThemeId(id)
    }
    // 同步旧模式状态（向后兼容）
    themeMode.value = theme.mode === 'dark' ? THEME_MODES.DARK : THEME_MODES.LIGHT
  }

  /** 旧版明暗模式入口：light / dark / system */
  const setThemeMode = (mode: ThemeMode) => {
    themeMode.value = mode
    writeStoredThemeMode(mode)
    if (mode === THEME_MODES.SYSTEM) {
      setTheme(resolveSystemTheme(), { persist: false })
    } else {
      setTheme(mode === THEME_MODES.DARK ? THEME_IDS.DARK : THEME_IDS.LIGHT)
    }
  }

  /** 切换主题（兼容旧调用方：浅色 → 深色 → 跟随系统） */
  const toggleTheme = () => {
    if (themeMode.value === THEME_MODES.LIGHT) {
      setThemeMode(THEME_MODES.DARK)
    } else if (themeMode.value === THEME_MODES.DARK) {
      setThemeMode(THEME_MODES.SYSTEM)
    } else {
      setThemeMode(THEME_MODES.LIGHT)
    }
  }

  // 监听系统主题变化（仅跟随系统模式时生效）
  const setupSystemThemeListener = () => {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (e: MediaQueryListEvent) => {
        if (themeMode.value === THEME_MODES.SYSTEM) {
          setTheme(e.matches ? THEME_IDS.DARK : THEME_IDS.LIGHT, { persist: false })
        }
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
    return () => {}
  }

  /**
   * 初始化主题。
   * 优先级：用户本地显式选择（themeId）> 旧版 colorMode > 站点默认主题（siteTheme）> 浅色
   */
  const initTheme = (siteTheme?: string) => {
    const userThemeId = readStoredThemeId()
    if (userThemeId) {
      setTheme(userThemeId, { persist: false })
    } else {
      const legacyMode = readStoredThemeMode()
      if (legacyMode && Object.values(THEME_MODES).includes(legacyMode as ThemeMode)) {
        setThemeMode(legacyMode as ThemeMode)
      } else if (siteTheme) {
        setTheme(resolveThemeId(siteTheme), { persist: false })
      } else {
        setTheme(DEFAULT_THEME_ID, { persist: false })
      }
    }
    // 设置系统主题监听
    return setupSystemThemeListener()
  }

  /**
   * 应用后台下发的站点默认主题。
   * 仅当用户未做过显式主题选择（无 themeId、无旧版 colorMode）时生效，
   * 保证用户个性化选择优先于站点默认。
   */
  const applySiteTheme = (siteTheme?: string) => {
    if (!siteTheme || readStoredThemeId()) {
      return
    }
    const legacyMode = readStoredThemeMode()
    if (legacyMode && Object.values(THEME_MODES).includes(legacyMode as ThemeMode)) {
      return
    }
    const resolved = resolveThemeId(siteTheme)
    if (resolved !== themeId.value) {
      setTheme(resolved, { persist: false })
    }
  }

  return {
    // 状态
    isDarkMode,
    themeMode,
    themeId,
    themes: THEMES,

    // 方法
    setTheme,
    setThemeMode,
    toggleTheme,
    initTheme,
    applySiteTheme,
    checkSystemColorScheme
  }
})
