<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, unref, type Ref } from 'vue'
import { CheckIcon, MonitorIcon, PaletteIcon } from 'lucide-vue-next'
import { THEME_MODES } from '@/constants'
import type { ThemeDefinition, ThemeId } from '@/theme'

// 注入值可能是 ref（提供方）也可能是普通值，统一在 setup 中捕获后解包
const injectedIsDarkMode = inject<Ref<boolean> | boolean>('isDarkMode', false)
const injectedThemeId = inject<Ref<ThemeId> | ThemeId>('themeId', 'light')
const injectedThemeMode = inject<Ref<string> | string>('themeMode', 'system')
const themes = inject('themes') as ThemeDefinition[]
const setTheme = inject('setTheme') as (id: ThemeId) => void
const setThemeMode = inject('setThemeMode') as (mode: string) => void

const isDarkMode = computed(() => Boolean(unref(injectedIsDarkMode)))
const themeId = computed(() => unref(injectedThemeId) ?? 'light')
const themeMode = computed(() => unref(injectedThemeMode) ?? 'system')

const open = ref(false)
const panelRef = ref<HTMLElement | null>(null)

const pickTheme = (id: ThemeId) => {
  setTheme(id)
  open.value = false
}

const pickSystem = () => {
  setThemeMode(THEME_MODES.SYSTEM)
  open.value = false
}

const onDocumentClick = (event: MouseEvent) => {
  if (panelRef.value && !panelRef.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="panelRef" class="relative">
    <button
      @click="open = !open"
      aria-label="切换主题"
      class="p-2 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      :class="isDarkMode ? 'bg-gray-800 text-yellow-300' : 'bg-white text-gray-800'"
    >
      <PaletteIcon class="w-6 h-6" />
    </button>

    <transition name="theme-pop">
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-60 rounded-xl shadow-lg border py-2 z-50"
        :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']"
      >
        <p
          class="px-4 py-1 text-xs font-medium uppercase tracking-wide"
          :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']"
        >
          {{ themeId }}
        </p>

        <button
          v-for="theme in themes"
          :key="theme.id"
          @click="pickTheme(theme.id)"
          class="w-full flex items-center justify-between px-4 py-2 text-sm transition-colors"
          :class="[
            isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          ]"
        >
          <span class="flex items-center gap-2.5">
            <span
              class="w-4 h-4 rounded-full border border-black/10"
              :style="{ backgroundColor: theme.primaryColor }"
            ></span>
            {{ theme.name }}
          </span>
          <CheckIcon v-if="themeId === theme.id" class="w-4 h-4 text-indigo-500" />
        </button>

        <div class="my-1 border-t" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']"></div>

        <button
          @click="pickSystem"
          class="w-full flex items-center justify-between px-4 py-2 text-sm transition-colors"
          :class="[
            isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          ]"
        >
          <span class="flex items-center gap-2.5">
            <MonitorIcon class="w-4 h-4" />
            跟随系统
          </span>
          <CheckIcon v-if="themeMode === 'system'" class="w-4 h-4 text-indigo-500" />
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.theme-pop-enter-active,
.theme-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.theme-pop-enter-from,
.theme-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
