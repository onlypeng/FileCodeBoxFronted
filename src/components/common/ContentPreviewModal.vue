<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
      @click.self="$emit('close')"
    >
      <div
        class="p-6 rounded-2xl max-w-3xl w-full mx-4 shadow-2xl transform transition-all duration-300 ease-out backdrop-filter backdrop-blur-lg bg-opacity-70 max-h-[85vh] overflow-hidden flex flex-col"
        :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']"
      >
        <div class="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 class="text-2xl font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-800']">
            {{ t('contentPreview.title') }}
          </h3>
          <div class="flex items-center gap-3">
            <button
              @click="$emit('copy-content')"
              class="px-4 py-1.5 rounded-lg transition duration-300 flex items-center gap-2 text-sm font-medium"
              :class="[
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
              ]"
            >
              <CopyIcon class="w-4 h-4" />
              {{ t('common.copy') }}
            </button>
            <button
              @click="$emit('close')"
              class="p-1.5 rounded-lg transition duration-300 hover:bg-opacity-10"
              :class="[
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-black'
              ]"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div
            class="prose max-w-none p-6 rounded-xl break-words overflow-wrap-anywhere"
            :class="[isDarkMode ? 'prose-invert bg-gray-900 bg-opacity-50' : 'bg-gray-50']"
            v-html="renderedContent"
          ></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
/**
 * 文本内容预览弹窗（取到的文件是文本时展示渲染后的 HTML）。
 *
 * ## 重要前提：传入的 renderedContent 必须已经清洗过
 * 本组件直接 v-html 渲染，**不做**任何转义或消毒——调用约定是上游
 * （utils/content-preview.ts 的 marked + DOMPurify）产出安全 HTML。
 * 如果将来有调用点传入原始文件字符串，这里就是 XSS 入口，务必走同一个渲染入口。
 *
 * ## 为什么 z-[60]
 * 预览常常是叠在另一个弹窗之上打开的（例如先开取件详情、再点预览），
 * 而 BaseModal 统一用 z-50。这里写死高一层是权宜之计：没有全局层级常量，
 * 改动时请确认不会与其它浮层打架。
 *
 * ## 刻意不做
 * - 不在组件内实现复制：剪贴板 helper 按架构约定只应由 composable 调用，
 *   所以这里是 emit('copy-content') 让上层处理。
 * - 不做 Markdown 渲染 / 主题切换逻辑，两者分别属于 utils 与根组件。
 */
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { CopyIcon, XIcon } from 'lucide-vue-next'

interface Props {
  visible: boolean
  renderedContent: string
}

interface Emits {
  close: []
  'copy-content': []
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
const isDarkMode = inject('isDarkMode')
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 自定义滚动条样式 */
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

/* 深色模式下的滚动条样式 */
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

/* 确保滚动容器有背景色 */
.custom-scrollbar {
  background: inherit;
}

/* 文本换行相关样式 */
.break-words {
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.overflow-wrap-anywhere {
  overflow-wrap: anywhere;
}

/* 添加 Markdown 样式 */
:deep(.prose) {
  text-align: left;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

:deep(.prose h1),
:deep(.prose h2),
:deep(.prose h3),
:deep(.prose h4),
:deep(.prose h5),
:deep(.prose h6) {
  color: rgb(79, 70, 229);
  /* text-indigo-600 */
  word-wrap: break-word;
  overflow-wrap: break-word;
}

:deep(.prose p),
:deep(.prose div),
:deep(.prose span),
:deep(.prose code),
:deep(.prose pre) {
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

:deep(.prose pre) {
  white-space: pre-wrap;
  overflow-x: auto;
}

:deep(.prose code) {
  white-space: pre-wrap;
}

@media (prefers-color-scheme: dark) {
  :deep(.prose h1),
  :deep(.prose h2),
  :deep(.prose h3),
  :deep(.prose h4),
  :deep(.prose h5),
  :deep(.prose h6) {
    color: rgb(129, 140, 248);
    /* text-indigo-400 */
  }
}
</style>