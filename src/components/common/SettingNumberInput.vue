<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
      {{ label }}
    </label>
    <div class="flex items-center space-x-2">
      <input
        type="number"
        :value="modelValue"
        :min="min"
        :max="max"
        class="w-24 rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        :class="[
          isDarkMode
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
            : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
        ]"
        @input="handleInput"
      />
      <span :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ suffix }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 系统设置里的数字输入框：值 + 单位后缀，自动钳到 min/max。
 *
 * ## 为什么钳是在 handleInput 里而不是只靠原生属性
 * min/max 只对步进器与表单校验生效，用户手输或粘贴超范围值时浏览器仍然接受。
 * 这里读 input.min/max 再回夹一次，保证 emit 出去的值一定落在区间内。
 *
 * ## 边界条件
 * - 清空输入框会 emit 0 而不是 NaN：配置项的 0 通常表示"关闭/不限"，
 *   而 NaN 一旦写进 payload 会让后端收到 null，语义完全不同。
 * - valueAsNumber 在某些输入法组合过程中会给出 NaN，此时直接 return，
 *   不 emit——否则用户还没输完就被强行改写成 0。
 */
import { inject } from 'vue'

defineProps<{
  label: string
  modelValue: number
  suffix: string
  /** 可选数值范围（默认不限制） */
  min?: number
  max?: number
}>()

const isDarkMode = inject('isDarkMode')

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.value) {
    emit('update:modelValue', 0)
    return
  }

  let nextValue = input.valueAsNumber
  if (Number.isNaN(nextValue)) return
  const props = input.min !== '' ? Number(input.min) : undefined
  const max = input.max !== '' ? Number(input.max) : undefined
  if (props !== undefined && nextValue < props) nextValue = props
  if (max !== undefined && nextValue > max) nextValue = max
  emit('update:modelValue', nextValue)
}
</script>
