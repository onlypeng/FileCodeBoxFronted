<template>
  <Teleport to="body">
    <Transition name="modal-fade" appear>
      <div
        v-if="visible"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="$emit('close')"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            class="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300"
            :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']"
            @click.stop
          >
            <!-- 头部 -->
            <div class="flex items-center justify-between px-6 py-4 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('collection.create.success') }}
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
              <!-- 收件箱信息 -->
              <div class="text-center" v-if="result">
                <p class="text-sm mb-1" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ result.title || t('collection.manage.untitled') }}</p>
                <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('collection.manage.fileCount', { count: 0, max: result.max_files }) }}
                </p>
              </div>

              <!-- 三码展示 -->
              <div class="grid grid-cols-3 gap-3" v-if="result">
                <!-- 管理码 -->
                <div class="rounded-xl p-3" :class="[isDarkMode ? 'bg-indigo-900/20 border border-indigo-800' : 'bg-indigo-50 border border-indigo-100']">
                  <p class="text-[10px] font-medium mb-1.5 text-center" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">
                    {{ t('collection.create.collectionCodeLabel') }}
                  </p>
                  <div class="flex items-center justify-center mb-2">
                    <span class="text-lg font-mono font-bold tracking-widest" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">
                      {{ result.collection_code }}
                    </span>
                  </div>
                  <div class="flex justify-center mb-2">
                    <div class="bg-white p-1.5 rounded-lg shadow-sm">
                      <QRCode :value="collectionQrValue" :size="72" level="M" />
                    </div>
                  </div>
                  <p class="text-[9px] text-center mb-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ t('collection.create.manageHint') }}
                  </p>
                  <button
                    @click="copyCollectionCode"
                    class="w-full py-1 rounded-lg text-[10px] font-medium transition-colors"
                    :class="[isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600']"
                  >
                    {{ t('collection.create.copyCode') }}
                  </button>
                </div>

                <!-- 取件码 -->
                <div class="rounded-xl p-3" :class="[isDarkMode ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-emerald-50 border border-emerald-100']">
                  <p class="text-[10px] font-medium mb-1.5 text-center" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">
                    {{ t('collection.create.retrieveCodeLabel') }}
                  </p>
                  <div class="flex items-center justify-center mb-2">
                    <span class="text-lg font-mono font-bold tracking-widest" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">
                      {{ result.retrieve_code }}
                    </span>
                  </div>
                  <div class="flex justify-center mb-2">
                    <div class="bg-white p-1.5 rounded-lg shadow-sm">
                      <QRCode :value="retrieveQrValue" :size="72" level="M" />
                    </div>
                  </div>
                  <p class="text-[9px] text-center mb-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ t('collection.create.retrieveHint') }}
                  </p>
                  <button
                    @click="copyRetrieveCode"
                    class="w-full py-1 rounded-lg text-[10px] font-medium transition-colors"
                    :class="[isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-500 text-white hover:bg-emerald-600']"
                  >
                    {{ t('collection.create.copyCode') }}
                  </button>
                </div>

                <!-- 投件码 -->
                <div class="rounded-xl p-3" :class="[isDarkMode ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-100']">
                  <p class="text-[10px] font-medium mb-1.5 text-center" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']">
                    {{ t('collection.create.deliveryCodeLabel') }}
                  </p>
                  <div class="flex items-center justify-center mb-2">
                    <span class="text-lg font-mono font-bold tracking-widest" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']">
                      {{ result.delivery_code }}
                    </span>
                  </div>
                  <div class="flex justify-center mb-2">
                    <div class="bg-white p-1.5 rounded-lg shadow-sm">
                      <QRCode :value="deliveryQrValue" :size="72" level="M" />
                    </div>
                  </div>
                  <p class="text-[9px] text-center mb-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ t('collection.create.scanToDeliver') }}
                  </p>
                  <button
                    @click="copyDeliveryCode"
                    class="w-full py-1 rounded-lg text-[10px] font-medium transition-colors"
                    :class="[isDarkMode ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-amber-500 text-white hover:bg-amber-600']"
                  >
                    {{ t('collection.create.copyCode') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 底部 -->
            <div class="px-6 py-4 border-t space-y-2" :class="[isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50']">
              <div class="grid grid-cols-3 gap-2">
                <button
                  @click="copyCollectionLink"
                  class="py-2 rounded-lg text-xs font-medium transition-colors"
                  :class="[isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600']"
                >
                  {{ t('collection.create.copyManageLink') }}
                </button>
                <button
                  @click="copyRetrieveLinkAction"
                  class="py-2 rounded-lg text-xs font-medium transition-colors"
                  :class="[isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-500 text-white hover:bg-emerald-600']"
                >
                  {{ t('collection.create.copyRetrieveLink') }}
                </button>
                <button
                  @click="copyDeliveryLink"
                  class="py-2 rounded-lg text-xs font-medium transition-colors"
                  :class="[isDarkMode ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-amber-500 text-white hover:bg-amber-600']"
                >
                  {{ t('collection.create.copyDeliveryLink') }}
                </button>
              </div>
              <button
                @click="goToManage"
                class="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
                :class="[isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
              >
                {{ t('collection.create.manage') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode.vue'
import { XIcon } from 'lucide-vue-next'
import { copyToClipboard, copyCollectionManageLink, copyCollectionRetrieveLink, copyDeliveryUploadLink } from '@/utils/clipboard'
import { useAlertStore } from '@/stores/alertStore'
import type { CreateCollectionResponse } from '@/types/collection'

const props = defineProps<{
  visible: boolean
  result: CreateCollectionResponse | null
}>()

const emit = defineEmits<{
  close: []
  'go-manage': [code: string]
}>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const alertStore = useAlertStore()

const baseUrl = window.location.origin + '/#'

const collectionQrValue = computed(() => {
  if (!props.result) return ''
  return `${baseUrl}/collection/manage/${props.result.collection_code}`
})

const retrieveQrValue = computed(() => {
  if (!props.result) return ''
  return `${baseUrl}/collection/retrieve/${props.result.retrieve_code}`
})

const deliveryQrValue = computed(() => {
  if (!props.result) return ''
  return `${baseUrl}/delivery/upload/${props.result.delivery_code}`
})

const copyCollectionCode = async () => {
  if (!props.result) return
  await copyToClipboard(props.result.collection_code, {
    successMsg: t('collection.create.codeCopied'),
    errorMsg: t('collection.create.copyFailed'),
    notify: (message, type) => alertStore.showAlert(message, type),
  })
}

const copyRetrieveCode = async () => {
  if (!props.result) return
  await copyToClipboard(props.result.retrieve_code, {
    successMsg: t('collection.create.codeCopied'),
    errorMsg: t('collection.create.copyFailed'),
    notify: (message, type) => alertStore.showAlert(message, type),
  })
}

const copyDeliveryCode = async () => {
  if (!props.result) return
  await copyToClipboard(props.result.delivery_code, {
    successMsg: t('collection.create.codeCopied'),
    errorMsg: t('collection.create.copyFailed'),
    notify: (message, type) => alertStore.showAlert(message, type),
  })
}

const copyRetrieveLinkAction = async () => {
  if (!props.result) return
  await copyCollectionRetrieveLink(props.result.retrieve_code, {
    notify: (message, type) => alertStore.showAlert(message, type),
  })
}

const copyCollectionLink = async () => {
  if (!props.result) return
  await copyCollectionManageLink(props.result.collection_code, {
    notify: (message, type) => alertStore.showAlert(message, type),
  })
}

const copyDeliveryLink = async () => {
  if (!props.result) return
  await copyDeliveryUploadLink(props.result.delivery_code, {
    notify: (message, type) => alertStore.showAlert(message, type),
  })
}

const goToManage = () => {
  if (!props.result) return
  emit('close')
  router.push(`/collection/manage/${props.result.collection_code}`)
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
