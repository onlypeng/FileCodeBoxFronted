import { ref } from 'vue'
import { FileService } from '@/services'
import { CollectionService } from '@/services/collection'
import type { CheckCodeResponse, SentFileRecord } from '@/types'

/** 刷新后的记录信息（与本地记录字段对齐，便于直接展示） */
export interface RefreshedRecordInfo {
  /** 码类型（file / collection / retrieve / delivery / unknown） */
  codeType: CheckCodeResponse['type']
  /** 是否已过期 */
  expired: boolean
  /** ISO 格式过期时间字符串（null 表示永久） */
  expiredAt: string | null
  /** 过期样式：day / hour / minute / count / forever */
  expireStyle: string
  /** 过期值（原始） */
  expireValue: number
  /** 已用次数（仅 file 类型有效） */
  usedCount?: number
  /** 剩余次数（-1 表示不限，仅 file 类型有效） */
  expiredCount?: number
  /** 当前文件数 */
  fileCount: number
  /** 最大文件数（仅 collection / retrieve / delivery 有效） */
  maxFiles?: number
  /** 是否永久有效 */
  isPermanent: boolean
  /** 文件列表（多文件时返回；投件记录使用本地列表，不返回） */
  files?: Array<{ name: string; size: number; uploadTime?: string }>
  /** 文件总大小（字节，仅 file 类型返回） */
  size?: number
  /** 标题（collection / retrieve / delivery） */
  title?: string
  /** 显示名（file 类型） */
  name?: string | null
  /** 是否多文件 */
  isMultiFile?: boolean
  /** 是否加载中 */
  loading: boolean
  /** 错误信息 */
  error: string | null
}

/**
 * 记录实时刷新 composable
 *
 * 在打开记录详情弹窗时调用 refresh() 拉取最新过期时间、文件列表、状态等信息，
 * 替代客户端本地计算的过期时间字符串。
 */
export function useRecordRefresh() {
  const refreshInfo = ref<RefreshedRecordInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const refresh = async (record: SentFileRecord): Promise<RefreshedRecordInfo | null> => {
    const code = record.retrieveCode
    if (!code) return null

    loading.value = true
    error.value = null

    try {
      // 先调用 checkCodeType 拉取元信息
      const checkRes = await FileService.checkCodeType(code)
      if (checkRes.code !== 200 || !checkRes.detail) {
        const msg = checkRes.detail ? '码不存在或已失效' : '刷新失败'
        error.value = msg
        return null
      }
      const data = checkRes.detail as CheckCodeResponse

      // 对 file 类型多文件，并行调用 selectFile 拉取文件列表
      // 对 retrieve 类型，并行调用 getRetrieveInfo 拉取文件列表
      // 投件记录（delivery 类型）的 files 字段使用本地保存的列表，不刷新
      const shouldFetchFiles = data.type === 'file' && data.is_multi_file
      const shouldFetchRetrieveFiles = data.type === 'retrieve'

      const [filesRes, retrieveRes] = await Promise.allSettled([
        shouldFetchFiles
          ? FileService.selectFile(code)
          : Promise.resolve(null),
        shouldFetchRetrieveFiles
          ? CollectionService.getRetrieveInfo(code)
          : Promise.resolve(null)
      ])

      let files: Array<{ name: string; size: number; uploadTime?: string }> | undefined
      let size: number | undefined

      if (shouldFetchFiles && filesRes.status === 'fulfilled' && filesRes.value?.code === 200) {
        const detail = filesRes.value.detail as {
          items?: Array<{ id: number; file_name: string; file_size: number; created_at?: string }>
          size?: number
        } | undefined
        if (detail?.items) {
          files = detail.items.map((item) => ({ name: item.file_name, size: item.file_size, uploadTime: item.created_at }))
        }
        size = detail?.size
      }

      if (shouldFetchRetrieveFiles && retrieveRes.status === 'fulfilled' && retrieveRes.value?.code === 200) {
        const detail = retrieveRes.value.detail as {
          files?: Array<{ file_name: string; file_size: number; created_at?: string }>
        } | undefined
        if (detail?.files) {
          files = detail.files.map((item) => ({ name: item.file_name, size: item.file_size, uploadTime: item.created_at }))
        }
      }

      const info: RefreshedRecordInfo = {
        codeType: data.type,
        expired: data.expired === true,
        expiredAt: data.expired_at ?? null,
        expireStyle: data.expire_style ?? 'forever',
        expireValue: data.expire_value ?? 0,
        usedCount: data.used_count,
        expiredCount: data.expired_count,
        fileCount: data.file_count ?? 0,
        maxFiles: data.max_files,
        isPermanent: data.is_permanent === true,
        files,
        size,
        title: data.title,
        name: data.name,
        isMultiFile: data.is_multi_file,
        loading: false,
        error: null
      }
      refreshInfo.value = info
      return info
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '刷新失败'
      error.value = message
      return null
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    refreshInfo.value = null
    loading.value = false
    error.value = null
  }

  return { refreshInfo, loading, error, refresh, reset }
}
