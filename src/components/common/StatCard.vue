<template>
  <div class="p-6 rounded-lg shadow-md transition-colors duration-300"
    :class="[isDarkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white']">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']">
          {{ title }}
        </p>
        <h3 class="text-2xl font-bold mt-1" :class="[isDarkMode ? 'text-white' : 'text-gray-800']">
          {{ value }}
        </h3>
      </div>
      <div class="p-3 rounded-full" :class="iconBgClass">
        <component :is="icon" class="w-6 h-6" :class="iconClass" />
      </div>
    </div>
    <p class="text-sm mt-2" :class="descriptionClass">
      <slot name="description"></slot>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { useInjectedDarkMode } from '@/composables'

type IconColor = 'indigo' | 'purple' | 'green' | 'blue' | 'pink' | 'orange' | 'teal' | 'cyan'

interface Props {
  title: string
  value: string | number
  icon: Component
  iconColor: IconColor
  descriptionType?: 'success' | 'error' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  descriptionType: 'neutral'
})

const isDarkMode = useInjectedDarkMode()

const iconBgClass = computed(() => {
  const colorMap: Record<IconColor, string> = {
    indigo: isDarkMode.value ? 'bg-indigo-900' : 'bg-indigo-100',
    purple: isDarkMode.value ? 'bg-purple-900' : 'bg-purple-100',
    green: isDarkMode.value ? 'bg-green-900' : 'bg-green-100',
    blue: isDarkMode.value ? 'bg-blue-900' : 'bg-blue-100',
    pink: isDarkMode.value ? 'bg-pink-900' : 'bg-pink-100',
    orange: isDarkMode.value ? 'bg-orange-900' : 'bg-orange-100',
    teal: isDarkMode.value ? 'bg-teal-900' : 'bg-teal-100',
    cyan: isDarkMode.value ? 'bg-cyan-900' : 'bg-cyan-100',
  }
  return colorMap[props.iconColor]
})

const iconClass = computed(() => {
  const colorMap: Record<IconColor, string> = {
    indigo: isDarkMode.value ? 'text-indigo-400' : 'text-indigo-600',
    purple: isDarkMode.value ? 'text-purple-400' : 'text-purple-600',
    green: isDarkMode.value ? 'text-green-400' : 'text-green-600',
    blue: isDarkMode.value ? 'text-blue-400' : 'text-blue-600',
    pink: isDarkMode.value ? 'text-pink-400' : 'text-pink-600',
    orange: isDarkMode.value ? 'text-orange-400' : 'text-orange-600',
    teal: isDarkMode.value ? 'text-teal-400' : 'text-teal-600',
    cyan: isDarkMode.value ? 'text-cyan-400' : 'text-cyan-600',
  }
  return colorMap[props.iconColor]
})

const descriptionClass = computed(() => {
  const typeMap = {
    success: isDarkMode.value ? 'text-green-400' : 'text-green-600',
    error: isDarkMode.value ? 'text-red-400' : 'text-red-600',
    neutral: isDarkMode.value ? 'text-gray-400' : 'text-gray-600'
  }
  return typeMap[props.descriptionType]
})
</script>
