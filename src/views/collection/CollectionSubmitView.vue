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
        <PageHeader :title="t('collection.submit.title')" @title-click="toHome" />

        <!-- 输入投件码 -->
        <div v-if="!collectionStore.deliveryCode" class="space-y-4">
          <FormInput
            v-model="inputCode"
            :label="t('collection.submit.codeLabel')"
            :placeholder="t('collection.submit.codePlaceholder')"
            :maxlength="6"
          />
          <button
            @click="lookupDelivery"
            :disabled="inputCode.length !== 6 || isLooking"
            class="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLooking ? t('collection.submit.looking') : t('collection.submit.lookup') }}
          </button>
        </div>

        <!-- 投递文件 -->
        <div v-else class="space-y-4">
          <!-- 收件箱信息 -->
          <div class="text-center mb-2">
            <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">
              {{ collectionStore.collectionTitle || t('collection.submit.defaultTitle') }}
            </p>
            <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ t('collection.submit.fileCount', { count: currentFileCount, max: collectionStore.collectionMaxFiles }) }}
              <span v-if="config.uploadSize > 0" class="ml-1">| {{ t('collection.submit.maxFileSize', { size: maxFileSizeText }) }}</span>
            </p>
          </div>

          <!-- 上传者昵称（必填） -->
          <div>
            <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('collection.submit.uploaderNameLabel') }} <span class="text-red-500">*</span>
            </label>
            <input
              v-model="uploaderName"
              type="text"
              :placeholder="t('collection.submit.uploaderNamePlaceholder')"
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

          <!-- 选择文件夹按钮 -->
          <input
            ref="dirInput"
            type="file"
            class="hidden"
            webkitdirectory
            directory
            multiple
            @change="handleDirSelected"
          />
          <button
            @click="dirInput?.click()"
            class="w-full py-2 px-4 rounded-lg border border-dashed text-sm transition-colors"
            :class="[isDarkMode ? 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400' : 'border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600']"
          >
            <FolderOpenIcon class="w-4 h-4 inline mr-1" />
            {{ t('collection.submit.selectFolder') }}
          </button>

          <!-- 上传中进度列表 -->
          <div v-if="uploadingList.length > 0" class="space-y-1.5">
            <p class="text-xs font-medium" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">
              {{ t('collection.submit.uploadingFiles') }}
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
              {{ t('collection.submit.uploadedFiles', { count: uploadedFiles.length }) }}
            </p>
            <div
              v-for="(f, idx) in uploadedFiles"
              :key="'done-' + idx"
              class="flex items-center justify-between p-2 rounded text-xs"
              :class="[isDarkMode ? 'bg-green-900/20' : 'bg-green-50']"
            >
              <div class="truncate flex-1 mr-2" :class="[isDarkMode ? 'text-green-300' : 'text-green-800']">{{ f.filename }}</div>
              <span :class="[isDarkMode ? 'text-green-500' : 'text-green-600']">{{ formatSize(f.size) }}</span>
              <CheckCircleIcon class="w-4 h-4 ml-2 text-green-500" />
            </div>
          </div>

          <!-- 发送按钮 -->
          <button
            @click="handleUploadAll"
            :disabled="selectedFiles.length === 0 || isUploading || isFull"
            class="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <template v-if="isUploading">
              <LoaderIcon class="w-4 h-4 inline mr-1 animate-spin" />
              {{ t('collection.submit.uploading') }} ({{ uploadProgress }}%)
            </template>
            <template v-else>{{ t('collection.submit.submit') }}</template>
          </button>

          <button
            @click="resetDelivery"
            class="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {{ t('collection.submit.changeCode') }}
          </button>
        </div>

        <div class="mt-6 text-center">
          <router-link to="/" class="text-indigo-400 hover:text-indigo-300 transition duration-300 text-sm">
            {{ t('collection.submit.backToHome') }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import FormInput from '@/components/common/FormInput.vue'
import FileUploadArea from '@/components/common/FileUploadArea.vue'
import { LoaderIcon, CheckCircleIcon, FolderOpenIcon } from 'lucide-vue-next'
import { useCollectionStore } from '@/stores/collectionStore'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { STORAGE_KEYS } from '@/constants'
import { useCollectionWebSocket } from '@/composables/useCollectionWebSocket'
import { getStorageUnit } from '@/utils/convert'

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const alertStore = useAlertStore()
const collectionStore = useCollectionStore()
const configStore = useConfigStore()
const config = computed(() => configStore.config)

const inputCode = ref('')
const uploaderName = ref(loadNickname())
const selectedFiles = ref<File[]>([])
const isLooking = ref(false)
const isUploading = ref(false)
const overallProgress = ref(0)
const dirInput = ref<HTMLInputElement | null>(null)

// 已上传成功的文件记录
interface UploadedFileInfo {
  filename: string
  size: number
}
const uploadedFiles = ref<UploadedFileInfo[]>([])

// 正在上传中的文件进度
interface UploadingItem {
  id: number
  filename: string
  progress: number
}
const uploadingList = ref<UploadingItem[]>([])
let uploadingIdCounter = 0

// 总体进度（取所有上传中的最大值）
const uploadProgress = computed(() => {
  if (uploadingList.value.length === 0) return Math.round(overallProgress.value)
  const total = uploadingList.value.reduce((sum, u) => sum + u.progress, 0)
  return Math.round(total / uploadingList.value.length)
})

// 当前文件数（已有 + 待上传 + 正在上传）
const currentFileCount = computed(
  () => (collectionStore.deliveryInfo?.file_count || 0) + uploadedFiles.value.length + uploadingList.value.length
)
const isFull = computed(() => currentFileCount.value >= collectionStore.collectionMaxFiles)
const maxFileSizeText = computed(() => getStorageUnit(config.value.uploadSize))
const uploadDescription = computed(() => {
  const parts = [t('collection.submit.fileDescription'), t('collection.submit.maxFileSize', { size: maxFileSizeText.value })]
  if (config.value.uploadCount > 0) {
    parts.push(t('collection.submit.rateLimit', { count: config.value.uploadCount, minute: config.value.uploadMinute }))
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
  // 检查是否超过收件箱容量
  const remainingSlots = collectionStore.collectionMaxFiles - currentFileCount.value
  if (selectedFiles.value.length > remainingSlots) {
    alertStore.showAlert(t('collection.submit.exceedsCapacity', { remaining: remainingSlots }), 'error')
    return false
  }
  return true
}

const handleFilesSelected = (files: File[]) => {
  // 过滤掉超大文件
  const validFiles = files.filter(f => {
    if (!checkFileSize(f)) return false
    return true
  })

  const maxSendFiles = config.value.maxSendFiles || 20
  const uploadCount = config.value.uploadCount || 0
  // 收件箱剩余容量
  const collectionRemaining = collectionStore.collectionMaxFiles - currentFileCount.value - selectedFiles.value.length
  // 取全局限制、限流窗口限制和收件箱限制的较小值
  const globalMax = uploadCount > 0 ? Math.min(maxSendFiles, uploadCount) : maxSendFiles
  const maxAllowed = Math.min(globalMax - selectedFiles.value.length, collectionRemaining)

  if (validFiles.length > maxAllowed) {
    if (maxAllowed <= 0) {
      if (collectionRemaining <= 0) {
        alertStore.showAlert(t('collection.submit.boxFull'), 'error')
      } else {
        alertStore.showAlert(t('collection.submit.maxFilesExceeded', { max: globalMax }), 'error')
      }
      return
    }
    selectedFiles.value = [...selectedFiles.value, ...validFiles.slice(0, maxAllowed)]
    alertStore.showAlert(t('collection.submit.maxFilesExceeded', { max: Math.min(globalMax, collectionStore.collectionMaxFiles) }), 'warning')
  } else {
    selectedFiles.value = [...selectedFiles.value, ...validFiles]
  }
}

const handleDirSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const files = Array.from(target.files)
  const validFiles = files.filter(f => checkFileSize(f))
  if (validFiles.length > 0) {
    selectedFiles.value = [...selectedFiles.value, ...validFiles]
  }
  // 重置 input
  target.value = ''
}

const handleFilesDropped = async (event: DragEvent) => {
  if (!event.dataTransfer?.items || event.dataTransfer.items.length === 0) return

  // 尝试读取目录（通过 webkitGetAsEntry）
  const items = Array.from(event.dataTransfer.items)
  const allFiles: File[] = []

  for (const item of items) {
    const entry = item.webkitGetAsEntry?.()
    if (entry?.isDirectory) {
      // 递归读取目录中的所有文件
      const dirFiles = await readDirectoryRecursively(entry as FileSystemDirectoryEntry)
      allFiles.push(...dirFiles)
    } else if (entry?.isFile) {
      const file = await getFileFromEntry(entry as FileSystemFileEntry)
      if (file) allFiles.push(file)
    } else if (item.kind === 'file') {
      // 回退：普通文件
      const file = item.getAsFile()
      if (file) allFiles.push(file)
    }
  }

  if (allFiles.length > 0) handleFilesSelected(allFiles)
}

/** 递归读取目录 */
async function readDirectoryRecursively(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
  const reader = dirEntry.createReader()
  const entries: FileSystemEntry[] = []
  // createReader.readEntries 需要多次调用才能获取所有条目
  let batch: FileSystemEntry[]
  do {
    batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
    entries.push(...batch)
  } while (batch.length > 0)

  const files: File[] = []
  for (const entry of entries) {
    if (entry.isDirectory) {
      files.push(...await readDirectoryRecursively(entry as FileSystemDirectoryEntry))
    } else {
      const file = await getFileFromEntry(entry as FileSystemFileEntry)
      if (file) files.push(file)
    }
  }
  return files
}

/** 从 FileSystemFileEntry 获取 File 对象 */
function getFileFromEntry(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise((resolve) => {
    entry.file((file) => resolve(file), () => resolve(null))
  })
}

const removeFile = (idx: number) => {
  selectedFiles.value.splice(idx, 1)
}

const lookupDelivery = async () => {
  isLooking.value = true
  try {
    await collectionStore.loadDeliveryPage(inputCode.value.toUpperCase())
    alertStore.showAlert(t('collection.submit.found'), 'success')
  } catch {
    alertStore.showAlert(t('collection.submit.notFound'), 'error')
  } finally {
    isLooking.value = false
  }
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
  if (selectedFiles.value.length === 0 || !checkFilesSize()) return

  // 昵称必填校验
  if (!uploaderName.value.trim()) {
    alertStore.showAlert(t('collection.submit.nicknameRequired'), 'error')
    return
  }
  saveNickname()

  // 限流检查
  if (config.value.uploadCount > 0 && selectedFiles.value.length > config.value.uploadCount) {
    alertStore.showAlert(t('collection.submit.rateLimitExceeded', { count: config.value.uploadCount, minute: config.value.uploadMinute }), 'error')
    return
  }

  isUploading.value = true
  overallProgress.value = 0

  // 建立 WebSocket 连接用于广播进度
  const wsCode = collectionStore.collectionCode || collectionStore.deliveryCode
  if (wsCode) connectWS(wsCode, uploaderName.value || '')

  try {
    const filesToUpload = [...selectedFiles.value]
    selectedFiles.value = []

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]

      // 检查是否已满
      if (currentFileCount.value >= collectionStore.collectionMaxFiles) {
        alertStore.showAlert(t('collection.submit.boxFull'), 'error')
        break
      }

      // 添加到上传中列表
      const upItemId = ++uploadingIdCounter
      const upItem: UploadingItem = { id: upItemId, filename: file.name, progress: 0 }
      uploadingList.value.push(upItem)

      try {
        await collectionStore.uploadFile(file, uploaderName.value, (progress) => {
          const item = uploadingList.value.find(u => u.id === upItemId)
          if (item) item.progress = progress
          overallProgress.value = ((i + progress / 100) / filesToUpload.length) * 100
          sendWSProgress(file.name, progress, uploaderName.value || '匿名')
        })

        // 上传成功，从上传中移除，加入已完成
        uploadedFiles.value.push({ filename: file.name, size: file.size })
        uploadingList.value = uploadingList.value.filter(u => u.id !== upItemId)
      } catch (err: unknown) {
        uploadingList.value = uploadingList.value.filter(u => u.id !== upItemId)
        alertStore.showAlert(
          err instanceof Error ? err.message : t('collection.submit.uploadFailed'),
          'error'
        )
      }
    }

    if (uploadedFiles.value.length > 0) {
      alertStore.showAlert(t('collection.submit.uploadSuccess'), 'success')
    }
  } finally {
    isUploading.value = false
    overallProgress.value = 0
    disconnectWS()
  }
}

const resetDelivery = () => {
  collectionStore.reset()
  inputCode.value = ''
  selectedFiles.value = []
  uploadedFiles.value = []
  uploadingList.value = []
  disconnectWS()
}

const toHome = () => router.push('/')

onUnmounted(() => {
  // useCollectionWebSocket 已在内部自动断开
})

// 如果URL中有code参数，自动加载（可能是delivery_code）
if (route.query.code) {
  inputCode.value = route.query.code as string
  lookupDelivery()
}
</script>
