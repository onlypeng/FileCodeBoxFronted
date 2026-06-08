<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div
      class="rounded-3xl shadow-2xl overflow-hidden border w-full max-w-lg transition-colors duration-300"
      :class="[
        isDarkMode
          ? 'bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border-gray-700'
          : 'bg-white border-gray-200'
      ]"
    >
      <div class="p-8">
        <PageHeader :title="collectionStore.collectionTitle || t('collection.detail.title')" @title-click="toManage" />

        <!-- 连接状态 + 信息行 -->
        <div class="flex items-center gap-2 mb-3 flex-wrap">
          <span class="w-2 h-2 rounded-full" :class="wsConnected ? 'bg-green-500' : 'bg-red-500'"></span>
          <span class="text-xs relative group/cursor cursor-default" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ wsConnected ? t('collection.manage.connected') : t('collection.manage.disconnected') }}
            <span v-if="wsConnected"
              class="absolute left-0 top-full mt-1 z-10 px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap opacity-0 group-hover/cursor:opacity-100 transition-opacity pointer-events-none"
              :class="[isDarkMode ? 'bg-gray-800 text-gray-200 border border-gray-600' : 'bg-white text-gray-700 border border-gray-200']"
            >
              <p class="font-medium mb-1">{{ t('collection.detail.onlineUsers') }}</p>
              <p v-if="onlineUsers.length === 0" class="py-0.5 opacity-60">-</p>
              <p v-for="u in onlineUsers" :key="u" class="py-0.5">{{ u }}</p>
            </span>
          </span>
          <span class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ t('collection.manage.fileCount', { count: collectionStore.fileCount, max: collectionStore.collectionMaxFiles }) }}
          </span>
          <button @click="showSettings = true" class="ml-auto text-xs text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1">
            <Settings class="w-3.5 h-3.5" />
            {{ t('collection.detail.settings') }}
          </button>
        </div>

        <!-- 配置摘要卡片（只读展示，不可编辑） -->
        <div class="mb-4 p-3 rounded-lg" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
          <div v-if="collectionStore.createdAt" class="text-xs mb-2 pb-2 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
            <span :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">创建时间：</span>
            <span :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']">{{ formatDateTime(collectionStore.createdAt) }}</span>
          </div>
          <div class="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span class="block" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('collection.manage.collectionExpire') }}</span>
              <span class="font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ collectionStore.expireStyle === 'forever' ? t('send.expiration.units.forever') : formatDateTime(collectionStore.collectionExpiredAt) }}
              </span>
            </div>
            <div>
              <span class="block" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('collection.manage.deliveryExpire') }}</span>
              <span class="font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ collectionStore.deliveryExpireStyle === 'forever' ? t('send.expiration.units.forever') : formatDateTime(collectionStore.deliveryExpiredAt) }}
              </span>
            </div>
            <div>
              <span class="block" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('collection.manage.retrieveExpire') }}</span>
              <span class="font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ collectionStore.retrieveExpireStyle === 'forever' ? t('send.expiration.units.forever') : formatDateTime(collectionStore.retrieveExpiredAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 投件码 + 取件码 并排展示 -->
        <div class="mb-4 grid grid-cols-2 gap-3">
          <!-- 投件码 -->
          <div v-if="collectionStore.deliveryCode" class="p-3 rounded-lg" :class="[isDarkMode ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-100']">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ t('collection.manage.deliveryCodeLabel') }}
              </p>
              <button @click="copyDeliveryCode" class="text-xs text-amber-500 hover:text-amber-700 transition-colors">
                {{ t('collection.manage.copyDeliveryCode') }}
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-lg text-amber-600">{{ collectionStore.deliveryCode }}</span>
              <div class="ml-auto">
                <div class="bg-white p-1 rounded shadow-sm">
                  <QRCode :value="deliveryQrValue" :size="48" level="M" />
                </div>
              </div>
            </div>
            <p class="text-[10px] mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ t('collection.detail.scanToDeliver') }}
            </p>
          </div>

          <!-- 取件码 -->
          <div v-if="collectionStore.retrieveCode" class="p-3 rounded-lg" :class="[isDarkMode ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-emerald-50 border border-emerald-100']">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ t('collection.manage.retrieveCodeLabel') }}
              </p>
              <button @click="copyRetrieveCode" class="text-xs text-emerald-500 hover:text-emerald-700 transition-colors">
                {{ t('collection.manage.copyRetrieveCode') }}
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-lg text-emerald-600">{{ collectionStore.retrieveCode }}</span>
              <div class="ml-auto">
                <div class="bg-white p-1 rounded shadow-sm">
                  <QRCode :value="retrieveQrValue" :size="48" level="M" />
                </div>
              </div>
            </div>
            <p class="text-[10px] mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ t('collection.detail.scanToRetrieve') }}
            </p>
          </div>
        </div>

        <!-- 统一文件列表 -->
        <div class="space-y-2 max-h-[28rem] overflow-y-auto custom-scrollbar">
          <!-- 正在上传的文件 -->
          <div
            v-for="(upload, idx) in collectionStore.activeUploads"
            :key="'upload-' + idx"
            class="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800"
            :class="[isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50']"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium truncate flex-1 mr-2" :class="[isDarkMode ? 'text-indigo-300' : 'text-indigo-700']">
                <LoaderIcon class="w-3.5 h-3.5 inline animate-spin mr-1" />
                {{ upload.filename }}
              </span>
              <span class="text-xs font-mono font-bold text-indigo-500">{{ upload.progress }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                class="bg-gradient-to-r from-pink-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                :style="{ width: `${upload.progress}%` }"
              ></div>
            </div>
            <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ upload.uploader }}
            </p>
          </div>

          <!-- 已完成的文件 -->
          <div
            v-for="file in collectionStore.files"
            :key="file.id"
            class="flex flex-col p-3 rounded-lg transition-colors duration-200"
            :class="[isDarkMode ? 'bg-gray-800 bg-opacity-50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100']"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ file.file_name }}
                  <span v-if="file.status === 'failed'" class="text-xs text-red-500 ml-1">{{ t('collection.manage.statusFailed') }}</span>
                </p>
                <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  {{ formatSize(file.file_size) }}
                  <span v-if="file.uploader_name"> - {{ file.uploader_name }}</span>
                </p>
              </div>
              <div class="flex items-center gap-2 ml-2 shrink-0">
                <a v-if="file.status === 'completed'" :href="getDownloadUrl(file.id)" class="text-xs text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap">
                  {{ t('collection.manage.download') }}
                </a>
                <button @click="handleDelete(file.id)" class="text-xs text-red-500 hover:text-red-700 transition-colors whitespace-nowrap">
                  {{ t('collection.manage.delete') }}
                </button>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="collectionStore.files.length === 0 && collectionStore.activeUploads.length === 0" class="text-center py-8" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
            {{ t('collection.manage.noFiles') }}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="mt-6 flex gap-3">
          <button
            v-if="collectionStore.files.length > 0"
            @click="downloadAll"
            class="flex-1 py-2 px-4 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600 transition-colors"
          >
            {{ t('collection.manage.downloadAll') }}
          </button>
          <button
            @click="toManage"
            class="flex-1 py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-center"
          >
            {{ t('collection.manage.backToHome') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 设置弹窗 -->
    <CollectionSettingsModal
      :visible="showSettings"
      @close="showSettings = false"
      @saved="onSettingsSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import CollectionSettingsModal from '@/components/common/CollectionSettingsModal.vue'
import QRCode from 'qrcode.vue'
import { LoaderIcon, Settings } from 'lucide-vue-next'
import { useCollectionStore } from '@/stores/collectionStore'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { useCollectionWebSocket } from '@/composables/useCollectionWebSocket'
import { CollectionService } from '@/services/collection'
import { copyToClipboard } from '@/utils/clipboard'
import { downloadFile } from '@/utils/download-action'
import { STORAGE_KEYS } from '@/constants'

const props = defineProps<{ code: string }>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const alertStore = useAlertStore()
const collectionStore = useCollectionStore()
const configStore = useConfigStore()
const config = computed(() => configStore.config)
const { isConnected: wsConnected, connect, disconnect, onlineUsers } = useCollectionWebSocket()

const showSettings = ref(false)

const baseUrl = window.location.origin + '/#'

const deliveryQrValue = computed(() => {
  if (!collectionStore.deliveryCode) return ''
  return `${baseUrl}/delivery/upload/${collectionStore.deliveryCode}`
})

const retrieveQrValue = computed(() => {
  if (!collectionStore.retrieveCode) return ''
  return `${baseUrl}/collection/retrieve/${collectionStore.retrieveCode}`
})

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDateTime = (isoStr: string | null) => {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getDownloadUrl = (fileId: number) => CollectionService.getDownloadUrl(fileId, collectionStore.collectionCode)
const downloadAll = () => {
  void downloadFile(
    CollectionService.getZipDownloadUrl(collectionStore.collectionCode),
    `${collectionStore.collectionCode}.zip`,
    { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' }
  )
}

const handleDelete = async (fileId: number) => {
  if (!window.confirm(t('collection.detail.deleteConfirm') || '确定要删除此文件吗？此操作不可撤销。')) return
  try {
    await collectionStore.deleteFile(fileId)
    alertStore.showAlert(t('collection.manage.deleteSuccess'), 'success')
  } catch {
    alertStore.showAlert(t('collection.manage.deleteFailed'), 'error')
  }
}

const copyDeliveryCode = async () => {
  await copyToClipboard(collectionStore.deliveryCode, {
    successMsg: t('collection.create.codeCopied'),
    errorMsg: t('collection.create.copyFailed'),
    notify: (message, type) => alertStore.showAlert(message, type),
  })
}

const copyRetrieveCode = async () => {
  await copyToClipboard(collectionStore.retrieveCode, {
    successMsg: t('collection.create.codeCopied'),
    errorMsg: t('collection.create.copyFailed'),
    notify: (message, type) => alertStore.showAlert(message, type),
  })
}

const toManage = () => router.push('/')

const onSettingsSaved = () => {
  // 设置已保存，重新加载相关信息（主动更新 store 状态）
}

onMounted(async () => {
  try {
    await collectionStore.loadManageInfo(props.code)
    const nickname = localStorage.getItem(STORAGE_KEYS.UPLOADER_NICKNAME) || '管理员'
    connect(collectionStore.collectionCode, nickname)
    collectionStore.saveToRecent()
  } catch {
    alertStore.showAlert(t('collection.manage.loadFailed'), 'error')
    router.replace('/')
  }
})

onUnmounted(() => {
  disconnect()
  collectionStore.reset()
})
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.4);
  border-radius: 3px;
}
</style>
