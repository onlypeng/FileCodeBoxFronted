<script setup lang="ts">
/**
 * 强制修改默认管理员口令。
 *
 * 默认口令是公开常量（随项目分发），若长期不修改，任何知道该常量的人都能直接
 * 进入后台。登录成功或 verify 时服务端会返回 must_change_password，为 true 时
 * 弹出本弹窗，且不可关闭——后端中间件也会拦截除"改密所必需"之外的后台接口，
 * 因此这里的强制不是纯前端限制。
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfigService } from '@/services'
import { useAdminStore } from '@/stores/adminStore'
import { useAlertStore } from '@/stores/alertStore'

const { t } = useI18n()
const adminStore = useAdminStore()
const alertStore = useAlertStore()

const password = ref('')
const confirmPassword = ref('')
const isSaving = ref(false)

const submit = async () => {
  if (password.value.length < 6) {
    alertStore.showAlert(t('manage.forcePasswordChange.tooShort'), 'error')
    return
  }
  if (password.value !== confirmPassword.value) {
    alertStore.showAlert(t('manage.forcePasswordChange.mismatch'), 'error')
    return
  }
  if (password.value === 'FileCodeBox2023') {
    alertStore.showAlert(t('manage.forcePasswordChange.sameAsDefault'), 'error')
    return
  }

  isSaving.value = true
  try {
    const res = await ConfigService.updateConfig({ admin_token: password.value })
    if (res.code !== 200) {
      throw new Error(res.message || t('manage.forcePasswordChange.failed'))
    }
    adminStore.setMustChangePassword(false)
    password.value = ''
    confirmPassword.value = ''
    alertStore.showAlert(t('manage.forcePasswordChange.success'), 'success')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('manage.forcePasswordChange.failed')
    alertStore.showAlert(message, 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div
    v-if="adminStore.mustChangePassword"
    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
  >
    <div class="w-full max-w-md rounded-xl border p-6 shadow-xl bg-white border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">
        {{ t('manage.forcePasswordChange.title') }}
      </h2>
      <p class="mt-2 text-sm text-gray-600">
        {{ t('manage.forcePasswordChange.desc') }}
      </p>

      <div class="mt-4 space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1 text-gray-700">
            {{ t('manage.forcePasswordChange.newPassword') }}
          </label>
          <input
            v-model="password"
            type="password"
            minlength="6"
            autocomplete="new-password"
            class="w-full rounded-lg border px-3 py-2 text-sm outline-none border-gray-300 focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-xs font-medium mb-1 text-gray-700">
            {{ t('manage.forcePasswordChange.confirmPassword') }}
          </label>
          <input
            v-model="confirmPassword"
            type="password"
            minlength="6"
            autocomplete="new-password"
            class="w-full rounded-lg border px-3 py-2 text-sm outline-none border-gray-300 focus:border-indigo-500"
            @keyup.enter="submit"
          />
        </div>
      </div>

      <!-- 无关闭按钮：未改密前不允许继续使用后台 -->
      <button
        type="button"
        :disabled="isSaving"
        class="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        @click="submit"
      >
        {{ isSaving ? t('manage.forcePasswordChange.saving') : t('manage.forcePasswordChange.submit') }}
      </button>
    </div>
  </div>
</template>
