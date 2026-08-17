<template>
  <div
    class="h-[calc(100vh-60px)] supports-[height:100dvh]:h-[calc(100dvh-60px)] min-h-0 flex items-center justify-center p-4 overflow-hidden transition-colors duration-300"
  >
    <div
      class="rounded-3xl shadow-2xl overflow-hidden border w-full max-w-2xl flex flex-col transition-colors duration-300 relative h-[min(94%,760px)]"
      :class="[
        isDarkMode
          ? 'bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border-gray-700'
          : 'bg-white border-gray-200'
      ]"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <!-- ========== 头部（微信风格） ========== -->
      <div class="shrink-0 px-4 py-3 border-b flex items-center gap-3" :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
        <button
          @click="goHome"
          class="flex items-center text-sm font-medium transition-colors duration-300 shrink-0"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600']"
        >
          <ArrowLeftIcon class="w-5 h-5" />
        </button>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full shrink-0" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></span>
            <h3 class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-900']">
              {{ roomTitle }}
            </h3>
            <!-- 传输方式徽标：直连 / 服务器中转 -->
            <span
              class="px-1.5 py-0.5 rounded text-[10px] shrink-0"
              :class="directStore.p2pActive ? (isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')"
            >
              {{ directStore.p2pActive ? t('direct.room.modeP2P') : t('direct.room.modeRelay') }}
            </span>
          </div>
          <p class="text-xs mt-0.5 flex items-center gap-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
            <span :class="isConnected ? 'text-green-500' : 'text-red-400'">
              {{ isConnected ? t('direct.room.connected') : t('direct.room.disconnected') }}
            </span>
            <span>·</span>
            <span>{{ onlineCountText }}</span>
          </p>
        </div>

        <!-- 在线成员头像（点击查看成员列表及各自链接状态） -->
        <button
          type="button"
          @click="showMembersModal = true"
          class="flex items-center gap-1.5 shrink-0 rounded-lg px-1.5 py-1 transition-colors hover:bg-black/5"
          :title="t('direct.room.viewMembers')"
          :class="[isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5']"
        >
          <span class="flex -space-x-2">
            <span
              v-for="m in directStore.members.slice(0, 4)"
              :key="m.client_id"
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 cursor-pointer"
              :class="[
                avatarColor(m.nickname),
                isDarkMode ? 'border-gray-700' : 'border-white'
              ]"
            >{{ m.nickname.charAt(0) }}</span>
          </span>
          <span
            v-if="directStore.members.length > 4"
            class="text-[10px] font-medium"
            :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']"
          >+{{ directStore.members.length - 4 }}</span>
        </button>

        <button
          @click="showShare = true"
          class="p-2 rounded-lg transition-colors shrink-0"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100']"
          :title="t('direct.room.share')"
        >
          <ShareIcon class="w-4.5 h-4.5" style="width: 18px; height: 18px" />
        </button>
      </div>

      <!-- ========== 共享通知条：有人共享屏幕/视频时显示在标题下方（不随消息滚动） ========== -->
      <div
        v-if="Object.keys(directStore.activeShares).length > 0"
        class="shrink-0 px-3 py-2 border-b flex flex-col gap-1"
        :class="[isDarkMode ? 'border-gray-700 bg-indigo-950/30' : 'border-gray-200 bg-indigo-50/60']"
      >
        <div
          v-for="(share, fromId) in directStore.activeShares"
          :key="fromId"
          class="flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs"
          :class="[isDarkMode ? 'bg-gray-900/70 text-indigo-200 border border-indigo-700/50' : 'bg-white text-indigo-700 border border-indigo-200']"
        >
          <MonitorIcon v-if="share.mediaType === 'screen'" class="w-4 h-4 shrink-0" />
          <VideoIcon v-else class="w-4 h-4 shrink-0" />
          <span class="min-w-0">
            <span class="font-medium">{{ share.nickname }}</span>
            {{ share.mediaType === 'screen' ? t('direct.room.screenShareNotify') : t('direct.room.videoShareNotify') }}
          </span>
          <template v-if="!directStore.viewingShares.includes(fromId)">
            <!-- 查看：系统自动判断 —— P2P 直连可用走实时流，不可用自动切服务器中转（受后台中转开关/限速控制） -->
            <button
              @click="viewShare(fromId)"
              class="ml-auto px-2.5 py-1 rounded-md font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors shrink-0"
            >
              {{ t('direct.room.viewShare') }}
            </button>
            <button
              @click="ignoreShare(fromId)"
              class="px-2 py-1 rounded-md font-medium transition-colors shrink-0"
              :class="[isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700']"
            >
              {{ t('direct.room.ignoreShare') }}
            </button>
          </template>
        </div>
      </div>

      <!-- ========== 消息列表（微信风格） ========== -->
      <div ref="msgListRef" class="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-1.5" @scroll="handleScroll">
        <!-- 系统消息 -->
        <div v-for="(item, index) in directStore.items" :key="item.id">
          <div v-if="showTimeSeparator(index)" class="flex justify-center my-2">
            <span class="text-[11px] px-2.5 py-0.5 rounded-full" :class="[isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400']">
              {{ formatDateSeparator(item.ts) }}
            </span>
          </div>

          <div v-if="item.kind === 'system'" class="flex justify-center my-1">
            <span class="text-[11px] px-2.5 py-1 rounded-lg" :class="[isDarkMode ? 'bg-gray-800/70 text-gray-500' : 'bg-gray-100 text-gray-400']">
              {{ item.content }}
            </span>
          </div>

          <ChatBubble v-else-if="item.kind === 'text'" :item="item" @retry="handleRetry" />

          <FileMessageBubble
            v-else-if="item.kind === 'file'"
            :item="item"
            @accept="handleAccept"
            @decline="handleDecline"
            @cancel="handleCancelOutgoing"
            @save="handleSaveIncoming"
          />
        </div>

        <!-- 共享者本地预览（自己正在共享的画面） -->
        <div v-if="connection.localMediaStream?.value" class="flex justify-end my-1">
          <div class="max-w-[50%] min-w-0">
            <p class="text-xs mb-1 px-1 text-right" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              {{ t('direct.room.myShare') }}
            </p>
            <div class="relative rounded-2xl overflow-hidden shadow-sm border" :class="[isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-black']">
              <video
                :ref="bindLocalPreview"
                autoplay
                playsinline
                :muted="localPreviewMuted"
                controls
                class="w-full max-h-40 bg-black"
              ></video>
              <!-- 本地预览静音开关：仅试听本机拾取的音频（不影响发送给对方的音轨） -->
              <button
                @click="toggleLocalPreviewMute"
                class="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                :title="t('direct.room.previewAudioToggle')"
              >
                <Volume2Icon v-if="!localPreviewMuted" class="w-4 h-4" />
                <VolumeXIcon v-else class="w-4 h-4" />
              </button>
            </div>
            <!-- 共享控制：分辨率切换 / 麦克风开关 / 结束共享（即时生效） -->
            <div class="mt-1.5 flex items-center gap-2 flex-wrap">
              <!-- 分辨率切换（下拉列表，点击展开选择） -->
              <div class="flex items-center gap-1.5">
                <span class="text-[11px]" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('direct.room.shareQualityLabel') }}
                </span>
                <ThemeDropdown
                  :options="shareQualityTiers"
                  :model-value="currentQualityLabel"
                  size="sm"
                  width="w-24"
                  :title="t('direct.room.shareQualityLabel')"
                  @update:model-value="applyShareQuality($event as string)"
                />
              </div>
              <!-- 摄像头切换（视频共享：多摄像头/多朝向即时切换；屏幕共享不显示） -->
              <div v-if="isSharingVideo && shareCameraOptions.length > 1" class="flex items-center gap-1.5">
                <span class="text-[11px]" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                  {{ t('direct.quality.videoCamera') }}
                </span>
                <ThemeDropdown
                  :options="shareCameraOptions"
                  :model-value="shareCameraValue"
                  size="sm"
                  width="w-28"
                  @update:model-value="onShareCameraChange($event as string)"
                />
              </div>
              <!-- 麦克风开关（仅含麦克风轨道的共享显示） -->
              <button
                v-if="shareHasAudio"
                @click="toggleShareAudio"
                class="px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                :class="shareAudioOn
                  ? (isDarkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                  : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-500')"
                :title="t('direct.room.shareAudioToggle')"
              >
                {{ shareAudioOn ? t('direct.room.shareAudioOn') : t('direct.room.shareAudioOff') }}
              </button>
              <!-- 系统声音开关（屏幕共享拾取的本机声音；音频来源含系统音即显示，不依赖设备是否实际返回音轨） -->
              <button
                v-if="shareSystemAudioAvailable"
                @click="toggleShareSystemAudio"
                class="px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                :class="shareSystemAudioOn
                  ? (isDarkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                  : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-500')"
                :title="t('direct.room.shareSystemAudioToggle')"
              >
                {{ shareSystemAudioOn ? t('direct.room.shareSystemAudioOn') : t('direct.room.shareSystemAudioOff') }}
              </button>
              <!-- 麦克风获取失败提示：权限被拒/设备无麦克风时明确告知，并提供重试（手机端常见：静默无声音） -->
              <button
                v-if="shareMicFailed"
                @click="retryShareMic"
                class="px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                :class="[isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-50 text-red-600']"
                :title="t('direct.room.shareMicFail')"
              >
                🎤 {{ t('direct.room.shareMicFail') }}
              </button>
              <!-- 摄像头代屏提示：当前浏览器无屏幕采集 API（如华为/鸿蒙浏览器），已用前置摄像头代替 -->
              <span
                v-if="shareUsesCamera"
                class="px-2 py-1 rounded-md text-[11px] font-medium"
                :class="[isDarkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-50 text-amber-600']"
              >
                📷 {{ t('direct.room.screenUseCamera') }}
              </span>
              <!-- 结束共享 -->
              <button
                @click="endMyShare"
                class="ml-auto px-2.5 py-1 rounded-md text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                {{ t('direct.room.endShare') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 媒体流（传屏幕/传视频）：已查看的共享实时渲染（悬浮中的卡片不在列表展示） -->
        <div
          v-for="fromId in mediaStreamKeys"
          :key="fromId"
          v-show="floatingFromId !== shareFromId(fromId)"
          class="flex justify-start"
        >
          <div class="max-w-[85%] min-w-0">
            <p class="text-xs mb-1 px-1 flex items-center gap-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              <MonitorIcon v-if="activeSharesMeta[fromId]?.mediaType === 'screen'" class="w-3 h-3" />
              <VideoIcon v-else class="w-3 h-3" />
              {{ memberNickname(fromId) }} {{ t('direct.room.mediaShare') }}
            </p>
            <!-- 视频容器：右上角悬浮操作图标（悬浮 / 退出查看） -->
            <div class="relative rounded-2xl overflow-hidden shadow-sm border" :class="[isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-black']">
              <video
                :ref="(el) => bindMediaVideo(el, fromId)"
                :data-from-id="fromId"
                data-loc="list"
                playsinline
                controls
                class="w-full max-h-64 bg-black"
              ></video>
              <!-- 静音自动播放提示：点一下开启声音（浏览器策略禁止无手势的有声自动播放） -->
              <button
                v-if="mutedVideoFromIds.has(fromId)"
                @click.stop="unmuteShareVideo(fromId)"
                class="absolute inset-x-0 bottom-2 mx-auto w-fit px-3 py-1 rounded-full text-[11px] font-medium text-white bg-black/60 hover:bg-black/75 transition-colors backdrop-blur-sm"
                :title="t('direct.room.tapToUnmute')"
              >
                🔇 {{ t('direct.room.tapToUnmute') }}
              </button>
              <div class="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  @click="enterViewMode(fromId)"
                  class="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                  :title="t('direct.room.enterViewMode')"
                >
                  <ExpandIcon class="w-4 h-4" />
                </button>
                <button
                  @click="floatingFromId = shareFromId(fromId)"
                  class="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                  :title="t('direct.room.floatWindow')"
                >
                  <PictureInPicture2Icon class="w-4 h-4" />
                </button>
                <button
                  @click="exitView(fromId)"
                  class="p-1.5 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-colors backdrop-blur-sm"
                  :title="t('direct.room.exitView')"
                >
                  <XIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 中转媒体流（服务器中转的屏幕/视频，MediaSource 流式播放） -->
        <div
          v-for="fromId in mediaRelayKeys"
          :key="fromId"
          class="flex justify-start"
        >
          <div class="max-w-[85%] min-w-0">
            <p class="text-xs mb-1 px-1 flex items-center gap-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              <MonitorIcon v-if="activeSharesMeta[fromId]?.mediaType === 'screen'" class="w-3 h-3" />
              <VideoIcon v-else class="w-3 h-3" />
              {{ memberNickname(fromId) }} {{ t('direct.room.mediaShare') }}
              <span class="px-1 py-px rounded text-[9px] shrink-0" :class="[isDarkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700']">
                {{ t('direct.room.modeRelay') }}
              </span>
            </p>
            <div class="relative rounded-2xl overflow-hidden shadow-sm border" :class="[isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-black']">
              <video
                :ref="(el) => bindMediaRelayVideo(el, fromId)"
                :data-from-id="fromId"
                data-loc="list"
                playsinline
                controls
                class="w-full max-h-64 bg-black"
              ></video>
              <!-- 静音自动播放提示：点一下开启声音（浏览器策略禁止无手势的有声自动播放） -->
              <button
                v-if="mutedVideoFromIds.has(fromId)"
                @click.stop="unmuteShareVideo(fromId)"
                class="absolute inset-x-0 bottom-2 mx-auto w-fit px-3 py-1 rounded-full text-[11px] font-medium text-white bg-black/60 hover:bg-black/75 transition-colors backdrop-blur-sm"
                :title="t('direct.room.tapToUnmute')"
              >
                🔇 {{ t('direct.room.tapToUnmute') }}
              </button>
              <div class="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  @click="enterViewMode(fromId)"
                  class="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                  :title="t('direct.room.enterViewMode')"
                >
                  <ExpandIcon class="w-4 h-4" />
                </button>
                <button
                  @click="exitView(fromId)"
                  class="p-1.5 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-colors backdrop-blur-sm"
                  :title="t('direct.room.exitView')"
                >
                  <XIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 正在输入 -->
        <div v-if="directStore.typingUsers.length > 0" class="flex justify-start">
          <span class="text-xs italic px-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
            {{ t('direct.room.typing', { name: directStore.typingText }) }}
          </span>
        </div>

        <!-- 空状态 -->
        <div v-if="directStore.items.length === 0" class="text-center py-10">
          <MessageSquareIcon class="w-10 h-10 mx-auto mb-2 opacity-40" :class="[isDarkMode ? 'text-gray-600' : 'text-gray-300']" />
          <p class="text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
            {{ t('direct.room.messageEmpty') }}
          </p>
        </div>
      </div>

      <!-- 悬浮窗：查看的共享画面以固定小窗浮动，可拖动到任意位置，聊天可继续滚动 -->
      <div
        v-if="floatingFromId && directStore.getIncomingMediaStream(floatingFromId)"
        class="fixed z-50 w-72 rounded-2xl overflow-hidden shadow-2xl border"
        :class="[
          floatingPos ? '' : 'bottom-4 right-4',
          isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        ]"
        :style="floatingPos ? { left: floatingPos.x + 'px', top: floatingPos.y + 'px' } : {}"
      >
        <!-- 拖拽把手：按住可移动悬浮窗（支持鼠标与触摸），仅含标题 -->
        <div
          class="px-3 py-1.5 cursor-move select-none touch-none"
          :class="[isDarkMode ? 'bg-gray-800' : 'bg-gray-100']"
          @mousedown="startFloatDrag"
          @touchstart="startFloatDrag"
        >
          <span class="text-xs font-medium flex items-center gap-1 truncate" :class="[isDarkMode ? 'text-gray-300' : 'text-gray-600']">
            <MonitorIcon v-if="activeSharesMeta[floatingFromId]?.mediaType === 'screen'" class="w-3.5 h-3.5 shrink-0" />
            <VideoIcon v-else class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{{ memberNickname(floatingFromId) }} {{ t('direct.room.mediaShare') }}</span>
          </span>
        </div>
        <!-- 视频容器：右上角悬浮操作图标（还原到列表 / 退出查看） -->
        <div class="relative bg-black">
          <video
            :ref="(el) => floatingFromId && bindMediaVideo(el, floatingFromId)"
            :data-from-id="floatingFromId"
            data-loc="float"
            playsinline
            controls
            class="w-full max-h-52 bg-black"
          ></video>
          <div class="absolute top-2 right-2 flex items-center gap-1.5">
            <button
              @click="floatingFromId = null"
              class="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
              :title="t('direct.room.restoreFloat')"
            >
              <Maximize2Icon class="w-4 h-4" />
            </button>
            <button
              @click="exitView(floatingFromId)"
              class="p-1.5 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-colors backdrop-blur-sm"
              :title="t('direct.room.exitView')"
            >
              <XIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- 断线提示 + 手动重连 -->
      <div
        v-if="!isConnected"
        class="shrink-0 px-3 py-2 border-t flex items-center justify-between gap-2"
        :class="[isDarkMode ? 'border-gray-700 bg-red-900/20' : 'border-gray-200 bg-red-50']"
      >
        <span class="text-xs" :class="[isDarkMode ? 'text-red-300' : 'text-red-500']">
          {{ t('direct.room.disconnected') }}
        </span>
        <button
          @click="handleReconnect"
          class="text-xs px-3 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          {{ t('direct.room.reconnect') }}
        </button>
      </div>

      <!-- ========== 输入栏（微信风格） ========== -->
      <div class="shrink-0 px-3 py-2.5 border-t flex items-end gap-2" :class="[isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50']">
        <!-- 发送文件按钮 -->
        <button
          @click="triggerFileInput"
          class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-700' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-200']"
          :title="t('direct.room.sendFile')"
        >
          <PaperclipIcon class="w-5 h-5" />
        </button>
        <input ref="fileInputRef" type="file" multiple class="hidden" @change="handleFileInput" />

        <!-- 传屏幕按钮（手机/平板暂不支持屏幕共享，隐藏入口） -->
        <button
          v-if="!isMobile"
          @click="handleScreenShare"
          class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-700' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-200']"
          :title="t('direct.room.shareScreen')"
        >
          <MonitorIcon class="w-5 h-5" />
        </button>

        <!-- 传视频（含语音）按钮 -->
        <button
          @click="handleVideoCall"
          class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          :class="[isDarkMode ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-700' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-200']"
          :title="t('direct.room.videoCall')"
        >
          <VideoIcon class="w-5 h-5" />
        </button>

        <textarea
          v-model="inputText"
          rows="1"
          ref="inputRef"
          :placeholder="t('direct.room.inputPlaceholder')"
          class="flex-1 resize-none rounded-xl border px-3.5 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300 max-h-24"
          :class="[
            isDarkMode
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          ]"
          @input="handleTextInput"
          @keydown="handleKeydown"
        ></textarea>

        <button
          @click="handleSend"
          :disabled="!canSend"
          class="shrink-0 px-4 h-9 rounded-lg text-sm font-medium transition-all duration-300"
          :class="[
            canSend
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow'
              : isDarkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-200 text-gray-400'
          ]"
        >
          {{ t('direct.room.send') }}
        </button>
      </div>

      <!-- ========== 视频观看模式（全屏沉浸：大画面 + 顶部悬浮操作 + 悬浮小窗/退出） ========== -->
      <div
        v-if="viewModeFromId"
        class="absolute inset-0 z-40 flex flex-col bg-black"
      >
        <!-- 顶部悬浮操作栏：退出观看模式 / 当前观看对象 / 悬浮小窗 / 退出查看 -->
        <div class="absolute top-0 inset-x-0 z-10 px-3 py-2.5 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent">
          <button
            @click="viewModeFromId = null"
            class="p-1.5 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors shrink-0"
            :title="t('direct.room.exitViewMode')"
          >
            <Minimize2Icon class="w-4 h-4" />
          </button>
          <span class="text-xs text-white/90 flex-1 truncate flex items-center gap-1.5">
            <MonitorIcon v-if="activeSharesMeta[viewModeFromId]?.mediaType === 'screen'" class="w-3.5 h-3.5 shrink-0" />
            <VideoIcon v-else class="w-3.5 h-3.5 shrink-0" />
            {{ t('direct.room.watchingNow', { name: memberNickname(viewModeFromId) }) }}
            <span
              v-if="directStore.mediaRelayFromIds.includes(viewModeFromId)"
              class="px-1 py-px rounded text-[9px] shrink-0 bg-amber-500/20 text-amber-300"
            >
              {{ t('direct.room.modeRelay') }}
            </span>
          </span>
          <button
            @click="floatingFromId = viewModeFromId"
            class="p-1.5 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors shrink-0"
            :title="t('direct.room.floatWindow')"
          >
            <PictureInPicture2Icon class="w-4 h-4" />
          </button>
          <button
            @click="exitView(viewModeFromId)"
            class="p-1.5 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-colors shrink-0"
            :title="t('direct.room.exitView')"
          >
            <XIcon class="w-4 h-4" />
          </button>
        </div>
        <!-- 大画面 -->
        <div class="flex-1 relative">
          <video
            :ref="bindViewModeVideo"
            playsinline
            controls
            class="w-full h-full object-contain bg-black"
          ></video>
          <!-- 静音自动播放提示：点一下开启声音 -->
          <button
            v-if="mutedVideoFromIds.has(viewModeFromId)"
            @click.stop="unmuteShareVideo(viewModeFromId)"
            class="absolute inset-x-0 bottom-4 mx-auto w-fit px-3 py-1 rounded-full text-[11px] font-medium text-white bg-black/60 hover:bg-black/75 transition-colors backdrop-blur-sm"
            :title="t('direct.room.tapToUnmute')"
          >
            🔇 {{ t('direct.room.tapToUnmute') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== 分享房间弹窗 ========== -->
    <SuccessModal
      :visible="showShare"
      :title="t('direct.room.shareTitle')"
      :subtitle="roomTitle"
      accent="indigo"
      :codes="shareCodes"
      @close="showShare = false"
    />

    <!-- ========== 首访昵称弹窗 ========== -->
    <BaseModal
      :show="showNicknameModal"
      :title="t('direct.nickname.title')"
      :closable="false"
      :close-on-backdrop="false"
      size="sm"
    >
      <div class="space-y-4">
        <input
          v-model="nicknameInput"
          type="text"
          maxlength="20"
          :placeholder="t('direct.nickname.placeholder')"
          class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
          :class="[
            isDarkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          ]"
        />
        <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
          {{ t('direct.nickname.hint') }}
        </p>
      </div>
      <template #footer>
        <button
          @click="confirmNickname"
          :disabled="!nicknameInput.trim()"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="[isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600']"
        >
          {{ t('common.confirm') }}
        </button>
      </template>
    </BaseModal>

    <!-- ========== 共享质量选择弹窗（传屏幕/传视频前选择档位，自动档按带宽自适应） ========== -->
    <BaseModal
      :show="showQualityModal"
      :title="qualityModalTitle"
      :close-on-backdrop="true"
      :overflow="true"
      size="sm"
      @close="cancelQuality"
    >
      <div class="space-y-2">
        <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
          {{ t('direct.quality.hint') }}
        </p>
        <!-- 视频流质量：下拉列表（向下展开，弹窗已允许溢出） -->
        <ThemeDropdown
          :options="qualityOptions"
          :model-value="selectedQuality"
          width="w-full"
          @update:model-value="selectedQuality = $event as string"
        />

        <!-- 摄像头选择：先选方式（位置=前后置 / 设备=具体摄像头），再多选要传输的摄像头 -->
        <div v-if="pendingQualityKind === 'video'" class="pt-1 space-y-2">
          <p class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-700']">
            {{ t('direct.quality.videoCamera') }}
          </p>
          <ThemeDropdown
            :options="cameraPickOptions"
            :model-value="selectedCamera"
            width="w-full"
            @update:model-value="onCameraSelect($event as string)"
          />
          <p v-if="cameraSelectHint" class="text-[11px]" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
            {{ cameraSelectHint }}
          </p>
        </div>

        <!-- 视频共享配置：实时预览（确认后按档位共享，预览即所得） -->
        <div v-if="pendingQualityKind === 'video' && previewCameraKey" class="pt-1 space-y-2">
          <p class="text-xs" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
            {{ t('direct.quality.configCustomize') }}
          </p>
          <div class="relative rounded-xl overflow-hidden bg-black">
            <!-- 预览失败 → 占位提示 + 重试（无摄像头/不支持/非安全上下文时重试无意义，仅提示） -->
            <div v-if="previewFailedKeys.has(previewCameraKey)" class="w-full h-32 flex flex-col items-center justify-center gap-2 bg-black/60">
              <span class="text-[11px] text-white/70 text-center px-3">{{ previewFailText }}</span>
              <button
                v-if="!cameraNotFound && !cameraInsecure && !cameraUnsupported"
                type="button"
                @click="retryCameraPreview(previewCameraKey)"
                class="px-3 py-1 rounded-md text-[11px] font-medium bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {{ t('direct.quality.cameraPreviewRetry') }}
              </button>
            </div>
            <template v-else>
              <!-- :key 绑定版本号：切换/重试成功后强制重建 video，重新绑定新流（预览随摄像头切换而更新） -->
              <video
                :key="`${previewCameraKey}:${previewStreamVersion}`"
                :ref="(el) => bindConfigPreviewVideo(el, previewCameraKey)"
                muted
                autoplay
                playsinline
                class="w-full max-h-40 bg-black"
              ></video>
              <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] bg-black/60 text-white">
                {{ t('direct.quality.configPreview') }}
              </span>
            </template>
          </div>
        </div>

        <!-- 音频来源选择（屏幕共享：无/麦克风/系统声音；视频共享：无/麦克风；下拉多选） -->
        <div v-if="pendingQualityKind === 'screen' || pendingQualityKind === 'video'" class="pt-1">
          <p class="text-sm font-medium mb-2" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-700']">
            {{ t('direct.quality.audioSource') }}
          </p>
          <ThemeDropdown
            :options="audioMultiOptions"
            :model-value="audioSourceSelections"
            multi
            width="w-full"
            @update:model-value="onAudioToggle($event as string[])"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <button
            @click="cancelQuality"
            class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
            :class="[isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100']"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="confirmQuality"
            class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="[isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-600']"
          >
            {{ t('common.confirm') }}
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- 成员列表弹窗：点击头部成员头像打开，展示每位成员的链接状态 -->
    <BaseModal :show="showMembersModal" :title="t('direct.room.memberListTitle')" @close="showMembersModal = false">
      <div class="space-y-2">
        <div
          v-for="m in directStore.members"
          :key="m.client_id"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          :class="[isDarkMode ? 'bg-gray-800/60' : 'bg-gray-50']"
        >
          <span
            class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            :class="[avatarColor(m.nickname)]"
          >{{ m.nickname.charAt(0) }}</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate" :class="[isDarkMode ? 'text-white' : 'text-gray-900']">
              {{ m.nickname }}
              <span v-if="m.client_id === directStore.myClientId" class="text-xs font-normal" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">（{{ t('direct.room.me') }}）</span>
            </p>
            <p class="text-xs" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ memberLinkDetail(m) }}</p>
          </div>
          <!-- 链接状态指示灯 -->
          <span
            class="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium"
            :class="memberLinkBadge(m)"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="memberLinkDot(m)"></span>
            {{ memberLinkText(m) }}
          </span>
        </div>
        <div v-if="directStore.members.length === 0" class="text-center py-8 text-sm" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
          {{ t('common.noData') }}
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, reactive, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { isMobileDevice } from '@/utils/device'
import {
  ArrowLeftIcon,
  ShareIcon,
  MessageSquareIcon,
  PaperclipIcon,
  MonitorIcon,
  VideoIcon,
  PictureInPicture2Icon,
  Maximize2Icon,
  Minimize2Icon,
  ExpandIcon,
  ChevronDownIcon,
  XIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-vue-next'
import ChatBubble from '@/components/common/ChatBubble.vue'
import FileMessageBubble from '@/components/common/FileMessageBubble.vue'
import SuccessModal from '@/components/common/SuccessModal.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ThemeDropdown from '@/components/common/ThemeDropdown.vue'
import { useDirectStore } from '@/stores/directStore'
import { useConfigStore } from '@/stores/configStore'
import { useDirectConnection } from '@/composables'
import { useAlertStore } from '@/stores/alertStore'
import { useFileDataStore } from '@/stores/fileData'
import { STORAGE_KEYS } from '@/constants'
import { buildAppUrl } from '@/utils/share-url'
import { downloadBlob } from '@/utils/download-action'
import { readPreference, writePreference } from '@/utils/preference-storage'
import type { DirectChatItem } from '@/types/direct'

const props = defineProps<{ code: string }>()

/** 规范化房间码：去除链接/二维码/复制可能带入的空格并统一大写（后端 _validate_code 要求大写字母+数字） */
const roomCode = computed(() => (props.code || '').trim().toUpperCase())

const isDarkMode = inject('isDarkMode') as { value: boolean }
const { t } = useI18n()
const router = useRouter()
const directStore = useDirectStore()
const configStore = useConfigStore()
const config = computed(() => configStore.config)
const alertStore = useAlertStore()
const fileDataStore = useFileDataStore()
const connection = useDirectConnection()
const { isConnected } = connection

// ==================== 输入 ====================
const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const msgListRef = ref<HTMLElement | null>(null)
const atBottom = ref(true)
const savedIncomingIds = new Set<string>()

const canSend = computed(() => inputText.value.trim() !== '')

const roomTitle = computed(() => directStore.activeRoom?.title || roomCode.value)
const roomLink = computed(() => buildAppUrl(`/direct/room/${roomCode.value}`))
const onlineCountText = computed(() => {
  if (directStore.onlineCount < 2) {
    return t('direct.room.waitPeer', { count: directStore.onlineCount })
  }
  return t('direct.room.members', { count: directStore.onlineCount })
})

const shareCodes = computed(() => [{
  label: t('direct.room.roomCodeLabel'),
  code: roomCode.value,
  qrValue: roomLink.value,
  hint: t('direct.room.scanHint'),
  accent: 'indigo' as const,
  copyLinkText: t('direct.room.copyRoomLink'),
  copyLinkUrl: roomLink.value,
}])

// 头像配色
const avatarColors = [
  'bg-indigo-500 text-white',
  'bg-emerald-500 text-white',
  'bg-amber-500 text-white',
  'bg-pink-500 text-white',
  'bg-sky-500 text-white',
  'bg-purple-500 text-white',
]
function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return avatarColors[hash % avatarColors.length]
}

/** 成员列表弹窗开关 */
const showMembersModal = ref(false)

/** 成员链接状态文案（成员列表弹窗） */
const memberLinkText = (m: { client_id: string }): string => {
  if (m.client_id === directStore.myClientId) return t('direct.room.me')
  const info = connection.getMemberLinkInfo(m.client_id)
  if (info.channel === 'connected') return t('direct.room.modeP2P')
  if (info.channel === 'connecting') return t('direct.room.linkConnecting')
  if (info.channel === 'failed') return t('direct.room.linkFailed')
  return t('direct.room.modeRelay')
}

/** 成员链接状态徽标配色 */
const memberLinkBadge = (m: { client_id: string }): string[] => {
  if (m.client_id === directStore.myClientId) {
    return isDarkMode.value ? ['bg-gray-800 text-gray-400'] : ['bg-gray-100 text-gray-500']
  }
  const info = connection.getMemberLinkInfo(m.client_id)
  if (info.channel === 'connected') {
    return isDarkMode.value ? ['bg-emerald-900/40 text-emerald-300'] : ['bg-emerald-50 text-emerald-600']
  }
  if (info.channel === 'connecting') {
    return isDarkMode.value ? ['bg-amber-900/40 text-amber-300'] : ['bg-amber-50 text-amber-600']
  }
  return isDarkMode.value ? ['bg-red-900/40 text-red-400'] : ['bg-red-50 text-red-500']
}

/** 成员链接状态指示灯圆点 */
const memberLinkDot = (m: { client_id: string }): string[] => {
  if (m.client_id === directStore.myClientId) {
    return isDarkMode.value ? ['bg-gray-500'] : ['bg-gray-400']
  }
  const info = connection.getMemberLinkInfo(m.client_id)
  if (info.channel === 'connected') return ['bg-emerald-500']
  if (info.channel === 'connecting') return ['bg-amber-500 animate-pulse']
  return ['bg-red-500']
}

/** 成员链接状态详情文案（成员列表弹窗副行） */
const memberLinkDetail = (m: { client_id: string }): string => {
  if (m.client_id === directStore.myClientId) return t('direct.room.me')
  const info = connection.getMemberLinkInfo(m.client_id)
  const parts: string[] = []
  if (info.channel === 'connected') {
    parts.push(`${t('direct.room.modeP2P')} · ${t('direct.room.linkRtt')} ${Math.round(info.rtt)}ms`)
    if (info.bandwidth > 0) parts.push(`${(info.bandwidth / 1e6).toFixed(2)}Mbps`)
  } else if (info.channel === 'connecting') {
    parts.push(t('direct.room.linkConnecting'))
  } else if (info.channel === 'failed') {
    parts.push(t('direct.room.linkFailed'))
  } else {
    parts.push(t('direct.room.linkNone'))
  }
  return parts.join(' · ')
}

// ==================== 文本发送 ====================
const handleSend = () => {
  const content = inputText.value.trim()
  if (!content) return
  const item = directStore.addTextMessage(content)
  if (item) {
    connection.sendChatMessage({ content, client_id: item.id })
  }
  inputText.value = ''
  sendTyping(false)
  nextTick(() => inputRef.value?.focus())
}

const handleRetry = (item: DirectChatItem) => {
  connection.sendChatMessage({ content: item.content || '', client_id: item.id })
  item.sendStatus = 'sending'
}

// 输入状态（防抖）
let typingTimer: ReturnType<typeof setTimeout> | null = null
function sendTyping(isTyping: boolean) {
  connection.sendTyping(isTyping)
}
const handleTextInput = () => {
  autoGrow()
  if (typingTimer) clearTimeout(typingTimer)
  sendTyping(true)
  typingTimer = setTimeout(() => {
    sendTyping(false)
    typingTimer = null
  }, 1500)
}
function autoGrow() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 96)}px`
}
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

// ==================== 文件发送 ====================
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileInput = (event: Event) => {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  ;(event.target as HTMLInputElement).value = ''
  sendFiles(files)
}

const handleDrop = (event: DragEvent) => {
  const files = Array.from(event.dataTransfer?.files || [])
  sendFiles(files)
}

function sendFiles(files: File[]) {
  if (files.length === 0) return
  if (directStore.onlineCount < 2) {
    alertStore.showAlert(t('direct.room.needPeer'), 'warning')
    return
  }
  const ok = connection.offerFiles(files)
  if (!ok) {
    alertStore.showAlert(t('direct.room.needPeer'), 'warning')
  }
}

// ==================== 传屏幕 / 传视频（WebRTC 实时媒体流） ====================
/** 已建立媒体流的共享者 key 列表（响应式触发渲染） */
const mediaStreamKeys = computed(() => directStore.mediaStreamFromIds)
/** 共享者元数据（昵称 + 类型），供媒体卡片标题展示 */
const activeSharesMeta = computed(() => directStore.activeShares)
/** 悬浮窗当前展示的共享者（null = 无悬浮） */
const floatingFromId = ref<string | null>(null)
/** 悬浮窗位置（相对视口左上角）；null = 未拖动过，使用默认右下角 */
const floatingPos = ref<{ x: number; y: number } | null>(null)
// 拖拽偏移（按下点相对悬浮窗左上角）
let floatDragOffset = { dx: 0, dy: 0 }
const FLOAT_WIDTH = 288
const FLOAT_HEIGHT = 260

/** 开始拖拽悬浮窗（鼠标/触摸通用） */
const startFloatDrag = (e: MouseEvent | TouchEvent) => {
  e.preventDefault()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  const pos = floatingPos.value || { x: window.innerWidth - FLOAT_WIDTH - 16, y: window.innerHeight - FLOAT_HEIGHT - 16 }
  floatingPos.value = pos
  floatDragOffset = { dx: clientX - pos.x, dy: clientY - pos.y }
  window.addEventListener('mousemove', onFloatDragMove)
  window.addEventListener('mouseup', endFloatDrag)
  window.addEventListener('touchmove', onFloatDragMove, { passive: false })
  window.addEventListener('touchend', endFloatDrag)
  window.addEventListener('touchcancel', endFloatDrag)
}

/** 拖动中：更新悬浮窗位置（限制在视口内） */
const onFloatDragMove = (e: MouseEvent | TouchEvent) => {
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  const x = Math.min(Math.max(clientX - floatDragOffset.dx, 0), Math.max(window.innerWidth - FLOAT_WIDTH, 0))
  const y = Math.min(Math.max(clientY - floatDragOffset.dy, 0), Math.max(window.innerHeight - FLOAT_HEIGHT, 0))
  floatingPos.value = { x, y }
}

/** 结束拖拽：移除全局监听 */
const endFloatDrag = () => {
  window.removeEventListener('mousemove', onFloatDragMove)
  window.removeEventListener('mouseup', endFloatDrag)
  window.removeEventListener('touchmove', onFloatDragMove)
  window.removeEventListener('touchend', endFloatDrag)
  window.removeEventListener('touchcancel', endFloatDrag)
}
/** 昵称查询 */
const memberNickname = (clientId: string) =>
  directStore.members.find((m) => m.client_id === (clientId.includes(':') ? clientId.split(':')[0] : clientId))?.nickname || ''

/** 已取消静音的共享流（fromId 集合；未在其中表示视频仍为静音自动播放，显示"点击开启声音"提示） */
const mutedVideoFromIds = reactive(new Set<string>())
/** fromId → 视频元素（"开启声音"按钮直接操作对应元素） */
const mediaVideoEls = new Map<string, HTMLVideoElement>()

/** 用户点击"开启声音"：取消静音并继续播放（点击是用户手势，浏览器允许有声播放） */
const unmuteShareVideo = (fromId: string) => {
  const video = mediaVideoEls.get(fromId)
  if (video && video.muted) {
    video.muted = false
    mutedVideoFromIds.delete(fromId)
    void video.play().catch(() => {
      /* ignore */
    })
  }
}

/** 自动播放策略处理：默认直接有声播放（查看者已点过"查看"按钮 = 用户手势，
 *  浏览器允许有声自动播放）→ 无需手动开启声音。
 *  仅当策略仍拦截（NotAllowedError，如 iOS Safari / 页面无任何手势）时，
 *  降级为静音播放 + "点击开启声音"提示（点击视频或提示按钮后取消静音）。
 *  播放时机：刚绑定 srcObject/src 时媒体尚未加载完成，立即 play() 会被加载中断（AbortError），
 *  需在 canplay（媒体就绪）后重试。 */
const startMediaVideoPlayback = (video: HTMLVideoElement, fromId?: string) => {
  // 幂等：ref 回调可能多次执行（Vue 重渲染），同一元素只初始化一次
  if (video.dataset.mediaPlayback) return
  video.dataset.mediaPlayback = '1'
  // 应用该共享的记忆静音状态（悬浮窗/列表切换元素时保持音量一致，不突变）
  video.muted = fromId ? mutedVideoFromIds.has(fromId) : false
  // 用户点击视频 → 取消静音（用户手势允许有声播放）并确保继续播放
  const unmuteOnTap = () => {
    if (video.muted) {
      video.muted = false
      if (fromId) mutedVideoFromIds.delete(fromId)
      void video.play().catch(() => {
        /* ignore */
      })
    }
    video.removeEventListener('click', unmuteOnTap)
  }
  video.addEventListener('click', unmuteOnTap)
  const tryPlay = () => {
    if (!video.paused) return
    void video.play().catch((err) => {
      if (err && (err as DOMException).name === 'NotAllowedError') {
        // 有声自动播放被策略拦截（页面无用户手势 / iOS Safari）→ 静音播放兜底，
        // 用户可通过点击视频或"开启声音"按钮出声（真实点击即用户手势，会被允许）
        if (!video.muted) {
          video.muted = true
          if (fromId) mutedVideoFromIds.add(fromId)
        }
        void video.play().catch(() => {
          /* ignore */
        })
        return
      }
      // 其他错误（NotSupportedError/AbortError：MediaSource 尚未 readyState=open 或源未就绪）
      // → 定时重试，直到 MediaSource sourceopen + 缓冲可播；播放中停止重试
      const onPlay = () => {
        video.removeEventListener('playing', onPlay)
        if (retryTimer) clearTimeout(retryTimer)
      }
      video.addEventListener('playing', onPlay)
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = setTimeout(tryPlay, 500)
    })
  }
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  video.addEventListener('canplay', tryPlay)
  video.addEventListener('playing', () => {
    video.removeEventListener('canplay', tryPlay)
    if (retryTimer) clearTimeout(retryTimer)
  })
  tryPlay()
}

/** 按数据标记定位列表/悬浮中的视频元素（悬浮切换时暂停/恢复列表播放，避免双路音频） */
const listVideoFor = (fromId: string): HTMLVideoElement | null =>
  document.querySelector(`video[data-from-id="${fromId}"][data-loc="list"]`) as HTMLVideoElement | null

// 悬浮开启：暂停列表中的对应视频（避免同一流双路播放导致音量变大/回声）；
// 悬浮还原：恢复列表播放
watch(floatingFromId, (fromId, prev) => {
  if (prev) {
    const pv = listVideoFor(prev)
    if (pv && pv.paused && pv.srcObject) void pv.play().catch(() => {})
  }
  if (fromId) {
    const lv = listVideoFor(fromId)
    if (lv && !lv.paused) lv.pause()
  }
})

/** 把远端媒体流绑定到 <video> 元素 */
const bindMediaVideo = (el: unknown, fromId: string) => {
  const video = el as HTMLVideoElement | null
  if (!video) return
  mediaVideoEls.set(fromId, video)
  const stream = directStore.getIncomingMediaStream(fromId)
  if (stream && video.srcObject !== stream) {
    video.srcObject = stream
  }
  if (stream) startMediaVideoPlayback(video, fromId)
}

/** 从复合键 `fromId:idx` 解析真实共享者 id */
const shareFromId = (key: string) => (key.includes(':') ? key.split(':')[0] : key)

/** 中转媒体（MediaSource）key 列表：响应式触发渲染 */
const mediaRelayKeys = computed(() => directStore.mediaRelayFromIds)

/** 把中转媒体 objectURL 绑定到 <video> 元素 */
const bindMediaRelayVideo = (el: unknown, fromId: string) => {
  const video = el as HTMLVideoElement | null
  if (!video) return
  mediaVideoEls.set(fromId, video)
  const url = directStore.getMediaRelayUrl(fromId)
  if (url && video.src !== url) {
    video.src = url
  }
  if (url) startMediaVideoPlayback(video, fromId)
}

/** 查看者：退出查看（停止拉流并通知共享者移除轨道；中转观看则关闭中转源） */
const exitView = (fromId: string) => {
  const real = shareFromId(fromId)
  if (floatingFromId.value === real) floatingFromId.value = null
  if (viewModeFromId.value === real) viewModeFromId.value = null
  connection.stopViewing(real)
  directStore.clearMediaRelaySource(real)
}

// ==================== 视频观看模式（全屏沉浸） ====================
/** 正在全屏观看的共享者（null = 未进入观看模式） */
const viewModeFromId = ref<string | null>(null)

/** 进入观看模式：全屏沉浸查看该共享（隐藏聊天，仅保留大画面） */
const enterViewMode = (fromId: string) => {
  // 悬浮窗与该观看模式互斥（多摄像头按真实共享者互斥）
  const real = shareFromId(fromId)
  if (floatingFromId.value === real) floatingFromId.value = null
  viewModeFromId.value = real
}

/** 观看模式大画面：绑定 P2P 流或中转 MediaSource，并处理自动播放 */
const bindViewModeVideo = (el: unknown) => {
  const video = el as HTMLVideoElement | null
  if (!video) return
  const fromId = viewModeFromId.value
  if (!fromId) return
  mediaVideoEls.set(fromId, video)
  const stream = directStore.getIncomingMediaStream(fromId)
  if (stream) {
    if (video.srcObject !== stream) video.srcObject = stream
    startMediaVideoPlayback(video, fromId)
  } else {
    const url = directStore.getMediaRelayUrl(fromId)
    if (url && video.src !== url) {
      video.src = url
    }
    if (url) startMediaVideoPlayback(video, fromId)
  }
}

/** 共享者：结束共享 */
const endMyShare = () => {
  shareMicFailed.value = false
  shareUsesCamera.value = false
  connection.stopMediaShare()
}

// ==================== 共享控制（分辨率切换 / 麦克风开关，即时生效） ====================
/** 当前生效档位标签（low/sd/hd/uhd/origin/auto 的映射值；auto 显示实际匹配档位） */
const shareQualitySelectValue = ref('auto')
const currentQualityLabel = computed(() => shareQualitySelectValue.value)
/** 是否正在共享视频（控制栏据此显示摄像头切换；屏幕共享不显示） */
const isSharingVideo = computed(() => connection.localMediaType?.value === 'video')

/** 分辨率列表（共享控制栏下拉选择） */
const shareQualityTiers = computed(() => [
  { value: 'low', label: t('direct.quality.low') },
  { value: 'sd', label: t('direct.quality.sd') },
  { value: 'hd', label: t('direct.quality.hd') },
  { value: 'uhd', label: t('direct.quality.uhd') },
  { value: 'origin', label: t('direct.quality.origin') },
  { value: 'auto', label: t('direct.quality.auto') },
])

/** 分辨率切换：应用新档位（轨道约束 + P2P 码率 + 中转重启录制） */
const applyShareQuality = async (value: string) => {
  if (value === currentQualityLabel.value) return
  shareQualitySelectValue.value = value
  await connection.setMediaQuality(value)
  alertStore.showAlert(t('direct.room.qualityApplied'), 'success')
}

/** 共享中的摄像头切换（视频共享显示）：下拉选择设备/朝向，即时生效 */
const shareCameraOptions = computed(() =>
  cameraSelectMode.value === 'position'
    ? [
        { value: 'user', label: t('direct.quality.frontCamera') },
        { value: 'environment', label: t('direct.quality.backCamera') },
      ]
    : videoDevices.value.map((d) => ({
        value: d.deviceId,
        label: d.label || t('direct.quality.videoCamera'),
      }))
)
const shareCameraValue = computed(() => selectedCamera.value || 'user')
const onShareCameraChange = async (value: string) => {
  try {
    const ok = cameraSelectMode.value === 'position'
      ? await connection.switchCamera(value as 'user' | 'environment')
      : await connection.switchCamera(undefined, value)
    if (ok) {
      selectedCamera.value = value
      alertStore.showAlert(t('direct.room.cameraSwitched'), 'success')
    } else {
      alertStore.showAlert(t('direct.room.cameraSwitchFailed'), 'error')
    }
  } catch {
    alertStore.showAlert(t('direct.room.cameraSwitchFailed'), 'error')
  }
}

/** 麦克风开关状态 */
const shareAudioOn = ref(true)
const shareHasAudio = ref(false)
/** 麦克风预取失败（权限被拒/设备无麦克风）：屏幕共享继续但明确提示，可重试获取 */
const shareMicFailed = ref(false)
/** 系统声音开关状态（屏幕共享拾取的本机声音） */
const shareSystemAudioOn = ref(true)
const shareSystemAudioAvailable = ref(false)

/** 切换麦克风静音 */
const toggleShareAudio = () => {
  shareAudioOn.value = !shareAudioOn.value
  connection.setMediaAudioEnabled(shareAudioOn.value)
}

/** 麦克风获取失败后重试：重新拾取麦克风并加入共享流（成功后隐藏提示） */
const retryShareMic = async () => {
  const added = await connection.retryAddMicrophone()
  if (added) {
    shareMicFailed.value = false
    shareHasAudio.value = connection.hasMediaAudio()
    shareAudioOn.value = true
  } else {
    alertStore.showAlert(t('direct.room.shareMicFail'), 'error')
  }
}

/** 共享中摄像头代屏提示（当前浏览器无屏幕采集 API 时用前置摄像头代替，如华为浏览器） */
const shareUsesCamera = ref(false)

/** 切换系统声音（屏幕共享拾取的本机声音） */
const toggleShareSystemAudio = () => {
  shareSystemAudioOn.value = !shareSystemAudioOn.value
  connection.setMediaSystemAudioEnabled(shareSystemAudioOn.value)
}

/** 传屏幕（getDisplayMedia） */
const handleScreenShare = async () => {
  // 共享为广播式：无需对方在线即可开始（后加入的成员会收到 media_available 通知并查看）
  openQualityPicker('screen')
}

/** 传视频（含语音，getUserMedia） */
const handleVideoCall = async () => {
  openQualityPicker('video')
}

/** 媒体失败原因 → 用户可读文案 */
const mediaErrorText = (reason?: string): string => {
  switch (reason) {
    case 'insecure':
      return t('direct.room.mediaInsecure')
    case 'unsupported':
      return t('direct.room.mediaUnsupported')
    case 'no-screen':
      return t('direct.room.screenUnsupported')
    case 'screen-mobile':
      return t('direct.room.screenMobileUnsupported')
    case 'camera-error':
      return t('direct.quality.shareStartFailed')
    case 'no-camera':
      return t('direct.quality.cameraNotFound')
    default:
      return t('direct.room.mediaDenied')
  }
}

// ==================== 共享质量选择（传屏幕/传视频前弹窗；档位存本地偏好，默认取后台配置） ====================
const STORAGE_KEY_QUALITY = 'directMediaQuality'
const STORAGE_KEY_AUDIO = 'directScreenAudio'
const showQualityModal = ref(false)
const pendingQualityKind = ref<'screen' | 'video' | null>(null)
const selectedQuality = ref('auto')

/** 质量档位选项（仅档位名，供下拉列表展示） */
const qualityOptions = computed(() => [
  { value: 'low', label: t('direct.quality.low') },
  { value: 'sd', label: t('direct.quality.sd') },
  { value: 'hd', label: t('direct.quality.hd') },
  { value: 'uhd', label: t('direct.quality.uhd') },
  { value: 'origin', label: t('direct.quality.origin') },
  { value: 'auto', label: t('direct.quality.auto') },
])

/** 音频来源（下拉多选，无"无声音"选项）：屏幕共享=麦克风/系统声音（移动端仅麦克风）；视频共享=麦克风 */
const isMobile = isMobileDevice()
const audioMultiOptions = computed(() => {
  if (pendingQualityKind.value === 'video') {
    return [{ value: 'mic', label: t('direct.quality.audioMic') }]
  }
  return isMobile
    ? [{ value: 'mic', label: t('direct.quality.audioMic') }]
    : [
        { value: 'mic', label: t('direct.quality.audioMic') },
        { value: 'system', label: t('direct.quality.audioSystem') },
      ]
})

/** 音频来源勾选集合（多选；屏幕共享可同时勾选 麦克风+系统声音） */
const audioSourceSelections = ref<string[]>([])

/** 可用摄像头设备列表（桌面端按设备模式枚举；权限授予后填充） */
const videoDevices = ref<MediaDeviceInfo[]>([])
/** 摄像头设备选项（桌面端按设备模式；value=deviceId） */
const videoDeviceOptions = computed(() =>
  videoDevices.value.map((d) => ({
    value: d.deviceId,
    label: d.label || t('direct.quality.videoCamera'),
  }))
)

/** 摄像头选择方式：移动端/平板=位置（前后置，系统自动选该方向最合适的摄像头）；桌面=设备（具体摄像头）。
 *  getUserMedia 同一时刻仅一路视频源，故均为单选——共享中切换走 switchCamera。 */
const cameraSelectMode = ref<'position' | 'device'>('position')

/** 摄像头选项（按端）：平板/手机=前后置；桌面=枚举出的设备列表 */
const cameraPickOptions = computed(() =>
  isMobile
    ? [
        { value: 'user', label: t('direct.quality.frontCamera') },
        { value: 'environment', label: t('direct.quality.backCamera') },
      ]
    : videoDeviceOptions.value
)

/** 已选摄像头（position=user/environment；device=deviceId） */
const selectedCamera = ref<string>('user')

/** 摄像头选择提示（平板/手机：系统自动选该方向最合适的摄像头，无需选具体设备） */
const cameraSelectHint = computed(() =>
  isMobile ? t('direct.quality.cameraPositionHint') : ''
)

/** 预览当前选中的摄像头（切换时重开预览） */
const previewSelectedCamera = async () => {
  await refreshCameraPreview(
    cameraSelectMode.value === 'position' ? selectedCamera.value : undefined,
    cameraSelectMode.value === 'device' ? selectedCamera.value : undefined
  )
}

/** 切换摄像头（单选）：更新选择并重新预览 */
const onCameraSelect = async (value: string) => {
  selectedCamera.value = value
  await previewSelectedCamera()
}

/** 音频下拉多选变更 */
const onAudioToggle = (next: string[]) => {
  audioSourceSelections.value = next
}

/** 勾选集合 → 兼容旧的 单值 音频来源（供 startMediaShare 使用） */
const selectedAudioSource = computed<'none' | 'mic' | 'system' | 'both'>(() => {
  const sel = audioSourceSelections.value
  if (sel.includes('mic') && sel.includes('system')) return 'both'
  if (sel.includes('mic')) return 'mic'
  if (sel.includes('system')) return 'system'
  return 'none'
})

const qualityModalTitle = computed(() =>
  pendingQualityKind.value === 'screen' ? t('direct.quality.screenTitle') : t('direct.quality.videoTitle')
)

/** 打开质量选择：默认值 = 本地偏好 > 后台默认 > auto；视频共享同时预取摄像头并显示实时预览配置 */
const openQualityPicker = async (kind: 'screen' | 'video') => {
  pendingQualityKind.value = kind
  const saved = readPreference(STORAGE_KEY_QUALITY, '')
  const backendDefault = config.value.mediaDefaultQuality || 'auto'
  const validTiers = ['low', 'sd', 'hd', 'uhd', 'origin', 'auto']
  selectedQuality.value = validTiers.includes(saved) ? saved : (validTiers.includes(backendDefault) ? backendDefault : 'auto')
  // 音频来源（下拉多选，无"无声音"选项）：视频共享固定 麦克风；屏幕共享 = 本地偏好 > 默认 麦克风+系统声音，移动端仅麦克风
  if (kind === 'video') {
    audioSourceSelections.value = ['mic']
  } else {
    const savedAudio = readPreference(STORAGE_KEY_AUDIO, '')
    const prefer = !isMobile && ['both', 'system', 'mic'].includes(savedAudio) ? savedAudio : (isMobile ? 'mic' : 'both')
    audioSourceSelections.value =
      prefer === 'mic' ? ['mic'] : prefer === 'system' ? ['system'] : ['mic', 'system']
  }
  // 视频共享：按端确定选择方式 + 预取摄像头预览
  if (kind === 'video') {
    if (isMobile) {
      // 平板/手机：按位置（前后置），系统自动选该方向最合适的摄像头
      cameraSelectMode.value = 'position'
      if (selectedCamera.value !== 'user' && selectedCamera.value !== 'environment') {
        selectedCamera.value = 'user'
      }
      await previewSelectedCamera()
    } else {
      // 桌面：按设备（枚举具体摄像头）
      cameraSelectMode.value = 'device'
      // 首次预取：触发权限授权，使 enumerateDevices 能返回带 deviceId 的摄像头列表
      await connection.startSharePreview('video')
      const devices = await connection.listVideoInputDevices()
      videoDevices.value = devices
      if (devices.length > 0) {
        const keep = devices.some((d) => d.deviceId === selectedCamera.value)
        selectedCamera.value = keep ? selectedCamera.value : devices[0].deviceId
        await refreshCameraPreview(undefined, selectedCamera.value)
      } else {
        // 无摄像头设备：回退前置
        cameraSelectMode.value = 'position'
        selectedCamera.value = 'user'
        await previewSelectedCamera()
      }
    }
  }
  showQualityModal.value = true
}

/** 预览失败（采集被拒/设备不支持并发）的摄像头 key 集合 */
const previewFailedKeys = ref<Set<string>>(new Set())

/** 预览流版本号：采集成功后递增，强制重建 video 元素重新绑定新流（切换摄像头时预览跟随更新） */
const previewStreamVersion = ref(0)

/** 当前预览摄像头 key（单路：deviceId 或 facing 值） */
const previewCameraKey = computed(() => selectedCamera.value || 'user')

/** 采集指定摄像头并刷新预览：成败均由采集结果驱动，不再依赖 ref 回调时机误判失败。
   *  成功 → 递增版本号强制 video 重建并绑定新流（解决"切换摄像头预览不更新/卡失败"）；
   *  失败 → 标记该 key 显示占位（cameraPreviewError 已记录细分原因，如权限被拒/无摄像头）。 */
const refreshCameraPreview = async (facingMode?: string, deviceId?: string) => {
  const key = deviceId && deviceId !== 'user' && deviceId !== 'environment' ? deviceId : (facingMode || 'user')
  // 切换开始：先清除该 key 的旧失败标记，避免"正在采集"期间误显失败占位
  const clearing = new Set(previewFailedKeys.value)
  clearing.delete(key)
  previewFailedKeys.value = clearing
  connection.stopSharePreview()
  const ok = await connection.startSharePreview('video', facingMode, deviceId)
  if (ok) {
    // 成功：确认清除失败标记，并强制重建 video 元素（:key 变化 → 重新绑定新流）
    previewFailedKeys.value = clearing
    previewStreamVersion.value++
  } else {
    // 失败：标记占位（具体原因由 cameraPreviewError 驱动文案）；v-if 切到占位分支，无需重建 video
    const failed = new Set(previewFailedKeys.value)
    failed.add(key)
    previewFailedKeys.value = failed
  }
}

/** 重试单路预览：重新采集（成败由采集结果驱动） */
const retryCameraPreview = (key: string) =>
  cameraSelectMode.value === 'position'
    ? refreshCameraPreview(key)
    : refreshCameraPreview(undefined, key)

/** 预览失败原因（DOMException.name 或能力预检的 'insecure'/'unsupported'） */
const previewFailReason = computed(() => connection.cameraPreviewError?.value || '')

/** 是否未检测到摄像头设备（预览失败且错误为 NotFoundError=无摄像头） */
const cameraNotFound = computed(() => previewFailReason.value === 'NotFoundError')

/** 权限被拒（用户拒绝授权 → 重试有意义，提示用户允许后重试） */
const cameraDenied = computed(() => ['NotAllowedError', 'SecurityError'].includes(previewFailReason.value))

/** 非安全上下文（HTTP/局域网 IP 真机访问 → 无法在代码层面解决，隐藏重试） */
const cameraInsecure = computed(() => previewFailReason.value === 'insecure')

/** 浏览器不支持 mediaDevices（隐藏重试） */
const cameraUnsupported = computed(() => previewFailReason.value === 'unsupported')

/** 预览失败提示文案：按失败原因细分，手机上不再统一误报"设备不支持多路开启" */
const previewFailText = computed(() => {
  if (cameraNotFound.value) return t('direct.quality.cameraNotFound')
  if (cameraDenied.value) return t('direct.room.mediaDenied')
  if (cameraInsecure.value) return t('direct.room.mediaInsecure')
  if (cameraUnsupported.value) return t('direct.room.mediaUnsupported')
  return t('direct.quality.cameraPreviewFailed')
})

/** 逐路预览视频元素绑定（流来自 connection.getPreviewStream(key)）。
   *  只在流就绪时绑定 srcObject；流未就绪（切换中/采集失败）不在此误判失败——
   *  失败标记由 refreshCameraPreview 的采集结果驱动，避免"切换时误报无法打开"。 */
const bindConfigPreviewVideo = (el: unknown, key: string) => {
  const video = el as HTMLVideoElement | null
  if (!video) return
  const stream = connection.getPreviewStream(key)
  if (stream && video.srcObject !== stream) {
    video.srcObject = stream
  }
}

/** 取消共享（关闭质量弹窗，不开始共享；视频预览流一并释放） */
const cancelQuality = () => {
  showQualityModal.value = false
  pendingQualityKind.value = null
  connection.stopSharePreview()
}

/** 确认档位 → 开始共享（视频共享接管预览流，按档位与音频来源共享） */
const confirmQuality = async () => {
  const kind = pendingQualityKind.value
  if (!kind) return
  writePreference(STORAGE_KEY_QUALITY, selectedQuality.value)
  // 音频来源：屏幕/视频共享均取下拉多选结果；屏幕共享额外存入本地偏好
  const audioSource = selectedAudioSource.value
  if (kind === 'screen') writePreference(STORAGE_KEY_AUDIO, audioSource)
  showQualityModal.value = false
  pendingQualityKind.value = null
  // 视频共享：接管选中摄像头预览流（不停止轨道）；码率/帧率由档位决定，不再手动调节。
  // 单摄像头：位置（前后置）或设备（deviceId），共享中切换走 switchCamera
  const preview = kind === 'video' ? connection.getPreviewStream(selectedCamera.value) || null : null
  try {
    const result = await connection.startMediaShare(kind, selectedQuality.value, audioSource, {
      stream: preview,
      facingMode: kind === 'video' && cameraSelectMode.value === 'position' ? selectedCamera.value : undefined,
      deviceId: kind === 'video' && cameraSelectMode.value === 'device' ? selectedCamera.value : undefined,
    })
    if (!result.ok) {
      alertStore.showAlert(mediaErrorText(result.reason), 'error')
      return
    }
    // 共享开始：初始化控制面板状态（档位标签 + 音频/系统音可用性）
    shareQualitySelectValue.value = selectedQuality.value
    shareAudioOn.value = true
    shareSystemAudioOn.value = true
    shareHasAudio.value = connection.hasMediaAudio()
    // 系统音开关：音频来源含系统音（system/both）即显示（不依赖设备是否实际返回音轨）
    const audioKind = connection.currentShareAudioKind?.value
    shareSystemAudioAvailable.value = audioKind === 'system' || audioKind === 'both'
    // 麦克风预取失败（权限被拒/设备无麦克风）：屏幕共享继续，但明确提示用户
    shareMicFailed.value = !!connection.micFailed?.value
    // 屏幕共享降级为前置摄像头（当前浏览器无屏幕采集 API）：明确告知用户
    shareUsesCamera.value = !!connection.screenUsesCamera?.value
    // 视频共享：刷新设备列表供共享中切换
    if (kind === 'video') {
      const devices = await connection.listVideoInputDevices()
      if (devices.length > 0) videoDevices.value = devices
    }
  } catch {
    // 异常兜底：提示失败且不进入共享状态（按钮可再次点击重试）
    alertStore.showAlert(t('direct.quality.shareStartFailed'), 'error')
  }
}

/** 共享者本地预览：绑定本地媒体流到预览 video */
const bindLocalPreview = (el: unknown) => {
  const video = el as HTMLVideoElement | null
  if (!video) return
  const stream = connection.localMediaStream?.value
  if (stream && video.srcObject !== stream) {
    video.srcObject = stream
  }
}

/** 本地预览静音状态：默认静音防回声；打开后可试听本机拾取的音频（不影响发送） */
const localPreviewMuted = ref(true)
const toggleLocalPreviewMute = () => {
  localPreviewMuted.value = !localPreviewMuted.value
}

/** 查看某人的共享（主动拉流） */
const viewShare = async (fromId: string) => {
  // P2P 直连可用走实时流；不可用自动切服务器中转（无需手动选择）。
  // 返回 false 仅当：中转被后台关闭 且 P2P 不可用。
  const ok = await connection.pullMedia(fromId)
  if (!ok) {
    alertStore.showAlert(t('direct.room.viewShareFailed'), 'error')
  }
}

/** 忽略某人的共享（仅本地隐藏通知） */
const ignoreShare = (fromId: string) => {
  directStore.removeActiveShare(fromId)
}

// ==================== 文件接收 ====================
const handleAccept = (transferId: string) => {
  connection.respondFileOffer(transferId, true)
}

const handleDecline = (transferId: string) => {
  connection.respondFileOffer(transferId, false)
}

const handleCancelOutgoing = (transferId: string) => {
  connection.cancelOutgoing(transferId)
}

const handleSaveIncoming = async (transferId: string) => {
  const item = await directStore.consumeIncomingBlob(transferId)
  if (item) {
    downloadBlob(item.blob, item.name)
  }
}

// 接收完成后自动下载
watch(
  () => directStore.items.map((it) => (it.kind === 'file' ? `${it.id}-${it.fileStatus}` : '')).join('|'),
  () => {
    for (const it of directStore.items) {
      if (it.kind === 'file' && it.fileDirection === 'incoming' && it.fileStatus === 'done' && !savedIncomingIds.has(it.id)) {
        savedIncomingIds.add(it.id)
        handleSaveIncoming(it.id)
        alertStore.showAlert(t('direct.room.received', { name: it.fileName }), 'success')
      }
    }
  }
)

// ==================== 滚动控制 ====================
const handleScroll = () => {
  const el = msgListRef.value
  if (!el) return
  atBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 100
}

const scrollToBottom = () => {
  nextTick(() => {
    const el = msgListRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
      atBottom.value = true
    }
  })
}
watch(
  () => directStore.items.length,
  () => {
    if (atBottom.value) scrollToBottom()
  }
)

function showTimeSeparator(index: number): boolean {
  if (index === 0) return true
  const prev = directStore.items[index - 1]
  const curr = directStore.items[index]
  if (curr.kind === 'system') return false
  return new Date(prev.ts).toDateString() !== new Date(curr.ts).toDateString()
}

function formatDateSeparator(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  if (d.toDateString() === today.toDateString()) return t('direct.room.today')
  if (d.toDateString() === yesterday.toDateString()) return t('direct.room.yesterday')
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ==================== 其他 ====================
const showShare = ref(false)
const showNicknameModal = ref(false)
const nicknameInput = ref('')

const confirmNickname = () => {
  const name = nicknameInput.value.trim()
  if (!name) return
  writePreference(STORAGE_KEYS.DIRECT_NICKNAME, name)
  showNicknameModal.value = false
  setupRoom()
}

const goHome = () => {
  router.push('/')
}

/** 手动重连（重试次数耗尽后由用户触发） */
const handleReconnect = () => {
  connection.connect(roomCode.value, readPreference(STORAGE_KEYS.DIRECT_NICKNAME, '') || '匿名')
}

// 房间已满（服务端 1013 关闭）→ 提示并返回首页
watch(
  () => connection.roomFull,
  (full) => {
    if (full) {
      alertStore.showAlert(t('direct.room.full'), 'warning')
      goHome()
    }
  }
)

// ==================== 初始化 ====================
function setupRoom() {
  directStore.loadRoom(roomCode.value)
    .then(() => {
      fileDataStore.addDirectRecord({
        title: directStore.activeRoom?.title || '',
        roomCode: roomCode.value,
      })
      connection.connect(roomCode.value, readPreference(STORAGE_KEYS.DIRECT_NICKNAME, '') || '匿名')
      scrollToBottom()
    })
    .catch((err: unknown) => {
      const msg = String((err as Error).message || err)
      if (msg.includes('410') || msg.includes('过期')) {
        alertStore.showAlert(t('direct.join.expired'), 'error')
      } else {
        alertStore.showAlert(t('direct.join.notFound'), 'error')
      }
      router.replace('/')
    })
}

onMounted(() => {
  const savedName = readPreference(STORAGE_KEYS.DIRECT_NICKNAME, '')
  if (savedName) {
    setupRoom()
  } else {
    showNicknameModal.value = true
  }
})

onUnmounted(() => {
  endFloatDrag()
  connection.disconnect()
  directStore.reset()
})
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.4);
  border-radius: 3px;
}
</style>
