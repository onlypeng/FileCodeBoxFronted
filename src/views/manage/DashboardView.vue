<template>
  <div class="p-6 overflow-y-auto custom-scrollbar">
    <div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm" :class="[mutedTextClass]">FileCodeBox Admin</p>
        <h2 class="text-2xl font-bold" :class="[primaryTextClass]">
          {{ t('admin.dashboard.title') }}
        </h2>
      </div>
      <button
        type="button"
        :disabled="isLoading"
        @click="fetchDashboardData"
        class="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :class="[
          isDarkMode
            ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
        ]"
      >
        <RefreshCwIcon class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        {{ t('admin.dashboard.refresh') }}
      </button>
    </div>

    <!-- 加载中骨架 -->
    <div v-if="isLoading" class="grid grid-cols-1 gap-4 md:grid-cols-3" role="status" aria-label="loading">
      <div v-for="i in 6" :key="i" class="h-28 rounded-xl animate-pulse"
        :class="[isDarkMode ? 'bg-gray-800' : 'bg-gray-100']"></div>
    </div>

    <!-- 加载失败错误态 -->
    <div v-else-if="loadError" class="rounded-xl border p-8 text-center"
      :class="[isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50']">
      <p class="text-sm mb-3" :class="[mutedTextClass]">
        {{ t('admin.dashboard.loadFailed') }}：{{ loadError }}
      </p>
      <button
        type="button"
        @click="fetchDashboardData"
        class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
      >
        {{ t('admin.dashboard.refresh') }}
      </button>
    </div>

    <template v-else>

    <!-- ============ 文件分组 ============ -->
    <section class="space-y-6">
      <GroupHeader :icon="FilesIcon" :title="t('admin.dashboard.fileGroup')" :desc="t('admin.dashboard.groupFilesDesc')" tone="indigo" />

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          :title="t('admin.dashboard.totalFiles')"
          :value="dashboardData.totalFiles"
          :icon="FilesIcon"
          icon-color="indigo"
        >
          <template #description>
            {{ t('admin.dashboard.todayShares', { count: dashboardData.todayCount }) }}
          </template>
        </StatCard>

        <StatCard
          :title="t('admin.dashboard.storageSpace')"
          :value="dashboardData.storageUsedText"
          :icon="HardDriveIcon"
          icon-color="purple"
        >
          <template #description>
            {{ t('admin.dashboard.todayIncrease', { count: dashboardData.todaySizeText }) }}
          </template>
        </StatCard>

        <StatCard
          :title="t('admin.dashboard.totalRetrievals')"
          :value="dashboardData.usedCount"
          :icon="DownloadCloudIcon"
          icon-color="blue"
        >
          <template #description>
            {{ t('admin.dashboard.serverUptime') }} {{ sysUptimeText }}
          </template>
        </StatCard>
      </div>

      <div v-if="dashboardData.hasExtendedStats" class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section class="xl:col-span-2 rounded-lg p-5 shadow-sm" :class="[panelClass]">
          <div class="mb-5 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold" :class="[primaryTextClass]">
                {{ t('admin.dashboard.fileHealth') }}
              </h3>
              <p class="text-sm" :class="[mutedTextClass]">
                {{ t('admin.dashboard.fileHealthDesc') }}
              </p>
            </div>
            <ActivityIcon class="h-5 w-5" :class="[isDarkMode ? 'text-indigo-300' : 'text-indigo-500']" />
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricProgress
              :label="t('admin.dashboard.activeFileRatio')"
              :value="dashboardData.activeRatio"
              :detail="`${dashboardData.activeCount} / ${dashboardData.totalFiles}`"
              tone="green"
            />
            <MetricProgress
              :label="t('admin.dashboard.fileShareRatio')"
              :value="dashboardData.fileRatio"
              :detail="t('admin.dashboard.binaryFiles', { count: dashboardData.fileCount })"
              tone="indigo"
            />
            <MetricProgress
              :label="t('admin.dashboard.textShareRatio')"
              :value="dashboardData.textRatio"
              :detail="t('admin.dashboard.textShares', { count: dashboardData.textCount })"
              tone="purple"
            />
          </div>

          <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-lg border p-4" :class="[subtlePanelClass]">
              <p class="text-sm" :class="[mutedTextClass]">
                {{ t('admin.dashboard.expiredFiles') }}
              </p>
              <div class="mt-2 flex items-end justify-between">
                <strong class="text-3xl" :class="[primaryTextClass]">
                  {{ dashboardData.expiredCount }}
                </strong>
                <span class="text-sm" :class="[mutedTextClass]">
                  {{ t('admin.dashboard.needCleanup') }}
                </span>
              </div>
            </div>

            <div class="rounded-lg border p-4" :class="[subtlePanelClass]">
              <p class="text-sm" :class="[mutedTextClass]">
                {{ t('admin.dashboard.chunkedFiles') }}
              </p>
              <div class="mt-2 flex items-end justify-between">
                <strong class="text-3xl" :class="[primaryTextClass]">
                  {{ dashboardData.chunkedCount }}
                </strong>
                <span class="text-sm" :class="[mutedTextClass]">
                  {{ dashboardData.enableChunk ? t('common.enabled') : t('common.disabled') }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-lg p-5 shadow-sm" :class="[panelClass]">
          <div class="mb-5">
            <h3 class="text-lg font-semibold" :class="[primaryTextClass]">
              {{ t('admin.dashboard.storagePolicy') }}
            </h3>
            <p class="text-sm" :class="[mutedTextClass]">
              {{ t('admin.dashboard.storagePolicyDesc') }}
            </p>
          </div>

          <div class="space-y-4">
            <PolicyRow
              :label="t('admin.dashboard.storageBackend')"
              :value="dashboardData.storageBackend"
            />
            <PolicyRow
              :label="t('admin.dashboard.singleFileLimit')"
              :value="dashboardData.uploadSizeLimitText"
            />
            <PolicyRow
              :label="t('admin.dashboard.guestUpload')"
              :value="dashboardData.openUpload ? t('common.enabled') : t('common.disabled')"
            />
            <PolicyRow
              :label="t('admin.dashboard.expiredRetention')"
              :value="maxSaveTimeText"
            />
          </div>

          <div class="mt-5">
            <div class="mb-2 flex items-center justify-between text-sm">
              <span :class="[mutedTextClass]">{{ t('admin.dashboard.todayCapacityReference') }}</span>
              <span :class="[primaryTextClass]">{{ dashboardData.todaySizeRatio }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full" :class="[isDarkMode ? 'bg-gray-700' : 'bg-gray-100']">
              <div
                class="h-full rounded-full bg-indigo-500"
                :style="{ width: `${dashboardData.todaySizeRatio}%` }"
              ></div>
            </div>
          </div>
        </section>
      </div>

      <div v-if="dashboardData.hasExtendedStats" class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section class="rounded-lg p-5 shadow-sm" :class="[panelClass]">
          <h3 class="text-lg font-semibold" :class="[primaryTextClass]">
            {{ t('admin.dashboard.fileTypeDistribution') }}
          </h3>
          <div class="mt-4 space-y-3">
            <div v-if="dashboardData.topSuffixes.length === 0" class="text-sm" :class="[mutedTextClass]">
              {{ t('common.noData') }}
            </div>
            <div v-for="item in dashboardData.topSuffixes" :key="`${item.suffix}-${item.count}`" class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span :class="[primaryTextClass]">{{ item.suffix || t('admin.dashboard.textType') }}</span>
                <span :class="[mutedTextClass]">{{ item.count }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full" :class="[isDarkMode ? 'bg-gray-700' : 'bg-gray-100']">
                <div
                  class="h-full rounded-full bg-purple-500"
                  :style="{ width: `${getSuffixRatio(item.count)}%` }"
                ></div>
              </div>
            </div>
          </div>
        </section>

        <section class="xl:col-span-2 rounded-lg p-5 shadow-sm" :class="[panelClass]">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold" :class="[primaryTextClass]">
                {{ t('admin.dashboard.recentFiles') }}
              </h3>
              <p class="text-sm" :class="[mutedTextClass]">
                {{ t('admin.dashboard.recentFilesDesc') }}
              </p>
            </div>
            <!-- 显示条数选择：默认 5 条，可展开查看更多 -->
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs" :class="[mutedTextClass]">{{ t('admin.dashboard.showCount') }}</span>
              <ThemeDropdown
                :options="recentFilesCountOptions"
                :model-value="String(recentFilesLimit)"
                size="sm"
                width="w-16"
                @update:model-value="recentFilesLimit = Number($event)"
              />
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
            <table class="min-w-full divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-200']">
              <thead :class="[isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50']">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[mutedTextClass]">
                    {{ t('admin.dashboard.table.file') }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[mutedTextClass]">
                    {{ t('admin.dashboard.table.size') }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[mutedTextClass]">
                    {{ t('admin.dashboard.table.usage') }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[mutedTextClass]">
                    {{ t('admin.dashboard.table.status') }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-100']">
                <tr v-if="visibleRecentFiles.length === 0">
                  <td colspan="4" class="px-4 py-6 text-center text-sm" :class="[mutedTextClass]">
                    {{ t('common.noData') }}
                  </td>
                </tr>
                <tr v-for="file in visibleRecentFiles" :key="file.id">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="rounded-lg p-2" :class="[isDarkMode ? 'bg-gray-700' : 'bg-gray-100']">
                        <FileTextIcon v-if="file.text" class="h-4 w-4" :class="[mutedTextClass]" />
                        <FileIcon v-else class="h-4 w-4" :class="[mutedTextClass]" />
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium" :class="[primaryTextClass]">
                          {{ file.name || file.code }}
                        </p>
                        <p class="text-xs" :class="[mutedTextClass]">
                          {{ file.code }} · {{ formatCreatedAt(file.createdAt) }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm" :class="[primaryTextClass]">
                    {{ formatFileSize(file.size) }}
                  </td>
                  <td class="px-4 py-3 text-sm" :class="[primaryTextClass]">
                    {{ file.usedCount }} {{ t('common.times') }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                      :class="[
                        file.isExpired
                          ? isDarkMode
                            ? 'bg-red-900/40 text-red-300'
                            : 'bg-red-100 text-red-700'
                          : isDarkMode
                            ? 'bg-green-900/40 text-green-300'
                            : 'bg-green-100 text-green-700'
                      ]"
                    >
                      {{ file.isExpired ? t('common.expiredFile') : t('admin.dashboard.available') }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>

    <!-- ============ 收件箱分组 ============ -->
    <section class="mt-8 space-y-6">
      <GroupHeader :icon="InboxIcon" :title="t('admin.dashboard.inboxGroup')" :desc="t('admin.dashboard.groupInboxDesc')" tone="pink" />

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          :title="t('admin.dashboard.totalCollections')"
          :value="dashboardData.totalCollections || 0"
          :icon="InboxIcon"
          icon-color="pink"
        >
          <template #description>
            {{ t('admin.dashboard.activeCollections', { count: dashboardData.activeCollections || 0 }) }}
          </template>
        </StatCard>

        <StatCard
          :title="t('admin.dashboard.totalDeliveries')"
          :value="dashboardData.totalDeliveries || 0"
          :icon="UploadCloudIcon"
          icon-color="orange"
        >
          <template #description>
            {{ t('admin.dashboard.todayDeliveriesCount', { count: dashboardData.todayDeliveries || 0 }) }}
          </template>
        </StatCard>

        <StatCard
          :title="t('admin.dashboard.todayDeliverySize')"
          :value="formatFileSize(Number(dashboardData.todayDeliveriesSize || 0))"
          :icon="HardDriveIcon"
          icon-color="teal"
        >
          <template #description>
            {{ t('admin.dashboard.yesterdayDeliveriesCount', { count: dashboardData.yesterdayDeliveries || 0 }) }}
          </template>
        </StatCard>
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section class="rounded-lg p-5 shadow-sm" :class="[panelClass]">
          <div class="mb-5 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold" :class="[primaryTextClass]">
                {{ t('admin.dashboard.inboxGroup') }}
              </h3>
              <p class="text-sm" :class="[mutedTextClass]">
                {{ t('admin.dashboard.groupInboxDesc') }}
              </p>
            </div>
            <InboxIcon class="h-5 w-5" :class="[isDarkMode ? 'text-pink-300' : 'text-pink-500']" />
          </div>

          <div class="space-y-5">
            <div>
              <div class="mb-2 flex items-center justify-between text-sm">
                <span :class="[mutedTextClass]">{{ t('admin.dashboard.inboxActiveRatio') }}</span>
                <span :class="[primaryTextClass]">
                  {{ dashboardData.activeCollections || 0 }} / {{ dashboardData.totalCollections || 0 }}
                </span>
              </div>
              <div class="h-2 overflow-hidden rounded-full" :class="[isDarkMode ? 'bg-gray-700' : 'bg-gray-100']">
                <div
                  class="h-full rounded-full bg-pink-500"
                  :style="{ width: `${inboxActiveRatio}%` }"
                ></div>
              </div>
            </div>

            <InboxMetric
              :label="t('admin.dashboard.inboxTodayDeliveries')"
              :value="`${dashboardData.todayDeliveries || 0}`"
              :detail="formatFileSize(Number(dashboardData.todayDeliveriesSize || 0))"
            />
            <InboxMetric
              :label="t('admin.dashboard.inboxYesterdayDeliveries')"
              :value="`${dashboardData.yesterdayDeliveries || 0}`"
              :detail="formatFileSize(Number(dashboardData.yesterdayDeliveriesSize || 0))"
            />
          </div>
        </section>

        <section class="xl:col-span-2 rounded-lg p-5 shadow-sm" :class="[panelClass]">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold" :class="[primaryTextClass]">
                {{ t('admin.dashboard.recentCollections') }}
              </h3>
              <p class="text-sm" :class="[mutedTextClass]">
                {{ t('admin.dashboard.recentCollectionsDesc') }}
              </p>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
            <table class="min-w-full divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-200']">
              <thead :class="[isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50']">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[mutedTextClass]">
                    {{ t('admin.dashboard.collectionName') }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[mutedTextClass]">
                    {{ t('admin.unifiedManage.adminCode') }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[mutedTextClass]">
                    {{ t('admin.dashboard.collectionFilesCount') }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[mutedTextClass]">
                    {{ t('admin.dashboard.collectionStatus') }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[mutedTextClass]">
                    {{ t('admin.dashboard.collectionCreated') }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-100']">
                <tr v-if="dashboardData.recentCollections.length === 0">
                  <td colspan="5" class="px-4 py-6 text-center text-sm" :class="[mutedTextClass]">
                    {{ t('common.noData') }}
                  </td>
                </tr>
                <tr v-for="box in dashboardData.recentCollections" :key="box.id">
                  <td class="px-4 py-3">
                    <p class="truncate text-sm font-medium max-w-[160px]" :class="[primaryTextClass]">
                      {{ box.title || '-' }}
                    </p>
                  </td>
                  <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-pink-300' : 'text-pink-600']">
                    {{ box.collection_code }}
                  </td>
                  <td class="px-4 py-3 text-sm" :class="[primaryTextClass]">
                    {{ box.file_count }} / {{ box.max_files }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                      :class="[
                        box.is_expired
                          ? isDarkMode
                            ? 'bg-red-900/40 text-red-300'
                            : 'bg-red-100 text-red-700'
                          : isDarkMode
                            ? 'bg-green-900/40 text-green-300'
                            : 'bg-green-100 text-green-700'
                      ]"
                    >
                      {{ box.is_expired ? t('admin.unifiedManage.expired') : t('admin.unifiedManage.active') }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-xs" :class="[mutedTextClass]">
                    {{ formatCreatedAt(box.created_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>

    <!-- ============ 直传房间分组 ============ -->
    <section class="mt-8 space-y-6">
      <GroupHeader :icon="ArrowLeftRightIcon" :title="t('admin.dashboard.directGroup')" :desc="t('admin.dashboard.groupDirectDesc')" tone="cyan" />

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          :title="t('admin.dashboard.totalRooms')"
          :value="dashboardData.totalRooms || 0"
          :icon="HouseIcon"
          icon-color="orange"
        >
          <template #description>
            {{ t('admin.dashboard.roomActive', { count: dashboardData.activeRooms || 0 }) }} ·
            {{ t('admin.dashboard.roomTodayNew', { count: dashboardData.todayRooms || 0 }) }}
          </template>
        </StatCard>

        <StatCard
          :title="t('admin.dashboard.onlineRooms')"
          :value="dashboardData.onlineRooms || 0"
          :icon="RadioIcon"
          icon-color="cyan"
        >
          <template #description>
            {{ t('admin.dashboard.onlineRoomsDesc') }}
          </template>
        </StatCard>
      </div>
    </section>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import type { Component, PropType } from 'vue'
import {
  ActivityIcon,
  ArrowLeftRightIcon,
  DownloadCloudIcon,
  FileIcon,
  FilesIcon,
  FileTextIcon,
  HardDriveIcon,
  InboxIcon,
  RadioIcon,
  RefreshCwIcon,
  UploadCloudIcon,
  HouseIcon
} from 'lucide-vue-next'
import StatCard from '@/components/common/StatCard.vue'
import ThemeDropdown from '@/components/common/ThemeDropdown.vue'
import { useDashboardStats, useInjectedDarkMode } from '@/composables'
import { useI18n } from 'vue-i18n'
import { formatFileSize, formatTimestamp } from '@/utils/common'

const isDarkMode = useInjectedDarkMode()
const { t } = useI18n()
const { dashboardData, isLoading, loadError, fetchDashboardData } = useDashboardStats()

/** 最近分享显示条数：默认 5 条（紧凑），可切换 10 条查看全部 */
const recentFilesLimit = ref(5)
const recentFilesCountOptions = computed(() => [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
])
const visibleRecentFiles = computed(() => dashboardData.recentFiles.slice(0, recentFilesLimit.value))

const primaryTextClass = computed(() => (isDarkMode.value ? 'text-white' : 'text-gray-900'))
const mutedTextClass = computed(() => (isDarkMode.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() =>
  isDarkMode.value ? 'bg-gray-800/80 border border-gray-700' : 'bg-white border border-gray-100'
)
const subtlePanelClass = computed(() =>
  isDarkMode.value ? 'border-gray-700 bg-gray-900/30' : 'border-gray-100 bg-gray-50'
)
const maxSuffixCount = computed(() =>
  Math.max(...dashboardData.topSuffixes.map((item) => item.count), 1)
)
const maxSaveTimeText = computed(() => {
  if (!dashboardData.maxSaveSeconds) return t('admin.dashboard.noSaveLimit')
  const days = Math.floor(dashboardData.maxSaveSeconds / 86400)
  if (days >= 1) return `${days}${t('common.day')}`
  const hours = Math.floor(dashboardData.maxSaveSeconds / 3600)
  if (hours >= 1) return `${hours}${t('common.hour')}`
  return `${Math.floor(dashboardData.maxSaveSeconds / 60)}${t('common.minute')}`
})

// 运行时长（随语言实时更新，避免中英混合）
const sysUptimeText = computed(() => {
  if (!dashboardData.sysUptime) return '-'
  const uptime = Date.now() - dashboardData.sysUptime
  const days = Math.floor(uptime / 86400000)
  const hours = Math.floor((uptime % 86400000) / 3600000)
  if (days > 0) return `${days}${t('common.day')}${hours}${t('common.hour')}`
  return `${hours}${t('common.hour')}`
})

// 收件箱活跃占比
const inboxActiveRatio = computed(() => {
  const total = dashboardData.totalCollections || 0
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round(((dashboardData.activeCollections || 0) / total) * 100)))
})

const getSuffixRatio = (count: number) => Math.round((count / maxSuffixCount.value) * 100)

const formatCreatedAt = (value: string | null) => {
  if (!value) return '-'
  return formatTimestamp(value, 'datetime')
}

const GroupHeader = defineComponent({
  name: 'GroupHeader',
  props: {
    // lucide 图标为函数组件，运行时类型需同时接受 Object 与 Function
    icon: { type: [Object, Function] as PropType<Component>, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    tone: {
      type: String as PropType<'indigo' | 'pink' | 'cyan'>,
      required: true
    }
  },
  setup(props) {
    const accentClass = computed(() => {
      const map = {
        indigo: isDarkMode.value ? 'text-indigo-300 bg-indigo-900/60' : 'text-indigo-600 bg-indigo-100',
        pink: isDarkMode.value ? 'text-pink-300 bg-pink-900/60' : 'text-pink-600 bg-pink-100',
        cyan: isDarkMode.value ? 'text-cyan-300 bg-cyan-900/60' : 'text-cyan-600 bg-cyan-100'
      }
      return map[props.tone]
    })
    const barClass = computed(() => {
      const map = { indigo: 'bg-indigo-500', pink: 'bg-pink-500', cyan: 'bg-cyan-500' }
      return map[props.tone]
    })

    return () =>
      h('div', { class: 'flex items-center gap-3' }, [
        h('div', { class: ['h-9 w-1.5 rounded-full', barClass.value] }),
        h('div', { class: ['flex h-11 w-11 items-center justify-center rounded-xl', accentClass.value] }, [
          h(props.icon, { class: 'h-5 w-5' })
        ]),
        h('div', {}, [
          h('h3', { class: 'text-lg font-semibold text-gray-900 dark:text-white' }, props.title),
          h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, props.desc)
        ])
      ])
  }
})

const MetricProgress = defineComponent({
  name: 'MetricProgress',
  props: {
    label: { type: String, required: true },
    value: { type: Number, required: true },
    detail: { type: String, required: true },
    tone: {
      type: String as PropType<'green' | 'indigo' | 'purple'>,
      required: true
    }
  },
  setup(props) {
    const toneClass = computed(() => {
      const classes = {
        green: 'bg-green-500',
        indigo: 'bg-indigo-500',
        purple: 'bg-purple-500'
      }
      return classes[props.tone]
    })

    return () =>
      h('div', { class: 'rounded-lg border p-4 border-gray-200/60 dark:border-gray-700' }, [
        h('div', { class: 'mb-2 flex items-center justify-between text-sm' }, [
          h('span', { class: 'text-gray-500 dark:text-gray-400' }, props.label),
          h('span', { class: 'font-medium text-gray-900 dark:text-white' }, `${props.value}%`)
        ]),
        h('div', { class: 'h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700' }, [
          h('div', {
            class: ['h-full rounded-full', toneClass.value],
            style: { width: `${props.value}%` }
          })
        ]),
        h('p', { class: 'mt-2 text-sm text-gray-500 dark:text-gray-400' }, props.detail)
      ])
  }
})

const InboxMetric = defineComponent({
  name: 'InboxMetric',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    detail: { type: String, required: true }
  },
  setup(props) {
    return () =>
      h('div', { class: 'rounded-lg border p-4 border-gray-200/60 dark:border-gray-700' }, [
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, props.label),
        h('div', { class: 'mt-2 flex items-end justify-between' }, [
          h('strong', { class: 'text-3xl font-bold text-gray-900 dark:text-white' }, props.value),
          h('span', { class: 'text-sm text-gray-500 dark:text-gray-400' }, props.detail)
        ])
      ])
  }
})

const PolicyRow = defineComponent({
  name: 'PolicyRow',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true }
  },
  setup(props) {
    return () =>
      h('div', { class: 'flex items-center justify-between gap-4 border-b border-gray-200/60 pb-3 last:border-b-0 dark:border-gray-700' }, [
        h('span', { class: 'text-sm text-gray-500 dark:text-gray-400' }, props.label),
        h('span', { class: 'text-sm font-medium text-gray-900 dark:text-white' }, props.value)
      ])
  }
})

onMounted(() => {
  void fetchDashboardData()
})
</script>
