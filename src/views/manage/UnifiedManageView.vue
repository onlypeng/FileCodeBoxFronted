<template>
  <div class="p-6 overflow-y-auto custom-scrollbar">
    <div class="mb-6">
      <h2 class="text-2xl font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-800']">
        {{ t('admin.unifiedManage.title') }}
      </h2>
    </div>

    <!-- Tab 切换 -->
    <div class="mb-6 flex border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-6 py-3 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px"
        :class="[
          activeTab === tab.key
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent hover:text-gray-600',
          isDarkMode
            ? activeTab === tab.key
              ? 'text-indigo-400'
              : 'text-gray-400 hover:text-gray-200'
            : activeTab === tab.key
              ? 'text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
        ]"
      >
        <component :is="tab.icon" class="w-4 h-4 inline mr-2" />
        {{ tab.label }}
      </button>
    </div>

    <!-- 文件列表 Tab -->
    <div v-if="activeTab === 'files'">
      <!-- 搜索栏 -->
      <div class="mb-4 flex gap-4" :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']">
        <div class="relative flex-1">
          <input type="text" v-model="fileParams.keyword" @keyup.enter="loadFiles"
            :class="[
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900',
              'w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500'
            ]" :placeholder="t('manage.fileManage.searchPlaceholder')" />
          <SearchIcon class="absolute left-3 top-3 w-5 h-5" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
        </div>
        <button @click="loadFiles" class="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">
          {{ t('common.search') }}
        </button>
      </div>

      <!-- 文件表格 -->
      <div class="overflow-hidden rounded-lg border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
        <table class="min-w-full divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-200']">
          <thead :class="[isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50']">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.code') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.name') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.size') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.expiration') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-100']">
            <tr v-if="fileList.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('common.noData') }}</td>
            </tr>
            <template v-for="file in fileList" :key="file.id">
              <tr class="hover:bg-opacity-50 transition-colors" :class="[isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50']">
                <td class="px-4 py-3 text-sm font-medium" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ file.code }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <FileIcon class="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span class="text-sm truncate max-w-[200px]" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                      {{ file.prefix }}
                      <span v-if="file.is_multi_file" class="ml-1 text-xs opacity-60">({{ file.file_count || 0 }} {{ t('admin.unifiedManage.files') }})</span>
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ file.displaySize }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="[
                    file.expired_at
                      ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800')
                      : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800')
                  ]">{{ file.displayExpiredAt }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <button v-if="file.is_multi_file" @click="showMultiFileItems(file)" class="text-xs text-indigo-500 hover:text-indigo-700" :title="t('admin.unifiedManage.viewFiles')">
                      <EyeIcon class="w-4 h-4" />
                    </button>
                    <button @click="deleteFile(file.id)" class="text-xs text-red-500 hover:text-red-700">
                      <TrashIcon class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex justify-between items-center">
        <span class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ t('components.pagination.showing') }} {{ (fileParams.page - 1) * fileParams.size + 1 }}-{{ Math.min(fileParams.page * fileParams.size, fileParams.total) }} {{ t('components.pagination.of') }} {{ fileParams.total }} {{ t('components.pagination.total') }}
        </span>
        <div class="flex gap-2">
          <button @click="fileParams.page > 1 && (fileParams.page--, loadFiles())" :disabled="fileParams.page <= 1"
            class="px-3 py-1 rounded text-sm disabled:opacity-50" :class="[isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700']">{{ t('components.pagination.previous') }}</button>
          <button @click="fileParams.page * fileParams.size < fileParams.total && (fileParams.page++, loadFiles())" :disabled="fileParams.page * fileParams.size >= fileParams.total"
            class="px-3 py-1 rounded text-sm disabled:opacity-50" :class="[isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700']">{{ t('components.pagination.next') }}</button>
        </div>
      </div>
    </div>

    <!-- 收件箱列表 Tab -->
    <div v-if="activeTab === 'collections'">
      <!-- 搜索栏 -->
      <div class="mb-4 flex gap-4">
        <div class="relative flex-1">
          <input type="text" v-model="collectionParams.keyword" @keyup.enter="loadCollections"
            :class="[
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900',
              'w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500'
            ]" :placeholder="t('admin.unifiedManage.searchCollection')" />
          <SearchIcon class="absolute left-3 top-3 w-5 h-5" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
        </div>
        <button @click="loadCollections" class="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">
          {{ t('common.search') }}
        </button>
      </div>

      <!-- 收件箱表格 -->
      <div class="overflow-hidden rounded-lg border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
        <table class="min-w-full divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-200']">
          <thead :class="[isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50']">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.name') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.adminCode') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.retrieveCode') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.deliveryCode') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.fileCount') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.status') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.expireInfo') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-100']">
            <tr v-if="collectionList.length === 0">
              <td colspan="8" class="px-4 py-6 text-center text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('common.noData') }}</td>
            </tr>
            <tr v-for="col in collectionList" :key="col.id" class="hover:bg-opacity-50 transition-colors" :class="[isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50']">
              <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <div class="flex items-center gap-2">
                  <InboxIcon class="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <span class="truncate max-w-[120px]">{{ col.title || '-' }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">{{ col.collection_code }}</td>
              <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">{{ col.retrieve_code || '-' }}</td>
              <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']">{{ col.delivery_code }}</td>
              <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ col.file_count }}/{{ col.max_files }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[
                  col.is_expired
                    ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                    : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                ]">{{ col.is_expired ? t('admin.unifiedManage.expired') : t('admin.unifiedManage.active') }}</span>
              </td>
              <td class="px-4 py-3 text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ formatExpireInfo(col.expire_style, col.expire_value) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button @click="showCollectionFiles(col)" class="text-xs text-indigo-500 hover:text-indigo-700">
                    <EyeIcon class="w-4 h-4" />
                  </button>
                  <button @click="deleteCollection(col.id)" class="text-xs text-red-500 hover:text-red-700">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex justify-between items-center">
        <span class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ t('components.pagination.showing') }} {{ (collectionParams.page - 1) * collectionParams.size + 1 }}-{{ Math.min(collectionParams.page * collectionParams.size, collectionParams.total) }} {{ t('components.pagination.of') }} {{ collectionParams.total }} {{ t('components.pagination.total') }}
        </span>
        <div class="flex gap-2">
          <button @click="collectionParams.page > 1 && (collectionParams.page--, loadCollections())" :disabled="collectionParams.page <= 1"
            class="px-3 py-1 rounded text-sm disabled:opacity-50" :class="[isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700']">{{ t('components.pagination.previous') }}</button>
          <button @click="collectionParams.page * collectionParams.size < collectionParams.total && (collectionParams.page++, loadCollections())" :disabled="collectionParams.page * collectionParams.size >= collectionParams.total"
            class="px-3 py-1 rounded text-sm disabled:opacity-50" :class="[isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700']">{{ t('components.pagination.next') }}</button>
        </div>
      </div>
    </div>

    <!-- 收件箱文件弹窗 -->
    <div v-if="showFilesModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showFilesModal = false"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6" :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ selectedCollection?.title || t('admin.unifiedManage.collectionFiles') }}
              </h3>
              <button @click="showFilesModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div v-for="file in collectionFiles" :key="file.id"
                class="flex items-center justify-between p-3 rounded-lg" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50']">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ file.file_name }}</p>
                  <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    {{ formatFileSize(file.file_size) }}
                    <span v-if="file.uploader_name"> - {{ file.uploader_name }}</span>
                  </p>
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full" :class="[
                  file.status === 'completed' ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
                  file.status === 'uploading' ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                  (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                ]">{{ file.status }}</span>
              </div>
              <div v-if="collectionFiles.length === 0" class="text-center py-8" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('common.noData') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 多文件分享文件查看弹窗 -->
    <div v-if="showMultiFileModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showMultiFileModal = false"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6" :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ selectedMultiFile?.prefix || t('admin.unifiedManage.multiFileItems') }}
              </h3>
              <button @click="showMultiFileModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div v-for="item in multiFileItems" :key="item.id"
                class="flex items-center justify-between p-3 rounded-lg" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50']">
                <div class="flex items-center flex-1 min-w-0">
                  <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ item.file_name }}</p>
                    <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ formatFileSize(item.file_size) }}</p>
                  </div>
                </div>
              </div>
              <div v-if="multiFileItems.length === 0" class="text-center py-8" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('common.noData') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  FileIcon, SearchIcon, TrashIcon, EyeIcon, InboxIcon, FolderIcon
} from 'lucide-vue-next'
import { FileService } from '@/services'
import { CollectionService } from '@/services/collection'
import { useAlertStore } from '@/stores/alertStore'
import { formatFileSize, formatTimestamp } from '@/utils/common'
import type { AdminCollectionItem, CollectionFileItem } from '@/types/collection'

const isDarkMode = inject('isDarkMode') as any
const { t } = useI18n()
const alertStore = useAlertStore()

const activeTab = ref<'files' | 'collections'>('files')
const tabs = [
  { key: 'files' as const, label: t('admin.unifiedManage.fileList'), icon: FileIcon },
  { key: 'collections' as const, label: t('admin.unifiedManage.collectionList'), icon: InboxIcon },
]

// 文件列表
const fileList = ref<any[]>([])
const fileParams = ref({ page: 1, size: 10, total: 0, keyword: '' })

// 多文件查看弹窗
const showMultiFileModal = ref(false)
const selectedMultiFile = ref<any>(null)
const multiFileItems = ref<Array<{ id: number; file_name: string; file_size: number }>>([])

const showMultiFileItems = (file: any) => {
  selectedMultiFile.value = file
  multiFileItems.value = file.file_items || []
  showMultiFileModal.value = true
}

// 收件箱列表
const collectionList = ref<AdminCollectionItem[]>([])
const collectionParams = ref({ page: 1, size: 10, total: 0, keyword: '' })

// 文件弹窗
const showFilesModal = ref(false)
const selectedCollection = ref<AdminCollectionItem | null>(null)
const collectionFiles = ref<CollectionFileItem[]>([])

const loadFiles = async () => {
  try {
    const res = await FileService.getAdminFileList(fileParams.value)
    if (res.detail) {
      fileList.value = res.detail.data.map((f: any) => ({
        ...f,
        displaySize: formatFileSize(f.size),
        displayExpiredAt: f.expired_at ? formatTimestamp(f.expired_at) : t('send.expiration.units.forever'),
      }))
      fileParams.value.total = res.detail.total
    }
  } catch (err) {
    alertStore.showAlert(t('manage.fileManage.loadFileListFailed'), 'error')
  }
}

const loadCollections = async () => {
  try {
    const res = await CollectionService.getAdminCollectionList(collectionParams.value)
    if (res.detail) {
      collectionList.value = res.detail.data
      collectionParams.value.total = res.detail.total
    }
  } catch (err) {
    alertStore.showAlert(t('admin.unifiedManage.loadFailed'), 'error')
  }
}

const deleteFile = async (id: number) => {
  if (!window.confirm(t('manage.fileManage.deleteConfirm'))) return
  try {
    await FileService.deleteAdminFile(id)
    await loadFiles()
  } catch (err) {
    alertStore.showAlert(t('manage.fileManage.deleteFailed'), 'error')
  }
}

const deleteCollection = async (id: number) => {
  if (!window.confirm(t('admin.unifiedManage.deleteConfirm'))) return
  try {
    await CollectionService.deleteCollection(id)
    await loadCollections()
  } catch (err) {
    alertStore.showAlert(t('admin.unifiedManage.deleteFailed'), 'error')
  }
}

const showCollectionFiles = async (col: AdminCollectionItem) => {
  selectedCollection.value = col
  try {
    const res = await CollectionService.getAdminCollectionFiles(col.id)
    collectionFiles.value = res.detail || []
    showFilesModal.value = true
  } catch (err) {
    alertStore.showAlert(t('admin.unifiedManage.loadFilesFailed'), 'error')
  }
}

const formatExpireInfo = (style: string, value: number) => {
  const units: Record<string, string> = {
    day: t('common.day'),
    hour: t('common.hour'),
    minute: t('common.minute'),
    count: t('common.times'),
    forever: '',
  }
  if (style === 'forever') return t('send.expiration.units.forever')
  return `${value}${units[style] || style}`
}

onMounted(() => {
  loadFiles()
  loadCollections()
})
</script>
