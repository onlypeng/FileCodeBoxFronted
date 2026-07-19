<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div
      class="rounded-3xl shadow-2xl overflow-hidden border w-full max-w-md md:max-w-2xl lg:max-w-3xl transition-colors duration-300"
      :class="[
        isDarkMode
          ? 'bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border-gray-700'
          : 'bg-white border-gray-200'
      ]"
    >
      <div class="p-8">
        <PageHeader :title="deliveryInfo?.title || t('delivery.upload.title')" @title-click="toHome" />

        <div v-if="deliveryInfo" class="space-y-4">
          <!-- 收件箱信息 -->
          <div class="text-center">
            <p v-if="deliveryInfo.description" class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">
              {{ deliveryInfo.description }}
            </p>
            <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ t('delivery.upload.fileCount', { count: currentFileCount, max: deliveryInfo.max_files }) }}
              <span v-if="config.uploadSize > 0" class="ml-1">| {{ t('delivery.upload.maxFileSize', { size: maxFileSizeText }) }}</span>
            </p>
          </div>

          <!-- 上传者昵称（必填） -->
          <div>
            <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('delivery.upload.uploaderNameLabel') }} <span class="text-red-500">*</span>
            </label>
            <input
              v-model="uploaderName"
              type="text"
              :placeholder="t('delivery.upload.uploaderNamePlaceholder')"
              class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
              :class="[
                isDarkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
                !uploaderName.trim() ? 'border-red-400' : ''
              ]"
              @blur="saveNickname"
            />
          </div>

          <!-- 文件选择（支持多文件） -->
          <FileUploadArea
            :selected-files="selectedFiles"
            :description="uploadDescription"
            @file-selected="(f: File) => handleFilesSelected([f])"
            @files-selected="handleFilesSelected"
            @file-drop="handleFilesDropped"
            @file-remove="removeFile"
          />

          <!-- 上传中进度列表 -->
          <div v-if="uploadingList.length > 0" class="space-y-1.5">
            <p class="text-xs font-medium" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">
              {{ t('delivery.upload.uploadingFiles') }}
            </p>
            <div
              v-for="(item, idx) in uploadingList"
              :key="'up-' + idx"
              class="p-2 rounded border border-indigo-200 dark:border-indigo-800"
              :class="[isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50']"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs truncate flex-1 mr-2" :class="[isDarkMode ? 'text-indigo-300' : 'text-indigo-700']">{{ item.filename }}</span>
                <span class="text-xs font-mono font-bold text-indigo-500">{{ item.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  class="bg-gradient-to-r from-pink-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                  :style="{ width: `${item.progress}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- 已成功上传的文件列表 -->
          <div v-if="uploadedFiles.length > 0" class="space-y-1.5">
            <p class="text-xs font-medium" :class="[isDarkMode ? 'text-green-400' : 'text-green-600']">
              {{ t('delivery.upload.uploadedFiles', { count: uploadedFiles.length }) }}
            </p>
            <div
              v-for="(f, idx) in uploadedFiles"
              :key="'done-' + idx"
              class="flex items-center justify-between p-2 rounded text-xs"
              :class="[isDarkMode ? 'bg-green-900/20' : 'bg-green-50']"
            >
              <div class="flex-1 mr-2 min-w-0">
                <div class="truncate" :class="[isDarkMode ? 'text-green-300' : 'text-green-800']">{{ f.filename }}</div>
                <div v-if="f.uploadedAt" class="text-[10px] mt-0.5" :class="[isDarkMode ? 'text-green-500' : 'text-green-500']">{{ f.uploadedAt }}</div>
              </div>
              <span :class="[isDarkMode ? 'text-green-500' : 'text-green-600']">{{ formatSize(f.size) }}</span>
              <CheckCircleIcon class="w-4 h-4 ml-2 text-green-500 flex-shrink-0" />
            </div>
          </div>

          <!-- 上传按钮 -->
          <button
            @click="handleUploadAll"
            :disabled="selectedFiles.length === 0 || isUploading || isFull"
            class="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <template v-if="isUploading">
              <LoaderIcon class="w-4 h-4 inline mr-1 animate-spin" />
              {{ t('delivery.upload.uploading') }} ({{ uploadProgress }}%)
            </template>
            <template v-else>
              <UploadCloudIcon class="w-5 h-5 inline mr-1" />
              {{ t('delivery.upload.submit') }}
            </template>
          </button>

          <!-- 上传成功提示 -->
          <div v-if="uploadSuccess" class="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
            <p class="text-sm text-green-700 dark:text-green-300">{{ t('delivery.upload.success') }}</p>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-else-if="isLoading" class="text-center py-8">
          <p class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ t('delivery.upload.loading') }}
          </p>
        </div>

        <!-- 未找到 -->
        <div v-else class="text-center py-8">
          <p class="text-sm text-red-500">{{ t('delivery.upload.notFound') }}</p>
        </div>

        <div class="mt-6 text-center">
          <router-link to="/" class="text-sm font-medium transition-colors" :class="[isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700']">
            {{ t('collection.submit.backToHome') }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import FileUploadArea from '@/components/common/FileUploadArea.vue'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { useFileDataStore } from '@/stores/fileData'
import { STORAGE_KEYS } from '@/constants'
import { DeliveryService } from '@/services/delivery'
import { useCollectionWebSocket } from '@/composables/useCollectionWebSocket'
import { getStorageUnit } from '@/utils/convert'
import { UploadCloudIcon, LoaderIcon, CheckCircleIcon } from 'lucide-vue-next'
import type { DeliveryPageInfo } from '@/types/collection'
import type { SentFileRecord } from '@/types'

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const alertStore = useAlertStore()
const configStore = useConfigStore()
const fileDataStore = useFileDataStore()
const config = computed(() => configStore.config)

const deliveryCode = computed(() => (route.params.code as string) || '')
const deliveryInfo = ref<DeliveryPageInfo | null>(null)
const isLoading = ref(true)
const uploaderName = ref(loadNickname())
const selectedFiles = ref<File[]>([])
const isUploading = ref(false)
const uploadSuccess = ref(false)

// 已上传成功的文件记录
interface UploadedFileInfo {
  filename: string
  size: number
  uploadedAt: string
}
const uploadedFiles = ref<UploadedFileInfo[]>([])

// 上传历史持久化
interface UploadHistoryEntry {
  code: string
  files: UploadedFileInfo[]
}
function loadUploadHistory(code: string): UploadedFileInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELIVERY_UPLOAD_HISTORY)
    if (!raw) return []
    const all: UploadHistoryEntry[] = JSON.parse(raw)
    const entry = all.find(e => e.code === code)
    return entry?.files || []
  } catch { return [] }
}
function saveUploadHistory(code: string, files: UploadedFileInfo[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELIVERY_UPLOAD_HISTORY)
    const all: UploadHistoryEntry[] = raw ? JSON.parse(raw) : []
    const idx = all.findIndex(e => e.code === code)
    if (idx >= 0) {
      all[idx].files = files
    } else {
      all.push({ code, files })
    }
    // 最多保留 20 个投件码的历史
    if (all.length > 20) all.splice(0, all.length - 20)
    localStorage.setItem(STORAGE_KEYS.DELIVERY_UPLOAD_HISTORY, JSON.stringify(all))
  } catch { /* ignore */ }
}

// 正在上传中的文件进度
interface UploadingItem {
  id: number
  filename: string
  progress: number
}
const uploadingList = ref<UploadingItem[]>([])
let uploadingIdCounter = 0
const overallProgress = ref(0)

// 总体进度
const uploadProgress = computed(() => {
  if (uploadingList.value.length === 0) return Math.round(overallProgress.value)
  const total = uploadingList.value.reduce((sum, u) => sum + u.progress, 0)
  return Math.round(total / uploadingList.value.length)
})

// 当前文件数（已有 + 已上传 + 正在上传）
const currentFileCount = computed(
  () => (deliveryInfo.value?.file_count || 0) + uploadedFiles.value.length + uploadingList.value.length
)
const isFull = computed(() => {
  if (!deliveryInfo.value) return false
  return currentFileCount.value >= deliveryInfo.value.max_files
})

const maxFileSizeText = computed(() => getStorageUnit(config.value.uploadSize))
const uploadDescription = computed(() => {
  const parts = [t('delivery.upload.fileDescription'), t('delivery.upload.maxFileSize', { size: maxFileSizeText.value })]
  if (config.value.uploadCount > 0) {
    parts.push(t('delivery.upload.rateLimit', { count: config.value.uploadCount, minute: config.value.uploadMinute }))
  }
  return parts.join('，')
})

// WebSocket 连接（用于向收件箱页面广播上传进度）
const { connect: connectWS, disconnect: disconnectWS, send: wsSend } = useCollectionWebSocket()

function sendWSProgress(filename: string, progress: number, uploader: string) {
  wsSend({
    type: 'file_progress',
    filename,
    progress,
    uploader,
  })
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/** 检查单个文件大小 */
const checkFileSize = (file: File): boolean => {
  if (config.value.uploadSize > 0 && file.size > config.value.uploadSize) {
    alertStore.showAlert(t('send.messages.fileSizeExceeded', { size: maxFileSizeText.value }), 'error')
    return false
  }
  return true
}

/** 检查所有文件是否超出限制 */
const checkFilesSize = (): boolean => {
  for (const f of selectedFiles.value) {
    if (!checkFileSize(f)) return false
  }
  if (deliveryInfo.value) {
    const remainingSlots = deliveryInfo.value.max_files - currentFileCount.value
    if (selectedFiles.value.length > remainingSlots) {
      alertStore.showAlert(t('delivery.upload.exceedsCapacity', { remaining: remainingSlots }), 'error')
      return false
    }
  }
  return true
}

const handleFilesSelected = (files: File[]) => {
  const maxSendFiles = config.value.maxSendFiles || 20
  const uploadCount = config.value.uploadCount || 0
  const validFiles = files.filter(f => checkFileSize(f))

  // 收件箱剩余容量
  let collectionRemaining = Infinity
  if (deliveryInfo.value) {
    collectionRemaining = deliveryInfo.value.max_files - currentFileCount.value - selectedFiles.value.length
  }

  // 取全局限制、限流窗口限制和收件箱限制的较小值
  const globalMax = uploadCount > 0 ? Math.min(maxSendFiles, uploadCount) : maxSendFiles
  const maxAllowed = Math.min(globalMax - selectedFiles.value.length, collectionRemaining)

  if (validFiles.length > maxAllowed) {
    if (maxAllowed <= 0) {
      if (collectionRemaining <= 0) {
        alertStore.showAlert(t('delivery.upload.boxFull'), 'error')
      } else {
        alertStore.showAlert(t('delivery.upload.maxFilesExceeded', { max: globalMax }), 'error')
      }
      return
    }
    selectedFiles.value = [...selectedFiles.value, ...validFiles.slice(0, maxAllowed)]
    alertStore.showAlert(t('delivery.upload.maxFilesExceeded', { max: Math.min(globalMax, deliveryInfo.value?.max_files || globalMax) }), 'warning')
  } else {
    selectedFiles.value = [...selectedFiles.value, ...validFiles]
  }
}

const handleFilesDropped = (event: DragEvent) => {
  if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) return
  const files = Array.from(event.dataTransfer.files)
  handleFilesSelected(files)
}

const removeFile = (idx: number) => {
  selectedFiles.value.splice(idx, 1)
}

// 昵称管理
function generateNickname(): string {
  const adjectives = ['快乐的', '聪明的', '勇敢的', '可爱的', '温柔的', '阳光的', '活泼的', '淡定的']
  const nouns = ['小熊', '小猫', '小狗', '小兔', '小鸟', '小鱼', '小虎', '小龙']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}${noun}${num}`
}

function loadNickname(): string {
  const cached = localStorage.getItem(STORAGE_KEYS.UPLOADER_NICKNAME)
  if (cached) return cached
  const name = generateNickname()
  localStorage.setItem(STORAGE_KEYS.UPLOADER_NICKNAME, name)
  return name
}

function saveNickname() {
  const name = uploaderName.value.trim()
  if (name) {
    localStorage.setItem(STORAGE_KEYS.UPLOADER_NICKNAME, name)
  }
}

const handleUploadAll = async () => {
  if (selectedFiles.value.length === 0 || !deliveryCode.value || !checkFilesSize()) return

  // 昵称必填校验
  if (!uploaderName.value.trim()) {
    alertStore.showAlert(t('delivery.upload.nicknameRequired'), 'error')
    return
  }
  saveNickname()

  // 限流检查：选择文件数不能超过限流窗口允许的数量
  if (config.value.uploadCount > 0 && selectedFiles.value.length > config.value.uploadCount) {
    alertStore.showAlert(t('delivery.upload.rateLimitExceeded', { count: config.value.uploadCount, minute: config.value.uploadMinute }), 'error')
    return
  }

  isUploading.value = true
  overallProgress.value = 0
  uploadSuccess.value = false

  // 建立 WebSocket 连接用于广播进度
  if (deliveryCode.value) connectWS(deliveryCode.value, uploaderName.value || '')

  try {
    const filesToUpload = [...selectedFiles.value]
    selectedFiles.value = []

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]

      // 检查是否已满
      if (deliveryInfo.value && currentFileCount.value >= deliveryInfo.value.max_files) {
        alertStore.showAlert(t('delivery.upload.boxFull'), 'error')
        break
      }

      const upItemId = ++uploadingIdCounter
      const upItem: UploadingItem = { id: upItemId, filename: file.name, progress: 0 }
      uploadingList.value.push(upItem)

      try {
        const res = await DeliveryService.uploadFile(
          deliveryCode.value,
          file,
          uploaderName.value,
          ({ percentage }) => {
            const item = uploadingList.value.find(u => u.id === upItemId)
            if (item) item.progress = percentage
            overallProgress.value = ((i + percentage / 100) / filesToUpload.length) * 100
            sendWSProgress(file.name, percentage, uploaderName.value || '匿名')
          }
        )

        if (res.code === 200) {
          const uploadedAt = new Date().toLocaleString()
          uploadedFiles.value.push({ filename: file.name, size: file.size, uploadedAt })
          uploadingList.value = uploadingList.value.filter(u => u.id !== upItemId)
          // 注意：currentFileCount 已通过 uploadedFiles.length 自动 +1，
          // 此处不再手动 deliveryInfo.file_count += 1，否则会导致重复计数
          // （file_count 是后端初始值，uploadedFiles 是本次会话新增，两者相加即为总数）
          // 持久化上传历史
          saveUploadHistory(deliveryCode.value, uploadedFiles.value)
        } else {
          uploadingList.value = uploadingList.value.filter(u => u.id !== upItemId)
          alertStore.showAlert(t('delivery.upload.failed'), 'error')
        }
      } catch {
        uploadingList.value = uploadingList.value.filter(u => u.id !== upItemId)
        alertStore.showAlert(t('delivery.upload.failed'), 'error')
      }
    }

    if (uploadedFiles.value.length > 0) {
      uploadSuccess.value = true
      alertStore.showAlert(t('delivery.upload.success'), 'success')

      // 保存投件记录到发件记录
      const totalSize = uploadedFiles.value.reduce((sum, f) => sum + f.size, 0)
      const deliveryRecord: SentFileRecord = {
        id: Date.now(),
        filename: t('records.deliveryFilename', { count: uploadedFiles.value.length }),
        date: new Date().toISOString().split('T')[0],
        size: formatSize(totalSize),
        expiration: '',
        retrieveCode: deliveryCode.value,
        type: 'multiFile',
        isDelivery: true,
        collectionTitle: deliveryInfo.value?.title || '',
        fileCount: uploadedFiles.value.length,
        isMultiFile: uploadedFiles.value.length > 1,
        // 保存已上传文件列表，便于在记录详情中查看
        files: uploadedFiles.value.map(f => ({ name: f.filename, size: f.size, uploadTime: f.uploadedAt }))
      }
      fileDataStore.addShareDataRecord(deliveryRecord)
    }
  } finally {
    isUploading.value = false
    overallProgress.value = 0
    disconnectWS()
  }
}

onMounted(async () => {
  if (!deliveryCode.value) {
    isLoading.value = false
    return
  }
  // 加载历史上传记录
  uploadedFiles.value = loadUploadHistory(deliveryCode.value)
  try {
    const res = await DeliveryService.getDeliveryPage(deliveryCode.value)
    if (res.code === 200 && res.detail) {
      deliveryInfo.value = res.detail
    }
  } catch {
    // not found
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  // useCollectionWebSocket 已在内部自动断开
})

const toHome = () => {
  router.push('/')
}
</script>
