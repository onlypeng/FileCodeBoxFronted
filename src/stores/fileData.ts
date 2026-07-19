import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ReceivedFileRecord, SentFileRecord, CollectionRecord } from '@/types'

const STORAGE_KEYS = {
  shareData: 'fcb_share_data',
  receiveData: 'fcb_receive_data',
  collectionData: 'fcb_collection_data',
}

// 从 localStorage 加载
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

// 保存到 localStorage
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage 可能已满，静默失败
  }
}

export const useFileDataStore = defineStore('fileData', () => {
  const receiveData = ref<ReceivedFileRecord[]>(loadFromStorage(STORAGE_KEYS.receiveData, []))
  const shareData = ref<SentFileRecord[]>(loadFromStorage(STORAGE_KEYS.shareData, []))
  const collectionData = ref<CollectionRecord[]>(loadFromStorage(STORAGE_KEYS.collectionData, []))

  // 监听变化自动保存
  watch(shareData, (newVal) => saveToStorage(STORAGE_KEYS.shareData, newVal), { deep: true })
  watch(receiveData, (newVal) => saveToStorage(STORAGE_KEYS.receiveData, newVal), { deep: true })
  watch(collectionData, (newVal) => saveToStorage(STORAGE_KEYS.collectionData, newVal), { deep: true })

  // ========== 取件记录 ==========
  const addReceiveData = (record: ReceivedFileRecord) => {
    receiveData.value.push(record)
  }

  const removeReceiveData = (id: number) => {
    const index = receiveData.value.findIndex((record) => record.id === id)
    if (index !== -1) {
      receiveData.value.splice(index, 1)
    }
  }

  const deleteReceiveData = (index: number) => {
    if (index >= 0 && index < receiveData.value.length) {
      receiveData.value.splice(index, 1)
    }
  }

  const clearReceiveData = () => {
    receiveData.value = []
  }

  /** 标记载件记录为已过期（后端返回过期/不存在时调用） */
  const markRecordExpired = (code: string) => {
    const record = receiveData.value.find((r) => r.code === code)
    if (record) {
      record.isExpired = true
    }
  }

  /** 更新取件记录的过期信息（延长过期时间后刷新缓存） */
  const updateRecordExpiry = (code: string, expiredAt: string | null | undefined, expireStyle?: string, expireValue?: number) => {
    const record = receiveData.value.find((r) => r.code === code)
    if (record) {
      if (expiredAt !== undefined) record.expiredAt = expiredAt
      if (expireStyle !== undefined) record.expireStyle = expireStyle
      if (expireValue !== undefined) record.expireValue = expireValue
      record.isExpired = false
    }
  }

  // ========== 发件记录 ==========
  const addShareDataRecord = (record: SentFileRecord) => {
    // 投件记录（isDelivery=true）按投件码（存于 retrieveCode 字段）去重：
    // 同一浏览器使用同一投件码多次投件时，更新已有记录而非新增
    if (record.isDelivery && record.retrieveCode) {
      const existingIndex = shareData.value.findIndex(
        (r) => r.isDelivery === true && r.retrieveCode === record.retrieveCode
      )
      if (existingIndex !== -1) {
        // 更新已有投件记录：累加文件数、更新日期和大小
        const existing = shareData.value[existingIndex]
        const prevCount = existing.fileCount || 0
        const newCount = record.fileCount || 0
        existing.filename = record.filename
        existing.date = record.date
        existing.size = record.size
        existing.fileCount = prevCount + newCount
        existing.isMultiFile = existing.fileCount > 1
        existing.collectionTitle = record.collectionTitle || existing.collectionTitle
        // 累加文件列表（追加新上传的文件）
        if (record.files && record.files.length > 0) {
          if (!existing.files) existing.files = []
          existing.files.push(...record.files)
        }
        return
      }
    }
    shareData.value.push(record)
  }

  const deleteShareData = (index: number) => {
    if (index >= 0 && index < shareData.value.length) {
      shareData.value.splice(index, 1)
    }
  }

  const clearShareData = () => {
    shareData.value = []
  }

  // ========== 收件箱记录 ==========
  const addCollectionRecord = (record: CollectionRecord) => {
    // 去重：同管理码不重复添加
    if (!collectionData.value.some(r => r.collectionCode === record.collectionCode)) {
      collectionData.value.push(record)
    }
  }

  const deleteCollectionRecord = (index: number) => {
    if (index >= 0 && index < collectionData.value.length) {
      collectionData.value.splice(index, 1)
    }
  }

  const removeCollectionRecord = (id: number) => {
    const index = collectionData.value.findIndex((record) => record.id === id)
    if (index !== -1) {
      collectionData.value.splice(index, 1)
    }
  }

  const clearCollectionData = () => {
    collectionData.value = []
  }

  return {
    receiveData,
    shareData,
    collectionData,
    addReceiveData,
    removeReceiveData,
    deleteReceiveData,
    clearReceiveData,
    markRecordExpired,
    updateRecordExpiry,
    addShareDataRecord,
    deleteShareData,
    clearShareData,
    addCollectionRecord,
    deleteCollectionRecord,
    removeCollectionRecord,
    clearCollectionData
  }
})
