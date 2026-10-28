<template>
  <BaseModal
    :show="visible"
    :title="title || t('retrieve.accessCode.dialogTitle')"
    size="sm"
    :closable="!loading"
    :close-on-backdrop="!loading"
    @close="emit('cancel')"
  >
    <p class="text-sm leading-relaxed mb-3" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
      {{ hint || t('retrieve.accessCode.dialogHint') }}
    </p>
    <form @submit.prevent="handleSubmit">
      <FormInput
        v-model="value"
        type="password"
        :maxlength="32"
        :disabled="loading"
        :error="error"
        :placeholder="t('retrieve.accessCode.placeholder')"
      />
      <!-- 隐藏的提交按钮：让回车直接提交 -->
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <button
        type="button"
        class="btn-secondary"
        :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
        :disabled="loading"
        @click="emit('cancel')"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
        :class="[isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600']"
        :disabled="loading"
        @click="handleSubmit"
      >
        {{ loading ? t('retrieve.accessCode.submitting') : t('retrieve.accessCode.submit') }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from './BaseModal.vue'
import FormInput from './FormInput.vue'

interface Props {
  visible: boolean
  loading?: boolean
  error?: string
  title?: string
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: '',
  title: '',
  hint: ''
})

const emit = defineEmits<{
  submit: [value: string]
  cancel: []
}>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const value = ref('')

// 每次打开都清空上次输入（口令错误重试时也让用户重新输）
watch(
  () => props.visible,
  (visible) => {
    if (visible) value.value = ''
  }
)

const handleSubmit = () => {
  if (props.loading) return
  emit('submit', value.value)
}
</script>
