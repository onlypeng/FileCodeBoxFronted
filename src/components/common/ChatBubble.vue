<template>
  <div class="flex" :class="item.isSelf ? 'justify-end' : 'justify-start'">
    <div class="max-w-[75%] min-w-0">
      <!-- 发送者昵称（对方消息显示） -->
      <p
        v-if="!item.isSelf"
        class="text-xs mb-1 px-1"
        :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']"
      >
        {{ item.sender }}
      </p>
      <!-- 气泡：宽度随文本自适应（受外层 75% 上限约束），高度只由文本决定 -->
      <div
        class="relative rounded-2xl px-3.5 py-2.5 shadow-sm w-fit max-w-full"
        :class="[
          item.isSelf
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md'
            : isDarkMode
              ? 'bg-gray-800 border border-gray-700 text-gray-100 rounded-bl-md'
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
        ]"
      >
        <!-- 内容 -->
        <div class="text-sm leading-relaxed break-words whitespace-pre-wrap" v-html="renderedContent"></div>
      </div>
      <!-- 时间 + 状态 + 操作（在气泡外，不占用气泡高度） -->
      <p
        class="text-[10px] mt-1 px-1 flex items-center gap-2"
        :class="[isDarkMode ? 'text-gray-600' : 'text-gray-400']"
      >
        <span v-if="item.isSelf && item.sendStatus === 'sending'">
          <ClockIcon class="w-3 h-3 inline" />
          {{ t('direct.bubble.sending') }}
        </span>
        <span v-else-if="item.isSelf && item.sendStatus === 'failed'" class="text-red-500">
          {{ t('direct.bubble.failed') }}
        </span>
        <span v-else>{{ formatTime(item.ts) }}</span>
        <button
          v-if="item.sendStatus === 'failed'"
          @click="$emit('retry', item)"
          class="flex items-center gap-1 transition-colors text-red-500 hover:text-red-600"
        >
          <RotateCcwIcon class="w-3 h-3" />
          {{ t('direct.bubble.retry') }}
        </button>
        <button
          @click="copyMessage"
          class="transition-colors"
          :class="[
            item.isSelf ? 'text-white/60 hover:text-white' : isDarkMode ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'
          ]"
        >
          {{ t('direct.bubble.copy') }}
        </button>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 直连房间的单条聊天气泡（文本消息）。
 *
 * ## 为什么偏偏这里要用 v-html
 * 消息要支持"URL 自动变可点链接"和整行代码块样式，纯文本插值做不到，只能拼片段 HTML。
 * 代价是引入了注入面：发送方是**对端浏览器**，内容完全不可信，所以走了两层处理——
 * 先 escapeHtml 抹掉标签，再交给 sanitizeSimpleHtml（content-preview 里的 DOMPurify）
 * 做二次清洗。顺序不能颠倒，也不要为了"看起来能渲染 Markdown"就去掉其中任何一层。
 *
 * ## 关键设计
 * - retry 事件 emit 给上层而不是自己重发：重发需要复用房间连接与待发队列，
 *   那是 useDirectConnection 的职责；组件只认识 DirectChatItem 这份视图模型。
 * - copy 走 useClipboard 而非直接调用剪贴板 helper：ARCHITECTURE.md 要求
 *   页面/组件不直接依赖底层工具，且复制成功与否的提示由 composable 统一处理。
 *
 * ## 刻意不做
 * - 不渲染头像/连续消息合并：房间是临时会话，消息量小，省掉这部分判断。
 * - 不做完整 Markdown：marked / DOMPurify 依赖按架构约定只允许出现在
 *   utils/content-preview.ts，这里对 ``` 与四个空格的识别只是轻量排版启发式，
 *   代码块没有语法高亮。
 */
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { sanitizeSimpleHtml } from '@/utils/content-preview'
import { ClockIcon, RotateCcwIcon } from 'lucide-vue-next'
import { useClipboard } from '@/composables'
import type { DirectChatItem } from '@/types/direct'

const props = defineProps<{
  item: DirectChatItem
}>()

defineEmits<{
  retry: [item: DirectChatItem]
}>()

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()
const { copy } = useClipboard()

/** 转义 HTML，防止 XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 渲染内容：转义 + URL 转可点击链接 + DOMPurify 二次消毒（代码块用等宽字体）
 * 注意两点：
 * 1) 顺序固定为「先转义再补链接」——反之我们自己拼的 <a> 会被转义掉，且用户输入里的
 *    尖括号会绕过正则成为真实标签；
 * 2) 链接里的 & 已被转义成 &amp;，放进 href 属性正是 HTML 要求的写法，
 *    浏览器解析时会还原成 &，不要"修正"它。
 */
const renderedContent = computed(() => {
  const lines = (props.item.content || '').split('\n')
  return lines
    .map((line) => {
      const isCodeLine = line.trimStart().startsWith('```') || line.startsWith('    ')
      const escaped = escapeHtml(line)
      const linked = escaped.replace(
        /(https?:\/\/[^\s<>"']+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2" style="color:inherit">$1</a>'
      )
      const html = isCodeLine
        ? `<span class="font-mono text-[13px] bg-black/10 dark:bg-black/30 rounded px-1">${linked}</span>`
        : linked
      return sanitizeSimpleHtml(html)
    })
    .join('\n')
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const copyMessage = async () => {
  await copy(props.item.content || '')
}
</script>
