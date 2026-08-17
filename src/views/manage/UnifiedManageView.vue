<template>
  <div class="p-6 overflow-y-auto custom-scrollbar">
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
            ? 'border-indigo-500'
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
        {{ t(tabLabelKey[tab.key]) }}
      </button>
    </div>

    <!-- 搜索栏（共用） -->
    <div class="mb-4 flex gap-4">
      <div class="relative flex-1">
        <input
          type="text"
          :value="currentKeyword"
          @input="currentKeyword = ($event.target as HTMLInputElement).value"
          @keyup.enter="reloadCurrentTab"
          :class="[
            isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900',
            'w-full pl-10 pr-10 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500'
          ]"
          :placeholder="activeTab === 'files' ? t('manage.fileManage.searchPlaceholder') : activeTab === 'collections' ? t('admin.unifiedManage.searchCollection') : t('admin.unifiedManage.searchRoom')"
        />
        <SearchIcon class="absolute left-3 top-3 w-5 h-5" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" />
        <button
          v-if="currentKeyword"
          @click="clearSearch"
          class="absolute right-3 top-2.5 p-0.5 rounded-full transition-colors"
          :class="[isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700']"
          :title="t('admin.unifiedManage.clearSearch')"
        >
          <XIcon class="w-4 h-4" />
        </button>
      </div>
      <!-- 状态筛选（多选下拉，置于搜索按钮前；选择仅暂存，点击查询按钮后生效，active+expired=全部） -->
      <ThemeDropdown
        :options="statusFilterOptions"
        :model-value="statusFilterSel"
        multi
        width="w-28"
        :placeholder="t('admin.unifiedManage.filterStatus')"
        @update:model-value="statusFilterSel = $event as string[]"
      />
      <button @click="reloadCurrentTab" class="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">
        {{ t('common.search') }}
      </button>
    </div>

    <!-- 汇总统计条（当前 Tab 列表的统计概览） -->
    <div v-if="activeTab === 'files'" class="mb-3 flex items-center gap-4 flex-wrap text-sm" :class="[mutedTextColor]">
      <span>{{ t('admin.unifiedManage.statsFiles') }}：<b :class="[primaryTextClass]">{{ fileList.length }}</b></span>
      <span>{{ t('admin.unifiedManage.statsTotalSize') }}：<b :class="[primaryTextClass]">{{ formatFileSize(fileTotalSize) }}</b></span>
      <span>{{ t('admin.unifiedManage.statsRetrievals') }}：<b :class="[primaryTextClass]">{{ fileTotalUsed }}</b></span>
    </div>
    <div v-else-if="activeTab === 'rooms'" class="mb-3 flex items-center gap-4 flex-wrap text-sm" :class="[mutedTextColor]">
      <span>{{ t('admin.unifiedManage.statsOnline') }}：<b :class="[primaryTextClass]">{{ roomTotalOnline }}</b></span>
      <span>{{ t('admin.unifiedManage.statusActive') }}：<b :class="[primaryTextClass]">{{ roomActiveCount }}</b></span>
      <span>{{ t('admin.unifiedManage.statusExpired') }}：<b :class="[primaryTextClass]">{{ roomExpiredCount }}</b></span>
    </div>

    <!-- 文件列表 Tab -->
    <div v-if="activeTab === 'files'">
      <!-- 批量操作栏 -->
      <div v-if="selectedFileIds.size > 0" class="mb-3 flex items-center gap-3 rounded-lg border px-4 py-2.5 flex-wrap"
        :class="[isDarkMode ? 'border-indigo-700 bg-indigo-900/20' : 'border-indigo-200 bg-indigo-50']">
        <span class="text-sm" :class="[isDarkMode ? 'text-indigo-300' : 'text-indigo-700']">
          {{ t('admin.unifiedManage.selectedCount', { count: selectedFileIds.size }) }}
        </span>
        <button @click="batchCopyFileLinks" class="text-sm font-medium text-indigo-500 hover:text-indigo-700">
          {{ t('admin.unifiedManage.batchCopyLinks') }}
        </button>
        <button @click="batchCopyFileCodes" class="text-sm font-medium text-indigo-500 hover:text-indigo-700">
          {{ t('admin.unifiedManage.batchCopyCodes') }}
        </button>
        <button @click="batchDeleteFiles" class="text-sm font-medium text-red-500 hover:text-red-700">
          {{ t('admin.unifiedManage.batchDelete') }}
        </button>
        <button @click="selectedFileIds.clear()" class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ t('common.cancel') }}
        </button>
      </div>

      <!-- 文件表格：名称 / 取件码 / 文件数 / 取件次数 / 状态 / 创建时间 / 过期时间 / 操作 -->
      <div class="overflow-auto rounded-lg border max-h-[68vh] custom-scrollbar" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
        <table class="min-w-full divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-200']">
          <thead class="sticky top-0 z-10" :class="[isDarkMode ? 'bg-gray-900' : 'bg-gray-50']">
            <tr>
              <th class="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  :checked="allFilesSelected"
                  @change="toggleSelectAllFiles"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortFilesBy('prefix')">{{ t('manage.fileManage.headers.name') }}{{ sortArrow(fileSort, 'prefix') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.retrievalCode') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortFilesBy('file_count')">{{ t('admin.unifiedManage.filesCount') }}{{ sortArrow(fileSort, 'file_count') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortFilesBy('used_count')">{{ t('admin.unifiedManage.retrievalCount') }}{{ sortArrow(fileSort, 'used_count') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.status') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortFilesBy('created_at')">{{ t('admin.unifiedManage.createdAt') }}{{ sortArrow(fileSort, 'created_at') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortFilesBy('expired_at')">{{ t('manage.fileManage.headers.expireInfo') }}{{ sortArrow(fileSort, 'expired_at') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-100']">
            <tr v-if="visibleFileList.length === 0">
              <td colspan="9" class="px-4 py-6 text-center text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('common.noData') }}</td>
            </tr>
            <template v-for="file in visibleFileList" :key="file.id">
              <tr class="hover:bg-opacity-50 transition-colors" :class="[isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50']">
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    :checked="selectedFileIds.has(file.id)"
                    @change="toggleSelectFile(file.id)"
                    class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2 min-w-0">
                    <FileIcon class="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span class="text-sm truncate max-w-[160px]" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                      {{ file.prefix || file.code }}
                      <span v-if="file.remark" class="text-xs opacity-60 block truncate">{{ file.remark }}</span>
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="flex items-center gap-1.5 text-sm font-mono" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                    {{ file.code }}
                    <button @click="copyText(file.code)" class="text-gray-400 hover:text-indigo-500 transition-colors" :title="t('common.copy')">
                      <CopyIcon class="w-3.5 h-3.5" />
                    </button>
                    <button @click="copyFileLink(file)" class="text-gray-400 hover:text-indigo-500 transition-colors" :title="t('admin.unifiedManage.copyLink')">
                      <LinkIcon class="w-3.5 h-3.5" />
                    </button>
                  </span>
                </td>
                <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ file.is_multi_file ? (file.file_count || 0) : 1 }}</td>
                <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ file.used_count }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="isFileExpired(file)
                      ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                      : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')">
                    {{ isFileExpired(file) ? t('admin.unifiedManage.expired') : t('admin.unifiedManage.active') }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ file.displayCreatedAt || '-' }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="[
                    file.expired_at
                      ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800')
                      : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800')
                  ]">{{ file.displayExpiredAt }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <button @click="showFileDetail(file)" class="text-xs text-sky-500 hover:text-sky-700" :title="t('admin.unifiedManage.view')">
                      <EyeIcon class="w-4 h-4" />
                    </button>
                    <QuickExtendMenu target="file" :item="file" @extended="reloadAll" />
                    <button @click="openManage('file', file)" class="text-xs text-indigo-500 hover:text-indigo-700" :title="t('admin.unifiedManage.manage')">
                      <Settings2Icon class="w-4 h-4" />
                    </button>
                    <button @click="deleteFile(file.id)" class="text-xs text-red-500 hover:text-red-700">
                      <TrashIcon class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex justify-between items-center flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ t('components.pagination.showing') }} {{ (fileParams.page - 1) * fileParams.size + 1 }}-{{ Math.min(fileParams.page * fileParams.size, fileParams.total) }} {{ t('components.pagination.of') }} {{ fileParams.total }} {{ t('components.pagination.total') }}
          </span>
          <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.itemsPerPage') }}</span>
          <ThemeDropdown :options="pageSizeOptions" :model-value="String(fileParams.size)" size="sm" width="w-16" @update:model-value="onFilePageSize($event as string)" />
        </div>
        <div class="flex gap-2 items-center">
          <button @click="fileParams.page > 1 && (fileParams.page--, loadFiles())" :disabled="fileParams.page <= 1"
            class="btn-secondary" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.previous') }}</button>
          <button @click="fileParams.page * fileParams.size < fileParams.total && (fileParams.page++, loadFiles())" :disabled="fileParams.page * fileParams.size >= fileParams.total"
            class="btn-secondary" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.next') }}</button>
        </div>
      </div>
    </div>

    <!-- 收件箱列表 Tab -->
    <div v-if="activeTab === 'collections'">
      <!-- 批量操作栏 -->
      <div v-if="selectedCollectionIds.size > 0" class="mb-3 flex items-center gap-3 rounded-lg border px-4 py-2.5 flex-wrap"
        :class="[isDarkMode ? 'border-indigo-700 bg-indigo-900/20' : 'border-indigo-200 bg-indigo-50']">
        <span class="text-sm" :class="[isDarkMode ? 'text-indigo-300' : 'text-indigo-700']">
          {{ t('admin.unifiedManage.selectedCount', { count: selectedCollectionIds.size }) }}
        </span>
        <button @click="batchCopyCollectionCodes" class="text-sm font-medium text-indigo-500 hover:text-indigo-700">
          {{ t('admin.unifiedManage.batchCopyCodes') }}
        </button>
        <button @click="batchDeleteCollections" class="text-sm font-medium text-red-500 hover:text-red-700">
          {{ t('admin.unifiedManage.batchDelete') }}
        </button>
        <button @click="selectedCollectionIds.clear()" class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ t('common.cancel') }}
        </button>
      </div>

      <!-- 收件箱表格 -->
      <div class="overflow-auto rounded-lg border max-h-[68vh] custom-scrollbar" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
        <table class="min-w-full divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-200']">
          <thead class="sticky top-0 z-10" :class="[isDarkMode ? 'bg-gray-900' : 'bg-gray-50']">
            <tr>
              <th class="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  :checked="allCollectionsSelected"
                  @change="toggleSelectAllCollections"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortCollectionsBy('title')">{{ t('admin.unifiedManage.name') }}{{ sortArrow(collectionSort, 'title') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.adminCode') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.retrieveCode') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.deliveryCode') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortCollectionsBy('file_count')">{{ t('admin.unifiedManage.filesCount') }}{{ sortArrow(collectionSort, 'file_count') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortCollectionsBy('used_count')">{{ t('admin.unifiedManage.retrievalCount') }}{{ sortArrow(collectionSort, 'used_count') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.status') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortCollectionsBy('created_at')">{{ t('admin.unifiedManage.createdAt') }}{{ sortArrow(collectionSort, 'created_at') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.expireInfo') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-100']">
            <tr v-if="visibleCollectionList.length === 0">
              <td colspan="11" class="px-4 py-6 text-center text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('common.noData') }}</td>
            </tr>
            <tr v-for="col in visibleCollectionList" :key="col.id" class="hover:bg-opacity-50 transition-colors" :class="[isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50']">
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="selectedCollectionIds.has(col.id)"
                  @change="toggleSelectCollection(col.id)"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </td>
              <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <div class="flex items-center gap-2">
                  <InboxIcon class="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <span class="truncate max-w-[120px]">{{ col.title || '-' }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">
                <span class="flex items-center gap-1.5">
                  {{ col.collection_code }}
                  <button @click="copyText(col.collection_code)" class="text-gray-400 hover:text-indigo-500 transition-colors" :title="t('common.copy')">
                    <CopyIcon class="w-3.5 h-3.5" />
                  </button>
                  <button @click="copyCollectionManageLink(col)" class="text-gray-400 hover:text-indigo-500 transition-colors" :title="t('admin.unifiedManage.copyLink')">
                    <LinkIcon class="w-3.5 h-3.5" />
                  </button>
                </span>
              </td>
              <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-emerald-400' : 'text-emerald-600']">
                <span class="flex items-center gap-1.5">
                  {{ col.retrieve_code || '-' }}
                  <template v-if="col.retrieve_code">
                    <button @click="copyText(col.retrieve_code)" class="text-gray-400 hover:text-emerald-500 transition-colors" :title="t('common.copy')">
                      <CopyIcon class="w-3.5 h-3.5" />
                    </button>
                    <button @click="copyCollectionRetrieveLink(col)" class="text-gray-400 hover:text-emerald-500 transition-colors" :title="t('admin.unifiedManage.copyLink')">
                      <LinkIcon class="w-3.5 h-3.5" />
                    </button>
                  </template>
                </span>
              </td>
              <td class="px-4 py-3 text-sm font-mono" :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']">
                <span class="flex items-center gap-1.5">
                  {{ col.delivery_code }}
                  <button @click="copyText(col.delivery_code)" class="text-gray-400 hover:text-amber-500 transition-colors" :title="t('common.copy')">
                    <CopyIcon class="w-3.5 h-3.5" />
                  </button>
                  <button @click="copyCollectionDeliveryLink(col)" class="text-gray-400 hover:text-amber-500 transition-colors" :title="t('admin.unifiedManage.copyLink')">
                    <LinkIcon class="w-3.5 h-3.5" />
                  </button>
                </span>
              </td>
              <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ col.file_count }}/{{ col.max_files }}</td>
              <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">{{ col.used_count ?? 0 }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[
                  col.is_expired
                    ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                    : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                ]">{{ col.is_expired ? t('admin.unifiedManage.expired') : t('admin.unifiedManage.active') }}</span>
              </td>
              <td class="px-4 py-3 text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ col.displayCreatedAt || '-' }}</td>
              <td class="px-4 py-3 text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                <div>整箱：{{ formatExpireAt(col.expired_at, col.expire_style, (col.delivery_count ?? 0) - (col.delivery_used_count ?? 0)) }}</div>
                <div class="mt-0.5">投递：{{ formatExpireAt(col.delivery_expired_at, col.delivery_expire_style, (col.delivery_count ?? 0) - (col.delivery_used_count ?? 0)) }}</div>
                <div class="mt-0.5">取件：{{ formatExpireAt(col.retrieve_expired_at, col.retrieve_expire_style) }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button @click="showCollectionFiles(col)" class="text-xs text-sky-500 hover:text-sky-700" :title="t('admin.unifiedManage.view')">
                    <EyeIcon class="w-4 h-4" />
                  </button>
                  <QuickExtendMenu target="collection" :item="col" @extended="reloadAll" />
                  <button @click="openManage('collection', col)" class="text-xs text-indigo-500 hover:text-indigo-700" :title="t('admin.unifiedManage.manage')">
                    <Settings2Icon class="w-4 h-4" />
                  </button>
                  <button @click="deleteCollection(col.id)" class="text-xs text-red-500 hover:text-red-700">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex justify-between items-center flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ t('components.pagination.showing') }} {{ (collectionParams.page - 1) * collectionParams.size + 1 }}-{{ Math.min(collectionParams.page * collectionParams.size, collectionParams.total) }} {{ t('components.pagination.of') }} {{ collectionParams.total }} {{ t('components.pagination.total') }}
          </span>
          <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.itemsPerPage') }}</span>
          <ThemeDropdown :options="pageSizeOptions" :model-value="String(collectionParams.size)" size="sm" width="w-16" @update:model-value="onCollectionPageSize($event as string)" />
        </div>
        <div class="flex gap-2 items-center">
          <button @click="collectionParams.page > 1 && (collectionParams.page--, loadCollections())" :disabled="collectionParams.page <= 1"
            class="btn-secondary" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.previous') }}</button>
          <button @click="collectionParams.page * collectionParams.size < collectionParams.total && (collectionParams.page++, loadCollections())" :disabled="collectionParams.page * collectionParams.size >= collectionParams.total"
            class="btn-secondary" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.next') }}</button>
        </div>
      </div>
    </div>

    <!-- 房间管理 Tab（聊天/传输/直连合并） -->
    <div v-if="activeTab === 'rooms'">
      <!-- 批量操作栏 -->
      <div v-if="selectedRoomIds.size > 0" class="mb-3 flex items-center gap-3 rounded-lg border px-4 py-2.5 flex-wrap"
        :class="[isDarkMode ? 'border-indigo-700 bg-indigo-900/20' : 'border-indigo-200 bg-indigo-50']">
        <span class="text-sm" :class="[isDarkMode ? 'text-indigo-300' : 'text-indigo-700']">
          {{ t('admin.unifiedManage.selectedCount', { count: selectedRoomIds.size }) }}
        </span>
        <button @click="batchCopyRoomLinks" class="text-sm font-medium text-indigo-500 hover:text-indigo-700">
          {{ t('admin.unifiedManage.batchCopyLinks') }}
        </button>
        <button @click="batchDeleteRooms" class="text-sm font-medium text-red-500 hover:text-red-700">
          {{ t('admin.unifiedManage.batchDelete') }}
        </button>
        <button @click="selectedRoomIds.clear()" class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ t('common.cancel') }}
        </button>
      </div>

      <!-- 房间表格：名称 / 房间码 / 访问人员 / 状态 / 创建时间 / 过期时间 / 操作 -->
      <div class="overflow-auto rounded-lg border max-h-[68vh] custom-scrollbar" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
        <table class="min-w-full divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-200']">
          <thead class="sticky top-0 z-10" :class="[isDarkMode ? 'bg-gray-900' : 'bg-gray-50']">
            <tr>
              <th class="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  :checked="allRoomsSelected"
                  @change="toggleSelectAllRooms"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortRoomsBy('title')">{{ t('admin.unifiedManage.name') }}{{ sortArrow(roomSort, 'title') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.spaceCode') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortRoomsBy('online_count')">{{ t('admin.unifiedManage.accessCount') }}{{ sortArrow(roomSort, 'online_count') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.status') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']" @click="sortRoomsBy('created_at')">{{ t('admin.unifiedManage.createdAt') }}{{ sortArrow(roomSort, 'created_at') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('admin.unifiedManage.expireInfo') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('manage.fileManage.headers.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y" :class="[isDarkMode ? 'divide-gray-700' : 'divide-gray-100']">
            <tr v-if="visibleRoomList.length === 0">
              <td colspan="8" class="px-4 py-6 text-center text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">{{ t('common.noData') }}</td>
            </tr>
            <tr v-for="room in visibleRoomList" :key="room.id" class="hover:bg-opacity-50 transition-colors" :class="[isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50']">
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="selectedRoomIds.has(room.id)"
                  @change="toggleSelectRoom(room.id)"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </td>
              <td class="px-4 py-3 text-sm" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <div class="min-w-0">
                  <p class="truncate max-w-[160px]">{{ room.title || '-' }}</p>
                  <p class="text-xs" :class="[mutedTextColor]">
                    {{ t('admin.unifiedManage.maxMembers') }}: {{ room.max_members }}
                  </p>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="flex items-center gap-1.5 text-sm font-mono" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']">
                  {{ room.room_code }}
                  <button @click="copyText(room.room_code)" class="text-gray-400 hover:text-indigo-500 transition-colors" :title="t('common.copy')">
                    <CopyIcon class="w-3.5 h-3.5" />
                  </button>
                  <button @click="copyRoomLink(room)" class="text-gray-400 hover:text-indigo-500 transition-colors" :title="t('admin.unifiedManage.copyLink')">
                    <LinkIcon class="w-3.5 h-3.5" />
                  </button>
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 text-sm" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                  <span v-if="room.online_count > 0" class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                  {{ room.online_count }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="[
                  room.is_expired
                    ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                    : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                ]">{{ room.is_expired ? t('admin.unifiedManage.expired') : t('admin.unifiedManage.active') }}</span>
              </td>
              <td class="px-4 py-3 text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ room.displayCreatedAt }}</td>
              <td class="px-4 py-3 text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                {{ formatExpireAt(room.expired_at, room.expire_style, room.expired_count) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button @click="showRoomDetail(room)" class="text-xs text-sky-500 hover:text-sky-700" :title="t('admin.unifiedManage.view')">
                    <EyeIcon class="w-4 h-4" />
                  </button>
                  <QuickExtendMenu target="room" :item="room" @extended="reloadAll" />
                  <button @click="openManage('room', room)" class="text-xs text-indigo-500 hover:text-indigo-700" :title="t('admin.unifiedManage.manage')">
                    <Settings2Icon class="w-4 h-4" />
                  </button>
                  <button @click="deleteRoom(room)" class="text-xs text-red-500 hover:text-red-700">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex justify-between items-center flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="text-sm" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ t('components.pagination.showing') }} {{ (roomParams.page - 1) * roomParams.size + 1 }}-{{ Math.min(roomParams.page * roomParams.size, roomParams.total) }} {{ t('components.pagination.of') }} {{ roomParams.total }} {{ t('components.pagination.total') }}
          </span>
          <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.itemsPerPage') }}</span>
          <ThemeDropdown :options="pageSizeOptions" :model-value="String(roomParams.size)" size="sm" width="w-16" @update:model-value="onRoomPageSize($event as string)" />
        </div>
        <div class="flex gap-2 items-center">
          <button @click="roomParams.page > 1 && (roomParams.page--, loadRooms())" :disabled="roomParams.page <= 1"
            class="btn-secondary" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.previous') }}</button>
          <button @click="roomParams.page * roomParams.size < roomParams.total && (roomParams.page++, loadRooms())" :disabled="roomParams.page * roomParams.size >= roomParams.total"
            class="btn-secondary" :class="[isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">{{ t('components.pagination.next') }}</button>
        </div>
      </div>
    </div>

    <!-- 收件箱文件弹窗 -->
    <div v-if="showFilesModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showFilesModal = false"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6" :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold flex items-center gap-2" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <InboxIcon class="w-5 h-5 text-indigo-500" />
                {{ selectedCollection?.title || t('admin.unifiedManage.collectionFiles') }}
              </h3>
              <div class="flex items-center gap-2">
                <button @click="showFilesModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div class="space-y-2 max-h-72 overflow-y-auto">
              <div v-for="file in collectionFiles" :key="file.id"
                class="flex items-center justify-between p-3 rounded-lg" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50']">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ file.file_name }}</p>
                  <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    {{ formatFileSize(file.file_size) }}
                    <span v-if="file.uploader_name"> - {{ file.uploader_name }}</span>
                  </p>
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full" :class="[
                  file.status === 'completed' ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
                  file.status === 'uploading' ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                  (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                ]">{{ file.status }}</span>
              </div>
              <div v-if="collectionFiles.length === 0" class="text-center py-8" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                {{ t('common.noData') }}
              </div>
            </div>
            <!-- 收件箱完整数据 + 取件二维码 -->
            <div v-if="selectedCollection" class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 mt-3 items-center border-t pt-3" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-100']">
              <div class="space-y-2.5 text-sm min-w-0">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.retrieveCode') }}</span>
                  <span class="flex items-center gap-1.5 font-mono" :class="[primaryTextClass]">
                    {{ selectedCollection.retrieve_code || '-' }}
                    <template v-if="selectedCollection.retrieve_code">
                      <button @click="copyText(selectedCollection.retrieve_code)" class="text-emerald-500 hover:text-emerald-700" :title="t('common.copy')"><CopyIcon class="w-3.5 h-3.5" /></button>
                      <button @click="copyCollectionRetrieveLink(selectedCollection)" class="text-emerald-500 hover:text-emerald-700" :title="t('admin.unifiedManage.copyLink')"><LinkIcon class="w-3.5 h-3.5" /></button>
                    </template>
                  </span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.deliveryCode') }}</span>
                  <span class="flex items-center gap-1.5 font-mono" :class="[primaryTextClass]">
                    {{ selectedCollection.delivery_code }}
                    <button @click="copyText(selectedCollection.delivery_code)" class="text-amber-500 hover:text-amber-700" :title="t('common.copy')"><CopyIcon class="w-3.5 h-3.5" /></button>
                    <button @click="copyCollectionDeliveryLink(selectedCollection)" class="text-amber-500 hover:text-amber-700" :title="t('admin.unifiedManage.copyLink')"><LinkIcon class="w-3.5 h-3.5" /></button>
                  </span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.filesCount') }}</span>
                  <span :class="[primaryTextClass]">{{ selectedCollection.file_count }}/{{ selectedCollection.max_files }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.retrievalCount') }}</span>
                  <span :class="[primaryTextClass]">{{ selectedCollection.used_count ?? 0 }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.status') }}</span>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="[
                    selectedCollection.is_expired
                      ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                      : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                  ]">{{ selectedCollection.is_expired ? t('admin.unifiedManage.expired') : t('admin.unifiedManage.active') }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.createdAt') }}</span>
                  <span :class="[primaryTextClass]">{{ selectedCollection.displayCreatedAt || '-' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.expireInfo') }}</span>
                  <span class="text-right text-xs" :class="[primaryTextClass]">
                    <div>整箱：{{ formatExpireAt(selectedCollection.expired_at, selectedCollection.expire_style, (selectedCollection.delivery_count ?? 0) - (selectedCollection.delivery_used_count ?? 0)) }}</div>
                    <div>投递：{{ formatExpireAt(selectedCollection.delivery_expired_at, selectedCollection.delivery_expire_style, (selectedCollection.delivery_count ?? 0) - (selectedCollection.delivery_used_count ?? 0)) }}</div>
                    <div>取件：{{ formatExpireAt(selectedCollection.retrieve_expired_at, selectedCollection.retrieve_expire_style) }}</div>
                  </span>
                </div>
              </div>
              <!-- 取件二维码 -->
              <div v-if="selectedCollection.retrieve_code" class="flex flex-col items-center gap-1.5 bg-white p-2 rounded-xl shadow-sm border shrink-0" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
                <QRCode :value="collectionQrValue" :size="120" level="M" />
                <span class="text-[10px]" :class="[mutedTextColor]">{{ t('admin.unifiedManage.qrRetrieve') }}</span>
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
          <div class="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6" :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                {{ selectedMultiFile?.prefix || t('admin.unifiedManage.multiFileItems') }}
                <span class="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded ml-2 align-middle" :class="[isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600']">
                  {{ selectedMultiFile?.code }}
                  <button @click="copyText(selectedMultiFile?.code)" class="hover:text-indigo-500" :title="t('common.copy')"><CopyIcon class="w-3 h-3" /></button>
                  <button v-if="selectedMultiFile" @click="copyFileLink(selectedMultiFile)" class="hover:text-indigo-500" :title="t('admin.unifiedManage.copyLink')"><LinkIcon class="w-3 h-3" /></button>
                </span>
              </h3>
              <div class="flex items-center gap-2">
                <button @click="showMultiFileModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div v-for="item in multiFileItems" :key="item.id"
                class="flex items-center justify-between p-3 rounded-lg" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50']">
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

    <!-- 房间详情弹窗（在后台直接查看，无需跳转首页） -->
    <div v-if="showRoomDetailModal" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showRoomDetailModal = false"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-md rounded-2xl shadow-2xl p-6" :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold flex items-center gap-2" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <HouseIcon class="w-5 h-5 text-indigo-500" />
                {{ t('admin.unifiedManage.roomDetail') }}
              </h3>
              <button @click="showRoomDetailModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div class="space-y-2.5 text-sm" v-if="selectedRoom">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.roomCode') }}</span>
                  <span class="flex items-center gap-1.5 font-mono" :class="[primaryTextClass]">
                    {{ selectedRoom.room_code }}
                    <button @click="copyText(selectedRoom.room_code)" class="text-indigo-500 hover:text-indigo-700" :title="t('common.copy')"><CopyIcon class="w-3.5 h-3.5" /></button>
                    <button @click="copyRoomLink(selectedRoom)" class="text-indigo-500 hover:text-indigo-700" :title="t('admin.unifiedManage.copyLink')"><LinkIcon class="w-3.5 h-3.5" /></button>
                  </span>
                </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.name') }}</span>
                <span :class="[primaryTextClass]">{{ selectedRoom.title || '-' }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.onlineCount') }}</span>
                <span :class="[primaryTextClass]">{{ selectedRoom.online_count }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.maxMembers') }}</span>
                <span :class="[primaryTextClass]">{{ selectedRoom.max_members }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.status') }}</span>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="selectedRoom.is_expired
                    ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                    : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')"
                >{{ selectedRoom.is_expired ? t('admin.unifiedManage.expired') : t('admin.unifiedManage.active') }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.expireInfo') }}</span>
                <span :class="[primaryTextClass]">{{ formatExpireAt(selectedRoom.expired_at, selectedRoom.expire_style, selectedRoom.expired_count) }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.createdAt') }}</span>
                <span :class="[primaryTextClass]">{{ selectedRoom.displayCreatedAt }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.roomLink') }}</span>
                <span class="text-xs font-mono truncate max-w-[220px]" :class="[mutedTextColor]">
                  {{ buildAppUrl(`/direct/room/${selectedRoom.room_code}`) }}
                </span>
              </div>
              <!-- 房间链接二维码 -->
              <div class="flex justify-center mt-2 bg-white p-2 rounded-xl shadow-sm border shrink-0" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
                <QRCode :value="roomQrValue" :size="128" level="M" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件统一查看弹窗（记录-发件查看弹窗风格：文件/多文件/文本统一） -->
    <div v-if="showFileDetailModal && fileDetail" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showFileDetailModal = false"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-2xl rounded-2xl shadow-2xl p-6" :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold flex items-center gap-2" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <FileIcon class="w-5 h-5 text-indigo-500" />
                {{ fileDetail.prefix || fileDetail.code }}
                <span class="text-xs font-mono px-2 py-0.5 rounded" :class="[isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600']">
                  {{ fileDetail.code }}
                </span>
              </h3>
              <div class="flex items-center gap-2">
                <button @click="showFileDetailModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <!-- 文本/备注内容（文本分享内容存于 remark 字段） -->
            <pre
              v-if="fileDetail.remark"
              class="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-lg p-4 text-sm leading-relaxed mb-3"
              :class="[isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-800']"
            >{{ fileDetail.remark }}</pre>
            <!-- 子文件列表 -->
            <div v-else-if="fileDetail.is_multi_file && fileDetail.file_items?.length" class="space-y-2 max-h-96 overflow-y-auto">
              <div v-for="item in fileDetail.file_items" :key="item.id"
                class="flex items-center justify-between p-3 rounded-lg" :class="[isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50']">
                <div class="flex items-center flex-1 min-w-0">
                  <FileTextIcon class="w-4 h-4 mr-2 flex-shrink-0" :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-500']" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">{{ item.file_name }}</p>
                    <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ formatFileSize(item.file_size) }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-sm" :class="[mutedTextColor]">
              {{ t('admin.unifiedManage.fileDetailHint') }}
            </div>
            <!-- 完整数据 + 取件二维码 -->
            <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 mt-3 items-center">
              <div class="space-y-2.5 text-sm min-w-0">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.retrievalCode') }}</span>
                  <span class="flex items-center gap-1.5 font-mono" :class="[primaryTextClass]">
                    {{ fileDetail.code }}
                    <button @click="copyText(fileDetail.code)" class="text-indigo-500 hover:text-indigo-700" :title="t('common.copy')"><CopyIcon class="w-3.5 h-3.5" /></button>
                    <button @click="copyDetailFileLink" class="text-indigo-500 hover:text-indigo-700" :title="t('admin.unifiedManage.copyLink')"><LinkIcon class="w-3.5 h-3.5" /></button>
                  </span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.copyLink') }}</span>
                  <span class="text-xs font-mono truncate max-w-[220px]" :class="[mutedTextColor]">{{ fileLink(fileDetail.code) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('manage.fileManage.headers.size') }}</span>
                  <span :class="[primaryTextClass]">{{ fileDetail.displaySize || formatFileSize(fileDetail.size) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.retrievalCount') }}</span>
                  <span :class="[primaryTextClass]">{{ fileDetail.used_count ?? 0 }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.status') }}</span>
                  <span :class="[isFileExpired(fileDetail) ? 'text-red-500' : 'text-green-500']">{{ isFileExpired(fileDetail) ? t('admin.unifiedManage.expired') : t('admin.unifiedManage.active') }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('admin.unifiedManage.createdAt') }}</span>
                  <span :class="[primaryTextClass]">{{ fileDetail.displayCreatedAt || '-' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs" :class="[mutedTextColor]">{{ t('manage.fileManage.headers.expiration') }}</span>
                  <span :class="[primaryTextClass]">{{ fileDetail.displayExpiredAt || formatTimestamp(fileDetail.expired_at) || t('send.expiration.units.forever') }}</span>
                </div>
              </div>
              <!-- 取件二维码 -->
              <div class="flex flex-col items-center gap-1.5 bg-white p-2 rounded-xl shadow-sm border shrink-0" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
                <QRCode :value="fileDetailQrValue" :size="120" level="M" />
                <span class="text-[10px]" :class="[mutedTextColor]">{{ t('admin.unifiedManage.qrRetrieve') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理弹窗（设置：文件=备注+过期；收件箱=整箱/投递/取件过期；房间=人员上限+过期） -->
    <div v-if="showManageModal && manageItem" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showManageModal = false"></div>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-md rounded-2xl shadow-2xl p-6" :class="[isDarkMode ? 'bg-gray-800' : 'bg-white']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold flex items-center gap-2" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
                <Settings2Icon class="w-5 h-5 text-indigo-500" />
                {{ manageKind === 'collection' ? t('admin.unifiedManage.manageCollectionTitle') : manageKind === 'room' ? t('admin.unifiedManage.manageRoomTitle') : t('admin.unifiedManage.manageTitle') }}
              </h3>
              <button @click="showManageModal = false" class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p class="text-xs mb-4" :class="[mutedTextColor]">{{ t('admin.unifiedManage.manageDesc') }}</p>
            <div class="space-y-2.5 text-sm">
              <!-- 文件：备注编辑（文本分享内容即备注） -->
              <template v-if="manageKind === 'file'">
                <div>
                  <span class="text-xs block mb-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.editRemark') }}</span>
                  <textarea
                    v-model="editRemarkText"
                    rows="3"
                    class="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    :class="[isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']"
                    :placeholder="t('admin.unifiedManage.remarkPlaceholder')"
                  ></textarea>
                </div>
              </template>
              <!-- 房间：人员上限编辑（不超后台配置） -->
              <template v-else-if="manageKind === 'room'">
                <div>
                  <span class="text-xs block mb-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.editMaxMembers') }}</span>
                  <input
                    v-model.number="editMaxMembersNum"
                    type="number"
                    min="1"
                    :max="maxMembersLimit"
                    class="w-24 rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    :class="[isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900']"
                  />
                </div>
              </template>
            </div>
            <!-- 过期时间编辑（文件/房间：单个；收件箱：整箱/投递/取件） -->
            <div class="pt-3 mt-3 border-t space-y-4" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-100']">
              <template v-if="manageKind === 'collection'">
                <div>
                  <span class="text-xs block mb-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.collectionExpire') }}</span>
                  <ExpirationSelector
                    v-model:expiration-method="editExpireBoxStyle"
                    v-model:expiration-value="editExpireBoxValueStr"
                    :options="expireTypeOptions"
                    :label="null"
                  />
                  <p class="text-xs mt-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.expireAt') }}：{{ expireBoxPreviewText }}</p>
                </div>
                <div>
                  <span class="text-xs block mb-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.deliveryExpire') }}</span>
                  <ExpirationSelector
                    v-model:expiration-method="editExpireDeliverStyle"
                    v-model:expiration-value="editExpireDeliverValueStr"
                    :options="expireTypeOptions"
                    :label="null"
                  />
                  <p class="text-xs mt-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.expireAt') }}：{{ expireDeliverPreviewText }}</p>
                </div>
                <div>
                  <span class="text-xs block mb-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.retrieveExpire') }}</span>
                  <ExpirationSelector
                    v-model:expiration-method="editExpireRetrieveStyle"
                    v-model:expiration-value="editExpireRetrieveValueStr"
                    :options="expireTypeOptions"
                    :label="null"
                  />
                  <p class="text-xs mt-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.expireAt') }}：{{ expireRetrievePreviewText }}</p>
                </div>
              </template>
              <div v-else>
                <span class="text-xs block mb-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.editExpire') }}</span>
                <ExpirationSelector
                  v-model:expiration-method="editExpireStyle"
                  v-model:expiration-value="editExpireValueStr"
                  :options="expireTypeOptions"
                  :label="null"
                />
                <p class="text-xs mt-1.5" :class="[mutedTextColor]">{{ t('admin.unifiedManage.expireAt') }}：{{ expireSinglePreviewText }}</p>
              </div>
            </div>
            <div class="mt-6 flex gap-2">
              <button
                @click="showManageModal = false"
                class="flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                :class="[isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100']"
              >{{ t('common.close') }}</button>
              <button
                @click="saveManage"
                :disabled="savingManage || !manageDirty"
                class="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >{{ t('admin.unifiedManage.save') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, watch, onMounted, type Ref } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CopyIcon,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  HouseIcon,
  InboxIcon,
  LinkIcon,
  SearchIcon,
  Settings2Icon,
  TrashIcon,
  XIcon
} from 'lucide-vue-next'
import { useUnifiedAdmin, useClipboard } from '@/composables'
import { useAlertStore } from '@/stores/alertStore'
import { useConfirmStore } from '@/stores/confirmStore'
import { useConfigStore } from '@/stores/configStore'
import ThemeDropdown from '@/components/common/ThemeDropdown.vue'
import ExpirationSelector from '@/components/common/ExpirationSelector.vue'
import QuickExtendMenu from '@/components/common/QuickExtendMenu.vue'
import QRCode from 'qrcode.vue'
import { formatFileSize, formatTimestamp } from '@/utils/common'
import { buildAppUrl, buildRetrieveUrl } from '@/utils/share-url'
import type { AdminCollectionItem, CollectionFileItem } from '@/types/collection'
import type { AdminRoomItem } from '@/types/room'

const isDarkMode = inject('isDarkMode') as any
const { t } = useI18n()
const alertStore = useAlertStore()
const confirmStore = useConfirmStore()
const configStore = useConfigStore()
const adminApi = useUnifiedAdmin()
const { copy } = useClipboard()
const mutedTextColor = computed(() => (isDarkMode.value ? 'text-gray-400' : 'text-gray-500'))
const primaryTextClass = computed(() => (isDarkMode.value ? 'text-white' : 'text-gray-900'))

type TabKey = 'files' | 'collections' | 'rooms'

const activeTab = ref<TabKey>('files')
const tabs = [
  { key: 'files' as const, icon: FileIcon },
  { key: 'collections' as const, icon: InboxIcon },
  { key: 'rooms' as const, icon: HouseIcon },
]
const tabLabelKey: Record<TabKey, string> = {
  files: 'admin.unifiedManage.fileList',
  collections: 'admin.unifiedManage.collectionList',
  rooms: 'admin.unifiedManage.roomManage',
}

const isRoomTab = computed(() => activeTab.value === 'rooms')

// 当前搜索关键字（跨 Tab 复用同一输入框）
const currentKeyword = ref('')

const reloadCurrentTab = async () => {
  isRefreshing.value = true
  try {
    if (activeTab.value === 'files') {
      fileParams.value.page = 1
      fileParams.value.keyword = currentKeyword.value
      await loadFiles()
    } else if (activeTab.value === 'collections') {
      collectionParams.value.page = 1
      collectionParams.value.keyword = currentKeyword.value
      await loadCollections()
    } else {
      roomParams.value.page = 1
      roomParams.value.keyword = currentKeyword.value
      await loadRooms()
    }
  } finally {
    isRefreshing.value = false
  }
}

// 切到房间 Tab 且未加载过时，懒加载列表
watch(activeTab, (tab) => {
  if (tab === 'rooms' && rooms.value.length === 0) loadRooms()
})

// 复制文本（经 useClipboard 封装，自动提示）
const copyText = (text: string) => {
  if (!text) return
  void copy(text)
}

// ============ 文件列表 ============
const fileList = ref<any[]>([])
const fileParams = ref({ page: 1, size: 10, total: 0, keyword: '' })
const selectedFileIds = ref<Set<number>>(new Set())
const isRefreshing = ref(false)

// ============ 通用：列排序 / 每页条数 ============
interface SortState { key: string; dir: 1 | -1 }
const toggleSort = (state: Ref<SortState | null>, key: string) => {
  state.value = state.value?.key === key ? { key, dir: (state.value.dir * -1) as 1 | -1 } : { key, dir: 1 }
}
const sortArrow = (state: SortState | null, key: string) =>
  state?.key === key ? (state.dir === 1 ? ' ↑' : ' ↓') : ''
// 模板包装：模板内 ref 自动解包，这里显式传入 Ref 供 toggleSort 更新状态
const sortFilesBy = (key: string) => toggleSort(fileSort, key)
const sortCollectionsBy = (key: string) => toggleSort(collectionSort, key)
const sortRoomsBy = (key: string) => toggleSort(roomSort, key)
const sortList = <T extends Record<string, unknown>>(list: T[], state: SortState | null): T[] => {
  if (!state) return list
  const { key, dir } = state
  return [...list].sort((a, b) => {
    const av = a[key]; const bv = b[key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    const at = new Date(av as string).getTime(); const bt = new Date(bv as string).getTime()
    if (!isNaN(at) && !isNaN(bt)) return (at - bt) * dir
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir
  })
}
const pageSizeOptions = computed(() => [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
])

const isFileExpired = (f: any) => {
  if (f.expired_at && Number(f.expired_count) < 0) return new Date(f.expired_at).getTime() < Date.now()
  if (Number(f.expired_count) >= 0) return Number(f.expired_count) <= 0
  return false
}

const allFilesSelected = computed(
  () => fileList.value.length > 0 && fileList.value.every((f) => selectedFileIds.value.has(f.id))
)

const toggleSelectFile = (id: number) => {
  const next = new Set(selectedFileIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedFileIds.value = next
}

const toggleSelectAllFiles = () => {
  const next = new Set(selectedFileIds.value)
  if (allFilesSelected.value) {
    fileList.value.forEach((f) => next.delete(f.id))
  } else {
    fileList.value.forEach((f) => next.add(f.id))
  }
  selectedFileIds.value = next
}

const loadFiles = async () => {
  try {
    const res = await adminApi.getAdminFileList({ ...fileParams.value, status: statusQueryParam.value })
    if (res.detail) {
      fileList.value = res.detail.data.map((f: any) => ({
        ...f,
        displaySize: formatFileSize(f.size),
        displayExpiredAt: f.expire_style === 'count'
          ? `${f.expired_count}${t('common.times')}`
          : f.expired_at ? formatTimestamp(f.expired_at) : t('send.expiration.units.forever'),
        displayCreatedAt: f.created_at ? formatTimestamp(f.created_at) : '-',
      }))
      fileParams.value.total = res.detail.total
    }
  } catch (err) {
    alertStore.showAlert(t('manage.fileManage.loadFileListFailed'), 'error')
  }
}

const deleteFile = async (id: number) => {
  if (!await confirmStore.confirm({ message: t('manage.fileManage.deleteConfirm') })) return
  try {
    await adminApi.deleteAdminFile(id)
    selectedFileIds.value.delete(id)
    await loadFiles()
  } catch (err) {
    alertStore.showAlert(t('manage.fileManage.deleteFailed'), 'error')
  }
}

const batchDeleteFiles = async () => {
  const ids = [...selectedFileIds.value]
  if (ids.length === 0) return
  if (!await confirmStore.confirm({ message: t('manage.fileManage.deleteConfirm') })) return
  try {
    await Promise.all(ids.map((id) => adminApi.deleteAdminFile(id)))
    selectedFileIds.value = new Set()
    await loadFiles()
  } catch (err) {
    alertStore.showAlert(t('manage.fileManage.deleteFailed'), 'error')
  }
}

// ============ 文件列表增强：状态筛选 / 排序 / 复制链接 / 批量 / 查看 / 延长 / 管理 ============
type StatusFilter = 'all' | 'active' | 'expired'
/** 状态筛选（多选下拉，置于搜索按钮前；选择后逗号拼接作为查询条件携带到后端） */
const statusFilterSel = ref<string[]>([])
const statusFilterOptions = computed(() => [
  { value: 'active', label: t('admin.unifiedManage.statusActive') },
  { value: 'expired', label: t('admin.unifiedManage.statusExpired') },
])
/** 状态查询参数：多选逗号分隔（空或两者都选=全部） */
const statusQueryParam = computed(() => statusFilterSel.value.join(','))

const fileStatusFilters = computed(() => [
  { value: 'all' as StatusFilter, label: t('admin.unifiedManage.statusAll') },
  { value: 'active' as StatusFilter, label: t('admin.unifiedManage.statusActive') },
  { value: 'expired' as StatusFilter, label: t('admin.unifiedManage.statusExpired') },
])
const fileSort = ref<SortState | null>(null)
const visibleFileList = computed(() => sortList(fileList.value, fileSort.value))
const fileActiveCount = computed(() => fileList.value.filter((f) => !isFileExpired(f)).length)
const fileExpiredCount = computed(() => fileList.value.length - fileActiveCount.value)
const fileTotalSize = computed(() => fileList.value.reduce((s, f) => s + (Number(f.size) || 0), 0))
const fileTotalUsed = computed(() => fileList.value.reduce((s, f) => s + (Number(f.used_count) || 0), 0))
const onFilePageSize = (v: string) => {
  fileParams.value.size = Number(v)
  fileParams.value.page = 1
  void loadFiles()
}

// ============ 文件统一查看弹窗（记录-发件查看弹窗风格：文件/多文件/文本统一） ============
const showFileDetailModal = ref(false)
const fileDetail = ref<any>(null)
const showFileDetail = (file: any) => {
  fileDetail.value = file
  showFileDetailModal.value = true
}
const copyDetailFileLink = async () => {
  if (!fileDetail.value) return
  await copy(fileLink(fileDetail.value.code), { successMsg: t('admin.unifiedManage.linkCopied') })
}
/** 文件查看弹窗：取件二维码 */
const fileDetailQrValue = computed(() =>
  fileDetail.value?.code ? buildRetrieveUrl(fileDetail.value.code) : ''
)

// 收件箱查看弹窗：取件码二维码
const collectionQrValue = computed(() =>
  selectedCollection.value?.retrieve_code ? buildRetrieveUrl(selectedCollection.value.retrieve_code) : ''
)
// 房间查看弹窗：房间链接二维码
const roomQrValue = computed(() =>
  selectedRoom.value?.room_code ? buildAppUrl(`/direct/room/${selectedRoom.value.room_code}`) : ''
)

// ============ 管理弹窗（设置：文件/收件箱/房间 可编辑项） ============
const showManageModal = ref(false)
const manageKind = ref<'file' | 'collection' | 'room'>('file')
const manageItem = ref<any>(null)
/** 编辑备注（文件）/ 人员上限（房间）草稿 */
const editRemarkText = ref('')
const editMaxMembersNum = ref(10)
const savingManage = ref(false)
/** 管理弹窗：过期时间编辑（ExpirationSelector 字符串数值） */
const editExpireStyle = ref('day')
const editExpireValueStr = ref('1')
/** 收件箱三码各自过期：整箱 / 投递 / 取件 */
const editExpireBoxStyle = ref('day')
const editExpireBoxValueStr = ref('1')
const editExpireDeliverStyle = ref('day')
const editExpireDeliverValueStr = ref('1')
const editExpireRetrieveStyle = ref('day')
const editExpireRetrieveValueStr = ref('1')
/** 过期类型选项（创建时可选的类型） */
const expireTypeOptions = computed(() => [
  { value: 'day', label: t('admin.unifiedManage.extendDay') },
  { value: 'hour', label: t('admin.unifiedManage.extendHour') },
  { value: 'minute', label: t('admin.unifiedManage.extendMinute') },
  { value: 'count', label: t('admin.unifiedManage.extendCount') },
  { value: 'forever', label: t('admin.unifiedManage.extendForever') },
])
/** 过期时间直接展示：从创建时间起算（与后端重设一致）→ 到期日期；次数型 → 次数；永久 → 永久 */
const expireAtPreview = (style: string, valueStr: string): string => {
  if (style === 'forever') return t('send.expiration.units.forever')
  const value = parseInt(valueStr) || 0
  if (value <= 0) return '-'
  if (style === 'count') return `${value}${t('common.times')}`
  const base = manageItem.value?.created_at ? new Date(manageItem.value.created_at).getTime() : Date.now()
  const ms: Record<string, number> = { day: 86400000, hour: 3600000, minute: 60000 }
  return formatTimestamp(new Date(base + (ms[style] || 86400000) * value).toISOString())
}
const expireSinglePreviewText = computed(() => expireAtPreview(editExpireStyle.value, editExpireValueStr.value))
const expireBoxPreviewText = computed(() => expireAtPreview(editExpireBoxStyle.value, editExpireBoxValueStr.value))
const expireDeliverPreviewText = computed(() => expireAtPreview(editExpireDeliverStyle.value, editExpireDeliverValueStr.value))
const expireRetrievePreviewText = computed(() => expireAtPreview(editExpireRetrieveStyle.value, editExpireRetrieveValueStr.value))
/** 是否有未保存的修改（控制底部保存按钮可用性） */
const manageDirty = computed(() => {
  const item = manageItem.value
  if (!item) return false
  if (manageKind.value === 'file') {
    return editRemarkText.value !== (item.remark || '') ||
      editExpireStyle.value !== (item.expire_style || 'day') ||
      editExpireValueStr.value !== String(item.expire_value ?? 1)
  }
  if (manageKind.value === 'collection') {
    return editExpireBoxStyle.value !== (item.expire_style || 'day') ||
      editExpireBoxValueStr.value !== String(item.expire_value ?? 1) ||
      editExpireDeliverStyle.value !== (item.delivery_expire_style || 'day') ||
      editExpireDeliverValueStr.value !== String(item.delivery_expire_value ?? 1) ||
      editExpireRetrieveStyle.value !== (item.retrieve_expire_style || 'day') ||
      editExpireRetrieveValueStr.value !== String(item.retrieve_expire_value ?? 1)
  }
  return editMaxMembersNum.value !== (Number(item.max_members) || 10) ||
    editExpireStyle.value !== (item.expire_style || 'day') ||
    editExpireValueStr.value !== String(item.expire_value ?? 1)
})
const openManage = (kind: 'file' | 'collection' | 'room', item: any) => {
  manageKind.value = kind
  manageItem.value = item
  editRemarkText.value = item?.remark || ''
  editMaxMembersNum.value = Number(item?.max_members) || 10
  // 过期编辑默认值：文件/房间 → 主过期；收件箱 → 整箱/投递/取件
  if (kind === 'collection') {
    editExpireBoxStyle.value = item?.expire_style || 'day'
    editExpireBoxValueStr.value = String(item?.expire_value ?? 1)
    editExpireDeliverStyle.value = item?.delivery_expire_style || 'day'
    editExpireDeliverValueStr.value = String(item?.delivery_expire_value ?? 1)
    editExpireRetrieveStyle.value = item?.retrieve_expire_style || 'day'
    editExpireRetrieveValueStr.value = String(item?.retrieve_expire_value ?? 1)
  } else {
    editExpireStyle.value = item?.expire_style || 'day'
    editExpireValueStr.value = String(item?.expire_value ?? 1)
  }
  showManageModal.value = true
}
/** 房间人员上限最大值（后台配置） */
const maxMembersLimit = computed(() => {
  const n = Number(configStore.config.defaultMaxMembers) || 10
  return n > 0 ? n : 10
})
/** 统一保存：备注/人员上限/过期时间 一次提交 */
const saveManage = async () => {
  const item = manageItem.value
  if (!item || savingManage.value || !manageDirty.value) return
  savingManage.value = true
  try {
    if (manageKind.value === 'file') {
      const style = editExpireStyle.value
      const value = Number(editExpireValueStr.value) || 1
      await adminApi.saveAdminFileExpire(item.id, style, value)
      item.expire_style = style; item.expire_value = value
      if (editRemarkText.value !== (item.remark || '')) {
        await adminApi.updateAdminFile(item.id, editRemarkText.value)
        item.remark = editRemarkText.value
      }
    } else if (manageKind.value === 'collection') {
      const pairs: Array<[string, string, number]> = [
        ['manage', editExpireBoxStyle.value, Number(editExpireBoxValueStr.value) || 1],
        ['deliver', editExpireDeliverStyle.value, Number(editExpireDeliverValueStr.value) || 1],
        ['retrieve', editExpireRetrieveStyle.value, Number(editExpireRetrieveValueStr.value) || 1],
      ]
      for (const [target, style, value] of pairs) {
        await adminApi.saveAdminCollectionExpire(item.id, style, value, target)
      }
      item.expire_style = editExpireBoxStyle.value; item.expire_value = Number(editExpireBoxValueStr.value) || 1
      item.delivery_expire_style = editExpireDeliverStyle.value; item.delivery_expire_value = Number(editExpireDeliverValueStr.value) || 1
      item.retrieve_expire_style = editExpireRetrieveStyle.value; item.retrieve_expire_value = Number(editExpireRetrieveValueStr.value) || 1
    } else {
      const style = editExpireStyle.value
      const value = Number(editExpireValueStr.value) || 1
      await adminApi.saveAdminRoomExpire(item.id, style, value)
      item.expire_style = style; item.expire_value = value
      const members = Math.max(1, Math.min(Number(editMaxMembersNum.value) || 1, maxMembersLimit.value))
      if (members !== (Number(item.max_members) || 10)) {
        await adminApi.updateAdminRoom(item.id, members)
        item.max_members = members
        editMaxMembersNum.value = members
      }
    }
    alertStore.showAlert(t('admin.unifiedManage.saved'), 'success')
    reloadAll()
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.saveFailed'), 'error')
  } finally {
    savingManage.value = false
  }
}

/** 取件链接（与首页取件一致：/?code=xxx） */
const fileLink = (code: string) => buildRetrieveUrl(code)

const copyFileLink = async (file: any) => {
  await copy(fileLink(file.code), { successMsg: t('admin.unifiedManage.linkCopied') })
}
const batchCopyFileLinks = async () => {
  const links = [...selectedFileIds.value]
    .map((id) => fileList.value.find((f) => f.id === id))
    .filter(Boolean)
    .map((f: any) => fileLink(f.code))
    .join('\n')
  if (!links) return
  await copy(links, { successMsg: t('admin.unifiedManage.exportSuccess', { count: selectedFileIds.value.size }) })
}
const batchCopyFileCodes = async () => {
  const codes = [...selectedFileIds.value]
    .map((id) => fileList.value.find((f) => f.id === id))
    .filter(Boolean)
    .map((f: any) => f.code)
    .join('\n')
  if (!codes) return
  await copy(codes, { successMsg: t('admin.unifiedManage.exportSuccess', { count: selectedFileIds.value.size }) })
}

// 多文件查看弹窗
const showMultiFileModal = ref(false)
const selectedMultiFile = ref<any>(null)
const multiFileItems = ref<Array<{ id: number; file_name: string; file_size: number }>>([])

const showMultiFileItems = (file: any) => {
  selectedMultiFile.value = file
  multiFileItems.value = file.file_items || []
  showMultiFileModal.value = true
}

// ============ 收件箱列表 ============
const collectionList = ref<AdminCollectionItem[]>([])
const collectionParams = ref({ page: 1, size: 10, total: 0, keyword: '' })
const selectedCollectionIds = ref<Set<number>>(new Set())
const collectionSort = ref<SortState | null>(null)

const visibleCollectionList = computed(() => {
  return sortList(collectionList.value, collectionSort.value)
})
const collectionActiveCount = computed(() => collectionList.value.filter((c) => !c.is_expired).length)
const collectionExpiredCount = computed(() => collectionList.value.length - collectionActiveCount.value)
const allCollectionsSelected = computed(
  () => collectionList.value.length > 0 && collectionList.value.every((c) => selectedCollectionIds.value.has(c.id))
)
const toggleSelectCollection = (id: number) => {
  const next = new Set(selectedCollectionIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedCollectionIds.value = next
}
const toggleSelectAllCollections = () => {
  const next = new Set(selectedCollectionIds.value)
  if (allCollectionsSelected.value) collectionList.value.forEach((c) => next.delete(c.id))
  else collectionList.value.forEach((c) => next.add(c.id))
  selectedCollectionIds.value = next
}
const onCollectionPageSize = (v: string) => {
  collectionParams.value.size = Number(v)
  collectionParams.value.page = 1
  void loadCollections()
}
const batchDeleteCollections = async () => {
  const ids = [...selectedCollectionIds.value]
  if (ids.length === 0) return
  if (!await confirmStore.confirm({ message: t('admin.unifiedManage.deleteConfirm') })) return
  try {
    await Promise.all(ids.map((id) => adminApi.deleteCollection(id)))
    selectedCollectionIds.value = new Set()
    await loadCollections()
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.deleteFailed'), 'error')
  }
}
const batchCopyCollectionCodes = async () => {
  const codes = [...selectedCollectionIds.value]
    .map((id) => collectionList.value.find((c) => c.id === id))
    .filter(Boolean)
    .map((c: any) => c.retrieve_code || c.collection_code)
    .filter(Boolean)
    .join('\n')
  if (!codes) return
  await copy(codes, { successMsg: t('admin.unifiedManage.exportSuccess', { count: selectedCollectionIds.value.size }) })
}

const showFilesModal = ref(false)
const selectedCollection = ref<AdminCollectionItem | null>(null)
const collectionFiles = ref<CollectionFileItem[]>([])

const loadCollections = async () => {
  try {
    const res = await adminApi.getAdminCollectionList({ ...collectionParams.value, status: statusQueryParam.value })
    if (res.detail) {
      collectionList.value = (res.detail.data as any[]).map((c) => ({
        ...c,
        displayCreatedAt: c.created_at ? formatTimestamp(c.created_at) : '-',
      }))
      collectionParams.value.total = res.detail.total
    }
  } catch (err) {
    alertStore.showAlert(t('admin.unifiedManage.loadFailed'), 'error')
  }
}

const deleteCollection = async (id: number) => {
  if (!await confirmStore.confirm({ message: t('admin.unifiedManage.deleteConfirm') })) return
  try {
    await adminApi.deleteCollection(id)
    await loadCollections()
  } catch (err) {
    alertStore.showAlert(t('admin.unifiedManage.deleteFailed'), 'error')
  }
}

const showCollectionFiles = async (col: AdminCollectionItem) => {
  selectedCollection.value = col
  try {
    const res = await adminApi.getAdminCollectionFiles(col.id)
    collectionFiles.value = res.detail || []
    showFilesModal.value = true
  } catch (err) {
    alertStore.showAlert(t('admin.unifiedManage.loadFilesFailed'), 'error')
  }
}

// 收件箱链接：管理 / 投递 / 取件（与收件箱页面一致）
const collectionManageLink = (col: AdminCollectionItem) => buildAppUrl(`/collection/manage/${col.collection_code}`)
const collectionDeliveryLink = (col: AdminCollectionItem) => buildRetrieveUrl(col.delivery_code)
const collectionRetrieveLink = (col: AdminCollectionItem) => buildRetrieveUrl(col.retrieve_code)

const copyCollectionManageLink = async (col: AdminCollectionItem) => {
  await copy(collectionManageLink(col), { successMsg: t('admin.unifiedManage.linkCopied') })
}
const copyCollectionDeliveryLink = async (col: AdminCollectionItem | null) => {
  if (!col) return
  await copy(collectionDeliveryLink(col), { successMsg: t('admin.unifiedManage.linkCopied') })
}
const copyCollectionRetrieveLink = async (col: AdminCollectionItem | null) => {
  if (!col || !col.retrieve_code) return
  await copy(collectionRetrieveLink(col), { successMsg: t('admin.unifiedManage.linkCopied') })
}

// ============ 房间列表（聊天/传输/直连合并为统一房间） ============
const rooms = ref<AdminRoomItem[]>([])
const roomParams = ref({ page: 1, size: 10, total: 0, keyword: '' })
const selectedRoomIds = ref<Set<number>>(new Set())
const roomSort = ref<SortState | null>(null)

const visibleRoomList = computed(() => {
  return sortList(rooms.value, roomSort.value)
})
const roomActiveCount = computed(() => rooms.value.filter((r) => !r.is_expired).length)
const roomExpiredCount = computed(() => rooms.value.length - roomActiveCount.value)
const roomTotalOnline = computed(() => rooms.value.reduce((s, r) => s + (Number(r.online_count) || 0), 0))
const allRoomsSelected = computed(
  () => rooms.value.length > 0 && rooms.value.every((r) => selectedRoomIds.value.has(r.id))
)
const toggleSelectRoom = (id: number) => {
  const next = new Set(selectedRoomIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedRoomIds.value = next
}
const toggleSelectAllRooms = () => {
  const next = new Set(selectedRoomIds.value)
  if (allRoomsSelected.value) rooms.value.forEach((r) => next.delete(r.id))
  else rooms.value.forEach((r) => next.add(r.id))
  selectedRoomIds.value = next
}
const onRoomPageSize = (v: string) => {
  roomParams.value.size = Number(v)
  roomParams.value.page = 1
  void loadRooms()
}
const batchDeleteRooms = async () => {
  const ids = [...selectedRoomIds.value]
  if (ids.length === 0) return
  if (!await confirmStore.confirm({ message: t('admin.unifiedManage.roomDeleteConfirm') })) return
  try {
    await Promise.all(ids.map((id) => adminApi.deleteAdminRoom(id)))
    selectedRoomIds.value = new Set()
    await loadRooms()
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.roomDeleteFailed'), 'error')
  }
}
const batchCopyRoomLinks = async () => {
  const links = [...selectedRoomIds.value]
    .map((id) => rooms.value.find((r) => r.id === id))
    .filter(Boolean)
    .map((r: any) => buildAppUrl(`/direct/room/${r.room_code}`))
    .join('\n')
  if (!links) return
  await copy(links, { successMsg: t('admin.unifiedManage.exportSuccess', { count: selectedRoomIds.value.size }) })
}

const loadRooms = async () => {
  try {
    const res = await adminApi.getAdminRoomList({ ...roomParams.value, status: statusQueryParam.value })
    if (res.detail) {
      rooms.value = res.detail.data.map((r) => ({
        ...r,
        displayCreatedAt: r.created_at ? formatTimestamp(r.created_at) : '-',
        displayExpiredAt: r.is_expired
          ? t('admin.unifiedManage.expired')
          : r.expire_style === 'count'
            ? `${r.expired_count}${t('common.times')}`
            : r.expired_at
              ? formatTimestamp(r.expired_at)
              : t('send.expiration.units.forever'),
      }))
      roomParams.value.total = res.detail.total
    }
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.loadFailed'), 'error')
  }
}

const deleteRoom = async (room: AdminRoomItem) => {
  if (!await confirmStore.confirm({ message: t('admin.unifiedManage.roomDeleteConfirm') })) return
  try {
    await adminApi.deleteAdminRoom(room.id)
    await loadRooms()
  } catch {
    alertStore.showAlert(t('admin.unifiedManage.roomDeleteFailed'), 'error')
  }
}

/** 复制房间链接 */
const copyRoomLink = async (room: AdminRoomItem) => {
  await copy(buildAppUrl(`/direct/room/${room.room_code}`), { successMsg: t('admin.unifiedManage.linkCopied') })
}

/** 房间详情弹窗（后台直接查看，无需跳转首页） */
const showRoomDetailModal = ref(false)
const selectedRoom = ref<AdminRoomItem | null>(null)
const showRoomDetail = (room: AdminRoomItem) => {
  selectedRoom.value = room
  showRoomDetailModal.value = true
}

// ============ 通用 ============
/** 格式化过期信息：count 模式显示剩余次数；其余显示到期时间（ISO → 本地时间；forever/未设显示"永久"） */
const formatExpireAt = (expiredAt?: string | null, style?: string, count?: number): string => {
  if (style === 'count') return count !== undefined && count >= 0 ? `${count}${t('common.times')}` : t('common.times')
  if (!expiredAt) return t('send.expiration.units.forever')
  return formatTimestamp(expiredAt)
}

// ============ 通用 ============
const reloadAll = () => {
  void loadFiles()
  void loadCollections()
  void loadRooms()
}

/** 清空搜索并刷新当前 Tab */
const clearSearch = () => {
  currentKeyword.value = ''
  void reloadCurrentTab()
}

onMounted(() => {
  loadFiles()
  loadCollections()
  loadRooms()
})
</script>
