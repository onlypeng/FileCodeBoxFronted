/**
 * 把 window.confirm 换成全局 Promise 化确认：任意逻辑层 await 到布尔结果即可，
 * 弹窗实体只挂在 App.vue 一处，靠 pending 状态驱动，避免每个页面各塞一个确认框。
 *
 * 边界：同一时刻只允许一个 pending，新的 confirm 会覆盖旧的 resolve 导致旧 Promise
 * 永不 settle，调用方须串行发起；状态刻意不持久化，刷新即视为取消。
 */
import { defineStore } from 'pinia'

export interface ConfirmOptions {
  /** 弹窗标题 */
  title?: string
  /** 提示内容 */
  message: string
  /** 确认按钮文案 */
  confirmText?: string
  /** 取消按钮文案 */
  cancelText?: string
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (result: boolean) => void
}

/**
 * 确认弹窗 Store：替代 window.confirm 的全局 Promise 化确认。
 *
 * 用法（在 setup 中）：
 *   const confirmStore = useConfirmStore()
 *   if (!(await confirmStore.confirm({ message: '确定删除吗？' }))) return
 *
 * ConfirmDialog 组件挂载于 App.vue，监听 pending 渲染弹窗；
 * 用户点击后经 resolve 回调 Promise，调用方继续执行。
 */
export const useConfirmStore = defineStore('confirm', {
  state: () => ({
    pending: null as PendingConfirm | null
  }),
  actions: {
    /** 弹出确认框，返回用户是否确认 */
    confirm(options: ConfirmOptions): Promise<boolean> {
      return new Promise((resolve) => {
        this.pending = {
          title: options.title || '',
          message: options.message,
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          resolve
        }
      })
    },
    /** 用户点击按钮后调用（confirm=true / cancel=false） */
    resolve(result: boolean) {
      if (this.pending) {
        this.pending.resolve(result)
        this.pending = null
      }
    }
  }
})
