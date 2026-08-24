import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAlertStore } from '@/stores/alertStore'
import { useAdminStore } from '@/stores/adminStore'
import { useConfigStore } from '@/stores/configStore'
import { useFileDataStore } from '@/stores/fileData'
import type { SendType, SentFileRecord } from '@/types'
import { getClipboardFile, insertTextAtSelection } from '@/utils/clipboard-paste'
import { getErrorMessage } from '@/utils/common'
import { getStorageUnit } from '@/utils/convert'
import { calculateFileHash } from '@/utils/file-processing'
import { buildSentRecord } from '@/utils/send-record'
import { createSentRecordActions } from '@/utils/sent-record-actions'
import type { MultiFileItem } from '@/types/collection'
import { FileService } from '@/services'
import { useSendSubmit } from './useSendSubmit'

export function useSendFlow() {
  const { t } = useI18n()
  const alertStore = useAlertStore()
  const adminStore = useAdminStore()
  const configStore = useConfigStore()
  const fileDataStore = useFileDataStore()
  const config = computed(() => configStore.config)
  const selectedFile = ref<File | null>(null)
  const selectedFiles = ref<File[]>([])
  const textContent = ref('')
  const expirationMethod = ref(config.value.expireStyle[0] || 'day')
  const expirationValue = ref('1')
  const uploadProgress = ref(0)
  const showDrawer = ref(false)
  const selectedRecord = ref<SentFileRecord | null>(null)
  const isSubmitting = ref(false)
  const fileHash = ref('')
  const sendRecords = computed(() => fileDataStore.shareData)
  const uploadDescription = computed(() => {
    const parts = [`支持各种常见格式，最大${getStorageUnit(config.value.uploadSize)}`]
    return parts.join('，')
  })
  const expirationOptions = computed(() =>
    config.value.expireStyle.map((value) => ({
      value,
      label: getUnit(value)
    }))
  )
  watch(
    () => config.value.expireStyle,
    (expireStyle) => {
      if (expireStyle.length > 0 && !expireStyle.includes(expirationMethod.value)) {
        expirationMethod.value = expireStyle[0]
      }
    },
    { immediate: true }
  )
  const notifyCopyResult = (message: string, type: 'success' | 'error') => {
    alertStore.showAlert(message, type)
  }
  const sentRecordActions = createSentRecordActions(notifyCopyResult)
  /** 只读查询文件分享详情（不消耗取件次数），供发件记录查看刷新 */
  const getFileInfo = (code: string) => FileService.getFileInfo(code)
  const { resetPresignUpload, submitFile } = useSendSubmit({
    getMaxFileSize: () => configStore.uploadSizeLimit,
    notify: (message, type) => alertStore.showAlert(message, type),
    translate: t,
    onProgress: (progress) => {
      uploadProgress.value = progress
    },
    onHashCalculated: (hash) => {
      fileHash.value = hash
    }
  })

  const checkOpenUpload = () => {
    if (config.value.openUpload === 0 && !adminStore.hasToken) {
      alertStore.showAlert(t('send.messages.guestUploadDisabled'), 'error')
      return false
    }
    return true
  }

  const checkFileSize = (file: File) => {
    if (file.size > config.value.uploadSize) {
      alertStore.showAlert(
        t('send.messages.fileSizeExceeded', { size: getStorageUnit(config.value.uploadSize) }),
        'error'
      )
      selectedFile.value = null
      return false
    }
    return true
  }

  const checkUpload = () => {
    if (!selectedFile.value) return false
    if (!checkOpenUpload()) return false
    if (!checkFileSize(selectedFile.value)) return false
    return true
  }

  const handleFileSelected = async (file: File) => {
    selectedFile.value = file
    selectedFiles.value = []
    if (!checkOpenUpload()) return
    if (!checkFileSize(file)) return
    fileHash.value = await calculateFileHash(file)
  }

  const handleFilesSelected = async (files: File[]) => {
    if (!checkOpenUpload()) return
    const maxSendFiles = config.value.maxSendFiles || 20
    if (files.length > maxSendFiles) {
      alertStore.showAlert(t('send.messages.maxFilesExceeded', { max: maxSendFiles }), 'error')
      files = files.slice(0, maxSendFiles)
    }
    selectedFiles.value = files
    selectedFile.value = null
    fileHash.value = ''
  }

  const handleFileDrop = async (event: DragEvent) => {
    if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) return
    let files = Array.from(event.dataTransfer.files)
    if (files.length === 1) {
      const file = files[0]
      selectedFile.value = file
      selectedFiles.value = []
      if (!checkUpload()) return
      fileHash.value = await calculateFileHash(file)
    } else {
      if (!checkOpenUpload()) return
      const maxSendFiles = config.value.maxSendFiles || 20
      if (files.length > maxSendFiles) {
        alertStore.showAlert(t('send.messages.maxFilesExceeded', { max: maxSendFiles }), 'error')
        files = files.slice(0, maxSendFiles)
      }
      selectedFiles.value = files
      selectedFile.value = null
      fileHash.value = ''
    }
  }

  const handlePaste = async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    const file = getClipboardFile(items)
    if (file) {
      if (file.size === 0) {
        alertStore.showAlert(t('send.messages.emptyFileError'), 'error')
        return
      }

      selectedFile.value = file
      if (!checkUpload()) return

      try {
        fileHash.value = await calculateFileHash(file)
        alertStore.showAlert(
          t('send.messages.fileAddedFromClipboard', { filename: file.name }),
          'success'
        )
      } catch (err) {
        alertStore.showAlert(t('send.messages.fileProcessingFailed'), 'error')
        console.error('File hash calculation failed:', err)
      }
      return
    }

    const textItem = items[0]
    if (!textItem) return

    textItem.getAsString((str: string) => {
      const trimmedStr = str.trim()
      if (!trimmedStr) return

      const textareaElement = document.getElementById('text-content') as HTMLTextAreaElement
      if (!textareaElement) {
        textContent.value += trimmedStr
        return
      }

      const insertion = insertTextAtSelection({
        text: textContent.value,
        insertText: trimmedStr,
        selectionStart: textareaElement.selectionStart,
        selectionEnd: textareaElement.selectionEnd
      })
      textContent.value = insertion.value

      setTimeout(() => {
        textareaElement.setSelectionRange(insertion.cursor, insertion.cursor)
        textareaElement.focus()
      }, 0)
    })
  }

  const getUnit = (value: string = expirationMethod.value) => {
    switch (value) {
      case 'day':
        return t('send.expiration.units.days')
      case 'hour':
        return t('send.expiration.units.hours')
      case 'minute':
        return t('send.expiration.units.minutes')
      case 'count':
        return t('send.expiration.units.times')
      case 'forever':
        return t('send.expiration.units.forever')
      default:
        return ''
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting.value) return
    isSubmitting.value = true

    try {
      // 统一发送：可单独发送文件、单独发送备注（文本），或文件+备注
      const hasFile = !!selectedFile.value || selectedFiles.value.length > 0
      const remark = textContent.value.trim()
      if (!hasFile && !remark) {
        alertStore.showAlert(t('send.messages.selectFileOrText'), 'error')
        return
      }
      if (!checkOpenUpload()) {
        return
      }
      if (expirationMethod.value !== 'forever' && !expirationValue.value) {
        alertStore.showAlert(t('send.messages.enterExpirationValue'), 'error')
        return
      }

      const expireValue = expirationValue.value ? parseInt(expirationValue.value) : 1
      // 统一走发送文件接口：有文件传文件，仅备注（无文件）也走该接口（后端创建仅备注记录）
      // sendType 仅用于发件记录展示（名称/大小）；不再调用独立的文本发送接口
      const effectiveSendType: SendType = hasFile ? 'file' : 'text'
      let response
      response = await submitFile({
        selectedFile: selectedFile.value,
        selectedFiles: selectedFiles.value,
        remark,
        expireValue,
        expireStyle: expirationMethod.value,
        enableChunk: Boolean(config.value.enableChunk),
        chunkSizeMb: Number(config.value.uploadChunkSize) || 5,
        validateFileSize: checkFileSize
      })

      if (!response) return

      if (response?.code === 200) {
        const detail = response.detail as { code?: string; name?: string; is_multi_file?: boolean } | undefined

        // 统一处理（单文件和多文件共用一个取件码）
        const newRecord = buildSentRecord({
          response,
          sendType: effectiveSendType,
          textContent: remark,
          selectedFile: selectedFile.value,
          selectedFiles: selectedFiles.value,
          expirationMethod: expirationMethod.value,
          expirationValue: expirationValue.value,
          translate: t,
          getUnit
        })
        fileDataStore.addShareDataRecord(newRecord)
        alertStore.showAlert(
          t('send.messages.sendSuccess', { code: newRecord.retrieveCode }),
          'success'
        )
        selectedFile.value = null
        selectedFiles.value = []
        textContent.value = ''
        uploadProgress.value = 0
        resetPresignUpload()
        // 发送完成弹窗：与"记录-发件-查看"一致，使用发件记录查看弹窗展示（仅查看，无下载）
        const isSingle = !newRecord.isMultiFile
        const items = isSingle
          ? [{ id: 0, file_name: newRecord.filename, file_size: 0, sizeText: newRecord.size }]
          : (newRecord.files || []).map((f, i) => ({ id: i, file_name: f.name, file_size: f.size }))
        sentModal.value = {
          visible: true,
          code: newRecord.retrieveCode,
          items,
          date: newRecord.date,
          totalSize: newRecord.size,
          single: isSingle,
          remark: newRecord.text || null,
          createdDate: new Date().toLocaleString(),
          expireText: newRecord.expiration
        }
      } else {
        throw new Error(t('send.messages.serverError'))
      }
    } catch (error: unknown) {
      alertStore.showAlert(getErrorMessage(error, t('send.messages.sendFailed')), 'error')
    } finally {
      uploadProgress.value = 0
      isSubmitting.value = false
    }
  }

  const toggleDrawer = () => {
    showDrawer.value = !showDrawer.value
  }

  const sentModal = ref<{
    visible: boolean
    code: string
    items: Array<{ id: number; file_name: string; file_size: number; sizeText?: string }>
    date: string
    totalSize: string
    single: boolean
    text?: string | null
    remark?: string | null
    createdDate?: string
    expireText?: string
    isExpired?: boolean
  }>({
    visible: false,
    code: '',
    items: [],
    date: '',
    totalSize: '',
    single: false,
    text: undefined,
    remark: undefined
  })

  const viewDetails = async (record: SentFileRecord) => {
    // 投件记录 → 原详情弹窗
    if (record.isDelivery) {
      selectedRecord.value = record
      return
    }
    const hasFiles = !!record.files && record.files.length > 0
    // 纯备注/文本记录（无文件）→ 统一用文件弹窗（文本内容作为备注展示），不再单独文本弹窗
    if (!hasFiles && (record.text || record.type === 'text')) {
      sentModal.value = {
        visible: true,
        code: record.retrieveCode,
        items: [],
        date: record.date,
        totalSize: record.size,
        single: true,
        text: undefined,
        remark: record.text ?? null,
        createdDate: record.date,
        expireText: record.expiration
      }
      return
    }
    // 文件/多文件分享记录 → 统一用多文件弹窗展示（备注通过 remark 展示）
    const isSingle = !record.isMultiFile
    let items: Array<{ id: number; file_name: string; file_size: number; sizeText?: string }> = []
    // 只读刷新最新状态（剩余次数/文件列表/过期时间，不消耗取件次数）；单文件与多文件都刷新
    let expireText = record.expiration
    let isExpired = false
    try {
      const res = await getFileInfo(record.retrieveCode)
      const detail = res.detail as { is_multi_file?: boolean; items?: MultiFileItem[]; expire_style?: string; expire_value?: number; expired_count?: number; expired_at?: string | null } | undefined
      if (res.code === 410 || (res.code !== 200 && String(res.detail || '').includes('过期'))) {
        // 后端确认已过期：弹窗内展示过期横幅，文件列表回退本地缓存
        expireText = t('fileDetail.expired') || '该取件码已过期'
        isExpired = true
      } else if (res.code === 200 && detail) {
        if (detail.expire_style === 'count') {
          expireText = `${detail.expired_count ?? detail.expire_value ?? 0}${t('common.times')}`
        } else if (detail.expire_style === 'forever') {
          expireText = t('send.expiration.units.forever')
        } else if (detail.expired_at) {
          expireText = new Date(detail.expired_at).toLocaleString()
        }
      }
      if (isSingle) {
        items = [{ id: 0, file_name: record.filename, file_size: 0, sizeText: record.size }]
      } else {
        // 多文件：尝试拉取最新文件列表（含真实 item id，供单文件下载）
        if (res.code === 200 && detail?.is_multi_file && detail.items) {
          items = detail.items.map(i => ({ id: i.id, file_name: i.file_name, file_size: i.file_size }))
        } else {
          items = (record.files || []).map((f, i) => ({ id: i, file_name: f.name, file_size: f.size }))
        }
      }
    } catch {
      if (isSingle) {
        items = [{ id: 0, file_name: record.filename, file_size: 0, sizeText: record.size }]
      } else {
        items = (record.files || []).map((f, i) => ({ id: i, file_name: f.name, file_size: f.size }))
      }
    }
    sentModal.value = {
      visible: true,
      code: record.retrieveCode,
      items,
      date: record.date,
      totalSize: record.size,
      single: isSingle,
      remark: record.text || null,
      createdDate: record.date,
      expireText,
      isExpired
    }
  }

  const closeSentModal = () => {
    sentModal.value.visible = false
  }

  const closeDetails = () => {
    selectedRecord.value = null
  }

  const deleteRecord = (id: number) => {
    const index = fileDataStore.shareData.findIndex((record) => record.id === id)
    if (index !== -1) {
      fileDataStore.deleteShareData(index)
    }
  }

  const removeFile = (idx: number) => {
    selectedFiles.value.splice(idx, 1)
  }

  return {
    config,
    selectedFile,
    selectedFiles,
    textContent,
    expirationMethod,
    expirationValue,
    uploadProgress,
    showDrawer,
    selectedRecord,
    isSubmitting,
    sendRecords,
    uploadDescription,
    expirationOptions,
    closeDetails,
    deleteRecord,
    sentModal,
    closeSentModal,
    copySentRecordCode: sentRecordActions.copyCode,
    copySentRecordLink: sentRecordActions.copyLink,
    copySentRecordWgetCommand: sentRecordActions.copyWgetCommand,
    getQRCodeValue: sentRecordActions.getQRCodeValue,
    getUnit,
    handleFileDrop,
    handleFileSelected,
    handleFilesSelected,
    handlePaste,
    handleSubmit,
    removeFile,
    toggleDrawer,
    viewDetails
  }
}
