import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/themeStore'
import { THEMES } from '@/theme'

/**
 * 主题能力入口（薄封装）
 *
 * 实际状态与逻辑收敛在 themeStore（全局单一状态源），
 * 此处保持旧调用方（useAppShell 等）的 API 形态不变，并补充主题图标/文案计算属性。
 */
export function useTheme() {
  const store = useThemeStore()
  const { isDarkMode, themeMode, themeId } = storeToRefs(store)

  // 计算属性（向后兼容）
  const themeIcon = computed(() => {
    switch (themeMode.value) {
      case 'light':
        return 'sun'
      case 'dark':
        return 'moon'
      case 'system':
        return 'monitor'
      default:
        return 'monitor'
    }
  })

  const themeLabel = computed(() => {
    switch (themeMode.value) {
      case 'light':
        return '浅色模式'
      case 'dark':
        return '深色模式'
      case 'system':
        return '跟随系统'
      default:
        return '跟随系统'
    }
  })

  return {
    // 状态（响应式）
    isDarkMode,
    themeMode,
    themeId,
    // 静态主题注册表（无需响应式包装，直接透传）
    themes: THEMES,

    // 计算属性
    themeIcon,
    themeLabel,

    // 方法
    setTheme: store.setTheme,
    setThemeMode: store.setThemeMode,
    toggleTheme: store.toggleTheme,
    initTheme: store.initTheme,
    applySiteTheme: store.applySiteTheme,
    checkSystemColorScheme: store.checkSystemColorScheme
  }
}
