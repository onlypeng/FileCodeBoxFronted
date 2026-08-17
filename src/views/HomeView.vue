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
          <PageHeader :title="config.name" />

          <!-- ========== 查码（取件） ========== -->
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

          <!-- 发件入口：跳转到发件页面 -->
          <button
            type="button"
            @click="router.push('/send')"
            class="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 border"
            :class="[
              isDarkMode
                ? 'border-gray-600 text-gray-400 hover:text-indigo-400 hover:border-indigo-500 bg-gray-800/40'
                : 'border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-400 bg-gray-50'
            ]"
          >
            <SendIcon class="w-4 h-4" />
            {{ t('retrieve.needSendFile') }}
          </button>
        </div>

        <!-- 页面说明（后台可配置，展示在首页底部） -->
        <p
          v-if="config.page_explain"
          class="px-8 py-3 text-center text-xs leading-relaxed"
          :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']"
        >
          {{ config.page_explain }}
        </p>

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
              to="/direct"
              class="hover:text-indigo-300 transition duration-300 flex items-center"
              :class="[isDarkMode ? 'text-gray-400 hover:text-amber-400' : 'text-gray-500 hover:text-amber-500']"
              :title="t('home.createDirect')"
            >
              <HouseIcon class="w-4 h-4" />
            </router-link>
            <router-link
              to="/collection/create"
              class="hover:text-indigo-300 transition duration-300 flex items-center"
              :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600']"
              :title="t('home.createCollection')"
            >
              <InboxIcon class="w-4 h-4" />
            </router-link>
            <router-link
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
      <div class="flex border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
        <button
          v-for="tab in drawerTabs"
          :key="tab.key"
          @click="drawerTab = tab.key"
          class="flex-1 py-3 text-sm font-medium transition-colors relative"
          :class="[
            drawerTab === tab.key
              ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              : isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          {{ tab.label }}
          <span
            v-if="drawerTab === tab.key"
            class="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-500 rounded-full"
          ></span>
        </button>
      </div>
      <FileRecordList
        v-if="drawerTab === 'retrieve'"
        :records="records"
        @view-details="viewDetails"
        @download-record="downloadRecord"
        @delete-record="deleteRecord"
      />
      <SentRecordList
        v-if="drawerTab === 'send'"
        :records="sendRecords"
        @copy-link="copySentRecordLink"
        @view-details="viewSendDetails"
        @delete-record="deleteSendRecord"
      />
      <CollectionRecordList
        v-if="drawerTab === 'collection'"
        :records="collectionRecords"
        @go-manage="goCollectionManage"
        @go-retrieve="goCollectionRetrieve"
        @delete-record="deleteCollectionRecord"
      />
      <DirectRecordList
        v-if="drawerTab === 'direct'"
        :records="directRecords"
        @view-details="viewDirectRoomDetails"
        @go-room="goDirectRoom"
        @delete-record="deleteDirectRecord"
      />
    </SideDrawer>

    <!-- 成功/详情弹窗（发件成功、投件详情） -->
    <SuccessModal
      :visible="!!selectedSendRecord"
      :title="t('send.fileDetails')"
      :subtitle="selectedSendRecord?.filename"
      :codes="sendSuccessCodes"
      :wget-command="sendSuccessWget"
      :files="sendSuccessFiles"
      @close="closeSendDetails"
    />

    <!-- 内容预览弹窗 -->
    <ContentPreviewModal
      :visible="showPreview"
      :rendered-content="renderedContent"
      @close="closeContentPreview"
      @copy-content="copyContent"
    />

    <!-- 统一查看弹窗（取件结果 / 记录-收件查看 / 单文件 / 多文件 / 文本 / 收件箱） -->
    <MultiFileRetrieveModal
      :visible="showMultiFileModal"
      :code="multiFileCode"
      :files="multiFileItems"
      :date="multiFileDate"
      :total-size="multiFileTotalSize"
      :expired-at="multiFileExpiredAt"
      :expire-style="multiFileExpireStyle"
      :expire-value="multiFileExpireValue"
      :expire-text="multiFileExpireText"
      :is-expired="multiFileIsExpired"
      :single="isSingleFileModal"
      :remark="multiFileRemark"
      :text="multiFileText"
      :show-preview="multiFileShowPreview"
      :collection="collectionModalData"
      @close="closeMultiFileModal"
      @download-item="downloadMultiFileItem"
      @download-zip="downloadMultiFileZip"
      @download-single="downloadSingleFileRecord"
      @download-collection-item="downloadCollectionItem"
      @download-collection-zip="downloadCollectionZip"
      @preview-content="showContentPreview"
    />

    <!-- 发件记录查看弹窗（文件/多文件统一使用多文件弹窗，仅查看无下载） -->
    <MultiFileRetrieveModal
      :visible="sentModal.visible"
      :code="sentModal.code"
      :files="sentModal.items"
      :date="sentModal.date"
      :total-size="sentModal.totalSize"
      :single="sentModal.single"
      :text="sentModal.text"
      :remark="sentModal.remark"
      :show-downloads="false"
      :show-retrieve-time="false"
      :created-date="sentModal.createdDate"
      :expire-text="sentModal.expireText"
      :is-expired="sentModal.isExpired"
      @close="closeSentModal"
    />

    <!-- 直连房间信息弹窗（记录-直连-查看） -->
    <DirectRoomInfoModal
      :visible="!!directRoomModalCode"
      :room-code="directRoomModalCode"
      @close="directRoomModalCode = ''"
      @enter-room="enterDirectRoomFromModal"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  SendIcon,
  ClipboardListIcon,
  ShieldCheckIcon,
  InboxIcon,
  UserIcon,
  HouseIcon
} from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import RetrieveForm from '@/components/common/RetrieveForm.vue'
import SideDrawer from '@/components/common/SideDrawer.vue'
import FileRecordList from '@/components/common/FileRecordList.vue'
import SentRecordList from '@/components/common/SentRecordList.vue'
import CollectionRecordList from '@/components/common/CollectionRecordList.vue'
import DirectRecordList from '@/components/common/DirectRecordList.vue'
import DirectRoomInfoModal from '@/components/common/DirectRoomInfoModal.vue'
import MultiFileRetrieveModal from '@/components/common/MultiFileRetrieveModal.vue'
import SuccessModal from '@/components/common/SuccessModal.vue'
import ContentPreviewModal from '@/components/common/ContentPreviewModal.vue'
import { useRetrieveFlow, useRetrieveUrls, useSendFlow, useClipboard } from '@/composables'
import type { ApiResponse } from '@/types'
import { useConfigStore } from '@/stores/configStore'
import { useAlertStore } from '@/stores/alertStore'
import { useConfirmStore } from '@/stores/confirmStore'
import { useFileDataStore } from '@/stores/fileData'
import type { DirectRecord, ReceivedFileRecord, CollectionRecord } from '@/types'
import type { MultiFileItem, CollectionManageResponse, CollectionRetrieveResponse } from '@/types/collection'
import { getErrorMessage, isRecordExpired, formatFileSize } from '@/utils/common'
import { renderMarkdownPreview } from '@/utils/content-preview'
import { buildAppUrl, buildDownloadUrl, buildRetrieveUrl, buildWgetCommand } from '@/utils/share-url'
import { downloadFile, downloadBlob } from '@/utils/download-action'

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()
const alertStore = useAlertStore()
const confirmStore = useConfirmStore()
const fileStore = useFileDataStore()
const { config } = storeToRefs(configStore)
const retrieveFlow = useRetrieveFlow()
const retrieveUrls = useRetrieveUrls()
const { copy: copyText } = useClipboard()

// URL query 参数控制初始取件码：仅链接/二维码带码时自动查询一次；手动输入码需点击查询
onMounted(() => {
  const retrieveParam = route.query.retrieve
  const queryCode = route.query.code
  const code = (typeof retrieveParam === 'string' && retrieveParam) || (typeof queryCode === 'string' && queryCode)
  if (code) {
    retrieveCode.value = code
    void handleRetrieveSubmit()
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
const multiFileItems = ref<Array<MultiFileItem & { sizeText?: string }>>([])
const multiFileCode = ref('')

// 多文件弹窗
const showMultiFileModal = ref(false)
const multiFileDate = ref('')
const multiFileTotalSize = ref('')
const multiFileExpiredAt = ref<string | null>(null)
const multiFileExpireStyle = ref('')
const multiFileExpireValue = ref(0)
/** 取件弹窗强制过期状态（后端确认过期但本地无过期时间时置 true，驱动过期横幅） */
const multiFileIsExpired = ref(false)
/** 取件弹窗实时剩余次数（count 模式，后端 selectFile 每次取件后返回最新值） */
const multiFileExpiredCount = ref<number | null>(null)
/** 取件弹窗过期时间文案（时间型→到期时间；次数型→实时剩余次数；永久→永久） */
const multiFileExpireText = computed(() =>
  formatExpireText(multiFileExpireStyle.value, multiFileExpireValue.value, multiFileExpiredAt.value, multiFileExpiredCount.value)
)
// 文件备注
const multiFileRemark = ref<string | null>(null)
// 文本查看状态（统一查看弹窗文本模式）
const multiFileText = ref<string | null | undefined>(undefined)
const multiFileShowPreview = ref(false)
// 收件箱查看状态（统一查看弹窗收件箱模式；取件人视角不携带投件码，仅管理视角可选传入）
const collectionModalData = ref<{
  title: string
  /** 管理码：创建者/收件人视角传入，展示管理卡片 */
  collectionCode?: string
  deliveryCode?: string
  files: Array<{ id: number; file_name: string; file_size: number; uploader_name?: string }>
  /** 收件箱（管理码）过期时间文案 */
  collectionExpire?: string
  deliveryExpire?: string
  retrieveExpire?: string
} | null>(null)
const collectionZipCode = ref('')
// 单文件记录复用多文件弹窗（single 模式）
const isSingleFileModal = ref(false)
const singleFileRecord = ref<ReceivedFileRecord | null>(null)
const isCollectionRetrieve = ref(false)
const collectionCodeForDownload = ref('')

const { receiveData: records } = storeToRefs(fileStore)

const baseUrl = buildAppUrl()

const createRecord = (detail: {
  code: string
  name: string
  text: string
  size: number
  is_multi_file?: boolean
  items?: MultiFileItem[]
  expired_at?: string | null
  expire_style?: string
  expire_value?: number
  expired_count?: number | null
  remark?: string | null
}): ReceivedFileRecord => {
  // 文件判定：多文件，或 text 为可下载 URL（/share/download 或 http(s)）。
  // 仅备注分享（无文件）text=remark 纯文本 → 归为文本；不再依赖 name/prefix 判定（prefix 已统一为空）
  const textVal = detail.text || ''
  const isFile = detail.is_multi_file || textVal.startsWith('/share/download') || /^https?:\/\//.test(textVal)
  const recordType = detail.is_multi_file ? 'multiFile' : (isFile ? 'file' : 'text')
  // 多文件与单文件名称保持一致：多文件显示"第一个文件名 + 等N个文件"
  const recordName = detail.is_multi_file && detail.items && detail.items.length > 0
    ? t('records.multiFileName', { name: detail.items[0].file_name, count: detail.items.length })
    : detail.name
  return {
    id: Date.now(),
    code: detail.code,
    filename: recordName,
    size: formatFileSize(detail.size),
    downloadUrl: isFile ? detail.text : null,
    content: isFile ? null : detail.text,
    date: new Date().toLocaleString(),
    type: recordType,
    remark: detail.remark ?? null,
    expiredAt: detail.expired_at,
    expireStyle: detail.expire_style,
    expireValue: detail.expire_value,
    expiredCount: typeof detail.expired_count === 'number' ? detail.expired_count : null,
  }
}

// 智能码输入：自动识别码类型并路由
const CODE_REGEX = /^[A-Z0-9]{6}$/
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
    const checkRes = await retrieveFlow.checkCodeType(retrieveCode.value)
    if (checkRes.code === 200 && checkRes.detail) {
      const codeType = checkRes.detail.type

      if (codeType === 'collection') {
        // 收件箱管理码 → 直接跳转到管理详情页
        router.push(`/collection/manage/${retrieveCode.value}`)
        return
      }

      if (codeType === 'retrieve') {
        // 取件码 → 用收件箱取件弹窗展示
        const res = await retrieveFlow.getRetrieveInfo(retrieveCode.value)
        if (res.code === 200 && res.detail) {
          const files = res.detail.files.filter((f: any) => f.status === 'completed')
          const totalSize = files.reduce((sum: number, f: any) => sum + f.file_size, 0)

          // 保存到取件记录（code 存取件码，ZIP/单文件下载均支持取件码）
          const collectionRecord: ReceivedFileRecord = {
            id: Date.now(),
            code: retrieveCode.value,
            filename: res.detail.title || t('retrieve.collectionFiles.title'),
            size: formatFileSize(totalSize),
            downloadUrl: null,
            content: null,
            date: new Date().toLocaleString(),
            type: 'multiFile',
            isCollection: true,
            collectionRetrieveCode: retrieveCode.value,
            collectionFiles: files.map((f: any) => ({
              id: f.id,
              file_name: f.file_name,
              file_size: f.file_size,
              uploader_name: f.uploader_name || '',
            })),
          }
          if (!fileStore.receiveData.some((f) => f.code === collectionRecord.code)) {
            fileStore.addReceiveData(collectionRecord)
          }

          // 打开统一收件箱查看弹窗（取件码用于二维码与 ZIP/单文件下载）
          multiFileCode.value = retrieveCode.value
          collectionZipCode.value = res.detail.retrieve_code || retrieveCode.value
          collectionModalData.value = {
            title: res.detail.title || t('retrieve.collectionFiles.title'),
            retrieveExpire: formatExpireText(res.detail.retrieve_expire_style, res.detail.retrieve_expire_value, res.detail.retrieve_expired_at),
            files: files.map((f: any) => ({
              id: f.id,
              file_name: f.file_name,
              file_size: f.file_size,
              uploader_name: f.uploader_name || '',
            })),
          }
          multiFileDate.value = res.detail.created_at
            ? new Date(res.detail.created_at).toLocaleString()
            : new Date().toLocaleString()
          multiFileTotalSize.value = formatFileSize(totalSize)
          isMultiFile.value = false
          isSingleFileModal.value = false
          multiFileText.value = undefined
          multiFileRemark.value = null
          showMultiFileModal.value = true
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

      if (codeType === 'direct') {
        // 临时房间房间码 → 直接跳转到直连房间
        router.push(`/direct/room/${retrieveCode.value}`)
        return
      }

      if (codeType === 'unknown') {
        alertStore.showAlert(t('retrieve.messages.retrieveFailure') + t('retrieve.messages.codeNotFound'), 'error')
        return
      }
    }

    // 普通文件码 → 内联展示结果
    const res = await retrieveFlow.selectFile(retrieveCode.value)
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
        expired_count?: number | null
        remark?: string | null
      }

      if (detail.is_multi_file && detail.items) {
        isMultiFile.value = true
        multiFileItems.value = detail.items
        multiFileCode.value = detail.code
        multiFileDate.value = (detail as any).created_at
          ? new Date((detail as any).created_at).toLocaleString()
          : new Date().toLocaleString()
        multiFileTotalSize.value = formatFileSize(detail.size)
        multiFileExpiredAt.value = detail.expired_at || null
        multiFileExpireStyle.value = detail.expire_style || ''
        multiFileExpireValue.value = detail.expire_value || 0
        multiFileExpiredCount.value = typeof detail.expired_count === 'number' ? detail.expired_count : null
        multiFileRemark.value = detail.remark || null
        multiFileText.value = undefined
        multiFileShowPreview.value = false
        collectionModalData.value = null
        showMultiFileModal.value = true
      } else {
        isMultiFile.value = false
        multiFileItems.value = []
        multiFileRemark.value = detail.remark || null
        multiFileText.value = undefined
        multiFileShowPreview.value = false
        collectionModalData.value = null
      }

      const newFileData = createRecord(detail)
      if (isMultiFile.value) {
        newFileData.isMultiFile = true
        newFileData.multiFileItems = detail.items || []
      }
      if (!fileStore.receiveData.some((file) => file.code === newFileData.code)) {
        fileStore.addReceiveData(newFileData)
      }
      // 与"记录-收件-查看"一致，共用 MultiFileRetrieveModal：
      // 文本 → 文本模式（含预览按钮），单文件/多文件 → single / 列表模式
      if (isMultiFile.value) {
        // 多文件已在上方填充数据并打开弹窗，无需处理
      } else if (newFileData.content) {
        // 文本 → 统一查看弹窗文本模式
        selectedRecord.value = newFileData
        isMultiFile.value = false
        isSingleFileModal.value = false
        multiFileCode.value = newFileData.code
        multiFileItems.value = []
        multiFileDate.value = newFileData.date
        multiFileTotalSize.value = newFileData.size
        multiFileExpiredAt.value = newFileData.expiredAt || null
        multiFileExpireStyle.value = newFileData.expireStyle || ''
        multiFileExpireValue.value = newFileData.expireValue || 0
        multiFileExpiredCount.value = newFileData.expiredCount ?? null
        multiFileRemark.value = null
        multiFileText.value = newFileData.content
        multiFileShowPreview.value = true
        collectionModalData.value = null
        nextTick(() => { showMultiFileModal.value = true })
      } else {
        // 单文件 → 复用多文件弹窗（single 模式）
        selectedRecord.value = null
        isMultiFile.value = false
        isSingleFileModal.value = true
        singleFileRecord.value = newFileData
        multiFileCode.value = newFileData.code
        multiFileItems.value = [{ id: 0, file_name: newFileData.filename, file_size: 0, sizeText: newFileData.size }]
        multiFileDate.value = newFileData.date
        multiFileTotalSize.value = newFileData.size
        multiFileExpiredAt.value = newFileData.expiredAt || null
        multiFileExpireStyle.value = newFileData.expireStyle || ''
        multiFileExpireValue.value = newFileData.expireValue || 0
        multiFileRemark.value = newFileData.remark || null
        multiFileText.value = undefined
        multiFileShowPreview.value = false
        collectionModalData.value = null
        nextTick(() => { showMultiFileModal.value = true })
      }
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

const closeResult = () => {
  selectedRecord.value = null
  isMultiFile.value = false
  multiFileItems.value = []
  multiFileCode.value = ''
}

const closeMultiFileModal = () => {
  showMultiFileModal.value = false
  multiFileIsExpired.value = false
  isCollectionRetrieve.value = false
  collectionCodeForDownload.value = ''
  isSingleFileModal.value = false
  singleFileRecord.value = null
  multiFileRemark.value = null
  multiFileText.value = undefined
  multiFileShowPreview.value = false
  collectionModalData.value = null
  collectionZipCode.value = ''
  selectedRecord.value = null
}

/** 收件箱模式：单文件下载（取件码用于校验） */
const downloadCollectionItem = (itemId: number) => {
  const file = collectionModalData.value?.files?.find((f) => f.id === itemId)
  const filename = file?.file_name || undefined
  void downloadFile(retrieveUrls.getDownloadUrl(itemId, multiFileCode.value), filename, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
}

/** 收件箱模式：ZIP 打包下载（使用管理码更可靠） */
const downloadCollectionZip = () => {
  const zipCode = collectionZipCode.value || multiFileCode.value
  void downloadFile(retrieveUrls.getZipDownloadUrl(zipCode), `${zipCode}.zip`, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
}

const downloadSingleFileRecord = () => {
  const record = singleFileRecord.value
  if (!record?.downloadUrl) {
    alertStore.showAlert(t('fileDetail.expired'), 'error')
    return
  }
  const expired = isRecordExpired(record.expiredAt, record.expireStyle, record.expireValue) || record.isExpired
  void downloadFile(buildDownloadUrl(record.downloadUrl), record.filename || undefined, { isExpired: expired, expiredMessage: t('fileDetail.expired') })
}

const downloadMultiFileItem = (itemId: number) => {
  // 单文件记录：直接下载
  if (isSingleFileModal.value) {
    downloadSingleFileRecord()
    return
  }
  const item = multiFileItems.value.find(i => i.id === itemId)
  const filename = item?.file_name || undefined
  if (isCollectionRetrieve.value && collectionCodeForDownload.value) {
    void downloadFile(retrieveUrls.getDownloadUrl(itemId, collectionCodeForDownload.value), filename, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
  } else {
    void downloadFile(retrieveUrls.getMultiFileDownloadUrl(itemId, multiFileCode.value), filename, {
      isExpired: isRecordExpired(multiFileExpiredAt.value, multiFileExpireStyle.value, multiFileExpireValue.value),
      expiredMessage: t('fileDetail.expired')
    })
  }
}

const downloadMultiFileZip = () => {
  // 单文件记录也统一打包下载
  if (isCollectionRetrieve.value && collectionCodeForDownload.value) {
    void downloadFile(retrieveUrls.getZipDownloadUrl(collectionCodeForDownload.value), undefined, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
  } else {
    void downloadFile(retrieveUrls.getMultiFileZipUrl(multiFileCode.value), `${multiFileCode.value}.zip`, {
      isExpired: isRecordExpired(multiFileExpiredAt.value, multiFileExpireStyle.value, multiFileExpireValue.value),
      expiredMessage: t('fileDetail.expired')
    })
  }
}

const copyContent = async () => {
  if (selectedRecord.value?.content) {
    await copyText(selectedRecord.value.content, {
      successMsg: t('fileRecord.contentCopied'),
      errorMsg: t('fileRecord.copyFailed')
    })
  }
}

const viewDetails = async (record: ReceivedFileRecord) => {
  // 打开记录查看时保持记录抽屉打开，不自动关闭

  // 前端预检：本地已过期 → 标记"已过期"，弹窗内展示过期横幅并继续用本地缓存展示
  const localExpired = isRecordExpired(record.expiredAt, record.expireStyle, record.expireValue)
  if (localExpired) {
    record.isExpired = true
  }

  if (record.isCollection) {
    if (localExpired) {
      // 收件箱已过期：直接用本地缓存的文件列表展示
      openCollectionFromCache(record)
    } else {
      // 收件箱 → 统一查看弹窗（收件箱模式），拉取最新文件列表
      void openCollectionRetrieve(record.collectionRetrieveCode || record.code, record.code)
    }
    return
  }

  // 普通文件/多文件/文本记录：本地未过期时才拉后台刷新最新状态（本地已过期则直接用缓存展示）
  if (!localExpired) {
    try {
      const res = await retrieveFlow.getFileInfo(record.code)
      if (res.code === 410 || (res.code !== 200 && String(res.detail || '').includes('过期'))) {
        // 后端确认已过期 → 标记"已过期"，弹窗内展示过期横幅并继续用本地缓存展示
        fileStore.markRecordExpired(record.code)
        record.isExpired = true
      } else if (res.code === 200 && res.detail) {
        const detail = res.detail as any
        record.expiredAt = detail.expired_at ?? null
        record.expireStyle = detail.expire_style || record.expireStyle
        record.expireValue = detail.expire_value ?? record.expireValue
        record.expiredCount = typeof detail.expired_count === 'number' ? detail.expired_count : null
        if (detail.is_multi_file && Array.isArray(detail.items)) {
          record.multiFileItems = detail.items
        }
        // 同步弹窗数据源
        multiFileExpiredAt.value = record.expiredAt ?? null
        multiFileExpireStyle.value = record.expireStyle || ''
        multiFileExpireValue.value = record.expireValue || 0
        multiFileExpiredCount.value = record.expiredCount ?? null
      }
    } catch {
      // 网络失败：回退本地快照展示
    }
  }

  if (record.isMultiFile) {
    // 多文件 → 弹窗
    isSingleFileModal.value = false
    singleFileRecord.value = null
    isMultiFile.value = true
    multiFileCode.value = record.code
    multiFileItems.value = record.multiFileItems || []
    multiFileDate.value = record.date
    multiFileTotalSize.value = record.size
    multiFileExpiredAt.value = record.expiredAt || null
    multiFileExpireStyle.value = record.expireStyle || ''
    multiFileExpireValue.value = record.expireValue || 0
    multiFileIsExpired.value = !!record.isExpired
    multiFileRemark.value = record.remark || null
    multiFileText.value = undefined
    multiFileShowPreview.value = false
    collectionModalData.value = null
    nextTick(() => { showMultiFileModal.value = true })
  } else if (record.content) {
    // 文本 → 统一用文件弹窗（文本内容作为备注展示），不再单独文本弹窗
    isMultiFile.value = false
    selectedRecord.value = null
    isSingleFileModal.value = true
    singleFileRecord.value = null
    multiFileCode.value = record.code
    multiFileItems.value = [{ id: 0, file_name: record.filename || record.content || '', file_size: 0, sizeText: record.size }]
    multiFileDate.value = record.date
    multiFileTotalSize.value = record.size
    multiFileExpiredAt.value = record.expiredAt || null
    multiFileExpireStyle.value = record.expireStyle || ''
    multiFileExpireValue.value = record.expireValue || 0
    multiFileIsExpired.value = !!record.isExpired
    multiFileRemark.value = record.content
    multiFileText.value = undefined
    multiFileShowPreview.value = false
    collectionModalData.value = null
    nextTick(() => { showMultiFileModal.value = true })
  } else {
    // 单文件 → 复用多文件弹窗（single 模式）
    isMultiFile.value = false
    selectedRecord.value = null
    isSingleFileModal.value = true
    singleFileRecord.value = record
    multiFileCode.value = record.code
    multiFileItems.value = [{ id: 0, file_name: record.filename, file_size: 0, sizeText: record.size }]
    multiFileDate.value = record.date
    multiFileTotalSize.value = record.size
    multiFileExpiredAt.value = record.expiredAt || null
    multiFileExpireStyle.value = record.expireStyle || ''
    multiFileExpireValue.value = record.expireValue || 0
    multiFileIsExpired.value = !!record.isExpired
    multiFileRemark.value = record.remark || null
    multiFileText.value = undefined
    multiFileShowPreview.value = false
    collectionModalData.value = null
    nextTick(() => { showMultiFileModal.value = true })
  }
}

/** 格式化码过期时间文案（style/value/expiredAt 三选一即可；count 模式优先显示实时剩余次数 count） */
const formatExpireText = (style?: string, value?: number, expiredAt?: string | null, count?: number | null): string => {
  if (!style) return ''
  if (style === 'forever') return t('retrieve.expireForever')
  if (style === 'count') return t('retrieve.expireCount', { count: count ?? value ?? 0 })
  if (expiredAt) return new Date(expiredAt).toLocaleString()
  if (value) {
    const units: Record<string, string> = {
      day: t('retrieve.unitDay'),
      hour: t('retrieve.unitHour'),
      minute: t('retrieve.unitMinute')
    }
    return t('retrieve.expireAfter', { value, unit: units[style] || style })
  }
  return ''
}

/** 收件箱过期时：用本地缓存的文件列表直接展示（不再依赖后台拉取） */
const openCollectionFromCache = (record: ReceivedFileRecord) => {
  const files = record.collectionFiles || []
  const totalSize = files.reduce((sum, f) => sum + (f.file_size || 0), 0)
  multiFileCode.value = record.code
  collectionZipCode.value = record.collectionRetrieveCode || record.code
  collectionModalData.value = {
    title: record.filename || t('retrieve.collectionFiles.title'),
    retrieveExpire: t('fileDetail.expired') || '该取件码已过期',
    files: files.map((f) => ({
      id: f.id,
      file_name: f.file_name,
      file_size: f.file_size,
      uploader_name: f.uploader_name || '',
    })),
  }
  multiFileDate.value = record.date
  multiFileTotalSize.value = formatFileSize(totalSize)
  multiFileIsExpired.value = true
  isMultiFile.value = false
  isSingleFileModal.value = false
  multiFileText.value = undefined
  multiFileRemark.value = null
  showMultiFileModal.value = true
}

/** 通过取件码拉取收件箱信息并用统一查看弹窗展示 */
const openCollectionRetrieve = async (retrieveCode: string, zipCode: string) => {
  try {
    const res = await retrieveFlow.getRetrieveInfo(retrieveCode)
    if (res.code === 200 && res.detail) {
      const files = res.detail.files.filter((f: any) => f.status === 'completed')
      const totalSize = files.reduce((sum: number, f: any) => sum + f.file_size, 0)
      multiFileCode.value = retrieveCode
      // 取件码视角：ZIP/单文件下载均使用取件码，不携带投件码信息
      collectionZipCode.value = zipCode || res.detail.retrieve_code || retrieveCode
      collectionModalData.value = {
        title: res.detail.title || t('retrieve.collectionFiles.title'),
        retrieveExpire: formatExpireText(res.detail.retrieve_expire_style, res.detail.retrieve_expire_value, res.detail.retrieve_expired_at),
        files: files.map((f: any) => ({
          id: f.id,
          file_name: f.file_name,
          file_size: f.file_size,
          uploader_name: f.uploader_name || '',
        })),
      }
      multiFileDate.value = res.detail.created_at
        ? new Date(res.detail.created_at).toLocaleString()
        : new Date().toLocaleString()
      multiFileTotalSize.value = formatFileSize(totalSize)
      isMultiFile.value = false
      isSingleFileModal.value = false
      multiFileText.value = undefined
      multiFileRemark.value = null
      showMultiFileModal.value = true
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
    downloadBlob(blob, `${record.filename}.txt`)
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
    void downloadFile(retrieveUrls.getZipDownloadUrl(record.code), `${record.filename}.zip`, { expiredMessage: t('fileDetail.expired') })
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
    void downloadFile(retrieveUrls.getMultiFileZipUrl(record.code), `${record.code}.zip`, { expiredMessage: t('fileDetail.expired') })
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

// ==================== 发送逻辑 ====================
const {
  selectedRecord: selectedSendRecord,
  sendRecords,
  closeDetails: closeSendDetails,
  deleteRecord: deleteSendRecord,
  sentModal,
  closeSentModal,
  copySentRecordLink,
  viewDetails: viewSendDetails
} = useSendFlow()

// 发件成功 / 投件详情 → 统一成功弹窗
const sendSuccessCodes = computed(() => {
  const r = selectedSendRecord.value
  if (!r) return []
  const link = buildRetrieveUrl(r.retrieveCode)
  return [{
    label: t('retrieve.codeInput.label'),
    code: r.retrieveCode,
    qrValue: link,
    hint: t('retrieve.scanToRetrieve'),
    copyLinkText: t('collection.create.copyRetrieveLink'),
    copyLinkUrl: link
  }]
})
const sendSuccessWget = computed(() => {
  const r = selectedSendRecord.value
  return r ? buildWgetCommand(r.retrieveCode, r.filename) : null
})
const sendSuccessFiles = computed(() => {
  const r = selectedSendRecord.value
  return (r?.files || []).map((f) => ({ name: f.name, size: formatFileSize(f.size) }))
})

// ==================== 通用 ====================
const showDrawer = ref(false)
const drawerTab = ref<'retrieve' | 'send' | 'collection' | 'direct'>('retrieve')

const collectionRecords = computed(() => fileStore.collectionData)
const directRecords = computed(() => fileStore.directData)

const drawerTabs = computed(() => [
  { key: 'retrieve' as const, label: t('records.tabs.retrieve') },
  { key: 'send' as const, label: t('records.tabs.send') },
  { key: 'collection' as const, label: t('records.tabs.collection') },
  { key: 'direct' as const, label: t('records.tabs.direct') }
])

const toggleDrawer = () => {
  if (!showDrawer.value) {
    // 打开时默认切换到取件记录
    drawerTab.value = 'retrieve'
  }
  showDrawer.value = !showDrawer.value
}

const goCollectionManage = (record: CollectionRecord) => {
  showDrawer.value = false
  router.push(`/collection/manage/${record.collectionCode}`)
}

const goCollectionRetrieve = async (record: CollectionRecord) => {
  // 保持记录抽屉打开，仅弹出查看窗口
  try {
    // 收件箱记录持有管理码：优先拉取管理信息以展示完整三码及各自过期时间
    let manageDetail: CollectionManageResponse | null = null
    let res: ApiResponse<CollectionRetrieveResponse>
    try {
      const manageRes = await retrieveFlow.getManageInfo(record.collectionCode)
      if (manageRes.code === 200 && manageRes.detail) {
        manageDetail = manageRes.detail
        res = manageRes as unknown as ApiResponse<CollectionRetrieveResponse>
      } else {
        res = await retrieveFlow.getRetrieveInfo(record.retrieveCode)
      }
    } catch {
      res = await retrieveFlow.getRetrieveInfo(record.retrieveCode)
    }

    if (res.code === 200 && res.detail) {
      const files = res.detail.files.filter((f: any) => f.status === 'completed')
      const totalSize = files.reduce((sum: number, f: any) => sum + f.file_size, 0)

      // 保存到取件记录（code 存取件码，ZIP/单文件下载均支持取件码）
      const collectionRecord: ReceivedFileRecord = {
        id: Date.now(),
        code: record.retrieveCode,
        filename: res.detail.title || t('retrieve.collectionFiles.title'),
        size: formatFileSize(totalSize),
        downloadUrl: null,
        content: null,
        date: new Date().toLocaleString(),
        type: 'multiFile',
        isCollection: true,
        collectionRetrieveCode: record.retrieveCode,
        collectionFiles: files.map((f: any) => ({
          id: f.id,
          file_name: f.file_name,
          file_size: f.file_size,
          uploader_name: f.uploader_name || '',
        })),
      }
      if (!fileStore.receiveData.some((f) => f.code === collectionRecord.code)) {
        fileStore.addReceiveData(collectionRecord)
      }

      // 打开统一收件箱查看弹窗：管理视角展示完整三码及各自过期时间
      multiFileCode.value = record.retrieveCode
      collectionZipCode.value = res.detail.retrieve_code || record.retrieveCode
      collectionModalData.value = {
        title: res.detail.title || t('retrieve.collectionFiles.title'),
        // 管理码信息（记录-收件箱-查看）：展示管理卡片与收件箱过期时间
        collectionCode: manageDetail?.collection_code || record.collectionCode,
        deliveryCode: manageDetail?.delivery_code || record.deliveryCode || undefined,
        collectionExpire: manageDetail
          ? formatExpireText(manageDetail.expire_style, manageDetail.expire_value, manageDetail.expired_at)
          : record.collectionExpire,
        deliveryExpire: manageDetail
          ? formatExpireText(manageDetail.delivery_expire_style, manageDetail.delivery_expire_value, manageDetail.delivery_expired_at)
          : record.deliveryExpire,
        retrieveExpire: formatExpireText(res.detail.retrieve_expire_style, res.detail.retrieve_expire_value, res.detail.retrieve_expired_at),
        files: files.map((f: any) => ({
          id: f.id,
          file_name: f.file_name,
          file_size: f.file_size,
          uploader_name: f.uploader_name || '',
        })),
      }
      multiFileDate.value = res.detail.created_at
        ? new Date(res.detail.created_at).toLocaleString()
        : new Date().toLocaleString()
      multiFileTotalSize.value = formatFileSize(totalSize)
      isMultiFile.value = false
      isSingleFileModal.value = false
      multiFileText.value = undefined
      multiFileRemark.value = null
      showMultiFileModal.value = true
    } else {
      const detail = String(res.detail || '')
      if (detail.includes('过期') || detail.includes('expired') || res.code === 410) {
        alertStore.showAlert(t('collection.retrieve.expired') || '收件箱已过期', 'error')
        // 记录已失效 → 询问是否删除该记录
        if (await confirmStore.confirm({ message: t('fileDetail.expiredConfirm') })) {
          deleteCollectionRecord(record.id)
        }
      } else {
        alertStore.showAlert(t('collection.retrieve.notFound'), 'error')
      }
    }
  } catch (err: unknown) {
    const msg = getErrorMessage(err, t('collection.retrieve.loadFailed'))
    if (String(msg).includes('过期') || String(msg).includes('410')) {
      alertStore.showAlert(t('collection.retrieve.expired') || '收件箱已过期', 'error')
      if (await confirmStore.confirm({ message: t('fileDetail.expiredConfirm') })) {
        deleteCollectionRecord(record.id)
      }
    } else {
      alertStore.showAlert(msg, 'error')
    }
  }
}

const deleteCollectionRecord = (id: number) => {
  fileStore.removeCollectionRecord(id)
}

const goDirectRoom = (roomCode: string) => {
  showDrawer.value = false
  router.push(`/direct/room/${roomCode}`)
}

const deleteDirectRecord = (id: number) => {
  fileStore.deleteDirectRecord(id)
}

// ==================== 记录-直连-查看（房间信息弹窗） ====================
const directRoomModalCode = ref('')

const viewDirectRoomDetails = (record: DirectRecord) => {
  directRoomModalCode.value = record.roomCode
}

const enterDirectRoomFromModal = (roomCode: string) => {
  directRoomModalCode.value = ''
  goDirectRoom(roomCode)
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
