<template>
  <RecordModalShell
    :visible="visible"
    :title="t('collection.retrieve.title')"
    :subtitle="retrieveData?.title || t('collection.manage.untitled')"
    :icon="InboxIcon"
    icon-tone="emerald"
    @close="$emit('close')"
  >
    <!-- 加载 -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-10">
      <LoaderIcon class="w-6 h-6 animate-spin mb-2" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-500']" />
      <p class="text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('collection.retrieve.loading') }}</p>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-10">
      <InboxIcon class="w-8 h-8 mb-2" :class="[isDarkMode ? 'text-gray-700' : 'text-gray-300']" />
      <p class="text-sm mb-3" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ error }}</p>
      <button @click="$emit('close')" class="px-4 py-1.5 rounded-lg text-sm transition-colors" :class="[isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">{{ t('common.close') }}</button>
    </div>

    <!-- 内容 -->
    <div v-else-if="retrieveData" class="px-5 pb-4">
      <div class="rounded-xl p-5" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
        <div class="flex gap-5">
          <ModalCodeBlock
            :code="props.code"
            :label="t('retrieve.codeInput.label')"
            tone="emerald"
            @copy="copyCode"
          >
            <ModalInfoRow :label="t('retrieve.createdAt')" :value="formattedDate" />
            <ModalInfoRow v-if="expireText" label="取件时间" :value="expireText.replace(t('retrieve.expireAt') + '：', '')" />
            <ModalInfoRow :label="t('retrieve.fileCount')" :value="retrieveData.files.length" />
            <ModalInfoRow :label="t('retrieve.fileSize')" :value="formatFileSize(retrieveData.total_size)" />
          </ModalCodeBlock>
          <ModalQrCode :value="retrieveQrValue" :caption="t('collection.retrieve.scanQrCode')" />
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="mt-3">
        <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.collectionFiles.title') }}</p>
        <div v-if="retrieveData.files.length > 0" class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          <div v-for="file in retrieveData.files" :key="file.id" class="flex items-center px-3 py-2 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50']">
            <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
            <div class="min-w-0 flex-1">
              <p class="text-sm truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ file.file_name }}</p>
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">{{ formatFileSize(file.file_size) }}<span v-if="file.uploader_name"> · {{ file.uploader_name }}</span></p>
            </div>
            <button @click="downloadFile(file.id)" class="ml-2 p-1 rounded-md transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-emerald-400 hover:bg-gray-800' : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-100']"><DownloadIcon class="w-4 h-4" /></button>
          </div>
        </div>
        <div v-else class="text-center py-4" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']"><p class="text-sm">{{ t('collection.retrieve.noFiles') }}</p></div>
      </div>
    </div>

    <template v-if="!loading && !error && retrieveData" #footer>
      <button v-if="retrieveData.files.length > 0" @click="downloadAll" class="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"><DownloadIcon class="w-4 h-4" />{{ t('collection.retrieve.downloadAll') }}</button>
      <button @click="$emit('close')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" :class="[isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">{{ t('common.close') }}</button>
    </template>
  </RecordModalShell>
</template>

<script setup lang="ts">
import { inject, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LoaderIcon, InboxIcon, FileIcon, DownloadIcon } from 'lucide-vue-next'
import RecordModalShell from './RecordModalShell.vue'
import ModalCodeBlock from './ModalCodeBlock.vue'
import ModalInfoRow from './ModalInfoRow.vue'
import ModalQrCode from './ModalQrCode.vue'
import { CollectionService } from '@/services/collection'
import type { CollectionRetrieveResponse } from '@/types/collection'
import type { ReceivedFileRecord } from '@/types'
import { useAlertStore } from '@/stores/alertStore'
import { useFileDataStore } from '@/stores/fileData'
import { downloadFile as downloadFileFromUrl } from '@/utils/download-action'
import { formatFileSize } from '@/utils/common'
import { buildRetrieveUrl } from '@/utils/share-url'
import { copyToClipboard } from '@/utils/clipboard'

const props = defineProps<{ visible: boolean; code: string }>()
defineEmits<{ close: [] }>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const alertStore = useAlertStore()
const fileStore = useFileDataStore()
const loading = ref(false)
const error = ref('')
const retrieveData = ref<CollectionRetrieveResponse | null>(null)

const formattedDate = computed(() => retrieveData.value?.created_at ? new Date(retrieveData.value.created_at).toLocaleString() : new Date().toLocaleString())

const expireText = computed(() => {
  if (!retrieveData.value) return ''
  const rs = retrieveData.value.retrieve_expire_style
  const rv = retrieveData.value.retrieve_expire_value
  const re = retrieveData.value.retrieve_expired_at
  if (rs === 'forever') return t('retrieve.expireForever')
  if (rs === 'count') return `${t('retrieve.expireAt')}：${t('retrieve.expireCount', { count: rv ?? 0 })}`
  if (re) return `${t('retrieve.expireAt')}：${new Date(re).toLocaleString()}`
  if (rs && rv) {
    const m: Record<string,string> = { day: t('retrieve.unitDay'), hour: t('retrieve.unitHour'), minute: t('retrieve.unitMinute') }
    return `${t('retrieve.expireAt')}：${t('retrieve.expireAfter', { value: rv, unit: m[rs] || rs })}`
  }
  return ''
})

const copyCode = async () => {
  await copyToClipboard(props.code, {
    successMsg: t('retrieve.copySuccess'),
    errorMsg: t('retrieve.copySuccess'),
    notify: (m) => alertStore.showAlert(m, 'success')
  })
}

const retrieveQrValue = computed(() => buildRetrieveUrl(props.code))

const downloadFile = (id: number) => {
  const file = retrieveData.value?.files?.find(f => f.id === id)
  const filename = file?.file_name || undefined
  void downloadFileFromUrl(CollectionService.getDownloadUrl(id, props.code), filename, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
}
const downloadAll = () => {
  if (!retrieveData.value) return
  void downloadFileFromUrl(CollectionService.getZipDownloadUrl(props.code), `${props.code}.zip`, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
}

const fetchData = async () => {
  if (!props.code || !props.visible) return
  loading.value = true
  error.value = ''
  retrieveData.value = null
  try {
    const res = await CollectionService.getRetrieveInfo(props.code)
    if (res.code === 200 && res.detail) {
      retrieveData.value = res.detail
      const files = res.detail.files.filter((f) => f.status === 'completed')
      const totalSize = files.reduce((sum, f) => sum + f.file_size, 0)
      const collectionRecord: ReceivedFileRecord = {
        id: Date.now(),
        code: props.code,
        filename: res.detail.title || t('retrieve.collectionFiles.title'),
        size: formatFileSize(totalSize),
        downloadUrl: null,
        content: null,
        date: new Date().toLocaleString(),
        type: 'multiFile',
        isCollection: true,
        isRetrieveCode: true,
        collectionDeliveryCode: '',
        collectionRetrieveCode: props.code,
        collectionFiles: files.map((f) => ({
          id: f.id,
          file_name: f.file_name,
          file_size: f.file_size,
          uploader_name: f.uploader_name || '',
        })),
        expiredAt: res.detail.retrieve_expired_at,
        expireStyle: res.detail.retrieve_expire_style,
        expireValue: res.detail.retrieve_expire_value,
      }
      if (!fileStore.receiveData.some((f) => f.code === collectionRecord.code)) {
        fileStore.addReceiveData(collectionRecord)
      } else {
        fileStore.updateRecordExpiry(
          collectionRecord.code,
          res.detail.retrieve_expired_at,
          res.detail.retrieve_expire_style,
          res.detail.retrieve_expire_value,
        )
      }
    } else {
      const detail = String(res.detail || '')
      if (detail.includes('过期') || detail.includes('expired') || res.code === 410) {
        error.value = t('collection.retrieve.expired')
      } else {
        error.value = t('collection.retrieve.notFound')
      }
    }
  } catch (err: unknown) {
    const errObj = err as { response?: { data?: { detail?: string } }; message?: string }
    const msg = String(errObj?.response?.data?.detail || errObj?.message || '')
    if (msg.includes('过期') || msg.includes('expired') || msg.includes('410')) {
      error.value = t('collection.retrieve.expired')
    } else {
      error.value = t('collection.retrieve.loadFailed')
    }
  } finally {
    loading.value = false
  }
}

watch(() => [props.visible, props.code], ([v, c]) => { if (v && c) fetchData(); if (!v) { retrieveData.value = null; error.value = '' } }, { immediate: true })
</script>

<style scoped>
.custom-scrollbar { scrollbar-width: thin; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
</style>
