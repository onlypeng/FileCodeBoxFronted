<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto"
      @click.self="$emit('close')"
    >
      <div class="w-full rounded-2xl shadow-xl overflow-hidden" :class="[containerClass]">
        <!-- 头部 -->
        <div v-if="$slots.header || title" class="px-5 pt-4 pb-3 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <div v-if="icon" class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" :class="iconBgClass">
              <component :is="icon" class="w-5 h-5" :class="iconTextClass" />
            </div>
            <div class="min-w-0">
              <h3 class="text-base font-semibold truncate" :class="titleClass">{{ title }}</h3>
              <p v-if="subtitle" class="text-sm mt-0.5 truncate" :class="subtitleClass">{{ subtitle }}</p>
            </div>
          </div>
          <button
            v-if="closable"
            @click="$emit('close')"
            class="p-1.5 rounded-lg transition-colors flex-shrink-0"
            :class="closeBtnClass"
          >
            <XIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- 默认插槽：内容区 -->
        <slot />

        <!-- 底部插槽 -->
        <div v-if="$slots.footer" class="px-5 pb-5 flex gap-3">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, inject, type Component } from 'vue'
import { XIcon } from 'lucide-vue-next'

interface Props {
  visible: boolean
  title?: string
  subtitle?: string
  icon?: Component | null
  iconTone?: 'indigo' | 'emerald' | 'amber' | 'pink'
  size?: 'md' | 'lg'
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: null,
  iconTone: 'indigo',
  size: 'md',
  closable: true
})

defineEmits<{ close: [] }>()

const isDarkMode = inject('isDarkMode')

const containerClass = computed(() => [
  props.size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
  isDarkMode ? 'bg-gray-900' : 'bg-white'
])

const titleClass = computed(() => isDarkMode ? 'text-white' : 'text-gray-900')
const subtitleClass = computed(() => isDarkMode ? 'text-gray-500' : 'text-gray-400')
const closeBtnClass = computed(() =>
  isDarkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400'
)

const toneStyles: Record<NonNullable<Props['iconTone']>, { bgDark: string; bgLight: string; textDark: string; textLight: string }> = {
  indigo: { bgDark: 'bg-indigo-900/30', bgLight: 'bg-indigo-50', textDark: 'text-indigo-400', textLight: 'text-indigo-600' },
  emerald: { bgDark: 'bg-emerald-900/30', bgLight: 'bg-emerald-50', textDark: 'text-emerald-400', textLight: 'text-emerald-600' },
  amber: { bgDark: 'bg-amber-900/30', bgLight: 'bg-amber-50', textDark: 'text-amber-400', textLight: 'text-amber-600' },
  pink: { bgDark: 'bg-pink-900/30', bgLight: 'bg-pink-50', textDark: 'text-pink-400', textLight: 'text-pink-600' }
}

const iconBgClass = computed(() => {
  const s = toneStyles[props.iconTone]
  return isDarkMode ? s.bgDark : s.bgLight
})

const iconTextClass = computed(() => {
  const s = toneStyles[props.iconTone]
  return isDarkMode ? s.textDark : s.textLight
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
