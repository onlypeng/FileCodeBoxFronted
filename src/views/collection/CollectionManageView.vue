<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div
      class="rounded-3xl shadow-2xl overflow-hidden border w-full max-w-lg transition-colors duration-300"
      :class="[
        isDarkMode
          ? 'bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border-gray-700'
          : 'bg-white border-gray-200'
      ]"
    >
      <div class="p-8">
        <PageHeader :title="t('collection.manage.title')" @title-click="toHome" />

        <!-- 输入收件箱码 -->
        <div class="mb-6">
          <label class="block text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
            {{ t('collection.manage.inputCodeLabel') }}
          </label>
          <div class="flex gap-2">
            <input
              v-model="inputCode"
              @keyup.enter="handleCodeSubmit"
              :placeholder="t('collection.manage.inputCodePlaceholder')"
              maxlength="6"
              class="flex-1 rounded-lg border px-4 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
              :class="[
                isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              ]"
            />
            <button
              @click="handleCodeSubmit"
              :disabled="!inputCode.trim() || isLoading"
              class="px-5 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isLoading ? t('collection.manage.loading') : t('collection.manage.open') }}
            </button>
          </div>
        </div>

        <!-- 最近创建的收件箱 -->
        <div v-if="recentCollections.length > 0">
          <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
            {{ t('collection.manage.recentCollections') }}
          </p>
          <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            <button
              v-for="item in recentCollections"
              :key="item.collection_code"
              @click="validateAndGo(item.collection_code)"
              class="w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 text-left"
              :class="[
                isDarkMode
                  ? 'bg-gray-800/50 hover:bg-gray-700'
                  : 'bg-gray-50 hover:bg-gray-100'
              ]"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ item.title || t('collection.manage.untitled') }}
                </p>
                <p class="text-xs font-mono" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">
                  {{ item.collection_code }}
                </p>
              </div>
              <div class="flex items-center gap-2 ml-2">
                <span class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ formatDate(item.created_at) }}
                </span>
                <button
                  @click.stop="removeRecent(item.collection_code)"
                  class="text-xs text-red-400 hover:text-red-600 transition-colors"
                  :title="t('collection.manage.removeRecent')"
                >
                  <XIcon class="w-3.5 h-3.5" />
                </button>
              </div>
            </button>
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <router-link to="/collection/create" class="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-colors text-center">
            {{ t('collection.manage.newCollection') }}
          </router-link>
          <router-link to="/" class="flex-1 py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-center">
            {{ t('collection.manage.backToHome') }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { useAlertStore } from '@/stores/alertStore'
import { CollectionService } from '@/services/collection'
import { XIcon } from 'lucide-vue-next'

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const alertStore = useAlertStore()
const collectionStore = useCollectionStore()

const inputCode = ref('')
const isLoading = ref(false)
const recentCollections = computed(() => collectionStore.recentList)

const formatDate = (isoStr: string) => {
  const d = new Date(isoStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return t('collection.manage.justNow')
  if (diffMin < 60) return t('collection.manage.minutesAgo', { n: diffMin })
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return t('collection.manage.hoursAgo', { n: diffHour })
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return t('collection.manage.daysAgo', { n: diffDay })
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const handleCodeSubmit = async () => {
  const code = inputCode.value.trim()
  if (!code) return
  await validateAndGo(code)
}

const validateAndGo = async (code: string) => {
  isLoading.value = true
  try {
    const res = await CollectionService.getManageInfo(code)
    if (res.code === 200) {
      router.push(`/collection/manage/${code}`)
    } else {
      alertStore.showAlert(t('collection.manage.notFound'), 'error')
    }
  } catch {
    alertStore.showAlert(t('collection.manage.notFound'), 'error')
  } finally {
    isLoading.value = false
  }
}

const removeRecent = (code: string) => {
  collectionStore.removeRecentCollection(code)
}

const toHome = () => router.push('/')
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.4);
  border-radius: 3px;
}
</style>
