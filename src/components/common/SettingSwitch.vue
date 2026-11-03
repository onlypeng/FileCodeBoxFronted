<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
      {{ label }}
    </label>
    <div class="flex items-center">
      <button
        type="button"
        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        :class="[modelValue === 1 ? 'bg-indigo-600' : 'bg-gray-200']"
        role="switch"
        :aria-checked="modelValue === 1"
        @click="$emit('toggle')"
      >
        <span
          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          :class="[
            modelValue === 1 ? 'translate-x-5' : 'translate-x-0',
            isDarkMode && modelValue !== 1 ? 'bg-gray-100' : 'bg-white'
          ]"
        />
      </button>
      <span class="ml-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
        {{ modelValue === 1 ? enabledText : disabledText }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 系统设置里的二值开关。
 *
 * ## 为什么 modelValue 是 1/0 而不是 boolean
 * 后端配置项把布尔开关存成整数（0/1），这里沿用它，避免每次读写都要在组件边界做一次
 * boolean ↔ number 转换——转换做（也不能漏）在所有 v-model 绑定点会更容易出错。
 * 代价是判等必须写 `=== 1`，改动时不要"顺手改成真值判断"。
 *
 * ## 为什么 emit 的是 toggle 而不是 update:modelValue
 * 切换要连带触发一次"保存/应用"流程（useSystemConfig 暴露语义动作），
 * 让父组件拿到的是"用户点了一下"这个意图，而不是一个新值。
 *
 * ## 刻意不做
 * 不用原生 checkbox：要保留自定义外观 + 文案随状态切换，原生控件的样式覆盖成本更高。
 */
import { inject } from 'vue'

defineProps<{
  label: string
  modelValue: number
  enabledText: string
  disabledText: string
}>()

defineEmits<{
  toggle: []
}>()

const isDarkMode = inject('isDarkMode')
</script>
