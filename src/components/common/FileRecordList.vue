<template>
  <div class="flex-grow overflow-y-auto p-6">
    <transition-group name="list" tag="div" class="space-y-2">
      <div
        v-for="record in records"
        :key="record.id"
        class="rounded-lg p-3 transition duration-200"
        :class="[isExpired(record) ? 'opacity-50' : '', isDarkMode ? 'bg-gray-800/60 hover:bg-gray-700/80' : 'bg-gray-50 hover:bg-gray-100']"
      >
        <div class="flex items-center">
          <div class="flex-shrink-0 mr-3">
            <component :is="recordIcon(record).icon" class="w-5 h-5" :class="[isExpired(record) ? (_isDark() ? 'text-gray-600' : 'text-gray-400') : recordIcon(record).color]" />
          </div>
          <div class="flex-grow min-w-0 mr-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                :class="[recordBadge(record).class]"
              >{{ recordBadge(record).text }}</span>
              <span
                v-if="isExpired(record)"
                class="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                :class="[_isDark() ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-600']"
              >{{ t('records.badge.expired') || '已过期' }}</span>
              <p
                class="text-sm truncate"
                :class="[isExpired(record) ? (_isDark() ? 'text-gray-500' : 'text-gray-400') : (_isDark() ? 'text-gray-200' : 'text-gray-800')]"
              >
                {{ record.filename }}
              </p>
            </div>
            <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ record.date }}<span class="mx-1">·</span>{{ record.size }}
              <template v-if="fileCountText(record) > 0"><span class="mx-1">·</span>{{ fileCountText(record) }} {{ t('records.multiFile') }}</template>
            </p>
          </div>
          <div class="flex-shrink-0 flex items-center gap-1">
            <button
              type="button"
              :aria-label="t('records.viewDetails') || '查看详情'"
              @click="$emit('view-details', record)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600']"
            >
              <EyeIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              :aria-label="t('records.download') || '下载'"
              @click="!isExpired(record) && $emit('download-record', record)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isExpired(record) ? 'cursor-not-allowed opacity-30' : (isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600')]"
            >
              <DownloadIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              :aria-label="t('records.delete') || '删除'"
              @click="$emit('delete-record', record.id)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-400 hover:text-red-500']"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </transition-group>

    <!-- 空状态 -->
    <div v-if="records.length === 0" class="text-center py-12">
      <FileIcon class="w-10 h-10 mx-auto mb-2" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-300']" />
      <p class="text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('records.empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, unref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  FileIcon,
  EyeIcon,
  DownloadIcon,
  TrashIcon
} from 'lucide-vue-next'
import type { ReceivedFileRecord } from '@/types'
import { isRecordExpired } from '@/utils/common'
import { getRecordIcon, getRecordBadge, getRecordFileCount } from '@/utils/record-display'

interface Props {
  records: ReceivedFileRecord[]
}

interface Emits {
  'view-details': [record: ReceivedFileRecord]
  'download-record': [record: ReceivedFileRecord]
  'delete-record': [id: number]
}

defineProps<Props>()
defineEmits<Emits>()
const isDarkMode = inject<Ref<boolean> | boolean>('isDarkMode', false)
const _isDark = () => Boolean(unref(isDarkMode))
const { t } = useI18n()

function isExpired(record: ReceivedFileRecord): boolean {
  return record.isExpired || isRecordExpired(record.expiredAt, record.expireStyle, record.expireValue)
}

function fileCountText(record: ReceivedFileRecord): number {
  return getRecordFileCount(record)
}

function recordIcon(record: ReceivedFileRecord) {
  return getRecordIcon(record, _isDark())
}

function recordBadge(record: ReceivedFileRecord) {
  return getRecordBadge(
    record,
    {
      file: t('records.badge.file'),
      text: t('records.badge.text'),
      collection: t('records.badge.collection'),
      delivery: t('records.badge.delivery')
    },
    _isDark()
  )
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-move {
  transition: transform 0.3s ease;
}
</style>
