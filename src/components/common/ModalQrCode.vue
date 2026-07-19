<template>
  <div class="self-start flex flex-col items-center flex-shrink-0 pt-7">
    <div class="bg-white p-2 rounded-xl shadow-sm border" :class="borderClass">
      <QRCode :value="value" :size="104" level="M" />
    </div>
    <p class="text-xs mt-2" :class="captionClass">{{ caption }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import QRCode from 'qrcode.vue'

withDefaults(defineProps<{
  value: string
  caption?: string
}>(), {
  caption: ''
})

const isDarkMode = inject('isDarkMode')
const borderClass = computed(() => isDarkMode ? 'border-gray-700' : 'border-gray-200')
const captionClass = computed(() => isDarkMode ? 'text-gray-600' : 'text-gray-400')
</script>
