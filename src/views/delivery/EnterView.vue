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
        <PageHeader :title="t('delivery.enter.title')" @title-click="toHome" />

        <div class="space-y-6">
          <p class="text-sm text-center" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ t('delivery.enter.description') }}
          </p>

          <FormInput
            v-model="deliveryCode"
            :label="t('delivery.enter.codeLabel')"
            :placeholder="t('delivery.enter.codePlaceholder')"
            :maxlength="6"
          />

          <button
            @click="handleLookup"
            :disabled="deliveryCode.length !== 6 || isLoading"
            class="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span class="flex items-center justify-center text-lg">
              <SendHorizonalIcon class="w-5 h-5 mr-2" />
              {{ isLoading ? t('delivery.enter.loading') : t('delivery.enter.submit') }}
            </span>
          </button>
        </div>

        <!-- 最近投件码 -->
        <div v-if="recentCodes.length > 0" class="mt-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ t('delivery.enter.recentCodes') }}
            </span>
            <button
              @click="clearRecentCodes"
              class="text-xs transition-colors"
              :class="[isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600']"
            >
              {{ t('common.clear') }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="item in recentCodes"
              :key="item.code"
              @click="goToDelivery(item.code)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
              :class="[
                isDarkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-indigo-600 hover:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-indigo-500 hover:text-white'
              ]"
            >
              <span>{{ item.code }}</span>
              <span v-if="item.title" class="opacity-60">· {{ item.title }}</span>
              <XIcon
                class="w-3 h-3 opacity-40 hover:opacity-100"
                @click.stop="removeRecentCode(item.code)"
              />
            </button>
          </div>
        </div>

        <div class="mt-6 text-center">
          <router-link to="/" class="text-indigo-400 hover:text-indigo-300 transition duration-300 text-sm">
            {{ t('delivery.enter.backToHome') }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import FormInput from '@/components/common/FormInput.vue'
import { useAlertStore } from '@/stores/alertStore'
import { DeliveryService } from '@/services/delivery'
import { SendHorizonalIcon, XIcon } from 'lucide-vue-next'
import { STORAGE_KEYS } from '@/constants'

interface RecentDeliveryCode {
  code: string
  title: string
  savedAt: number
}

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const alertStore = useAlertStore()

const deliveryCode = ref('')
const isLoading = ref(false)
const recentCodes = ref<RecentDeliveryCode[]>([])

function loadRecentCodes(): RecentDeliveryCode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_DELIVERY_CODES)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentCode(code: string, title: string = '') {
  const list = loadRecentCodes().filter(c => c.code !== code)
  list.unshift({ code, title, savedAt: Date.now() })
  localStorage.setItem(STORAGE_KEYS.RECENT_DELIVERY_CODES, JSON.stringify(list.slice(0, 10)))
  recentCodes.value = loadRecentCodes()
}

function removeRecentCode(code: string) {
  const list = loadRecentCodes().filter(c => c.code !== code)
  localStorage.setItem(STORAGE_KEYS.RECENT_DELIVERY_CODES, JSON.stringify(list))
  recentCodes.value = list
}

function clearRecentCodes() {
  localStorage.removeItem(STORAGE_KEYS.RECENT_DELIVERY_CODES)
  recentCodes.value = []
}

function goToDelivery(code: string) {
  router.push(`/delivery/upload/${code}`)
}

const handleLookup = async () => {
  isLoading.value = true
  try {
    const code = deliveryCode.value.toUpperCase()
    const res = await DeliveryService.getDeliveryPage(code)
    if (res.code === 200 && res.detail) {
      // 缓存投件码
      const title = res.detail.title || ''
      saveRecentCode(code, title)
      router.push(`/delivery/upload/${code}`)
    } else {
      alertStore.showAlert(t('delivery.enter.notFound'), 'error')
    }
  } catch {
    alertStore.showAlert(t('delivery.enter.notFound'), 'error')
  } finally {
    isLoading.value = false
  }
}

const toHome = () => {
  router.push('/')
}

onMounted(() => {
  recentCodes.value = loadRecentCodes()
})
</script>
