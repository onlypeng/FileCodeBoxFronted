<template>
  <transition-group
    name="alert-fade"
    tag="div"
    class="fixed top-4 left-4 z-50 w-full sm:max-w-sm md:max-w-md space-y-4 px-4 sm:px-0"
  >
    <div
      v-for="alert in alerts"
      :key="alert.id"
      :class="[
        'w-full rounded-lg shadow-xl overflow-hidden',
        'bg-gradient-to-r',
        gradientClasses[alert.type]
      ]"
    >
      <div class="p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <component :is="alertIcons[alert.type]" class="h-6 w-6 text-white" />
          </div>
          <div class="ml-3 flex-1 pt-0.5">
            <p class="text-sm font-medium text-white">{{ alert.message }}</p>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              @click="removeAlert(alert.id)"
              class="inline-flex text-white hover:text-gray-200 focus:outline-none transition-colors duration-200"
            >
              <span class="sr-only">{{ t('common.close') }}</span>
              <X class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <div class="h-1 bg-white bg-opacity-25">
        <div
          class="h-full bg-white transition-all duration-100 ease-out"
          :style="{ width: `${alert.progress}%` }"
        ></div>
      </div>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
/**
 * 全局轻提示（toast）渲染器，在 App.vue 里全局挂载一次。
 *
 * ## 这里只做渲染，计时在 store
 * 计时与进度推进放在 alertStore 而不是本组件：
 * - 提示的生命周期要跨越路由切换（App.vue 的 RouterView 重建不影响它）；
 * - 若把 setTimeout 写在组件里，组件被卸载就会丢掉定时器，提示永远停在那；
 * - 因此这里的 startProgressTimer / stopProgressTimer 只是把 store 里的计时器
 *   与自身生命周期对齐，真正的到点销毁逻辑仍在 store。
 *
 * ## 刻意不做
 * - 不做自定义 stacking / 分组：多条提示纵向堆叠即可，业务上几乎不会同时出现 3 条以上。
 * - 不在模板里判断暗色主题：toast 用固定的高对比渐变色，在明暗背景下都要可读。
 */
import { storeToRefs } from 'pinia'
import { useAlertStore } from '@/stores/alertStore'
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-vue-next'
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const alertStore = useAlertStore()
const { alerts } = storeToRefs(alertStore)
const { removeAlert, startProgressTimer, stopProgressTimer } = alertStore

const gradientClasses = {
  success: 'from-green-500 to-green-600',
  error: 'from-red-500 to-red-600',
  warning: 'from-yellow-500 to-yellow-600',
  info: 'from-blue-500 to-blue-600'
}

const alertIcons = {
  success: CheckCircle,
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info
}

onMounted(() => {
  startProgressTimer()
})

onUnmounted(() => {
  stopProgressTimer()
})
</script>

<style scoped>
.alert-fade-enter-active,
.alert-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
.alert-fade-enter-from,
.alert-fade-leave-to {
  opacity: 0;
  transform: translateX(-50px) scale(0.95);
}
</style>
