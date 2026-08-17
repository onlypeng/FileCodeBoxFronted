<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div
      class="rounded-3xl shadow-2xl overflow-hidden border w-full max-w-md lg:max-w-3xl transition-colors duration-300"
      :class="[
        isDarkMode
          ? 'bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border-gray-700'
          : 'bg-white border-gray-200'
      ]"
    >
      <div class="p-8">
        <!-- 返回首页 -->
        <button
          @click="toHome"
          class="flex items-center gap-1.5 text-sm font-medium transition-colors duration-300"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600']"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          {{ t('collection.create.backToHome') }}
        </button>

        <PageHeader :title="t('collection.create.title')" @title-click="toHome" />

        <form @submit.prevent="handleCreate">
          <!-- 桌面宽屏两列：左列基本信息 + 提交，右列过期设置；窄屏单列回退 -->
          <div class="lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">
            <div class="flex flex-col space-y-4">
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
                  rows="2"
                  class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
                  :class="[
                    isDarkMode
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  ]"
                ></textarea>
              </div>

              <FormInput
                v-model="maxFilesInput"
                :label="t('collection.create.maxFilesLabel')"
                type="number"
                :min="1"
                :max="config.maxCollectionFiles || 100"
              />
            </div>

            <!-- 右列：过期时间设置分组（收件箱 / 投件码 / 取件码 三合一） -->
            <div
              class="rounded-xl border p-3 space-y-3 lg:self-start"
              :class="[isDarkMode ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-gray-50/60']"
            >
              <p class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-800']">
                {{ t('collection.create.expireSettings') }}
              </p>
              <ExpirationSelector
                compact
                :label="t('collection.create.expireBoxShort')"
                v-model:expiration-method="expireStyle"
                v-model:expiration-value="expireValue"
                :options="expireOptions"
              />
              <ExpirationSelector
                compact
                :label="t('collection.create.expireDeliveryShort')"
                v-model:expiration-method="deliveryExpireStyle"
                v-model:expiration-value="deliveryExpireValue"
                :options="deliveryExpireOptions"
              />
              <p v-if="deliveryExpireInvalid" class="text-[11px] leading-snug" :class="[isDarkMode ? 'text-red-400' : 'text-red-600']">
                {{ t('collection.create.deliveryExceedCollection') }}
              </p>
              <ExpirationSelector
                compact
                :label="t('collection.create.expireRetrieveShort')"
                v-model:expiration-method="retrieveExpireStyle"
                v-model:expiration-value="retrieveExpireValue"
                :options="retrieveExpireOptions"
              />
              <p v-if="retrieveExpireInvalid" class="text-[11px] leading-snug" :class="[isDarkMode ? 'text-red-400' : 'text-red-600']">
                {{ t('collection.create.retrieveExceedCollection') }}
              </p>
            </div>
          </div>

          <!-- 提交按钮：横跨整行居中（桌面两列时居中于卡片底部，窄屏单列时全宽） -->
          <div class="mt-6 flex justify-center">
            <button
              type="submit"
              :disabled="isCreating || expireInvalid"
              class="btn-primary w-full max-w-md relative overflow-hidden group"
            >
              <span class="relative z-10 flex items-center justify-center text-lg">
                {{ isCreating ? t('collection.create.creating') : t('collection.create.submit') }}
              </span>
            </button>
          </div>
        </form>

        <!-- 创建成功后弹出详情弹窗（统一成功弹窗 + 三码卡片） -->
        <SuccessModal
          :visible="showCreatedModal"
          :title="t('collection.create.success')"
          :subtitle="createdResult?.title || t('collection.manage.untitled')"
          accent="emerald"
          :codes="createdCodes"
          @close="handleModalClose"
        >
          <template #footer>
            <button
              @click="goManage"
              class="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="[isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600']"
            >
              {{ t('collection.create.manage') }}
            </button>
          </template>
        </SuccessModal>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import FormInput from '@/components/common/FormInput.vue'
import ExpirationSelector from '@/components/common/ExpirationSelector.vue'
import SuccessModal from '@/components/common/SuccessModal.vue'
import type { SuccessCodeItem } from '@/components/common/SuccessModal.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { useFileDataStore } from '@/stores/fileData'
import { buildAppUrl } from '@/utils/share-url'
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
// 默认值受后台"收件箱默认配置"控制
const maxFiles = ref(config.value.collectionDefaultMaxFiles || 20)

// FormInput 的 v-model 为字符串，提供桥接 getter/setter
const maxFilesInput = computed({
  get: () => String(maxFiles.value),
  set: (value: string) => {
    maxFiles.value = Math.max(1, Number(value) || 1)
  }
})

// 收件箱过期配置 - 受后台设置控制
const expireStyle = ref(config.value.expireStyle[0] || 'day')
const expireValue = ref(String(config.value.collectionDefaultExpireDays || 7))

// 投件码过期配置 - 受后台设置控制
const deliveryExpireStyle = ref(config.value.expireStyle[0] || 'day')
const deliveryExpireValue = ref('7')

// 取件码过期配置 - 受后台设置控制
const retrieveExpireStyle = ref(config.value.expireStyle[0] || 'day')
const retrieveExpireValue = ref('7')

const isCreating = ref(false)
const createdResult = ref<CreateCollectionResponse | null>(null)
const showCreatedModal = ref(false)

// 创建成功后三码卡片（管理码 / 取件码 / 投件码）
const createdCodes = computed<SuccessCodeItem[]>(() => {
  const r = createdResult.value
  if (!r) return []
  const baseUrl = buildAppUrl()
  return [
    {
      label: t('collection.create.collectionCodeLabel'),
      code: r.collection_code,
      qrValue: `${baseUrl}/collection/manage/${r.collection_code}`,
      hint: t('collection.create.manageHint'),
      accent: 'indigo',
      copyLinkText: t('collection.create.copyCollectionLink'),
      copyLinkUrl: `${baseUrl}/collection/manage/${r.collection_code}`
    },
    {
      label: t('collection.create.retrieveCodeLabel'),
      code: r.retrieve_code,
      qrValue: `${baseUrl}/collection/retrieve/${r.retrieve_code}`,
      hint: t('collection.create.retrieveHint'),
      accent: 'emerald',
      copyLinkText: t('collection.create.copyRetrieveLink'),
      copyLinkUrl: `${baseUrl}/collection/retrieve/${r.retrieve_code}`
    },
    {
      label: t('collection.create.deliveryCodeLabel'),
      code: r.delivery_code,
      qrValue: `${baseUrl}/delivery/upload/${r.delivery_code}`,
      hint: t('collection.create.scanToDeliver'),
      accent: 'amber',
      copyLinkText: t('collection.create.copyDeliveryLink'),
      copyLinkUrl: `${baseUrl}/delivery/upload/${r.delivery_code}`
    }
  ]
})

// 过期选项受后台设置控制
// 收件箱（整箱）过期按次数不符合逻辑：整箱存活期应有时间维度，屏蔽 count 选项
const expireOptions = computed(() =>
  config.value.expireStyle
    .filter((value) => value !== 'count')
    .map((value) => ({
      value,
      label: getUnit(value)
    }))
)

// 投件码/取件码过期支持按次数（次数用尽即过期，无时间维度，不与收件箱时间比较）
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

// 当后台设置变化时同步（整箱过期禁用 count，若当前为 count 则回退到第一个时间型选项）
watch(
  () => config.value.expireStyle,
  (expireStyleList) => {
    const boxStyles = expireStyleList.filter((v) => v !== 'count')
    if (boxStyles.length > 0 && (expireStyle.value === 'count' || !boxStyles.includes(expireStyle.value))) {
      expireStyle.value = boxStyles[0]
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

/** 过期时间边界（秒）：forever / count 无时间维度返回 null（count 次数用尽即过期，直接放行） */
const _expireBoundSeconds = (style: string, value: number): number | null => {
  if (style === 'forever' || style === 'count') return null
  const ms: Record<string, number> = { day: 86400, hour: 3600, minute: 60 }
  return (ms[style] || 86400) * value
}

/** 实时校验：投件码/取件码时间型过期是否超过收件箱（forever/count 不参与比较） */
const deliveryExpireInvalid = computed(() => {
  const box = _expireBoundSeconds(expireStyle.value, parseInt(expireValue.value) || 0)
  const sub = _expireBoundSeconds(deliveryExpireStyle.value, parseInt(deliveryExpireValue.value) || 0)
  return box !== null && sub !== null && sub > box
})
const retrieveExpireInvalid = computed(() => {
  const box = _expireBoundSeconds(expireStyle.value, parseInt(expireValue.value) || 0)
  const sub = _expireBoundSeconds(retrieveExpireStyle.value, parseInt(retrieveExpireValue.value) || 0)
  return box !== null && sub !== null && sub > box
})
/** 存在任一子码超限：禁用提交 */
const expireInvalid = computed(() => deliveryExpireInvalid.value || retrieveExpireInvalid.value)

const handleCreate = async () => {
  if (!title.value.trim()) {
    alertStore.showAlert(t('collection.create.titleRequired'), 'error')
    return
  }
  // 实时校验兜底：子码过期超过收件箱时阻止提交
  if (deliveryExpireInvalid.value) {
    alertStore.showAlert(t('collection.create.deliveryExceedCollection'), 'error')
    return
  }
  if (retrieveExpireInvalid.value) {
    alertStore.showAlert(t('collection.create.retrieveExceedCollection'), 'error')
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
      // 三码各自过期时间（记录-收件箱-查看时展示）
      collectionExpire: getUnit(expireStyle.value) + ' ' + (expireValue.value || ''),
      deliveryExpire: getUnit(deliveryExpireStyle.value) + ' ' + (deliveryExpireValue.value || ''),
      retrieveExpire: getUnit(retrieveExpireStyle.value) + ' ' + (retrieveExpireValue.value || ''),
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

const goManage = () => {
  if (!createdResult.value) return
  showCreatedModal.value = false
  router.push(`/collection/manage/${createdResult.value.collection_code}`)
}

const toHome = () => {
  router.push('/')
}
</script>
