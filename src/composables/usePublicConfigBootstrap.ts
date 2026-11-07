/**
 * 后台配置的准实时同步：应用挂载时拉一次、每次路由导航前拉一次、之后定时轮询，
 * 并在页面重新可见时再补一次。
 *
 * 「操作期间生效」是硬要求：管理员在后台改了设置，普通访客不重启服务、不重新
 * 登录，只要进行下一步页面操作就必须拿到新配置。只靠进入应用时拉一次做不到，
 * 只靠 30s 轮询又太慢（访客通常几秒内就完成一次操作）。因此把同步挂到
 * router.beforeEach 并在导航前 await，保证路由组件挂载时 configStore 已是最新值，
 * 连 ref() 一次性初始化的默认值也不会是陈旧快照。
 *
 * 服务端仍是最终强制点：即使访客一直停在原页面不导航，写接口也会按最新配置
 * 拒绝/放行（见 share_required_login / _enforce_chunk_config），前端提示只是体验层。
 *
 * 刻意不做：网络异常静默失败等下一轮重试，不弹错误打断用户；返回给 useAppShell
 * 的清理函数负责同时注销定时器与 visibilitychange 监听，避免外壳卸载后仍在后台跑。
 */
import { ConfigService } from '@/services'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { useThemeStore } from '@/stores/themeStore'

/** 后台配置轮询间隔：覆盖「访客停留在原页面、不进行导航」的场景 */
const REMOTE_SYNC_INTERVAL = 10_000

// 同一时刻的重复调用合并成一次请求：应用挂载时的立即同步与首屏路由守卫
// 几乎同时触发，去重可避免首屏连发两次 POST /。
let inflight: Promise<void> | null = null

/**
 * 拉取一次公共配置并合并进 configStore / themeStore。
 * 刻意写成模块级函数（不依赖组件 setup），这样 router.beforeEach 也能直接调用。
 * Pinia 在 main.ts 中先于 router 安装，守卫执行时 activePinia 已就绪。
 */
export function syncPublicConfig(): Promise<void> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await ConfigService.getUserConfig()

      if (res.code !== 200 || !res.detail) {
        return
      }

      const configStore = useConfigStore()
      const notifyMessage = configStore.applyRemoteConfig(res.detail)
      if (notifyMessage) {
        useAlertStore().showAlert(notifyMessage, 'success')
      }

      // 同步后台下发的站点默认主题（用户未显式选择时生效，实现实时切换同步）
      useThemeStore().applySiteTheme(res.detail.spaTheme)
    } catch {
      // 网络异常时静默失败，等待下一轮轮询 / 下一次导航重试
    }
  })().finally(() => {
    inflight = null
  })
  return inflight
}

export function usePublicConfigBootstrap() {
  /**
   * 启动后台配置实时同步：
   * - 立即同步一次
   * - 每次路由导航前由 router.beforeEach 调用 syncPublicConfig()（见 router/index.ts）
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
