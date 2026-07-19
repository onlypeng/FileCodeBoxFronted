import { ref, computed } from 'vue'
import { ConfigService } from '@/services'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import type { ConfigState } from '@/types'
import { DEFAULT_CONFIG_STATE, readStoredConfig } from '@/utils/config-storage'
import { getErrorMessage } from '@/utils/common'
import {
  buildConfigSubmitPayload,
  bytesToFileSizeForm,
  secondsToSaveTimeForm,
  type FileSizeUnit,
  type SaveTimeUnit
} from '@/utils/config-form'

type ConfigFlagKey = 'enableChunk' | 's3_proxy' | 'openUpload'

/**
 * 数值配置项验证规则：[min, max]
 * 与后端 core/settings.py 的 CONFIG_NUMERIC_LIMITS 保持一致
 */
const CONFIG_NUMERIC_RULES: Record<string, { min: number; max: number; label: string; allowZero?: boolean }> = {
  errorMinute: { min: 1, max: 1440, label: '检测时间窗口' },
  errorCount: { min: 1, max: 1000, label: '允许错误次数' },
  uploadMinute: { min: 1, max: 1440, label: '上传限流时间窗口' },
  uploadCount: { min: 1, max: 1000, label: '允许上传文件数' },
  maxSendFiles: { min: 1, max: 100, label: '发送文件数量上限' },
  maxCollectionFiles: { min: 1, max: 1000, label: '收件箱最大文件数上限' },
  maxMultiFileCount: { min: 1, max: 100, label: '多文件分享数量上限' },
  codeDigitCount: { min: 5, max: 15, label: '码位数' },
  uploadSize: { min: 1024, max: 1024 * 1024 * 1024 * 10, label: '单文件大小上限' },
  max_save_seconds: { min: 0, max: 365 * 24 * 3600, label: '最长保存时间', allowZero: true },
}

/**
 * 验证配置项数值是否在合法范围内
 * @returns 错误消息列表（空数组表示全部通过）
 */
function validateConfig(config: ConfigState): string[] {
  const errors: string[] = []
  for (const [key, rule] of Object.entries(CONFIG_NUMERIC_RULES)) {
    let value = config[key as keyof ConfigState] as unknown as number
    // 兜底：若该字段缺失（后端未返回或旧数据），使用 DEFAULT_CONFIG_STATE 中的默认值
    if (value === null || value === undefined || Number.isNaN(value)) {
      const defaultVal = (DEFAULT_CONFIG_STATE as unknown as Record<string, number>)[key]
      if (defaultVal !== undefined && defaultVal !== null && !Number.isNaN(defaultVal)) {
        value = defaultVal
        // 同步写回 config，避免后续提交时再次失败
        ;(config as unknown as Record<string, number>)[key] = defaultVal
      } else {
        errors.push(`${rule.label}：必须为数字`)
        continue
      }
    }
    if (!rule.allowZero && value <= 0) {
      errors.push(`${rule.label}：不能为 0 或负数`)
      continue
    }
    if (rule.allowZero && value < 0) {
      errors.push(`${rule.label}：不能为负数`)
      continue
    }
    if (value < rule.min || value > rule.max) {
      errors.push(`${rule.label}：必须在 ${rule.min} - ${rule.max} 之间`)
    }
  }
  return errors
}

export function useSystemConfig() {
  const alertStore = useAlertStore()
  const configStore = useConfigStore()
  
  // 状态管理
  const config = ref<ConfigState>({ ...DEFAULT_CONFIG_STATE })
  const isLoading = ref(false)
  const fileSize = ref(1)
  const sizeUnit = ref<FileSizeUnit>('MB')
  const saveTime = ref(1)
  const saveTimeUnit = ref<SaveTimeUnit>('天')
  
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
        config.value = { ...DEFAULT_CONFIG_STATE, ...response.detail }
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
      
      alertStore.showAlert(getErrorMessage(error, '获取配置失败'), 'error')
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
        alertStore.showAlert('配置更新成功！', 'success')
        return true
      } else {
        throw new Error(response.message || '更新配置失败')
      }
    } catch (error) {
      alertStore.showAlert(getErrorMessage(error, '更新配置失败'), 'error')
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

    const saveTimeForm = secondsToSaveTimeForm(nextConfig.max_save_seconds)
    saveTime.value = saveTimeForm.value
    saveTimeUnit.value = saveTimeForm.unit
  }

  const refreshConfig = async () => {
    const latestConfig = await fetchConfig()
    if (latestConfig) {
      syncConfigForm(latestConfig)
    }
  }

  const submitConfig = () => {
    const payload = buildConfigSubmitPayload(
      config.value,
      { value: fileSize.value, unit: sizeUnit.value },
      { value: saveTime.value, unit: saveTimeUnit.value }
    )
    // 提交前验证，避免无效请求
    const errors = validateConfig(payload)
    if (errors.length > 0) {
      alertStore.showAlert(errors.join('；'), 'error')
      return Promise.resolve(false)
    }
    return updateConfig(payload)
  }
  
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
    saveTime,
    saveTimeUnit,
    
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
