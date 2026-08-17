<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div
      class="rounded-3xl shadow-2xl overflow-hidden border w-full max-w-xl transition-colors duration-300"
      :class="[
        isDarkMode
          ? 'bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border-gray-700'
          : 'bg-white border-gray-200'
      ]"
    >
      <div class="p-8">
        <!-- 返回首页 -->
        <button
          type="button"
          @click="toRetrieve"
          class="flex items-center gap-1.5 text-sm font-medium transition-colors duration-300"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600']"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          {{ t('send.backToRetrieve') }}
        </button>

        <PageHeader :title="config.name" @title-click="toRetrieve" />
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 文件 + 备注 统一发送区：宽屏并排，避免页面过于细长 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FileUploadArea
              compact
              :selected-file="selectedFile"
              :selected-files="selectedFiles"
              :progress="uploadProgress"
              :description="uploadDescription"
              @file-selected="handleFileSelected"
              @files-selected="handleFilesSelected"
              @file-drop="handleFileDrop"
              @paste="handlePaste"
              @file-remove="removeFile"
            />
            <div class="flex flex-col">
              <label class="text-sm font-medium mb-1.5" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('send.remark.label') }}
              </label>
              <TextInputArea
                v-model="textContent"
                :rows="7"
                :maxlength="config.maxTextLength || 200000"
                :placeholder="t('send.remark.placeholder')"
              />
              <p class="text-xs mt-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('send.remark.hint') }}
              </p>
            </div>
          </div>
          <ExpirationSelector
            v-model:expiration-method="expirationMethod"
            v-model:expiration-value="expirationValue"
            :options="expirationOptions"
          />
          <!-- 提交按钮 -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="btn-primary-lg w-full relative overflow-hidden group disabled:hover:scale-100"
          >
            <span
              class="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            ></span>
            <span class="relative z-10 flex items-center justify-center text-lg">
              <svg
                v-if="isSubmitting"
                class="w-6 h-6 mr-2 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <SendIcon v-else class="w-6 h-6 mr-2" />
              <span>{{ isSubmitting ? t('send.submitting') : t('send.submit') }}</span>
            </span>
          </button>
        </form>
      </div>

      <div
        class="px-8 py-4 bg-opacity-50 flex justify-between items-center"
        :class="[isDarkMode ? 'bg-gray-800' : 'bg-gray-100']"
      >
        <span
          class="text-sm flex items-center"
          :class="[isDarkMode ? 'text-gray-300' : 'text-gray-800']"
        >
          <ShieldCheckIcon class="w-4 h-4 mr-1 text-green-400" />
          {{ t('send.secureEncryption') }}
        </span>
        <button
          @click="toggleDrawer"
          class="text-sm hover:text-indigo-300 transition duration-300 flex items-center"
          :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']"
        >
          {{ t('send.sendRecords') }}
          <ClipboardListIcon class="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>

    <SideDrawer :visible="showDrawer" :title="t('send.sendRecords')" @close="toggleDrawer">
      <SentRecordList
        :records="sendRecords"
        @copy-link="copySentRecordLink"
        @view-details="viewDetails"
        @delete-record="deleteRecord"
      />
    </SideDrawer>

    <SuccessModal
      :visible="!!selectedRecord"
      :title="t('send.fileDetails')"
      :subtitle="selectedRecord?.filename"
      :codes="sendSuccessCodes"
      :wget-command="sendSuccessWget"
      :files="sendSuccessFiles"
      @close="closeDetails"
    />

    <!-- 文件/多文件/文本发件记录查看弹窗（统一使用多文件弹窗，仅查看无下载） -->
    <MultiFileRetrieveModal
      :visible="sentModal.visible"
      :code="sentModal.code"
      :files="sentModal.items"
      :date="sentModal.date"
      :total-size="sentModal.totalSize"
      :single="sentModal.single"
      :text="sentModal.text"
      :remark="sentModal.remark"
      :show-downloads="false"
      :show-retrieve-time="false"
      :created-date="sentModal.createdDate"
      :expire-text="sentModal.expireText"
      @close="closeSentModal"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  SendIcon,
  ClipboardListIcon,
  ShieldCheckIcon,
  ArrowLeftIcon
} from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import FileUploadArea from '@/components/common/FileUploadArea.vue'
import ExpirationSelector from '@/components/common/ExpirationSelector.vue'
import TextInputArea from '@/components/common/TextInputArea.vue'
import SideDrawer from '@/components/common/SideDrawer.vue'
import SentRecordList from '@/components/common/SentRecordList.vue'
import SuccessModal from '@/components/common/SuccessModal.vue'
import MultiFileRetrieveModal from '@/components/common/MultiFileRetrieveModal.vue'
import { useSendFlow } from '@/composables'
import { buildRetrieveUrl, buildWgetCommand } from '@/utils/share-url'
import { formatFileSize } from '@/utils/common'

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const router = useRouter()
const {
  config,
  selectedFile,
  selectedFiles,
  textContent,
  expirationMethod,
  expirationValue,
  uploadProgress,
  showDrawer,
  selectedRecord,
  isSubmitting,
  sendRecords,
  uploadDescription,
  expirationOptions,
  closeDetails,
  sentModal,
  closeSentModal,
  copySentRecordLink,
  deleteRecord,
  handleFileDrop,
  handleFileSelected,
  handleFilesSelected,
  handlePaste,
  handleSubmit,
  removeFile,
  toggleDrawer,
  viewDetails
} = useSendFlow()

// 发件成功 / 投件详情 → 统一成功弹窗
const sendSuccessCodes = computed(() => {
  const r = selectedRecord.value
  if (!r) return []
  const link = buildRetrieveUrl(r.retrieveCode)
  return [{
    label: t('retrieve.codeInput.label'),
    code: r.retrieveCode,
    qrValue: link,
    hint: t('retrieve.scanToRetrieve'),
    copyLinkText: t('collection.create.copyRetrieveLink'),
    copyLinkUrl: link
  }]
})
const sendSuccessWget = computed(() => {
  const r = selectedRecord.value
  return r ? buildWgetCommand(r.retrieveCode, r.filename) : null
})
const sendSuccessFiles = computed(() => {
  const r = selectedRecord.value
  return (r?.files || []).map((f) => ({ name: f.name, size: formatFileSize(f.size) }))
})

const toRetrieve = () => {
  router.push('/')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

select option {
  padding: 8px;
  margin: 4px;
  border-radius: 6px;
}

select option:checked {
  background: linear-gradient(to right, rgb(99 102 241 / 0.5), rgb(168 85 247 / 0.5)) !important;
  color: white !important;
}

.dark select option:checked {
  background: linear-gradient(to right, rgb(99 102 241 / 0.7), rgb(168 85 247 / 0.7)) !important;
}

select option:hover {
  background-color: rgb(99 102 241 / 0.1);
}

.dark select option:hover {
  background-color: rgb(99 102 241 / 0.2);
}

/* 自定义滚动条样式 */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.4) rgba(243, 244, 246, 0.3);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(243, 244, 246, 0.3);
  border-radius: 6px;
  margin: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.6), rgba(168, 85, 247, 0.6));
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(168, 85, 247, 0.8));
  transform: scale(1.1);
}

.custom-scrollbar::-webkit-scrollbar-corner {
  background: transparent;
}

/* 深色模式下的滚动条样式 */
.dark .custom-scrollbar {
  scrollbar-color: rgba(75, 85, 99, 0.6) rgba(31, 41, 55, 0.4);
}

.dark .custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.4);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(168, 85, 247, 0.7));
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(168, 85, 247, 0.9));
}
</style>
