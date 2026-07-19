<template>
  <div class="p-6 overflow-y-auto custom-scrollbar">
    <!-- 标题 -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-800']">
        {{ t('admin.unifiedManage.title') }}
      </h2>
    </div>

    <!-- Tab 切换 -->
    <div class="mb-6 flex border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-6 py-3 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px"
        :class="[
          activeTab === tab.key
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent hover:text-gray-600',
          isDarkMode
            ? activeTab === tab.key
              ? 'text-indigo-400'
              : 'text-gray-400 hover:text-gray-200'
            : activeTab === tab.key
              ? 'text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
        ]"
      >
        <component :is="tab.icon" class="w-4 h-4 inline mr-2" />
        {{ tab.label }}
      </button>
    </div>

    <!-- 文件列表 Tab -->
    <div v-if="activeTab === 'files'">
      <!-- 统计卡片 -->
      <div class="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button type="button" @click="filterByFileCard('total')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-indigo-700' : 'bg-white border-gray-200 hover:border-indigo-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600']">
              <FolderIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.totalFiles') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ fileSummary.totalFiles }}</p>
            </div>
          </div>
        </button>
        <button type="button" @click="filterByFileCard('healthy')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-green-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-green-700' : 'bg-white border-gray-200 hover:border-green-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600']">
              <CheckCircleIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.healthHealthy') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ fileSummary.healthyCount }}</p>
            </div>
          </div>
        </button>
        <button type="button" @click="filterByFileCard('expired')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-red-700' : 'bg-white border-gray-200 hover:border-red-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600']">
              <AlertCircleIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.expiredFiles') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ fileSummary.expiredCount }}</p>
            </div>
          </div>
        </button>
        <button type="button" @click="filterByFileCard('expiring_soon')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-yellow-700' : 'bg-white border-gray-200 hover:border-yellow-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600']">
              <ClockIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.healthExpiringSoon') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ fileSummary.expiringSoonCount }}</p>
            </div>
          </div>
        </button>
        <button type="button" @click="filterByFileCard('permanent')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-purple-700' : 'bg-white border-gray-200 hover:border-purple-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600']">
              <InfinityIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.healthPermanent') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ fileSummary.permanentCount }}</p>
            </div>
          </div>
        </button>
        <div class="p-4 rounded-xl shadow-sm border transition" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600']">
              <HardDriveIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.storageUsed') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ formatFileSize(fileSummary.storageUsed) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="mb-3 p-2.5 rounded-xl shadow-sm border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
        <div class="flex flex-wrap gap-2">
          <div class="relative flex-1 min-w-[180px]">
            <input type="text" v-model="fileParams.keyword" @keyup.enter="loadFiles"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900',
                'w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition'
              ]" :placeholder="t('manage.fileManage.searchPlaceholder')" />
            <SearchIcon class="absolute left-2.5 top-2 w-4 h-4" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <div class="relative">
            <select v-model="fileParams.expireStatus" @change="loadFiles"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900',
                'pl-8 pr-7 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition'
              ]">
              <option value="">{{ t('admin.unifiedManage.allStatus') }}</option>
              <option value="active">{{ t('admin.unifiedManage.active') }}</option>
              <option value="expired">{{ t('admin.unifiedManage.expired') }}</option>
            </select>
            <ChevronDownIcon class="absolute right-2 top-2 w-4 h-4 pointer-events-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <div class="relative">
            <select v-model="fileParams.type" @change="loadFiles"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900',
                'pl-8 pr-7 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition'
              ]">
              <option value="">{{ t('fileManage.typeAll') }}</option>
              <option value="file">{{ t('fileManage.typeFile') }}</option>
              <option value="text">{{ t('fileManage.typeText') }}</option>
              <option value="chunked">{{ t('fileManage.typeChunked') }}</option>
            </select>
            <ChevronDownIcon class="absolute right-2 top-2 w-4 h-4 pointer-events-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <div class="relative">
            <select v-model="fileParams.health" @change="loadFiles"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900',
                'pl-8 pr-7 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition'
              ]">
              <option value="">{{ t('fileManage.healthAll') }}</option>
              <option value="expired">{{ t('fileManage.healthExpired') }}</option>
              <option value="expiring_soon">{{ t('fileManage.healthExpiringSoon') }}</option>
              <option value="never_retrieved">{{ t('fileManage.healthNeverRetrieved') }}</option>
              <option value="permanent">{{ t('fileManage.healthPermanent') }}</option>
            </select>
            <ChevronDownIcon class="absolute right-2 top-2 w-4 h-4 pointer-events-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <div class="relative">
            <select v-model="fileParams.sortBy" @change="loadFiles"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900',
                'pl-8 pr-7 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition'
              ]">
              <option value="created_at">{{ t('fileManage.sortByCreatedAt') }}</option>
              <option value="expired_at">{{ t('fileManage.sortByExpiredAt') }}</option>
              <option value="name">{{ t('fileManage.sortByName') }}</option>
              <option value="size">{{ t('fileManage.sortBySize') }}</option>
              <option value="used_count">{{ t('fileManage.sortByUsedCount') }}</option>
              <option value="code">{{ t('fileManage.sortByCode') }}</option>
            </select>
            <ChevronDownIcon class="absolute right-2 top-2 w-4 h-4 pointer-events-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <div class="relative">
            <select v-model="fileParams.sortOrder" @change="loadFiles"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900',
                'pl-8 pr-7 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition'
              ]">
              <option value="desc">{{ t('fileManage.sortDesc') }}</option>
              <option value="asc">{{ t('fileManage.sortAsc') }}</option>
            </select>
            <ChevronDownIcon class="absolute right-2 top-2 w-4 h-4 pointer-events-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <button @click="loadFiles" class="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex items-center">
            <SearchIcon class="w-3.5 h-3.5 inline mr-1" />
            {{ t('common.search') }}
          </button>
          <button @click="refreshFiles" class="px-3 py-1.5 text-sm rounded-lg transition shadow-sm flex items-center" :class="[isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700']">
            <RefreshCwIcon class="w-3.5 h-3.5 inline mr-1" />
            {{ t('common.refresh') }}
          </button>
        </div>
      </div>

      <!-- 批量操作栏（常驻显示） -->
      <div class="mb-3 p-2.5 rounded-xl shadow-sm border flex flex-wrap items-center gap-2" :class="[
        selectedFileIds.length > 0
          ? (isDarkMode ? 'bg-gray-800 border-indigo-900/50' : 'bg-blue-50 border-blue-200')
          : (isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200')
      ]">
        <span class="text-sm font-medium" :class="[selectedFileIds.length > 0 ? (isDarkMode ? 'text-white' : 'text-gray-800') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')]">
          {{ selectedFileIds.length > 0 ? t('fileManage.selectedCount', { count: selectedFileIds.length }) : t('fileManage.batchToolbarHint') }}
        </span>
        <button @click="clearSelectedFiles" :disabled="selectedFileIds.length === 0" class="px-2.5 py-1 text-xs rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100']">
          {{ t('fileManage.clearSelection') }}
        </button>
        <div class="flex items-center gap-1.5 flex-wrap">
          <button @click="applyBatchPolicyAction('extend_24h')" :disabled="selectedFileIds.length === 0 || isBatchActionRunning"
            class="px-2.5 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {{ t('fileManage.policyExtend24h') }}
          </button>
          <button @click="applyBatchPolicyAction('extend_7d')" :disabled="selectedFileIds.length === 0 || isBatchActionRunning"
            class="px-2.5 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {{ t('fileManage.policyExtend7d') }}
          </button>
          <button @click="applyBatchPolicyAction('make_permanent')" :disabled="selectedFileIds.length === 0 || isBatchActionRunning"
            class="px-2.5 py-1 text-xs rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {{ t('fileManage.policyMakePermanent') }}
          </button>
          <button @click="applyBatchPolicyAction('reset_download_limit', 5)" :disabled="selectedFileIds.length === 0 || isBatchActionRunning"
            class="px-2.5 py-1 text-xs rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {{ t('fileManage.policyResetDownloadLimit') }} (5)
          </button>
        </div>
        <button @click="openBatchEditModal" :disabled="selectedFileIds.length === 0 || isBatchActionRunning"
          class="px-2.5 py-1 text-xs rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
          {{ t('fileManage.batchEdit') }}
        </button>
        <button @click="batchDeleteFiles" :disabled="selectedFileIds.length === 0 || isBatchActionRunning"
          class="px-2.5 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
          {{ t('common.delete') }}
        </button>
      </div>

      <!-- 文件表格 -->
      <div class="relative overflow-hidden rounded-xl shadow-sm border" :class="[isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white']">
        <!-- 加载覆盖层 -->
        <div v-if="isFilesLoading" class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm" :class="[isDarkMode ? 'bg-gray-800/60' : 'bg-white/60']">
          <div class="flex flex-col items-center gap-3">
            <div class="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <span class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">{{ t('common.loading') }}</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-200']">
            <thead :class="[isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50']">
              <tr>
                <th class="px-4 py-3 text-left">
                  <input type="checkbox" @change="toggleSelectAllFiles" :checked="selectedFileIds.length === fileList.length && fileList.length > 0" class="cursor-pointer" />
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.code') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.name') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.size') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.expiration') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.usedCount') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.status') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-100']">
              <tr v-if="fileList.length === 0 && !isFilesLoading">
                <td colspan="8" class="px-4 py-16">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <div class="flex items-center justify-center w-14 h-14 rounded-full" :class="[isDarkMode ? 'bg-gray-700' : 'bg-gray-100']">
                      <FolderIcon class="w-6 h-6" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
                    </div>
                    <div class="text-center">
                      <p class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">{{ t('common.noData') }}</p>
                      <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.loadFilesFailed') }}</p>
                    </div>
                  </div>
                </td>
              </tr>
              <template v-for="file in fileList" :key="file.id">
                <tr class="transition-colors" :class="[isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50']">
                  <td class="px-4 py-3">
                    <input type="checkbox" @change="toggleSelectFile(file.id)" :checked="selectedFileIds.includes(file.id)" class="cursor-pointer" />
                  </td>
                  <td class="px-4 py-3 text-sm font-medium font-mono" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                    {{ file.code }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <FileTextIcon v-if="file.text" class="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <FileIcon v-else class="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span class="text-sm truncate max-w-[200px]" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                        {{ file.prefix }}
                        <span v-if="file.is_multi_file" class="ml-1 text-xs opacity-60">({{ file.file_count || 0 }} {{ t('admin.unifiedManage.files') }})</span>
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ file.displaySize }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="[
                      !file.expired_at
                        ? (isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700')
                        : (file.expiring_soon || file.expiringSoon)
                          ? (isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                    ]">{{ file.displayExpiredAt }}</span>
                  </td>
                  <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                    {{ file.used_count || 0 }}
                    <span v-if="file.expired_count !== null && file.expired_count >= 0" class="text-xs ml-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-500']">/ {{ file.expired_count }}</span>
                    <span v-else class="text-xs ml-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-500']">({{ t('fileManage.expireCountUnlimited') }})</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap items-center gap-1">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="[
                        file.is_expired || file.isExpired
                          ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                          : (file.expiring_soon || file.expiringSoon)
                            ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                            : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                      ]">{{ (file.is_expired || file.isExpired) ? t('fileManage.statusExpired') : (file.expiring_soon || file.expiringSoon) ? t('fileManage.healthExpiringSoon') : t('fileManage.statusActive') }}</span>
                      <span v-if="file.is_permanent || file.isPermanent" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700']">
                        {{ t('fileManage.healthPermanent') }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1">
                      <button @click="openFileDetail(file)" class="p-1.5 rounded-md transition" :class="[isDarkMode ? 'text-cyan-400 hover:text-cyan-300 hover:bg-gray-700' : 'text-cyan-500 hover:text-cyan-700 hover:bg-cyan-50']" :title="t('common.fileDetails')">
                        <InfoIcon class="w-4 h-4" />
                      </button>
                      <button @click="openEditModal(file)" class="p-1.5 rounded-md transition" :class="[isDarkMode ? 'text-orange-400 hover:text-orange-300 hover:bg-gray-700' : 'text-orange-500 hover:text-orange-700 hover:bg-orange-50']" :title="t('common.edit')">
                        <EditIcon class="w-4 h-4" />
                      </button>
                      <button @click="deleteFile(file.id)" class="p-1.5 rounded-md transition" :class="[isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-gray-700' : 'text-red-500 hover:text-red-700 hover:bg-red-50']" :title="t('common.delete')">
                        <TrashIcon class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap justify-between items-center gap-3">
        <span class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ t('components.pagination.showing') }} {{ (fileParams.page - 1) * fileParams.size + 1 }}-{{ Math.min(fileParams.page * fileParams.size, fileParams.total) }} {{ t('components.pagination.of') }} {{ fileParams.total }} {{ t('components.pagination.total') }}
        </span>
        <div class="flex gap-2">
          <button @click="fileParams.page > 1 && (fileParams.page--, loadFiles())" :disabled="fileParams.page <= 1"
            class="px-3 py-1 rounded text-sm disabled:opacity-50 transition" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.previous') }}</button>
          <button @click="fileParams.page * fileParams.size < fileParams.total && (fileParams.page++, loadFiles())" :disabled="fileParams.page * fileParams.size >= fileParams.total"
            class="px-3 py-1 rounded text-sm disabled:opacity-50 transition" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.next') }}</button>
        </div>
      </div>
    </div>

    <!-- 收件箱列表 Tab -->
    <div v-if="activeTab === 'collections'">
      <!-- 统计卡片 -->
      <div class="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button type="button" @click="filterByCollectionCard('total')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-indigo-700' : 'bg-white border-gray-200 hover:border-indigo-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600']">
              <InboxIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.totalCollections') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ collectionSummary.totalCollections }}</p>
            </div>
          </div>
        </button>
        <button type="button" @click="filterByCollectionCard('active')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-green-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-green-700' : 'bg-white border-gray-200 hover:border-green-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600']">
              <CheckCircleIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.activeCollections') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ collectionSummary.activeCollections }}</p>
            </div>
          </div>
        </button>
        <button type="button" @click="filterByCollectionCard('expired')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-red-700' : 'bg-white border-gray-200 hover:border-red-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600']">
              <AlertCircleIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.expiredCollections') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ collectionSummary.expiredCollections }}</p>
            </div>
          </div>
        </button>
        <button type="button" @click="filterByCollectionCard('expiring_soon')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-yellow-700' : 'bg-white border-gray-200 hover:border-yellow-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600']">
              <ClockIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.healthExpiringSoon') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ collectionSummary.expiringSoonCollections }}</p>
            </div>
          </div>
        </button>
        <button type="button" @click="filterByCollectionCard('permanent')" class="text-left p-4 rounded-xl shadow-sm border transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500/40" :class="[
          isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-purple-700' : 'bg-white border-gray-200 hover:border-purple-300'
        ]">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600']">
              <InfinityIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.healthPermanent') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ collectionSummary.permanentCollections }}</p>
            </div>
          </div>
        </button>
        <div class="p-4 rounded-xl shadow-sm border transition" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600']">
              <FolderIcon class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.totalFilesInCollections') }}</p>
              <p class="text-lg font-bold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ collectionSummary.totalFiles }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="mb-3 p-2.5 rounded-xl shadow-sm border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
        <div class="flex flex-wrap gap-2">
          <div class="relative flex-1 min-w-[180px]">
            <input type="text" v-model="collectionParams.keyword" @keyup.enter="loadCollections"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900',
                'w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition'
              ]" :placeholder="t('admin.unifiedManage.searchCollection')" />
            <SearchIcon class="absolute left-2.5 top-2 w-4 h-4" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <div class="relative">
            <select v-model="collectionParams.status" @change="loadCollections"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900',
                'pl-8 pr-7 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition'
              ]">
              <option value="">{{ t('admin.unifiedManage.allStatus') }}</option>
              <option value="active">{{ t('admin.unifiedManage.active') }}</option>
              <option value="expired">{{ t('admin.unifiedManage.expired') }}</option>
            </select>
            <ChevronDownIcon class="absolute right-2 top-2 w-4 h-4 pointer-events-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <div class="relative">
            <select v-model="collectionParams.sortBy" @change="loadCollections"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900',
                'pl-8 pr-7 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition'
              ]">
              <option value="created_at">{{ t('fileManage.sortByCreatedAt') }}</option>
              <option value="expired_at">{{ t('fileManage.sortByExpiredAt') }}</option>
              <option value="title">{{ t('fileManage.sortByName') }}</option>
              <option value="max_files">{{ t('admin.unifiedManage.sortByMaxFiles') }}</option>
              <option value="delivery_expired_at">{{ t('admin.unifiedManage.sortByDeliveryExpiredAt') }}</option>
              <option value="retrieve_expired_at">{{ t('admin.unifiedManage.sortByRetrieveExpiredAt') }}</option>
            </select>
            <ChevronDownIcon class="absolute right-2 top-2 w-4 h-4 pointer-events-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <div class="relative">
            <select v-model="collectionParams.sortOrder" @change="loadCollections"
              :class="[
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900',
                'pl-8 pr-7 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition'
              ]">
              <option value="desc">{{ t('fileManage.sortDesc') }}</option>
              <option value="asc">{{ t('fileManage.sortAsc') }}</option>
            </select>
            <ChevronDownIcon class="absolute right-2 top-2 w-4 h-4 pointer-events-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
          </div>
          <button @click="loadCollections" class="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex items-center">
            <SearchIcon class="w-3.5 h-3.5 inline mr-1" />
            {{ t('common.search') }}
          </button>
          <button @click="refreshCollections" class="px-3 py-1.5 text-sm rounded-lg transition shadow-sm flex items-center" :class="[isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700']">
            <RefreshCwIcon class="w-3.5 h-3.5 inline mr-1" />
            {{ t('common.refresh') }}
          </button>
        </div>
      </div>

      <!-- 批量操作栏（常驻显示） -->
      <div class="mb-3 p-2.5 rounded-xl shadow-sm border flex flex-wrap items-center gap-2" :class="[
        selectedCollectionIds.length > 0
          ? (isDarkMode ? 'bg-gray-800 border-indigo-900/50' : 'bg-blue-50 border-blue-200')
          : (isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200')
      ]">
        <span class="text-sm font-medium" :class="[selectedCollectionIds.length > 0 ? (isDarkMode ? 'text-white' : 'text-gray-800') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')]">
          {{ selectedCollectionIds.length > 0 ? t('fileManage.selectedCount', { count: selectedCollectionIds.length }) : t('fileManage.batchToolbarHint') }}
        </span>
        <button @click="clearSelectedCollections" :disabled="selectedCollectionIds.length === 0" class="px-2.5 py-1 text-xs rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100']">
          {{ t('fileManage.clearSelection') }}
        </button>
        <div class="flex items-center gap-1.5 flex-wrap">
          <button @click="applyCollectionBatchPolicyAction('extend_24h')" :disabled="selectedCollectionIds.length === 0 || isCollectionBatchActionRunning"
            class="px-2.5 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {{ t('fileManage.policyExtend24h') }}
          </button>
          <button @click="applyCollectionBatchPolicyAction('extend_7d')" :disabled="selectedCollectionIds.length === 0 || isCollectionBatchActionRunning"
            class="px-2.5 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {{ t('fileManage.policyExtend7d') }}
          </button>
          <button @click="applyCollectionBatchPolicyAction('make_permanent')" :disabled="selectedCollectionIds.length === 0 || isCollectionBatchActionRunning"
            class="px-2.5 py-1 text-xs rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {{ t('fileManage.policyMakePermanent') }}
          </button>
        </div>
        <button @click="openCollectionBatchEditModal" :disabled="selectedCollectionIds.length === 0 || isCollectionBatchActionRunning"
          class="px-2.5 py-1 text-xs rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
          {{ t('fileManage.batchEdit') }}
        </button>
        <button @click="batchDeleteCollections" :disabled="selectedCollectionIds.length === 0 || isCollectionBatchActionRunning"
          class="px-2.5 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
          {{ t('common.delete') }}
        </button>
      </div>

      <!-- 收件箱表格 -->
      <div class="relative overflow-hidden rounded-xl shadow-sm border" :class="[isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white']">
        <!-- 加载覆盖层 -->
        <div v-if="isCollectionsLoading" class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm" :class="[isDarkMode ? 'bg-gray-800/60' : 'bg-white/60']">
          <div class="flex flex-col items-center gap-3">
            <div class="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <span class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">{{ t('common.loading') }}</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-200']">
            <thead :class="[isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50']">
              <tr>
                <th class="px-4 py-3 text-left">
                  <input type="checkbox" @change="toggleSelectAllCollections" :checked="selectedCollectionIds.length === collectionList.length && collectionList.length > 0" class="cursor-pointer" />
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.name') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.adminCode') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.retrieveCode') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.deliveryCode') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.fileCount') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.status') }}</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-100']">
              <tr v-if="collectionList.length === 0 && !isCollectionsLoading">
                <td colspan="8" class="px-4 py-16">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <div class="flex items-center justify-center w-14 h-14 rounded-full" :class="[isDarkMode ? 'bg-gray-700' : 'bg-gray-100']">
                      <InboxIcon class="w-6 h-6" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']" />
                    </div>
                    <div class="text-center">
                      <p class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">{{ t('common.noData') }}</p>
                      <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.loadFailed') }}</p>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-for="col in collectionList" :key="col.id" class="transition-colors" :class="[isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50']">
                <td class="px-4 py-3">
                  <input type="checkbox" @change="toggleSelectCollection(col.id)" :checked="selectedCollectionIds.includes(col.id)" class="cursor-pointer" />
                </td>
                <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                  <div class="flex items-center gap-2">
                    <InboxIcon class="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div class="min-w-0">
                      <p class="truncate max-w-[160px] font-medium">{{ col.title || '-' }}</p>
                      <p v-if="col.description" class="text-xs truncate max-w-[160px]" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ col.description }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">{{ col.collection_code }}</td>
                <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">{{ col.retrieve_code || '-' }}</td>
                <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']">{{ col.delivery_code }}</td>
                <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" :class="[
                    col.file_count >= col.max_files
                      ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                      : (col.max_files > 0 && col.file_count / col.max_files >= 0.8)
                        ? (isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700')
                        : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                  ]">{{ col.file_count }}/{{ col.max_files }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap items-center gap-1">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="[
                      col.is_expired
                        ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                        : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                    ]">{{ col.is_expired ? t('admin.unifiedManage.expired') : t('admin.unifiedManage.active') }}</span>
                    <span v-if="col.expiring_soon && !col.is_expired" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700']">
                      {{ t('fileManage.healthExpiringSoon') }}
                    </span>
                    <span v-if="!col.expired_at" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700']">
                      {{ t('fileManage.healthPermanent') }}
                    </span>
                  </div>
                  <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ formatTimestamp(col.created_at) }}</p>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1">
                    <button @click="openCollectionDetail(col)" class="p-1.5 rounded-md transition" :class="[isDarkMode ? 'text-cyan-400 hover:text-cyan-300 hover:bg-gray-700' : 'text-cyan-500 hover:text-cyan-700 hover:bg-cyan-50']" :title="t('common.fileDetails')">
                      <InfoIcon class="w-4 h-4" />
                    </button>
                    <button @click="openCollectionEditModal(col)" class="p-1.5 rounded-md transition" :class="[isDarkMode ? 'text-orange-400 hover:text-orange-300 hover:bg-gray-700' : 'text-orange-500 hover:text-orange-700 hover:bg-orange-50']" :title="t('common.edit')">
                      <EditIcon class="w-4 h-4" />
                    </button>
                    <button @click="deleteCollection(col.id)" class="p-1.5 rounded-md transition" :class="[isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-gray-700' : 'text-red-500 hover:text-red-700 hover:bg-red-50']" :title="t('common.delete')">
                      <TrashIcon class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap justify-between items-center gap-3">
        <span class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ t('components.pagination.showing') }} {{ (collectionParams.page - 1) * collectionParams.size + 1 }}-{{ Math.min(collectionParams.page * collectionParams.size, collectionParams.total) }} {{ t('components.pagination.of') }} {{ collectionParams.total }} {{ t('components.pagination.total') }}
        </span>
        <div class="flex gap-2">
          <button @click="collectionParams.page > 1 && (collectionParams.page--, loadCollections())" :disabled="collectionParams.page <= 1"
            class="px-3 py-1 rounded text-sm disabled:opacity-50 transition" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.previous') }}</button>
          <button @click="collectionParams.page * collectionParams.size < collectionParams.total && (collectionParams.page++, loadCollections())" :disabled="collectionParams.page * collectionParams.size >= collectionParams.total"
            class="px-3 py-1 rounded text-sm disabled:opacity-50 transition" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.next') }}</button>
        </div>
      </div>
    </div>

    <!-- 收件箱文件弹窗 -->
    <div v-if="showFilesModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showFilesModal = false"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-3xl rounded-2xl shadow-2xl p-6 border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
            <div class="flex items-center justify-between mb-4">
              <div class="min-w-0">
                <h3 class="text-lg font-semibold truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                  {{ selectedCollection?.title || t('admin.unifiedManage.collectionFiles') }}
                </h3>
                <p v-if="selectedCollection" class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  {{ collectionFiles.length }}/{{ selectedCollection.max_files }} {{ t('admin.unifiedManage.files') }}
                  <span class="ml-2 font-mono" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">{{ selectedCollection.collection_code }}</span>
                </p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button v-if="selectedCollection" @click="downloadCollectionZip(selectedCollection)" class="px-3 py-1.5 text-sm rounded-lg transition flex items-center" :class="[isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-700 hover:bg-green-200']">
                  <ArchiveIcon class="w-4 h-4 inline mr-1" />
                  ZIP
                </button>
                <button @click="showFilesModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  <XIcon class="w-5 h-5" />
                </button>
              </div>
            </div>
            <div class="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div v-for="file in collectionFiles" :key="file.id"
                class="flex items-center justify-between p-3 rounded-lg border transition" :class="[isDarkMode ? 'bg-gray-700/50 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-100 hover:border-gray-200']">
                <div class="flex items-center flex-1 min-w-0 mr-3">
                  <FileIcon class="w-5 h-5 mr-3 flex-shrink-0" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ file.file_name || '-' }}</p>
                    <p class="text-xs flex items-center gap-2" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                      <span>{{ formatFileSize(file.file_size) }}</span>
                      <span v-if="file.uploader_name">· {{ file.uploader_name }}</span>
                      <span v-if="file.created_at">· {{ formatTimestamp(file.created_at) }}</span>
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="text-xs px-2 py-0.5 rounded-full" :class="[
                    file.status === 'completed' ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
                    file.status === 'uploading' ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                    (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                  ]">{{ file.status }}</span>
                  <button @click="copyCollectionFileLink(file)" class="p-1.5 rounded-md transition" :class="[isDarkMode ? 'text-gray-400 hover:text-emerald-400 hover:bg-gray-600' : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50']" :title="t('fileManage.copyLink')">
                    <LinkIcon class="w-4 h-4" />
                  </button>
                  <button @click="downloadCollectionFile(file)" class="p-1.5 rounded-md transition" :class="[isDarkMode ? 'text-gray-400 hover:text-green-400 hover:bg-gray-600' : 'text-gray-500 hover:text-green-600 hover:bg-green-50']" :title="t('admin.unifiedManage.download')">
                    <DownloadIcon class="w-4 h-4" />
                  </button>
                  <button @click="deleteCollectionFile(file.id)" class="p-1.5 rounded-md transition" :class="[isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-gray-600' : 'text-gray-500 hover:text-red-600 hover:bg-red-50']" :title="t('common.delete')">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div v-if="collectionFiles.length === 0" class="text-center py-12" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('common.noData') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 多文件分享文件查看弹窗 -->
    <div v-if="showMultiFileModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showMultiFileModal = false"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ selectedMultiFile?.prefix || t('admin.unifiedManage.multiFileItems') }}
              </h3>
              <button @click="showMultiFileModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <div class="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              <div v-for="item in multiFileItems" :key="item.id"
                class="flex items-center justify-between p-3 rounded-lg border" :class="[isDarkMode ? 'bg-gray-700/50 border-gray-700' : 'bg-gray-50 border-gray-100']">
                <div class="flex items-center flex-1 min-w-0">
                  <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ item.file_name }}</p>
                    <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ formatFileSize(item.file_size) }}</p>
                  </div>
                </div>
              </div>
              <div v-if="multiFileItems.length === 0" class="text-center py-8" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('common.noData') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件预览弹窗 -->
    <div v-if="showPreviewModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showPreviewModal = false"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('admin.unifiedManage.preview') }}
              </h3>
              <button @click="showPreviewModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <div v-if="previewData.type === 'text'" class="max-h-96 overflow-y-auto custom-scrollbar">
              <pre class="whitespace-pre-wrap text-sm p-4 rounded-lg" :class="[isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900']">{{ previewData.content }}</pre>
            </div>
            <div v-else class="text-center py-8" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ t('admin.unifiedManage.previewUnavailable') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件编辑弹窗 -->
    <div v-if="showEditModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="closeEditModal"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-md rounded-2xl shadow-2xl p-6 border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('common.edit') }}
              </h3>
              <button @click="closeEditModal" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('manage.fileManage.headers.code') }}</label>
                <input type="text" v-model="editForm.code" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('manage.fileManage.headers.name') }}</label>
                <input type="text" v-model="editForm.prefix" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('fileManage.expireTime') }}</label>
                <input type="datetime-local" v-model="editForm.expired_at" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('fileManage.expireCount') }}</label>
                <input type="number" v-model="editForm.expired_count" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" placeholder="-1表示不限" />
              </div>
              <div class="flex gap-3 pt-2">
                <button @click="closeEditModal" class="flex-1 py-2.5 rounded-lg transition" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
                  {{ t('common.cancel') }}
                </button>
                <button @click="saveEdit" class="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm">
                  {{ t('common.save') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量编辑弹窗 -->
    <div v-if="showBatchEditModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="closeBatchEditModal"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-md rounded-2xl shadow-2xl p-6 border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('fileManage.batchEdit') }}
              </h3>
              <button @click="closeBatchEditModal" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('fileManage.editMode') }}</label>
                <select v-model="batchEditForm.mode" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
                  <option value="expiresAt">{{ t('fileManage.modeExpireTime') }}</option>
                  <option value="expiresCount">{{ t('fileManage.modeExpireCount') }}</option>
                </select>
              </div>
              <div v-if="batchEditForm.mode === 'expiresAt'">
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('fileManage.expireTime') }}</label>
                <input type="datetime-local" v-model="batchEditForm.expired_at" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                <p class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('fileManage.clearExpireTimeTip') }}</p>
              </div>
              <div v-else>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('fileManage.expireCount') }}</label>
                <input type="number" v-model="batchEditForm.expired_count" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" placeholder="-1表示不限" />
              </div>
              <div class="flex gap-3 pt-2">
                <button @click="closeBatchEditModal" class="flex-1 py-2.5 rounded-lg transition" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
                  {{ t('common.cancel') }}
                </button>
                <button @click="saveBatchEdit" :disabled="isBatchActionRunning" class="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition shadow-sm">
                  {{ t('common.save') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收件箱编辑弹窗 -->
    <div v-if="showCollectionEditModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="closeCollectionEditModal"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-md rounded-2xl shadow-2xl p-6 border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('common.edit') }}
              </h3>
              <button @click="closeCollectionEditModal" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('admin.unifiedManage.name') }}</label>
                <input type="text" v-model="collectionEditForm.title" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" :placeholder="t('admin.unifiedManage.name')" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('admin.unifiedManage.collectionFiles') }}</label>
                <textarea v-model="collectionEditForm.description" rows="2" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none" :placeholder="t('admin.unifiedManage.collectionFiles')"></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ t('admin.unifiedManage.fileCount') }}</label>
                <input type="number" v-model.number="collectionEditForm.max_files" min="1" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" :placeholder="t('admin.unifiedManage.fileCount')" />
                <p v-if="editingCollection" class="text-xs mt-1" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  {{ t('fileManage.selectedCount', { count: editingCollection.file_count }) }} / {{ editingCollection.max_files }}
                </p>
              </div>
              <div class="flex gap-3 pt-2">
                <button @click="closeCollectionEditModal" class="flex-1 py-2.5 rounded-lg transition" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
                  {{ t('common.cancel') }}
                </button>
                <button @click="saveCollectionEdit" :disabled="isCollectionSaving" class="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition shadow-sm">
                  {{ t('common.save') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收件箱批量编辑弹窗 -->
    <div v-if="showCollectionBatchEditModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="closeCollectionBatchEditModal"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-lg rounded-2xl shadow-2xl p-6 border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ t('fileManage.collectionBatchEdit') }}
                <span class="text-xs font-normal ml-2" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                  ({{ selectedCollectionIds.length }})
                </span>
              </h3>
              <button @click="closeCollectionBatchEditModal" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <div class="space-y-4">
              <!-- 投件码过期时间 -->
              <div class="rounded-lg border p-3" :class="[isDarkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50']">
                <label class="flex items-center gap-2 mb-2">
                  <input type="checkbox" v-model="collectionBatchEditForm.editDeliveryExpire" class="cursor-pointer" />
                  <span class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-700']">{{ t('fileManage.deliveryExpireTime') }}</span>
                </label>
                <div v-if="collectionBatchEditForm.editDeliveryExpire" class="grid grid-cols-2 gap-2">
                  <select v-model="collectionBatchEditForm.delivery_expire_style" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm">
                    <option value="minute">{{ t('common.minute') }}</option>
                    <option value="hour">{{ t('common.hour') }}</option>
                    <option value="day">{{ t('common.day') }}</option>
                    <option value="forever">{{ t('fileManage.expireForever') }}</option>
                  </select>
                  <input v-if="collectionBatchEditForm.delivery_expire_style !== 'forever'" type="number" v-model.number="collectionBatchEditForm.delivery_expire_value" min="1" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" :placeholder="t('fileManage.expireValue')" />
                </div>
              </div>
              <!-- 取件码过期时间 -->
              <div class="rounded-lg border p-3" :class="[isDarkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50']">
                <label class="flex items-center gap-2 mb-2">
                  <input type="checkbox" v-model="collectionBatchEditForm.editRetrieveExpire" class="cursor-pointer" />
                  <span class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-700']">{{ t('fileManage.retrieveExpireTime') }}</span>
                </label>
                <div v-if="collectionBatchEditForm.editRetrieveExpire" class="grid grid-cols-2 gap-2">
                  <select v-model="collectionBatchEditForm.retrieve_expire_style" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm">
                    <option value="minute">{{ t('common.minute') }}</option>
                    <option value="hour">{{ t('common.hour') }}</option>
                    <option value="day">{{ t('common.day') }}</option>
                    <option value="forever">{{ t('fileManage.expireForever') }}</option>
                  </select>
                  <input v-if="collectionBatchEditForm.retrieve_expire_style !== 'forever'" type="number" v-model.number="collectionBatchEditForm.retrieve_expire_value" min="1" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" :placeholder="t('fileManage.expireValue')" />
                </div>
              </div>
              <!-- 最大文件数 -->
              <div class="rounded-lg border p-3" :class="[isDarkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50']">
                <label class="flex items-center gap-2 mb-2">
                  <input type="checkbox" v-model="collectionBatchEditForm.editMaxFiles" class="cursor-pointer" />
                  <span class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-700']">{{ t('admin.unifiedManage.fileCount') }}</span>
                </label>
                <div v-if="collectionBatchEditForm.editMaxFiles">
                  <input type="number" v-model.number="collectionBatchEditForm.max_files" min="1" :class="[isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']" class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" :placeholder="t('admin.unifiedManage.fileCount')" />
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button @click="closeCollectionBatchEditModal" class="flex-1 py-2.5 rounded-lg transition" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
                  {{ t('common.cancel') }}
                </button>
                <button @click="saveCollectionBatchEdit" :disabled="isCollectionBatchActionRunning" class="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition shadow-sm">
                  {{ t('common.save') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收件箱详情弹窗 -->
    <div v-if="showCollectionDetailModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="closeCollectionDetailModal"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold flex items-center gap-2" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <InfoIcon class="w-5 h-5 text-cyan-500" />
                {{ t('common.fileDetails') }}
              </h3>
              <button @click="closeCollectionDetailModal" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <div v-if="collectionDetailLoading" class="py-12 text-center" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ t('common.loading') }}
            </div>
            <div v-else-if="collectionDetailData" class="space-y-3">
              <!-- 标题/描述 -->
              <div class="flex items-start gap-3 pb-3 border-b" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-50 text-cyan-600']">
                  <InboxIcon class="w-5 h-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ collectionDetailData.title || '-' }}</p>
                  <p v-if="collectionDetailData.description" class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ collectionDetailData.description }}</p>
                </div>
              </div>
              <!-- 三码 -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="rounded-lg p-3" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50']">
                  <div class="flex items-center justify-between mb-1">
                    <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.adminCode') }}</p>
                    <button @click="copyText(collectionDetailData.collection_code)" class="p-0.5 rounded transition" :class="[isDarkMode ? 'text-gray-500 hover:text-indigo-400' : 'text-gray-400 hover:text-indigo-600']">
                      <LinkIcon class="w-3 h-3" />
                    </button>
                  </div>
                  <p class="font-mono font-semibold text-sm break-all" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">{{ collectionDetailData.collection_code }}</p>
                </div>
                <div class="rounded-lg p-3" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50']">
                  <div class="flex items-center justify-between mb-1">
                    <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.retrieveCode') }}</p>
                    <button v-if="collectionDetailData.retrieve_code" @click="copyText(collectionDetailData.retrieve_code)" class="p-0.5 rounded transition" :class="[isDarkMode ? 'text-gray-500 hover:text-emerald-400' : 'text-gray-400 hover:text-emerald-600']">
                      <LinkIcon class="w-3 h-3" />
                    </button>
                  </div>
                  <p class="font-mono font-semibold text-sm break-all" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">{{ collectionDetailData.retrieve_code || '-' }}</p>
                </div>
                <div class="rounded-lg p-3" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50']">
                  <div class="flex items-center justify-between mb-1">
                    <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.deliveryCode') }}</p>
                    <button @click="copyText(collectionDetailData.delivery_code)" class="p-0.5 rounded transition" :class="[isDarkMode ? 'text-gray-500 hover:text-amber-400' : 'text-gray-400 hover:text-amber-600']">
                      <LinkIcon class="w-3 h-3" />
                    </button>
                  </div>
                  <p class="font-mono font-semibold text-sm break-all" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']">{{ collectionDetailData.delivery_code }}</p>
                </div>
              </div>
              <!-- 状态 / 文件数 -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.status') }}</p>
                  <p>
                    <span v-if="collectionDetailData.is_expired" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700']">{{ t('admin.unifiedManage.expired') }}</span>
                    <span v-else-if="collectionDetailData.expiring_soon" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700']">{{ t('fileManage.healthExpiringSoon') }}</span>
                    <span v-else class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700']">{{ t('admin.unifiedManage.active') }}</span>
                    <span v-if="!collectionDetailData.expired_at" class="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700']">{{ t('fileManage.healthPermanent') }}</span>
                  </p>
                </div>
                <div>
                  <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.fileCount') }}</p>
                  <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                    {{ collectionDetailData.file_count }} / {{ collectionDetailData.max_files }}
                    <span class="text-xs ml-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">({{ t('common.files') }})</span>
                  </p>
                </div>
              </div>
              <!-- 三种过期时间 -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.expireInfo') }}</p>
                  <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                    {{ collectionDetailData.expired_at ? formatTimestamp(collectionDetailData.expired_at) : t('retrieve.expireForever') }}
                  </p>
                </div>
                <div>
                  <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.sortByDeliveryExpiredAt') }}</p>
                  <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                    {{ collectionDetailData.delivery_expired_at ? formatTimestamp(collectionDetailData.delivery_expired_at) : t('retrieve.expireForever') }}
                  </p>
                </div>
                <div>
                  <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.sortByRetrieveExpiredAt') }}</p>
                  <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                    {{ collectionDetailData.retrieve_expired_at ? formatTimestamp(collectionDetailData.retrieve_expired_at) : t('retrieve.expireForever') }}
                  </p>
                </div>
              </div>
              <!-- 创建时间 / 创建者 -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.createdAt') }}</p>
                  <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ collectionDetailData.created_at ? formatTimestamp(collectionDetailData.created_at) : '-' }}</p>
                </div>
                <div>
                  <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.creator') }}</p>
                  <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                    {{ collectionDetailData.creator_name || '-' }}
                    <span v-if="collectionDetailData.creator_ip" class="text-xs ml-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">({{ collectionDetailData.creator_ip }})</span>
                  </p>
                </div>
              </div>
              <!-- 文件列表 -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.collectionFiles') }} ({{ collectionDetailFiles.length }})</p>
                  <button v-if="collectionDetailFiles.length > 0" @click="downloadCollectionZip(collectionDetailData)" class="text-xs flex items-center gap-1 transition" :class="[isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700']">
                    <ArchiveIcon class="w-3.5 h-3.5" /> ZIP
                  </button>
                </div>
                <div v-if="collectionDetailFiles.length > 0" class="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
                  <div v-for="file in collectionDetailFiles" :key="file.id" class="px-3 py-2 flex items-center justify-between text-sm border-b last:border-b-0" :class="[isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-700']">
                    <div class="flex items-center min-w-0 mr-2">
                      <FileIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
                      <div class="min-w-0">
                        <p class="truncate">{{ file.file_name }}</p>
                        <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                          {{ formatFileSize(file.file_size) }}
                          <span v-if="file.uploader_name">· {{ file.uploader_name }}</span>
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                      <button @click="copyCollectionFileLinkFromDetail(file)" class="p-1 rounded transition" :class="[isDarkMode ? 'text-gray-500 hover:text-emerald-400' : 'text-gray-400 hover:text-emerald-600']" :title="t('fileManage.copyLink')">
                        <LinkIcon class="w-3.5 h-3.5" />
                      </button>
                      <button @click="downloadCollectionFileFromDetail(file)" class="p-1 rounded transition" :class="[isDarkMode ? 'text-gray-500 hover:text-green-400' : 'text-gray-400 hover:text-green-600']" :title="t('admin.unifiedManage.download')">
                        <DownloadIcon class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center py-6 text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('common.noData') }}
                </div>
              </div>
              <!-- 底部操作按钮：集成操作列所有功能 -->
              <div class="pt-3 border-t space-y-2" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
                <!-- 第一行：查看文件 / 下载 ZIP / 编辑 -->
                <div class="flex gap-2 flex-wrap">
                  <button @click="showCollectionFiles(collectionDetailData); closeCollectionDetailModal()" class="flex-1 min-w-[120px] py-2 rounded-lg text-sm transition flex items-center justify-center gap-1" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
                    <EyeIcon class="w-4 h-4" />{{ t('admin.unifiedManage.viewFiles') }}
                  </button>
                  <button @click="downloadCollectionZip(collectionDetailData)" class="flex-1 min-w-[120px] py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 text-white transition shadow-sm flex items-center justify-center gap-1">
                    <ArchiveIcon class="w-4 h-4" />ZIP
                  </button>
                  <button @click="openCollectionEditModal(collectionDetailData); closeCollectionDetailModal()" class="flex-1 min-w-[120px] py-2 rounded-lg text-sm bg-orange-500 hover:bg-orange-600 text-white transition shadow-sm flex items-center justify-center gap-1">
                    <EditIcon class="w-4 h-4" />{{ t('common.edit') }}
                  </button>
                </div>
                <!-- 第二行：复制三码链接 -->
                <div class="flex gap-2 flex-wrap">
                  <button @click="copyCollectionLink(collectionDetailData)" class="flex-1 min-w-[100px] py-1.5 rounded-md text-xs transition flex items-center justify-center gap-1" :class="[isDarkMode ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100']">
                    <LinkIcon class="w-3.5 h-3.5" />{{ t('admin.unifiedManage.retrieveCode') }}
                  </button>
                  <button @click="copyDeliveryLink(collectionDetailData)" class="flex-1 min-w-[100px] py-1.5 rounded-md text-xs transition flex items-center justify-center gap-1" :class="[isDarkMode ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' : 'bg-amber-50 text-amber-700 hover:bg-amber-100']">
                    <ShareIcon class="w-3.5 h-3.5" />{{ t('admin.unifiedManage.deliveryCode') }}
                  </button>
                  <button @click="copyText(collectionDetailData.collection_code)" class="flex-1 min-w-[100px] py-1.5 rounded-md text-xs transition flex items-center justify-center gap-1" :class="[isDarkMode ? 'bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100']">
                    <LinkIcon class="w-3.5 h-3.5" />{{ t('admin.unifiedManage.adminCode') }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="py-12 text-center" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ t('common.noData') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件详情弹窗 -->
    <div v-if="showFileDetailModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="closeFileDetailModal"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-xl rounded-2xl shadow-2xl p-6 border" :class="[isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold flex items-center gap-2" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <InfoIcon class="w-5 h-5 text-cyan-500" />
                {{ t('common.fileDetails') }}
              </h3>
              <button @click="closeFileDetailModal" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <div v-if="fileDetailLoading" class="py-12 text-center" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ t('common.loading') }}
            </div>
            <div v-else-if="fileDetailData" class="space-y-3">
              <!-- 概览 -->
              <div class="rounded-lg border p-3" :class="[isDarkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50']">
                <p class="text-xs font-semibold uppercase tracking-wide mb-2" :class="[isDarkMode ? 'text-cyan-400' : 'text-cyan-600']">{{ t('fileManage.sectionOverview') }}</p>
                <div class="flex items-start gap-3 mb-2">
                  <div class="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0" :class="[isDarkMode ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-50 text-cyan-600']">
                    <component :is="fileDetailData.is_multi_file ? FileArchiveIcon : (fileDetailData.text ? FileTextIcon : FileIcon)" class="w-5 h-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                      {{ fileDetailData.is_multi_file ? (t('records.multiFile') + ' ' + (fileDetailData.file_count || 0) + ' ' + t('common.files')) : (fileDetailData.prefix || fileDetailData.code) + (fileDetailData.suffix || '') }}
                    </p>
                    <p class="text-xs mt-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                      {{ fileDetailData.text ? t('retrieve.types.text') : fileDetailData.is_multi_file ? t('admin.unifiedManage.multiFileItems') : t('retrieve.types.file') }}
                    </p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.retrieveCode') }}</p>
                    <p class="font-mono font-semibold text-sm" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ fileDetailData.code || '-' }}</p>
                  </div>
                  <div>
                    <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('fileManage.descriptionLabel') }}</p>
                    <p class="text-sm truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ fileDetailData.description || '-' }}</p>
                  </div>
                </div>
                <div v-if="fileDetailData.text" class="mt-2">
                  <p class="text-xs mb-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.preview') }}</p>
                  <div class="max-h-32 overflow-y-auto custom-scrollbar rounded-lg p-3" :class="[isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800']">
                    <pre class="whitespace-pre-wrap text-xs">{{ fileDetailData.text }}</pre>
                  </div>
                </div>
              </div>

              <!-- 状态 -->
              <div class="rounded-lg border p-3" :class="[isDarkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50']">
                <p class="text-xs font-semibold uppercase tracking-wide mb-2" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">{{ t('fileManage.sectionStatus') }}</p>
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="fileDetailData.is_expired || fileDetailData.isExpired" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700']">{{ t('fileManage.statusExpired') }}</span>
                  <span v-else-if="fileDetailData.is_permanent || fileDetailData.isPermanent" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700']">{{ t('fileManage.healthPermanent') }}</span>
                  <span v-else class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700']">{{ t('fileManage.statusActive') }}</span>
                  <span v-if="(fileDetailData.expiring_soon || fileDetailData.expiringSoon) && !(fileDetailData.is_expired || fileDetailData.isExpired)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700']">{{ t('fileManage.healthExpiringSoon') }}</span>
                  <span v-if="fileDetailData.is_chunked || fileDetailData.isChunked" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-700']">{{ t('fileManage.chunkedFile') }}</span>
                </div>
              </div>

              <!-- 策略信息 -->
              <div class="rounded-lg border p-3" :class="[isDarkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50']">
                <p class="text-xs font-semibold uppercase tracking-wide mb-2" :class="[isDarkMode ? 'text-purple-400' : 'text-purple-600']">{{ t('fileManage.sectionPolicy') }}</p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('fileManage.expireTime') }}</p>
                    <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      {{ fileDetailData.expired_at ? formatTimestamp(fileDetailData.expired_at) : (fileDetailData.is_permanent || fileDetailData.isPermanent ? t('retrieve.expireForever') : '-') }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('fileManage.expireCount') }}</p>
                    <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      <template v-if="fileDetailData.expired_count === null || fileDetailData.expired_count === undefined || fileDetailData.expired_count < 0">{{ t('retrieve.expireForever') }}</template>
                      <template v-else>{{ fileDetailData.expired_count }} {{ t('common.times') }}</template>
                    </p>
                  </div>
                </div>
              </div>

              <!-- 生命周期 -->
              <div class="rounded-lg border p-3" :class="[isDarkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50']">
                <p class="text-xs font-semibold uppercase tracking-wide mb-2" :class="[isDarkMode ? 'text-blue-400' : 'text-blue-600']">{{ t('fileManage.sectionLifecycle') }}</p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.createdAt') }}</p>
                    <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ fileDetailData.created_at ? formatTimestamp(fileDetailData.created_at) : '-' }}</p>
                  </div>
                  <div>
                    <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('fileManage.usedCount') }}</p>
                    <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ (fileDetailData.used_count ?? fileDetailData.usedCount) ?? 0 }} {{ t('common.times') }}</p>
                  </div>
                </div>
              </div>

              <!-- 储存信息 -->
              <div class="rounded-lg border p-3" :class="[isDarkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50']">
                <p class="text-xs font-semibold uppercase tracking-wide mb-2" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']">{{ t('fileManage.sectionStorage') }}</p>
                <div class="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('retrieve.fileSize') }}</p>
                    <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ fileDetailData.size != null ? formatFileSize(fileDetailData.size) : '-' }}</p>
                  </div>
                  <div>
                    <p class="text-xs mb-0.5" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('fileManage.storageBackend') }}</p>
                    <p class="text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      <span v-if="fileDetailData.is_chunked || fileDetailData.isChunked" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" :class="[isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-700']">{{ t('fileManage.chunkedFile') }}</span>
                      <span v-else>{{ fileDetailData.storage_backend || fileDetailData.storageBackend || (fileDetailData.text ? '-' : 'local') }}</span>
                    </p>
                  </div>
                </div>
                <div v-if="fileDetailData.is_multi_file && fileDetailData.file_items && fileDetailData.file_items.length > 0">
                  <p class="text-xs mb-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('admin.unifiedManage.multiFileItems') }}</p>
                  <div class="max-h-40 overflow-y-auto custom-scrollbar rounded-lg border" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
                    <div v-for="(item, idx) in fileDetailData.file_items" :key="idx" class="px-3 py-2 flex items-center justify-between text-sm border-b last:border-b-0" :class="[isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-700']">
                      <span class="truncate mr-2">{{ item.file_name }}</span>
                      <span class="flex-shrink-0 text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ formatFileSize(item.file_size) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 底部操作按钮：集成操作列所有功能 -->
              <div class="pt-3 border-t space-y-2" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
                <!-- 第一行：复制链接 / 下载 / 预览 / 编辑 -->
                <div class="flex gap-2 flex-wrap">
                  <button @click="copyShareUrl(fileDetailData.code)" class="flex-1 min-w-[120px] py-2 rounded-lg text-sm transition flex items-center justify-center gap-1" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
                    <LinkIcon class="w-4 h-4" />{{ t('fileManage.copyLink') }}
                  </button>
                  <button v-if="fileDetailData.is_multi_file" @click="showMultiFileItems(fileDetailData); closeFileDetailModal()" class="flex-1 min-w-[120px] py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex items-center justify-center gap-1">
                    <EyeIcon class="w-4 h-4" />{{ t('admin.unifiedManage.viewFiles') }}
                  </button>
                  <button v-else-if="fileDetailData.text" @click="previewFile(fileDetailData.id); closeFileDetailModal()" class="flex-1 min-w-[120px] py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm flex items-center justify-center gap-1">
                    <EyeIcon class="w-4 h-4" />{{ t('admin.unifiedManage.preview') }}
                  </button>
                  <button v-else @click="downloadFile(fileDetailData.id, buildDownloadFilename(fileDetailData))" class="flex-1 min-w-[120px] py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 text-white transition shadow-sm flex items-center justify-center gap-1">
                    <DownloadIcon class="w-4 h-4" />{{ t('admin.unifiedManage.download') }}
                  </button>
                  <button @click="openEditModal(fileDetailData); closeFileDetailModal()" class="flex-1 min-w-[120px] py-2 rounded-lg text-sm bg-orange-500 hover:bg-orange-600 text-white transition shadow-sm flex items-center justify-center gap-1">
                    <EditIcon class="w-4 h-4" />{{ t('common.edit') }}
                  </button>
                </div>
                <!-- 第二行：策略操作 -->
                <div class="flex gap-2 flex-wrap">
                  <button @click="applySinglePolicyAction(fileDetailData.id, 'extend_24h')" class="flex-1 min-w-[100px] py-1.5 rounded-md text-xs transition flex items-center justify-center gap-1" :class="[isDarkMode ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50' : 'bg-purple-50 text-purple-700 hover:bg-purple-100']">
                    <ClockPlusIcon class="w-3.5 h-3.5" />{{ t('fileManage.policyExtend24h') }}
                  </button>
                  <button @click="applySinglePolicyAction(fileDetailData.id, 'extend_7d')" class="flex-1 min-w-[100px] py-1.5 rounded-md text-xs transition flex items-center justify-center gap-1" :class="[isDarkMode ? 'bg-violet-900/30 text-violet-400 hover:bg-violet-900/50' : 'bg-violet-50 text-violet-700 hover:bg-violet-100']">
                    <CalendarPlusIcon class="w-3.5 h-3.5" />{{ t('fileManage.policyExtend7d') }}
                  </button>
                  <button @click="applySinglePolicyAction(fileDetailData.id, 'make_permanent')" class="flex-1 min-w-[100px] py-1.5 rounded-md text-xs transition flex items-center justify-center gap-1" :class="[isDarkMode ? 'bg-fuchsia-900/30 text-fuchsia-400 hover:bg-fuchsia-900/50' : 'bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100']">
                    <InfinityIcon class="w-3.5 h-3.5" />{{ t('fileManage.policyMakePermanent') }}
                  </button>
                  <button @click="applySinglePolicyAction(fileDetailData.id, 'reset_download_limit', 5)" class="flex-1 min-w-[100px] py-1.5 rounded-md text-xs transition flex items-center justify-center gap-1" :class="[isDarkMode ? 'bg-sky-900/30 text-sky-400 hover:bg-sky-900/50' : 'bg-sky-50 text-sky-700 hover:bg-sky-100']">
                    <RefreshCwIcon class="w-3.5 h-3.5" />{{ t('fileManage.policyResetDownloadLimit') }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="py-12 text-center" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ t('common.noData') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, onMounted, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  FileIcon, FileTextIcon, SearchIcon, TrashIcon, EyeIcon, InboxIcon, ChevronDownIcon, DownloadIcon,
  LinkIcon, EditIcon, RefreshCwIcon, XIcon, ArchiveIcon, ShareIcon,
  HardDriveIcon, AlertCircleIcon, CheckCircleIcon, FolderIcon, ClockIcon, InfinityIcon,
  InfoIcon, ClockPlusIcon, CalendarPlusIcon, FileArchiveIcon
} from 'lucide-vue-next'
import { FileService } from '@/services'
import { CollectionService } from '@/services/collection'
import { useAlertStore } from '@/stores/alertStore'
import { formatFileSize, formatTimestamp } from '@/utils/common'
import {
  buildRetrieveUrl,
  buildCollectionRetrieveUrl,
  buildDeliveryUploadUrl
} from '@/utils/share-url'
import { copyToClipboard } from '@/utils/clipboard'
import type { AdminCollectionItem, CollectionFileItem, CollectionSummary, UpdateCollectionConfigRequest } from '@/types/collection'
import type { AdminFilePolicyAction, AdminFileDetailViewItem, AdminFileDetailResponse, AdminFileStatusFilter, AdminFileTypeFilter, AdminFileHealthFilter, AdminFileSortBy, AdminFileSortOrder, FileListItem, AdminBatchUpdateFilesRequest } from '@/types/file'

const isDarkMode = inject<Ref<boolean> | boolean>('isDarkMode', false)
const { t } = useI18n()
const alertStore = useAlertStore()

const activeTab = ref<'files' | 'collections'>('files')
const tabs = [
  { key: 'files' as const, label: t('admin.unifiedManage.fileList'), icon: FileIcon },
  { key: 'collections' as const, label: t('admin.unifiedManage.collectionList'), icon: InboxIcon },
]

// 文件列表项类型：在 FileListItem 基础上补充展示字段
type AdminFileListRow = FileListItem & {
  displaySize: string
  displayExpiredAt: string
}

// ============ 文件列表 ============
const fileList = ref<AdminFileListRow[]>([])
const fileParams = ref({
  page: 1, size: 10, total: 0, keyword: '',
  expireStatus: '' as '' | AdminFileStatusFilter,
  type: '' as '' | AdminFileTypeFilter,
  health: '' as '' | AdminFileHealthFilter,
  sortBy: 'created_at' as AdminFileSortBy,
  sortOrder: 'desc' as AdminFileSortOrder
})
const fileSummary = ref({
  totalFiles: 0, healthyCount: 0, expiredCount: 0, expiringSoonCount: 0,
  neverRetrievedCount: 0, permanentCount: 0, storageUsed: 0, usedCount: 0
})
const selectedFileIds = ref<number[]>([])
const isBatchActionRunning = ref(false)
const isFilesLoading = ref(false)

// 编辑弹窗
const showEditModal = ref(false)
const editForm = ref({
  id: null as number | null,
  code: '',
  prefix: '',
  suffix: '',
  expired_at: '',
  expired_count: null as number | null
})

// 批量编辑弹窗
const showBatchEditModal = ref(false)
const batchEditForm = ref({
  mode: 'expiresAt' as 'expiresAt' | 'expiresCount',
  expired_at: '',
  expired_count: null as number | null
})

// 多文件查看弹窗
const showMultiFileModal = ref(false)
const selectedMultiFile = ref<AdminFileListRow | AdminFileDetailResponse | null>(null)
const multiFileItems = ref<Array<{ id: number; file_name: string; file_size: number }>>([])

// 预览弹窗
const showPreviewModal = ref(false)
const previewData = ref<{ type: string; content?: string; items?: Array<{ id: number; file_name: string; file_size: number }> }>({ type: '' })

const showMultiFileItems = (file: AdminFileListRow | AdminFileDetailResponse) => {
  selectedMultiFile.value = file
  multiFileItems.value = file.file_items || []
  showMultiFileModal.value = true
}

// 文件详情弹窗
const showFileDetailModal = ref(false)
const fileDetailData = ref<AdminFileDetailViewItem | AdminFileDetailResponse | null>(null)
const fileDetailLoading = ref(false)

const openFileDetail = async (file: AdminFileListRow) => {
  showFileDetailModal.value = true
  fileDetailLoading.value = true
  // 先用列表数据填充，再请求详情接口补充
  fileDetailData.value = { ...file }
  try {
    const res = await FileService.getAdminFileDetail(file.id)
    if (res.detail) {
      fileDetailData.value = { ...file, ...(res.detail as object) }
    }
  } catch {
    // 详情接口失败时保留列表数据
  } finally {
    fileDetailLoading.value = false
  }
}

const closeFileDetailModal = () => {
  showFileDetailModal.value = false
  fileDetailData.value = null
}

const openBatchEditModal = () => {
  showBatchEditModal.value = true
}

const toggleSelectFile = (id: number) => {
  const index = selectedFileIds.value.indexOf(id)
  if (index > -1) {
    selectedFileIds.value.splice(index, 1)
  } else {
    selectedFileIds.value.push(id)
  }
}

const toggleSelectAllFiles = () => {
  if (selectedFileIds.value.length === fileList.value.length) {
    selectedFileIds.value = []
  } else {
    selectedFileIds.value = fileList.value.map(f => f.id)
  }
}

const clearSelectedFiles = () => {
  selectedFileIds.value = []
}

const loadFiles = async () => {
  isFilesLoading.value = true
  try {
    const res = await FileService.getAdminFileList({
      page: fileParams.value.page,
      size: fileParams.value.size,
      keyword: fileParams.value.keyword,
      status: (fileParams.value.expireStatus || undefined) as AdminFileStatusFilter | undefined,
      type: (fileParams.value.type || undefined) as AdminFileTypeFilter | undefined,
      health: (fileParams.value.health || undefined) as AdminFileHealthFilter | undefined,
      sortBy: fileParams.value.sortBy,
      sortOrder: fileParams.value.sortOrder,
    })
    if (res.detail) {
      fileList.value = res.detail.data.map((f) => ({
        ...f,
        displaySize: formatFileSize(f.size),
        displayExpiredAt: f.expired_at ? formatTimestamp(f.expired_at) : t('send.expiration.units.forever'),
      }))
      fileParams.value.total = res.detail.total
      if (res.detail.summary) {
        Object.assign(fileSummary.value, res.detail.summary)
      }
      selectedFileIds.value = []
    }
  } catch {
    alertStore.showAlert(t('manage.fileManage.loadFileListFailed'), 'error')
  } finally {
    isFilesLoading.value = false
  }
}

// 点击统计卡片快速应用筛选
const filterByFileCard = (card: 'total' | 'healthy' | 'expired' | 'expiring_soon' | 'permanent') => {
  fileParams.value.page = 1
  switch (card) {
    case 'total':
      fileParams.value.expireStatus = ''
      fileParams.value.health = ''
      break
    case 'healthy':
      fileParams.value.expireStatus = 'active'
      fileParams.value.health = ''
      break
    case 'expired':
      fileParams.value.expireStatus = ''
      fileParams.value.health = 'expired'
      break
    case 'expiring_soon':
      fileParams.value.expireStatus = ''
      fileParams.value.health = 'expiring_soon'
      break
    case 'permanent':
      fileParams.value.expireStatus = ''
      fileParams.value.health = 'permanent'
      break
  }
  loadFiles()
}

const refreshFiles = () => {
  fileParams.value.page = 1
  loadFiles()
}

const deleteFile = async (id: number) => {
  if (!window.confirm(t('manage.fileManage.deleteConfirm'))) return
  try {
    await FileService.deleteAdminFile(id)
    await loadFiles()
  } catch {
    alertStore.showAlert(t('manage.fileManage.deleteFailed'), 'error')
  }
}

const batchDeleteFiles = async () => {
  if (!window.confirm(t('admin.unifiedManage.batchDeleteConfirm', { count: selectedFileIds.value.length }))) return
  isBatchActionRunning.value = true
  try {
    await FileService.batchDeleteAdminFiles(selectedFileIds.value)
    await loadFiles()
  } catch {
    alertStore.showAlert(t('manage.fileManage.deleteFailed'), 'error')
  } finally {
    isBatchActionRunning.value = false
  }
}

const downloadFile = async (id: number, filename?: string) => {
  try {
    const data = await FileService.downloadAdminFile(id)
    const blob = new Blob([data], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // 优先使用传入的真实文件名，回退到 file_${id}
    link.download = filename || `file_${id}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.downloadFailed'), 'error')
  }
}

// 构造下载文件名：多文件分享时使用 code 命名，普通文件使用 prefix+suffix
const buildDownloadFilename = (file: AdminFileListRow | AdminFileDetailResponse): string => {
  if (file.is_multi_file) {
    return `${file.code || 'multifile'}.zip`
  }
  const prefix = file.prefix || ''
  const suffix = file.suffix || ''
  return (prefix + suffix) || `file_${file.id}`
}

const previewFile = async (id: number) => {
  try {
    const res = await FileService.previewAdminFile(id)
    if (res.detail) {
      const detail = res.detail as { type?: string; content?: string; items?: Array<{ id: number; file_name: string; file_size: number }> }
      previewData.value = {
        type: detail.type || '',
        content: detail.content,
        items: detail.items,
      }
      showPreviewModal.value = true
    }
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.previewFailed'), 'error')
  }
}

const copyShareUrl = async (code: string) => {
  const url = buildRetrieveUrl(code)
  await copyToClipboard(url)
  alertStore.showAlert(t('fileManage.shareUrlCopied'), 'success')
}

const openEditModal = (file: AdminFileListRow | AdminFileDetailResponse | AdminFileDetailViewItem) => {
  editForm.value = {
    id: file.id,
    code: file.code,
    // 多文件分享时 prefix 可能为空，使用 code 作为默认显示名
    prefix: file.prefix || (file.is_multi_file ? file.code || '' : ''),
    suffix: file.suffix || '',
    expired_at: file.expired_at ? file.expired_at.replace('Z', '') : '',
    expired_count: file.expired_count
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = {
    id: null,
    code: '',
    prefix: '',
    suffix: '',
    expired_at: '',
    expired_count: null
  }
}

const saveEdit = async () => {
  if (!editForm.value.id) return
  try {
    const request: AdminBatchUpdateFilesRequest = {
      ids: [editForm.value.id]
    }
    if (editForm.value.expired_at) {
      request.expired_at = editForm.value.expired_at
    } else {
      request.clearExpiredAt = true
    }
    if (editForm.value.expired_count !== null) {
      request.expired_count = editForm.value.expired_count
    }
    await FileService.batchUpdateAdminFiles(request)
    closeEditModal()
    await loadFiles()
    alertStore.showAlert(t('common.saveSuccess'), 'success')
  } catch {
    alertStore.showAlert(t('manage.fileManage.deleteFailed'), 'error')
  }
}

const closeBatchEditModal = () => {
  showBatchEditModal.value = false
  batchEditForm.value = {
    mode: 'expiresAt',
    expired_at: '',
    expired_count: null
  }
}

const saveBatchEdit = async () => {
  isBatchActionRunning.value = true
  try {
    const request: AdminBatchUpdateFilesRequest = {
      ids: selectedFileIds.value
    }
    if (batchEditForm.value.mode === 'expiresAt') {
      if (batchEditForm.value.expired_at) {
        request.expired_at = batchEditForm.value.expired_at
      } else {
        request.clearExpiredAt = true
      }
    } else {
      request.expired_count = batchEditForm.value.expired_count
    }
    const res = await FileService.batchUpdateAdminFiles(request)
    if (res.detail) {
      const updatedCount = res.detail.updatedCount || res.detail.updated_count || 0
      alertStore.showAlert(t('fileManage.batchUpdateSuccess', { count: updatedCount }), 'success')
    }
    closeBatchEditModal()
    await loadFiles()
  } catch {
    alertStore.showAlert(t('fileManage.batchUpdateFailed'), 'error')
  } finally {
    isBatchActionRunning.value = false
  }
}

const applySinglePolicyAction = async (id: number, action: AdminFilePolicyAction, downloadLimit?: number) => {
  isBatchActionRunning.value = true
  try {
    await FileService.applyAdminFilePolicyAction({
      id,
      action,
      downloadLimit
    })
    alertStore.showAlert(t('fileManage.policyActionApplied'), 'success')
    await loadFiles()
  } catch {
    alertStore.showAlert(t('fileManage.policyActionFailed'), 'error')
  } finally {
    isBatchActionRunning.value = false
  }
}

const applyBatchPolicyAction = async (action: AdminFilePolicyAction, downloadLimit?: number) => {
  isBatchActionRunning.value = true
  try {
    const res = await FileService.applyAdminBatchPolicyAction({
      ids: selectedFileIds.value,
      action,
      downloadLimit
    })
    if (res.detail) {
      const updatedCount = res.detail.updatedCount || res.detail.updated_count || 0
      alertStore.showAlert(t('fileManage.batchPolicyActionSuccess', { count: updatedCount }), 'success')
    }
    await loadFiles()
  } catch {
    alertStore.showAlert(t('fileManage.batchPolicyActionFailed'), 'error')
  } finally {
    isBatchActionRunning.value = false
  }
}

// ============ 收件箱列表 ============
const collectionList = ref<AdminCollectionItem[]>([])
const collectionParams = ref({
  page: 1,
  size: 10,
  total: 0,
  keyword: '',
  status: '' as '' | 'active' | 'expired',
  sortBy: 'created_at' as 'created_at' | 'expired_at' | 'title' | 'max_files' | 'delivery_expired_at' | 'retrieve_expired_at',
  sortOrder: 'desc' as 'asc' | 'desc'
})
const collectionSummary = ref<CollectionSummary>({
  totalCollections: 0,
  activeCollections: 0,
  expiredCollections: 0,
  expiringSoonCollections: 0,
  permanentCollections: 0,
  totalFiles: 0,
  filteredFiles: 0
})
const selectedCollectionIds = ref<number[]>([])
const isCollectionsLoading = ref(false)

// 文件弹窗
const showFilesModal = ref(false)
const selectedCollection = ref<AdminCollectionItem | null>(null)
const collectionFiles = ref<CollectionFileItem[]>([])

// 收件箱编辑弹窗
const showCollectionEditModal = ref(false)
const editingCollection = ref<AdminCollectionItem | null>(null)
const isCollectionSaving = ref(false)
const collectionEditForm = ref({
  title: '',
  description: '',
  max_files: 10 as number
})

const toggleSelectCollection = (id: number) => {
  const index = selectedCollectionIds.value.indexOf(id)
  if (index > -1) {
    selectedCollectionIds.value.splice(index, 1)
  } else {
    selectedCollectionIds.value.push(id)
  }
}

const toggleSelectAllCollections = () => {
  if (selectedCollectionIds.value.length === collectionList.value.length) {
    selectedCollectionIds.value = []
  } else {
    selectedCollectionIds.value = collectionList.value.map(c => c.id)
  }
}

const clearSelectedCollections = () => {
  selectedCollectionIds.value = []
}

const loadCollections = async () => {
  isCollectionsLoading.value = true
  try {
    const { page, size, keyword, status, sortBy, sortOrder } = collectionParams.value
    const res = await CollectionService.getAdminCollectionList({
      page, size,
      keyword: keyword || undefined,
      status: status || undefined,
      sortBy,
      sortOrder
    })
    if (res.detail) {
      collectionList.value = res.detail.data
      collectionParams.value.total = res.detail.total
      if (res.detail.summary) {
        Object.assign(collectionSummary.value, res.detail.summary)
      }
      selectedCollectionIds.value = []
    }
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.loadFailed'), 'error')
  } finally {
    isCollectionsLoading.value = false
  }
}

// 点击收件箱统计卡片快速筛选
const filterByCollectionCard = (card: 'total' | 'active' | 'expired' | 'expiring_soon' | 'permanent') => {
  collectionParams.value.page = 1
  switch (card) {
    case 'total':
      collectionParams.value.status = ''
      break
    case 'active':
      collectionParams.value.status = 'active'
      break
    case 'expired':
      collectionParams.value.status = 'expired'
      break
    case 'expiring_soon':
      // 收件箱列表后端不直接支持此筛选，跳转到 active 并提示
      collectionParams.value.status = 'active'
      break
    case 'permanent':
      collectionParams.value.status = ''
      break
  }
  loadCollections()
}

const refreshCollections = () => {
  collectionParams.value.page = 1
  loadCollections()
}

const deleteCollection = async (id: number) => {
  if (!window.confirm(t('admin.unifiedManage.deleteConfirm'))) return
  try {
    await CollectionService.deleteCollection(id)
    await loadCollections()
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.deleteFailed'), 'error')
  }
}

const batchDeleteCollections = async () => {
  if (!window.confirm(t('admin.unifiedManage.batchDeleteConfirm', { count: selectedCollectionIds.value.length }))) return
  try {
    await CollectionService.batchDeleteCollections(selectedCollectionIds.value)
    await loadCollections()
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.deleteFailed'), 'error')
  }
}

const showCollectionFiles = async (col: AdminCollectionItem) => {
  selectedCollection.value = col
  try {
    const res = await CollectionService.getAdminCollectionFiles(col.id)
    const detail = res.detail as { files?: CollectionFileItem[]; total?: number } | undefined
    collectionFiles.value = detail?.files || []
    showFilesModal.value = true
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.loadFilesFailed'), 'error')
  }
}

// 收件箱详情弹窗
const showCollectionDetailModal = ref(false)
const collectionDetailData = ref<AdminCollectionItem | null>(null)
const collectionDetailFiles = ref<CollectionFileItem[]>([])
const collectionDetailLoading = ref(false)

const openCollectionDetail = async (col: AdminCollectionItem) => {
  showCollectionDetailModal.value = true
  collectionDetailLoading.value = true
  collectionDetailData.value = { ...col }
  collectionDetailFiles.value = []
  try {
    const res = await CollectionService.getAdminCollectionFiles(col.id)
    const detail = res.detail as { files?: CollectionFileItem[]; total?: number } | undefined
    collectionDetailFiles.value = detail?.files || []
  } catch {
    // 文件列表加载失败时仍展示收件箱基本信息
  } finally {
    collectionDetailLoading.value = false
  }
}

const closeCollectionDetailModal = () => {
  showCollectionDetailModal.value = false
  collectionDetailData.value = null
  collectionDetailFiles.value = []
}

// 复制任意文本到剪贴板（用于详情弹窗中复制码）
const copyText = async (text: string) => {
  if (!text) {
    alertStore.showAlert(t('common.copyFailed'), 'error')
    return
  }
  try {
    await copyToClipboard(text)
    alertStore.showAlert(t('common.copySuccess'), 'success')
  } catch {
    alertStore.showAlert(t('common.copyFailed'), 'error')
  }
}

// 详情弹窗中复制收件箱文件链接
const copyCollectionFileLinkFromDetail = async (file: CollectionFileItem) => {
  if (!collectionDetailData.value) return
  try {
    const url = CollectionService.getDownloadUrl(file.id, collectionDetailData.value.collection_code)
    await copyToClipboard(url)
    alertStore.showAlert(t('fileManage.shareUrlCopied'), 'success')
  } catch {
    alertStore.showAlert(t('common.copyFailed'), 'error')
  }
}

// 详情弹窗中下载收件箱文件
const downloadCollectionFileFromDetail = (file: CollectionFileItem) => {
  if (!collectionDetailData.value) return
  try {
    const url = CollectionService.getDownloadUrl(file.id, collectionDetailData.value.collection_code)
    window.open(url, '_blank')
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.downloadFailed'), 'error')
  }
}

const refreshCollectionFiles = async () => {
  if (!selectedCollection.value) return
  try {
    const res = await CollectionService.getAdminCollectionFiles(selectedCollection.value.id)
    const detail = res.detail as { files?: CollectionFileItem[]; total?: number } | CollectionFileItem[] | undefined
    collectionFiles.value = Array.isArray(detail) ? detail : (detail?.files || [])
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.loadFilesFailed'), 'error')
  }
}

const downloadCollectionFile = (file: CollectionFileItem) => {
  if (!selectedCollection.value) return
  try {
    const url = CollectionService.getDownloadUrl(file.id, selectedCollection.value.collection_code)
    window.open(url, '_blank')
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.downloadFailed'), 'error')
  }
}

const downloadCollectionZip = (col: AdminCollectionItem) => {
  try {
    const url = CollectionService.getZipDownloadUrl(col.collection_code)
    window.open(url, '_blank')
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.downloadFailed'), 'error')
  }
}

const copyCollectionFileLink = async (file: CollectionFileItem) => {
  if (!selectedCollection.value) return
  try {
    const url = CollectionService.getDownloadUrl(file.id, selectedCollection.value.collection_code)
    await copyToClipboard(url)
    alertStore.showAlert(t('fileManage.shareUrlCopied'), 'success')
  } catch {
    alertStore.showAlert(t('common.copyFailed'), 'error')
  }
}

const deleteCollectionFile = async (fileId: number) => {
  if (!window.confirm(t('manage.fileManage.deleteConfirm'))) return
  try {
    await CollectionService.deleteFile(fileId)
    await refreshCollectionFiles()
    await loadCollections()
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.deleteFailed'), 'error')
  }
}

const copyCollectionLink = async (col: AdminCollectionItem) => {
  if (!col.retrieve_code) {
    alertStore.showAlert(t('common.copyFailed'), 'error')
    return
  }
  try {
    const url = buildCollectionRetrieveUrl(col.retrieve_code)
    await copyToClipboard(url)
    alertStore.showAlert(t('fileManage.shareUrlCopied'), 'success')
  } catch {
    alertStore.showAlert(t('common.copyFailed'), 'error')
  }
}

const copyDeliveryLink = async (col: AdminCollectionItem) => {
  if (!col.delivery_code) {
    alertStore.showAlert(t('common.copyFailed'), 'error')
    return
  }
  try {
    const url = buildDeliveryUploadUrl(col.delivery_code)
    await copyToClipboard(url)
    alertStore.showAlert(t('fileManage.shareUrlCopied'), 'success')
  } catch {
    alertStore.showAlert(t('common.copyFailed'), 'error')
  }
}

const openCollectionEditModal = (col: AdminCollectionItem) => {
  editingCollection.value = col
  collectionEditForm.value = {
    title: col.title || '',
    description: col.description || '',
    max_files: col.max_files
  }
  showCollectionEditModal.value = true
}

const closeCollectionEditModal = () => {
  showCollectionEditModal.value = false
  editingCollection.value = null
  collectionEditForm.value = {
    title: '',
    description: '',
    max_files: 10
  }
}

const saveCollectionEdit = async () => {
  if (!editingCollection.value) return
  if (!collectionEditForm.value.title.trim()) {
    alertStore.showAlert(t('admin.unifiedManage.name'), 'warning')
    return
  }
  if (!collectionEditForm.value.max_files || collectionEditForm.value.max_files < 1) {
    alertStore.showAlert(t('admin.unifiedManage.fileCount'), 'warning')
    return
  }
  isCollectionSaving.value = true
  try {
    await CollectionService.updateConfig(editingCollection.value.collection_code, {
      title: collectionEditForm.value.title,
      description: collectionEditForm.value.description,
      max_files: collectionEditForm.value.max_files
    })
    closeCollectionEditModal()
    await loadCollections()
    alertStore.showAlert(t('common.saveSuccess'), 'success')
  } catch {
    alertStore.showAlert(t('manage.fileManage.deleteFailed'), 'error')
  } finally {
    isCollectionSaving.value = false
  }
}

// ============ 收件箱批量操作 ============
const isCollectionBatchActionRunning = ref(false)
const showCollectionBatchEditModal = ref(false)
const collectionBatchEditForm = ref({
  editDeliveryExpire: false,
  delivery_expire_style: 'day' as 'day' | 'hour' | 'minute' | 'count' | 'forever',
  delivery_expire_value: 7 as number,
  editRetrieveExpire: false,
  retrieve_expire_style: 'day' as 'day' | 'hour' | 'minute' | 'count' | 'forever',
  retrieve_expire_value: 7 as number,
  editMaxFiles: false,
  max_files: 20 as number
})

// 根据策略动作计算投件码/取件码的过期配置
const resolveCollectionPolicyConfig = (action: 'extend_24h' | 'extend_7d' | 'make_permanent') => {
  switch (action) {
    case 'extend_24h':
      return { style: 'hour', value: 24 }
    case 'extend_7d':
      return { style: 'day', value: 7 }
    case 'make_permanent':
      // 设为永久：仅当收件箱本身为永久时才会成功，否则后端会拒绝该项
      return { style: 'forever', value: 0 }
  }
}

const applyCollectionBatchPolicyAction = async (action: 'extend_24h' | 'extend_7d' | 'make_permanent') => {
  if (selectedCollectionIds.value.length === 0) return
  isCollectionBatchActionRunning.value = true
  const cfg = resolveCollectionPolicyConfig(action)
  const selected = collectionList.value.filter(c => selectedCollectionIds.value.includes(c.id))
  let successCount = 0
  let failCount = 0
  for (const col of selected) {
    try {
      await CollectionService.updateConfig(col.collection_code, {
        delivery_expire_style: cfg.style,
        delivery_expire_value: cfg.value,
        retrieve_expire_style: cfg.style,
        retrieve_expire_value: cfg.value
      })
      successCount++
    } catch {
      failCount++
    }
  }
  await loadCollections()
  if (successCount > 0) {
    alertStore.showAlert(t('fileManage.collectionBatchPolicySuccess', { count: successCount }) + (failCount > 0 ? ` (失败 ${failCount})` : ''), 'success')
  } else {
    alertStore.showAlert(t('fileManage.collectionBatchPolicyFailed'), 'error')
  }
  isCollectionBatchActionRunning.value = false
}

const openCollectionBatchEditModal = () => {
  if (selectedCollectionIds.value.length === 0) return
  collectionBatchEditForm.value = {
    editDeliveryExpire: false,
    delivery_expire_style: 'day',
    delivery_expire_value: 7,
    editRetrieveExpire: false,
    retrieve_expire_style: 'day',
    retrieve_expire_value: 7,
    editMaxFiles: false,
    max_files: 20
  }
  showCollectionBatchEditModal.value = true
}

const closeCollectionBatchEditModal = () => {
  showCollectionBatchEditModal.value = false
}

const saveCollectionBatchEdit = async () => {
  if (selectedCollectionIds.value.length === 0) return
  if (!collectionBatchEditForm.value.editDeliveryExpire &&
      !collectionBatchEditForm.value.editRetrieveExpire &&
      !collectionBatchEditForm.value.editMaxFiles) {
    alertStore.showAlert(t('fileManage.batchToolbarHint'), 'warning')
    return
  }
  isCollectionBatchActionRunning.value = true
  const selected = collectionList.value.filter(c => selectedCollectionIds.value.includes(c.id))
  let successCount = 0
  let failCount = 0
  for (const col of selected) {
    try {
      const payload: UpdateCollectionConfigRequest = {}
      if (collectionBatchEditForm.value.editDeliveryExpire) {
        payload.delivery_expire_style = collectionBatchEditForm.value.delivery_expire_style
        payload.delivery_expire_value = collectionBatchEditForm.value.delivery_expire_value
      }
      if (collectionBatchEditForm.value.editRetrieveExpire) {
        payload.retrieve_expire_style = collectionBatchEditForm.value.retrieve_expire_style
        payload.retrieve_expire_value = collectionBatchEditForm.value.retrieve_expire_value
      }
      if (collectionBatchEditForm.value.editMaxFiles) {
        payload.max_files = collectionBatchEditForm.value.max_files
      }
      if (Object.keys(payload).length > 0) {
        await CollectionService.updateConfig(col.collection_code, payload)
      }
      successCount++
    } catch {
      failCount++
    }
  }
  closeCollectionBatchEditModal()
  await loadCollections()
  if (successCount > 0) {
    alertStore.showAlert(t('fileManage.batchUpdateCollectionsSuccess', { count: successCount }) + (failCount > 0 ? ` (失败 ${failCount})` : ''), 'success')
  } else {
    alertStore.showAlert(t('fileManage.batchUpdateCollectionsFailed'), 'error')
  }
  isCollectionBatchActionRunning.value = false
}

onMounted(() => {
  loadFiles()
  loadCollections()
})
</script>
