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
        <!-- 返回首页 -->
        <button
          type="button"
          @click="goHome"
          class="flex items-center gap-1.5 text-sm font-medium transition-colors duration-300"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600']"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          {{ t('send.backToRetrieve') }}
        </button>

        <PageHeader :title="t('direct.create.title')" @title-click="goHome" />

        <!-- 创建房间 -->
        <form @submit.prevent="handleCreate" class="space-y-6">
          <FormInput
            v-model="title"
            :label="t('direct.create.titleLabel')"
            :placeholder="t('direct.create.titlePlaceholder')"
            :maxlength="50"
          />
          <ExpirationSelector
            v-model:expiration-method="expireStyle"
            v-model:expiration-value="expireValue"
            :options="expireOptions"
          />
          <!-- 人员上限（不超过后台配置的人员上限） -->
          <div>
            <label class="block text-sm font-medium mb-1.5" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-800']">
              {{ t('direct.create.maxMembersLabel') }}
            </label>
            <input
              v-model.number="maxMembers"
              type="number"
              min="1"
              :max="maxMembersLimit"
              class="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
              :class="[isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']"
            />
            <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ t('direct.create.maxMembersHint', { max: maxMembersLimit }) }}
            </p>
          </div>

          <!-- 房间选项：保存消息到服务器（随房间过期删除） -->
          <label
            class="flex items-start gap-2.5 cursor-pointer select-none"
          >
            <input v-model="saveMessages" type="checkbox" class="mt-0.5 accent-indigo-500 shrink-0" />
            <span>
              <span class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-800']">
                {{ t('direct.create.saveMessagesLabel') }}
              </span>
              <span class="block text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('direct.create.saveMessagesHint') }}
              </span>
            </span>
          </label>

          <!-- 房间选项：文件缓存（已接收成员作为多源，可转发给其他成员/新成员收取） -->
          <label
            class="flex items-start gap-2.5 cursor-pointer select-none"
          >
            <input v-model="cacheEnabled" type="checkbox" class="mt-0.5 accent-indigo-500 shrink-0" />
            <span>
              <span class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-800']">
                {{ t('direct.create.cacheEnabledLabel') }}
              </span>
              <span class="block text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('direct.create.cacheEnabledHint') }}
              </span>
            </span>
          </label>
          <button
            type="submit"
            :disabled="isCreating"
            class="btn-primary w-full"
          >
            {{ isCreating ? t('direct.create.creating') : t('direct.create.submit') }}
          </button>
        </form>

        <p class="text-center text-xs mt-6" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
          {{ t('direct.create.joinHint') }}
        </p>
      </div>
    </div>

    <!-- 创建成功弹窗 -->
    <SuccessModal
      :visible="showCreatedModal"
      :title="t('direct.create.success')"
      :subtitle="createdResult?.title || t('direct.create.untitled')"
      accent="indigo"
      :codes="createdCodes"
      @close="handleModalClose"
    >
      <template #footer>
        <button
          @click="goRoom(createdResult!.room_code)"
          class="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="[isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600']"
        >
          {{ t('direct.create.enterRoom') }}
        </button>
      </template>
    </SuccessModal>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import FormInput from '@/components/common/FormInput.vue'
import ExpirationSelector from '@/components/common/ExpirationSelector.vue'
import SuccessModal from '@/components/common/SuccessModal.vue'
import type { SuccessCodeItem } from '@/components/common/SuccessModal.vue'
import { useDirectStore } from '@/stores/directStore'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { useFileDataStore } from '@/stores/fileData'
import { buildAppUrl } from '@/utils/share-url'
import { readPreference } from '@/utils/preference-storage'
import type { DirectRoomInfo } from '@/types/direct'

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const directStore = useDirectStore()
const alertStore = useAlertStore()
const configStore = useConfigStore()
const fileDataStore = useFileDataStore()
const config = computed(() => configStore.config)

const title = ref('')
const expireStyle = ref(config.value.expireStyle[0] || 'day')
const expireValue = ref('1')
const isCreating = ref(false)
const createdResult = ref<DirectRoomInfo | null>(null)
const showCreatedModal = ref(false)
/** 人员上限：默认取后台配置（0=不限制时回退 10），不超过该上限 */
const maxMembersLimit = computed(() => {
  const n = Number(config.value.defaultMaxMembers) || 10
  return n > 0 ? n : 10
})
const maxMembers = ref(maxMembersLimit.value)
/** 是否保存聊天消息/文件元信息到服务器（随房间过期删除） */
const saveMessages = ref(false)
/** 是否启用房间文件缓存（已接收成员可作为多源转发，其他成员/新成员可收取） */
const cacheEnabled = ref(false)

const expireOptions = computed(() =>
  config.value.expireStyle.map((value) => ({ value, label: getUnit(value) }))
)

const createdCodes = computed<SuccessCodeItem[]>(() => {
  const r = createdResult.value
  if (!r) return []
  const link = buildAppUrl(`/direct/room/${r.room_code}`)
  return [{
    label: t('direct.room.roomCodeLabel'),
    code: r.room_code,
    qrValue: link,
    hint: t('direct.room.scanHint'),
    accent: 'indigo' as const,
    copyLinkText: t('direct.room.copyRoomLink'),
    copyLinkUrl: link
  }]
})

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

watch(
  () => config.value.expireStyle,
  (expireStyleList) => {
    if (expireStyleList.length > 0 && !expireStyleList.includes(expireStyle.value)) {
      expireStyle.value = expireStyleList[0]
    }
  },
  { immediate: true }
)

const handleCreate = async () => {
  if (isCreating.value) return
  isCreating.value = true
  try {
    createdResult.value = await directStore.createRoom({
      title: title.value,
      expire_style: expireStyle.value,
      expire_value: expireValue.value ? parseInt(expireValue.value) : 1,
      max_members: Math.max(1, Math.min(Number(maxMembers.value) || 1, maxMembersLimit.value)),
      save_messages: saveMessages.value,
      cache_enabled: cacheEnabled.value,
    })
    // 记录到首页「记录」抽屉
    fileDataStore.addDirectRecord({
      title: createdResult.value.title || '',
      roomCode: createdResult.value.room_code,
    })
    showCreatedModal.value = true
    alertStore.showAlert(t('direct.create.success'), 'success')
  } catch (err: unknown) {
    alertStore.showAlert(err instanceof Error ? err.message : t('direct.create.failed'), 'error')
  } finally {
    isCreating.value = false
  }
}

onMounted(() => {
  // 恢复上次使用过的过期时间偏好
  const saved = readPreference('directExpireStyle', '')
  if (saved && config.value.expireStyle.includes(saved)) {
    expireStyle.value = saved
  }
})

const goRoom = (code: string) => {
  showCreatedModal.value = false
  directStore.reset()
  router.push(`/direct/room/${code}`)
}

const handleModalClose = () => {
  showCreatedModal.value = false
  goHome()
}

const goHome = () => {
  router.push('/')
}
</script>
