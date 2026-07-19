<template>
  <RecordModalShell
    :visible="!!record"
    :title="record?.title || t('collection.manage.untitled')"
    :subtitle="t('records.badge.collection')"
    :icon="InboxIcon"
    icon-tone="indigo"
    size="lg"
    @close="$emit('close')"
  >
    <!-- 内容 -->
    <div class="px-5 pb-4">
      <div class="rounded-xl p-5" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
        <div class="flex gap-5">
          <!-- 左侧：投件码 + 管理码 + 信息 -->
          <div class="min-w-0 flex-1 space-y-4">
            <!-- 投件码 -->
            <div>
              <p class="text-xs mb-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('collection.manage.deliveryCodeLabel') }}</p>
              <div class="flex items-center gap-2">
                <p class="text-lg font-mono font-bold tracking-wider" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']">{{ record?.deliveryCode }}</p>
                <button @click="copyCode(record!.deliveryCode)" class="p-1 rounded transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-amber-400' : 'text-gray-400 hover:text-amber-600']"><CopyIcon class="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <!-- 管理码 -->
            <div>
              <p class="text-xs mb-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.adminCode') }}</p>
              <div class="flex items-center gap-2">
                <p class="text-lg font-mono font-bold tracking-wider" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">{{ record?.collectionCode }}</p>
                <button @click="copyCode(record!.collectionCode)" class="p-1 rounded transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400' : 'text-gray-400 hover:text-indigo-600']"><CopyIcon class="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <!-- 信息 -->
            <div class="pt-2 border-t space-y-1.5" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
              <ModalInfoRow :label="t('retrieve.createdAt')" :value="record?.date" />
              <ModalInfoRow :label="t('admin.unifiedManage.fileCount')" :value="`${record?.maxFiles} ${t('records.multiFile')}`" />
              <ModalInfoRow :label="t('send.expiration.label')" :value="record?.expireInfo" />
            </div>
          </div>

          <!-- 右侧：取件码 + 二维码 -->
          <div class="flex-shrink-0 flex flex-col items-center pt-2">
            <p class="text-xs mb-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('collection.manage.retrieveCodeLabel') }}</p>
            <div class="flex items-center gap-2 mb-3">
              <p class="text-xl font-mono font-bold tracking-widest" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">{{ record?.retrieveCode }}</p>
              <button @click="copyCode(record!.retrieveCode)" class="p-1 rounded transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-emerald-400' : 'text-gray-400 hover:text-emerald-600']"><CopyIcon class="w-4 h-4" /></button>
            </div>
            <div class="bg-white p-2 rounded-xl shadow-sm border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
              <QRCode :value="qrValue" :size="104" level="M" />
            </div>
            <p class="text-xs mt-2" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">{{ t('retrieve.scanToRetrieve') }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button @click="$emit('go-manage', record!)" class="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700">
        <SettingsIcon class="w-4 h-4" />{{ t('collection.create.manage') }}
      </button>
      <button @click="$emit('go-retrieve', record!)" class="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700">
        <ExternalLinkIcon class="w-4 h-4" />{{ t('collection.create.retrieveHint') }}
      </button>
      <button @click="$emit('close')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" :class="[isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">{{ t('common.close') }}</button>
    </template>
  </RecordModalShell>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { InboxIcon, CopyIcon, SettingsIcon, ExternalLinkIcon } from 'lucide-vue-next'
import QRCode from 'qrcode.vue'
import RecordModalShell from './RecordModalShell.vue'
import ModalInfoRow from './ModalInfoRow.vue'
import type { CollectionRecord } from '@/types'
import { buildCollectionRetrieveUrl } from '@/utils/share-url'
import { useAlertStore } from '@/stores/alertStore'
import { copyToClipboard } from '@/utils/clipboard'

const props = defineProps<{ record: CollectionRecord | null }>()
defineEmits<{
  close: []
  'go-manage': [record: CollectionRecord]
  'go-retrieve': [record: CollectionRecord]
}>()

const { t } = useI18n()
const isDarkMode = inject('isDarkMode')
const alertStore = useAlertStore()

const qrValue = computed(() => {
  if (!props.record) return ''
  return buildCollectionRetrieveUrl(props.record.retrieveCode)
})

const copyCode = async (code: string) => {
  await copyToClipboard(code, {
    successMsg: t('retrieve.copySuccess'),
    errorMsg: t('retrieve.copySuccess'),
    notify: (m) => alertStore.showAlert(m, 'success')
  })
}
</script>
