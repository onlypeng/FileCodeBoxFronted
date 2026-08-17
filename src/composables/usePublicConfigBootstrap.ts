import { ConfigService } from '@/services'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { useThemeStore } from '@/stores/themeStore'

/** 后台配置轮询间隔：主题切换等站点级变更的实时同步周期 */
const REMOTE_SYNC_INTERVAL = 30_000

export function usePublicConfigBootstrap() {
  const alertStore = useAlertStore()
  const configStore = useConfigStore()
  const themeStore = useThemeStore()

  const syncPublicConfig = async () => {
    try {
      const res = await ConfigService.getUserConfig()

      if (res.code !== 200 || !res.detail) {
        return
      }

      const notifyMessage = configStore.applyRemoteConfig(res.detail)
      if (notifyMessage) {
        alertStore.showAlert(notifyMessage, 'success')
      }

      // 同步后台下发的站点默认主题（用户未显式选择时生效，实现实时切换同步）
      themeStore.applySiteTheme(res.detail.spaTheme)
    } catch {
      // 网络异常时静默失败，等待下一轮轮询重试
    }
  }

  /**
   * 启动后台配置实时同步：
   * - 立即同步一次
   * - 周期性轮询公共配置（含 spaTheme），后台切换主题后自动下发
   * - 页面重新可见时立即同步
   * 返回清理函数。
   */
  const startRemoteSync = () => {
    void syncPublicConfig()

    const timer = window.setInterval(() => {
      void syncPublicConfig()
    }, REMOTE_SYNC_INTERVAL)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncPublicConfig()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  return {
    syncPublicConfig,
    startRemoteSync
  }
}
