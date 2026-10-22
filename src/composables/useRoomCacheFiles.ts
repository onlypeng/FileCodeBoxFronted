import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DirectService } from '@/services/direct'
import { useDirectStore } from '@/stores/directStore'
import { buildAbsoluteUrl } from '@/utils/share-url'
import type { RoomCacheFile } from '@/types/direct'

/** 缓存时长可选项（小时）；0 = 跟随房间生命周期，随房间过期一起清理 */
export const CACHE_HOUR_OPTIONS = [
  { value: 0, labelKey: 'direct.cache.followRoom' },
  { value: 1, labelKey: 'direct.cache.hour1' },
  { value: 6, labelKey: 'direct.cache.hour6' },
  { value: 24, labelKey: 'direct.cache.hour24' },
  { value: 168, labelKey: 'direct.cache.day7' },
] as const

export interface RoomCacheContext {
  roomCode: () => string
  clientId: () => string
  nickname: () => string
}

/**
 * 房间缓存文件：独立入口的列表、上传、下载与删除。
 * 与聊天流解耦——消息流里不再逐条渲染缓存卡片，统一收进该入口。
 */
export function useRoomCacheFiles(ctx: RoomCacheContext) {
  const store = useDirectStore()
  const { t } = useI18n()

  const loading = ref(false)
  const uploading = ref(false)
  const errorMsg = ref('')

  /** 已落盘到服务器、可直接下载的文件 */
  const serverFiles = computed(() => store.cachedFiles.filter((f) => f.server_cached))
  /** 仅由在线成员 P2P 持有（未落盘）的文件 */
  const peerOnlyFiles = computed(() => store.cachedFiles.filter((f) => !f.server_cached))

  const refresh = async () => {
    const code = ctx.roomCode()
    if (!code) return
    loading.value = true
    errorMsg.value = ''
    try {
      await store.refreshCacheFiles(code)
    } finally {
      loading.value = false
    }
  }

  /** 上传文件到服务器缓存；返回落盘后的条目，失败返回 null 并把原因写入 errorMsg */
  const upload = async (file: File, cacheHours: number): Promise<RoomCacheFile | null> => {
    const code = ctx.roomCode()
    if (!code) return null
    uploading.value = true
    errorMsg.value = ''
    try {
      return await store.uploadFileToCache(code, file, {
        transferId: `cache-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        clientId: ctx.clientId(),
        uploaderName: ctx.nickname(),
        cacheHours,
      })
    } catch (e) {
      errorMsg.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      uploading.value = false
    }
  }

  /** 删除缓存文件（服务端仅允许上传者本人删除） */
  const remove = async (transferId: string): Promise<boolean> => {
    const code = ctx.roomCode()
    if (!code) return false
    errorMsg.value = ''
    try {
      const res = await store.deleteCacheFile(code, transferId, ctx.clientId())
      return res.code === 200
    } catch (e) {
      errorMsg.value = e instanceof Error ? e.message : String(e)
      return false
    }
  }

  /** 服务器缓存文件下载直链（点击即可下载，无需 P2P、发送方无需在线） */
  const downloadUrl = (item: RoomCacheFile): string =>
    // 优先用服务端下发的带签名链接（30 分钟有效）；缺省时回退前端拼接，兼容旧后端
    (item.download_url && buildAbsoluteUrl(item.download_url)) ||
    DirectService.cacheFileDownloadUrl(ctx.roomCode(), item.transfer_id)

  /** 剩余有效期文案；未设置到期时间时表示跟随房间 */
  const expireText = (item: RoomCacheFile): string => {
    if (!item.expires_at) return t('direct.cache.followRoom')
    const left = new Date(item.expires_at).getTime() - Date.now()
    if (left <= 0) return t('direct.cache.expired')
    const hours = Math.floor(left / 3_600_000)
    if (hours >= 24) return t('direct.cache.daysLeft', { n: Math.ceil(hours / 24) })
    if (hours >= 1) return t('direct.cache.hoursLeft', { n: hours })
    return t('direct.cache.minutesLeft', { n: Math.max(1, Math.ceil(left / 60_000)) })
  }

  /** 是否由我上传（决定能否删除） */
  const isMine = (item: RoomCacheFile): boolean =>
    !!ctx.clientId() && item.owner_id === ctx.clientId()

  return {
    loading,
    uploading,
    errorMsg,
    serverFiles,
    peerOnlyFiles,
    refresh,
    upload,
    remove,
    downloadUrl,
    expireText,
    isMine,
  }
}
