<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div class="w-full max-w-md relative z-10">
      <div
        class="rounded-3xl shadow-2xl overflow-hidden border transform transition-all duration-300"
        :class="[
          isDarkMode
            ? 'bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl border-gray-700'
            : 'bg-white border-gray-200'
        ]"
      >
        <div class="p-8">
          <PageHeader :title="resultTitle" @title-click="closeResult" />

          <!-- 输入表单（有结果时隐藏） -->
          <template v-if="!showResult">
            <RetrieveForm
              v-model="code"
              :input-status="inputStatus"
              :error="!!error"
              @submit="handleSubmit"
              ref="retrieveFormRef"
            />

            <!-- 投件码跳转提示 -->
            <div v-if="deliveryRedirectCode" class="mt-4 p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800">
              <p class="text-sm text-pink-700 dark:text-pink-300 mb-2">{{ $t('retrieve.messages.deliveryCodeDetected') }}</p>
              <button
                @click="router.push(`/delivery/upload/${deliveryRedirectCode}`)"
                class="w-full py-2 px-4 rounded-lg bg-pink-500 text-white text-sm hover:bg-pink-600 transition-colors"
              >
                {{ $t('retrieve.collectionFiles.uploadFile') }}
              </button>
            </div>

            <!-- 快速入口 -->
            <div class="mt-4 flex gap-3">
              <router-link
                to="/delivery/enter"
                class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                :class="[
                  isDarkMode
                    ? 'border-pink-500/40 bg-pink-500/10 text-pink-300 hover:border-pink-400 hover:bg-pink-500/20'
                    : 'border-pink-300 bg-pink-50 text-pink-600 hover:border-pink-400 hover:bg-pink-100'
                ]"
              >
                <SendHorizonalIcon class="w-4 h-4" />
                <span class="text-sm font-medium">{{ $t('delivery.quickEntry') }}</span>
              </router-link>
              <router-link
                to="/collection/manage"
                class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                :class="[
                  isDarkMode
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-500/20'
                    : 'border-indigo-300 bg-indigo-50 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-100'
                ]"
              >
                <InboxIcon class="w-4 h-4" />
                <span class="text-sm font-medium">{{ $t('collection.manage.quickEntry') }}</span>
              </router-link>
            </div>
          </template>

          <!-- ========== 多文件结果展示 ========== -->
          <div v-if="showResult && isMultiFile" class="space-y-4">
            <!-- 取件码 + 二维码 -->
            <div class="flex items-center gap-4 p-4 rounded-xl" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
              <div class="flex-1 min-w-0">
                <p class="text-xs mb-1" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ $t('retrieve.multiFile.title') }}</p>
                <p class="text-2xl font-mono font-bold tracking-wider text-indigo-600">{{ multiFileCode }}</p>
                <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ multiFileItems.length }} {{ $t('retrieve.multiFile.fileCount') }}
                </p>
              </div>
              <div class="bg-white p-2 rounded-lg shadow-sm">
                <QRCode :value="multiFileQrValue" :size="80" level="M" />
              </div>
            </div>

            <!-- 文件列表 -->
            <div class="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              <div
                v-for="item in multiFileItems"
                :key="item.id"
                class="flex items-center justify-between p-3 rounded-lg transition-colors"
                :class="[isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100']"
              >
                <div class="flex items-center flex-1 min-w-0">
                  <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ item.file_name }}</p>
                    <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ formatFileSize(item.file_size) }}</p>
                  </div>
                </div>
                <button
                  @click="downloadMultiFileItem(item.id)"
                  class="ml-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  :class="[isDarkMode ? 'text-indigo-400 hover:bg-indigo-900/30' : 'text-indigo-600 hover:bg-indigo-50']"
                >
                  {{ $t('retrieve.multiFile.download') }}
                </button>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-2">
              <button @click="downloadMultiFileZip" class="flex-1 py-2.5 px-4 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2">
                <DownloadIcon class="w-4 h-4" />
                {{ $t('retrieve.multiFile.downloadAll') }}
              </button>
              <button @click="closeResult" class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border" :class="[isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100']">
                {{ $t('common.close') }}
              </button>
            </div>
          </div>

          <!-- ========== 收件箱文件结果展示 ========== -->
          <div v-if="showResult && isCollection" class="space-y-4">
            <!-- 收件箱信息 + 二维码 -->
            <div class="flex items-center gap-4 p-4 rounded-xl" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ collectionTitle || $t('retrieve.collectionFiles.title') }}
                </p>
                <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  {{ collectionFiles.length }} {{ $t('retrieve.multiFile.fileCount') }}
                </p>
              </div>
              <div class="bg-white p-2 rounded-lg shadow-sm">
                <QRCode :value="collectionQrValue" :size="80" level="M" />
              </div>
            </div>

            <!-- 文件列表 -->
            <div class="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              <div
                v-for="file in collectionFiles"
                :key="file.id"
                class="flex items-center justify-between p-3 rounded-lg transition-colors"
                :class="[isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100']"
              >
                <div class="flex items-center flex-1 min-w-0">
                  <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ file.file_name }}</p>
                    <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                      {{ formatFileSize(file.file_size) }}
                      <span v-if="file.uploader_name"> - {{ file.uploader_name }}</span>
                    </p>
                  </div>
                </div>
                <button
                  @click="downloadCollectionFile(file.id)"
                  class="ml-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  :class="[isDarkMode ? 'text-indigo-400 hover:bg-indigo-900/30' : 'text-indigo-600 hover:bg-indigo-50']"
                >
                  {{ $t('retrieve.multiFile.download') }}
                </button>
              </div>
              <div v-if="collectionFiles.length === 0" class="text-center py-6" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ $t('retrieve.collectionFiles.noFiles') }}
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-2">
              <button
                v-if="collectionFiles.length > 0"
                @click="downloadCollectionZip"
                class="flex-1 py-2.5 px-4 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <DownloadIcon class="w-4 h-4" />
                {{ $t('retrieve.multiFile.downloadAll') }}
              </button>
              <button @click="closeResult" class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border" :class="[isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100']">
                {{ $t('common.close') }}
              </button>
            </div>
          </div>

          <!-- 底部 footer（仅在输入模式下显示） -->
          <template v-if="!showResult">
            <PageFooter
              :link-text="$t('retrieve.needSendFile')"
              link-to="/send"
              :drawer-text="$t('retrieve.recordsDrawer')"
              @toggle-drawer="toggleDrawer"
            />
          </template>
        </div>
      </div>
    </div>

    <SideDrawer :visible="showDrawer" :title="$t('retrieve.recordsDrawer')" @close="toggleDrawer">
      <FileRecordList
        :records="records"
        @view-details="viewDetails"
        @download-record="downloadRecord"
        @delete-record="deleteRecord"
      />
    </SideDrawer>

    <FileDetailModal
      :visible="!!selectedRecord && !isMultiFile && !isCollection"
      :record="selectedRecord"
      @close="closeDetails"
      @preview-content="showContentPreview"
    />

    <ContentPreviewModal
      :visible="showPreview"
      :rendered-content="renderedContent"
      @close="closeContentPreview"
      @copy-content="copyContent"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import RetrieveForm from '@/components/common/RetrieveForm.vue'
import PageFooter from '@/components/common/PageFooter.vue'
import SideDrawer from '@/components/common/SideDrawer.vue'
import FileDetailModal from '@/components/common/FileDetailModal.vue'
import FileRecordList from '@/components/common/FileRecordList.vue'
import ContentPreviewModal from '@/components/common/ContentPreviewModal.vue'
import QRCode from 'qrcode.vue'
import { FileIcon, DownloadIcon, SendHorizonalIcon, InboxIcon } from 'lucide-vue-next'
import { useRetrieveFlow } from '@/composables'
import { useConfigStore } from '@/stores/configStore'

const isDarkMode = inject('isDarkMode')
const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()
const { config } = storeToRefs(configStore)
const {
  code,
  inputStatus,
  error,
  records,
  selectedRecord,
  showDrawer,
  showPreview,
  renderedContent,
  isMultiFile,
  multiFileItems,
  multiFileCode,
  isCollection,
  collectionFiles,
  collectionCode,
  collectionTitle,
  collectionDeliveryCode,
  deliveryRedirectCode,
  closeContentPreview,
  closeDetails,
  copyContent,
  deleteRecord,
  downloadRecord,
  handleSubmit,
  showContentPreview,
  toggleDrawer,
  viewDetails,
  downloadMultiFileItem,
  downloadMultiFileZip,
  downloadCollectionFile,
  downloadCollectionZip,
  goToDeliveryUpload,
  formatFileSize
} = useRetrieveFlow()

const baseUrl = window.location.origin + '/#'

const showResult = computed(() => isMultiFile.value || isCollection.value)

const resultTitle = computed(() => {
  if (isMultiFile.value) return config.value.name
  if (isCollection.value) return collectionTitle.value || '收件箱文件'
  return config.value.name
})

const multiFileQrValue = computed(() => {
  if (!multiFileCode.value) return ''
  return `${baseUrl}/?code=${multiFileCode.value}`
})

const collectionQrValue = computed(() => {
  if (!collectionCode.value) return ''
  return `${baseUrl}/?code=${collectionCode.value}`
})

const closeResult = () => {
  selectedRecord.value = null
  isMultiFile.value = false
  multiFileItems.value = []
  multiFileCode.value = ''
  isCollection.value = false
  collectionFiles.value = []
  collectionCode.value = ''
  collectionTitle.value = ''
  collectionDeliveryCode.value = ''
}

const toSend = () => {
  router.push('/send')
}

onMounted(() => {
  const queryCode = route.query.code
  if (queryCode && typeof queryCode === 'string') {
    code.value = queryCode
  }
})

let autoSubmitTimer: ReturnType<typeof setTimeout> | null = null

watch(code, (newCode) => {
  if (autoSubmitTimer) {
    clearTimeout(autoSubmitTimer)
    autoSubmitTimer = null
  }
  if (newCode.length >= 6) {
    autoSubmitTimer = setTimeout(() => {
      void handleSubmit()
    }, 600) // 6位码输入完毕快速自动提交
  }
})

onUnmounted(() => {
  if (autoSubmitTimer) {
    clearTimeout(autoSubmitTimer)
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

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
