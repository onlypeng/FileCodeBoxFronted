/**
 * 应用外壳的进程级装配：主题、路由 loading、配置轮询、401 跳转都挂在根组件生命周期上。
 * 这些是全局唯一的监听/定时器，若放进路由组件，每次进出页面都会重复注册且难以回收。
 *
 * 主题经 provide 下发供后代 inject，避免逐层透传；401 由 client 派发 window 事件后，
 * 这里才带 redirect 跳登录（已在登录页则不动），保持匿名页面可被直接访问。
 */
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
