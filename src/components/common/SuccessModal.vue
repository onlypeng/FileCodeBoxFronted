<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto"
      @click.self="$emit('close')"
    >
      <div class="w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" :class="[isDarkMode ? 'bg-gray-900' : 'bg-white']">
        <!-- 头部 -->
        <div class="px-5 pt-4 pb-3 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" :class="iconBgClass">
              <CheckCircleIcon class="w-5 h-5" :class="iconTextClass" />
            </div>
            <div class="min-w-0">
              <h3 class="text-base font-semibold truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ title }}</h3>
              <p v-if="subtitle" class="text-sm truncate" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ subtitle }}</p>
            </div>
          </div>
          <button @click="$emit('close')" class="p-1.5 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400']"><XIcon class="w-5 h-5" /></button>
        </div>

        <!-- 内容 -->
        <div class="px-5 pb-4 space-y-3">
          <!-- 码卡片 -->
          <CodeCard
            v-for="(c, i) in codes"
            :key="i"
            :label="c.label"
            :code="c.code"
            :qr-value="c.qrValue"
            :hint="c.hint"
            :accent="c.accent"
            :copy-link-text="c.copyLinkText"
            :copy-link-url="c.copyLinkUrl"
          />

          <!-- wget 卡片 -->
          <div v-if="wgetCommand" class="rounded-xl p-3" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium text-sm flex items-center min-w-0" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <TerminalIcon class="w-4 h-4 mr-1.5 text-indigo-500 flex-shrink-0" />
                <span class="truncate">wget下载</span>
              </h4>
              <button @click="copyWget" class="p-1.5 rounded-full transition-colors" :class="[isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500']">
                <CopyIcon class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs font-mono break-all line-clamp-2" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">{{ wgetCommand }}</p>
          </div>

          <!-- 文件列表 -->
          <div v-if="files && files.length > 0" class="rounded-xl overflow-hidden border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
            <div
              v-for="(file, index) in files"
              :key="index"
              class="flex items-center px-3 py-2"
              :class="[
                index < files.length - 1 ? (isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-100') : '',
                isDarkMode ? 'bg-gray-800/40' : 'bg-gray-50/60'
              ]"
            >
              <FileIcon class="w-3.5 h-3.5 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
              <span class="text-sm truncate flex-1 min-w-0" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-800']">{{ file.name }}</span>
              <span class="text-xs ml-2 flex-shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ file.size }}</span>
            </div>
          </div>

          <!-- 扩展内容 -->
          <slot />
        </div>

        <!-- 底部 -->
        <div v-if="$slots.footer" class="px-5 py-4 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-100']">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCircleIcon, CopyIcon, FileIcon, TerminalIcon, XIcon } from 'lucide-vue-next'
import CodeCard from './CodeCard.vue'
import { useClipboard } from '@/composables'

export interface SuccessCodeItem {
  label: string
  code: string
  qrValue: string
  hint?: string
  accent?: 'indigo' | 'emerald' | 'amber'
  copyLinkText?: string
  copyLinkUrl?: string
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    title: string
    subtitle?: string
    accent?: 'indigo' | 'emerald' | 'amber'
    codes?: SuccessCodeItem[]
    wgetCommand?: string | null
    files?: Array<{ name: string; size: string }>
  }>(),
  {
    subtitle: '',
    accent: 'indigo',
    codes: () => [],
    wgetCommand: null,
    files: () => []
  }
)

const emit = defineEmits<{ close: [] }>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const { copy } = useClipboard()

const iconBgClass = computed(() => {
  const map: Record<string, [string, string]> = {
    indigo: [isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50', isDarkMode ? 'text-indigo-400' : 'text-indigo-600'],
    emerald: [isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', isDarkMode ? 'text-emerald-400' : 'text-emerald-600'],
    amber: [isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50', isDarkMode ? 'text-amber-400' : 'text-amber-600']
  }
  return map[props.accent][0]
})
const iconTextClass = computed(() => {
  const map: Record<string, [string, string]> = {
    indigo: [isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50', isDarkMode ? 'text-indigo-400' : 'text-indigo-600'],
    emerald: [isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', isDarkMode ? 'text-emerald-400' : 'text-emerald-600'],
    amber: [isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50', isDarkMode ? 'text-amber-400' : 'text-amber-600']
  }
  return map[props.accent][1]
})

const copyWget = async () => {
  if (!props.wgetCommand) return
  await copy(props.wgetCommand, {
    successMsg: t('retrieve.copySuccess'),
    errorMsg: t('retrieve.textMode.copyFailed')
  })
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
