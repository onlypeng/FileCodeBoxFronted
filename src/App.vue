<script setup lang="ts">
/**
 * 根组件外壳：主题类名、全局控件、路由转场、以及两个全局单例弹层的挂载点。
 *
 * ## 为什么业务逻辑都在 useAppShell 里
 * 本组件只做绑定，不持有状态。原因有二：一是 Reactivity 的 provide/inject 链
 * （isDarkMode / themeId / themes / isLoading ...）需要在一个稳定的地方建立，
 * 任何页面都能 inject；二是 UNAUTHORIZED 事件监听、路由 loading、后台配置同步
 * 这类副作用必须跟根组件生命周期绑定，移到这里才能保证刷新或跳转时不重复注册。
 *
 * ## 关键设计
 * - 主题靠根节点的 light/dark 类名驱动 CSS 变量，而不是给每个组件传 props，
 *   否则深层组件要逐层透传。
 * - 全局 Alert / Confirm 单例挂在这里而不是各页面各自渲染：
 *   多处同时渲染会导致弹层互相覆盖、z-index 打架。
 * - showGlobalControls 由路由 meta 决定（管理后台不需要公开页面的语言/主题切换，
 *   它自带主题入口），所以这里用 computed 读 meta，不写路由名白名单。
 *
 * ## 刻意不做
 * - 不做 <KeepAlive>：直连房间、发送/记录列表都持有实时连接或计时器，
 *   缓存实例会让已断开的连接"看起来还在"。
 */
import { RouterView } from 'vue-router'
import ThemeToggle from './components/common/ThemeToggle.vue'
import LanguageSwitcher from './components/common/LanguageSwitcher.vue'
import AlertComponent from '@/components/common/AlertComponent.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAppShell } from '@/composables'

const { isDarkMode, isLoading, route, showGlobalControls } = useAppShell()
</script>

<template>
  <div :class="['app-container', isDarkMode ? 'dark' : 'light']">
    <!-- 语言 / 主题切换：位于页面顶部文档流内，随页面滚动（不再固定悬浮在视口角落） -->
    <div v-if="showGlobalControls" class="flex items-center justify-end space-x-3 px-6 pt-5">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    <!-- key 用 fullPath 而非组件名：同组件不同参数（如换一个分享码）必须重建实例，
         否则组件被复用、内部 state 会残留上一个房间/上一个分享码的数据 -->
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </RouterView>

    <AlertComponent />
    <ConfirmDialog />
  </div>
</template>

<style>
.app-container {
  min-height: 100vh;
  width: 100%;
  background: var(--app-bg);
  transition: background 0.5s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #fff;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
