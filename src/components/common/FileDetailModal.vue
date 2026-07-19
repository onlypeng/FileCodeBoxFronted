<template>
  <RecordModalShell
    :visible="visible"
    :title="record?.filename || ''"
    :subtitle="record?.isCollection ? t('retrieve.collectionFiles.title') : t('records.badge.file')"
    :icon="FileIcon"
    :icon-tone="isCollection ? 'emerald' : 'indigo'"
    @close="$emit('close')"
  >
    <!-- 过期警告 -->
    <div v-if="isExpired" class="mx-5 mt-3 mb-0 flex items-center gap-2 px-4 py-2.5 rounded-lg" :class="[isDarkMode ? 'bg-red-900/30 border border-red-800/50' : 'bg-red-50 border border-red-200']">
      <AlertTriangleIcon class="w-4 h-4 shrink-0" :class="[isDarkMode ? 'text-red-400' : 'text-red-500']" />
      <span class="text-sm font-medium" :class="[isDarkMode ? 'text-red-300' : 'text-red-700']">{{ t('fileDetail.expired') }}</span>
    </div>

    <!-- 内容 -->
    <div v-if="record" class="px-5 pb-4">
      <!-- 主卡片 -->
      <div class="rounded-xl p-5" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
        <div class="flex gap-5">
          <ModalCodeBlock
            :code="record.code"
            :label="t('retrieve.codeInput.label')"
            :tone="isCollection ? 'emerald' : 'indigo'"
            :show-copy-link="true"
            :link-text="t('fileRecord.copyLink')"
            @copy="copyCode"
            @copy-link="copyLink"
          >
            <ModalInfoRow :label="t('retrieve.createdAt')" :value="record.date" />
            <ModalInfoRow :label="t('retrieve.expireAt')" :value="formatExpiry(record)" />
            <div class="flex items-center gap-2.5">
              <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.fileSize') }}</span>
              <span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ record.size }}</span>
              <button
                v-if="record.type === 'text'"
                @click="$emit('preview-content')"
                class="ml-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
                :class="[isDarkMode ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/60' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200']"
              >{{ t('fileDetail.previewContent') }}</button>
            </div>
            <ModalInfoRow
              v-if="record.isCollection || record.isMultiFile"
              :label="t('retrieve.fileCount')"
              :value="(record.isCollection ? record.collectionFiles : record.multiFileItems)?.length || 0"
            />
          </ModalCodeBlock>
          <ModalQrCode :value="getQRCodeValue(record)" :caption="t('retrieve.scanToRetrieve')" />
        </div>
      </div>

      <!-- 收件箱文件列表 -->
      <div v-if="record.isCollection && record.collectionFiles && record.collectionFiles.length > 0" class="mt-3">
        <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.collectionFiles.title') }}</p>
        <div class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          <div v-for="file in record.collectionFiles" :key="file.id" class="flex items-center px-3 py-2 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50']">
            <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
            <div class="min-w-0 flex-1">
              <p class="text-sm truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ file.file_name }}</p>
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">{{ formatFileSize(file.file_size) }}<span v-if="file.uploader_name"> · {{ file.uploader_name }}</span></p>
            </div>
          </div>
        </div>
      </div>

      <!-- 多文件分享文件列表 -->
      <div v-if="record.isMultiFile && record.multiFileItems && record.multiFileItems.length > 0" class="mt-3">
        <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.multiFile.title') }}</p>
        <div class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          <div v-for="item in record.multiFileItems" :key="item.id" class="flex items-center px-3 py-2 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50']">
            <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
            <div class="min-w-0 flex-1">
              <p class="text-sm truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ item.file_name }}</p>
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">{{ formatFileSize(item.file_size) }}</p>
            </div>
            <button @click="$emit('download-item', item.id)" class="ml-2 p-1 rounded-md transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100']"><DownloadIcon class="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <!-- 文本备注 -->
      <div v-if="record.textNote" class="mt-3">
        <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('fileDetail.textNote') }}</p>
        <div class="rounded-lg p-3 text-sm whitespace-pre-wrap break-words" :class="[isDarkMode ? 'bg-gray-800/60 text-gray-300' : 'bg-gray-50 text-gray-700']">{{ record.textNote }}</div>
      </div>
    </div>

    <template v-if="record" #footer>
      <template v-if="!record.isCollection && !record.isMultiFile && record.type !== 'text'">
        <button @click="handleDownload" :disabled="isExpired" class="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" :class="primaryBtnClass">
          <DownloadIcon class="w-4 h-4" />{{ isExpired ? t('fileDetail.expired') : t('fileDetail.download') }}
        </button>
      </template>
      <template v-else-if="(record.isCollection || record.isMultiFile)">
        <button @click="!isExpired && $emit('download-zip')" :disabled="isExpired" class="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" :class="primaryBtnClass">
          <DownloadIcon class="w-4 h-4" />{{ isExpired ? t('fileDetail.expired') : t('retrieve.multiFile.downloadAll') }}
        </button>
      </template>
      <template v-else-if="record.type === 'text'">
        <button @click="handleDownload" :disabled="isExpired" class="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" :class="primaryBtnClass">
          <DownloadIcon class="w-4 h-4" />{{ isExpired ? t('fileDetail.expired') : t('fileDetail.download') }}
        </button>
      </template>
      <button @click="$emit('close')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" :class="[isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">{{ t('common.close') }}</button>
    </template>
  </RecordModalShell>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileIcon, DownloadIcon, AlertTriangleIcon } from 'lucide-vue-next'
import RecordModalShell from './RecordModalShell.vue'
import ModalCodeBlock from './ModalCodeBlock.vue'
import ModalInfoRow from './ModalInfoRow.vue'
import ModalQrCode from './ModalQrCode.vue'
import type { ReceivedFileRecord } from '@/types'
import { buildDownloadUrl, buildReceivedRecordQrValue, buildRetrieveUrl } from '@/utils/share-url'
import { isRecordExpired, formatTimestamp, formatFileSize } from '@/utils/common'
import { downloadFile } from '@/utils/download-action'
import { useAlertStore } from '@/stores/alertStore'
import { copyToClipboard } from '@/utils/clipboard'

interface Props { visible: boolean; record: ReceivedFileRecord | null }
interface Emits { close: []; 'preview-content': []; 'download-zip': []; 'download-item': [id: number] }

const props = defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
const isDarkMode = inject('isDarkMode')
const alertStore = useAlertStore()

const isCollection = computed(() => props.record?.isCollection)
const primaryBtnClass = computed(() => isCollection.value ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700')
const isExpired = computed(() => props.record ? (props.record.isExpired || isRecordExpired(props.record.expiredAt, props.record.expireStyle, props.record.expireValue)) : false)

const formatExpiry = (r: ReceivedFileRecord) => {
  if (!r.expiredAt) return t('retrieve.expireForever')
  return formatTimestamp(r.expiredAt)
}

const copyCode = async () => {
  if (!props.record) return
  await copyToClipboard(props.record.code, {
    successMsg: t('retrieve.copySuccess'),
    errorMsg: t('retrieve.copySuccess'),
    notify: (m) => alertStore.showAlert(m, 'success')
  })
}
const copyLink = async () => {
  if (!props.record) return
  await copyToClipboard(buildRetrieveUrl(props.record.code), {
    successMsg: t('fileDetail.copyLinkSuccess'),
    errorMsg: t('fileDetail.copyLinkSuccess'),
    notify: (m) => alertStore.showAlert(m, 'success')
  })
}
const getDownloadUrl = (r: ReceivedFileRecord) => buildDownloadUrl(r.downloadUrl)

const handleDownload = () => {
  if (!props.record) return
  if (props.record.isCollection || props.record.isMultiFile) return
  void downloadFile(getDownloadUrl(props.record), props.record.filename || undefined, {
    isExpired: isExpired.value,
    expiredMessage: t('fileDetail.expired')
  })
}
const getQRCodeValue = (r: ReceivedFileRecord) => buildReceivedRecordQrValue(r)
</script>

<style scoped>
.custom-scrollbar { scrollbar-width: thin; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
</style>
