<template>
  <div class="flex items-baseline gap-2.5">
    <span class="text-sm shrink-0" :class="labelClass">{{ label }}</span>
    <span class="text-sm" :class="valueClass">
      <slot>{{ value }}</slot>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'

interface Props {
  label: string
  value?: string | number
  valueTone?: 'default' | 'danger'
}

const props = withDefaults(defineProps<Props>(), {
  valueTone: 'default'
})

const isDarkMode = inject('isDarkMode')

const labelClass = computed(() => isDarkMode ? 'text-gray-500' : 'text-gray-400')
const valueClass = computed(() => {
  if (props.valueTone === 'danger') return 'text-red-500 font-medium'
  return isDarkMode ? 'text-gray-300' : 'text-gray-700'
})
</script>
