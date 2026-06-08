<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto"
      @click.self="$emit('close')"
    >
      <div class="w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" :class="[isDarkMode ? 'bg-gray-900' : 'bg-white']">
        <!-- 头部 -->
        <div class="px-5 pt-4 pb-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center" :class="[isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50']"><InboxIcon class="w-5 h-5" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']" /></div>
            <div>
              <h3 class="text-base font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ t('collection.retrieve.title') }}</h3>
              <p class="text-sm truncate max-w-[220px]" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ retrieveData?.title || t('collection.manage.untitled') }}</p>
            </div>
          </div>
          <button @click="$emit('close')" class="p-1.5 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400']"><XIcon class="w-5 h-5" /></button>
        </div>

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
          <!-- 左右分栏 -->
          <div class="flex gap-4">
            <!-- 左侧：信息 -->
            <div class="flex-1 min-w-0 space-y-2 pt-1">
              <div class="flex items-baseline gap-2.5"><span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.createdAt') }}：</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ formattedDate }}</span></div>
              <div v-if="expireText" class="flex items-baseline gap-2.5"><span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">取件时间：</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ expireText.replace(t('retrieve.expireAt') + '：', '') }}</span></div>
              <div class="flex items-baseline gap-2.5"><span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.fileCount') }}：</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ retrieveData.files.length }}</span></div>
              <div class="flex items-baseline gap-2.5"><span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.fileSize') }}：</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ formatFileSize(retrieveData.total_size) }}</span></div>
            </div>

            <!-- 右侧：码卡片 -->
            <div class="flex-shrink-0 w-48 space-y-2">
              <!-- 投件码 -->
              <div v-if="retrieveData.delivery_code" class="rounded-xl p-3 border" :class="[isDarkMode ? 'bg-amber-900/15 border-amber-800/30' : 'bg-amber-50/80 border-amber-200/60']">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-medium" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-700']">{{ t('retrieve.deliveryCode') }}</span>
                  <button @click="copyDeliveryCode" class="text-xs font-medium transition-colors" :class="[isDarkMode ? 'text-amber-400/70 hover:text-amber-300' : 'text-amber-600/80 hover:text-amber-700']">复制</button>
                </div>
                <div class="flex items-center gap-3">
                  <p class="text-lg font-mono font-bold tracking-wider shrink-0" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-700']">{{ retrieveData.delivery_code }}</p>
                  <div v-if="deliveryQrValue" class="bg-white p-1 rounded-lg shadow-sm border flex-shrink-0" :class="[isDarkMode ? 'border-gray-600' : 'border-gray-200']"><QRCode :value="deliveryQrValue" :size="56" level="M" /></div>
                </div>
                <p class="text-[11px] mt-1.5" :class="[isDarkMode ? 'text-amber-500/50' : 'text-amber-500/70']">{{ t('retrieve.scanToDeliver') }}</p>
              </div>

              <!-- 取件码 -->
              <div class="rounded-xl p-3 border" :class="[isDarkMode ? 'bg-emerald-900/15 border-emerald-800/30' : 'bg-emerald-50/80 border-emerald-200/60']">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-medium" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-700']">{{ t('retrieve.codeInput.label') }}</span>
                  <button @click="copyCode" class="text-xs font-medium transition-colors" :class="[isDarkMode ? 'text-emerald-400/70 hover:text-emerald-300' : 'text-emerald-600/80 hover:text-emerald-700']">复制</button>
                </div>
                <div class="flex items-center gap-3">
                  <p class="text-lg font-mono font-bold tracking-wider shrink-0" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-700']">{{ retrieveData.retrieve_code }}</p>
                  <div class="bg-white p-1 rounded-lg shadow-sm border flex-shrink-0" :class="[isDarkMode ? 'border-gray-600' : 'border-gray-200']"><QRCode :value="qrValue" :size="56" level="M" /></div>
                </div>
                <p class="text-[11px] mt-1.5" :class="[isDarkMode ? 'text-emerald-500/50' : 'text-emerald-500/70']">{{ t('retrieve.scanToRetrieve') }}</p>
              </div>
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

        <!-- 底部 -->
        <div v-if="!loading && !error && retrieveData" class="px-5 pb-5 flex gap-3">
          <button v-if="retrieveData.files.length > 0" @click="downloadAll" class="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"><DownloadIcon class="w-4 h-4" />{{ t('collection.retrieve.downloadAll') }}</button>
          <button @click="$emit('close')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" :class="[isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">{{ t('common.close') }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { inject, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode.vue'
import { LoaderIcon, InboxIcon, FileIcon, DownloadIcon, XIcon, CopyIcon } from 'lucide-vue-next'
import { CollectionService } from '@/services/collection'
import type { CollectionRetrieveResponse } from '@/types/collection'
import type { ReceivedFileRecord } from '@/types'
import { useAlertStore } from '@/stores/alertStore'
import { useFileDataStore } from '@/stores/fileData'
import { downloadFile as downloadFileFromUrl } from '@/utils/download-action'

const props = defineProps<{ visible: boolean; code: string }>()
const emit = defineEmits<{ close: [] }>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const alertStore = useAlertStore()
const fileStore = useFileDataStore()
const loading = ref(false)
const error = ref('')
const retrieveData = ref<CollectionRetrieveResponse | null>(null)
const baseUrl = window.location.origin + '/#'

const qrValue = computed(() => props.code ? `${baseUrl}/collection/retrieve/${props.code}` : '')
const deliveryQrValue = computed(() => retrieveData.value?.delivery_code ? `${baseUrl}/delivery/upload/${retrieveData.value.delivery_code}` : '')
const formattedDate = computed(() => retrieveData.value?.created_at ? new Date(retrieveData.value.created_at).toLocaleString() : new Date().toLocaleString())

const expireText = computed(() => {
  if (!retrieveData.value) return ''
  // 优先显示取件码过期时间
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

const copyCode = async () => { try { await navigator.clipboard.writeText(props.code); alertStore.showAlert(t('retrieve.copySuccess'), 'success') } catch {} }
const copyDeliveryCode = async () => { try { if (retrieveData.value?.delivery_code) { await navigator.clipboard.writeText(retrieveData.value.delivery_code); alertStore.showAlert(t('retrieve.copySuccess'), 'success') } } catch {} }

const formatFileSize = (bytes: number) => { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i] }
const downloadFile = (id: number) => {
  const file = retrieveData.value?.files?.find(f => f.id === id)
  const filename = file?.file_name || undefined
  // 使用取件码进行单文件下载校验，后端同时支持管理码和取件码
  void downloadFileFromUrl(CollectionService.getDownloadUrl(id, props.code), filename, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
}
const downloadAll = () => {
  if (!retrieveData.value) return
  // ZIP 下载使用管理码（更可靠），后端 ZIP 端点支持管理码和取件码
  const zipCode = retrieveData.value.collection_code || props.code
  void downloadFileFromUrl(CollectionService.getZipDownloadUrl(zipCode), `${zipCode}.zip`, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
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
      // 保存到取件记录（code 存管理码用于 ZIP 下载，collectionRetrieveCode 存取件码用于单文件下载校验）
      const files = res.detail.files.filter((f) => f.status === 'completed')
      const totalSize = files.reduce((sum, f) => sum + f.file_size, 0)
      const collectionRecord: ReceivedFileRecord = {
        id: Date.now(),
        code: res.detail.collection_code || props.code,
        filename: res.detail.title || t('retrieve.collectionFiles.title'),
        size: formatFileSize(totalSize),
        downloadUrl: null,
        content: null,
        date: new Date().toLocaleString(),
        type: 'multiFile',
        isCollection: true,
        collectionDeliveryCode: res.detail.delivery_code || '',
        collectionRetrieveCode: props.code,
        collectionFiles: files.map((f) => ({
          id: f.id,
          file_name: f.file_name,
          file_size: f.file_size,
          uploader_name: f.uploader_name || '',
        })),
      }
      if (!fileStore.receiveData.some((f) => f.code === collectionRecord.code)) {
        fileStore.addReceiveData(collectionRecord)
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
    const msg = String(err?.response?.data?.detail || err?.message || '')
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
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
