<template>
  <RecordModalShell
    :visible="!!record"
    :title="isDelivery ? t('records.deliveryTitle') : t('send.fileDetails')"
    :subtitle="isDelivery ? record?.filename : (t('records.badge.file') + ' · ' + record?.filename)"
    :icon="titleIcon"
    :icon-tone="isDelivery ? 'amber' : 'indigo'"
    @close="$emit('close')"
  >
    <!-- 内容 -->
    <div class="px-5 pb-4">
      <div class="rounded-xl p-5" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
        <div class="flex gap-5">
          <ModalCodeBlock
            :code="record?.retrieveCode || ''"
            :label="isDelivery ? t('collection.manage.deliveryCodeLabel') : t('retrieve.codeInput.label')"
            :tone="isDelivery ? 'amber' : 'indigo'"
            :show-copy-link="!isDelivery"
            :link-text="t('fileRecord.copyLink')"
            @copy="$emit('copy-code', record!)"
            @copy-link="$emit('copy-link', record!)"
          >
            <ModalInfoRow :label="t('retrieve.createdAt')" :value="record?.date" />
            <ModalInfoRow :label="t('retrieve.fileSize')" :value="displaySize" />
            <div v-if="isLoading" class="flex items-baseline gap-2.5">
              <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('send.expiration.label') }}</span>
              <span class="text-sm italic" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('records.refreshing') }}</span>
            </div>
            <div v-else class="flex items-baseline gap-2.5">
              <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('send.expiration.label') }}</span>
              <span v-if="isExpired" class="text-sm font-medium text-red-500">{{ t('records.badge.expired') || t('retrieve.expired') }}</span>
              <span v-else class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ expirationText }}</span>
            </div>
            <ModalInfoRow
              v-if="displayFileCount > 0"
              :label="t('retrieve.fileCount')"
              :value="displayFileCount"
            />
            <ModalInfoRow
              v-if="remainingDownloadsText"
              :label="t('fileManage.expireCount')"
              :value="remainingDownloadsText"
            />
          </ModalCodeBlock>
          <ModalQrCode
            :value="qrValue"
            :caption="isDelivery ? t('retrieve.scanToDeliver') : t('retrieve.scanToRetrieve')"
          />
        </div>
      </div>

      <!-- 文件列表（多文件分享或投件记录） -->
      <div v-if="displayFiles.length > 0" class="mt-3">
        <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
          {{ isDelivery ? t('records.uploadedFiles') : t('retrieve.multiFile.title') }}
          <span class="ml-1 text-xs">({{ displayFiles.length }})</span>
        </p>
        <div class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          <div v-for="(file, index) in displayFiles" :key="index" class="flex items-center px-3 py-2 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50']">
            <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDelivery ? (isDarkMode ? 'text-amber-500' : 'text-amber-400') : (isDarkMode ? 'text-indigo-500' : 'text-indigo-400')]" />
            <div class="min-w-0 flex-1">
              <p class="text-sm truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ file.name }}</p>
              <p v-if="file.uploadTime" class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ formatUploadTime(file.uploadTime) }}</p>
            </div>
            <span class="text-xs ml-2 flex-shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button v-if="!isDelivery" @click="$emit('copy-link', record!)" class="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700"><LinkIcon class="w-4 h-4" />{{ t('fileRecord.copyLink') }}</button>
      <button v-if="isDelivery" @click="$emit('continue-delivery', record!)" class="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700"><UploadIcon class="w-4 h-4" />{{ t('records.continueDelivery') }}</button>
      <button @click="$emit('close')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" :class="[isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">{{ t('common.close') }}</button>
    </template>
  </RecordModalShell>
</template>

<script setup lang="ts">
import { computed, inject, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileIcon, LinkIcon, UploadIcon } from 'lucide-vue-next'
import RecordModalShell from './RecordModalShell.vue'
import ModalCodeBlock from './ModalCodeBlock.vue'
import ModalInfoRow from './ModalInfoRow.vue'
import ModalQrCode from './ModalQrCode.vue'
import type { SentFileRecord } from '@/types'
import { useRecordRefresh } from '@/composables/useRecordRefresh'
import { formatFileSize } from '@/utils/common'
import { buildDeliveryUploadUrl } from '@/utils/share-url'

const props = defineProps<{
  record: SentFileRecord | null
  getQRCodeValue: (record: SentFileRecord) => string
}>()

defineEmits<{
  close: []
  'copy-code': [record: SentFileRecord]
  'copy-link': [record: SentFileRecord]
  'copy-wget': [record: SentFileRecord]
  'continue-delivery': [record: SentFileRecord]
}>()

const { t } = useI18n()
const isDarkMode = inject('isDarkMode')
const isDelivery = computed(() => props.record?.isDelivery === true)
const titleIcon = computed(() => {
  if (isDelivery.value) return UploadIcon
  return FileIcon
})
// 投件记录：扫码快速投件（跳转到投件上传页）；其他记录：扫码取件
const qrValue = computed(() => {
  if (!props.record) return ''
  if (isDelivery.value) {
    return buildDeliveryUploadUrl(props.record.retrieveCode)
  }
  return props.getQRCodeValue(props.record)
})

// 格式化文件上传时间
const formatUploadTime = (raw: string): string => {
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 实时拉取记录信息
const { refreshInfo, loading: isLoading, refresh, reset } = useRecordRefresh()

watch(
  () => props.record,
  (newRecord, oldRecord) => {
    if (newRecord && newRecord.id !== oldRecord?.id) {
      refresh(newRecord)
    } else if (!newRecord) {
      reset()
    }
  },
  { immediate: true }
)

// 显示的文件大小
const displaySize = computed(() => {
  if (refreshInfo.value?.size != null) {
    return formatFileSize(refreshInfo.value.size)
  }
  return props.record?.size || '-'
})

const isExpired = computed(() => {
  if (refreshInfo.value) return refreshInfo.value.expired
  return false
})

const expirationText = computed(() => {
  const info = refreshInfo.value
  if (!info) {
    return props.record?.expiration || '-'
  }
  if (info.isPermanent) {
    return t('retrieve.expireForever') || t('send.expiration.forever')
  }
  if (info.expiredAt) {
    try {
      const d = new Date(info.expiredAt)
      const year = d.getFullYear()
      const month = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      const hours = d.getHours().toString().padStart(2, '0')
      const minutes = d.getMinutes().toString().padStart(2, '0')
      return t('send.messages.expiresAt', { date: `${year}-${month}-${day} ${hours}:${minutes}` })
    } catch {
      return info.expiredAt
    }
  }
  if (info.expireStyle === 'count' || (info.expiredCount != null && info.expiredCount >= 0)) {
    if (info.expiredCount != null && info.expiredCount >= 0) {
      return t('retrieve.expireCount', { count: info.expiredCount })
    }
  }
  return props.record?.expiration || '-'
})

const displayFileCount = computed(() => {
  const info = refreshInfo.value
  if (info && info.fileCount > 0) return info.fileCount
  return props.record?.fileCount || 0
})

const displayFiles = computed(() => {
  if (isDelivery.value) {
    return props.record?.files || []
  }
  if (refreshInfo.value?.files && refreshInfo.value.files.length > 0) {
    return refreshInfo.value.files
  }
  return props.record?.files || []
})

const remainingDownloadsText = computed(() => {
  const info = refreshInfo.value
  if (!info || info.codeType !== 'file') return ''
  if (info.expiredCount == null || info.expiredCount < 0) {
    return t('retrieve.expireForever') || t('fileManage.expireCountUnlimited')
  }
  return `${info.expiredCount} ${t('common.times')}`
})
</script>

<style scoped>
.custom-scrollbar { scrollbar-width: thin; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
</style>
