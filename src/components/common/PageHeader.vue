<template>
  <div class="text-center">
    <div class="flex justify-center mb-8">
      <div
        class="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-1 animate-spin-slow"
      >
        <div class="rounded-full bg-gray-900 p-2">
          <BoxIcon class="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
    <h2
      @click="$emit('title-click')"
      class="text-3xl cursor-pointer font-extrabold text-center mb-6"
      :class="[
        isDarkMode
          ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300'
          : 'text-indigo-600'
      ]"
    >
      {{ title }}
    </h2>
  </div>
</template>

<script setup lang="ts">
/**
 * 页面标题头（Logo + 大字标题）。首页与各主要页面顶部复用。
 *
 * 标题可点击并 emit 'title-click' 是刻意的隐藏入口（回到首页/触发特定行为由调用方决定），
 * 因此这里保留了 cursor-pointer 但没有默认行为——不要给 @click 加 push('/')，
 * 那会让"管理页标题点击"也跳回首页。
 */
import { inject } from 'vue'
import { BoxIcon } from 'lucide-vue-next'

interface Props {
  title: string
}

interface Emits {
  'title-click': []
}

defineProps<Props>()
defineEmits<Emits>()

const isDarkMode = inject('isDarkMode')
</script>

<style scoped>
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}
</style>