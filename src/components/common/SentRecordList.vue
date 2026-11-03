<template>
  <div class="flex-grow overflow-y-auto p-6">
    <transition-group name="list" tag="div" class="space-y-2">
      <div
        v-for="record in records"
        :key="record.id"
        class="rounded-lg p-3 transition duration-200"
        :class="[isDarkMode ? 'bg-gray-800/60 hover:bg-gray-700/80' : 'bg-gray-50 hover:bg-gray-100']"
      >
        <div class="flex items-center">
          <div class="flex-shrink-0 mr-3">
            <component :is="recordIcon(record).icon" class="w-5 h-5" :class="[recordIcon(record).color]" />
          </div>
          <div class="flex-grow min-w-0 mr-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                :class="[recordBadge(record).class]"
              >{{ recordBadge(record).text }}</span>
              <p
                class="text-sm truncate"
                :class="[isDarkMode ? 'text-gray-200' : 'text-gray-800']"
              >
                {{ recordDisplayName(record) }}
              </p>
            </div>
            <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ record.date }}<span class="mx-1">·</span>{{ record.size }}
              <template v-if="fileCountText(record) > 0"><span class="mx-1">·</span>{{ fileCountText(record) }} {{ t('records.multiFile') }}</template>
            </p>
          </div>
          <div class="flex-shrink-0 flex items-center gap-1">
            <button
              @click="$emit('copy-link', record)"
              :aria-label="t('records.copyLink') || '复制链接'"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600']"
            >
              <ClipboardCopyIcon class="w-4 h-4" />
            </button>
            <button
              @click="$emit('view-details', record)"
              :aria-label="t('records.viewDetails') || '查看详情'"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600']"
            >
              <EyeIcon class="w-4 h-4" />
            </button>
            <button
              v-if="record.ownerToken"
              @click="$emit('revoke-record', record)"
              :aria-label="t('records.revoke') || '提前作废'"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-amber-400' : 'hover:bg-gray-200 text-gray-400 hover:text-amber-600']"
            >
              <BanIcon class="w-4 h-4" />
            </button>
            <button
              @click="$emit('delete-record', record.id)"
              :aria-label="t('records.delete') || '删除'"
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
/**
 * 已发送记录列表（FileRecordList 的发送方版本）。
 *
 * ## 为什么这里有两种"删除"
 * delete-record 只删本地记录，revoke-record 会让服务端提前作废（别人立刻取不到）。
 * 后者只在 record.ownerToken 存在时才显示——没有 ownerToken 说明这条不是本机发的
 * （或是旧版本存的记录），服务端必然拒绝，给了按钮只会得到一次失败。
 * 不要把 v-if 去掉改成禁用：两者差别对普通用户不可见，隐藏更不容易误解。
 *
 * ## 刻意不做
 * 不做过期判断与置灰：发送方关心的是"这条还能不能被取"，而这个信息要从服务端刷新，
 * 列表里用过期时间做视觉降级会让用户误以为已经失效。
 */
import { inject, unref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BanIcon,
  ClipboardCopyIcon,
  EyeIcon,
  FileIcon,
  TrashIcon
} from 'lucide-vue-next'
import type { SentFileRecord } from '@/types'
import { getRecordIcon, getRecordBadge, getRecordFileCount } from '@/utils/record-display'

defineProps<{
  records: SentFileRecord[]
}>()

defineEmits<{
  'copy-link': [record: SentFileRecord]
  'view-details': [record: SentFileRecord]
  'delete-record': [id: number]
  /** 提前作废（服务端删除，别人立刻取不到）；仅本地删除用 delete-record */
  'revoke-record': [record: SentFileRecord]
}>()

const isDarkMode = inject<Ref<boolean> | boolean>('isDarkMode', false)
const _isDark = () => Boolean(unref(isDarkMode))
const { t } = useI18n()

function fileCountText(record: SentFileRecord): number {
  return getRecordFileCount(record)
}

function recordIcon(record: SentFileRecord) {
  return getRecordIcon(record, _isDark())
}

function recordBadge(record: SentFileRecord) {
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

function recordDisplayName(record: SentFileRecord): string {
  if (record.isDelivery) {
    return record.collectionTitle || t('records.deliveryTitle')
  }
  return record.filename || ''
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
