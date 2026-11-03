<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div
        v-if="show"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click="handleBackdropClick"
      >
        <!-- 背景遮罩 -->
        <div ref="backdropRef" class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        
        <!-- 模态框容器 -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            ref="modalRef"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
            aria-label="dialog"
            class="relative transform rounded-lg shadow-xl transition-all outline-none"
            :class="[
              sizeClasses,
              overflow ? '' : 'overflow-hidden',
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            ]"
            @click.stop
          >
            <!-- 头部 -->
            <div
              v-if="$slots.header || title"
              class="flex items-center justify-between px-6 py-4 border-b"
              :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200', overflow ? 'rounded-t-lg' : '']"
            >
              <slot name="header">
                <h3 class="text-lg font-medium" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ title }}
                </h3>
              </slot>
              <button
                v-if="closable"
                @click="$emit('close')"
                aria-label="close"
                class="rounded-md p-2 transition-colors"
                :class="[
                  isDarkMode
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                    : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'
                ]"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
            
            <!-- 内容 -->
            <div class="px-6 py-4">
              <slot></slot>
            </div>
            
            <!-- 底部 -->
            <div
              v-if="$slots.footer"
              class="flex items-center justify-end space-x-3 px-6 py-4 border-t"
              :class="[isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50', overflow ? 'rounded-b-lg' : '']"
            >
              <slot name="footer"></slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 通用弹窗容器：遮罩、尺寸、标题/底部插槽、Esc 关闭与焦点圈定。
 *
 * ## 为什么用 Teleport 到 body
 * 弹窗常在带 transform / overflow:hidden 的卡片内部声明，留在原地会被祖先的
 * 层叠上下文裁掉或被 z-index 压住。挂到 body 后只需要关心自身的 z-50。
 *
 * ## 关键设计
 * - keydown 监听挂在 window 而不是弹窗根节点：焦点可能已经移到弹窗外（例如 body
 *   上的倒计时），只在根节点上监听会漏掉 Esc。
 * - 打开时记录上一次焦点元素，关闭后还回去，避免键盘用户丢失位置；
 *   这一对操作与 props.show 的 watch 绑定，而不是在 <script setup> 里一次性执行。
 *
 * ## 刻意不做
 * - 不做滚动锁定（body overflow hidden）：多个弹窗叠加时需要引用计数才不会
 *   解锁过早，当前场景（拖动条 + 少量弹窗）收益不足以抵消复杂度。
 * - 不做嵌套弹窗的 Esc 分层：只响应最外层会很复杂，现状是 Esc 会关掉所有已打开的弹窗。
 */
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

interface Props {
  show: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
  closeOnBackdrop?: boolean
  /** 允许内容溢出弹窗（供内部下拉面板向下展开不被裁剪；需配合头部/底部圆角处理） */
  overflow?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnBackdrop: true,
  overflow: false
})

const emit = defineEmits<{
  close: []
}>()

const isDarkMode = inject('isDarkMode')
const modalRef = ref<HTMLElement>()
const backdropRef = ref<HTMLElement>()

// ============ 可访问性：焦点圈定 + Esc 关闭 ============
let lastFocused: HTMLElement | null = null

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(): HTMLElement[] {
  if (!modalRef.value) return []
  return Array.from(
    modalRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => el.offsetParent !== null || el === document.activeElement)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (props.closable) emit('close')
    return
  }
  if (e.key !== 'Tab') return
  const focusables = getFocusableElements()
  if (focusables.length === 0) {
    e.preventDefault()
    return
  }
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      lastFocused = document.activeElement as HTMLElement | null
      // 下一帧等待过渡与插槽渲染完成后聚焦
      requestAnimationFrame(() => modalRef.value?.focus())
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
      lastFocused?.focus?.()
      lastFocused = null
    }
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'max-w-md w-full',
    md: 'max-w-lg w-full',
    lg: 'max-w-2xl w-full',
    xl: 'max-w-4xl w-full'
  }
  return sizes[props.size]
})

const handleBackdropClick = (event: MouseEvent) => {
  if (!props.closeOnBackdrop) return
  // 注意：这里不能只判 target === currentTarget。内容区已 @click.stop，
  // 但遮罩是铺满全屏的内层 div，点击它的 target 是遮罩而非外层容器，
  // 漏掉这个分支会出现"点了遮罩不关闭"。
  // 点击外层容器本身，或覆盖全屏的背景遮罩（遮罩是内层 div，target 不会等于 currentTarget）
  const t = event.target as HTMLElement
  if (t === event.currentTarget || t === backdropRef.value) {
    emit('close')
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95) translateY(-20px);
}
</style>