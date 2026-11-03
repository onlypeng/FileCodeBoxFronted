/**
 * 让任意层级的组件读到 App 外壳 provide 的暗色状态，免去逐层透传 props。
 * inject 缺省给 false 并用 unref 兼容"注入 Ref 或直接注入布尔值"两种写法——
 * 提供方的实现换过，调用方不该因此全线改代码。
 *
 * 刻意不做：不自己监听系统主题、不缓存状态，明暗的唯一来源仍是 themeStore。
 */
import { computed, inject, unref } from 'vue'
import type { Ref } from 'vue'

export function useInjectedDarkMode() {
  const injectedDarkMode = inject<Ref<boolean> | boolean>('isDarkMode', false)
  return computed(() => Boolean(unref(injectedDarkMode)))
}
