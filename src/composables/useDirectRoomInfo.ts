/**
 * 直连房间信息加载 composable
 * 封装 DirectService.getRoomInfo，供弹窗组件使用，避免组件直接依赖 services
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DirectService } from '@/services'
import { useAlertStore } from '@/stores/alertStore'
import { useClipboard } from '@/composables'
import { buildAppUrl } from '@/utils/share-url'
import type { DirectRoomInfo } from '@/types/direct'

export function useDirectRoomInfo() {
  const { t } = useI18n()
  const alertStore = useAlertStore()
  const { copy } = useClipboard()

  const info = ref<DirectRoomInfo | null>(null)
  const loading = ref(false)
  const error = ref('')

  const roomLink = (roomCode: string) => (roomCode ? buildAppUrl(`/direct/room/${roomCode}`) : '')

  const loadInfo = async (roomCode: string) => {
    if (!roomCode) return
    loading.value = true
    error.value = ''
    info.value = null
    try {
      const res = await DirectService.getRoomInfo(roomCode)
      if (res.code === 200 && res.detail) {
        info.value = res.detail
      } else {
        error.value = t('direct.room.notFoundOrExpired')
      }
    } catch {
      error.value = t('direct.room.notFoundOrExpired')
    } finally {
      loading.value = false
    }
  }

  const copyRoomCode = async (roomCode: string) => {
    await copy(roomCode)
  }

  const copyRoomLink = async (roomCode: string) => {
    await copy(roomLink(roomCode), {
      successMsg: t('collection.create.linkCopied')
    })
  }

  return {
    info,
    loading,
    error,
    roomLink,
    loadInfo,
    copyRoomCode,
    copyRoomLink,
    alertStore
  }
}
