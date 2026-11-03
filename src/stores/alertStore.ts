/**
 * 全局轻提示队列。用 Pinia 而非各组件自持 alert 列表，是为了任意层级（service /
 * composable）都能直接 showAlert，不必逐层 emit 出来。
 *
 * 刻意不做：提示状态不持久化（刷新即清，本就不该跨会话残留）；进度条定时器是
 * 模块级单例且带 start/stop 配对，避免多个组件各起一个 interval 重复推进同一批提示。
 */
import { defineStore } from 'pinia'
import type { Alert, AlertType } from '@/types'
import { TIME_CONSTANTS } from '@/constants'

let progressTimer: ReturnType<typeof setInterval> | null = null

export const useAlertStore = defineStore('alert', {
  state: () => ({
    alerts: [] as Alert[]
  }),
  actions: {
    showAlert(
      message: string,
      type: AlertType = 'info',
      duration = TIME_CONSTANTS.ALERT_DURATION
    ) {
      const id = Date.now()
      const startTime = Date.now()
      this.alerts.push({ id, message, type, progress: 100, duration, startTime })
      setTimeout(() => this.removeAlert(id), duration)
    },
    removeAlert(id: number) {
      const index = this.alerts.findIndex((alert) => alert.id === id)
      if (index > -1) {
        this.alerts.splice(index, 1)
      }
    },
    updateAlertProgress(id: number) {
      const alert = this.alerts.find((a) => a.id === id)
      if (alert) {
        const elapsedTime = Date.now() - alert.startTime
        const progress = 100 - (elapsedTime / alert.duration) * 100
        alert.progress = Math.max(0, progress)
        if (alert.progress <= 0) {
          this.removeAlert(id)
        }
      }
    },
    startProgressTimer() {
      if (progressTimer) {
        return
      }

      progressTimer = setInterval(() => {
        this.alerts.forEach((alert) => {
          this.updateAlertProgress(alert.id)
        })
      }, TIME_CONSTANTS.PROGRESS_UPDATE_INTERVAL)
    },
    stopProgressTimer() {
      if (!progressTimer) {
        return
      }

      clearInterval(progressTimer)
      progressTimer = null
    }
  }
})
