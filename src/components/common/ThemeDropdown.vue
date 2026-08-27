<script setup lang="ts">
/**
 * 主题下拉框（单选/多选通用）：
 * - 样式统一：圆角 + 主题色(靛蓝)高亮、浅色白底/深色毛玻璃、柔和阴影、平滑展开动画
 * - 单选：点击选项即选中并收起；多选：checkbox 勾选
 * - 选项整行可点击（含文字/checkbox）：label 阻止默认转发，避免 checkbox 双触发抵消
 * - 点击外部自动收起；面板可向上或向下展开（弹窗内用向上避免被裁剪）
 * 用法：
 *   <ThemeDropdown v-model="selected" :options="opts" align="up" />
 *   <ThemeDropdown v-model="multi" multi :options="opts" />
 *   自定义选项内容：<template #option="{ opt, selected }">...</template>
 */
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { CheckIcon, ChevronDownIcon } from 'lucide-vue-next'

export interface ThemeDropdownOption {
  value: string
  label: string
  desc?: string
  /** 允许自定义选项携带扩展字段（如分辨率/码率），供 #option 插槽展示 */
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    options: ThemeDropdownOption[]
    modelValue: string | string[]
    multi?: boolean
    /** 面板展开方向：down=向下（默认） / up=向上 */
    align?: 'down' | 'up'
    /** sm=紧凑（共享控制栏）/ md=常规（弹窗、设置页） */
    size?: 'sm' | 'md'
    /** 固定宽度（Tailwind 类，如 w-24 / w-full）：触发按钮与面板同宽，避免选中项变化时宽度跳动 */
    width?: string
    /** 面板额外类（覆盖宽度等） */
    panelClass?: string
    placeholder?: string
  }>(),
  { multi: false, align: 'down', size: 'md', width: '', panelClass: '', placeholder: '' }
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string | string[]): void }>()

const isDarkMode = inject('isDarkMode')
const open = ref(false)
const rootRef = ref<HTMLElement>()

const selectedSet = computed(() => {
  const v = props.modelValue
  if (Array.isArray(v)) return new Set(v)
  return new Set(v ? [v] : [])
})

/** 触发按钮摘要：选中项 label 以 + 连接 */
const summaryText = computed(() => {
  const labels = props.options.filter((o) => selectedSet.value.has(o.value)).map((o) => o.label)
  return labels.length > 0 ? labels.join(' + ') : props.placeholder
})

/** 点击选项：多选切换勾选，单选选中即收起 */
function toggle(value: string) {
  if (props.multi) {
    const next = new Set(selectedSet.value)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    emit('update:modelValue', Array.from(next))
  } else {
    emit('update:modelValue', value)
    open.value = false
  }
}

function onDocClick(e: MouseEvent) {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootRef" class="relative" :class="[width]">
    <!-- 触发按钮（固定宽度时铺满容器，避免选中项文字变化导致宽度跳动） -->
    <button
      type="button"
      @click.stop="open = !open"
      class="w-full flex items-center justify-between gap-2 rounded-xl border outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500"
      :class="[
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2.5 text-sm h-[46px]',
        isDarkMode
          ? 'bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-500'
          : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
      ]"
    >
      <span class="flex-1 truncate leading-none min-w-0">{{ summaryText }}</span>
      <ChevronDownIcon class="w-4 h-4 shrink-0 transition-transform duration-200" :class="open ? 'rotate-180' : ''" />
    </button>

    <!-- 下拉面板（默认向下展开；宽度跟随触发按钮） -->
    <Transition :name="align === 'up' ? 'td-pop-up' : 'td-pop'">
      <div
        v-if="open"
        class="absolute z-50 w-full min-w-[8rem] max-h-64 overflow-y-auto custom-scrollbar rounded-xl border shadow-xl backdrop-blur-md"
        :class="[
          align === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          panelClass,
          isDarkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'
        ]"
      >
        <!-- 自定义选项内容（插槽） -->
        <template v-if="$slots.option">
          <div
            v-for="opt in options"
            :key="opt.value"
            @click="toggle(opt.value)"
            class="w-full text-left px-3 py-2 cursor-pointer transition-colors"
            :class="[
              selectedSet.has(opt.value)
                ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white')
                : (isDarkMode ? 'text-gray-200 hover:bg-gray-700/60' : 'text-gray-800 hover:bg-indigo-50')
            ]"
          >
            <slot name="option" :opt="opt" :selected="selectedSet.has(opt.value)" />
          </div>
        </template>

        <!-- 默认选项内容：固定行高，选中/悬停不改变行高 -->
        <template v-else>
          <label
            v-for="opt in options"
            :key="opt.value"
            @click.prevent="toggle(opt.value)"
            class="flex items-center gap-2 min-h-10 px-3 py-1.5 cursor-pointer transition-colors leading-none"
            :class="[
              selectedSet.has(opt.value) && !multi
                ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white')
                : (isDarkMode ? 'text-gray-200 hover:bg-gray-700/60' : 'text-gray-800 hover:bg-indigo-50')
            ]"
          >
            <input
              v-if="multi"
              type="checkbox"
              :checked="selectedSet.has(opt.value)"
              class="accent-indigo-500 shrink-0 pointer-events-none"
            />
            <span class="flex-1 min-w-0 leading-none overflow-hidden">
              <!-- block + max-w-full，确保超长 label 在此容器内截断省略，不超出选择框 -->
              <span class="block w-full max-w-full truncate align-middle">{{ opt.label }}</span>
              <span v-if="opt.desc" class="block text-[11px] leading-tight opacity-75 mt-0.5">{{ opt.desc }}</span>
            </span>
            <CheckIcon v-if="!multi && selectedSet.has(opt.value)" class="w-4 h-4 shrink-0" />
          </label>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 展开动画（向下/向上） */
.td-pop-enter-active,
.td-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.td-pop-enter-from,
.td-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
.td-pop-up-enter-active,
.td-pop-up-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.td-pop-up-enter-from,
.td-pop-up-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
</style>
