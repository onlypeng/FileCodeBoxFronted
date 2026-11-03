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
/**
 * 取件码/访问口令输入弹窗（纯受控组件）。
 *
 * ## 为什么是全受控的
 * visible / loading / error 全部由父级通过 props 驱动：一次口令提交涉及"校验 →
 * 请求后端 → 失败重试"的完整链路，状态属于取件流程（useRetrieveFlow），
 * 组件自己缓存一份会导致两边状态不一致（例如请求失败后组件仍显示 loading）。
 * 因此这里只负责收集输入，并把 submit 事件交给上层决定要不要真的发请求。
 *
 * ## 边界条件
 * - props.loading 为 true 时提交直接 return：后端可能在重试取件，重复提交同一个
 *   错误口令有可能触发失败计数，必须由上层串行化。
 * - error 由父级传入而非本地校验：口令是否合法只有后端知道。
 *
 * ## 刻意不做
 * 不做本地格式校验（长度/字符），避免出现"前端说格式不对、后端其实接受"的割裂。
 */
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
