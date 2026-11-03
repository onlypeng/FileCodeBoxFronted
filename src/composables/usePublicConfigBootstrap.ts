/**
 * 后台配置的准实时同步：立即拉一次，之后定时轮询，并在页面重新可见时再补一次。
 * 站点级变更（尤其默认主题）要能"管理员改完、已打开的页面也跟着变"，纯靠进入时
 * 拉一次做不到；用轮询而非 WS 是因为配置变更极低频，不值得为它常驻一条连接。
 *
 * 刻意不做：网络异常静默失败等下一轮重试，不弹错误打断用户；返回的清理函数负责
 * 同时注销定时器与 visibilitychange 监听，避免外壳卸载后仍在后台跑。
 */
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
