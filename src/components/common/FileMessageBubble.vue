<template>
  <div class="flex" :class="item.isSelf ? 'justify-end' : 'justify-start'">
    <div class="max-w-[75%] min-w-0">
      <!-- 发送者昵称 -->
      <p v-if="!item.isSelf" class="text-xs mb-1 px-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
        {{ item.sender }}
      </p>

      <!-- 文件卡片 -->
      <div
        class="relative rounded-2xl p-3 shadow-sm w-64 max-w-full"
        :class="cardClass"
      >
        <div class="flex items-center gap-2.5">
          <!-- 文件图标 -->
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            :class="iconBgClass"
          >
            <FileIcon class="w-5 h-5" :class="iconClass" />
          </div>
          <!-- 文件名 + 大小 -->
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate" :class="[item.isSelf ? 'text-white' : isDarkMode ? 'text-gray-100' : 'text-gray-900']">
              {{ item.fileName }}
            </p>
            <p class="text-[11px] mt-0.5 flex items-center gap-1" :class="[item.isSelf ? 'text-white/70' : isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              <span class="truncate">{{ formatSize(item.fileSize || 0) }}</span>
              <span
                v-if="item.mode"
                class="px-1 py-px rounded text-[9px] shrink-0"
                :class="modeBadgeClass"
              >
                {{ item.mode === 'p2p' ? t('direct.room.modeP2P') : t('direct.room.modeRelay') }}
              </span>
            </p>
          </div>
          <!-- 状态图标 -->
          <div v-if="item.fileStatus === 'transferring' && item.isSelf" class="shrink-0">
            <XIcon
              class="w-4 h-4 cursor-pointer transition-colors"
              :class="[isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900']"
              @click="$emit('cancel', item.transferId!)"
            />
          </div>
        </div>

        <!-- 进度条（传输中） -->
        <div v-if="item.fileStatus === 'transferring'" class="mt-2">
          <div class="w-full h-1.5 rounded-full overflow-hidden" :class="[isDarkMode ? 'bg-gray-700' : 'bg-gray-200']">
            <div
              class="h-full rounded-full transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-500"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
          <p class="text-[10px] mt-1 flex justify-between gap-2" :class="[item.isSelf ? 'text-white/70' : isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            <span>{{ progressPercent }}%</span>
            <span class="flex items-center gap-1 min-w-0">
              <span v-if="item.speed" class="truncate">{{ formatSpeed(item.speed) }}</span>
              <span v-if="item.speed && item.eta != null">· {{ item.eta }}s</span>
              <span v-if="sendingHint" class="truncate">{{ sendingHint }}</span>
            </span>
          </p>
        </div>

        <!-- 状态行 -->
        <div v-if="item.fileStatus !== 'transferring'" class="mt-2 flex items-center justify-between">
          <p class="text-[11px]" :class="statusTextClass">{{ statusText }}</p>
          <!-- 操作按钮 -->
          <div v-if="isIncomingOffer" class="flex gap-2 shrink-0">
            <button
              @click="$emit('accept', item.transferId!)"
              class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
              :class="[isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600']"
            >
              {{ t('direct.file.accept') }}
            </button>
            <button
              @click="$emit('decline', item.transferId!)"
              class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
              :class="[isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300']"
            >
              {{ t('direct.file.decline') }}
            </button>
          </div>
          <button
            v-else-if="isIncomingDone"
            @click="$emit('save', item.transferId!)"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0"
            :class="[isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600']"
          >
            {{ t('direct.file.save') }}
          </button>
          <button
            v-else-if="isOutgoingAwaiting || isOutgoingTransferring"
            @click="$emit('cancel', item.transferId!)"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0"
            :class="[isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300']"
          >
            {{ t('direct.file.cancel') }}
          </button>
        </div>
      </div>

      <!-- 时间 -->
      <p class="text-[10px] mt-1 px-1" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">
        {{ formatTime(item.ts) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileIcon, XIcon } from 'lucide-vue-next'
import { useInjectedDarkMode } from '@/composables'
import { formatFileSize as formatSize } from '@/utils/common'
import type { DirectChatItem } from '@/types/direct'

const props = defineProps<{ item: DirectChatItem }>()

defineEmits<{
  accept: [transferId: string]
  decline: [transferId: string]
  cancel: [transferId: string]
  save: [transferId: string]
}>()

const isDarkMode = useInjectedDarkMode()
const { t } = useI18n()

const isOutgoing = computed(() => props.item.fileDirection === 'outgoing')
const isIncoming = computed(() => props.item.fileDirection === 'incoming')
const isIncomingOffer = computed(() => isIncoming.value && props.item.fileStatus === 'awaiting_confirm')
const isIncomingDone = computed(() => isIncoming.value && props.item.fileStatus === 'done')
const isOutgoingAwaiting = computed(() => isOutgoing.value && props.item.fileStatus === 'awaiting_confirm')
const isOutgoingTransferring = computed(() => isOutgoing.value && props.item.fileStatus === 'transferring')

const progressPercent = computed(() => {
  if (!props.item.fileSize) return 0
  return Math.min(100, Math.round(((props.item.transferred || 0) / props.item.fileSize) * 100))
})

const cardClass = computed(() => {
  if (isOutgoing.value) {
    return props.item.fileStatus === 'failed' || props.item.fileStatus === 'declined' || props.item.fileStatus === 'canceled'
      ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-br-md'
      : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md'
  }
  if (props.item.fileStatus === 'done') {
    return isDarkMode.value ? 'bg-gray-800 border border-emerald-800/50 text-gray-100 rounded-bl-md' : 'bg-white border border-emerald-200 text-gray-900 rounded-bl-md'
  }
  return isDarkMode.value
    ? 'bg-gray-800 border border-gray-700 text-gray-100 rounded-bl-md'
    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
})

const iconBgClass = computed(() =>
  isOutgoing.value
    ? 'bg-white/20'
    : isDarkMode.value ? 'bg-indigo-900/30' : 'bg-indigo-50'
)

const iconClass = computed(() => {
  if (isOutgoing.value) return 'text-white'
  return isDarkMode.value ? 'text-indigo-400' : 'text-indigo-500'
})

const modeBadgeClass = computed(() => {
  if (isOutgoing.value) {
    return props.item.mode === 'p2p'
      ? 'bg-white/20 text-white'
      : 'bg-white/10 text-white/80'
  }
  if (props.item.mode === 'p2p') {
    return isDarkMode.value ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
  }
  return isDarkMode.value ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'
})

/** 接收者摘要（发送侧） */
const recipientSummary = computed(() => {
  const recs = props.item.recipients || []
  if (recs.length === 0) return ''
  const accepted = recs.filter((r) => r.status === 'confirmed' || r.status === 'done' || r.status === 'transferring').map((r) => r.nickname)
  const declined = recs.filter((r) => r.status === 'declined').map((r) => r.nickname)
  const parts: string[] = []
  if (accepted.length) parts.push(`${t('direct.file.acceptedBy')} ${accepted.join('、')}`)
  if (declined.length) parts.push(`${t('direct.file.declinedBy')} ${declined.join('、')}`)
  return parts.join('  ')
})

const sendingHint = computed(() => {
  const active = (props.item.recipients || []).find((r) => r.status === 'transferring')
  return active ? `${t('direct.file.sendingTo')} ${active.nickname}` : ''
})

const statusText = computed(() => {
  // 完整性校验失败优先展示
  if (props.item.hashStatus === 'mismatch') {
    return t('direct.file.hashMismatch')
  }
  const s = props.item.fileStatus
  if (isOutgoing.value) {
    switch (s) {
      case 'awaiting_confirm': {
        const summary = recipientSummary.value
        return summary ? summary : t('direct.file.waitingConfirm')
      }
      case 'done': return t('direct.file.sent')
      case 'declined': return t('direct.file.declined')
      case 'canceled': return t('direct.file.canceled')
      case 'failed': return t('direct.file.failed')
      default: return ''
    }
  }
  switch (s) {
    case 'awaiting_confirm': return t('direct.file.offerHint')
    case 'done': return t('direct.file.received')
    case 'declined': return t('direct.file.declined')
    case 'canceled': return t('direct.file.canceled')
    case 'failed': return t('direct.file.failed')
    default: return ''
  }
})

const statusTextClass = computed(() => {
  if (isOutgoing.value && (props.item.fileStatus === 'awaiting_confirm' || props.item.fileStatus === 'done')) {
    return 'text-white/70'
  }
  if (props.item.fileStatus === 'declined' || props.item.fileStatus === 'canceled') {
    return isDarkMode.value ? 'text-gray-400' : 'text-gray-400'
  }
  if (props.item.fileStatus === 'failed') return 'text-red-400'
  return isDarkMode.value ? 'text-gray-400' : 'text-gray-500'
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 速率格式化 */
function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return ''
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`
  return `${Math.round(bytesPerSec)} B/s`
}
</script>
