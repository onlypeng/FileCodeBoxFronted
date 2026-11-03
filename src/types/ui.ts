/**
 * 与业务无关的纯 UI 类型：主题、告警、路由元信息。
 *
 * ## 取舍
 * 刻意不依赖任何后端返回值——这里放的是"前端自己造出来"的形状，
 * 后端字段（哪怕同样叫 theme）一律走 `config.ts`。混在一起会导致
 * 后端改字段名时误伤本地 UI 状态。
 */

export type ThemeMode = 'light' | 'dark' | 'system'

/** 分享内容的形态，决定发送页/取件页渲染哪套表单 */
export type SendType = 'file' | 'text'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface Alert {
  id: number
  message: string
  type: AlertType
  /** 0~100 的进度条百分比，由 alertStore 的定时器推进；到 100 即自动移除 */
  progress: number
  /** 存活总时长（毫秒）；0 常驻不自动消失 */
  duration: number
  /** performance.now() 时间戳而非 Date.now()：只用于计算剩余比例，不受系统改时间影响 */
  startTime: number
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

/**
 * 路由表条目。
 *
 * `component` 故意声明为"返回 Promise<{ default: object }> 的函数"而不是具体的
 * Component 类型：这是 vue-router 懒加载的签名，收窄成 Component 会让
 * `defineAsyncComponent` 的动态 import 写法对不上。
 */
export interface RouteConfig {
  path: string
  name: string
  component: () => Promise<{ default: object }>
  meta?: {
    requiresAuth?: boolean
    title?: string
  }
}
