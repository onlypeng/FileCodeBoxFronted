<script setup lang="ts">
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
