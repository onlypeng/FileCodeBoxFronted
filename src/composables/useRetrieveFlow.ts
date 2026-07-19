import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { FileService } from '@/services'
import { CollectionService } from '@/services/collection'
import { useAlertStore } from '@/stores/alertStore'
import { useFileDataStore } from '@/stores/fileData'
import type { ReceivedFileRecord } from '@/types'
import type { MultiFileItem, CollectionFileItem } from '@/types/collection'
import { copyToClipboard } from '@/utils/clipboard'
import { getErrorMessage, formatFileSize as baseFormatSize } from '@/utils/common'
import { renderMarkdownPreview } from '@/utils/content-preview'
import { buildDownloadUrl } from '@/utils/share-url'
import { isRecordExpired } from '@/utils/common'
import { downloadFile, type DownloadResult } from '@/utils/download-action'
import { saveAs } from 'file-saver'

type InputStatus = {
  readonly: boolean
  loading: boolean
}

export function useRetrieveFlow() {
  const { t } = useI18n()
  const router = useRouter()
  const alertStore = useAlertStore()
  const fileStore = useFileDataStore()
  const { receiveData: records } = storeToRefs(fileStore)

  const code = ref('')
  const inputStatus = ref<InputStatus>({
    readonly: false,
    loading: false
  })
  const error = ref('')
  const selectedRecord = ref<ReceivedFileRecord | null>(null)
  const showDrawer = ref(false)
  const showPreview = ref(false)
  const renderedContent = ref('')
  // 多文件相关
  const isMultiFile = ref(false)
  const multiFileItems = ref<MultiFileItem[]>([])
  const multiFileCode = ref('')
  // 收件箱文件相关
  const isCollection = ref(false)
  const collectionFiles = ref<CollectionFileItem[]>([])
  const collectionCode = ref('')
  const collectionRetrieveCode = ref('')  // 取件码，用于单文件下载校验
  const collectionTitle = ref('')
  const collectionDeliveryCode = ref('')
  // 检测到投件码但无法获取文件列表时，存储投件码用于显示跳转按钮
  const deliveryRedirectCode = ref('')

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 ' + t('fileSize.bytes')
    return baseFormatSize(bytes, 2)
  }

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
      date: new Date().toLocaleString(),
      type: recordType,
      expiredAt: detail.expired_at,
      expireStyle: detail.expire_style,
      expireValue: detail.expire_value,
    }
  }

  const CODE_REGEX = /^[A-Z0-9]+$/

  const handleSubmit = async () => {
    if (!CODE_REGEX.test(code.value)) {
      alertStore.showAlert(t('retrieve.messages.invalidCode'), 'error')
      return
    }

    inputStatus.value.readonly = true
    inputStatus.value.loading = true

    try {
      // 先检查码类型
      const checkRes = await FileService.checkCodeType(code.value)
      if (checkRes.code === 200 && checkRes.detail) {
        const codeType = checkRes.detail.type

        if (codeType === 'collection') {
          // 收件箱过期检查
          if (checkRes.detail.expired) {
            alertStore.showAlert(t('retrieve.messages.expiredCode'), 'error')
            code.value = ''
            return
          }
          // 收件箱管理码 → 加载文件列表并弹窗显示
          const manageRes = await CollectionService.getManageInfo(code.value)
          if (manageRes.code === 200 && manageRes.detail) {
            isCollection.value = true
            collectionFiles.value = manageRes.detail.files.filter((f: CollectionFileItem) => f.status === 'completed')
            collectionCode.value = code.value  // 管理码用于下载和管理
            collectionRetrieveCode.value = manageRes.detail.retrieve_code || ''  // 存取件码用于下载校验
            collectionTitle.value = manageRes.detail.title || t('retrieve.collectionFiles.title')
            collectionDeliveryCode.value = manageRes.detail.delivery_code || ''

            // 缓存到取件记录（管理码入口，code 存管理码，可进入管理页面）
            const totalSize = collectionFiles.value.reduce((sum: number, f: CollectionFileItem) => sum + f.file_size, 0)
            const collectionRecord: ReceivedFileRecord = {
              id: Date.now(),
              code: code.value,  // 存管理码，用于进入管理页面
              filename: manageRes.detail.title || t('retrieve.collectionFiles.title'),
              size: formatFileSize(totalSize),
              downloadUrl: null,
              content: null,
              date: new Date().toLocaleString(),
              type: 'multiFile',
              isCollection: true,
              isRetrieveCode: false,  // 标记为管理码入口
              collectionDeliveryCode: manageRes.detail.delivery_code || '',
              collectionRetrieveCode: manageRes.detail.retrieve_code || '',
              collectionFiles: collectionFiles.value.map((f: CollectionFileItem) => ({
                id: f.id,
                file_name: f.file_name,
                file_size: f.file_size,
                uploader_name: f.uploader_name || '',
              })),
              expiredAt: manageRes.detail.expired_at,
              expireStyle: manageRes.detail.expire_style,
              expireValue: manageRes.detail.expire_value,
            }
            if (!fileStore.receiveData.some((file) => file.code === collectionRecord.code)) {
              fileStore.addReceiveData(collectionRecord)
            }

            alertStore.showAlert(t('retrieve.messages.retrieveSuccess'), 'success')
          } else {
            alertStore.showAlert(t('retrieve.messages.retrieveFailure') + t('retrieve.messages.codeNotFound'), 'error')
          }
          code.value = ''
          return
        }

        if (codeType === 'retrieve') {
          // 取件码 → 加载取件信息并弹窗显示
          const retrieveRes = await CollectionService.getRetrieveInfo(code.value)
          if (retrieveRes.code === 200 && retrieveRes.detail) {
            const detail = retrieveRes.detail
            isCollection.value = true
            collectionFiles.value = detail.files.filter((f: CollectionFileItem) => f.status === 'completed')
            // 取件码模式下：collectionCode 存取件码（用于下载），collectionRetrieveCode 也存取件码
            // 后端 retrieve 端点不再返回 collection_code 和 delivery_code
            collectionCode.value = code.value
            collectionRetrieveCode.value = code.value
            collectionTitle.value = detail.title || t('retrieve.collectionFiles.title')
            collectionDeliveryCode.value = ''  // 取件码模式下不暴露投件码

            // 缓存到取件记录
            const totalSize = collectionFiles.value.reduce((sum: number, f: CollectionFileItem) => sum + f.file_size, 0)
            const collectionRecord: ReceivedFileRecord = {
              id: Date.now(),
              code: code.value,  // 存取件码用于下载
              filename: detail.title || t('retrieve.collectionFiles.title'),
              size: formatFileSize(totalSize),
              downloadUrl: null,
              content: null,
              date: new Date().toLocaleString(),
              type: 'multiFile',
              isCollection: true,
              isRetrieveCode: true,  // 标记为取件码入口
              collectionDeliveryCode: '',  // 不存储投件码
              collectionRetrieveCode: code.value,
              collectionFiles: collectionFiles.value.map((f: CollectionFileItem) => ({
                id: f.id,
                file_name: f.file_name,
                file_size: f.file_size,
                uploader_name: f.uploader_name || '',
              })),
              expiredAt: detail.retrieve_expired_at,
              expireStyle: detail.retrieve_expire_style,
              expireValue: detail.retrieve_expire_value,
            }
            if (!fileStore.receiveData.some((file) => file.code === collectionRecord.code)) {
              fileStore.addReceiveData(collectionRecord)
            }

            alertStore.showAlert(t('retrieve.messages.retrieveSuccess'), 'success')
          } else {
            alertStore.showAlert(t('retrieve.messages.retrieveFailure') + t('retrieve.messages.codeNotFound'), 'error')
          }
          code.value = ''
          return
        }

        if (codeType === 'delivery') {
          // 投递码仅用于上传文件，不能查看/下载收件箱文件
          deliveryRedirectCode.value = code.value
          alertStore.showAlert(t('retrieve.messages.deliveryCodeDetected'), 'info')
          code.value = ''
          return
        }

        if (codeType === 'unknown') {
          alertStore.showAlert(t('retrieve.messages.retrieveFailure') + t('retrieve.messages.codeNotFound'), 'error')
          code.value = ''
          return
        }
      }

      // 普通文件码 → 原有取件逻辑
      const res = await FileService.selectFile(code.value)
      if (res.code === 200 && res.detail) {
        const detail = res.detail as {
          code: string
          name: string
          text: string
          size: number
          is_multi_file?: boolean
          items?: MultiFileItem[]
        }

        // 多文件模式
        if (detail.is_multi_file && detail.items) {
          isMultiFile.value = true
          multiFileItems.value = detail.items
          multiFileCode.value = detail.code
        } else {
          isMultiFile.value = false
          multiFileItems.value = []
        }

        const newFileData = createRecord(detail)
        // 为多文件记录补充子项数据
        if (isMultiFile.value) {
          newFileData.isMultiFile = true
          newFileData.multiFileItems = detail.items || []
        }
        if (!fileStore.receiveData.some((file) => file.code === newFileData.code)) {
          fileStore.addReceiveData(newFileData)
        }
        selectedRecord.value = newFileData
        if (newFileData.content) {
          showPreview.value = true
        }
        alertStore.showAlert(t('retrieve.messages.retrieveSuccess'), 'success')
      } else {
        alertStore.showAlert(t('retrieve.messages.retrieveFailure') + res.detail, 'error')
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, t('retrieve.messages.unknownError'))
      alertStore.showAlert(t('retrieve.messages.networkError') + errorMessage, 'error')
    } finally {
      inputStatus.value.readonly = false
      inputStatus.value.loading = false
      code.value = ''
    }
  }

  /** 处理下载结果：过期/不存在时更新记录状态 */
  const handleDownloadResult = (result: DownloadResult, code: string) => {
    if (!result.success && (result.reason === 'expired' || result.reason === 'not_found')) {
      fileStore.markRecordExpired(code)
    }
  }

  const downloadMultiFileItem = (itemId: number) => {
    const item = multiFileItems.value.find(i => i.id === itemId)
    const filename = item?.file_name || undefined
    void downloadFile(CollectionService.getMultiFileDownloadUrl(itemId, multiFileCode.value), filename, { expiredMessage: t('fileDetail.expired') || '已过期，无法下载' })
      .then(result => handleDownloadResult(result, multiFileCode.value))
  }

  const downloadMultiFileZip = () => {
    void downloadFile(CollectionService.getMultiFileZipUrl(multiFileCode.value), `${multiFileCode.value}.zip`, { expiredMessage: t('fileDetail.expired') || '已过期，无法下载' })
      .then(result => handleDownloadResult(result, multiFileCode.value))
  }

  const downloadCollectionFile = (fileId: number) => {
    const file = collectionFiles.value.find(f => f.id === fileId)
    const filename = file?.file_name || undefined
    // 使用当前存储的码（管理码或取件码）进行下载
    const downloadCode = collectionCode.value
    void downloadFile(CollectionService.getDownloadUrl(fileId, downloadCode), filename, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
      .then(result => handleDownloadResult(result, collectionCode.value))
  }

  const downloadCollectionZip = () => {
    // 使用当前存储的码（管理码或取件码）进行 ZIP 下载
    const downloadCode = collectionCode.value
    void downloadFile(CollectionService.getZipDownloadUrl(downloadCode), `${downloadCode}.zip`, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
      .then(result => handleDownloadResult(result, collectionCode.value))
  }

  const goToDeliveryUpload = () => {
    if (collectionDeliveryCode.value) {
      router.push(`/delivery/upload/${collectionDeliveryCode.value}`)
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

    if (record.isCollection) {
      isCollection.value = true
      collectionCode.value = record.code
      collectionRetrieveCode.value = record.collectionRetrieveCode || ''
      collectionFiles.value = (record.collectionFiles || []).map(f => ({
        ...f,
        status: (f.status === 'uploading' || f.status === 'completed' || f.status === 'failed' ? f.status : 'completed') as 'uploading' | 'completed' | 'failed',
        created_at: f.created_at || new Date().toISOString(),
      }))
      collectionTitle.value = record.filename
    } else if (record.isMultiFile) {
      isMultiFile.value = true
      multiFileCode.value = record.code
      multiFileItems.value = record.multiFileItems || []
    } else if (record.content) {
      isMultiFile.value = false
      selectedRecord.value = record
    } else {
      isMultiFile.value = false
      selectedRecord.value = record
    }
  }

  const closeDetails = () => {
    selectedRecord.value = null
    isCollection.value = false
    collectionFiles.value = []
    collectionCode.value = ''
    collectionRetrieveCode.value = ''
    collectionTitle.value = ''
    collectionDeliveryCode.value = ''
    deliveryRedirectCode.value = ''
  }

  const deleteRecord = (id: number) => {
    const index = records.value.findIndex((record) => record.id === id)
    if (index !== -1) {
      fileStore.deleteReceiveData(index)
    }
  }

  const toggleDrawer = () => {
    showDrawer.value = !showDrawer.value
  }

  const downloadRecord = (record: ReceivedFileRecord) => {
    const expired = isRecordExpired(record.expiredAt, record.expireStyle, record.expireValue) || record.isExpired

    if (record.content) {
      // 文本内容直接下载（过期则禁止）
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
        .then(result => handleDownloadResult(result, record.code))
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
        .then(result => handleDownloadResult(result, record.code))
      return
    }

    // 普通文件下载
    if (record.downloadUrl) {
      const url = buildDownloadUrl(record.downloadUrl)
      void downloadFile(url, record.filename || undefined, { isExpired: expired, expiredMessage: t('fileDetail.expired') })
        .then(result => handleDownloadResult(result, record.code))
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

  return {
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
  }
}
