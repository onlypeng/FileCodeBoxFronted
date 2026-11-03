<template>
  <transition name="drawer">
    <div
      v-if="visible"
      class="fixed inset-y-0 right-0 w-full sm:w-120 bg-opacity-70 backdrop-filter backdrop-blur-xl shadow-2xl z-50 overflow-hidden flex flex-col"
      :class="[isDarkMode ? 'bg-gray-900' : 'bg-white']"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="flex justify-between items-center p-6 border-b"
        :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']"
      >
        <h3 class="text-2xl font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-800']">
          {{ title }}
        </h3>
        <button
          @click="$emit('close')"
          class="hover:text-white transition duration-300"
          :class="[isDarkMode ? 'text-gray-400' : 'text-gray-800']"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </div>
      <slot></slot>
    </div>
  </transition>
</template>

<script setup lang="ts">
/**
 * 右侧滑出抽屉容器（历史组件，现主要给记录列表类内容使用）。
 *
 * 只管"出现/消失 + 标题栏 + 默认插槽"，不做遮罩、不做 Esc 关闭、不做焦点管理：
 * 抽屉用于**非模态**地查看自己的记录，用户仍需能点到背后的页面。
 * 这也是它不复用 BaseModal 的原因——两者的交互契约不同（模态 vs 非模态）。
 *
 * 宽度用自定义 w-120（30rem）而不是 Tailwind 默认档位：内容里要放下文件名 +
 * 操作按钮组，更窄会挤压到截断。
 */
import { inject } from 'vue'
import { XIcon } from 'lucide-vue-next'

interface Props {
  visible: boolean
  title: string
}

interface Emits {
  close: []
}

defineProps<Props>()
defineEmits<Emits>()
const isDarkMode = inject('isDarkMode')
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

@media (min-width: 640px) {
  .sm\:w-120 {
    width: 30rem;
    /* 480px */
  }
}
</style>