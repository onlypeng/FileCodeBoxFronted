<template>
  <div class="flex-grow overflow-y-auto p-6">
    <transition-group name="list" tag="div" class="space-y-2">
      <div
        v-for="record in records"
        :key="record.id"
        class="rounded-lg p-3 cursor-pointer transition duration-200"
        :class="[isDarkMode ? 'bg-gray-800/60 hover:bg-gray-700/80' : 'bg-gray-50 hover:bg-gray-100']"
        @click="$emit('go-room', record.roomCode)"
      >
        <div class="flex items-center">
          <div class="flex-shrink-0 mr-3">
            <HouseIcon class="w-5 h-5" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-500']" />
          </div>
          <div class="flex-grow min-w-0 mr-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                :class="[isDarkMode ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-gray-900']"
              >{{ t('records.badge.direct') }}</span>
              <p
                class="text-sm truncate"
                :class="[isDarkMode ? 'text-gray-200' : 'text-gray-800']"
              >
                {{ record.title || t('direct.create.untitled') }}
              </p>
            </div>
            <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ record.date }}<span class="mx-1">·</span>{{ record.roomCode }}
            </p>
          </div>
          <div class="flex-shrink-0 flex items-center gap-1">
            <button
              type="button"
              @click.stop="$emit('view-details', record)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600']"
              :title="t('fileRecord.viewDetails')"
              :aria-label="t('fileRecord.viewDetails')"
            >
              <EyeIcon class="w-4 h-4" />
            </button>
            <button
              @click.stop="$emit('delete-record', record.id)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-400 hover:text-red-500']"
              :title="t('common.delete')"
              :aria-label="t('common.delete')"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </transition-group>

    <!-- 空状态 -->
    <div v-if="records.length === 0" class="text-center py-12">
      <HouseIcon class="w-10 h-10 mx-auto mb-2" :class="[isDarkMode ? 'text-gray-600' : 'text-amber-300']" />
      <p class="text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('records.empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { EyeIcon, TrashIcon, HouseIcon } from 'lucide-vue-next'
import type { DirectRecord } from '@/types'

defineProps<{
  records: DirectRecord[]
}>()

defineEmits<{
  'go-room': [roomCode: string]
  'view-details': [record: DirectRecord]
  'delete-record': [id: number]
}>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-move {
  transition: transform 0.3s ease;
}
</style>
