<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div
      class="rounded-3xl shadow-2xl overflow-hidden border w-full max-w-4xl transition-colors duration-300"
      :class="[
        isDarkMode
          ? 'bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border-gray-700'
          : 'bg-white border-gray-200'
      ]"
    >
      <div class="p-8">
        <!-- 返回首页 -->
        <button
          @click="toManage"
          class="flex items-center gap-1.5 text-sm font-medium transition-colors duration-300"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600']"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          {{ t('collection.manage.backToHome') }}
        </button>

        <PageHeader :title="collectionStore.collectionTitle || t('collection.detail.title')" @title-click="toManage" />

        <!-- 大窗口两列：左侧信息/二维码，右侧文件列表（左右等宽，右列自动占满） -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <!-- 左列 -->
          <div class="space-y-3">
            <!-- 连接状态 + 信息行 -->
            <div class="flex items-center gap-2 flex-wrap">
              <span class="w-2.5 h-2.5 rounded-full" :class="wsConnected ? 'bg-green-500' : 'bg-red-500'"></span>
              <span class="text-sm relative group/cursor cursor-default" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ wsConnected ? t('collection.manage.connected') : t('collection.manage.disconnected') }}
                <span v-if="wsConnected"
                  class="absolute left-0 top-full mt-1 z-10 px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap opacity-0 group-hover/cursor:opacity-100 transition-opacity pointer-events-none"
                  :class="[isDarkMode ? 'bg-gray-800 text-gray-200 border border-gray-600' : 'bg-white text-gray-700 border border-gray-200']"
                >
                  <p class="font-medium mb-1">{{ t('collection.detail.onlineUsers') }}</p>
                  <p v-if="onlineUsers.length === 0" class="py-0.5 opacity-60">-</p>
                  <p v-for="u in onlineUsers" :key="u" class="py-0.5">{{ u }}</p>
                </span>
              </span>
              <span class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ t('collection.manage.fileCount', { count: collectionStore.fileCount, max: collectionStore.collectionMaxFiles }) }}
              </span>
              <button @click="showSettings = true" class="ml-auto text-sm text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1">
                <Settings class="w-4 h-4" />
                {{ t('collection.detail.settings') }}
              </button>
            </div>

            <!-- 配置摘要卡片（只读展示，不可编辑）：中窗口横排，大窗口竖排 -->
            <div class="p-4 rounded-lg" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
              <div class="flex flex-col md:flex-row lg:flex-col gap-y-1 md:gap-x-6 text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                <div v-if="collectionStore.createdAt">
                  <span :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('collection.manage.createdAtLabel') }}：</span>
                  <span>{{ formatDateTime(collectionStore.createdAt) }}</span>
                </div>
                <div>
                  <span :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('collection.manage.collectionExpire') }}：</span>
                  <span>{{ collectionStore.expireStyle === 'forever' ? t('send.expiration.units.forever') : formatDateTime(collectionStore.collectionExpiredAt) }}</span>
                </div>
              </div>
            </div>

            <!-- 投件码 + 取件码（中窗口横排，大窗口上下排放） -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
              <CodeCard
                v-if="collectionStore.deliveryCode"
                :label="t('collection.manage.deliveryCodeLabel')"
                :code="collectionStore.deliveryCode"
                :qr-value="deliveryQrValue"
                :hint="t('collection.detail.scanToDeliver')"
                :copy-link-text="t('retrieve.clickCopyDeliveryLink')"
                :copy-link-url="deliveryQrValue"
                accent="amber"
              >
                <template #extra>
                  <p class="text-xs mt-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ t('retrieve.expireAt') }}：{{ deliveryExpireText }}
                  </p>
                </template>
              </CodeCard>
              <CodeCard
                v-if="collectionStore.retrieveCode"
                :label="t('collection.manage.retrieveCodeLabel')"
                :code="collectionStore.retrieveCode"
                :qr-value="retrieveQrValue"
                :hint="t('collection.detail.scanToRetrieve')"
                :copy-link-text="t('retrieve.clickCopyRetrieveLink')"
                :copy-link-url="retrieveQrValue"
                accent="emerald"
              >
                <template #extra>
                  <p class="text-xs mt-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ t('retrieve.expireAt') }}：{{ retrieveExpireText }}
                  </p>
                </template>
              </CodeCard>
            </div>
          </div>

          <!-- 右列：投递的文件列表（flex 纵向布局，列表自动占满） -->
          <div class="flex flex-col">
            <!-- 列表标题（仅两列布局时显示） -->
            <h3
              class="hidden lg:block text-sm font-medium mb-2"
              :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']"
            >
              {{ t('collection.manage.deliveryListTitle') }}
            </h3>
            <!-- 统一文件列表 -->
            <div
              class="flex-1 space-y-2 overflow-y-auto custom-scrollbar p-3 rounded-xl border min-h-[16rem]"
              :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']"
            >
              <!-- 正在上传的文件 -->
              <div
                v-for="(upload, idx) in collectionStore.activeUploads"
                :key="'upload-' + idx"
                class="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800"
                :class="[isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50']"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-base font-medium truncate flex-1 mr-2" :class="[isDarkMode ? 'text-indigo-300' : 'text-indigo-700']">
                    <LoaderIcon class="w-4 h-4 inline animate-spin mr-1" />
                    {{ upload.filename }}
                  </span>
                  <span class="text-sm font-mono font-bold text-indigo-500">{{ upload.progress }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${upload.progress}%` }"
                  ></div>
                </div>
                <p class="text-sm mt-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
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
                    <p class="text-base font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                      {{ file.file_name }}
                      <span v-if="file.status === 'failed'" class="text-sm text-red-500 ml-1">{{ t('collection.manage.statusFailed') }}</span>
                    </p>
                    <p class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                      {{ formatSize(file.file_size) }}
                      <span v-if="file.uploader_name"> - {{ file.uploader_name }}</span>
                    </p>
                  </div>
                  <div class="flex items-center gap-3 ml-2 shrink-0">
                    <a v-if="file.status === 'completed'" :href="getDownloadUrl(file.id)" class="text-sm text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap">
                      {{ t('collection.manage.download') }}
                    </a>
                    <button @click="handleDelete(file.id)" class="text-sm text-red-500 hover:text-red-700 transition-colors whitespace-nowrap">
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
          </div>
        </div>

        <!-- 底部操作按钮：窗口最底部 -->
        <div class="mt-6 flex justify-center gap-3">
          <button
            v-if="collectionStore.files.length > 0"
            @click="downloadAll"
            class="px-6 py-2 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600 transition-colors"
          >
            {{ t('collection.manage.downloadAll') }}
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
import CodeCard from '@/components/common/CodeCard.vue'
import { ArrowLeftIcon, LoaderIcon, Settings } from 'lucide-vue-next'
import { useCollectionStore } from '@/stores/collectionStore'
import { useAlertStore } from '@/stores/alertStore'
import { useConfirmStore } from '@/stores/confirmStore'
import { useConfigStore } from '@/stores/configStore'
import { formatFileSize as formatSize } from '@/utils/common'
import { useCollectionWebSocket, useRetrieveUrls } from '@/composables'
import { downloadFile } from '@/utils/download-action'
import { buildAppUrl } from '@/utils/share-url'
import { readPreference } from '@/utils/preference-storage'
import { STORAGE_KEYS } from '@/constants'

const props = defineProps<{ code: string }>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const alertStore = useAlertStore()
const confirmStore = useConfirmStore()
const collectionStore = useCollectionStore()
const configStore = useConfigStore()
const config = computed(() => configStore.config)
const { isConnected: wsConnected, connect, disconnect, onlineUsers } = useCollectionWebSocket()

const retrieveUrls = useRetrieveUrls()
const showSettings = ref(false)

const baseUrl = buildAppUrl()

const deliveryQrValue = computed(() => {
  if (!collectionStore.deliveryCode) return ''
  return `${baseUrl}/delivery/upload/${collectionStore.deliveryCode}`
})

const retrieveQrValue = computed(() => {
  if (!collectionStore.retrieveCode) return ''
  return `${baseUrl}/collection/retrieve/${collectionStore.retrieveCode}`
})

const deliveryExpireText = computed(() =>
  collectionStore.deliveryExpireStyle === 'forever'
    ? t('send.expiration.units.forever')
    : formatDateTime(collectionStore.deliveryExpiredAt)
)
const retrieveExpireText = computed(() =>
  collectionStore.retrieveExpireStyle === 'forever'
    ? t('send.expiration.units.forever')
    : formatDateTime(collectionStore.retrieveExpiredAt)
)

const formatDateTime = (isoStr: string | null) => {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getDownloadUrl = (fileId: number) => retrieveUrls.getDownloadUrl(fileId, collectionStore.collectionCode)
const downloadAll = () => {
  void downloadFile(
    retrieveUrls.getZipDownloadUrl(collectionStore.collectionCode),
    `${collectionStore.collectionCode}.zip`,
    { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' }
  )
}

const handleDelete = async (fileId: number) => {
  if (!(await confirmStore.confirm({ message: t('collection.detail.deleteConfirm') || '确定要删除此文件吗？此操作不可撤销。' }))) return
  try {
    await collectionStore.deleteFile(fileId)
    alertStore.showAlert(t('collection.manage.deleteSuccess'), 'success')
  } catch {
    alertStore.showAlert(t('collection.manage.deleteFailed'), 'error')
  }
}

const toManage = () => router.push('/')

const onSettingsSaved = () => {
  // 设置已保存，重新加载相关信息（主动更新 store 状态）
}

onMounted(async () => {
  try {
    await collectionStore.loadManageInfo(props.code)
    const nickname = readPreference(STORAGE_KEYS.UPLOADER_NICKNAME, '') || '管理员'
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
