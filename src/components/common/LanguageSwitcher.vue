<template>
  <div ref="switcherRef" class="relative">
    <button
      @click="toggleDropdown"
      :class="[
        'flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200',
        isDarkMode
          ? 'bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 hover:text-white'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
      ]"
    >
      <GlobeIcon class="w-4 h-4" />
      <span class="text-sm font-medium">{{ currentLanguage.name }}</span>
      <ChevronDownIcon 
        :class="[
          'w-4 h-4 transition-transform duration-200',
          { 'rotate-180': isDropdownOpen }
        ]" 
      />
    </button>
    
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isDropdownOpen"
        :class="[
          'absolute right-0 mt-2 w-32 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50',
          isDarkMode
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-white border border-gray-200'
        ]"
      >
        <div class="py-1">
          <button
            v-for="language in availableLocales"
            :key="language.code"
            @click="switchLanguage(language.code)"
            :class="[
              'w-full text-left px-4 py-2 text-sm transition-colors duration-150',
              currentLocale === language.code
                ? isDarkMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-600'
                : isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100'
            ]"
          >
            {{ language.name }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
/**
 * 语言切换下拉。出现在公开页面顶部控件区与管理后台顶栏两处。
 *
 * ## 为什么直接 import setLocale 而不是 emit
 * 切换语言是全局副作用（写 i18n locale + localStorage），没有任何"父级要先确认"的余地，
 * 让每处使用方都套一层 handler 只会多出重复代码。
 *
 * ## 点击外部关闭为什么监听 document 而不是用 mousedown + stop
 * 用 click 且不做 stop：中间层若有 @click.stop（例如文件列表容器），
 * 冒泡会被截断，下拉就关不掉了；监听 document 的冒泡阶段最稳。
 * 代价是监听一直存在——但组件在页面生命周期内常驻，成本可接受。
 */
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { GlobeIcon, ChevronDownIcon } from 'lucide-vue-next'
import { availableLocales, setLocale } from '@/i18n/index'

const { locale } = useI18n()
const isDarkMode = inject('isDarkMode')
const isDropdownOpen = ref(false)
const switcherRef = ref<HTMLElement | null>(null)

const currentLocale = computed(() => locale.value)
const currentLanguage = computed(() => {
  return availableLocales.find((lang: { code: string; name: string }) => lang.code === currentLocale.value) || availableLocales[0]
})

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const switchLanguage = (langCode: string) => {
  setLocale(langCode)
  isDropdownOpen.value = false
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as Node | null
  if (target && !switcherRef.value?.contains(target)) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
