<template>
  <!-- ========== 发送方（我发出的）：完整卡片，含进度、状态与取消 ========== -->
  <div v-if="isOutgoing" class="flex justify-end">
    <div class="max-w-[75%] min-w-0">
      <div
        class="relative rounded-2xl p-3 shadow-sm w-64 max-w-full"
        :class="cardClass"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            :class="iconBgClass"
          >
            <FileIcon class="w-5 h-5" :class="iconClass" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate text-white">
              {{ item.fileName }}
            </p>
            <p class="text-[11px] mt-0.5 flex items-center gap-1 text-white/70">
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
          <div v-if="item.fileStatus === 'transferring'" class="shrink-0">
            <XIcon
              class="w-4 h-4 cursor-pointer transition-colors"
              :class="[isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900']"
              @click="$emit('cancel', item.transferId!)"
            />
          </div>
        </div>

        <!-- 传给别人（P2P / 中转）的进度条 -->
        <div v-if="item.fileStatus === 'transferring'" class="mt-2">
          <div class="w-full h-1.5 rounded-full overflow-hidden" :class="[isDarkMode ? 'bg-gray-700' : 'bg-gray-200']">
            <div
              class="h-full rounded-full transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-500"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
          <p class="text-[10px] mt-1 flex justify-between gap-2 text-white/70">
            <span>{{ progressPercent }}%</span>
            <span class="flex items-center gap-1 min-w-0">
              <span v-if="item.speed" class="truncate">{{ formatSpeed(item.speed) }}</span>
              <span v-if="item.speed && item.eta != null">· {{ item.eta }}s</span>
              <span v-if="sendingHint" class="truncate">{{ sendingHint }}</span>
            </span>
          </p>
        </div>

        <!-- 缓存到服务器：上传中显示进度条，完成后变成"已缓存"标记 -->
        <div v-if="item.cacheStatus" class="mt-2">
          <div v-if="item.cacheStatus === 'uploading'" class="flex items-center gap-2">
            <div class="flex-1 h-1 rounded-full overflow-hidden bg-white/25">
              <div
                class="h-full rounded-full bg-white/85 transition-all duration-200"
                :style="{ width: `${item.cacheProgress || 0}%` }"
              ></div>
            </div>
            <span class="text-[10px] text-white/75 shrink-0 tabular-nums">
              {{ t('direct.cache.caching') }} {{ item.cacheProgress || 0 }}%
            </span>
          </div>
          <p v-else class="text-[10px] flex items-center gap-1 text-white/85">
            <CloudCheckIcon class="w-3 h-3" />
            {{ t('direct.cache.cached') }}
          </p>
        </div>

        <!-- 状态行 + 操作 -->
        <div v-if="item.fileStatus !== 'transferring'" class="mt-2 flex items-center justify-between">
          <p class="text-[11px] min-w-0 truncate" :class="statusTextClass">{{ statusText }}</p>
          <button
            v-if="isOutgoingAwaiting"
            @click="$emit('cancel', item.transferId!)"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 ml-2"
            :class="[isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300']"
          >
            {{ t('direct.file.cancel') }}
          </button>
        </div>
      </div>

      <p class="text-[10px] mt-1 px-1 text-right" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">
        {{ formatTime(item.ts) }}
      </p>
    </div>
  </div>

  <!-- ========== 我已接收完成：一行文字，不再占大卡片 ========== -->
  <div v-else-if="isReceivedDone" class="flex justify-start my-0.5">
    <span
      class="text-[11px] px-2.5 py-1 rounded-lg truncate max-w-[80%]"
      :class="[isDarkMode ? 'bg-gray-800/70 text-gray-400' : 'bg-gray-100 text-gray-500']"
    >
      {{ t('direct.file.receivedDone', { name: item.fileName }) }}
    </span>
  </div>

  <!-- ========== 别人发来的文件（待接收）：完整卡片 + 接受/拒绝 ========== -->
  <div v-else-if="isIncomingOffer" class="flex justify-start my-1">
    <div
      class="max-w-[75%] min-w-0 rounded-2xl px-3 py-2.5 border shadow-sm"
      :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']"
    >
      <div class="flex items-center gap-2.5">
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          :class="[isDarkMode ? 'bg-indigo-900/40' : 'bg-indigo-50']"
        >
          <FileIcon class="w-4 h-4" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
        </div>
        <div class="min-w-0 flex-1">
          <p
            class="text-xs font-medium truncate"
            :class="[isDarkMode ? 'text-gray-100' : 'text-gray-900']"
          >{{ item.fileName }}</p>
          <p class="text-[11px] truncate" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ formatSize(item.fileSize || 0) }}
            <span v-if="item.sender"> · {{ item.sender }}</span>
          </p>
        </div>
      </div>

      <!-- 服务器已缓存 → 直接下载（下载后同时留存为供源，供其他成员加速），无需等待对方在线 -->
      <div v-if="item.serverCached" class="mt-2 flex items-center gap-2">
        <button
          @click="$emit('download', item.transferId!)"
          class="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >{{ t('direct.cache.download') }}</button>
        <button
          @click="$emit('cancel', item.transferId!)"
          class="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"
        >{{ t('direct.file.decline') }}</button>
      </div>
      <div v-else class="flex items-center gap-2 mt-2">
        <button
          @click="$emit('accept', item.transferId!)"
          class="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >{{ t('direct.file.accept') }}</button>
        <button
          @click="$emit('decline', item.transferId!)"
          class="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          :class="[isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
        >{{ t('direct.file.decline') }}</button>
      </div>
    </div>
  </div>

  <!-- ========== 其余（与自己无关 / 已拒绝等）：紧凑一行 ========== -->
  <div v-else class="flex justify-start my-0.5">
    <div
      class="max-w-[80%] min-w-0 flex items-center gap-2 rounded-xl px-2.5 py-1.5 border"
      :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']"
    >
      <FileIcon
        class="w-3.5 h-3.5 shrink-0"
        :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']"
      />
      <span v-if="item.sender" class="text-[10px] shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
        {{ item.sender }}
      </span>
      <span class="text-xs truncate min-w-0" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-800']">
        {{ item.fileName }}
      </span>
      <span class="text-[10px] shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
        {{ formatSize(item.fileSize || 0) }}
      </span>
      <span class="text-[10px] shrink-0" :class="statusTextClass">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileIcon, XIcon, CloudCheckIcon } from 'lucide-vue-next'
import { useInjectedDarkMode } from '@/composables'
import { formatFileSize as formatSize } from '@/utils/common'
import type { DirectChatItem } from '@/types/direct'

const props = defineProps<{ item: DirectChatItem }>()

defineEmits<{
  accept: [transferId: string]
  decline: [transferId: string]
  cancel: [transferId: string]
  save: [transferId: string]
  /** 点击下载：由父组件完成"下载 + 留存为供源"（而非直接 window.open） */
  download: [transferId: string]
}>()

const isDarkMode = useInjectedDarkMode()
const { t } = useI18n()

const isOutgoing = computed(() => props.item.fileDirection === 'outgoing')
const isIncoming = computed(() => props.item.fileDirection === 'incoming')
const isIncomingOffer = computed(() => isIncoming.value && props.item.fileStatus === 'awaiting_confirm')
/** 我已接收完成：聊天流里只保留一行文字，避免历史文件堆满大卡片 */
const isReceivedDone = computed(() => isIncoming.value && props.item.fileStatus === 'done')
const isOutgoingAwaiting = computed(() => isOutgoing.value && props.item.fileStatus === 'awaiting_confirm')

const progressPercent = computed(() => {
  if (!props.item.fileSize) return 0
  return Math.min(100, Math.round(((props.item.transferred || 0) / props.item.fileSize) * 100))
})

const cardClass = computed(() => {
  if (props.item.fileStatus === 'failed' || props.item.fileStatus === 'declined' || props.item.fileStatus === 'canceled') {
    return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-br-md'
  }
  return 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md'
})

const iconBgClass = computed(() => 'bg-white/20')

const iconClass = computed(() => 'text-white')

const modeBadgeClass = computed(() =>
  props.item.mode === 'p2p' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'
)

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
  if (props.item.hashStatus === 'mismatch') {
    return t('direct.file.hashMismatch')
  }
  const s = props.item.fileStatus
  if (isOutgoing.value) {
    switch (s) {
      case 'awaiting_confirm': {
        // 有接收者反馈就显示摘要；否则文件已发出（且多半已缓存到服务器）→ 显示"已发送"
        const summary = recipientSummary.value
        if (summary) return summary
        return t('direct.file.sentWaiting')
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
  if (isOutgoing.value) return 'text-white/70'
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
