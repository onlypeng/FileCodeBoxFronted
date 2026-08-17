<template>
  <Teleport to="body">
    <Transition name="modal-fade" appear>
      <div
        v-if="visible"
        class="fixed inset-0 z-50 overflow-y-auto"
        @mousedown.self="$emit('close')"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            class="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300"
            :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']"
            @click.stop
          >
            <!-- 头部 -->
            <div class="flex items-center justify-between px-6 py-4 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('collection.detail.settings') }}
              </h3>
              <button
                @click="$emit('close')"
                class="p-1.5 rounded-full transition-colors"
                :class="[isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500']"
              >
                <XIcon class="w-5 h-5" />
              </button>
            </div>

            <!-- 内容 -->
            <div class="px-6 py-5 space-y-4">
              <!-- 创建时间（只读） -->
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">创建时间</label>
                <p class="text-sm px-3 py-2 rounded-lg" :class="[isDarkMode ? 'bg-gray-700/60 text-gray-400' : 'bg-gray-100 text-gray-600']">
                  {{ formatTime(collectionStore.createdAt) }}
                </p>
              </div>

              <!-- 收件箱有效期（只读，创建后不可更改） -->
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('collection.manage.collectionExpire') }}</label>
                <p class="text-sm px-3 py-2 rounded-lg" :class="[isDarkMode ? 'bg-gray-700/60 text-gray-400' : 'bg-gray-100 text-gray-600']">
                  {{ collectionStore.expireStyle === 'forever' ? t('send.expiration.units.forever') : formatTime(collectionStore.collectionExpiredAt) }}
                </p>
                <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('collection.detail.collectionExpireReadOnly') }}
                </p>
              </div>

              <!-- 投件码过期时间 -->
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('collection.manage.deliveryExpire') }}</label>
                <ExpirationSelector
                  v-model:expiration-method="editDeliveryExpireStyle"
                  v-model:expiration-value="editDeliveryExpireValueStr"
                  :options="expireOptions"
                  class="no-label"
                />
                <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  过期时间：{{ computedDeliveryExpireAt }}
                </p>
              </div>

              <!-- 取件码过期时间 -->
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('collection.manage.retrieveExpire') }}</label>
                <ExpirationSelector
                  v-model:expiration-method="editRetrieveExpireStyle"
                  v-model:expiration-value="editRetrieveExpireValueStr"
                  :options="expireOptions"
                  class="no-label"
                />
                <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  过期时间：{{ computedRetrieveExpireAt }}
                </p>
              </div>

              <!-- 最大文件数 -->
              <FormInput
                v-model="editMaxFilesStr"
                :label="t('collection.detail.maxFiles')"
                type="number"
              />
              <p class="text-xs -mt-3" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('collection.detail.maxFilesHint', { max: maxAllowedFiles }) }}
              </p>

              <!-- 操作提示 -->
              <div v-if="errorMsg" class="p-3 rounded-lg text-sm" :class="[isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600']">
                {{ errorMsg }}
              </div>
            </div>

            <!-- 底部 -->
            <div class="px-6 py-4 border-t flex gap-3" :class="[isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50']">
              <button
                @click="$emit('close')"
                class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border"
                :class="[isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100']"
              >
                {{ t('collection.detail.cancel') }}
              </button>
              <button
                @click="handleSaveAll"
                :disabled="saving"
                class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                :class="[isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600']"
              >
                {{ saving ? t('collection.detail.saving') : t('collection.detail.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { inject, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { XIcon } from 'lucide-vue-next'
import { useCollectionStore } from '@/stores/collectionStore'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import ExpirationSelector from '@/components/common/ExpirationSelector.vue'
import FormInput from '@/components/common/FormInput.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const collectionStore = useCollectionStore()
const alertStore = useAlertStore()
const configStore = useConfigStore()
const config = computed(() => configStore.config)

const saving = ref(false)
const errorMsg = ref('')

// 编辑值
const editDeliveryExpireStyle = ref('day')
const editDeliveryExpireValueStr = ref('7')
const editRetrieveExpireStyle = ref('day')
const editRetrieveExpireValueStr = ref('7')
const editMaxFilesStr = ref('20')

// 从后台配置读取最大文件数限制
const maxAllowedFiles = computed(() => config.value.maxCollectionFiles || 100)

const expireOptions = computed(() =>
  config.value.expireStyle.map((value) => ({
    value,
    label: getUnit(value)
  }))
)

const getUnit = (value: string) => {
  switch (value) {
    case 'day': return t('send.expiration.units.days')
    case 'hour': return t('send.expiration.units.hours')
    case 'minute': return t('send.expiration.units.minutes')
    case 'count': return t('send.expiration.units.times')
    case 'forever': return t('send.expiration.units.forever')
    default: return ''
  }
}

const formatTime = (isoStr: string | null) => {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 根据当前编辑值实时计算过期时间
const computedDeliveryExpireAt = computed(() => {
  if (editDeliveryExpireStyle.value === 'forever') return t('send.expiration.units.forever')
  const value = parseInt(editDeliveryExpireValueStr.value) || 0
  if (value <= 0) return '-'
  const baseTime = collectionStore.createdAt ? new Date(collectionStore.createdAt) : new Date()
  const ms: Record<string, number> = { day: 86400000, hour: 3600000, minute: 60000 }
  const expireDate = new Date(baseTime.getTime() + (ms[editDeliveryExpireStyle.value] || 86400000) * value)
  return formatTime(expireDate.toISOString())
})

const computedRetrieveExpireAt = computed(() => {
  if (editRetrieveExpireStyle.value === 'forever') return t('send.expiration.units.forever')
  const value = parseInt(editRetrieveExpireValueStr.value) || 0
  if (value <= 0) return '-'
  const baseTime = collectionStore.createdAt ? new Date(collectionStore.createdAt) : new Date()
  const ms: Record<string, number> = { day: 86400000, hour: 3600000, minute: 60000 }
  const expireDate = new Date(baseTime.getTime() + (ms[editRetrieveExpireStyle.value] || 86400000) * value)
  return formatTime(expireDate.toISOString())
})

// 当弹窗打开时，从 store 加载当前值
watch(() => props.visible, (newVal) => {
  if (newVal) {
    editDeliveryExpireStyle.value = collectionStore.deliveryExpireStyle
    editDeliveryExpireValueStr.value = String(collectionStore.deliveryExpireValue)
    editRetrieveExpireStyle.value = collectionStore.retrieveExpireStyle
    editRetrieveExpireValueStr.value = String(collectionStore.retrieveExpireValue)
    editMaxFilesStr.value = String(collectionStore.collectionMaxFiles)
    errorMsg.value = ''
  }
})

const handleSaveAll = async () => {
  errorMsg.value = ''

  const editDeliveryExpireValue = parseInt(editDeliveryExpireValueStr.value) || 0
  const editRetrieveExpireValue = parseInt(editRetrieveExpireValueStr.value) || 0
  const editMaxFilesValue = parseInt(editMaxFilesStr.value) || 0

  // 验证最大文件数
  if (editMaxFilesValue < 1) {
    errorMsg.value = t('collection.detail.maxFilesMinError')
    return
  }
  if (editMaxFilesValue > maxAllowedFiles.value) {
    errorMsg.value = t('collection.detail.maxFilesExceed', { max: maxAllowedFiles.value })
    return
  }

  // 验证投件码/取件码过期时间不超过收件箱过期时间：
  // 与后端一致，比较"绝对过期时间"——子码从当前时间重新计算，必须不晚于收件箱的绝对过期时间。
  // 收件箱非永久（collectionExpiredAt 存在）时，子码不可为永久，也不可超出收件箱的绝对过期时间。
  const collectionExpiredAt = collectionStore.collectionExpiredAt
    ? new Date(collectionStore.collectionExpiredAt).getTime()
    : null
  const deliveryBound = _expireBoundSeconds(editDeliveryExpireStyle.value, editDeliveryExpireValue)
  const retrieveBound = _expireBoundSeconds(editRetrieveExpireStyle.value, editRetrieveExpireValue)
  if (collectionExpiredAt !== null) {
    const deliveryExpiredAt = Date.now() + deliveryBound * 1000
    const retrieveExpiredAt = Date.now() + retrieveBound * 1000
    if (deliveryBound === Infinity || deliveryExpiredAt > collectionExpiredAt) {
      errorMsg.value = t('collection.create.deliveryExceedCollection')
      return
    }
    if (retrieveBound === Infinity || retrieveExpiredAt > collectionExpiredAt) {
      errorMsg.value = t('collection.create.retrieveExceedCollection')
      return
    }
  }

  saving.value = true
  try {
    await collectionStore.updateConfig({
      delivery_expire_style: editDeliveryExpireStyle.value,
      delivery_expire_value: editDeliveryExpireStyle.value === 'forever' ? 0 : editDeliveryExpireValue,
      retrieve_expire_style: editRetrieveExpireStyle.value,
      retrieve_expire_value: editRetrieveExpireStyle.value === 'forever' ? 0 : editRetrieveExpireValue,
      max_files: editMaxFilesValue,
    })
    alertStore.showAlert(t('collection.detail.saveSuccess'), 'success')
    emit('saved')
    emit('close')
  } catch {
    errorMsg.value = t('collection.detail.saveFailed')
  } finally {
    saving.value = false
  }
}

/** 过期时间边界（秒）：forever 为无限，count 与后端落库一致固定 365 天（不乘次数），day/hour/minute 按秒 */
const _expireBoundSeconds = (style: string, value: number): number => {
  if (style === 'forever') return Infinity
  if (style === 'count') return 365 * 86400
  const ms: Record<string, number> = { day: 86400, hour: 3600, minute: 60 }
  return (ms[style] || 86400) * value
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

.no-label :deep(label:first-of-type) {
  display: none;
}
</style>
