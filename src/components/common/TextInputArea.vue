<template>
  <div class="flex flex-col">
    <textarea
      :value="modelValue"
      @input="updateValue"
      :rows="rows"
      :maxlength="maxlength"
      :placeholder="placeholderText"
      :class="[
        'flex-grow px-4 py-3 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 transition duration-300 resize-none custom-scrollbar',
        isDarkMode
          ? 'bg-gray-800 bg-opacity-50 text-white'
          : 'bg-white text-gray-900 border border-gray-300',
        countPercent >= 90 ? 'focus:ring-red-500' : 'focus:ring-indigo-500'
      ]"
    ></textarea>
    <div class="flex items-center justify-end mt-1.5 text-xs" :class="[countTextClass]">
      <span v-if="modelValue.length > 0">
        {{ modelValue.length.toLocaleString() }} / {{ maxlength.toLocaleString() }}
      </span>
      <span v-else>{{ t('send.textCountHint', { max: maxlength.toLocaleString() }) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  modelValue: string
  rows?: number
  placeholder?: string
  maxlength?: number
}

interface Emits {
  'update:modelValue': [value: string]
}

const props = withDefaults(defineProps<Props>(), {
  rows: 7,
  placeholder: '在此输入要发送的文本...',
  maxlength: 200000
})

const emit = defineEmits<Emits>()
const isDarkMode = inject('isDarkMode')

const placeholderText = computed(() => props.placeholder || t('send.uploadArea.textInput'))

const countPercent = computed(() => {
  if (props.maxlength === 0) return 0
  return (props.modelValue.length / props.maxlength) * 100
})

const countTextClass = computed(() => {
  const p = countPercent.value
  if (p >= 95) return 'text-red-500 font-semibold'
  if (p >= 80) return 'text-yellow-500 font-medium'
  if (isDarkMode.value) return 'text-gray-400'
  return 'text-gray-500'
})

const updateValue = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.3) rgba(243, 244, 246, 0.5);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.5);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
  transition: background-color 0.3s;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

:deep([class*='dark']) .custom-scrollbar {
  scrollbar-color: rgba(75, 85, 99, 0.5) rgba(31, 41, 55, 0.5);
}

:deep([class*='dark']) .custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.5);
}

:deep([class*='dark']) .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

:deep([class*='dark']) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.7);
}
</style>
