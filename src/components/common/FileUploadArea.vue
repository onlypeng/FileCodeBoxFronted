<template>
  <div
    class="rounded-xl border-2 border-dashed transition-all duration-300 group cursor-pointer relative"
    :class="[
      isDarkMode
        ? 'bg-gray-800 bg-opacity-50 border-gray-600 hover:border-indigo-500'
        : 'bg-gray-100 border-gray-300 hover:border-indigo-500',
      statusClass
    ]"
    @click="triggerFileUpload"
    @dragover.prevent
    @drop.prevent="handleFileDrop"
    @paste.prevent="handlePaste"
  >
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      @change="handleFileUpload"
      :accept="acceptedTypes"
      :disabled="isUploading"
      multiple
      :directory="directory"
      :webkitdirectory="directory"
    />
    <div class="absolute inset-0 w-full h-full" v-if="progress > 0">
      <BorderProgressBar :progress="progress" />
    </div>

    <!-- 上传区域主体 -->
    <div class="flex flex-col items-center justify-center" :class="[compact ? 'p-5' : 'p-8']">
      <!-- 上传状态图标 -->
      <component
        :is="statusIcon"
        :class="[compact ? 'w-12 h-12' : 'w-16 h-16', 'transition-colors duration-300', statusIconClass]"
      />

      <!-- 文件名或占位文本 -->
      <p
        :class="[
          'text-sm transition-colors duration-300 w-full text-center',
          compact ? 'mt-3' : 'mt-4',
          isDarkMode
            ? 'text-gray-400 group-hover:text-indigo-400'
            : 'text-gray-600 group-hover:text-indigo-600'
        ]"
      >
        <span v-if="selectedFiles && selectedFiles.length > 1" class="block">
          {{ `已选择 ${selectedFiles.length} 个文件` }}
        </span>
        <span v-else class="block truncate">
          {{ displayText }}
        </span>
      </p>

      <!-- 状态描述或默认描述 -->
      <p :class="['text-xs', compact ? 'mt-1.5' : 'mt-2', statusDescriptionClass]">
        {{ statusDescription }}
      </p>

      <!-- 进度详情（上传中显示） -->
      <div v-if="isUploading && showProgressDetails" class="mt-3 w-full">
        <div
          class="flex justify-between text-xs mb-1"
          :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']"
        >
          <span>{{ formatBytes(uploadedBytes) }} / {{ formatBytes(totalBytes) }}</span>
          <span>{{ progress }}%</span>
        </div>
      </div>

      <!-- 错误重试按钮 -->
      <button
        v-if="hasError && allowRetry"
        @click.stop="handleRetry"
        class="mt-3 px-4 py-2 text-sm rounded-lg transition-colors duration-200"
        :class="[
          isDarkMode
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-indigo-500 hover:bg-indigo-600 text-white'
        ]"
      >
        {{ retryText }}
      </button>
    </div>

    <!-- 已选文件列表 -->
    <div
      v-if="selectedFiles && selectedFiles.length > 0"
      class="border-t border-dashed px-3 py-2 space-y-1"
      :class="[isDarkMode ? 'border-gray-600' : 'border-gray-300']"
      @click.stop
    >
      <div
        v-for="(f, idx) in selectedFiles"
        :key="idx"
        class="flex items-center justify-between p-1.5 rounded text-xs"
        :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-white/50']"
      >
        <span class="truncate flex-1 mr-2" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ f.name }}</span>
        <span :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ formatBytes(f.size) }}</span>
        <button type="button" @click.stop="emit('fileRemove', idx)" class="ml-2 text-red-400 hover:text-red-600 transition-colors">
          <XIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { UploadCloudIcon, CheckCircleIcon, XCircleIcon, LoaderIcon, XIcon } from 'lucide-vue-next'
import BorderProgressBar from './BorderProgressBar.vue'
import { useI18n } from 'vue-i18n'
import { useInjectedDarkMode } from '@/composables'
import { formatFileSize as formatBytes } from '@/utils/common'

const { t } = useI18n()

type UploadStatusType = 'idle' | 'uploading' | 'success' | 'error' | 'initializing' | 'confirming'

interface Props {
  selectedFile?: File | null
  selectedFiles?: File[]
  progress?: number
  placeholder?: string
  description?: string
  acceptedTypes?: string
  /** 上传状态 */
  uploadStatus?: UploadStatusType
  /** 已上传字节数 */
  uploadedBytes?: number
  /** 总字节数 */
  totalBytes?: number
  /** 错误消息 */
  errorMessage?: string
  /** 是否允许重试 */
  allowRetry?: boolean
  /** 重试按钮文本 */
  retryText?: string
  /** 是否显示进度详情 */
  showProgressDetails?: boolean
  /** 是否支持选择目录（文件夹）上传 */
  directory?: boolean
  /** 紧凑布局（减少内边距与图标尺寸，用于发件页并排布局） */
  compact?: boolean
}

interface Emits {
  fileSelected: [file: File]
  filesSelected: [files: File[]]
  fileDrop: [event: DragEvent]
  fileRemove: [index: number]
  retry: []
  paste: [event: ClipboardEvent]
}

const props = withDefaults(defineProps<Props>(), {
  selectedFile: null,
  selectedFiles: () => [],
  progress: 0,
  placeholder: '',
  description: '',
  acceptedTypes: '*',
  uploadStatus: 'idle',
  uploadedBytes: 0,
  totalBytes: 0,
  errorMessage: '',
  allowRetry: true,
  retryText: '重试',
  showProgressDetails: true,
  directory: false,
  compact: false
})

const emit = defineEmits<Emits>()

const isDarkMode = useInjectedDarkMode()

// 使用computed属性处理多语言文本
const placeholderText = computed(() => props.placeholder || t('send.uploadArea.placeholder'))
const descriptionText = computed(() => props.description || t('send.uploadArea.description'))
const fileInput = ref<HTMLInputElement | null>(null)

const isUploading = computed(() => {
  return ['uploading', 'initializing', 'confirming'].includes(props.uploadStatus)
})

const hasError = computed(() => props.uploadStatus === 'error')

const isSuccess = computed(() => props.uploadStatus === 'success')

const displayText = computed(() => {
  if (props.selectedFiles && props.selectedFiles.length === 1) {
    return props.selectedFiles[0].name
  }
  if (props.selectedFiles && props.selectedFiles.length > 1) {
    return `已选择 ${props.selectedFiles.length} 个文件`
  }
  if (props.selectedFile) {
    return props.selectedFile.name
  }
  return placeholderText.value
})

const statusIcon = computed(() => {
  if (isUploading.value) return LoaderIcon
  if (isSuccess.value) return CheckCircleIcon
  if (hasError.value) return XCircleIcon
  return UploadCloudIcon
})

const statusIconClass = computed(() => {
  if (isUploading.value) {
    return isDarkMode.value ? 'text-indigo-400 animate-spin' : 'text-indigo-600 animate-spin'
  }
  if (isSuccess.value) {
    return isDarkMode.value ? 'text-green-400' : 'text-green-600'
  }
  if (hasError.value) {
    return isDarkMode.value ? 'text-red-400' : 'text-red-600'
  }
  return isDarkMode.value
    ? 'text-gray-400 group-hover:text-indigo-400'
    : 'text-gray-600 group-hover:text-indigo-600'
})

const statusClass = computed(() => {
  if (hasError.value) {
    return isDarkMode.value ? 'border-red-500/50' : 'border-red-300'
  }
  if (isSuccess.value) {
    return isDarkMode.value ? 'border-green-500/50' : 'border-green-300'
  }
  return ''
})

const statusDescription = computed(() => {
  if (hasError.value && props.errorMessage) {
    return props.errorMessage
  }
  if (props.uploadStatus === 'initializing') {
    return '正在初始化上传...'
  }
  if (props.uploadStatus === 'uploading') {
    return '正在上传文件...'
  }
  if (props.uploadStatus === 'confirming') {
    return '正在确认上传...'
  }
  if (isSuccess.value) {
    return '上传成功！'
  }
  return descriptionText.value
})

const statusDescriptionClass = computed(() => {
  if (hasError.value) {
    return isDarkMode.value ? 'text-red-400' : 'text-red-500'
  }
  if (isSuccess.value) {
    return isDarkMode.value ? 'text-green-400' : 'text-green-500'
  }
  return isDarkMode.value ? 'text-gray-500' : 'text-gray-400'
})

const triggerFileUpload = () => {
  // 上传中或成功状态下不允许重新选择文件
  if (isUploading.value) return
  fileInput.value?.click()
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    if (files.length === 1) {
      emit('fileSelected', files[0])
    } else {
      emit('filesSelected', Array.from(files))
    }
  }
  // 重置 input 值，允许选择同名文件
  target.value = ''
}

const handleFileDrop = (event: DragEvent) => {
  // 上传中不允许拖放
  if (isUploading.value) return
  emit('fileDrop', event)
}

const handleRetry = () => {
  emit('retry')
}

const handlePaste = (event: ClipboardEvent) => {
  emit('paste', event)
}
</script>
