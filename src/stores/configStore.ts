/**
 * 面向前端的公共配置快照（上传限额、主题、公告等），是远端配置与本地缓存的合并结果。
 * 必须经 toPublicConfig 投影后才入状态：后台完整配置含各类密钥/口令，
 * 直接整包塞进 store 会让敏感字段随状态到处可见。
 *
 * 公告去重：notify_title+content 拼成 key 记在 localStorage，同一公告只在首次弹出，
 * 避免 30 秒一次的轮询反复弹同一个通知。刻意不做：不缓存密钥类字段。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ConfigState } from '@/types'
import {
  DEFAULT_PUBLIC_CONFIG,
  readNotifyKey,
  readStoredConfig,
  toPublicConfig,
  writeNotifyKey,
  writeStoredConfig,
  type PublicConfig
} from '@/utils/config-storage'

export const useConfigStore = defineStore('config', () => {
  const config = ref<PublicConfig>({
    ...DEFAULT_PUBLIC_CONFIG,
    ...toPublicConfig(readStoredConfig<Partial<ConfigState>>())
  })

  const uploadSizeLimit = computed(() => config.value.uploadSize)

  const updateConfig = (nextConfig: Partial<ConfigState>) => {
    // toPublicConfig 会为「公共配置没下发」的字段产出 undefined；直接展开会把
    // store 里已有的值（或 DEFAULT 兜底）抹掉。典型场景：公共配置漏下发
    // uploadChunkSize 时，管理员改过的分片大小被覆盖成 undefined，前端退回
    // 默认 5MB 却与服务端上界不一致。这里只合并真正有值的字段。
    const patch = Object.fromEntries(
      Object.entries(toPublicConfig(nextConfig)).filter(([, v]) => v !== undefined)
    ) as Partial<PublicConfig>
    config.value = {
      ...DEFAULT_PUBLIC_CONFIG,
      ...config.value,
      ...patch
    }
    writeStoredConfig(config.value)
  }

  const applyRemoteConfig = (nextConfig: Partial<ConfigState>): string | null => {
    updateConfig(nextConfig)

    const { notify_title: notifyTitle, notify_content: notifyContent } = nextConfig
    if (!notifyTitle || !notifyContent) {
      return null
    }

    const notifyKey = notifyTitle + notifyContent
    if (readNotifyKey() === notifyKey) {
      return null
    }

    writeNotifyKey(notifyKey)
    return `${notifyTitle}: ${notifyContent}`
  }

  const reloadStoredConfig = () => {
    config.value = {
      ...DEFAULT_PUBLIC_CONFIG,
      ...toPublicConfig(readStoredConfig<Partial<ConfigState>>())
    }
  }

  return {
    config,
    uploadSizeLimit,
    applyRemoteConfig,
    updateConfig,
    reloadStoredConfig
  }
})
