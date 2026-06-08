<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div
      class="rounded-3xl shadow-2xl overflow-hidden border w-full max-w-md transition-colors duration-300"
      :class="[
        isDarkMode
          ? 'bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border-gray-700'
          : 'bg-white border-gray-200'
      ]"
    >
      <div class="p-8">
        <PageHeader :title="t('collection.create.title')" @title-click="toHome" />

        <form @submit.prevent="handleCreate" class="space-y-6">
          <FormInput
            v-model="title"
            :label="t('collection.create.titleLabel')"
            :placeholder="t('collection.create.titlePlaceholder')"
          />

          <div>
            <label
              class="block text-sm font-medium mb-1"
              :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']"
            >
              {{ t('collection.create.descriptionLabel') }}
            </label>
            <textarea
              v-model="description"
              :placeholder="t('collection.create.descriptionPlaceholder')"
              rows="3"
              class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
              :class="[
                isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              ]"
            ></textarea>
          </div>

          <FormInput
            v-model="maxFiles"
            :label="t('collection.create.maxFilesLabel')"
            type="number"
            :min="1"
            :max="config.maxCollectionFiles || 100"
          />

          <!-- 收件箱有效期 -->
          <ExpirationSelector
            v-model:expiration-method="expireStyle"
            v-model:expiration-value="expireValue"
            :options="expireOptions"
          />

          <!-- 投件码过期时间 -->
          <div>
            <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('collection.create.deliveryExpireLabel') }}
            </label>
            <ExpirationSelector
              v-model:expiration-method="deliveryExpireStyle"
              v-model:expiration-value="deliveryExpireValue"
              :options="deliveryExpireOptions"
            />
          </div>

          <!-- 取件码过期时间 -->
          <div>
            <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('collection.create.retrieveExpireLabel') }}
            </label>
            <ExpirationSelector
              v-model:expiration-method="retrieveExpireStyle"
              v-model:expiration-value="retrieveExpireValue"
              :options="retrieveExpireOptions"
            />
          </div>

          <button
            type="submit"
            :disabled="isCreating"
            class="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span class="relative z-10 flex items-center justify-center text-lg">
              {{ isCreating ? t('collection.create.creating') : t('collection.create.submit') }}
            </span>
          </button>
        </form>

        <!-- 创建成功后弹出详情弹窗 -->
        <CollectionCreatedModal
          :visible="showCreatedModal"
          :result="createdResult"
          @close="handleModalClose"
        />

        <div class="mt-6 text-center">
          <button
            @click="router.push('/')"
            class="text-sm transition-colors"
            :class="[isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700']"
          >
            {{ t('collection.create.backToHome') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import FormInput from '@/components/common/FormInput.vue'
import ExpirationSelector from '@/components/common/ExpirationSelector.vue'
import CollectionCreatedModal from '@/components/common/CollectionCreatedModal.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { useFileDataStore } from '@/stores/fileData'
import { isExpirationWithinLimit } from '@/utils/send-record'
import type { CreateCollectionResponse } from '@/types/collection'
import type { CollectionRecord } from '@/types'

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const alertStore = useAlertStore()
const collectionStore = useCollectionStore()
const configStore = useConfigStore()
const fileDataStore = useFileDataStore()
const config = computed(() => configStore.config)

const title = ref('')
const description = ref('')
const maxFiles = ref(20)

// 收件箱过期配置 - 受后台设置控制
const expireStyle = ref(config.value.expireStyle[0] || 'day')
const expireValue = ref('7')

// 投件码过期配置 - 受后台设置控制
const deliveryExpireStyle = ref(config.value.expireStyle[0] || 'day')
const deliveryExpireValue = ref('7')

// 取件码过期配置 - 受后台设置控制
const retrieveExpireStyle = ref(config.value.expireStyle[0] || 'day')
const retrieveExpireValue = ref('7')

const isCreating = ref(false)
const createdResult = ref<CreateCollectionResponse | null>(null)
const showCreatedModal = ref(false)

// 过期选项受后台设置控制
const expireOptions = computed(() =>
  config.value.expireStyle.map((value) => ({
    value,
    label: getUnit(value)
  }))
)

const deliveryExpireOptions = computed(() =>
  config.value.expireStyle.map((value) => ({
    value,
    label: getUnit(value)
  }))
)

const retrieveExpireOptions = computed(() =>
  config.value.expireStyle.map((value) => ({
    value,
    label: getUnit(value)
  }))
)

// 当后台设置变化时同步
watch(
  () => config.value.expireStyle,
  (expireStyleList) => {
    if (expireStyleList.length > 0 && !expireStyleList.includes(expireStyle.value)) {
      expireStyle.value = expireStyleList[0]
    }
    if (expireStyleList.length > 0 && !expireStyleList.includes(deliveryExpireStyle.value)) {
      deliveryExpireStyle.value = expireStyleList[0]
    }
    if (expireStyleList.length > 0 && !expireStyleList.includes(retrieveExpireStyle.value)) {
      retrieveExpireStyle.value = expireStyleList[0]
    }
  },
  { immediate: true }
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

/** 将过期配置转换为秒数，用于比较 */
const _expireToSeconds = (style: string, value: number): number => {
  const ms: Record<string, number> = { day: 86400, hour: 3600, minute: 60, count: 86400 * 365 }
  return (ms[style] || 86400) * value
}

const handleCreate = async () => {
  if (!title.value.trim()) {
    alertStore.showAlert(t('collection.create.titleRequired'), 'error')
    return
  }
  isCreating.value = true
  try {
    // 检查最大文件数是否超出后台限制
    const maxCollectionFiles = config.value.maxCollectionFiles || 100
    if (maxFiles.value > maxCollectionFiles) {
      alertStore.showAlert(t('collection.detail.maxFilesExceed', { max: maxCollectionFiles }), 'error')
      return
    }
    // 检查收件箱过期时间是否超出后台限制
    if (expireStyle.value !== 'forever' && !isExpirationWithinLimit(expireStyle.value, expireValue.value, config.value.max_save_seconds || 0)) {
      const maxDays = Math.floor((config.value.max_save_seconds || 0) / 86400)
      alertStore.showAlert(t('send.messages.expirationTooLong', { days: maxDays }), 'error')
      return
    }
    // 检查投件码过期时间是否超出后台限制
    if (deliveryExpireStyle.value !== 'forever' && !isExpirationWithinLimit(deliveryExpireStyle.value, deliveryExpireValue.value, config.value.max_save_seconds || 0)) {
      const maxDays = Math.floor((config.value.max_save_seconds || 0) / 86400)
      alertStore.showAlert(t('send.messages.expirationTooLong', { days: maxDays }), 'error')
      return
    }
    // 检查取件码过期时间是否超出后台限制
    if (retrieveExpireStyle.value !== 'forever' && !isExpirationWithinLimit(retrieveExpireStyle.value, retrieveExpireValue.value, config.value.max_save_seconds || 0)) {
      const maxDays = Math.floor((config.value.max_save_seconds || 0) / 86400)
      alertStore.showAlert(t('send.messages.expirationTooLong', { days: maxDays }), 'error')
      return
    }
    // 检查投件码过期时间是否超过收件箱过期时间
    if (deliveryExpireStyle.value !== 'forever' && expireStyle.value !== 'forever') {
      const deliverySeconds = _expireToSeconds(deliveryExpireStyle.value, parseInt(deliveryExpireValue.value) || 0)
      const collectionSeconds = _expireToSeconds(expireStyle.value, parseInt(expireValue.value) || 0)
      if (deliverySeconds > collectionSeconds) {
        alertStore.showAlert(t('collection.create.deliveryExceedCollection'), 'error')
        return
      }
    }
    // 检查取件码过期时间是否超过收件箱过期时间
    if (retrieveExpireStyle.value !== 'forever' && expireStyle.value !== 'forever') {
      const retrieveSeconds = _expireToSeconds(retrieveExpireStyle.value, parseInt(retrieveExpireValue.value) || 0)
      const collectionSeconds = _expireToSeconds(expireStyle.value, parseInt(expireValue.value) || 0)
      if (retrieveSeconds > collectionSeconds) {
        alertStore.showAlert(t('collection.create.retrieveExceedCollection'), 'error')
        return
      }
    }

    const result = await collectionStore.createCollection({
      title: title.value,
      description: description.value,
      max_files: maxFiles.value,
      expire_style: expireStyle.value,
      expire_value: parseInt(expireValue.value) || 7,
      delivery_expire_style: deliveryExpireStyle.value,
      delivery_expire_value: parseInt(deliveryExpireValue.value) || 7,
      retrieve_expire_style: retrieveExpireStyle.value,
      retrieve_expire_value: parseInt(retrieveExpireValue.value) || 7,
    })
    createdResult.value = result
    showCreatedModal.value = true
    alertStore.showAlert(t('collection.create.success'), 'success')

    // 保存创建收件箱记录
    const collectionRecord: CollectionRecord = {
      id: Date.now(),
      title: title.value || t('collection.manage.untitled'),
      collectionCode: result.collection_code,
      deliveryCode: result.delivery_code,
      retrieveCode: result.retrieve_code || '',
      date: new Date().toISOString().split('T')[0],
      maxFiles: maxFiles.value,
      expireInfo: getUnit(expireStyle.value) + ' ' + (expireValue.value || ''),
    }
    fileDataStore.addCollectionRecord(collectionRecord)
  } catch (err: unknown) {
    alertStore.showAlert(
      err instanceof Error ? err.message : t('collection.create.failed'),
      'error'
    )
  } finally {
    isCreating.value = false
  }
}



const handleModalClose = () => {
  showCreatedModal.value = false
  router.push('/')
}

const toHome = () => {
  router.push('/')
}
</script>
