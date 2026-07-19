import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAlertStore } from '@/stores/alertStore'
import { useAdminStore } from '@/stores/adminStore'
import { useConfigStore } from '@/stores/configStore'
import { useFileDataStore } from '@/stores/fileData'
import type { SentFileRecord } from '@/types'
import { getClipboardFile, insertTextAtSelection } from '@/utils/clipboard-paste'
import { getErrorMessage } from '@/utils/common'
import { getStorageUnit } from '@/utils/convert'
import { calculateFileHash } from '@/utils/file-processing'
import { buildSentRecord, isExpirationWithinLimit } from '@/utils/send-record'
import { createSentRecordActions } from '@/utils/sent-record-actions'
import { useSendSubmit } from './useSendSubmit'

export function useSendFlow() {
  const { t } = useI18n()
  const router = useRouter()
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
    if (config.value.uploadCount > 0) {
      parts.push(`每${config.value.uploadMinute}分钟最多上传${config.value.uploadCount}个文件`)
    }
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
  const { resetPresignUpload, submitUnified } = useSendSubmit({
    getMaxFileSize: () => configStore.uploadSizeLimit,
    getUploadCount: () => config.value.uploadCount || 0,
    getUploadMinute: () => config.value.uploadMinute || 10,
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

  const checkExpirationTime = (method: string, value: string): boolean =>
    isExpirationWithinLimit(method, value, config.value.max_save_seconds || 0)

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
    const uploadCount = config.value.uploadCount || 0
    const maxAllowed = uploadCount > 0 ? Math.min(maxSendFiles, uploadCount) : maxSendFiles
    if (files.length > maxAllowed) {
      alertStore.showAlert(t('send.messages.maxFilesExceeded', { max: maxAllowed }), 'error')
      files = files.slice(0, maxAllowed)
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
      if (!checkOpenUpload()) return
      if (!checkFileSize(file)) return
      fileHash.value = await calculateFileHash(file)
    } else {
      if (!checkOpenUpload()) return
      const maxSendFiles = config.value.maxSendFiles || 20
      const uploadCount = config.value.uploadCount || 0
      const maxAllowed = uploadCount > 0 ? Math.min(maxSendFiles, uploadCount) : maxSendFiles
      if (files.length > maxAllowed) {
        alertStore.showAlert(t('send.messages.maxFilesExceeded', { max: maxAllowed }), 'error')
        files = files.slice(0, maxAllowed)
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
      if (!checkOpenUpload()) return
      if (!checkFileSize(file)) return

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
      const hasFiles = selectedFile.value || selectedFiles.value.length > 0
      const hasText = textContent.value.trim().length > 0

      if (!hasFiles && !hasText) {
        alertStore.showAlert(t('send.messages.selectFile'), 'error')
        return
      }
      if (!checkOpenUpload()) {
        return
      }
      if (expirationMethod.value !== 'forever' && !expirationValue.value) {
        alertStore.showAlert(t('send.messages.enterExpirationValue'), 'error')
        return
      }

      if (!checkExpirationTime(expirationMethod.value, expirationValue.value)) {
        const maxDays = Math.floor(config.value.max_save_seconds / 86400)
        alertStore.showAlert(t('send.messages.expirationTooLong', { days: maxDays }), 'error')
        return
      }

      const expireValue = expirationValue.value ? parseInt(expirationValue.value) : 1
      const response = await submitUnified({
        text: textContent.value,
        selectedFile: selectedFile.value,
        selectedFiles: selectedFiles.value,
        expireValue,
        expireStyle: expirationMethod.value,
        enableChunk: Boolean(config.value.enableChunk),
        validateFileSize: checkFileSize
      })

      if (!response) return

      if (response?.code === 200) {
        const newRecord = buildSentRecord({
          response,
          textContent: textContent.value,
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
        selectedRecord.value = newRecord
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

  const viewDetails = (record: SentFileRecord) => {
    selectedRecord.value = record
  }

  const closeDetails = () => {
    selectedRecord.value = null
  }

  // 继续投件：跳转到投件上传页面（仅投件记录有效）
  const continueDelivery = (record: SentFileRecord) => {
    if (!record.isDelivery || !record.retrieveCode) return
    selectedRecord.value = null
    router.push(`/delivery/upload/${record.retrieveCode}`)
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
    continueDelivery,
    deleteRecord,
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
