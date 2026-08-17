import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfigService } from '@/services'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import type { ConfigState } from '@/types'
import { DEFAULT_CONFIG_STATE, readStoredConfig } from '@/utils/config-storage'
import { getErrorMessage } from '@/utils/common'
import {
  buildConfigSubmitPayload,
  bytesToFileSizeForm,
  type FileSizeUnit
} from '@/utils/config-form'

type ConfigFlagKey = 'enableChunk' | 's3_proxy' | 'openUpload' | 'directRelayEnabled' | 'onedrive_proxy'

// 敏感字段：不向表单回显真实值，加载后置空（保存时空值表示不修改）
// 注意：仅包含 ConfigState 中存在的字段
const SENSITIVE_CONFIG_KEYS = [
  'admin_token',
  's3_secret_access_key',
  's3_access_key_id',
  'aws_session_token',
  'webdav_password',
  'onedrive_password'
] as const

function sanitizeRemoteConfig(detail: ConfigState): ConfigState {
  const result: ConfigState = { ...detail }
  for (const key of SENSITIVE_CONFIG_KEYS) {
    result[key] = ''
  }
  return result
}

export function useSystemConfig() {
  const alertStore = useAlertStore()
  const configStore = useConfigStore()
  const { t } = useI18n()
  
  // 状态管理
  const config = ref<ConfigState>({ ...DEFAULT_CONFIG_STATE })
  const isLoading = ref(false)
  const fileSize = ref(1)
  const sizeUnit = ref<FileSizeUnit>('MB')
  
  // 从本地存储获取配置
  const getStoredConfig = (): ConfigState | null => {
    return readStoredConfig<ConfigState>()
  }
  
  // 保存配置到本地存储
  const saveConfigToStorage = (configData: ConfigState) => {
    configStore.updateConfig(configData)
  }
  
  // 获取系统配置
  const fetchConfig = async (): Promise<ConfigState | null> => {
    try {
      isLoading.value = true
      
      const response = await ConfigService.getConfig()
      
      if (response.code === 200 && response.detail) {
        // 密码/敏感凭据不回显：'******' 占位符与密码哈希均置空，保存时空值表示不修改
        config.value = { ...DEFAULT_CONFIG_STATE, ...sanitizeRemoteConfig(response.detail) }
        const notifyMessage = configStore.applyRemoteConfig(config.value)
        if (notifyMessage) {
          alertStore.showAlert(notifyMessage, 'success')
        }
        
        return config.value
      } else {
        throw new Error(response.message || '获取配置失败')
      }
    } catch (error) {
      // 如果网络请求失败，尝试使用本地存储的配置
      const storedConfig = getStoredConfig()
      if (storedConfig) {
        config.value = storedConfig
        return config.value
      }
      
      alertStore.showAlert(getErrorMessage(error, t('manage.systemSettings.getConfigFailed')), 'error')
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  // 更新系统配置
  const updateConfig = async (newConfig: Partial<ConfigState>): Promise<boolean> => {
    try {
      isLoading.value = true
      
      const response = await ConfigService.updateConfig(newConfig)
      
      if (response.code === 200) {
        config.value = { ...config.value, ...newConfig }
        saveConfigToStorage(config.value)
        alertStore.showAlert(t('manage.systemSettings.saveSuccess'), 'success')
        return true
      } else {
        throw new Error(response.message || t('manage.systemSettings.saveFailed'))
      }
    } catch (error) {
      alertStore.showAlert(getErrorMessage(error, t('manage.systemSettings.saveFailed')), 'error')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const toggleConfigFlag = (key: ConfigFlagKey) => {
    config.value[key] = config.value[key] === 1 ? 0 : 1
  }

  const syncConfigForm = (nextConfig: ConfigState) => {
    const sizeForm = bytesToFileSizeForm(nextConfig.uploadSize)
    fileSize.value = sizeForm.value
    sizeUnit.value = sizeForm.unit
  }

  const refreshConfig = async () => {
    const latestConfig = await fetchConfig()
    if (latestConfig) {
      syncConfigForm(latestConfig)
    }
  }

  const submitConfig = () =>
    updateConfig(
      buildConfigSubmitPayload(
        config.value,
        { value: fileSize.value, unit: sizeUnit.value }
      )
    )
  
  // 初始化配置
  const initConfig = async () => {
    // 先尝试从本地存储加载
    const storedConfig = getStoredConfig()
    if (storedConfig) {
      config.value = storedConfig
    }
    
    // 然后从服务器获取最新配置
    await fetchConfig()
  }
  
  // 计算属性
  const maxFileSizeMB = computed(() => {
    return Math.round(config.value.uploadSize / 1024 / 1024)
  })
  
  const isConfigLoaded = computed(() => {
    return config.value.name !== DEFAULT_CONFIG_STATE.name || !isLoading.value
  })
  
  return {
    // 状态
    config,
    isLoading,
    fileSize,
    sizeUnit,

    // 计算属性
    maxFileSizeMB,
    isConfigLoaded,
    
    // 方法
    fetchConfig,
    updateConfig,
    refreshConfig,
    submitConfig,
    toggleConfigFlag,
    initConfig,
    getStoredConfig,
    saveConfigToStorage
  }
}
