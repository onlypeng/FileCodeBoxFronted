import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { FileService, CollectionService } from '@/services'
import { useAlertStore } from '@/stores/alertStore'
import { useFileDataStore } from '@/stores/fileData'
import type { ReceivedFileRecord } from '@/types'
import type { MultiFileItem, CollectionFileItem } from '@/types/collection'
import { copyToClipboard } from '@/utils/clipboard'
import { getErrorMessage, isRecordExpired, formatFileSize } from '@/utils/common'
import { renderMarkdownPreview } from '@/utils/content-preview'
import { buildDownloadUrl } from '@/utils/share-url'
import { downloadFile, downloadBlob, type DownloadResult } from '@/utils/download-action'

type InputStatus = {
  readonly: boolean
  loading: boolean
}

export function useRetrieveFlow() {
  const { t } = useI18n()
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
  // 记录查看弹窗（文件/多文件统一用多文件弹窗展示）
  const recordModal = ref<{
    visible: boolean
    code: string
    items: Array<MultiFileItem & { sizeText?: string }>
    date: string
    totalSize: string
    expiredAt: string | null
    expireStyle: string
    expireValue: number
    single: boolean
    record: ReceivedFileRecord | null
  }>({
    visible: false,
    code: '',
    items: [],
    date: '',
    totalSize: '',
    expiredAt: null,
    expireStyle: '',
    expireValue: 0,
    single: false,
    record: null
  })

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
      expiredAt: detail.expired_at,
      expireStyle: detail.expire_style,
      expireValue: detail.expire_value,
    }
  }

  const CODE_REGEX = /^[A-Z0-9]{6}$/

  /** 检测码类型（取件码/管理码/投递码/直连房间码等） */
  const checkCodeType = (code: string) => FileService.checkCodeType(code)

  /** 取件（普通文件码/多文件码；消耗取件次数） */
  const selectFile = (code: string) => FileService.selectFile(code)

  /** 只读查询文件分享详情（不消耗次数），供记录查看刷新剩余次数/文件列表/过期状态 */
  const getFileInfo = (code: string) => FileService.getFileInfo(code)

  /** 通过取件码获取收件箱文件列表（只读） */
  const getRetrieveInfo = (code: string) => CollectionService.getRetrieveInfo(code)

  /** 通过管理码获取收件箱管理信息（含完整三码与各自过期时间，供记录-收件箱-查看展示） */
  const getManageInfo = (code: string) => CollectionService.getManageInfo(code)


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
            collectionCode.value = code.value
            collectionRetrieveCode.value = ''  // 管理码入口没有取件码
            collectionTitle.value = manageRes.detail.title || t('retrieve.collectionFiles.title')
            collectionDeliveryCode.value = manageRes.detail.delivery_code || ''

            // 缓存到取件记录
            const totalSize = collectionFiles.value.reduce((sum: number, f: CollectionFileItem) => sum + f.file_size, 0)
            const collectionRecord: ReceivedFileRecord = {
              id: Date.now(),
              code: code.value,
              filename: manageRes.detail.title || t('retrieve.collectionFiles.title'),
              size: formatFileSize(totalSize),
              downloadUrl: null,
              content: null,
              date: new Date().toLocaleString(),
              type: 'multiFile',
              isCollection: true,
              collectionDeliveryCode: manageRes.detail.delivery_code || '',
              collectionFiles: collectionFiles.value.map((f: CollectionFileItem) => ({
                id: f.id,
                file_name: f.file_name,
                file_size: f.file_size,
                uploader_name: f.uploader_name || '',
              })),
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
          // 取件码过期检查
          if (checkRes.detail.expired) {
            alertStore.showAlert(t('retrieve.messages.expiredCode'), 'error')
            code.value = ''
            return
          }
          // 取件码 → 加载取件信息并弹窗显示
          const retrieveRes = await CollectionService.getRetrieveInfo(code.value)
          if (retrieveRes.code === 200 && retrieveRes.detail) {
            const detail = retrieveRes.detail
            isCollection.value = true
            collectionFiles.value = detail.files.filter((f: CollectionFileItem) => f.status === 'completed')
            // collectionCode 存取件码（ZIP/单文件下载均支持取件码），collectionRetrieveCode 存取件码
            collectionCode.value = detail.retrieve_code || code.value
            collectionRetrieveCode.value = code.value
            collectionTitle.value = detail.title || t('retrieve.collectionFiles.title')

            // 缓存到取件记录（code 存取件码，ZIP/单文件下载均支持取件码）
            const totalSize = collectionFiles.value.reduce((sum: number, f: CollectionFileItem) => sum + f.file_size, 0)
            const collectionRecord: ReceivedFileRecord = {
              id: Date.now(),
              code: code.value,
              filename: detail.title || t('retrieve.collectionFiles.title'),
              size: formatFileSize(totalSize),
              downloadUrl: null,
              content: null,
              date: new Date().toLocaleString(),
              type: 'multiFile',
              isCollection: true,
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
    // 优先使用取件码（后端会检查取件码过期），否则使用管理码
    const downloadCode = collectionRetrieveCode.value || collectionCode.value
    void downloadFile(CollectionService.getDownloadUrl(fileId, downloadCode), filename, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
      .then(result => handleDownloadResult(result, collectionCode.value))
  }

  const downloadCollectionZip = () => {
    void downloadFile(CollectionService.getZipDownloadUrl(collectionCode.value), `${collectionCode.value}.zip`, { expiredMessage: t('collection.retrieve.expired') || '收件箱已过期' })
      .then(result => handleDownloadResult(result, collectionCode.value))
  }

  const goToDeliveryUpload = () => {
    if (collectionDeliveryCode.value) {
      // hash 路由下与 router.push 等价，避免 composable 直接依赖 vue-router
      window.location.hash = `#/delivery/upload/${collectionDeliveryCode.value}`
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
    // 打开记录查看时保持记录抽屉打开，不自动关闭

    if (record.isCollection) {
      isCollection.value = true
      collectionCode.value = record.code
      collectionRetrieveCode.value = record.collectionRetrieveCode || ''
      collectionFiles.value = (record.collectionFiles || []).map((f) => ({
        ...f,
        status: 'completed' as const,
        created_at: new Date().toISOString()
      }))
      collectionTitle.value = record.filename
    } else if (record.content) {
      // 文本 → 原详情弹窗（含内容预览）
      isMultiFile.value = false
      isCollection.value = false
      selectedRecord.value = record
    } else {
      // 文件/多文件 → 统一用多文件弹窗展示
      isMultiFile.value = false
      isCollection.value = false
      selectedRecord.value = null
      const single = !record.isMultiFile
      recordModal.value = {
        visible: true,
        code: record.code,
        items: single
          ? [{ id: 0, file_name: record.filename, file_size: 0, sizeText: record.size }]
          : (record.multiFileItems || []),
        date: record.date,
        totalSize: record.size,
        expiredAt: record.expiredAt ?? null,
        expireStyle: record.expireStyle || '',
        expireValue: record.expireValue || 0,
        single,
        record
      }
    }
  }

  const closeRecordModal = () => {
    recordModal.value.visible = false
  }

  /** 单文件记录直接下载 */
  const downloadSingleRecordFile = (record: ReceivedFileRecord | null) => {
    if (!record) return
    const expired = isRecordExpired(record.expiredAt, record.expireStyle, record.expireValue) || record.isExpired
    if (!record.downloadUrl) {
      alertStore.showAlert(t('fileDetail.expired'), 'error')
      return
    }
    const url = buildDownloadUrl(record.downloadUrl)
    void downloadFile(url, record.filename || undefined, { isExpired: expired, expiredMessage: t('fileDetail.expired') })
      .then(result => handleDownloadResult(result, record.code))
  }

  const downloadRecordModalItem = (itemId: number) => {
    const modal = recordModal.value
    // 单文件：直接下载
    if (modal.single) {
      downloadSingleRecordFile(modal.record)
      return
    }
    const item = modal.items.find(i => i.id === itemId)
    const filename = item?.file_name || undefined
    void downloadFile(CollectionService.getMultiFileDownloadUrl(itemId, modal.code), filename, {
      isExpired: isRecordExpired(modal.expiredAt, modal.expireStyle, modal.expireValue),
      expiredMessage: t('fileDetail.expired')
    }).then(result => handleDownloadResult(result, modal.code))
  }

  const downloadRecordModalZip = () => {
    const modal = recordModal.value
    // 单文件与多文件统一打包下载
    void downloadFile(CollectionService.getMultiFileZipUrl(modal.code), `${modal.code}.zip`, {
      isExpired: isRecordExpired(modal.expiredAt, modal.expireStyle, modal.expireValue),
      expiredMessage: t('fileDetail.expired')
    }).then(result => handleDownloadResult(result, modal.code))
  }

  const downloadRecordModalSingle = () => {
    downloadSingleRecordFile(recordModal.value.record)
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
    recordModal,
    checkCodeType,
    selectFile,
    getFileInfo,
    getRetrieveInfo,
    getManageInfo,
    closeRecordModal,
    downloadRecordModalItem,
    downloadRecordModalZip,
    downloadRecordModalSingle,
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
