<template>
  <div class="flex-grow overflow-y-auto p-6">
    <transition-group name="list" tag="div" class="space-y-2">
      <div
        v-for="item in mergedRecords"
        :key="`${item.kind}-${item.id}`"
        class="rounded-lg p-3 transition duration-200"
        :class="[isDarkMode ? 'bg-gray-800/60 hover:bg-gray-700/80' : 'bg-gray-50 hover:bg-gray-100']"
      >
        <!-- 头部行 -->
        <div class="flex items-center">
          <div class="flex-shrink-0 mr-3">
            <component :is="item.icon.icon" class="w-5 h-5" :class="[item.icon.color]" />
          </div>
          <div class="flex-grow min-w-0 mr-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                :class="[item.badge.class]"
              >{{ item.badge.text }}</span>
              <p
                class="text-sm truncate"
                :class="[isDarkMode ? 'text-gray-200' : 'text-gray-800']"
              >
                {{ item.displayName }}
              </p>
            </div>
            <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ item.infoLine }}
            </p>
          </div>
          <div class="flex-shrink-0 flex items-center gap-1">
            <!-- 发件记录（非投件）：复制链接 -->
            <button
              v-if="item.kind === 'sent' && !isDeliverySentRecord(item.data)"
              type="button"
              @click="$emit('copy-link', item)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-200 text-gray-400 hover:text-indigo-600']"
              :title="t('fileRecord.copyLink')"
            >
              <ClipboardCopyIcon class="w-4 h-4" />
            </button>
            <!-- 收件箱记录：管理 -->
            <button
              v-if="item.kind === 'collection'"
              type="button"
              @click="$emit('go-manage', item)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600']"
              :title="t('collection.create.manage')"
            >
              <SettingsIcon class="w-4 h-4" />
            </button>
            <!-- 收件箱记录：查看文件 -->
            <button
              v-if="item.kind === 'collection'"
              type="button"
              @click="$emit('go-retrieve', item)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-emerald-400' : 'hover:bg-gray-200 text-gray-400 hover:text-emerald-600']"
              :title="t('collection.create.retrieveHint')"
            >
              <EyeIcon class="w-4 h-4" />
            </button>
            <!-- 取件记录：下载 -->
            <button
              v-if="item.kind === 'received' && !isReceivedExpired(item.data as ReceivedFileRecord)"
              type="button"
              @click="$emit('download-record', item)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600']"
            >
              <DownloadIcon class="w-4 h-4" />
            </button>
            <!-- 所有记录：查看详情 -->
            <button
              type="button"
              @click="$emit('view-details', item)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600']"
            >
              <EyeIcon class="w-4 h-4" />
            </button>
            <!-- 所有记录：删除 -->
            <button
              type="button"
              @click="$emit('delete-record', item)"
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
    <div v-if="mergedRecords.length === 0" class="text-center py-12">
      <InboxIcon class="w-10 h-10 mx-auto mb-2" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-300']" />
      <p class="text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('records.empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, unref, type Ref } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ClipboardCopyIcon,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  InboxIcon,
  SettingsIcon,
  TrashIcon,
  UploadIcon,
  FilesIcon
} from 'lucide-vue-next'
import type { CollectionRecord, ReceivedFileRecord, SentFileRecord, UnifiedRecordItem } from '@/types'
import { isRecordExpired } from '@/utils/common'

const props = defineProps<{
  receivedRecords: ReceivedFileRecord[]
  sentRecords: SentFileRecord[]
  collectionRecords: CollectionRecord[]
}>()

defineEmits<{
  'view-details': [item: UnifiedRecordItem]
  'download-record': [item: UnifiedRecordItem]
  'delete-record': [item: UnifiedRecordItem]
  'copy-link': [item: UnifiedRecordItem]
  'go-manage': [item: UnifiedRecordItem]
  'go-retrieve': [item: UnifiedRecordItem]
}>()

const isDarkMode = inject<Ref<boolean> | boolean>('isDarkMode', false)
const _isDark = () => Boolean(unref(isDarkMode))
const { t } = useI18n()

const isReceivedExpired = (record: ReceivedFileRecord): boolean => {
  return record.isExpired || isRecordExpired(record.expiredAt, record.expireStyle, record.expireValue)
}

// 类型守卫：判断发件记录是否为投件记录
const isDeliverySentRecord = (record: ReceivedFileRecord | SentFileRecord | CollectionRecord): boolean => {
  return (record as SentFileRecord).isDelivery === true
}

// 获取发件记录的文件数量
const sentFilesCount = (record: SentFileRecord): number => {
  if (record.files && record.files.length > 0) return record.files.length
  if (record.fileCount) return record.fileCount
  return record.isMultiFile ? 0 : 1
}

// 合并三条记录列表为统一格式
const mergedRecords = computed<UnifiedRecordItem[]>(() => {
  const items: UnifiedRecordItem[] = []

  // 收件箱记录（优先展示，因为是用户主动创建的）
  for (const r of props.collectionRecords) {
    items.push({
      kind: 'collection',
      id: r.id,
      data: r,
      icon: { icon: InboxIcon, color: _isDark() ? 'text-indigo-400' : 'text-indigo-500' },
      badge: {
        text: t('records.badge.collection'),
        class: _isDark() ? 'bg-indigo-900/40 text-indigo-200' : 'bg-indigo-100 text-gray-900'
      },
      displayName: r.title || t('collection.manage.untitled') || r.collectionCode,
      infoLine: `${r.date} · ${r.maxFiles} ${t('records.multiFile')} · ${r.expireInfo}`
    })
  }

  // 发件记录（仅保留文件和投件类型，过滤掉 text 文本类型）
  for (const r of props.sentRecords) {
    // 跳过文本类型发件记录
    if (r.type === 'text') continue

    const isDelivery = r.isDelivery === true
    let icon: { icon: Component; color: string }
    let badge: { text: string; class: string }

    if (isDelivery) {
      // 投件：保留原样式（琥珀色）
      icon = { icon: UploadIcon, color: _isDark() ? 'text-amber-400' : 'text-amber-500' }
      badge = {
        text: t('records.badge.delivery'),
        class: _isDark() ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-gray-900'
      }
    } else {
      // 文件：统一按多文件样式显示（无论单文件还是多文件）
      icon = { icon: FilesIcon, color: _isDark() ? 'text-violet-400' : 'text-violet-500' }
      badge = {
        text: t('records.badge.multiFile'),
        class: _isDark() ? 'bg-violet-900/40 text-violet-200' : 'bg-violet-100 text-gray-900'
      }
    }

    // 名称回退逻辑：有名称用名称，没名称用取件码
    const displayName = isDelivery
      ? (r.collectionTitle || r.filename || t('records.deliveryTitle') || r.retrieveCode)
      : (r.filename || r.retrieveCode || t('records.badge.file'))

    // 信息行：日期 · 大小 [+ 文件数 + 过期]
    const parts: string[] = [r.date, r.size]
    const fileCount = sentFilesCount(r)
    if (fileCount > 0) {
      parts.push(`${fileCount} ${t('records.multiFile')}`)
    }
    if (r.expiration) {
      parts.push(r.expiration)
    }

    items.push({
      kind: 'sent',
      id: r.id,
      data: r,
      icon,
      badge,
      displayName,
      infoLine: parts.join(' · ')
    })
  }

  // 取件记录
  for (const r of props.receivedRecords) {
    const expired = isReceivedExpired(r)
    const type = r.type || (r.content ? 'text' : 'file')
    let icon: { icon: Component; color: string }
    let badge: { text: string; class: string }

    if (type === 'text') {
      icon = { icon: FileTextIcon, color: _isDark() ? 'text-teal-400' : 'text-teal-500' }
      badge = {
        text: t('records.badge.text'),
        class: _isDark() ? 'bg-teal-900/40 text-teal-200' : 'bg-teal-100 text-gray-900'
      }
    } else if (type === 'multiFile') {
      icon = { icon: FilesIcon, color: _isDark() ? 'text-violet-400' : 'text-violet-500' }
      badge = {
        text: t('records.badge.multiFile'),
        class: _isDark() ? 'bg-violet-900/40 text-violet-200' : 'bg-violet-100 text-gray-900'
      }
    } else {
      icon = {
        icon: FileIcon,
        color: expired ? (_isDark() ? 'text-gray-600' : 'text-gray-400') : (_isDark() ? 'text-sky-400' : 'text-sky-500')
      }
      badge = {
        text: t('records.badge.file'),
        class: _isDark() ? 'bg-sky-900/40 text-sky-200' : 'bg-sky-100 text-gray-900'
      }
    }

    // 名称回退：filename || code
    const displayName = r.filename || t('records.badge.file')

    const parts: string[] = [r.date, r.size]
    if (type === 'multiFile') {
      const cnt = (r.isCollection && r.collectionFiles?.length) || (r.multiFileItems?.length) || 0
      if (cnt > 0) {
        parts.push(`${cnt} ${t('records.multiFile')}`)
      }
    }

    items.push({
      kind: 'received',
      id: r.id,
      data: r,
      icon,
      badge,
      displayName,
      infoLine: parts.join(' · ')
    })
  }

  return items
})
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
.custom-scrollbar { scrollbar-width: thin; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
</style>
