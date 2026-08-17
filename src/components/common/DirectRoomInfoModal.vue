<template>
  <BaseModal :show="visible" :title="t('direct.room.detailTitle')" size="sm" @close="$emit('close')">
    <!-- 加载中 -->
    <div v-if="loading" class="py-10 text-center">
      <div class="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-2 text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('common.loading') }}</p>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="py-8 text-center">
      <AlertCircleIcon class="w-10 h-10 mx-auto mb-2 text-red-500" />
      <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">{{ error }}</p>
    </div>

    <!-- 房间信息 -->
    <template v-else-if="info">
      <div class="space-y-4">
        <!-- 标题 -->
        <div>
          <p class="text-xs mb-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('direct.create.titleLabel') }}</p>
          <p class="text-base font-medium break-all" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
            {{ info.title || t('direct.create.untitled') }}
          </p>
        </div>

        <!-- 房间码卡片（含二维码 + 复制链接） -->
        <CodeCard
          :label="t('direct.room.roomCodeLabel')"
          :code="info.room_code"
          :qr-value="roomLink"
          :hint="t('direct.room.scanHint')"
          :copy-link-text="t('direct.room.copyRoomLink')"
          :copy-link-url="roomLink"
          accent="indigo"
        />

        <!-- 房间信息 -->
        <div class="space-y-2.5">
          <div class="flex items-baseline gap-2.5">
            <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('direct.room.createdAt') }}</span>
            <span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ formatDate(info.created_at) }}</span>
          </div>
          <div class="flex items-baseline gap-2.5">
            <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('direct.room.expireInfo') }}</span>
            <span class="text-sm" :class="[isExpired ? 'text-red-500 font-medium' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')]">
              {{ isExpired ? t('direct.join.expired') : expireText }}
            </span>
          </div>
          <div class="flex items-baseline gap-2.5">
            <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('direct.room.maxMembers') }}</span>
            <span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ info.max_members }}</span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full gap-2">
        <button
          type="button"
          @click="$emit('close')"
          class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
        >
          {{ t('common.close') }}
        </button>
        <button
          v-if="info && !isExpired"
          type="button"
          @click="$emit('enter-room', info.room_code)"
          class="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          :class="[isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-500 hover:bg-indigo-600']"
        >
          {{ t('direct.create.enterRoom') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, inject, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircleIcon } from 'lucide-vue-next'
import BaseModal from '@/components/common/BaseModal.vue'
import CodeCard from '@/components/common/CodeCard.vue'
import { useDirectRoomInfo } from '@/composables'

const props = defineProps<{
  visible: boolean
  roomCode: string
}>()

const emit = defineEmits<{
  close: []
  'enter-room': [roomCode: string]
}>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const {
  info,
  loading,
  error,
  roomLink: buildRoomLink,
  loadInfo: composableLoadInfo
} = useDirectRoomInfo()

const roomLink = computed(() => (props.roomCode ? buildRoomLink(props.roomCode) : ''))

/** 房间是否已过期 */
const isExpired = computed(() => {
  if (!info.value?.expired_at) return false
  return new Date(info.value.expired_at).getTime() < Date.now()
})

/** 过期文案（永久 / N天/小时/分钟后过期） */
const expireText = computed(() => {
  const style = info.value?.expire_style
  if (!style) return ''
  if (style === 'forever') return t('retrieve.expireForever')
  const units: Record<string, string> = {
    day: t('retrieve.unitDay'),
    hour: t('retrieve.unitHour'),
    minute: t('retrieve.unitMinute')
  }
  return t('retrieve.expireAfter', { value: info.value?.expire_value ?? 1, unit: units[style] || style })
})

const formatDate = (date?: string | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

// 每次打开弹窗时重新加载
watch(
  () => props.visible,
  (visible) => {
    if (visible) void composableLoadInfo(props.roomCode)
  }
)
</script>
