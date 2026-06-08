import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CollectionService } from '@/services/collection'
import type {
  CollectionFileItem,
  CreateCollectionRequest,
  CreateCollectionResponse,
  DeliveryPageInfo,
  CollectionManageResponse,
  UploadProgressInfo,
} from '@/types/collection'

const STORAGE_KEY = 'recent_collections'

interface RecentCollection {
  collection_code: string
  delivery_code: string
  title: string
  created_at: string
}

function loadRecentCollections(): RecentCollection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentCollection(item: RecentCollection) {
  const list = loadRecentCollections()
  // 去重
  const filtered = list.filter(c => c.collection_code !== item.collection_code)
  filtered.unshift(item)
  // 最多保留 10 条
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 10)))
}

function removeRecentFromStorage(code: string) {
  const list = loadRecentCollections().filter(c => c.collection_code !== code)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export const useCollectionStore = defineStore('collection', () => {
  // 收件箱信息
  const collectionCode = ref('')
  const deliveryCode = ref('')
  const retrieveCode = ref('')
  const collectionTitle = ref('')
  const collectionDescription = ref('')
  const collectionMaxFiles = ref(20)
  const collectionExpiredAt = ref<string | null>(null)
  const createdAt = ref<string | null>(null)
  const files = ref<CollectionFileItem[]>([])
  const isLoading = ref(false)
  const error = ref('')

  // 收件箱过期配置
  const expireStyle = ref('day')
  const expireValue = ref(7)
  // 投件码过期配置
  const deliveryExpireStyle = ref('day')
  const deliveryExpireValue = ref(7)
  const deliveryExpiredAt = ref<string | null>(null)
  // 取件码过期配置
  const retrieveExpireStyle = ref('day')
  const retrieveExpireValue = ref(7)
  const retrieveExpiredAt = ref<string | null>(null)

  // 投递页面信息
  const deliveryInfo = ref<DeliveryPageInfo | null>(null)

  // 实时上传进度（收件箱页面展示）
  const activeUploads = ref<UploadProgressInfo[]>([])

  // 最近创建的收件箱（响应式）
  const recentList = ref<RecentCollection[]>(loadRecentCollections())

  const fileCount = computed(() => files.value.length)
  const isFull = computed(() => fileCount.value >= collectionMaxFiles.value)

  /** 创建收件箱 */
  async function createCollection(data: CreateCollectionRequest): Promise<CreateCollectionResponse> {
    isLoading.value = true
    error.value = ''
    try {
      const res = await CollectionService.create(data)
      if (res.code === 200 && res.detail) {
        const d = res.detail
        collectionCode.value = d.collection_code
        deliveryCode.value = d.delivery_code
        retrieveCode.value = d.retrieve_code || ''
        collectionTitle.value = d.title
        collectionDescription.value = d.description || ''
        collectionMaxFiles.value = d.max_files
        collectionExpiredAt.value = d.expired_at
        createdAt.value = d.created_at || null
        expireStyle.value = d.expire_style
        expireValue.value = d.expire_value
        deliveryExpireStyle.value = d.delivery_expire_style
        deliveryExpireValue.value = d.delivery_expire_value
        deliveryExpiredAt.value = d.delivery_expired_at
        retrieveExpireStyle.value = d.retrieve_expire_style
        retrieveExpireValue.value = d.retrieve_expire_value
        retrieveExpiredAt.value = d.retrieve_expired_at
        files.value = []
        // 保存到最近收件箱记录
        saveRecentCollection({
          collection_code: d.collection_code,
          delivery_code: d.delivery_code,
          title: d.title,
          created_at: new Date().toISOString(),
        })
        return d
      }
      throw new Error(res.detail as unknown as string || '创建失败')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建收件箱失败'
      error.value = msg
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /** 加载投递页面信息（使用 delivery_code） */
  async function loadDeliveryPage(code: string) {
    isLoading.value = true
    error.value = ''
    try {
      const res = await CollectionService.getDeliveryPage(code)
      if (res.code === 200 && res.detail) {
        const d = res.detail
        deliveryInfo.value = d
        deliveryCode.value = d.delivery_code
        collectionTitle.value = d.title
        collectionDescription.value = d.description || ''
        collectionMaxFiles.value = d.max_files
        collectionExpiredAt.value = d.expired_at
        createdAt.value = d.created_at || null
        expireStyle.value = d.expire_style
        expireValue.value = d.expire_value
        deliveryExpireStyle.value = d.delivery_expire_style
        deliveryExpireValue.value = d.delivery_expire_value
        deliveryExpiredAt.value = d.delivery_expired_at
        retrieveExpireStyle.value = d.retrieve_expire_style
        retrieveExpireValue.value = d.retrieve_expire_value
        retrieveExpiredAt.value = d.retrieve_expired_at
        return d
      }
      throw new Error(res.detail as unknown as string || '获取失败')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '获取投递页面失败'
      error.value = msg
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /** 加载收件箱管理信息（使用 collection_code） */
  async function loadManageInfo(code: string): Promise<CollectionManageResponse> {
    isLoading.value = true
    error.value = ''
    try {
      const res = await CollectionService.getManageInfo(code)
      if (res.code === 200 && res.detail) {
        const d = res.detail
        collectionCode.value = d.collection_code
        deliveryCode.value = d.delivery_code
        retrieveCode.value = d.retrieve_code || ''
        collectionTitle.value = d.title
        collectionDescription.value = d.description || ''
        collectionMaxFiles.value = d.max_files
        collectionExpiredAt.value = d.expired_at
        createdAt.value = d.created_at || null
        expireStyle.value = d.expire_style
        expireValue.value = d.expire_value
        deliveryExpireStyle.value = d.delivery_expire_style
        deliveryExpireValue.value = d.delivery_expire_value
        deliveryExpiredAt.value = d.delivery_expired_at
        retrieveExpireStyle.value = d.retrieve_expire_style
        retrieveExpireValue.value = d.retrieve_expire_value
        retrieveExpiredAt.value = d.retrieve_expired_at
        files.value = d.files
        return d
      }
      throw new Error(res.detail as unknown as string || '获取失败')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '获取收件箱状态失败'
      error.value = msg
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /** 投递文件（使用 delivery_code） */
  async function uploadFile(
    file: File,
    uploaderName: string = '',
    onProgress?: (progress: number) => void
  ) {
    const res = await CollectionService.uploadFile(
      deliveryCode.value,
      file,
      uploaderName,
      onProgress ? ({ percentage }) => onProgress(percentage) : undefined
    )
    if (res.code === 200 && res.detail) {
      return res.detail
    }
    throw new Error('上传失败')
  }

  /** 删除文件 */
  async function deleteFile(fileId: number) {
    await CollectionService.deleteFile(fileId)
    files.value = files.value.filter((f) => f.id !== fileId)
  }

  /** 添加文件（WebSocket推送时调用） */
  function addFileFromWS(file: CollectionFileItem) {
    if (!files.value.some((f) => f.id === file.id)) {
      files.value.push(file)
    }
  }

  /** 移除文件（WebSocket推送时调用） */
  function removeFileFromWS(fileId: number) {
    files.value = files.value.filter((f) => f.id !== fileId)
  }

  /** 更新文件状态（WebSocket推送时调用） */
  function updateFileStatus(fileId: number, status: string) {
    const file = files.value.find((f) => f.id === fileId)
    if (file) {
      file.status = status as CollectionFileItem['status']
    }
  }

  /** 更新上传进度（WebSocket推送时调用） */
  function updateUploadProgress(info: UploadProgressInfo) {
    // 优先用 fileId 匹配
    let existing: UploadProgressInfo | undefined
    if (info.fileId !== undefined) {
      existing = activeUploads.value.find((u) => u.fileId === info.fileId)
    }
    if (!existing) {
      existing = activeUploads.value.find(
        (u) => u.filename === info.filename && u.uploader === info.uploader
      )
    }
    if (existing) {
      existing.progress = info.progress
      if (info.fileId !== undefined) existing.fileId = info.fileId
    } else {
      activeUploads.value.push(info)
    }
  }

  /** 移除上传进度（上传完成或失败时调用） */
  function removeUploadProgress(fileId?: number, filename?: string, uploader?: string) {
    if (fileId !== undefined) {
      activeUploads.value = activeUploads.value.filter((u) => u.fileId !== fileId)
    } else {
      activeUploads.value = activeUploads.value.filter(
        (u) => !(u.filename === filename && u.uploader === uploader)
      )
    }
  }

  /** 清空所有上传进度 */
  function clearUploadProgress() {
    activeUploads.value = []
  }

  /** 保存当前收件箱到最近记录 */
  function saveToRecent() {
    if (!collectionCode.value) return
    saveRecentCollection({
      collection_code: collectionCode.value,
      delivery_code: deliveryCode.value,
      title: collectionTitle.value,
      created_at: new Date().toISOString(),
    })
    recentList.value = loadRecentCollections()
  }

  function removeRecentCollection(code: string) {
    removeRecentFromStorage(code)
    recentList.value = recentList.value.filter(c => c.collection_code !== code)
  }

  /** 重置状态 */
  function reset() {
    collectionCode.value = ''
    deliveryCode.value = ''
    retrieveCode.value = ''
    collectionTitle.value = ''
    collectionDescription.value = ''
    collectionMaxFiles.value = 20
    collectionExpiredAt.value = null
    createdAt.value = null
    expireStyle.value = 'day'
    expireValue.value = 7
    deliveryExpireStyle.value = 'day'
    deliveryExpireValue.value = 7
    deliveryExpiredAt.value = null
    retrieveExpireStyle.value = 'day'
    retrieveExpireValue.value = 7
    retrieveExpiredAt.value = null
    files.value = []
    isLoading.value = false
    error.value = ''
    deliveryInfo.value = null
    activeUploads.value = []
  }

  return {
    collectionCode,
    deliveryCode,
    retrieveCode,
    collectionTitle,
    collectionDescription,
    collectionMaxFiles,
    collectionExpiredAt,
    createdAt,
    expireStyle,
    expireValue,
    deliveryExpireStyle,
    deliveryExpireValue,
    deliveryExpiredAt,
    retrieveExpireStyle,
    retrieveExpireValue,
    retrieveExpiredAt,
    files,
    isLoading,
    error,
    deliveryInfo,
    fileCount,
    isFull,
    createCollection,
    loadDeliveryPage,
    loadManageInfo,
    uploadFile,
    deleteFile,
    addFileFromWS,
    removeFileFromWS,
    updateFileStatus,
    activeUploads,
    updateUploadProgress,
    removeUploadProgress,
    clearUploadProgress,
    reset,
    loadRecentCollections,
    recentList,
    removeRecentCollection,
    saveToRecent,
  }
})
