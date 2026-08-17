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
import { computed, inject } from 'vue'
import BaseModal from './BaseModal.vue'
import { useConfirmStore } from '@/stores/confirmStore'

const isDarkMode = inject('isDarkMode')
const confirmStore = useConfirmStore()
const pending = computed(() => confirmStore.pending)
</script>
