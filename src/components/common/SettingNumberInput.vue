<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
      {{ label }}
    </label>
    <div class="flex items-center space-x-2">
      <input
        type="number"
        :value="modelValue"
        :min="effectiveMin"
        :max="effectiveMax"
        :step="step"
        :class="[
          'w-24 rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:border-indigo-500 outline-none',
          isDarkMode
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
            : 'border-gray-300 hover:border-gray-400 placeholder-gray-500',
          isInvalid ? 'border-red-500 focus:ring-red-500' : 'focus:ring-indigo-500'
        ]"
        @input="handleInput"
        @blur="handleBlur"
      />
      <span :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ suffix }}</span>
    </div>
    <!-- 范围提示 / 错误提示 -->
    <p v-if="isInvalid" class="text-xs text-red-500">{{ errorMessage }}</p>
    <p v-else-if="showRangeHint" class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
      {{ rangeHint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  modelValue: number
  suffix: string
  min?: number
  max?: number
  step?: number
  /** 是否显示范围提示文本 */
  showRangeHint?: boolean
  /** 0 是否被允许（用于 max_save_seconds 这类字段） */
  allowZero?: boolean
}>(), {
  min: 0,
  max: undefined,
  step: 1,
  showRangeHint: false,
  allowZero: false
})

const isDarkMode = inject('isDarkMode')

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'blur': []
}>()

const effectiveMin = computed(() => {
  // 当 allowZero=true 且 min=0 时，允许 0；否则使用 max(min, 1)
  if (props.allowZero) return props.min
  return Math.max(props.min, 1)
})

const effectiveMax = computed(() => props.max ?? Number.MAX_SAFE_INTEGER)

const isInvalid = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || Number.isNaN(props.modelValue)) {
    return true
  }
  if (!props.allowZero && props.modelValue <= 0) {
    return true
  }
  if (props.allowZero && props.modelValue < 0) {
    return true
  }
  if (props.modelValue < effectiveMin.value) {
    return true
  }
  if (props.max !== undefined && props.modelValue > props.max) {
    return true
  }
  return false
})

const errorMessage = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || Number.isNaN(props.modelValue)) {
    return '请输入有效数字'
  }
  if (!props.allowZero && props.modelValue <= 0) {
    return '必须大于 0'
  }
  if (props.allowZero && props.modelValue < 0) {
    return '不能为负数'
  }
  if (props.modelValue < effectiveMin.value) {
    return `不能小于 ${effectiveMin.value}`
  }
  if (props.max !== undefined && props.modelValue > props.max) {
    return `不能大于 ${props.max}`
  }
  return ''
})

const rangeHint = computed(() => {
  if (props.max !== undefined) {
    return props.allowZero
      ? `范围：0 ~ ${props.max}（0 表示不限制）`
      : `范围：${effectiveMin.value} ~ ${props.max}`
  }
  return props.allowZero
    ? '范围：0 或更大'
    : `范围：≥ ${effectiveMin.value}`
})

const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.value) {
    // 输入为空时，emit effectiveMin 作为默认值（防止提交 0 导致限流失效）
    emit('update:modelValue', props.allowZero ? 0 : Math.max(props.min, 1))
    return
  }

  const nextValue = input.valueAsNumber
  if (!Number.isNaN(nextValue)) {
    emit('update:modelValue', nextValue)
  }
}

const handleBlur = () => {
  // 失焦时自动校正越界值
  let corrected = props.modelValue
  if (Number.isNaN(corrected) || corrected === null || corrected === undefined) {
    corrected = effectiveMin.value
  } else if (!props.allowZero && corrected <= 0) {
    corrected = effectiveMin.value
  } else if (props.allowZero && corrected < 0) {
    corrected = 0
  } else if (corrected < effectiveMin.value) {
    corrected = effectiveMin.value
  } else if (props.max !== undefined && corrected > props.max) {
    corrected = props.max
  }
  if (corrected !== props.modelValue) {
    emit('update:modelValue', corrected)
  }
  emit('blur')
}
</script>
