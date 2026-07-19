<template>
  <div class="min-w-0 flex-1">
    <p class="text-sm mb-1.5" :class="labelClass">{{ label }}</p>
    <div class="flex items-center gap-2 mb-4">
      <p class="text-2xl font-mono font-bold tracking-widest" :class="codeClass">{{ code }}</p>
      <button
        @click="$emit('copy')"
        class="p-1 rounded transition-colors"
        :class="copyBtnClass"
      >
        <CopyIcon class="w-4 h-4" />
      </button>
    </div>
    <button
      v-if="showCopyLink"
      @click="$emit('copy-link')"
      class="flex items-center gap-1 text-xs mb-3 transition-colors"
      :class="linkBtnClass"
    >
      <LinkIcon class="w-3.5 h-3.5" />{{ linkText }}
    </button>
    <div class="space-y-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { CopyIcon, LinkIcon } from 'lucide-vue-next'

interface Props {
  code: string
  label: string
  tone?: 'indigo' | 'emerald' | 'amber'
  showCopyLink?: boolean
  linkText?: string
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'indigo',
  showCopyLink: false,
  linkText: ''
})

defineEmits<{
  copy: []
  'copy-link': []
}>()

const isDarkMode = inject('isDarkMode')

const toneStyles = {
  indigo: { dark: 'text-indigo-400', light: 'text-indigo-600' },
  emerald: { dark: 'text-emerald-400', light: 'text-emerald-600' },
  amber: { dark: 'text-amber-400', light: 'text-amber-600' }
}

const codeClass = computed(() => {
  const s = toneStyles[props.tone]
  return isDarkMode ? s.dark : s.light
})

const labelClass = computed(() => isDarkMode ? 'text-gray-500' : 'text-gray-400')

const copyBtnClass = computed(() => {
  const s = toneStyles[props.tone]
  return isDarkMode
    ? `text-gray-500 hover:${s.dark}`
    : `text-gray-400 hover:${s.light}`
})

const linkBtnClass = computed(() => {
  const s = toneStyles[props.tone]
  return isDarkMode
    ? `${s.dark}/70 hover:${s.dark}`
    : `${s.light}/80 hover:${s.light}`
})
</script>
