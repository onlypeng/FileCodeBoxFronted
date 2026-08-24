<script setup lang="ts">
import { computed, inject, onMounted, ref, unref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  GlobeIcon,
  PaletteIcon,
  DatabaseIcon,
  UploadCloudIcon,
  ShieldIcon,
  HouseIcon,
  FileIcon,
  InboxIcon,
  Settings2Icon,
  PlusIcon,
  Trash2Icon
} from 'lucide-vue-next'
import SettingNumberInput from '@/components/common/SettingNumberInput.vue'
import SettingSwitch from '@/components/common/SettingSwitch.vue'
import FormInput from '@/components/common/FormInput.vue'
import ThemeDropdown from '@/components/common/ThemeDropdown.vue'
import ExpirationSelector from '@/components/common/ExpirationSelector.vue'
import { useSystemConfig } from '@/composables'
import type { ThemeDefinition, ThemeId } from '@/theme'

const isDarkMode = inject('isDarkMode')
const { t } = useI18n()

// 主题下拉框：注入主题注册表与切换方法（由 App.vue 提供）
const injectedThemeId = inject<Ref<ThemeId> | ThemeId>('themeId', 'light')
const injectedThemes = inject('themes') as ThemeDefinition[]
const setTheme = inject('setTheme') as (id: ThemeId, options?: { persist?: boolean }) => void

const {
  config,
  fileSize,
  sizeUnit,
  isLoading,
  refreshConfig,
  submitConfig,
  toggleConfigFlag,
  updateConfig
} = useSystemConfig()

/** 当前生效主题（本地优先，其次站点默认） */
const themeId = computed(() => unref(injectedThemeId) ?? 'light')

/** 过期保存时间：选项（天/小时/分钟/永久），永久=过期后不自动清理 */
const expiredRetentionOptions = computed(() => [
  { value: 'day', label: t('common.day') },
  { value: 'hour', label: t('common.hour') },
  { value: 'minute', label: t('common.minute') },
  { value: 'forever', label: t('send.expiration.units.forever') },
])
/** ExpirationSelector 双向绑定：字符串 ↔ number */
const expiredRetentionValueStr = computed({
  get: () => String(config.value.expiredRetentionValue || 1),
  set: (v: string) => { config.value.expiredRetentionValue = Math.max(1, parseInt(v) || 1) }
})

/** 中转限速对应的视频流质量建议（按各档位视频码率换算；含超清/原画） */
const relaySpeedSuggestion = computed(() => {
  const limitKb = Number(config.value.directRelaySpeedLimit) || 0
  if (limitKb <= 0) return t('manage.settings.relaySpeedUnlimited')
  const bps = limitKb * 1024 // KB/s → bps
  // 与共享视频各档位码率对比，给出匹配档位
  const tierLabel = (tier: string) => {
    const map: Record<string, string> = {
      low: t('manage.settings.qualityLow'),
      sd: t('manage.settings.qualitySd'),
      hd: t('manage.settings.qualityHd'),
      uhd: t('manage.settings.qualityUhd'),
      origin: t('manage.settings.qualityOrigin'),
    }
    return map[tier] || t('manage.settings.qualityLow')
  }
  const matched = matchedQualityTier.value
  return matched ? t('manage.settings.relaySpeedMatch', { tier: tierLabel(matched) }) : t('manage.settings.relaySpeedMatch', { tier: tierLabel('low') })
})

/** 当前限速匹配的档位（low/sd/hd/uhd/origin；不限速 → null） */
const matchedQualityTier = computed<string | null>(() => {
  const limitKb = Number(config.value.directRelaySpeedLimit) || 0
  if (limitKb <= 0) return null
  const bps = limitKb * 1024
  const table: Array<[string, number]> = [
    ['origin', 8000 * 1024],
    ['uhd', 4000 * 1024],
    ['hd', 1200 * 1024],
    ['sd', 500 * 1024],
    ['low', 250 * 1024],
  ]
  for (const [tier, need] of table) {
    if (bps >= need * 1.2) return tier
  }
  return 'low'
})

/** 默认视频流质量下拉：各档位元信息（分辨率 + 码率换算，供选项完整展示） */
const qualityTierMeta = computed(() => [
  { value: 'low', label: t('manage.settings.qualityLow'), resolution: '640×360', kb: 250 },
  { value: 'sd', label: t('manage.settings.qualitySd'), resolution: '640×480', kb: 500 },
  { value: 'hd', label: t('manage.settings.qualityHd'), resolution: '1280×720', kb: 1200 },
  { value: 'uhd', label: t('manage.settings.qualityUhd'), resolution: '2560×1440', kb: 4000 },
  { value: 'origin', label: t('manage.settings.qualityOrigin'), resolution: '不压缩', kb: 8000 },
  { value: 'auto', label: t('manage.settings.qualityAuto'), resolution: '按带宽自动匹配', kb: 0 },
])
const pickQuality = (value: string) => {
  config.value.mediaDefaultQuality = value
}

// ==================== TURN 中继服务器：表单式编辑 ====================
interface TurnRow {
  urls: string
  username: string
  credential: string
}
const turnRows = ref<TurnRow[]>([])

/** 从配置数组初始化表单行 */
const initTurnRows = () => {
  const list = config.value.directTurnServers
  turnRows.value = Array.isArray(list) && list.length
    ? list.map((r) => ({ urls: r?.urls || '', username: r?.username || '', credential: r?.credential || '' }))
    : []
}
/** 表单行 → 配置数组（过滤空地址行） */
const syncTurnRows = () => {
  config.value.directTurnServers = turnRows.value
    .filter((r) => r.urls.trim())
    .map((r) => ({ urls: r.urls.trim(), username: r.username.trim(), credential: r.credential.trim() }))
}
const addTurnRow = () => {
  turnRows.value = [...turnRows.value, { urls: '', username: '', credential: '' }]
}
const removeTurnRow = (idx: number) => {
  turnRows.value = turnRows.value.filter((_, i) => i !== idx)
  syncTurnRows()
}
// 配置外部刷新（如保存回显）时重建表单行
watch(() => config.value.directTurnServers, () => initTurnRows())

onMounted(() => {
  initTurnRows()
  void refreshConfig()
})

/** 主题选择：本地立即应用（含持久化）并保存为站点默认 */
const onThemeChange = async (event: Event) => {
  const id = (event.target as HTMLSelectElement).value as ThemeId
  setTheme(id)
  await updateConfig({ spaTheme: id })
}
</script>

<template>
  <div class="p-6 h-screen overflow-y-auto custom-scrollbar">
    <h2 class="text-2xl font-bold mb-6" :class="[isDarkMode ? 'text-white' : 'text-gray-800']">
      {{ t('admin.settings.title') }}
    </h2>

    <!-- 加载中遮罩 -->
    <div v-if="isLoading" class="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
      role="status" aria-label="loading">
      <div class="px-6 py-4 rounded-lg shadow-lg text-sm font-medium"
        :class="[isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-700']">
        {{ t('common.loading') }}
      </div>
    </div>

    <div class="space-y-6">
      <!-- ========== 分组1：站点信息（全局生效） ========== -->
      <section class="rounded-xl border p-5 space-y-4" :class="[isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50']">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-lg shrink-0" :class="[isDarkMode ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-600']">
              <GlobeIcon class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-medium" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('manage.settings.group.siteInfo') }}
              </h3>
              <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ t('manage.settings.group.siteInfoDesc') }}
              </p>
            </div>
          </div>
          <span class="shrink-0 text-[10px] px-2 py-1 rounded-full font-medium" :class="[isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700']">
            {{ t('manage.settings.scope.global') }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('admin.settings.siteName') }}
            </label>
            <input type="text" v-model="config.name"
              class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              :class="[
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                  : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
              ]" />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('admin.settings.websiteDescription') }}
            </label>
            <input type="text" v-model="config.description"
              class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              :class="[
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                  : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
              ]" />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('admin.settings.keywords') }}
            </label>
            <input type="text" v-model="config.keywords"
              class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              :class="[
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                  : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
              ]" />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('manage.settings.notificationTitle') }}
            </label>
            <input type="text" v-model="config.notify_title"
              class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              :class="[
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                  : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
              ]" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
            {{ t('manage.settings.notificationContent') }}
          </label>
          <textarea v-model="config.notify_content" rows="3"
            class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            :class="[
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
            ]"></textarea>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
            {{ t('manage.settings.pageExplain') }}
          </label>
          <textarea v-model="config.page_explain" rows="3"
            class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            :class="[
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
            ]"></textarea>
          <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
            {{ t('manage.settings.pageExplainHint') }}
          </p>
        </div>

        <SettingSwitch
          :label="t('manage.settings.guestUpload')"
          :model-value="config.openUpload"
          :enabled-text="t('common.enabled')"
          :disabled-text="t('common.disabled')"
          @toggle="toggleConfigFlag('openUpload')"
        />
      </section>

      <!-- ========== 分组2：界面与后台（全局 + 后台管理） ========== -->
      <section class="rounded-xl border p-5 space-y-4" :class="[isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50']">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-lg shrink-0" :class="[isDarkMode ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-600']">
              <PaletteIcon class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-medium" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('manage.settings.group.themeAdmin') }}
              </h3>
              <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ t('manage.settings.group.themeAdminDesc') }}
              </p>
            </div>
          </div>
          <span class="shrink-0 text-[10px] px-2 py-1 rounded-full font-medium" :class="[isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700']">
            {{ t('manage.settings.scope.global') }} + {{ t('manage.settings.scope.admin') }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('manage.settings.themeSelection') }}
            </label>
            <select
              :value="themeId"
              @change="onThemeChange"
              class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border appearance-none bg-no-repeat bg-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
              :class="[
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
                  : 'border-gray-300 hover:border-gray-400'
              ]" style="
                background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E');
              ">
              <option v-for="theme in injectedThemes" :key="theme.id" :value="theme.id">
                {{ theme.name }}
              </option>
            </select>
            <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ t('manage.settings.themeSelectionHint') }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              {{ t('admin.settings.adminPassword') }}
            </label>
            <div class="relative">
              <input type="password" minlength="6" v-model="config.admin_token" :placeholder="t('admin.settings.passwordPlaceholder')"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-400"
                :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                <span class="text-xs">{{ t('admin.settings.passwordNote') }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
            {{ t('manage.settings.robotsFile') }}
          </label>
          <textarea v-model="config.robotsText" rows="3"
            class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            :class="[
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
            ]"></textarea>
        </div>
      </section>

      <!-- ========== 分组3：存储服务（全局） ========== -->
      <section class="rounded-xl border p-5 space-y-4" :class="[isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50']">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-lg shrink-0" :class="[isDarkMode ? 'bg-sky-900/40 text-sky-400' : 'bg-sky-100 text-sky-600']">
              <DatabaseIcon class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-medium" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('manage.settings.group.storage') }}
              </h3>
              <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ t('manage.settings.group.storageDesc') }}
              </p>
            </div>
          </div>
          <span class="shrink-0 text-[10px] px-2 py-1 rounded-full font-medium" :class="[isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700']">
            {{ t('manage.settings.scope.global') }}
          </span>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
            {{ t('manage.settings.storagePath') }}
          </label>
          <input type="text" :placeholder="t('manage.settings.storagePathPlaceholder')" v-model="config.storage_path"
            class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            :class="[
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
            ]" />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
            {{ t('manage.settings.storageMethod') }}
          </label>
          <select v-model="config.file_storage"
            class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border appearance-none bg-no-repeat bg-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            :class="[
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
                : 'border-gray-300 hover:border-gray-400'
            ]" style="
              background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E');
            ">
            <option value="local">{{ t('manage.settings.localStorage') }}</option>
            <option value="s3">{{ t('manage.settings.s3Storage') }}</option>
            <option value="webdav">{{ t('manage.settings.webdavStorage') }}</option>
            <option value="onedrive">{{ t('manage.settings.onedriveStorage') }}</option>
          </select>
        </div>

        <!-- WebDAV 配置 -->
        <div v-if="config.file_storage === 'webdav'" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                Webdav URL
              </label>
              <input type="text" :placeholder="t('manage.settings.webdavUrlPlaceholder')" v-model="config.webdav_url"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                Webdav Username
              </label>
              <input type="text" :placeholder="t('manage.settings.webdavUsernamePlaceholder')" v-model="config.webdav_username"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                Webdav Password
              </label>
              <input type="password" :placeholder="t('manage.settings.webdavPasswordPlaceholder')" v-model="config.webdav_password"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>
          </div>
        </div>

        <!-- OneDrive 配置 -->
        <div v-if="config.file_storage === 'onedrive'" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.onedriveDomain') }}
              </label>
              <input type="text" v-model="config.onedrive_domain"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.onedriveClientId') }}
              </label>
              <input type="text" v-model="config.onedrive_client_id"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.onedriveUsername') }}
              </label>
              <input type="text" v-model="config.onedrive_username"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.onedrivePassword') }}
              </label>
              <input type="password" v-model="config.onedrive_password"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.onedriveRootPath') }}
              </label>
              <input type="text" v-model="config.onedrive_root_path"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>
          </div>
          <SettingSwitch
            :label="t('manage.settings.enableProxy')"
            :model-value="config.onedrive_proxy"
            :enabled-text="t('common.enabled')"
            :disabled-text="t('common.disabled')"
            @toggle="toggleConfigFlag('onedrive_proxy')"
          />
        </div>

        <!-- S3 配置 -->
        <div v-if="config.file_storage === 's3'" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.s3AccessKeyId') }}
              </label>
              <input type="text" v-model="config.s3_access_key_id"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.s3SecretAccessKey') }}
              </label>
              <input type="password" v-model="config.s3_secret_access_key"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.s3BucketName') }}
              </label>
              <input type="text" v-model="config.s3_bucket_name"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.s3EndpointUrl') }}
              </label>
              <input type="text" v-model="config.s3_endpoint_url"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.s3RegionName') }}
              </label>
              <input type="text" v-model="config.s3_region_name" :placeholder="t('manage.settings.autoPlaceholder')"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.s3SignatureVersion') }}
              </label>
              <select v-model="config.s3_signature_version"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border appearance-none bg-no-repeat bg-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400'
                ]" style="
                  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E');
                ">
                <option value="s3v2">{{ t('manage.settings.s3v2') }}</option>
                <option value="s3v4">{{ t('manage.settings.s3v4') }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.s3Hostname') }}
              </label>
              <input type="text" v-model="config.s3_hostname"
                class="w-full rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                :class="[
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                ]" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingSwitch
              :label="t('manage.settings.enableProxy')"
              :model-value="config.s3_proxy"
              :enabled-text="t('common.enabled')"
              :disabled-text="t('common.disabled')"
              @toggle="toggleConfigFlag('s3_proxy')"
            />
          </div>
        </div>
      </section>

      <!-- ========== 分组4：上传与分享限制（发送端生效） ========== -->
      <section class="rounded-xl border p-5 space-y-4" :class="[isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50']">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-lg shrink-0" :class="[isDarkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600']">
              <UploadCloudIcon class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-medium" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('manage.settings.group.uploadShare') }}
              </h3>
              <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ t('manage.settings.group.uploadShareDesc') }}
              </p>
            </div>
          </div>
          <span class="shrink-0 text-[10px] px-2 py-1 rounded-full font-medium" :class="[isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700']">
            {{ t('manage.settings.scope.send') }}
          </span>
        </div>

        <div class="space-y-5">
          <!-- 子分组：上传限制（文件分享与收件箱投递共用） -->
          <div>
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2" :class="[isDarkMode ? 'text-sky-300' : 'text-sky-700']">
              <UploadCloudIcon class="w-4 h-4" />
              {{ t('manage.settings.group.uploadLimit') }}
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{ t('manage.settings.fileSizeLimit') }}
                </label>
                <div class="flex items-center space-x-2">
                  <input type="number" v-model="fileSize"
                    class="w-24 rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    :class="[
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500'
                        : 'border-gray-300 hover:border-gray-400 placeholder-gray-500'
                    ]" />
                  <select v-model="sizeUnit"
                    class="rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    :class="[
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
                        : 'border-gray-300 hover:border-gray-400'
                    ]">
                    <option value="KB">{{ t('manage.settings.fileSizeUnits.kb') }}</option>
                    <option value="MB">{{ t('manage.settings.fileSizeUnits.mb') }}</option>
                    <option value="GB">{{ t('manage.settings.fileSizeUnits.gb') }}</option>
                  </select>
                </div>
              </div>

              <SettingNumberInput
                v-model="config.uploadMinute"
                :label="t('manage.settings.uploadPerMinute')"
                :suffix="t('common.minute')"
              />

              <SettingNumberInput
                v-model="config.uploadRateLimitCount"
                :label="t('manage.settings.uploadRateLimitCount')"
                :suffix="t('common.times')"
                :min="1"
              />

              <SettingNumberInput
                v-model="config.maxSendFiles"
                :label="t('manage.settings.maxSendFiles')"
                :suffix="t('common.files')"
              />

              <!-- 分片上传：开关 + 分片大小（发送页/投递页大文件走分片断点续传时生效） -->
              <div class="space-y-2">
                <SettingSwitch
                  :label="t('manage.settings.chunkUploadNote')"
                  :model-value="config.enableChunk"
                  :enabled-text="t('common.enabled')"
                  :disabled-text="t('common.disabled')"
                  @toggle="toggleConfigFlag('enableChunk')"
                />
                <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('manage.settings.chunkUploadHint') }}
                </p>
              </div>

              <div class="space-y-2">
                <SettingNumberInput
                  :model-value="config.uploadChunkSize"
                  :min="1"
                  :max="100"
                  :label="t('manage.settings.uploadChunkSize')"
                  :suffix="t('manage.settings.fileSizeUnits.mb')"
                  @update:model-value="(v) => (config.uploadChunkSize = Number(v))"
                />
                <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('manage.settings.uploadChunkSizeHint') }}
                </p>
              </div>
            </div>
          </div>

          <!-- 子分组：文件 -->
          <div>
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2" :class="[isDarkMode ? 'text-indigo-300' : 'text-indigo-700']">
              <FileIcon class="w-4 h-4" />
              {{ t('manage.settings.group.uploadShareFiles') }}
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingNumberInput
                v-model="config.maxTextLength"
                :label="t('manage.settings.maxTextLength')"
                :min="1"
                :suffix="t('common.chars')"
              />
              <FormInput
                v-model="config.fileTypeWhitelist"
                :label="t('manage.settings.fileTypeWhitelist')"
                :placeholder="t('manage.settings.fileTypeWhitelistPlaceholder')"
              />
            </div>
          </div>

          <!-- 子分组：收件箱 -->
          <div>
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2" :class="[isDarkMode ? 'text-emerald-300' : 'text-emerald-700']">
              <InboxIcon class="w-4 h-4" />
              {{ t('manage.settings.group.uploadShareInbox') }}
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingNumberInput
                v-model="config.maxCollectionFiles"
                :label="t('manage.settings.maxCollectionFiles')"
                :suffix="t('common.files')"
              />

              <SettingNumberInput
                v-model="config.collectionDefaultMaxFiles"
                :label="t('manage.settings.collectionDefaultMaxFiles')"
                :suffix="t('common.files')"
              />

              <SettingNumberInput
                v-model="config.collectionDefaultExpireDays"
                :label="t('manage.settings.collectionDefaultExpireDays')"
                :suffix="t('common.day')"
              />
            </div>
          </div>

          <!-- 子分组：临时房间 -->
          <div>
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2" :class="[isDarkMode ? 'text-amber-300' : 'text-amber-700']">
              <HouseIcon class="w-4 h-4" />
              {{ t('manage.settings.group.directTransfer') }}
            </h4>
            <p class="text-xs mb-3" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ t('manage.settings.group.directTransferDesc') }}
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingSwitch
                :label="t('manage.settings.directRelayEnabled')"
                :model-value="config.directRelayEnabled"
                :enabled-text="t('common.enabled')"
                :disabled-text="t('common.disabled')"
                @toggle="toggleConfigFlag('directRelayEnabled')"
              />

              <SettingNumberInput
                v-model="config.directRelaySpeedLimit"
                :label="t('manage.settings.directRelaySpeedLimit')"
                :min="0"
                :suffix="t('manage.settings.kbPerSecond')"
              />

              <!-- 房间文件中转分片大小（KB，16~256） -->
              <div class="space-y-2">
                <SettingNumberInput
                  v-model="config.directRelayChunkSize"
                  :label="t('manage.settings.directRelayChunkSize')"
                  :min="16"
                  :max="256"
                  :suffix="t('manage.settings.kb')"
                />
                <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('manage.settings.directRelayChunkSizeHint') }}
                </p>
              </div>

              <!-- 房间文件中转单文件大小上限（MB，0=不限制） -->
              <div class="space-y-2">
                <SettingNumberInput
                  v-model="config.directMaxRelaySize"
                  :label="t('manage.settings.directMaxRelaySize')"
                  :min="0"
                  :suffix="t('manage.settings.fileSizeUnits.mb')"
                />
                <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('manage.settings.directMaxRelaySizeHint') }}
                </p>
              </div>

              <!-- 人员上限（含说明，同格） -->
              <div class="space-y-2">
                <SettingNumberInput
                  v-model="config.defaultMaxMembers"
                  :label="t('manage.settings.defaultMaxMembers')"
                  :min="0"
                  :suffix="t('common.people')"
                />
                <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('manage.settings.defaultMaxMembersHint') }}
                </p>
              </div>

              <!-- 默认视频流质量档位（紧凑：与限速并排，选项仅档位名 + 限速匹配徽标） -->
              <div class="space-y-2">
                <label class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{ t('manage.settings.mediaDefaultQuality') }}
                </label>
                <ThemeDropdown
                  :options="qualityTierMeta"
                  :model-value="config.mediaDefaultQuality"
                  width="w-40"
                  :placeholder="t('manage.settings.qualityAuto')"
                  @update:model-value="pickQuality($event as string)"
                >
                  <template #option="{ opt }">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-sm font-medium">{{ opt.label }}</span>
                      <span
                        v-if="matchedQualityTier === opt.value"
                        class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        :class="[isDarkMode ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-500/15 text-emerald-600']"
                      >
                        ✓ {{ t('manage.settings.relaySpeedMatchShort') }}
                      </span>
                    </div>
                  </template>
                </ThemeDropdown>
              </div>
            </div>

            <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ t('manage.settings.directRelayHint') }}
            </p>

            <div class="space-y-1">
              <label class="text-sm font-medium block" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-700']">
                {{ t('manage.settings.directTurnServers') }}
              </label>
              <!-- TURN 中继服务器：表单式行编辑（地址/用户名/密码），替代 JSON 文本编辑 -->
              <div class="space-y-2">
                <div
                  v-for="(row, idx) in turnRows"
                  :key="idx"
                  class="rounded-lg border p-2 space-y-1.5"
                  :class="[isDarkMode ? 'border-gray-600 bg-gray-800/60' : 'border-gray-200 bg-gray-50/60']"
                >
                  <div class="flex items-center gap-2">
                    <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-500 font-medium">{{ idx + 1 }}</span>
                    <input
                      v-model="row.urls"
                      @input="syncTurnRows"
                      placeholder="turn:host:3478?transport=udp"
                      spellcheck="false"
                      class="flex-1 min-w-0 rounded-md border px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                      :class="[isDarkMode ? 'bg-gray-900 border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400']"
                    />
                    <button
                      @click="removeTurnRow(idx)"
                      class="shrink-0 p-1.5 rounded-md transition-colors"
                      :class="[isDarkMode ? 'text-red-400 hover:bg-red-500/15' : 'text-red-500 hover:bg-red-50']"
                      :title="t('manage.settings.turnRemove')"
                    >
                      <Trash2Icon class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <input
                      v-model="row.username"
                      @input="syncTurnRows"
                      :placeholder="t('manage.settings.turnUsername')"
                      spellcheck="false"
                      class="rounded-md border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                      :class="[isDarkMode ? 'bg-gray-900 border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400']"
                    />
                    <input
                      v-model="row.credential"
                      @input="syncTurnRows"
                      :placeholder="t('manage.settings.turnCredential')"
                      spellcheck="false"
                      class="rounded-md border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                      :class="[isDarkMode ? 'bg-gray-900 border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400']"
                    />
                  </div>
                </div>
                <p v-if="turnRows.length === 0" class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('manage.settings.turnEmpty') }}
                </p>
                <button
                  @click="addTurnRow"
                  class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
                  :class="[
                    isDarkMode
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  ]"
                >
                  <PlusIcon class="w-3.5 h-3.5" />
                  {{ t('manage.settings.turnAdd') }}
                </button>
              </div>
              <div class="flex items-start gap-2">
                <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('manage.settings.directTurnServersHint') }}
                </p>
                <code
                  class="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border"
                  :class="[
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                  ]"
                  >[{"urls":"turn:host:3478?transport=udp","username":"user","credential":"pass"}]</code
                >
              </div>
            </div>
          </div>
          <!-- 子分组：共用 -->
          <div>
            <h4 class="text-sm font-semibold mb-3 flex items-center gap-2" :class="[isDarkMode ? 'text-amber-300' : 'text-amber-700']">
              <Settings2Icon class="w-4 h-4" />
              {{ t('manage.settings.group.uploadShareCommon') }}
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingNumberInput
                v-model="config.codeLength"
                :label="t('manage.settings.codeLength')"
                :min="4"
                :max="12"
                :suffix="t('common.digits')"
              />

              <div class="space-y-2">
                <label class="block text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  {{ t('manage.settings.expirationType') }}
                </label>
                <div class="flex flex-wrap gap-3">
                  <label v-for="style in ['day', 'hour', 'minute', 'forever', 'count']" :key="style"
                    class="relative inline-flex items-center group cursor-pointer">
                    <input type="checkbox" :value="style" v-model="config.expireStyle" class="peer sr-only" />
                    <div class="px-4 py-2 rounded-full border-2 transition-all duration-200 select-none" :class="[
                      config.expireStyle.includes(style)
                        ? isDarkMode
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-indigo-600 border-indigo-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-indigo-500'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-500'
                    ]">
                      {{ t(`manage.settings.expiration.${style}`) }}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <!-- 过期保存时间：记录/收件箱/房间过期后宽限保留，到期由后台自动清理（含文件） -->
            <div class="space-y-2 pt-1">
              <span class="block text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                {{ t('manage.settings.expiredRetention') }}
              </span>
              <ExpirationSelector
                v-model:expiration-method="config.expiredRetentionStyle"
                v-model:expiration-value="expiredRetentionValueStr"
                :options="expiredRetentionOptions"
                :label="null"
              />
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('manage.settings.expiredRetentionHint') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ========== 分组5：访问保护（取件/访问生效） ========== -->
      <section class="rounded-xl border p-5 space-y-4" :class="[isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50']">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-lg shrink-0" :class="[isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-500']">
              <ShieldIcon class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-medium" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('manage.settings.group.accessProtect') }}
              </h3>
              <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ t('manage.settings.group.accessProtectDesc') }}
              </p>
            </div>
          </div>
          <span class="shrink-0 text-[10px] px-2 py-1 rounded-full font-medium" :class="[isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700']">
            {{ t('manage.settings.scope.access') }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingNumberInput
            v-model="config.errorMinute"
            :label="t('manage.settings.errorPerMinute')"
            :suffix="t('common.minute')"
          />

          <SettingNumberInput
            v-model="config.errorCount"
            :label="t('manage.settings.errorCountLimit')"
            :suffix="t('common.times')"
          />
        </div>
      </section>


      <!-- 保存按钮 -->
      <div class="flex justify-end mt-2">
        <button @click="submitConfig" :disabled="isLoading"
          class="px-6 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
          {{ t('manage.settings.saveChanges') }}
        </button>
      </div>
    </div>
  </div>
</template>
<style scoped></style>
