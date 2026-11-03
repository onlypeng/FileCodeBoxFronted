<template>
  <BaseModal
    :show="!!pending"
    :title="pending?.title"
    size="sm"
    :closable="false"
    :close-on-backdrop="false"
  >
    <p class="text-sm leading-relaxed break-words whitespace-pre-wrap" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
      {{ pending?.message }}
    </p>
    <template #footer>
      <button
        type="button"
        class="btn-secondary"
        :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
        @click="confirmStore.resolve(false)"
      >
        {{ pending?.cancelText || '取消' }}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
        :class="[isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600']"
        @click="confirmStore.resolve(true)"
      >
        {{ pending?.confirmText || '确定' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
/**
 * 全局确认弹窗，在 App.vue 里挂载一次，通过 confirmStore 的 Promise 化 ask() 驱动。
 *
 * ## 为什么用 store + Promise 而不是 emits
 * 确认框常常来自深层组件或 composable（如删除文件、清空房间），逐级 emit 会让
 * 调用链上每个组件都多一对 props/emits。store 里保存 resolve，让调用方可以
 * `const ok = await confirm(...)` 取回布尔值。
 *
 * ## 取舍
 * closable / closeOnBackdrop 都传 false：点错消失会被当成"取消"，
 * 而这里承载的是破坏性操作（删除），宁可让用户明确点按钮。
 * 代价是无法用 Esc 关闭——刻意保留，理由同上。
 */
import { computed, inject } from 'vue'
import BaseModal from './BaseModal.vue'
import { useConfirmStore } from '@/stores/confirmStore'

const isDarkMode = inject('isDarkMode')
const confirmStore = useConfirmStore()
const pending = computed(() => confirmStore.pending)
</script>
