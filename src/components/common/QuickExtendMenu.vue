<template>
  <div
    ref="rootEl"
    class="relative inline-flex"
    @mouseenter="open"
    @mouseleave="scheduleClose"
  >
    <button
      type="button"
      class="inline-flex items-center justify-center text-xs text-amber-500 hover:text-amber-700 transition-colors"
      :title="t('admin.unifiedManage.extend')"
    >
      <ClockIcon class="w-4 h-4" />
    </button>
    <Teleport to="body">
      <div
        v-if="menuVisible"
        class="fixed z-[60] min-w-28 rounded-xl border shadow-xl backdrop-blur-md py-1"
        :style="{ left: `${menuLeft}px`, top: `${menuTop}px` }"
        :class="[isDarkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200']"
        @mouseenter="cancelClose"
        @mouseleave="scheduleClose"
      >
        <button
          v-for="opt in options"
          :key="`${opt.style}-${opt.value}`"
          type="button"
          @click="apply(opt)"
          class="w-full text-left px-3 py-1.5 text-xs transition-colors"
          :class="[isDarkMode ? 'text-gray-200 hover:bg-gray-700/60' : 'text-gray-700 hover:bg-indigo-50']"
        >{{ opt.label }}</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClockIcon } from 'lucide-vue-next'
import { useUnifiedAdmin } from '@/composables'
import { useAlertStore } from '@/stores/alertStore'

const props = defineProps<{
  target: 'file' | 'collection' | 'room'
  item: any
}>()

const emit = defineEmits<{ (e: 'extended'): void }>()

const { t } = useI18n()
const isDarkMode = inject('isDarkMode')
const alertStore = useAlertStore()
const adminApi = useUnifiedAdmin()

const menuVisible = ref(false)
const menuLeft = ref(0)
const menuTop = ref(0)
const rootEl = ref<HTMLElement | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

/** 快捷延长选项：按当前过期类型区分 —— 时间型延长时间，次数型延长次数，均含永久 */
const isCountExpire = computed(() => props.item?.expire_style === 'count')
const options = computed(() => {
  if (isCountExpire.value) {
    return [
      { style: 'count', value: 5, label: `+5${t('admin.unifiedManage.extendCount')}` },
      { style: 'count', value: 10, label: `+10${t('admin.unifiedManage.extendCount')}` },
      { style: 'count', value: 20, label: `+20${t('admin.unifiedManage.extendCount')}` },
      { style: 'forever', value: 0, label: t('admin.unifiedManage.extendForever') },
    ]
  }
  return [
    { style: 'day', value: 1, label: `1${t('admin.unifiedManage.extendDay')}` },
    { style: 'day', value: 3, label: `3${t('admin.unifiedManage.extendDay')}` },
    { style: 'day', value: 7, label: `7${t('admin.unifiedManage.extendDay')}` },
    { style: 'day', value: 30, label: `30${t('admin.unifiedManage.extendDay')}` },
    { style: 'forever', value: 0, label: t('admin.unifiedManage.extendForever') },
  ]
})

const open = () => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  const el = rootEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  // 菜单右对齐锚点右侧（w-28 = 112px），向下展开
  menuLeft.value = Math.max(8, rect.right - 112)
  menuTop.value = rect.bottom + 6
  menuVisible.value = true
}

const scheduleClose = () => {
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    menuVisible.value = false
  }, 200)
}

const cancelClose = () => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const apply = async (opt: { style: string; value: number }) => {
  menuVisible.value = false
  try {
    if (props.target === 'file') {
      await adminApi.extendAdminFile(props.item.id, opt.style, opt.value)
    } else if (props.target === 'collection') {
      await adminApi.extendAdminCollection(props.item.id, opt.style, opt.value, 'manage')
    } else {
      await adminApi.extendAdminRoom(props.item.id, opt.style, opt.value)
    }
    alertStore.showAlert(t('admin.unifiedManage.extendSuccess'), 'success')
    emit('extended')
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.extendFailed'), 'error')
  }
}
</script>
