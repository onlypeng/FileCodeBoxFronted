<template>
  <div class="flex-grow overflow-y-auto p-6">
    <transition-group name="list" tag="div" class="space-y-2">
      <div
        v-for="record in records"
        :key="record.id"
        class="rounded-lg p-3 transition duration-200"
        :class="[isDarkMode ? 'bg-gray-800/60 hover:bg-gray-700/80' : 'bg-gray-50 hover:bg-gray-100']"
      >
        <div class="flex items-center">
          <div class="flex-shrink-0 mr-3">
            <InboxIcon class="w-5 h-5" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
          </div>
          <div class="flex-grow min-w-0 mr-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                :class="[isDarkMode ? 'bg-indigo-900/40 text-indigo-200' : 'bg-indigo-100 text-gray-900']"
              >{{ t('records.badge.collection') }}</span>
              <p
                class="text-sm truncate"
                :class="[isDarkMode ? 'text-gray-200' : 'text-gray-800']"
              >
                {{ record.title || t('collection.manage.untitled') }}
              </p>
            </div>
            <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ record.date }}<span class="mx-1">·</span>{{ record.maxFiles }} {{ t('records.multiFile') }}
              <span class="mx-1">·</span>{{ record.expireInfo }}
            </p>
          </div>
          <div class="flex-shrink-0 flex items-center gap-1">
            <button
              @click="$emit('go-manage', record)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600']"
              :title="t('collection.create.manage')"
              :aria-label="t('collection.create.manage')"
            >
              <SettingsIcon class="w-4 h-4" />
            </button>
            <button
              @click="$emit('go-retrieve', record)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-emerald-400' : 'hover:bg-gray-200 text-gray-400 hover:text-emerald-600']"
              :title="t('collection.create.retrieveHint')"
              :aria-label="t('collection.create.retrieveHint')"
            >
              <EyeIcon class="w-4 h-4" />
            </button>
            <button
              @click="$emit('delete-record', record.id)"
              class="p-1.5 rounded-md transition duration-200"
              :class="[isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-400 hover:text-red-500']"
              :aria-label="t('records.delete') || '删除'"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </transition-group>

    <!-- 空状态 -->
    <div v-if="records.length === 0" class="text-center py-12">
      <InboxIcon class="w-10 h-10 mx-auto mb-2" :class="[isDarkMode ? 'text-gray-600' : 'text-indigo-300']" />
      <p class="text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('records.empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 收集件记录列表（纯受控 + 事件外抛）。
 *
 * ## 为什么所有动作都 emit
 * "跳转管理页""跳转查看页""删除"三种操作分别依赖路由 push、取件流程和本地记录存储，
 * 组件自己拿不到这些依赖；让上层决定也让删除前的二次确认（ConfirmDialog）由上层统一控制。
 *
 * ## 注意
 * 这里的按钮**没有** @click.stop——整行本身不可点击（收集件没有"进入某处"的默认动作），
 * 与 DirectRecordList 不同，后者整行有 @click 才需要在行内按钮上阻止冒泡。
 * delete-record 只抛 id 而不是整条记录：删除动作不需要记录内容，抛 id 更明确。
 */
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  InboxIcon,
  EyeIcon,
  TrashIcon,
  SettingsIcon
} from 'lucide-vue-next'
import type { CollectionRecord } from '@/types'

defineProps<{
  records: CollectionRecord[]
}>()

defineEmits<{
  'go-manage': [record: CollectionRecord]
  'go-retrieve': [record: CollectionRecord]
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
