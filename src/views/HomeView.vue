<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div class="w-full max-w-md md:max-w-2xl lg:max-w-3xl relative z-10">
      <div
        class="rounded-3xl shadow-2xl overflow-hidden border transform transition-all duration-300"
        :class="[
          isDarkMode
            ? 'bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl border-gray-700'
            : 'bg-white border-gray-200'
        ]"
      >
        <div class="p-8">
          <PageHeader :title="config.name" />

          <!-- Tab 切换 -->
          <div class="flex mb-6 rounded-xl p-1" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100']">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
              :class="[
                activeTab === tab.key
                  ? isDarkMode
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-indigo-600 shadow-md'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
              ]"
            >
              <component :is="tab.icon" class="w-4 h-4" />
              {{ tab.label }}
            </button>
          </div>

          <!-- ========== 取件 / 发送 Tab 内容（统一容器，最小高度防止切换抖动） ========== -->
          <div class="min-h-[420px] flex flex-col">
            <!-- ========== 取件 Tab ========== -->
            <template v-if="activeTab === 'retrieve'">
              <div class="flex-1 flex flex-col justify-center">
                <div class="md:max-w-md md:mx-auto md:w-full">
                  <RetrieveForm
                    v-model="retrieveCode"
                    :input-status="retrieveInputStatus"
                    :error="!!retrieveError"
                    :label="t('home.codeInput.label')"
                    :placeholder="t('home.codeInput.placeholder')"
                    :button-text="t('home.codeInput.submit')"
                    @submit="handleRetrieveSubmit"
                    ref="retrieveFormRef"
                  />
                </div>
              </div>
            </template>

            <!-- ========== 发送 Tab ========== -->
            <template v-if="activeTab === 'send'">
              <form @submit.prevent="handleSendSubmit" class="space-y-5 flex-1 flex flex-col md:grid md:grid-cols-12 md:gap-5 md:space-y-0">
                <div class="md:col-span-7 md:flex md:flex-col md:space-y-5">
                  <FileUploadArea
                    :selected-file="selectedFile"
                    :selected-files="selectedFiles"
                    :progress="uploadProgress"
                    :description="uploadDescription"
                    @file-selected="handleFileSelected"
                    @files-selected="handleFilesSelected"
                    @file-drop="handleFileDrop"
                    @paste="handlePaste"
                    @file-remove="removeFile"
                  />
                </div>

                <div class="space-y-5 md:col-span-5 md:flex md:flex-col md:space-y-5">
                  <TextInputArea v-model="textContent" placeholder="添加文本备注（可选，无文件时作为纯文本发送）" />

                  <ExpirationSelector
                    v-model:expiration-method="expirationMethod"
                    v-model:expiration-value="expirationValue"
                    :options="expirationOptions"
                  />

                  <button
                    type="submit"
                    :disabled="isSubmitting"
                    class="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100 md:mt-auto"
                  >
                  <span
                    class="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                  ></span>
                  <span class="relative z-10 flex items-center justify-center text-lg">
                    <svg
                      v-if="isSubmitting"
                      class="w-6 h-6 mr-2 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <SendIcon v-else class="w-6 h-6 mr-2" />
                    <span>{{ isSubmitting ? t('send.submitting') : t('send.submit') }}</span>
                  </span>
                </button>
                </div>
              </form>
            </template>
          </div>
        </div>

        <!-- 统一底部 -->
        <div
          class="px-8 py-4 bg-opacity-50 flex justify-between items-center"
          :class="[isDarkMode ? 'bg-gray-800' : 'bg-gray-100']"
        >
          <span
            class="text-sm flex items-center"
            :class="[isDarkMode ? 'text-gray-300' : 'text-gray-800']"
          >
            <ShieldCheckIcon class="w-4 h-4 mr-1 text-green-400" />
            {{ t('send.secureEncryption') }}
          </span>
          <div class="flex items-center space-x-3">
            <router-link
              v-if="activeTab === 'retrieve'"
              to="/collection/create"
              class="hover:text-indigo-300 transition duration-300 flex items-center"
              :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600']"
              :title="t('home.createCollection')"
            >
              <InboxIcon class="w-4 h-4" />
            </router-link>
            <router-link
              v-if="activeTab === 'retrieve'"
              to="/login"
              class="hover:text-indigo-300 transition duration-300 flex items-center"
              :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600']"
              :title="t('home.adminPanel')"
            >
              <UserIcon class="w-4 h-4" />
            </router-link>
            <button
              @click="toggleDrawer"
              class="text-sm hover:text-indigo-300 transition duration-300 flex items-center"
              :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']"
            >
              {{ t('records.button') }}
              <ClipboardListIcon class="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统一记录抽屉 -->
    <SideDrawer :visible="showDrawer" :title="t('records.title')" @close="toggleDrawer">
      <!-- 记录类型 Tab -->
      <div class="flex gap-1 px-6 pt-4 pb-2 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
        <button
          v-for="tab in recordTabs"
          :key="tab.key"
          @click="activeRecordTab = tab.key"
          class="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5"
          :class="[
            activeRecordTab === tab.key
              ? isDarkMode
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-indigo-600 shadow-sm'
              : isDarkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          ]"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5" />
          {{ tab.label }}
          <span
            v-if="tab.count > 0"
            class="text-[10px] px-1.5 py-0.5 rounded-full"
            :class="[
              activeRecordTab === tab.key
                ? 'bg-white/20'
                : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
            ]"
          >{{ tab.count }}</span>
        </button>
      </div>

      <!-- 取件记录 -->
      <FileRecordList
        v-if="activeRecordTab === 'received'"
        :records="records"
        @view-details="viewDetails"
        @download-record="downloadRecord"
        @delete-record="deleteRecord"
      />
      <!-- 发件记录 -->
      <SentRecordList
        v-else-if="activeRecordTab === 'sent'"
        :records="sendRecords"
        @copy-link="copySentRecordLink"
        @view-details="viewSendDetails"
        @delete-record="deleteSendRecord"
      />
      <!-- 收件箱记录 -->
      <CollectionRecordList v-else-if="activeRecordTab === 'collection'" :records="collectionRecords"
        @view-details="viewCollectionDetails"
        @go-manage="goCollectionManage"
        @go-retrieve="goCollectionRetrieve"
        @copy-link="copyCollectionRecordLink"
        @delete-record="deleteCollectionRecord"
      />
    </SideDrawer>

    <!-- 取件文件详情弹窗（统一文件/文本/多文件/收件箱） -->
    <FileDetailModal
      :visible="!!selectedRecord"
      :record="selectedRecord"
      @close="closeDetails"
      @preview-content="showContentPreview"
      @download-zip="downloadSelectedRecordZip"
      @download-item="downloadSelectedRecordItem"
    />

    <!-- 发送记录详情弹窗 -->
    <SentRecordDetailModal
      :record="selectedSendRecord"
      :get-q-r-code-value="getQRCodeValue"
      @close="closeSendDetails"
      @copy-code="copySentRecordCode"
      @copy-link="copySentRecordLink"
      @copy-wget="copySentRecordWgetCommand"
      @continue-delivery="continueSendDelivery"
    />

    <!-- 内容预览弹窗 -->
    <ContentPreviewModal
      :visible="showPreview"
      :rendered-content="renderedContent"
      @close="closeContentPreview"
      @copy-content="copyContent"
    />

    <!-- 多文件取件弹窗 -->
    <MultiFileRetrieveModal
      :visible="showMultiFileModal"
      :code="multiFileCode"
      :files="multiFileItems"
      :date="multiFileDate"
      :total-size="multiFileTotalSize"
      :expired-at="multiFileExpiredAt"
      :expire-style="multiFileExpireStyle"
      :expire-value="multiFileExpireValue"
      @close="closeMultiFileModal"
      @download-item="downloadMultiFileItem"
      @download-zip="downloadMultiFileZip"
    />

    <!-- 收件箱取件弹窗 -->
    <CollectionRetrieveModal
      :visible="showCollectionModal"
      :code="collectionModalCode"
      @close="closeCollectionModal"
    />

    <!-- 收件箱记录详情弹窗（显示三码） -->
    <CollectionRecordDetailModal
      :record="selectedCollectionRecord"
      @close="closeCollectionDetails"
      @go-manage="goCollectionManage"
      @go-retrieve="goCollectionRetrieve"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  SendIcon,
  ClipboardListIcon,
  ShieldCheckIcon,
  InboxIcon,
  UserIcon,
  ArrowRightIcon,
  UploadIcon
} from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import RetrieveForm from '@/components/common/RetrieveForm.vue'
import FileUploadArea from '@/components/common/FileUploadArea.vue'
import ExpirationSelector from '@/components/common/ExpirationSelector.vue'
import TextInputArea from '@/components/common/TextInputArea.vue'
import SideDrawer from '@/components/common/SideDrawer.vue'
import FileDetailModal from '@/components/common/FileDetailModal.vue'
import FileRecordList from '@/components/common/FileRecordList.vue'
import SentRecordList from '@/components/common/SentRecordList.vue'
import CollectionRecordList from '@/components/common/CollectionRecordList.vue'
import MultiFileRetrieveModal from '@/components/common/MultiFileRetrieveModal.vue'
import CollectionRetrieveModal from '@/components/common/CollectionRetrieveModal.vue'
import SentRecordDetailModal from '@/components/common/SentRecordDetailModal.vue'
import CollectionRecordDetailModal from '@/components/common/CollectionRecordDetailModal.vue'
import ContentPreviewModal from '@/components/common/ContentPreviewModal.vue'
import { useSendFlow } from '@/composables/useSendFlow'
import { useConfigStore } from '@/stores/configStore'
import { FileService } from '@/services'
import { CollectionService } from '@/services/collection'
import { useAlertStore } from '@/stores/alertStore'
import { useFileDataStore } from '@/stores/fileData'
import type { ReceivedFileRecord, CollectionRecord } from '@/types'
import type { MultiFileItem } from '@/types/collection'
import { copyToClipboard, copyCollectionRetrieveLink } from '@/utils/clipboard'
import { getErrorMessage } from '@/utils/common'
import { isRecordExpired } from '@/utils/common'
import { renderMarkdownPreview } from '@/utils/content-preview'
import { buildDownloadUrl } from '@/utils/share-url'
import { downloadFile } from '@/utils/download-action'
import { saveAs } from 'file-saver'

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()
const alertStore = useAlertStore()
const fileStore = useFileDataStore()
const { config } = storeToRefs(configStore)

// ==================== Tab 管理 ====================
type TabKey = 'retrieve' | 'send'
const activeTab = ref<TabKey>('retrieve')

const tabs = computed(() => [
  { key: 'retrieve' as TabKey, label: t('home.tabs.retrieve'), icon: ArrowRightIcon },
  { key: 'send' as TabKey, label: t('home.tabs.send'), icon: UploadIcon }
])

// URL query 参数控制初始 Tab 和取件码弹窗
onMounted(() => {
  const queryCode = route.query.code
  if (queryCode && typeof queryCode === 'string') {
    retrieveCode.value = queryCode
  }
  if (route.query.tab === 'send') {
    activeTab.value = 'send'
  }
  // QR码扫描取件码 → 自动提交
  const retrieveParam = route.query.retrieve
  if (retrieveParam && typeof retrieveParam === 'string') {
    retrieveCode.value = retrieveParam
  }
})

// ==================== 取件逻辑 ====================
const retrieveCode = ref('')
const retrieveInputStatus = ref({ readonly: false, loading: false })
const retrieveError = ref('')
const selectedRecord = ref<ReceivedFileRecord | null>(null)
const showPreview = ref(false)
const renderedContent = ref('')
const isMultiFile = ref(false)
const multiFileItems = ref<MultiFileItem[]>([])
const multiFileCode = ref('')

// 多文件弹窗
const showMultiFileModal = ref(false)
const multiFileDate = ref('')
const multiFileTotalSize = ref('')
const multiFileExpiredAt = ref<string | null>(null)
const multiFileExpireStyle = ref('')
const multiFileExpireValue = ref(0)
const isCollectionRetrieve = ref(false)
const collectionCodeForDownload = ref('')

// 收件箱取件弹窗
const showCollectionModal = ref(false)
const collectionModalCode = ref('')

// 收件箱记录详情弹窗
const selectedCollectionRecord = ref<CollectionRecord | null>(null)

const { receiveData: records } = storeToRefs(fileStore)

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 ' + t('fileSize.bytes')
  const k = 1024
  const sizes = [t('fileSize.bytes'), t('fileSize.kb'), t('fileSize.mb'), t('fileSize.gb'), t('fileSize.tb')]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const createRecord = (detail: {
  code: string
  name: string
  text: string
  text_note?: string
  size: number
  is_multi_file?: boolean
  items?: MultiFileItem[]
  expired_at?: string | null
  expire_style?: string
  expire_value?: number
}): ReceivedFileRecord => {
  const isFile = detail.is_multi_file || detail.text.startsWith('/share/download') || detail.name !== 'Text'
  const recordType = detail.is_multi_file ? 'multiFile' : (isFile ? 'file' : 'text')
  return {
    id: Date.now(),
    code: detail.code,
    filename: detail.name,
    size: formatFileSize(detail.size),
    downloadUrl: isFile ? detail.text : null,
    content: isFile ? null : detail.text,
    textNote: detail.text_note || undefined,
    date: new Date().toLocaleString(),
    type: recordType,
    expiredAt: detail.expired_at,
    expireStyle: detail.expire_style,
    expireValue: detail.expire_value,
  }
}

// 智能码输入：自动识别码类型并路由
const CODE_REGEX = /^[A-Z0-9]+$/
let isRetrieving = false

const handleRetrieveSubmit = async () => {
  if (!CODE_REGEX.test(retrieveCode.value)) {
    alertStore.showAlert(t('retrieve.messages.invalidCode'), 'error')
    return
  }

  if (isRetrieving) return
  isRetrieving = true
  retrieveInputStatus.value.readonly = true
  retrieveInputStatus.value.loading = true

  try {
    const checkRes = await FileService.checkCodeType(retrieveCode.value)
    if (checkRes.code === 200 && checkRes.detail) {
      const codeType = checkRes.detail.type

      if (codeType === 'collection') {
        // 收件箱管理码 → 直接跳转到管理详情页
        router.push(`/collection/manage/${retrieveCode.value}`)
        return
      }

      if (codeType === 'retrieve') {
        // 取件码 → 用收件箱取件弹窗展示
        const res = await CollectionService.getRetrieveInfo(retrieveCode.value)
        if (res.code === 200 && res.detail) {
          const files = res.detail.files.filter((f) => f.status === 'completed')
          const totalSize = files.reduce((sum, f) => sum + f.file_size, 0)

          // 保存到取件记录（取件码入口，不存储管理码和投件码）
          const collectionRecord: ReceivedFileRecord = {
            id: Date.now(),
            code: retrieveCode.value,  // 存取件码用于下载
            filename: res.detail.title || t('retrieve.collectionFiles.title'),
            size: formatFileSize(totalSize),
            downloadUrl: null,
            content: null,
            date: new Date().toLocaleString(),
            type: 'multiFile',
            isCollection: true,
            isRetrieveCode: true,  // 标记为取件码入口
            collectionDeliveryCode: '',  // 不存储投件码
            collectionRetrieveCode: retrieveCode.value,
            collectionFiles: files.map((f) => ({
              id: f.id,
              file_name: f.file_name,
              file_size: f.file_size,
              uploader_name: f.uploader_name || '',
            })),
            expiredAt: res.detail.retrieve_expired_at,
            expireStyle: res.detail.retrieve_expire_style,
            expireValue: res.detail.retrieve_expire_value,
          }
          if (!fileStore.receiveData.some((f) => f.code === collectionRecord.code)) {
            fileStore.addReceiveData(collectionRecord)
          } else {
            // 已存在记录，刷新过期信息（管理员可能延长了过期时间）
            fileStore.updateRecordExpiry(
              collectionRecord.code,
              res.detail.retrieve_expired_at,
              res.detail.retrieve_expire_style,
              res.detail.retrieve_expire_value,
            )
          }

          collectionModalCode.value = retrieveCode.value
          showCollectionModal.value = true
        } else {
          const detail = String(res.detail || '')
          if (detail.includes('过期') || detail.includes('expired') || res.code === 410) {
            alertStore.showAlert(t('collection.retrieve.expired') || '收件箱已过期', 'error')
          } else {
            alertStore.showAlert(t('collection.retrieve.notFound'), 'error')
          }
        }
        return
      }

      if (codeType === 'delivery') {
        // 投递码 → 直接跳转到投递上传页
        router.push(`/delivery/upload/${retrieveCode.value}`)
        return
      }

      if (codeType === 'unknown') {
        alertStore.showAlert(t('retrieve.messages.retrieveFailure') + t('retrieve.messages.codeNotFound'), 'error')
        return
      }
    }

    // 普通文件码 → 内联展示结果
    const res = await FileService.selectFile(retrieveCode.value)
    if (res.code === 200 && res.detail) {
      const detail = res.detail as {
        code: string
        name: string
        text: string
        size: number
        is_multi_file?: boolean
        items?: MultiFileItem[]
        expired_at?: string | null
        expire_style?: string
        expire_value?: number
        created_at?: string
      }

      if (detail.is_multi_file && detail.items) {
        isMultiFile.value = true
        multiFileItems.value = detail.items
        multiFileCode.value = detail.code
        multiFileDate.value = detail.created_at
          ? new Date(detail.created_at).toLocaleString()
          : new Date().toLocaleString()
        multiFileTotalSize.value = formatFileSize(detail.size)
        multiFileExpiredAt.value = detail.expired_at || null
        multiFileExpireStyle.value = detail.expire_style || ''
        multiFileExpireValue.value = detail.expire_value || 0
        showMultiFileModal.value = true
      } else {
        isMultiFile.value = false
        multiFileItems.value = []
      }

      const newFileData = createRecord(detail)
      if (isMultiFile.value) {
        newFileData.isMultiFile = true
        newFileData.multiFileItems = detail.items || []
      }
      if (!fileStore.receiveData.some((file) => file.code === newFileData.code)) {
        fileStore.addReceiveData(newFileData)
      }
      selectedRecord.value = newFileData
      alertStore.showAlert(t('retrieve.messages.retrieveSuccess'), 'success')
    } else {
      // 识别过期错误，给出明确提示
      const detail = String(res.detail || '')
      if (detail.includes('过期') || detail.includes('expired')) {
        alertStore.showAlert(t('fileDetail.expired') || '该取件码已过期', 'error')
      } else {
        alertStore.showAlert(t('retrieve.messages.retrieveFailure') + res.detail, 'error')
      }
    }
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err, t('retrieve.messages.unknownError'))
    // 捕获 HTTP 410 过期异常
    if (String(errorMessage).includes('过期') || String(errorMessage).includes('410')) {
      alertStore.showAlert(t('fileDetail.expired') || '该取件码已过期', 'error')
    } else {
      alertStore.showAlert(t('retrieve.messages.networkError') + errorMessage, 'error')
    }
  } finally {
    isRetrieving = false
    retrieveInputStatus.value.readonly = false
    retrieveInputStatus.value.loading = false
    retrieveCode.value = ''
  }
}

const closeMultiFileModal = () => {
  showMultiFileModal.value = false
  isCollectionRetrieve.value = false
  collectionCodeForDownload.value = ''
}

const closeCollectionModal = () => {
  showCollectionModal.value = false
  collectionModalCode.value = ''
}

const downloadMultiFileItem = (itemId: number) => {
  const item = multiFileItems.value.find(i => i.id === itemId)
  const filename = item?.file_name || undefined
  if (isCollectionRetrieve.value && collectionCodeForDownload.value) {
    void downloadFile(CollectionService.getDownloadUrl(itemId, collectionCodeForDownload.value), filename, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
  } else {
    void downloadFile(CollectionService.getMultiFileDownloadUrl(itemId, multiFileCode.value), filename, {
      isExpired: isRecordExpired(multiFileExpiredAt.value, multiFileExpireStyle.value, multiFileExpireValue.value),
      expiredMessage: t('fileDetail.expired')
    })
  }
}

const downloadMultiFileZip = () => {
  if (isCollectionRetrieve.value && collectionCodeForDownload.value) {
    void downloadFile(CollectionService.getZipDownloadUrl(collectionCodeForDownload.value), undefined, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
  } else {
    void downloadFile(CollectionService.getMultiFileZipUrl(multiFileCode.value), `${multiFileCode.value}.zip`, {
      isExpired: isRecordExpired(multiFileExpiredAt.value, multiFileExpireStyle.value, multiFileExpireValue.value),
      expiredMessage: t('fileDetail.expired')
    })
  }
}

// 统一详情弹窗：下载单个文件项（多文件分享）
const downloadSelectedRecordItem = (itemId: number) => {
  const rec = selectedRecord.value
  if (!rec) return
  const item = rec.multiFileItems?.find(i => i.id === itemId)
  const filename = item?.file_name || undefined
  void downloadFile(CollectionService.getMultiFileDownloadUrl(itemId, rec.code), filename, {
    isExpired: isRecordExpired(rec.expiredAt, rec.expireStyle, rec.expireValue),
    expiredMessage: t('fileDetail.expired')
  })
}

// 统一详情弹窗：打包下载（多文件分享 / 收件箱）
const downloadSelectedRecordZip = () => {
  const rec = selectedRecord.value
  if (!rec) return
  if (rec.isCollection) {
    void downloadFile(CollectionService.getZipDownloadUrl(rec.code), `${rec.filename}.zip`, { expiredMessage: t('fileDetail.expired') })
  } else {
    void downloadFile(CollectionService.getMultiFileZipUrl(rec.code), `${rec.code}.zip`, {
      isExpired: isRecordExpired(rec.expiredAt, rec.expireStyle, rec.expireValue),
      expiredMessage: t('fileDetail.expired')
    })
  }
}

const copyContent = async () => {
  if (selectedRecord.value?.content) {
    await copyToClipboard(selectedRecord.value.content, {
      successMsg: t('fileRecord.contentCopied'),
      errorMsg: t('fileRecord.copyFailed'),
      notify: (message, type) => alertStore.showAlert(message, type)
    })
  }
}

const viewDetails = (record: ReceivedFileRecord) => {
  showDrawer.value = false

  // 收件箱记录：不预检过期，由 CollectionRetrieveModal 从后端实时验证
  if (record.isCollection) {
    collectionModalCode.value = record.code
    showCollectionModal.value = true
    return
  }

  // 前端预检：记录已过期则提示（但不阻止查看）
  if (isRecordExpired(record.expiredAt, record.expireStyle, record.expireValue)) {
    alertStore.showAlert(t('fileDetail.expired'), 'warning')
  }

  // 文件、文本、多文件统一进入详情弹窗
  selectedRecord.value = record
}

const closeDetails = () => {
  selectedRecord.value = null
}

const deleteRecord = (id: number) => {
  const index = records.value.findIndex((record) => record.id === id)
  if (index !== -1) {
    fileStore.deleteReceiveData(index)
  }
}

const downloadRecord = (record: ReceivedFileRecord) => {
  const expired = isRecordExpired(record.expiredAt, record.expireStyle, record.expireValue) || record.isExpired

  if (record.content) {
    if (expired) {
      alertStore.showAlert(t('fileDetail.expired'), 'error')
      return
    }
    const blob = new Blob([record.content], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `${record.filename}.txt`)
    return
  }

  // 收件箱：直接打包下载所有文件
  if (record.isCollection) {
    if (expired) {
      alertStore.showAlert(t('fileDetail.expired'), 'error')
      return
    }
    if (!record.collectionFiles || record.collectionFiles.length === 0) {
      alertStore.showAlert(t('retrieve.collectionFiles.noFiles'), 'error')
      return
    }
    void downloadFile(CollectionService.getZipDownloadUrl(record.code), `${record.filename}.zip`, { expiredMessage: t('fileDetail.expired') })
    return
  }

  // 多文件：打包下载
  if (record.isMultiFile) {
    if (expired) {
      alertStore.showAlert(t('fileDetail.expired'), 'error')
      return
    }
    if (!record.multiFileItems || record.multiFileItems.length === 0) {
      alertStore.showAlert(t('retrieve.collectionFiles.noFiles'), 'error')
      return
    }
    void downloadFile(CollectionService.getMultiFileZipUrl(record.code), `${record.code}.zip`, { expiredMessage: t('fileDetail.expired') })
    return
  }

  // 普通文件下载
  if (record.downloadUrl) {
    const url = buildDownloadUrl(record.downloadUrl)
    void downloadFile(url, record.filename || undefined, { isExpired: expired, expiredMessage: t('fileDetail.expired') })
  }
}

const showContentPreview = () => {
  showPreview.value = true
}

const closeContentPreview = () => {
  showPreview.value = false
}

watch(
  () => selectedRecord.value?.content,
  async (content) => {
    if (content) {
      renderedContent.value = await renderMarkdownPreview(content)
    } else {
      renderedContent.value = ''
    }
  },
  { immediate: true }
)

// 自动提交：码输入完毕快速自动提交
let autoSubmitTimer: ReturnType<typeof setTimeout> | null = null

watch(retrieveCode, (newCode) => {
  if (autoSubmitTimer) {
    clearTimeout(autoSubmitTimer)
    autoSubmitTimer = null
  }
  const codeLen = config.value?.codeDigitCount || 8
  if (newCode.length >= codeLen) {
    autoSubmitTimer = setTimeout(() => {
      void handleRetrieveSubmit()
    }, 600)
  }
})

onUnmounted(() => {
  if (autoSubmitTimer) {
    clearTimeout(autoSubmitTimer)
  }
})

// ==================== 发送逻辑 ====================
const {
  selectedFile,
  selectedFiles,
  textContent,
  expirationMethod,
  expirationValue,
  uploadProgress,
  selectedRecord: selectedSendRecord,
  isSubmitting,
  sendRecords,
  uploadDescription,
  expirationOptions,
  closeDetails: closeSendDetails,
  continueDelivery: continueSendDelivery,
  deleteRecord: deleteSendRecord,
  copySentRecordCode,
  copySentRecordLink,
  copySentRecordWgetCommand,
  getQRCodeValue,
  handleFileDrop,
  handleFileSelected,
  handleFilesSelected,
  handlePaste,
  handleSubmit: handleSendSubmit,
  removeFile,
  viewDetails: viewSendDetails
} = useSendFlow()

// ==================== 通用 ====================
const showDrawer = ref(false)

const collectionRecords = computed(() => fileStore.collectionData)

// 记录抽屉 Tab
type RecordTabKey = 'received' | 'sent' | 'collection'
const activeRecordTab = ref<RecordTabKey>('received')

const recordTabs = computed(() => [
  { key: 'received' as RecordTabKey, label: t('records.tabs.retrieve'), icon: ArrowRightIcon, count: records.value.length },
  { key: 'sent' as RecordTabKey, label: t('records.tabs.send'), icon: SendIcon, count: sendRecords.value.length },
  { key: 'collection' as RecordTabKey, label: t('records.tabs.collection'), icon: InboxIcon, count: collectionRecords.value.length }
])

const toggleDrawer = () => {
  showDrawer.value = !showDrawer.value
}

// ==================== 记录列表事件处理（直接分发） ====================
const viewCollectionDetails = (record: CollectionRecord) => {
  showDrawer.value = false
  selectedCollectionRecord.value = record
}

const closeCollectionDetails = () => {
  selectedCollectionRecord.value = null
}

const goCollectionManage = (record: CollectionRecord) => {
  showDrawer.value = false
  selectedCollectionRecord.value = null
  router.push(`/collection/manage/${record.collectionCode}`)
}

const goCollectionRetrieve = async (record: CollectionRecord) => {
  showDrawer.value = false
  selectedCollectionRecord.value = null
  // 通过取件码获取收件箱数据，用收件箱取件弹窗展示
  try {
    const res = await CollectionService.getRetrieveInfo(record.retrieveCode)
    if (res.code === 200 && res.detail) {
      const files = res.detail.files.filter((f) => f.status === 'completed')
      const totalSize = files.reduce((sum, f) => sum + f.file_size, 0)

      // 保存到取件记录（取件码入口，不存储管理码和投件码）
      const collectionRecord: ReceivedFileRecord = {
        id: Date.now(),
        code: record.retrieveCode,  // 存取件码用于下载
        filename: res.detail.title || t('retrieve.collectionFiles.title'),
        size: formatFileSize(totalSize),
        downloadUrl: null,
        content: null,
        date: new Date().toLocaleString(),
        type: 'multiFile',
        isCollection: true,
        isRetrieveCode: true,
        collectionDeliveryCode: '',
        collectionRetrieveCode: record.retrieveCode,
        collectionFiles: files.map((f) => ({
          id: f.id,
          file_name: f.file_name,
          file_size: f.file_size,
          uploader_name: f.uploader_name || '',
        })),
        expiredAt: res.detail.retrieve_expired_at,
        expireStyle: res.detail.retrieve_expire_style,
        expireValue: res.detail.retrieve_expire_value,
      }
      if (!fileStore.receiveData.some((f) => f.code === collectionRecord.code)) {
        fileStore.addReceiveData(collectionRecord)
      } else {
        fileStore.updateRecordExpiry(
          collectionRecord.code,
          res.detail.retrieve_expired_at,
          res.detail.retrieve_expire_style,
          res.detail.retrieve_expire_value,
        )
      }

      collectionModalCode.value = record.retrieveCode
      showCollectionModal.value = true
    } else {
      const detail = String(res.detail || '')
      if (detail.includes('过期') || detail.includes('expired') || res.code === 410) {
        alertStore.showAlert(t('collection.retrieve.expired') || '收件箱已过期', 'error')
      } else {
        alertStore.showAlert(t('collection.retrieve.notFound'), 'error')
      }
    }
  } catch (err: unknown) {
    const msg = getErrorMessage(err, t('collection.retrieve.loadFailed'))
    if (String(msg).includes('过期') || String(msg).includes('410')) {
      alertStore.showAlert(t('collection.retrieve.expired') || '收件箱已过期', 'error')
    } else {
      alertStore.showAlert(msg, 'error')
    }
  }
}

const deleteCollectionRecord = (id: number) => {
  fileStore.removeCollectionRecord(id)
}

const copyCollectionRecordLink = async (record: CollectionRecord) => {
  await copyCollectionRetrieveLink(record.retrieveCode, {
    notify: (message, type) => alertStore.showAlert(message, type),
  })
}
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
