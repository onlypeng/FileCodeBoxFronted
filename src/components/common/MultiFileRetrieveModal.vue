<template>
  <RecordModalShell
    :visible="visible"
    :title="t('retrieve.multiFile.title')"
    :subtitle="`${files.length} ${t('retrieve.multiFile.fileCount')}`"
    :icon="FilesIcon"
    icon-tone="indigo"
    @close="$emit('close')"
  >
    <!-- 过期警告 -->
    <div v-if="isExpired" class="mx-5 mt-3 mb-0 flex items-center gap-2 px-4 py-2.5 rounded-lg" :class="[isDarkMode ? 'bg-red-900/30 border border-red-800/50' : 'bg-red-50 border border-red-200']">
      <AlertTriangleIcon class="w-4 h-4 shrink-0" :class="[isDarkMode ? 'text-red-400' : 'text-red-500']" />
      <span class="text-sm font-medium" :class="[isDarkMode ? 'text-red-300' : 'text-red-700']">{{ t('fileDetail.expired') }}</span>
    </div>

    <!-- 内容 -->
    <div class="px-5 pb-4">
      <div class="rounded-xl p-5" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
        <div class="flex gap-5">
          <ModalCodeBlock
            :code="code"
            :label="t('retrieve.codeInput.label')"
            tone="indigo"
            :show-copy-link="true"
            :link-text="t('fileRecord.copyLink')"
            @copy="copyCode"
            @copy-link="copyLink"
          >
            <ModalInfoRow :label="t('retrieve.createdAt')" :value="date" />
            <ModalInfoRow label="取件时间" :value="date" />
            <ModalInfoRow :label="t('retrieve.fileSize')" :value="totalSize" />
          </ModalCodeBlock>
          <ModalQrCode :value="qrValue" :caption="t('retrieve.scanToRetrieve')" />
        </div>
      </div>

      <div class="mt-3">
        <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.multiFile.title') }}</p>
        <div class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          <div v-for="item in files" :key="item.id" class="flex items-center px-3 py-2 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50']">
            <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
            <div class="min-w-0 flex-1">
              <p class="text-sm truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ item.file_name }}</p>
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">{{ formatFileSize(item.file_size) }}</p>
            </div>
            <button @click="$emit('download-item', item.id)" class="ml-2 p-1 rounded-md transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100']"><DownloadIcon class="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button @click="$emit('download-zip')" class="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"><DownloadIcon class="w-4 h-4" />{{ t('retrieve.multiFile.downloadAll') }}</button>
      <button @click="$emit('close')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" :class="[isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">{{ t('common.close') }}</button>
    </template>
  </RecordModalShell>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FilesIcon, FileIcon, DownloadIcon, AlertTriangleIcon } from 'lucide-vue-next'
import RecordModalShell from './RecordModalShell.vue'
import ModalCodeBlock from './ModalCodeBlock.vue'
import ModalInfoRow from './ModalInfoRow.vue'
import ModalQrCode from './ModalQrCode.vue'
import type { MultiFileItem } from '@/types/collection'
import { useAlertStore } from '@/stores/alertStore'
import { isRecordExpired, formatFileSize } from '@/utils/common'
import { buildRetrieveUrl } from '@/utils/share-url'
import { copyToClipboard } from '@/utils/clipboard'

const props = defineProps<{ visible: boolean; code: string; files: MultiFileItem[]; date: string; totalSize: string; expiredAt?: string | null; expireStyle?: string; expireValue?: number }>()
defineEmits<{ close: []; 'download-item': [id: number]; 'download-zip': [] }>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const alertStore = useAlertStore()
const qrValue = computed(() => props.code ? buildRetrieveUrl(props.code) : '')
const isExpired = computed(() => isRecordExpired(props.expiredAt, props.expireStyle, props.expireValue))
const copyCode = async () => { await copyToClipboard(props.code, { successMsg: t('retrieve.copySuccess'), errorMsg: t('retrieve.copySuccess'), notify: (m) => alertStore.showAlert(m, 'success') }) }
const copyLink = async () => { await copyToClipboard(qrValue.value, { successMsg: t('fileDetail.copyLinkSuccess'), errorMsg: t('fileDetail.copyLinkSuccess'), notify: (m) => alertStore.showAlert(m, 'success') }) }
</script>

<style scoped>
.custom-scrollbar { scrollbar-width: thin; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
</style>
