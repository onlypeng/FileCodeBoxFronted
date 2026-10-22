<template>
  <div class="space-y-3">
    <!-- ========== 上传区 ==========
         未选文件时是「点击 / 拖拽」的虚线投放区；选中文件后就地展开为设置卡片，
         避免再弹一层窗口，也符合"先点上传、再设时长、最后确认"的顺序。 -->
    <div
      class="rounded-xl border-2 border-dashed transition-colors duration-200 overflow-hidden"
      :class="dropActive
        ? (isDarkMode ? 'border-indigo-400 bg-indigo-950/30' : 'border-indigo-400 bg-indigo-50')
        : (isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50/60')"
      @dragover.prevent="dropActive = true"
      @dragleave.prevent="dropActive = false"
      @drop.prevent="onDrop"
    >
      <!-- 状态一：等待选择文件 -->
      <button
        v-if="!pendingFile"
        type="button"
        :disabled="uploading"
        @click="fileRef?.click()"
        class="w-full flex flex-col items-center justify-center gap-1 py-5 transition-opacity disabled:opacity-50"
      >
        <UploadIcon
          class="w-5 h-5 mb-0.5"
          :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']"
        />
        <span
          class="text-xs font-medium"
          :class="[isDarkMode ? 'text-gray-200' : 'text-gray-700']"
        >{{ t('direct.cache.dropTitle') }}</span>
        <span
          class="text-[11px] px-4 text-center leading-snug"
          :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']"
        >{{ t('direct.cache.dropDesc') }}</span>
      </button>

      <!-- 状态二：已选文件 → 设置缓存时长并确认 -->
      <div v-else class="p-3 space-y-2.5">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            :class="[isDarkMode ? 'bg-indigo-900/40' : 'bg-indigo-100']"
          >
            <FileTextIcon class="w-4 h-4" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
          </div>
          <div class="min-w-0 flex-1">
            <p
              class="text-xs font-medium truncate"
              :class="[isDarkMode ? 'text-gray-100' : 'text-gray-900']"
            >{{ pendingFile.name }}</p>
            <p class="text-[11px]" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ formatBytes(pendingFile.size) }}
            </p>
          </div>
          <button
            type="button"
            :disabled="uploading"
            @click="pendingFile = null"
            class="p-1 rounded-md shrink-0 transition-colors disabled:opacity-50"
            :class="[isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600']"
            :title="t('direct.cache.cancelUpload')"
          >
            <XIcon class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[11px] shrink-0" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ t('direct.cache.expire') }}
          </span>
          <select
            v-model.number="hours"
            :disabled="uploading"
            class="flex-1 min-w-0 rounded-md px-2 py-1 text-[11px] border outline-none transition-colors disabled:opacity-50"
            :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800']"
          >
            <option v-for="opt in CACHE_HOUR_OPTIONS" :key="opt.value" :value="opt.value">
              {{ t(opt.labelKey) }}
            </option>
          </select>
        </div>

        <button
          type="button"
          :disabled="uploading"
          @click="confirmUpload"
          class="w-full px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
        >
          <LoaderIcon v-if="uploading" class="w-3.5 h-3.5 animate-spin" />
          {{ uploading ? t('direct.cache.uploading') : t('direct.cache.confirmUpload') }}
        </button>
      </div>
    </div>
    <input ref="fileRef" type="file" class="hidden" @change="onPickFile" />

    <p v-if="errorMsg" class="text-[11px] text-red-500">{{ errorMsg }}</p>

    <!-- ========== 文件列表 ========== -->
    <div class="flex items-center justify-between">
      <span class="text-[11px]" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
        {{ t('direct.cache.fileCount', { n: rows.length }) }}
      </span>
    </div>

    <div v-if="loading" class="text-xs py-4 text-center" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
      {{ t('direct.cache.loading') }}
    </div>
    <div v-else-if="rows.length === 0" class="text-xs py-6 text-center" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
      {{ t('direct.cache.empty') }}
    </div>
    <ul v-else class="space-y-1.5">
      <li
        v-for="row in rows"
        :key="row.transfer_id"
        class="rounded-lg border p-2.5 flex items-center gap-2.5"
        :class="[isDarkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white']"
      >
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          :class="[isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50']"
        >
          <FileTextIcon class="w-4 h-4" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
        </div>

        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium truncate" :class="[isDarkMode ? 'text-gray-100' : 'text-gray-900']">
            {{ row.file_name }}
          </p>
          <p class="text-[11px] truncate" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ formatBytes(row.file_size) }}
            <span v-if="row.uploader_name"> · {{ row.uploader_name }}</span>
            <span> · {{ row.expireText }}</span>
          </p>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <!-- 已落盘到服务器：点击下载（下载同时留存为供源，供其他成员加速） -->
          <button
            v-if="row.server_cached"
            type="button"
            @click="$emit('download', row.transfer_id)"
            class="px-2 py-1 rounded-md text-[11px] font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            {{ t('direct.cache.download') }}
          </button>
          <button
            v-if="row.canDelete"
            type="button"
            @click="$emit('delete', row.transfer_id)"
            class="p-1 rounded-md transition-colors"
            :class="[isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-600']"
            :title="t('direct.cache.delete')"
          >
            <TrashIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileTextIcon, TrashIcon, UploadIcon, XIcon, LoaderIcon } from 'lucide-vue-next'
import { useInjectedDarkMode } from '@/composables'
import { CACHE_HOUR_OPTIONS } from '@/composables'
import { formatFileSize as formatBytes } from '@/utils/common'
// 展示行类型放在 types/direct：SFC 内 export interface 会让 vue-tsc 报 TS2742
import type { RoomCacheRow } from '@/types/direct'

defineProps<{
  rows: RoomCacheRow[]
  loading: boolean
  uploading: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  upload: [file: File, cacheHours: number]
  delete: [transferId: string]
  refresh: []
  /** 点击下载：由父组件完成"下载 + 留存为供源" */
  download: [transferId: string]
}>()

const { t } = useI18n()
const isDarkMode = useInjectedDarkMode()

const fileRef = ref<HTMLInputElement | null>(null)
/** 已选中、等待设置缓存时长并确认的文件（上传流程第二步） */
const pendingFile = ref<File | null>(null)
/** 拖拽悬停高亮 */
const dropActive = ref(false)
// 默认 3 天，与"发送文件"时的缓存时长保持一致
const hours = ref<number>(72)

/** 第一步：选择文件（不立即上传，先进入时长设置） */
function onPickFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (file) {
    pendingFile.value = file
  }
}

/** 拖拽投放：取第一个文件进入同样的设置流程 */
function onDrop(event: DragEvent) {
  dropActive.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    pendingFile.value = file
  }
}

/** 第二步：确认时长后真正上传 */
function confirmUpload() {
  if (!pendingFile.value) return
  emit('upload', pendingFile.value, hours.value)
  pendingFile.value = null
}
</script>
