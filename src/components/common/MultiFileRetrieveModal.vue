<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto"
      @click.self="$emit('close')"
    >
      <div class="w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" :class="[isDarkMode ? 'bg-gray-900' : 'bg-white']">
        <!-- 头部 -->
        <div class="px-5 pt-4 pb-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center" :class="[isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50']"><FilesIcon class="w-5 h-5" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']" /></div>
            <div>
              <h3 class="text-base font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ t('retrieve.multiFile.title') }}</h3>
              <p class="text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ files.length }} {{ t('retrieve.multiFile.fileCount') }}</p>
            </div>
          </div>
          <button @click="$emit('close')" class="p-1.5 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400']"><XIcon class="w-5 h-5" /></button>
        </div>

        <!-- 过期警告 -->
        <div v-if="isExpired" class="mx-5 mt-3 mb-0 flex items-center gap-2 px-4 py-2.5 rounded-lg" :class="[isDarkMode ? 'bg-red-900/30 border border-red-800/50' : 'bg-red-50 border border-red-200']">
          <AlertTriangleIcon class="w-4 h-4 shrink-0" :class="[isDarkMode ? 'text-red-400' : 'text-red-500']" />
          <span class="text-sm font-medium" :class="[isDarkMode ? 'text-red-300' : 'text-red-700']">{{ t('fileDetail.expired') }}</span>
        </div>

        <!-- 内容 -->
        <div class="px-5 pb-4">
          <div class="rounded-xl p-5" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
            <div class="flex gap-5">
              <div class="min-w-0 flex-1">
                <p class="text-sm mb-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.codeInput.label') }}</p>
                <div class="flex items-center gap-2 mb-4">
                  <p class="text-2xl font-mono font-bold tracking-widest" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">{{ code }}</p>
                  <button @click="copyCode" class="p-1 rounded transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400' : 'text-gray-400 hover:text-indigo-600']"><CopyIcon class="w-4 h-4" /></button>
                </div>
                <button @click="copyLink" class="flex items-center gap-1 text-xs mb-3 transition-colors" :class="[isDarkMode ? 'text-indigo-400/70 hover:text-indigo-300' : 'text-indigo-500/80 hover:text-indigo-600']"><LinkIcon class="w-3.5 h-3.5" />{{ t('fileRecord.copyLink') }}</button>
                <div class="space-y-2">
                  <div class="flex items-baseline gap-2.5">
                    <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.createdAt') }}</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ date }}</span>
                  </div>
                  <div class="flex items-baseline gap-2.5">
                    <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">取件时间</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ date }}</span>
                  </div>
                  <div class="flex items-baseline gap-2.5">
                    <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.fileSize') }}</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ totalSize }}</span>
                  </div>
                </div>
              </div>
              <div class="self-start flex flex-col items-center flex-shrink-0 pt-7">
                <div class="bg-white p-2 rounded-xl shadow-sm border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']"><QRCode :value="qrValue" :size="104" level="M" /></div>
                <p class="text-xs mt-2" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">{{ t('retrieve.scanToRetrieve') }}</p>
              </div>
            </div>
          </div>

          <div class="mt-3">
            <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.multiFile.title') }}</p>
            <div class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              <div v-for="item in files" :key="item.id" class="flex items-center px-3 py-2 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50']">
                <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ item.file_name }}</p>
                  <p class="text-xs" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">{{ formatFileSize(item.file_size) }}</p>
                </div>
                <button @click="$emit('download-item', item.id)" class="ml-2 p-1 rounded-md transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100']"><DownloadIcon class="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>

        <div class="px-5 pb-5 flex gap-3">
          <button @click="$emit('download-zip')" class="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"><DownloadIcon class="w-4 h-4" />{{ t('retrieve.multiFile.downloadAll') }}</button>
          <button @click="$emit('close')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" :class="[isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">{{ t('common.close') }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode.vue'
import { FilesIcon, FileIcon, DownloadIcon, XIcon, CopyIcon, LinkIcon, AlertTriangleIcon } from 'lucide-vue-next'
import type { MultiFileItem } from '@/types/collection'
import { useAlertStore } from '@/stores/alertStore'
import { isRecordExpired } from '@/utils/common'

const props = defineProps<{ visible: boolean; code: string; files: MultiFileItem[]; date: string; totalSize: string; expiredAt?: string | null; expireStyle?: string; expireValue?: number }>()
defineEmits<{ close: []; 'download-item': [id: number]; 'download-zip': [] }>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const alertStore = useAlertStore()
const baseUrl = window.location.origin + '/#'
const qrValue = computed(() => props.code ? `${baseUrl}/?code=${props.code}` : '')
const isExpired = computed(() => isRecordExpired(props.expiredAt, props.expireStyle, props.expireValue))
const copyCode = async () => { try { await navigator.clipboard.writeText(props.code); alertStore.showAlert(t('retrieve.copySuccess'), 'success') } catch {} }
const copyLink = async () => { try { await navigator.clipboard.writeText(qrValue.value); alertStore.showAlert('链接已复制', 'success') } catch {} }
const formatFileSize = (bytes: number) => { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i] }
</script>

<style scoped>
.custom-scrollbar { scrollbar-width: thin; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
