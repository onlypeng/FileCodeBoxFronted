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
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" :class="[collection ? (isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50') : (isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50')]">
              <InboxIcon v-if="collection" class="w-5 h-5" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']" />
              <FileIcon v-else class="w-5 h-5" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']" />
            </div>
            <div class="min-w-0">
              <h3 class="text-base font-semibold truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ headerTitle }}</h3>
              <p class="text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ headerSubtitle }}</p>
            </div>
          </div>
          <button @click="$emit('close')" class="p-1.5 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400']"><XIcon class="w-5 h-5" /></button>
        </div>

        <!-- 过期警告（按次分享次数用尽显示"次数已用完"，其余显示"已过期"） -->
        <div v-if="!collection && isExpired" class="mx-5 mt-3 mb-0 flex items-center gap-2 px-4 py-2.5 rounded-lg" :class="[isDarkMode ? 'bg-red-900/30 border border-red-800/50' : 'bg-red-50 border border-red-200']">
          <AlertTriangleIcon class="w-4 h-4 shrink-0" :class="[isDarkMode ? 'text-red-400' : 'text-red-500']" />
          <span class="text-sm font-medium" :class="[isDarkMode ? 'text-red-300' : 'text-red-700']">{{ expiredText }}</span>
        </div>

        <!-- 内容 -->
        <div class="px-5 pb-5">
          <!-- ========== 收件箱模式 ========== -->
          <template v-if="collection">
            <div class="space-y-3">
              <CodeCard
                :label="t('retrieve.codeInput.label')"
                :code="code"
                :qr-value="collectionRetrieveQrValue"
                :hint="t('retrieve.scanToRetrieve')"
                :copy-link-text="t('retrieve.clickCopyRetrieveLink')"
                :copy-link-url="collectionRetrieveQrValue"
                accent="emerald"
              >
                <template #extra>
                  <p v-if="collection.retrieveExpire" class="text-xs mt-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ t('retrieve.expireAt') }}：{{ collection.retrieveExpire }}
                  </p>
                </template>
              </CodeCard>
              <CodeCard
                v-if="collection.deliveryCode"
                :label="t('retrieve.deliveryCode')"
                :code="collection.deliveryCode"
                :qr-value="collectionDeliveryQrValue"
                :hint="t('retrieve.scanToDeliver')"
                :copy-link-text="t('retrieve.clickCopyDeliveryLink')"
                :copy-link-url="collectionDeliveryQrValue"
                accent="amber"
              >
                <template #extra>
                  <p v-if="collection.deliveryExpire" class="text-xs mt-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ t('retrieve.expireAt') }}：{{ collection.deliveryExpire }}
                  </p>
                </template>
              </CodeCard>
              <!-- 管理码卡片：收件人/创建者视角展示（记录-收件箱-查看），仅取件人视角不展示 -->
              <CodeCard
                v-if="collection.collectionCode && collection.collectionCode !== code"
                :label="t('collection.create.collectionCodeLabel')"
                :code="collection.collectionCode"
                :qr-value="collectionManageQrValue"
                :hint="t('collection.create.scanToManage')"
                :copy-link-text="t('collection.create.copyCollectionLink')"
                :copy-link-url="collectionManageQrValue"
                accent="indigo"
              >
                <template #extra>
                  <p v-if="collection.collectionExpire" class="text-xs mt-1.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    {{ t('retrieve.expireAt') }}：{{ collection.collectionExpire }}
                  </p>
                </template>
              </CodeCard>
              <!-- 收件箱文件列表 -->
              <div>
                <!-- 取件时间 + 文件汇总 -->
                <div class="flex items-center justify-between gap-3 text-xs mb-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  <span>{{ t('retrieve.retrieveTime') }}：{{ retrieveAt }}</span>
                  <span>{{ collection.files.length }}{{ t('retrieve.multiFile.fileCount') }} · {{ collectionTotalSize }}</span>
                </div>
                <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.collectionFiles.title') }}</p>
                <div v-if="collection.files.length > 0" class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  <div v-for="item in collection.files" :key="item.id" class="flex items-center px-3 py-2 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50']">
                    <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ item.file_name }}</p>
                      <p class="text-xs" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">{{ formatFileSize(item.file_size) }}<span v-if="item.uploader_name"> · {{ item.uploader_name }}</span></p>
                    </div>
                    <button v-if="showDownloads" @click="$emit('download-collection-item', item.id)" class="ml-2 p-1 rounded-md transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-emerald-400 hover:bg-gray-800' : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-100']"><DownloadIcon class="w-4 h-4" /></button>
                  </div>
                </div>
                <div v-else class="text-center py-4" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']"><p class="text-sm">{{ t('collection.retrieve.noFiles') }}</p></div>
              </div>
            </div>
          </template>

          <!-- ========== 常规模式（文件/多文件/文本） ========== -->
          <template v-else>
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
                    <div v-if="createdDate" class="flex items-baseline gap-2.5">
                      <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.createdAt') }}</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ createdDate }}</span>
                    </div>
                    <div v-if="showRetrieveTime" class="flex items-baseline gap-2.5">
                      <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.retrieveTime') }}</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ date }}</span>
                    </div>
                    <div v-if="expireText" class="flex items-baseline gap-2.5">
                      <span class="text-sm shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.expireAt') }}</span><span class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ expireText }}</span>
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

            <!-- 文件备注 -->
            <div v-if="remark" class="mt-3 rounded-xl px-4 py-3" :class="[isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50']">
              <div class="flex items-center justify-between mb-1.5">
                <p class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.remark') }}</p>
                <button @click="copyRemark" class="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-700/50' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100']">
                  <CopyIcon class="w-3.5 h-3.5" />
                  {{ t('retrieve.copyRemark') }}
                </button>
              </div>
              <div class="whitespace-pre-wrap break-words text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ remark }}</div>
            </div>

            <div class="mt-3">
              <!-- 纯文本模式下不显示"文件列表"标题 -->
              <div v-if="!textMode" class="flex items-center justify-between mb-2">
                <p class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.multiFile.listTitle') }}</p>
                <div v-if="showDownloads" class="flex items-center gap-1.5 flex-shrink-0">
                  <!-- wget 打包下载链接复制（图标 + 文字） -->
                  <button @click="copyWgetZip" class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100']">
                    <TerminalIcon class="w-3.5 h-3.5" />
                    <span>{{ t('retrieve.wgetCopy') }}</span>
                  </button>
                  <!-- 打包下载按钮（文本模式不可打包，隐藏；单文件也打包） -->
                  <button v-if="!textMode" @click="$emit('download-zip')" class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                    <DownloadIcon class="w-3.5 h-3.5" />
                    {{ t('retrieve.multiFile.downloadAll') }}
                  </button>
                </div>
              </div>
              <!-- 文本模式：展示正文 + 复制文本 + 预览 -->
              <div v-if="textMode" class="mt-3">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.textMode.title') }}</p>
                  <div class="flex items-center gap-1.5">
                    <button v-if="showPreview" @click="$emit('preview-content')" class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100']">
                      <EyeIcon class="w-3.5 h-3.5" />
                      {{ t('retrieve.textMode.preview') }}
                    </button>
                    <button @click="copyTextContent" class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                      <CopyIcon class="w-3.5 h-3.5" />
                      {{ t('retrieve.textMode.copyText') }}
                    </button>
                  </div>
                </div>
                <div class="rounded-xl p-3 max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap break-words text-sm" :class="[isDarkMode ? 'bg-gray-800/60 text-gray-300' : 'bg-gray-100/80 text-gray-700']">{{ text }}</div>
              </div>
              <!-- 文件列表 -->
              <div v-else class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                <div v-for="item in files" :key="item.id" class="flex items-center px-3 py-2 rounded-lg transition-colors" :class="[isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50']">
                  <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ item.file_name }}</p>
                    <p class="text-xs" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']">{{ item.sizeText || formatFileSize(item.file_size) }}</p>
                  </div>
                  <!-- 单文件 wget 命令复制（在下载按钮前方） -->
                  <button v-if="showDownloads" @click="copyItemWget(item)" class="ml-2 p-1 rounded-md transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100']" :title="t('retrieve.wgetDownload')">
                    <TerminalIcon class="w-3.5 h-3.5" />
                  </button>
                  <button v-if="showDownloads" @click="$emit('download-item', item.id)" class="ml-1 p-1 rounded-md transition-colors" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100']"><DownloadIcon class="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 底部：仅收件箱模式 -->
        <div v-if="collection" class="px-5 pb-5 flex gap-3">
          <button v-if="showDownloads && collection.files.length > 0" @click="$emit('download-collection-zip')" class="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <DownloadIcon class="w-4 h-4" />
            {{ t('collection.retrieve.downloadAll') }}
          </button>
          <button @click="$emit('close')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors" :class="[isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">{{ t('common.close') }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { inject, computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode.vue'
import { FileIcon, DownloadIcon, XIcon, CopyIcon, LinkIcon, AlertTriangleIcon, TerminalIcon, EyeIcon, InboxIcon } from 'lucide-vue-next'
import CodeCard from './CodeCard.vue'
import type { MultiFileItem } from '@/types/collection'
import { isRecordExpired, formatFileSize } from '@/utils/common'
import { buildAppUrl, buildWgetCommand, buildAbsoluteUrl } from '@/utils/share-url'
import { useRetrieveCopyActions } from '@/composables'

const props = withDefaults(defineProps<{
  visible: boolean
  code: string
  files: Array<MultiFileItem & { sizeText?: string }>
  date: string
  totalSize: string
  expiredAt?: string | null
  expireStyle?: string
  expireValue?: number
  /** 单文件模式：仅显示一个文件，下载走直接下载 */
  single?: boolean
  /** 文本模式：展示文本分享正文（发件文本记录），不可打包下载 */
  text?: string | null
  /** 文件备注：展示在文件列表上方的说明文字 */
  remark?: string | null
  /** 文本模式是否显示"预览内容"入口 */
  showPreview?: boolean
  /** 收件箱模式：展示取件码（与可选投件码）及收件箱文件列表 */
  collection?: {
    title: string
    /** 管理码：收件人/创建者视角传入，展示管理卡片（取件人视角不传） */
    collectionCode?: string
    /** 投件码：取件人视角通常不传入，传入时才展示投件卡片 */
    deliveryCode?: string
    files: Array<{ id: number; file_name: string; file_size: number; uploader_name?: string }>
    /** 收件箱（管理码）过期时间文案 */
    collectionExpire?: string
    /** 投件码过期时间文案（显示在复制投件链接下方） */
    deliveryExpire?: string
    /** 取件码过期时间文案（显示在复制取件链接下方） */
    retrieveExpire?: string
  } | null
  /** 是否展示下载功能（打包下载/单文件下载/wget 命令）；发件记录查看等只读场景传 false */
  showDownloads?: boolean
  /** 创建时间（发件记录查看传：显示"创建时间"，并隐藏取件时间） */
  createdDate?: string
  /** 是否显示取件时间（取件场景默认显示；发件场景传 false） */
  showRetrieveTime?: boolean
  /** 过期时间文案（显示"过期时间"行） */
  expireText?: string
  /** 强制过期状态（后端确认过期但本地无过期时间时传入，覆盖按时间的自动判定） */
  isExpired?: boolean
}>(), { showDownloads: true, showRetrieveTime: true })
defineEmits<{
  close: []
  'download-item': [id: number]
  'download-zip': []
  'download-single': []
  'download-collection-item': [id: number]
  'download-collection-zip': []
  'preview-content': []
}>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const baseUrl = buildAppUrl()

const collection = computed(() => props.collection || null)

/** 收件箱取件时间：弹窗打开时刻（收件箱模式无 date 传入） */
const retrieveAt = ref(new Date().toLocaleString())
watch(
  () => props.visible,
  (v) => { if (v) retrieveAt.value = new Date().toLocaleString() }
)

/** 收件箱文件总大小 */
const collectionTotalSize = computed(() =>
  formatFileSize(collection.value?.files.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0)
)

const headerTitle = computed(() => {
  if (collection.value) return collection.value.title || t('retrieve.collectionFiles.title')
  return t('retrieve.multiFile.title')
})
const headerSubtitle = computed(() => {
  if (collection.value) return `${collection.value.files.length} ${t('retrieve.multiFile.fileCount')}`
  return `${textMode.value ? 1 : props.files.length} ${t('retrieve.multiFile.fileCount')}`
})

const qrValue = computed(() => props.code ? `${baseUrl}/?code=${props.code}` : '')
const collectionRetrieveQrValue = computed(() => props.code ? `${baseUrl}/collection/retrieve/${props.code}` : '')
const collectionDeliveryQrValue = computed(() => (collection.value?.deliveryCode ? `${baseUrl}/delivery/upload/${collection.value.deliveryCode}` : ''))
const collectionManageQrValue = computed(() => (collection.value?.collectionCode ? `${baseUrl}/collection/manage/${collection.value.collectionCode}` : ''))
const isExpired = computed(() => props.isExpired ?? isRecordExpired(props.expiredAt, props.expireStyle, props.expireValue))
/** 过期横幅文案：按次分享次数用尽 → "下载次数已用完"；其余 → "该取件码已过期" */
const expiredText = computed(() =>
  props.expireStyle === 'count'
    ? t('fileDetail.expiredCount') || '下载次数已用完'
    : t('fileDetail.expired') || '该取件码已过期'
)
const { copyText, fetchSelectText } = useRetrieveCopyActions()
const copyCode = async () => { await copyText(props.code) }
const copyLink = async () => { await copyText(qrValue.value, { successMsg: t('collection.create.linkCopied') }) }

/** 文本模式：正文分享记录（text 非 undefined，含 null 旧记录） */
const textMode = computed(() => props.text !== undefined)

/** wget 下载命令：文本走 select 接口，单文件与多文件统一为打包下载 ZIP */
const wgetZipCommand = computed(() => {
  if (!props.code) return ''
  if (textMode.value) {
    return `wget ${buildAbsoluteUrl(`/share/select?code=${props.code}`)} -O "text.txt"`
  }
  return `wget ${buildAbsoluteUrl(`/share/zip/${props.code}`)} -O "${props.code}.zip"`
})

const copyWgetZip = async () => {
  await copyText(wgetZipCommand.value)
}

/** 复制文本正文：有正文直接复制，旧记录（text 为空）联网获取 */
const copyTextContent = async () => {
  let content = props.text || ''
  if (!content) {
    content = await fetchSelectText(props.code)
  }
  await copyText(content)
}

/** 一键复制文件备注 */
const copyRemark = async () => {
  await copyText(props.remark || '')
}

/** 单文件 wget 命令：多文件为 item 下载，单文件为直接下载 */
const copyItemWget = async (item: MultiFileItem & { sizeText?: string }) => {
  const command = props.single
    ? buildWgetCommand(props.code, item.file_name)
    : `wget ${buildAbsoluteUrl(`/share/download/item/${item.id}?code=${props.code}`)} -O "${item.file_name}"`
  await copyText(command)
}
</script>

<style scoped>
.custom-scrollbar { scrollbar-width: thin; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
