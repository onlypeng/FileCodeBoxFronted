<template>
  <div class="rounded-xl p-4" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
    <div class="flex gap-5">
      <div class="min-w-0 flex-1">
        <p class="text-sm mb-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ label }}</p>
        <div class="flex items-center gap-2 mb-2">
          <p
            @click="copyCode"
            class="text-2xl font-mono font-bold tracking-widest cursor-pointer select-none transition-opacity hover:opacity-70"
            :class="colorClass"
          >
            {{ code }}
          </p>
          <button
            @click="copyCode"
            class="p-1 rounded transition-colors"
            :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400' : 'text-gray-400 hover:text-indigo-600']"
            :title="t('retrieve.copyCode')"
            :aria-label="t('retrieve.copyCode')"
          >
            <CopyIcon class="w-4 h-4" />
          </button>
        </div>
        <button
          v-if="copyLinkText"
          @click="copyLink"
          class="flex items-center gap-1 text-xs mb-2 transition-colors"
          :class="[isDarkMode ? 'text-indigo-400/70 hover:text-indigo-300' : 'text-indigo-500/80 hover:text-indigo-600']"
        >
          <LinkIcon class="w-3.5 h-3.5" />
          {{ copyLinkText }}
        </button>
        <div v-if="$slots.extra"><slot name="extra" /></div>
      </div>
      <div class="self-start flex flex-col items-center flex-shrink-0">
        <div v-if="qrValue" class="bg-white p-1.5 rounded-lg shadow-sm border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
          <QRCode :value="qrValue" :size="80" level="M" />
        </div>
        <p v-if="hint && qrValue" class="text-xs mt-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ hint }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode.vue'
import { CopyIcon, LinkIcon } from 'lucide-vue-next'
import { useClipboard } from '@/composables'

type Accent = 'indigo' | 'emerald' | 'amber'

const props = defineProps<{
  label: string
  code: string
  qrValue: string
  hint?: string
  accent?: Accent
  /** 提供时显示"复制XX链接"入口 */
  copyLinkText?: string
  copyLinkUrl?: string
}>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const { copy } = useClipboard()

const colorClass = computed(() => {
  const map: Record<Accent, [string, string]> = {
    indigo: [isDarkMode ? 'text-indigo-400' : 'text-indigo-600', ''],
    emerald: [isDarkMode ? 'text-emerald-400' : 'text-emerald-600', ''],
    amber: [isDarkMode ? 'text-amber-400' : 'text-amber-600', '']
  }
  return map[props.accent || 'indigo'][0]
})

const copyCode = async () => {
  await copy(props.code, {
    successMsg: t('retrieve.copySuccess'),
    errorMsg: t('retrieve.textMode.copyFailed')
  })
}

const copyLink = async () => {
  const url = props.copyLinkUrl || props.qrValue
  await copy(url, {
    successMsg: t('retrieve.copySuccess'),
    errorMsg: t('retrieve.textMode.copyFailed')
  })
}
</script>
