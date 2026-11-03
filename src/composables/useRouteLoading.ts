/**
 * 用路由守卫驱动全局 loading：beforeEach 置位、afterEach 延时 200ms 再熄灭。
 * 加延时是为了盖住"导航已完成但首屏还在渲染"的空档，也让极快的跳转不闪一下进度条。
 *
 * 边界：to.meta.showRouteLoading === false 可关掉该页 loading；守卫与定时器都在
 * onUnmounted 注销，避免外壳重建后多个 afterEach 抢着改同一个 isLoading。
 */
import { onUnmounted, ref } from 'vue'
import type { Router } from 'vue-router'

const ROUTE_LOADING_DELAY = 200

export function useRouteLoading(router: Router) {
  const isLoading = ref(false)
  let loadingTimer: number | null = null
  let cleanupBeforeGuard: (() => void) | null = null
  let cleanupAfterHook: (() => void) | null = null

  const clearLoadingTimer = () => {
    if (loadingTimer !== null) {
      window.clearTimeout(loadingTimer)
      loadingTimer = null
    }
  }

  const setupRouteLoading = () => {
    cleanupBeforeGuard = router.beforeEach((to) => {
      clearLoadingTimer()
      isLoading.value = to.meta.showRouteLoading !== false
    })

    cleanupAfterHook = router.afterEach(() => {
      clearLoadingTimer()
      loadingTimer = window.setTimeout(() => {
        isLoading.value = false
        loadingTimer = null
      }, ROUTE_LOADING_DELAY)
    })
  }

  onUnmounted(() => {
    clearLoadingTimer()
    cleanupBeforeGuard?.()
    cleanupAfterHook?.()
  })

  return {
    isLoading,
    setupRouteLoading
  }
}
