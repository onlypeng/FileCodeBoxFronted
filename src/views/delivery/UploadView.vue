<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div
      class="rounded-3xl shadow-2xl overflow-hidden border w-full max-w-md transition-colors duration-300"
      :class="[
        isDarkMode
          ? 'bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border-gray-700'
          : 'bg-white border-gray-200'
      ]"
    >
      <div class="p-8">
        <!-- 返回首页 -->
        <button
          @click="toHome"
          class="flex items-center gap-1.5 text-sm font-medium transition-colors duration-300"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600']"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          {{ t('delivery.upload.backToHome') }}
        </button>

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

          <!-- G5 断点续传：分片上传失败的会话（可重试 / 放弃） -->
          <div v-if="failedChunkUploads.length > 0" class="space-y-1.5">
            <p class="text-xs font-medium" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']">
              {{ t('delivery.upload.failedTitle') }}
            </p>
            <div
              v-for="f in failedChunkUploads"
              :key="'fail-' + f.id"
              class="p-2 rounded border border-amber-200 dark:border-amber-800"
              :class="[isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50']"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs truncate flex-1" :class="[isDarkMode ? 'text-amber-300' : 'text-amber-700']">{{ f.filename }}</span>
                <button
                  @click="retryFailedUpload(f)"
                  :disabled="isUploading"
                  class="text-xs px-2 py-0.5 rounded bg-indigo-500 text-white disabled:opacity-50"
                >{{ t('delivery.upload.retry') }}</button>
                <button
                  @click="discardFailedUpload(f)"
                  class="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600"
                >{{ t('delivery.upload.discard') }}</button>
              </div>
              <p class="text-[10px] mt-1 opacity-70 truncate" :title="f.error">{{ f.error }}</p>
            </div>
          </div>

          <!-- 上传按钮 -->
          <button
            @click="handleUploadAll"
            :disabled="selectedFiles.length === 0 || isUploading || isFull"
            class="btn-primary-lg w-full"
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

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 投件页：访客凭投件码上传文件，无需登录。
 *
 * ## 为什么历史与昵称存在 localStorage
 * 投件码是公开入口、没有账号体系，服务端不会为某个访客保存"我传过哪些文件/我叫什么"。
 * 上传历史按 code 分组落在本地，纯展示用；真正的权限由服务端校验投件码，
 * 前端不做也不该做任何鉴权判断。
 *
 * ## 边界
 * 超过 50MB 走分片（单请求易超时/吃内存）；秒传用的 hash 来自 file-processing，
 * 只是轻量指纹不是加密摘要。上传历史读不到或解析失败时按空处理。
 */
import { inject, ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeftIcon, UploadCloudIcon, LoaderIcon, CheckCircleIcon } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import FileUploadArea from '@/components/common/FileUploadArea.vue'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { useFileDataStore } from '@/stores/fileData'
import { STORAGE_KEYS } from '@/constants'
import { formatFileSize as formatSize, getErrorMessage } from '@/utils/common'
import { useCollectionWebSocket, useDelivery } from '@/composables'
import { calculateFileHash } from '@/utils/file-processing'
import { readPreference, writePreference, readJsonPreference } from '@/utils/preference-storage'
import { getStorageUnit } from '@/utils/convert'
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
const delivery = useDelivery()

const deliveryCode = computed(() => (route.params.code as string) || '')
const deliveryInfo = ref<DeliveryPageInfo | null>(null)
const isLoading = ref(true)
const uploaderName = ref(loadNickname())
const selectedFiles = ref<File[]>([])
const isUploading = ref(false)
const uploadSuccess = ref(false)

/** 大文件走分片上传的阈值（超过则分片，避免单请求内存/超时问题） */
const CHUNK_UPLOAD_THRESHOLD = 50 * 1024 * 1024

// 已上传成功的文件记录
interface UploadedFileInfo {
  filename: string
  size: number
  uploadedAt: string
}
const uploadedFiles = ref<UploadedFileInfo[]>([])

/**
 * G5 断点续传：分片上传失败时不再立即 cancel，而是把「已建会话 + 已收分片」
 * 暂存在这里，本页内可点「重试」复用同一 upload_id 从断点继续；「放弃」或离开
 * 页面时才 cancel 回滚投递次数。刷新页面后 File 对象不可恢复，故重试仅限当前页。
 */
interface FailedChunkUpload {
  id: number
  filename: string
  size: number
  file: File
  uploadId: string
  uploadedChunks: number[]
  chunkSize: number
  error: string
}
const failedChunkUploads = ref<FailedChunkUpload[]>([])
let failedIdCounter = 0
/** 单个分片瞬时失败的重试次数：避免一次网络抖动让整个大文件从头再来 */
const CHUNK_RETRY_LIMIT = 3

// 上传历史持久化
interface UploadHistoryEntry {
  code: string
  files: UploadedFileInfo[]
}
function loadUploadHistory(code: string): UploadedFileInfo[] {
  const all = readJsonPreference<UploadHistoryEntry[]>(STORAGE_KEYS.DELIVERY_UPLOAD_HISTORY, [])
  const entry = all.find(e => e.code === code)
  return entry?.files || []
}
function saveUploadHistory(code: string, files: UploadedFileInfo[]) {
  const all = readJsonPreference<UploadHistoryEntry[]>(STORAGE_KEYS.DELIVERY_UPLOAD_HISTORY, [])
  const idx = all.findIndex(e => e.code === code)
  if (idx >= 0) {
    all[idx].files = files
  } else {
    all.push({ code, files })
  }
  // 最多保留 20 个投件码的历史
  if (all.length > 20) all.splice(0, all.length - 20)
  writePreference(STORAGE_KEYS.DELIVERY_UPLOAD_HISTORY, all)
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

// 当前文件数：file_count 是服务端权威总数（已包含本机历史上传），uploadedFiles
// 只是它的本机子集，仅用于「我传过哪些」的展示，绝不能再叠加一次——否则成功一次
// 净 +2，批量上传会在循环里的容量判断提前 break，后续选中文件静默不上传。
// 只需叠加「正在上传、尚未落库」的数量。
const currentFileCount = computed(
  () => (deliveryInfo.value?.file_count || 0) + uploadingList.value.length
)
const isFull = computed(() => {
  if (!deliveryInfo.value) return false
  return currentFileCount.value >= deliveryInfo.value.max_files
})

const maxFileSizeText = computed(() => getStorageUnit(config.value.uploadSize))
const uploadDescription = computed(() => {
  const parts = [t('delivery.upload.fileDescription'), t('delivery.upload.maxFileSize', { size: maxFileSizeText.value })]
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
  const validFiles = files.filter(f => checkFileSize(f))

  // 收件箱剩余容量
  let collectionRemaining = Infinity
  if (deliveryInfo.value) {
    collectionRemaining = deliveryInfo.value.max_files - currentFileCount.value - selectedFiles.value.length
  }

  // 取全局限制和收件箱限制的较小值
  const globalMax = maxSendFiles
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
  const cached = readPreference(STORAGE_KEYS.UPLOADER_NICKNAME, '')
  if (cached) return cached
  const name = generateNickname()
  writePreference(STORAGE_KEYS.UPLOADER_NICKNAME, name)
  return name
}

function saveNickname() {
  const name = uploaderName.value.trim()
  if (name) {
    writePreference(STORAGE_KEYS.UPLOADER_NICKNAME, name)
  }
}

/** 计算已上传分片的字节数（用于总体进度） */
const calculateCompletedBytes = (uploadedChunks: Set<number>, chunkSize: number, fileSize: number) =>
  Array.from(uploadedChunks).reduce((total, index) => {
    const chunkStart = index * chunkSize
    const chunkEnd = Math.min((index + 1) * chunkSize, fileSize)
    return total + Math.max(0, chunkEnd - chunkStart)
  }, 0)

/**
 * 上传单个文件到收件箱：小文件直传，大文件（>50MB）分片上传。
 * 分片流程：init（占位投递次数）→ 逐个上传分片（复用 /chunk 接口）→ complete（合并创建记录）。
 *
 * G5 断点续传：传入 resume 时复用既有会话（upload_id + 已收分片），不再重新 init；
 * 单片失败自动重试 CHUNK_RETRY_LIMIT 次；整体失败时保留会话到 failedChunkUploads，
 * 由用户点「重试」续传或「放弃」回滚，不立即 cancel（否则已收分片全丢）。
 */
const uploadFileWithChunk = async (
  file: File,
  upItemId: number,
  fileIndex: number,
  totalCount: number,
  resume?: FailedChunkUpload
): Promise<{ id: number; filename: string; file_size: number; status: string }> => {
  // 分片大小：后台 uploadChunkSize（MB）→ 字节，限 1MB~100MB，兜底 5MB。
  // 续传时沿用原会话的 chunk_size，避免与已落盘分片错位。
  const chunkSizeMb = Number(config.value.uploadChunkSize) || 0
  const chunkSize = resume?.chunkSize ?? Math.min(
    100 * 1024 * 1024,
    Math.max(1 * 1024 * 1024, chunkSizeMb > 0 ? chunkSizeMb * 1024 * 1024 : 5 * 1024 * 1024)
  )
  const onItemProgress = (percentage: number) => {
    const item = uploadingList.value.find(u => u.id === upItemId)
    if (item) item.progress = percentage
    overallProgress.value = ((fileIndex + percentage / 100) / totalCount) * 100
    sendWSProgress(file.name, percentage, uploaderName.value || '匿名')
  }

  // 小文件：走原有直传接口（续传项必为大文件，不会走到这里）
  if (!resume && file.size < CHUNK_UPLOAD_THRESHOLD) {
    const res = await delivery.uploadFile(deliveryCode.value, file, uploaderName.value, ({ percentage }) => {
      onItemProgress(percentage)
    })
    if (res.code !== 200 || !res.detail) {
      throw new Error(res.message || '上传失败')
    }
    return res.detail
  }

  // 大文件：新建会话或复用失败会话
  let uploadId: string
  let uploadedChunks: Set<number>
  if (resume) {
    uploadId = resume.uploadId
    uploadedChunks = new Set<number>(resume.uploadedChunks)
  } else {
    const fileHash = await calculateFileHash(file)
    const initRes = await delivery.initChunkUpload({
      delivery_code: deliveryCode.value,
      uploader_name: uploaderName.value,
      file_name: file.name,
      file_size: file.size,
      chunk_size: chunkSize,
      file_hash: fileHash
    })
    if (initRes.code !== 200 || !initRes.detail?.upload_id) {
      throw new Error(initRes.message || '分片上传初始化失败')
    }
    uploadId = initRes.detail.upload_id
    uploadedChunks = new Set<number>(initRes.detail.uploaded_chunks || [])
  }
  const chunks = Math.ceil(file.size / chunkSize)

  try {
    for (let index = 0; index < chunks; index++) {
      if (uploadedChunks.has(index)) continue
      const start = index * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunkBlob = file.slice(start, end)
      // 瞬时网络抖动不该让整个大文件重来：单片失败重试若干次（退避等待）
      let lastError: unknown
      let uploaded = false
      for (let attempt = 0; attempt < CHUNK_RETRY_LIMIT; attempt++) {
        try {
          const chunkRes = await delivery.uploadChunk(uploadId, index, new Blob([chunkBlob], { type: file.type }), (progress) => {
            const completedBytes = calculateCompletedBytes(uploadedChunks, chunkSize, file.size)
            const percentage = Math.round(((completedBytes + progress.loaded) * 100) / file.size)
            onItemProgress(Math.min(percentage, 99))
          })
          if (chunkRes.code !== 200) {
            throw new Error(chunkRes.message || `分片 ${index} 上传失败`)
          }
          uploaded = true
          break
        } catch (e) {
          lastError = e
          if (attempt < CHUNK_RETRY_LIMIT - 1) {
            await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
          }
        }
      }
      if (!uploaded) throw lastError || new Error(`分片 ${index} 上传失败`)
      uploadedChunks.add(index)
    }

    const completeRes = await delivery.completeChunkUpload(deliveryCode.value, uploadId, uploaderName.value)
    if (completeRes.code !== 200 || !completeRes.detail) {
      throw new Error(completeRes.message || '分片合并失败')
    }
    return completeRes.detail
  } catch (error) {
    // 保留会话供本页内断点续传：不 cancel（否则已收分片全丢、投递次数白占一次）
    if (!failedChunkUploads.value.some(f => f.uploadId === uploadId)) {
      failedChunkUploads.value.push({
        id: ++failedIdCounter,
        filename: file.name,
        size: file.size,
        file,
        uploadId,
        uploadedChunks: [...uploadedChunks],
        chunkSize,
        error: getErrorMessage(error, t('delivery.upload.failed'))
      })
    }
    throw error
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
        const res = await uploadFileWithChunk(file, upItemId, i, filesToUpload.length)

        if (res.status === 'completed') {
          const uploadedAt = new Date().toLocaleString()
          uploadedFiles.value.push({ filename: file.name, size: file.size, uploadedAt })
          uploadingList.value = uploadingList.value.filter(u => u.id !== upItemId)
          // 更新当前计数
          if (deliveryInfo.value) {
            deliveryInfo.value.file_count += 1
          }
          // 持久化上传历史
          saveUploadHistory(deliveryCode.value, uploadedFiles.value)
        } else {
          uploadingList.value = uploadingList.value.filter(u => u.id !== upItemId)
          alertStore.showAlert(t('delivery.upload.failed'), 'error')
        }
      } catch (error) {
        uploadingList.value = uploadingList.value.filter(u => u.id !== upItemId)
        // C3：把服务端返回的真实原因带出来，别再用笼统的「上传失败」吞掉
        alertStore.showAlert(getErrorMessage(error, t('delivery.upload.failed')), 'error')
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
        isMultiFile: uploadedFiles.value.length > 1
      }
      fileDataStore.addShareDataRecord(deliveryRecord)
    }
  } finally {
    isUploading.value = false
    overallProgress.value = 0
    disconnectWS()
  }
}

/** G5：复用失败会话从断点续传（不重新 init、不重复占位投递次数） */
const retryFailedUpload = async (failed: FailedChunkUpload) => {
  if (isUploading.value) return
  if (deliveryInfo.value && currentFileCount.value >= deliveryInfo.value.max_files) {
    alertStore.showAlert(t('delivery.upload.boxFull'), 'error')
    return
  }
  failedChunkUploads.value = failedChunkUploads.value.filter(f => f.id !== failed.id)
  isUploading.value = true
  overallProgress.value = 0
  const upItemId = ++uploadingIdCounter
  uploadingList.value.push({ id: upItemId, filename: failed.filename, progress: 0 })
  try {
    const res = await uploadFileWithChunk(failed.file, upItemId, 0, 1, failed)
    if (res.status === 'completed') {
      uploadedFiles.value.push({ filename: failed.filename, size: failed.size, uploadedAt: new Date().toLocaleString() })
      if (deliveryInfo.value) deliveryInfo.value.file_count += 1
      saveUploadHistory(deliveryCode.value, uploadedFiles.value)
      uploadSuccess.value = true
      alertStore.showAlert(t('delivery.upload.success'), 'success')
    }
  } catch (error) {
    alertStore.showAlert(getErrorMessage(error, t('delivery.upload.failed')), 'error')
  } finally {
    uploadingList.value = uploadingList.value.filter(u => u.id !== upItemId)
    isUploading.value = false
    overallProgress.value = 0
  }
}

/** G5：放弃失败会话 → cancel 回滚投递次数并清理分片 */
const discardFailedUpload = async (failed: FailedChunkUpload) => {
  failedChunkUploads.value = failedChunkUploads.value.filter(f => f.id !== failed.id)
  try {
    await delivery.cancelChunkUpload(deliveryCode.value, failed.uploadId)
  } catch {
    /* 会话已被后台清理时忽略 */
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
    const res = await delivery.getDeliveryPage(deliveryCode.value)
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
  // 离开页面：回滚仍保留的失败会话，避免占着投递次数；刷新后 File 不可恢复，
  // 断点续传只在当前页有效，这里不做跨刷新持久化。
  for (const f of failedChunkUploads.value) {
    delivery.cancelChunkUpload(deliveryCode.value, f.uploadId).catch(() => {})
  }
  failedChunkUploads.value = []
})

const toHome = () => {
  router.push('/')
}
</script>
