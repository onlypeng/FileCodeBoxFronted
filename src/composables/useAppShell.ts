import { computed, onMounted, onUnmounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AUTH_EVENTS } from '@/services'
import { ROUTES } from '@/constants'
import { useTheme } from './useTheme'
import { usePublicConfigBootstrap } from './usePublicConfigBootstrap'
import { useRouteLoading } from './useRouteLoading'
import { useConfigStore } from '@/stores/configStore'

export function useAppShell() {
  const route = useRoute()
  const router = useRouter()
  const configStore = useConfigStore()
  const { isDarkMode, themeId, themeMode, themes, toggleTheme, setTheme, setThemeMode, initTheme } =
    useTheme()
  const { isLoading, setupRouteLoading } = useRouteLoading(router)
  const { startRemoteSync } = usePublicConfigBootstrap()
  const showGlobalControls = computed(() => route.meta.showGlobalControls !== false)

  let cleanupThemeListener: (() => void) | null = null
  let cleanupRemoteSync: (() => void) | null = null

  const handleUnauthorized = () => {
    if (router.currentRoute.value.path !== ROUTES.LOGIN) {
      void router.push({
        path: ROUTES.LOGIN,
        query: {
          redirect: router.currentRoute.value.fullPath
        }
      })
    }
  }

  onMounted(() => {
    // 初始化主题：优先用户本地选择，其次本地缓存的站点默认主题
    cleanupThemeListener = initTheme(configStore.config.spaTheme)
    setupRouteLoading()
    // 启动后台配置实时同步（含站点默认主题下发）
    cleanupRemoteSync = startRemoteSync()
    window.addEventListener(AUTH_EVENTS.UNAUTHORIZED, handleUnauthorized)
  })

  onUnmounted(() => {
    cleanupThemeListener?.()
    cleanupRemoteSync?.()
    window.removeEventListener(AUTH_EVENTS.UNAUTHORIZED, handleUnauthorized)
  })

  provide('isDarkMode', isDarkMode)
  provide('toggleTheme', toggleTheme)
  provide('themeId', themeId)
  provide('themeMode', themeMode)
  provide('themes', themes)
  provide('setTheme', setTheme)
  provide('setThemeMode', setThemeMode)
  provide('isLoading', isLoading)

  return {
    isDarkMode,
    isLoading,
    route,
    showGlobalControls
  }
}
