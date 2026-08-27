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
              <!-- 摄像头切换中：悬浮在预览视频上方 -->
              <div
                v-if="cameraSwitching"
                class="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
              >
                <span class="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                  :class="[isDarkMode ? 'bg-gray-900/80 text-indigo-200' : 'bg-white/90 text-indigo-700']"
                >
                  <span class="w-3 h-3 rounded-full border-2 border-transparent border-t-current border-b-current animate-spin"></span>
                  {{ t('direct.room.cameraSwitching') }}
                </span>
              </div>
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
            <!-- 多摄共享：附加摄像头本地预览（每路一个小窗，仅视频轨） -->
            <div v-if="localCameraIdxList.length > 0" class="mt-1.5 flex gap-1.5 overflow-x-auto">
              <div
                v-for="idx in localCameraIdxList"
                :key="idx"
                class="relative rounded-xl overflow-hidden border shrink-0 w-24"
                :class="[isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-black']"
              >
                <video
                  :ref="(el) => bindLocalCameraPreview(el, idx)"
                  autoplay
                  playsinline
                  muted
                  class="w-full max-h-20 bg-black"
                ></video>
                <span class="absolute top-1 left-1 px-1 py-px rounded text-[8px] bg-black/60 text-white">
                  {{ t('direct.quality.videoCamera') }} {{ idx + 1 }}
                </span>
              </div>
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
              <!-- 摄像头切换（视频共享：多摄像头/多朝向即时切换；多摄同时共享中不显示——切换主摄不影响其他路，
              重新配置请先结束共享；屏幕共享不显示） -->
              <div v-if="isSharingVideo && !isMultiCameraSharing && shareCameraOptions.length > 1" class="flex items-center gap-1.5">
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

        <!-- 媒体流（传屏幕/传视频）：已查看的共享实时渲染。
             同共享者多摄像头 → 合并到同一窗口，按数量网格分割（类海康大屏）；
             悬浮中的共享者不在列表展示。 -->
        <div
          v-for="[sharerId, keys] in groupedMediaStreams"
          :key="sharerId"
          v-show="floatingFromId !== sharerId"
          class="flex justify-start"
        >
          <div class="max-w-[85%] min-w-0 w-full">
            <p class="text-xs mb-1 px-1 flex items-center gap-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              <MonitorIcon v-if="isScreenGroup(sharerId)" class="w-3 h-3" />
              <VideoIcon v-else class="w-3 h-3" />
              {{ memberNickname(sharerId) }} {{ t('direct.room.mediaShare') }}
              <!-- 多摄提示：N 路摄像头同窗显示 -->
              <span
                v-if="isMultiCameraGroup(keys)"
                class="px-1 py-px rounded text-[9px] shrink-0"
                :class="[isDarkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100 text-indigo-700']"
              >
                {{ keys.length }} {{ t('direct.room.multiCameras') }}
              </span>
            </p>
            <!-- 视频容器：多摄网格 / 单摄单格；右上角操作图标按共享者整体显示 -->
            <div class="relative rounded-2xl overflow-hidden shadow-sm border" :class="[isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-black']">
              <div
                class="grid gap-px bg-black"
                :class="[cameraGroupHeightClass(keys.length), cameraGridClass(keys.length)]"
              >
                <div
                  v-for="fromId in keys"
                  :key="fromId"
                  class="relative bg-black min-w-0 min-h-0 overflow-hidden"
                >
                  <video
                    :ref="(el) => bindMediaVideo(el, fromId)"
                    :data-from-id="fromId"
                    data-loc="list"
                    playsinline
                    :controls="!isMultiCameraGroup(keys)"
                    class="w-full h-full object-contain bg-black"
                    :class="cameraCellClass(keys.length)"
                  ></video>
                  <!-- 多摄时格内角标：摄像头 N -->
                  <span
                    v-if="isMultiCameraGroup(keys)"
                    class="absolute top-1 left-1 px-1 py-px rounded text-[9px] bg-black/60 text-white/80"
                  >
                    {{ t('direct.quality.videoCamera') }} {{ mediaStreamKeyIdx(fromId) + 1 }}
                  </span>
                  <!-- 静音自动播放提示 -->
                  <button
                    v-if="mutedVideoFromIds.has(fromId)"
                    @click.stop="unmuteShareVideo(fromId)"
                    class="absolute inset-x-0 bottom-2 mx-auto w-fit px-3 py-1 rounded-full text-[11px] font-medium text-white bg-black/60 hover:bg-black/75 transition-colors backdrop-blur-sm"
                    :title="t('direct.room.tapToUnmute')"
                  >
                    🔇 {{ t('direct.room.tapToUnmute') }}
                  </button>
                </div>
              </div>
              <!-- 操作：观看模式 / 悬浮 / 退出查看（按共享者整体） -->
              <div class="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  @click="enterViewMode(sharerId)"
                  class="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                  :title="t('direct.room.enterViewMode')"
                >
                  <ExpandIcon class="w-4 h-4" />
                </button>
                <button
                  @click="floatingFromId = sharerId"
                  class="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                  :title="t('direct.room.floatWindow')"
                >
                  <PictureInPicture2Icon class="w-4 h-4" />
                </button>
                <button
                  @click="exitView(sharerId)"
                  class="p-1.5 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-colors backdrop-blur-sm"
                  :title="t('direct.room.exitView')"
                >
                  <XIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 中转媒体流（服务器中转的屏幕/视频，MediaSource 流式播放）；多摄同窗口网格分割 -->
        <div
          v-for="[sharerId, keys] in groupedRelayStreams"
          :key="sharerId"
          class="flex justify-start"
        >
          <div class="max-w-[85%] min-w-0 w-full">
            <p class="text-xs mb-1 px-1 flex items-center gap-1" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              <MonitorIcon v-if="isScreenGroup(sharerId)" class="w-3 h-3" />
              <VideoIcon v-else class="w-3 h-3" />
              {{ memberNickname(sharerId) }} {{ t('direct.room.mediaShare') }}
              <!-- 多摄提示：N 路摄像头同窗显示 -->
              <span
                v-if="isMultiCameraGroup(keys)"
                class="px-1 py-px rounded text-[9px] shrink-0"
                :class="[isDarkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100 text-indigo-700']"
              >
                {{ keys.length }} {{ t('direct.room.multiCameras') }}
              </span>
              <span class="px-1 py-px rounded text-[9px] shrink-0" :class="[isDarkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700']">
                {{ t('direct.room.modeRelay') }}
              </span>
            </p>
            <div class="relative rounded-2xl overflow-hidden shadow-sm border" :class="[isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-black']">
              <div
                class="grid gap-px bg-black"
                :class="[cameraGroupHeightClass(keys.length), cameraGridClass(keys.length)]"
              >
                <div
                  v-for="fromId in keys"
                  :key="fromId"
                  class="relative bg-black min-w-0 min-h-0 overflow-hidden"
                >
                  <video
                    :ref="(el) => bindMediaRelayVideo(el, fromId)"
                    :data-from-id="fromId"
                    data-loc="list"
                    playsinline
                    :controls="!isMultiCameraGroup(keys)"
                    class="w-full h-full object-contain bg-black"
                    :class="cameraCellClass(keys.length)"
                  ></video>
                  <!-- 多摄时格内角标：摄像头 N -->
                  <span
                    v-if="isMultiCameraGroup(keys)"
                    class="absolute top-1 left-1 px-1 py-px rounded text-[9px] bg-black/60 text-white/80"
                  >
                    {{ t('direct.quality.videoCamera') }} {{ mediaStreamKeyIdx(fromId) + 1 }}
                  </span>
                  <!-- 静音自动播放提示 -->
                  <button
                    v-if="mutedVideoFromIds.has(fromId)"
                    @click.stop="unmuteShareVideo(fromId)"
                    class="absolute inset-x-0 bottom-2 mx-auto w-fit px-3 py-1 rounded-full text-[11px] font-medium text-white bg-black/60 hover:bg-black/75 transition-colors backdrop-blur-sm"
                    :title="t('direct.room.tapToUnmute')"
                  >
                    🔇 {{ t('direct.room.tapToUnmute') }}
                  </button>
                </div>
              </div>
              <!-- 操作：观看模式 / 退出查看（按共享者整体） -->
              <div class="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  @click="enterViewMode(sharerId)"
                  class="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                  :title="t('direct.room.enterViewMode')"
                >
                  <ExpandIcon class="w-4 h-4" />
                </button>
                <button
                  @click="exitView(sharerId)"
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
        <!-- 大画面：多摄 → 网格分割（类海康大屏）；单摄 → 全屏单格 -->
        <div class="flex-1 relative">
          <div
            v-if="viewModeKeys.length > 0"
            class="grid gap-px h-full bg-black"
            :class="cameraGridClass(viewModeKeys.length)"
          >
            <div
              v-for="(key, ci) in viewModeKeys"
              :key="key"
              class="relative bg-black min-w-0 min-h-0 overflow-hidden"
            >
              <video
                :ref="(el) => bindViewModeCamera(el, key)"
                playsinline
                :controls="!isMultiCameraGroup(viewModeKeys)"
                class="w-full h-full object-contain bg-black"
              ></video>
              <!-- 多摄时格内角标：摄像头 N -->
              <span
                v-if="isMultiCameraGroup(viewModeKeys)"
                class="absolute top-2 left-2 px-1.5 py-px rounded text-[10px] bg-black/60 text-white/80"
              >
                {{ t('direct.quality.videoCamera') }} {{ ci + 1 }}
              </span>
            </div>
          </div>
          <!-- 静音自动播放提示：点一下开启声音 -->
          <button
            v-if="mutedVideoFromIds.has(viewModeFromId!)"
            @click.stop="unmuteShareVideo(viewModeFromId!)"
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

        <!-- 摄像头选择：多选仅桌面（手机/平板单选）；无设备 → 明确提示 -->
        <div v-if="pendingQualityKind === 'video'" class="pt-1 space-y-2">
          <p class="text-sm font-medium" :class="[isDarkMode ? 'text-gray-200' : 'text-gray-700']">
            {{ t('direct.quality.videoCamera') }}
          </p>
          <!-- 无摄像头设备：直接提示，不渲染选择下拉 -->
          <p
            v-if="!cameraLoading && videoDevices.length === 0"
            class="text-xs mt-1"
            :class="[isDarkMode ? 'text-red-400' : 'text-red-500']"
          >
            {{ t('direct.quality.cameraNotFound') }}
          </p>
          <template v-else>
          <ThemeDropdown
            v-if="multiCamerasEnabled"
            :options="cameraPickOptions"
            :model-value="selectedCameras"
            multi
            width="w-full"
            :placeholder="t('direct.quality.cameraPickPlaceholder')"
            @update:model-value="onCamerasMultiSelect($event as string[])"
          />
          <ThemeDropdown
            v-else
            :options="cameraPickOptions"
            :model-value="selectedCamera"
            width="w-full"
            :placeholder="t('direct.quality.cameraPickPlaceholder')"
            @update:model-value="onCameraSelect($event as string)"
          />
          </template>
          <p v-if="cameraSelectHint" class="text-[11px]" :class="[isDarkMode ? 'text-gray-500' : 'text-gray-400']">
            {{ cameraSelectHint }}
          </p>
          <p
            v-if="singleCameraOnly"
            class="text-[11px]"
            :class="[isDarkMode ? 'text-amber-400' : 'text-amber-600']"
          >
            {{ t('direct.quality.cameraSingleOnly') }}
          </p>
          <p
            v-if="multiCameraMode"
            class="text-[11px]"
            :class="[isDarkMode ? 'text-indigo-400' : 'text-indigo-600']"
          >
            {{ t('direct.quality.cameraMultiHint') }}
          </p>
        </div>

        <!-- 视频共享配置：实时预览（确认后按档位共享，预览即所得）。
             多摄模式 → 每路选中摄像头一个预览窗（label=设备名）；单摄 → 主摄单窗。
             用户未选摄像头时显示"请选择摄像头"提示，不自动预览。 -->
        <div v-if="pendingQualityKind === 'video'" class="pt-1 space-y-2">
          <p v-if="!cameraSelected" class="text-xs h-20 flex items-center justify-center rounded-xl border border-dashed"
            :class="[isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400']">
            {{ t('direct.quality.cameraPickHint') }}
          </p>
          <div v-else class="space-y-2">
            <!-- 摄像头加载中：动画 + 提示（首次权限+采集通常需 1~3s） -->
            <div v-if="cameraLoading" class="h-32 flex flex-col items-center justify-center gap-2 rounded-lg border bg-black/5"
              :class="[isDarkMode ? 'border-gray-700' : 'border-gray-200']">
              <div class="w-6 h-6 rounded-full border-2 border-transparent border-t-indigo-500 border-b-indigo-500 animate-spin"></div>
              <span class="text-[11px]" :class="[isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ t('direct.quality.cameraLoading') }}</span>
            </div>
            <!-- 视频预览：多摄同一窗口网格分割；单摄单格。窄边框、不铺大黑块，摄像头文字在视频左上角 -->
            <div
              v-else
              class="grid overflow-hidden rounded-lg border"
              :class="[
                cameraGridClass(previewKeys.length),
                multiCameraMode ? 'h-44' : 'h-40',
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              ]"
            >
              <div
                v-for="(key, i) in previewKeys"
                :key="key"
                class="relative min-w-0 min-h-0"
              >
                <!-- 预览失败 → 占位提示 + 重试 -->
                <div v-if="previewFailedKeys.has(key)" class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 p-1">
                  <span class="text-[10px] text-white/80 text-center px-1">{{ previewFailText }}</span>
                  <button
                    v-if="!cameraNotFound && !cameraInsecure && !cameraUnsupported"
                    type="button"
                    @click="retryCameraPreview(key)"
                    class="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    {{ t('direct.quality.cameraPreviewRetry') }}
                  </button>
                </div>
                <video
                  v-else
                  :key="`${key}:${previewStreamVersion}`"
                  :ref="(el) => bindConfigPreviewVideo(el, key)"
                  muted
                  autoplay
                  playsinline
                  class="w-full h-full object-contain"
                ></video>
                <!-- 摄像头文字：视频左上角 -->
                <span class="absolute top-1 left-1 px-1 py-px rounded text-[9px] bg-black/50 text-white leading-none">
                  {{ multiCameraPreviewLabel(i, previewKeys.length, key) }}
                </span>
              </div>
            </div>
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
import { isLowEndBrowser, isMobileDevice } from '@/utils/device'
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

/** 从媒体流复合键 `fromId:idx` 解析摄像头索引（多摄像头分路渲染用；无 idx 视为 0） */
const mediaStreamKeyIdx = (key: string) => {
  const idx = Number(key.includes(':') ? key.split(':')[1] : 0)
  return Number.isFinite(idx) ? idx : 0
}

/** 中转媒体（MediaSource）key 列表：响应式触发渲染 */
const mediaRelayKeys = computed(() => directStore.mediaRelayFromIds)

// ==================== 多摄像头合并显示（同共享者多路同窗网格分割，类海康大屏） ====================
/** 媒体流按真实共享者分组（entries 数组：[[sharerId, keys...]]），同组多摄同一窗口网格显示 */
const groupedMediaStreams = computed<Array<[string, string[]]>>(() => {
  const groups = new Map<string, string[]>()
  for (const key of mediaStreamKeys.value) {
    const real = shareFromId(key)
    const arr = groups.get(real) || []
    arr.push(key)
    groups.set(real, arr)
  }
  // 组内按 idx 升序（主摄 0 在最前）
  for (const arr of groups.values()) arr.sort((a, b) => mediaStreamKeyIdx(a) - mediaStreamKeyIdx(b))
  return Array.from(groups.entries())
})

/** 中转媒体流按真实共享者分组（同上） */
const groupedRelayStreams = computed<Array<[string, string[]]>>(() => {
  const groups = new Map<string, string[]>()
  for (const key of mediaRelayKeys.value) {
    const real = shareFromId(key)
    const arr = groups.get(real) || []
    arr.push(key)
    groups.set(real, arr)
  }
  for (const arr of groups.values()) arr.sort((a, b) => mediaStreamKeyIdx(a) - mediaStreamKeyIdx(b))
  return Array.from(groups.entries())
})

/** 根据路数返回网格布局类（1=单屏 2=两格 3~4=2x2 5~9=3x3 10+ = 4x4） */
const cameraGridClass = (count: number): string => {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-2'
  if (count <= 9) return 'grid-cols-3'
  return 'grid-cols-4'
}

/** 根据路数返回单格高度类（路数多时格子更矮，保持整体高度合理） */
const cameraCellClass = (count: number): string => {
  if (count <= 1) return 'max-h-64'
  if (count === 2) return 'max-h-48'
  if (count <= 4) return 'max-h-40'
  if (count <= 9) return 'max-h-32'
  return 'max-h-24'
}

/** 每组视频容器高度（网格模式固定中等高度，避免多路卡片超高） */
const cameraGroupHeightClass = (count: number): string => {
  if (count <= 1) return ''
  return 'h-56 sm:h-64 md:h-72'
}

/** 该共享者是否多摄（≥2 路） */
const isMultiCameraGroup = (keys: string[]): boolean => keys.length >= 2

/** 组内是否是屏幕共享（显示 Monitor 图标；按共享者元数据判定） */
const isScreenGroup = (sharerId: string): boolean =>
  activeSharesMeta.value[sharerId]?.mediaType === 'screen'

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

/** 观看模式的多路 keys：该共享者的全部媒体流（P2P 或中转），多摄时网格分割显示 */
const viewModeKeys = computed(() => {
  const id = viewModeFromId.value
  if (!id) return []
  const p2p = groupedMediaStreams.value.find(([sid]) => sid === id)?.[1] || []
  const relay = groupedRelayStreams.value.find(([sid]) => sid === id)?.[1] || []
  // 两套不应同时存在（P2P 与中转互斥），取非空者
  return p2p.length > 0 ? p2p : relay
})

/** 观看模式下每格的视频绑定（按复合键取流/源） */
const bindViewModeCamera = (el: unknown, key: string) => {
  const video = el as HTMLVideoElement | null
  if (!video) return
  mediaVideoEls.set(key, video)
  const stream = directStore.getIncomingMediaStream(key)
  if (stream) {
    if (video.srcObject !== stream) video.srcObject = stream
    startMediaVideoPlayback(video, key)
  } else {
    const url = directStore.getMediaRelayUrl(key)
    if (url && video.src !== url) {
      video.src = url
    }
    if (url) startMediaVideoPlayback(video, key)
  }
}

/** 共享者：结束共享 */
const endMyShare = () => {
  shareMicFailed.value = false
  shareUsesCamera.value = false
  localCameraIdxList.value = []
  connection.stopMediaShare()
}

// ==================== 共享控制（分辨率切换 / 麦克风开关，即时生效） ====================
/** 当前生效档位标签（low/sd/hd/uhd/origin/auto 的映射值；auto 显示实际匹配档位） */
const shareQualitySelectValue = ref('auto')
const currentQualityLabel = computed(() => shareQualitySelectValue.value)
/** 是否正在共享视频（控制栏据此显示摄像头切换；屏幕共享不显示） */
const isSharingVideo = computed(() => connection.localMediaType?.value === 'video')

/** 是否正在多摄共享（主流 + 至少一路附加摄像头；多摄共享中隐藏"摄像头切换"下拉） */
const isMultiCameraSharing = computed(
  () => isSharingVideo.value && (connection.localCameraStreams?.size ?? 0) > 0
)

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

/** 共享中的摄像头切换（视频共享显示）：下拉选择具体设备，即时生效 */
const shareCameraOptions = computed(() =>
  videoDevices.value.map((d) => ({
    value: d.deviceId || 'default',
    label: d.label || t('direct.quality.videoCamera'),
  }))
)
const shareCameraValue = computed(() => selectedCamera.value || '')
/** 摄像头切换中（采集新轨需数百 ms~数秒；期间显示"切换中"提示，避免用户重复点击/误以为卡死） */
const cameraSwitching = ref(false)
const onShareCameraChange = async (value: string) => {
  if (cameraSwitching.value || value === selectedCamera.value) return // 切换中防重入；选同项忽略
  cameraSwitching.value = true
  try {
    const ok = await connection.switchCamera(undefined, value)
    if (ok) {
      selectedCamera.value = value
      alertStore.showAlert(t('direct.room.cameraSwitched'), 'success')
    } else {
      alertStore.showAlert(t('direct.room.cameraSwitchFailed'), 'error')
    }
  } catch {
    alertStore.showAlert(t('direct.room.cameraSwitchFailed'), 'error')
  } finally {
    cameraSwitching.value = false
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

/** 可用摄像头设备列表（权限授予后填充；部分浏览器未授权时 deviceId 可能为空，仍列出） */
const videoDevices = ref<MediaDeviceInfo[]>([])
/** 摄像头设备选项：value=deviceId；未授权/空 deviceId 的设备用占位 'default'（让浏览器选默认摄像头）。
 *  label 直接用设备名，超长由 ThemeDropdown 的 truncate + min-w-0 自动省略号截断（不手动截断，避免双省略/溢出） */
const videoDeviceOptions = computed(() =>
  videoDevices.value.map((d) => ({
    value: d.deviceId || 'default',
    label: d.label || t('direct.quality.videoCamera'),
  }))
)

/** 摄像头选择方式：统一按具体硬件设备列出（不再区分手机/电脑的前后置位置模式） */
const cameraSelectMode = ref<'position' | 'device'>('device')

/** 摄像头选项：始终为具体设备列表（把枚举到的摄像头硬件全部列给用户选择） */
const cameraPickOptions = computed(() => videoDeviceOptions.value)

/** 已选摄像头（position=user/environment；device=deviceId）。初始为空 = 用户尚未选择，由用户自行挑选 */
const selectedCamera = ref<string>('')

/** 多选摄像头集合（桌面端多摄使用；元素为 deviceId）。单选模式保持空数组走既有切换逻辑 */
const selectedCameras = ref<string[]>([])

/** 用户是否已选择摄像头（打开弹窗不自动选，需用户在下拉中主动选择） */
const cameraSelected = computed(() => !!selectedCamera.value)

/** 是否可多选摄像头：仅桌面端且枚举到 ≥2 个具体设备才允许多选（同时共享多路）。
 *  手机/平板【不允许多选】——移动端系统通常不支持多路并行采集，且前后置切换更直观，
 *  故移动端完全不提供摄像头选择 UI（无多选也无单选），共享直接用默认/首个摄像头。 */
const multiCamerasEnabled = computed(() => !isMobile && videoDevices.value.length >= 2)

/** 是否处于多摄多选模式：多选可用 + 至少选中 2 个摄像头 */
const multiCameraMode = computed(
  () => multiCamerasEnabled.value && selectedCameras.value.length >= 2
)

/** 共享配置阶段的多摄多选变更：更新集合并同步主摄像头（首个选中为主摄）。
 *  next 为空（用户取消全部）→ 仅清空选择，不自动预览；用户重新勾选再预览。 */
const onCamerasMultiSelect = async (next: string[]) => {
  selectedCameras.value = next
  if (next.length === 0) {
    selectedCamera.value = ''
  } else {
    // 首个选中作为主摄像头（含音频），其余为附加路；选中后预览
    const first = next[0]
    selectedCamera.value = first
    await previewSelectedCamera()
  }
}

/** 摄像头选择提示：统一设备模式，无额外提示 */
const cameraSelectHint = computed(() => '')

/** 是否仅检测到 1 路可用摄像头（单摄共享提示，避免用户误以为可选择多路） */
const singleCameraOnly = computed(
  () => !cameraLoading.value && videoDevices.value.length === 1
)

/** 预览当前选中的摄像头（切换时重开预览）。
   *  多摄多选模式：逐路采集选中设备（浏览器支持多路时才进入本分支），每路存 previewStreams；
   *  单摄模式：仅主摄单路。采集期间置 cameraLoading，完成后清除（含失败）。 */
const previewSelectedCamera = async () => {
  cameraLoading.value = true
  try {
    if (multiCameraMode.value && selectedCameras.value.length > 0) {
      // 多路预览：并行采集选中设备（浏览器支持多路时才进入本分支）。
      // 防御：同时打开过多 getUserMedia 流在低内存设备/部分浏览器上会崩溃，
      // 因此预览最多同时开 MAX_PREVIEW_CAMERAS 路，其余路仅展示但延迟到确认共享时再采集。
      connection.stopSharePreview()
      const clearing = new Set(previewFailedKeys.value)
      for (const key of selectedCameras.value) clearing.delete(key)
      previewFailedKeys.value = clearing
      const active = selectedCameras.value.slice(0, MAX_PREVIEW_CAMERAS)
      await Promise.all(
        active.map(async (key) => {
          const ok = await connection.startSharePreview('video', undefined, key)
          if (!ok) {
            const failed = new Set(previewFailedKeys.value)
            failed.add(key)
            previewFailedKeys.value = failed
          }
        })
      )
      previewStreamVersion.value++
    } else {
      // 统一设备模式：始终按 deviceId 采集预览（不传 facingMode）
      await refreshCameraPreview(undefined, selectedCamera.value)
    }
  } finally {
    cameraLoading.value = false
  }
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

/** 摄像头/麦克风权限状态检查（部分浏览器支持 navigator.permissions）：
 *  若被浏览器永久拒绝（denied），getUserMedia 不会再弹权限、预览必失败 —
 *  此时明确提示用户去浏览器设置开启，避免"不弹权限也不知道为什么"。 */
const checkCameraPermissionStatus = async () => {
  try {
    if (!navigator.permissions?.query) return
    const camera = await navigator.permissions.query({ name: 'camera' as PermissionName })
    if (camera.state === 'denied') {
      alertStore.showAlert(t('direct.quality.cameraPermissionDenied'), 'error')
      return
    }
    // 部分浏览器将 摄像头+麦克风 合并在 camera，缺失时单独查 microphone（降级）
    try {
      const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      if (mic.state === 'denied') {
        alertStore.showAlert(t('direct.quality.micPermissionDenied'), 'error')
      }
    } catch {
      /* microphone 权限不支持查询，忽略 */
    }
  } catch {
    /* 浏览器不支持 permissions API（如部分 iOS Safari），静默 */
  }
}

/** 打开质量选择：立即弹出配置弹窗；视频共享在弹窗内异步预取摄像头并显示实时预览配置。
 *  关键：先 showQualityModal 再启动摄像头枚举/预览（await 期间弹窗已在），
 *  采集失败/无摄像头也不阻断弹窗——预览区显示失败态（cameraPreviewError），而非整个弹窗不弹。 */
const openQualityPicker = async (kind: 'screen' | 'video') => {
  pendingQualityKind.value = kind
  showQualityModal.value = true // 立即弹窗，避免异步采集中或失败导致弹窗不出现
  cameraLoading.value = kind === 'video' // 视频共享：摄像头异步加载期间显示加载动画/提示
  cameraLoadingStart.value = Date.now()
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
  // 视频共享：全部统一为「设备模式」——枚举所有摄像头硬件，把具体设备列给用户自选，
  // 不再分手机/电脑的前后置位置模式（安卓多摄/鸿蒙等直接列主摄、广角、长焦等硬件）。
  // 不做自动选择/自动预览——用户在下拉里挑好摄像头后再预览。
  if (kind === 'video') {
    try {
      // 权限状态检查：若浏览器已记住"拒绝"，getUserMedia 不再弹权限 → 明确提示指引
      void checkCameraPermissionStatus()
      // 首次预取：触发权限授权；返回 false 表示无摄像头/采集失败——据此清 loading 并提示。
      const preOk = await connection.startSharePreview('video')
      const devices = await connection.listVideoInputDevices()
      // 枚举不到设备但预取成功（有摄像头可用）→ 补一个"默认摄像头"占位，保证下拉至少可选，
      // 避免"只有请选择摄像头文本、无下拉选项"的空列表。
      if (devices.length === 0 && preOk) {
        videoDevices.value = [{ kind: 'videoinput', deviceId: '', label: t('direct.quality.defaultCamera'), groupId: '', toJSON: () => ({}) } as unknown as MediaDeviceInfo]
      } else {
        videoDevices.value = devices
      }
      // 每次打开弹窗：清空已选摄像头，让用户自己挑选
      selectedCamera.value = ''
      selectedCameras.value = []
      cameraSelectMode.value = 'device'
      // 无论预取成功与否，枚举完成后即结束加载态：
      //  - 有设备 → loading 结束（用户自选后再预览）
      //  - 无设备（无摄像头/未授权）→ 结束 loading + 明确提示，不挂起也不报"加载超时"
      cameraLoading.value = false
      if (!preOk && devices.length === 0) {
        // 无摄像头设备：预览区显示"未检测到摄像头"占位（cameraPreviewError 驱动文案）
        alertStore.showAlert(t('direct.quality.cameraNotFound'), 'warning')
      }
    } catch (err) {
      // 摄像头采集/枚举异常：弹窗已打开，预览区走失败态；结束加载态
      console.warn('[direct] 摄像头枚举/预览失败', err)
      cameraLoading.value = false
    }
  }
}

/** 预览失败（采集被拒/设备不支持并发）的摄像头 key 集合 */
const previewFailedKeys = ref<Set<string>>(new Set())

/** 预览流版本号：采集成功后递增，强制重建 video 元素重新绑定新流（切换摄像头时预览跟随更新） */
const previewStreamVersion = ref(0)

/** 摄像头是否正在异步加载（首次枚举/采集、切换摄像头时置 true）——驱动加载动画与提示 */
const cameraLoading = ref(false)
/** 本次/上次加载起始时间（用于超时兜底，防止权限弹窗悬挂导致无限加载） */
const cameraLoadingStart = ref(0)
/** 摄像头加载超时（ms）：超过后仍无结果则提示用户，避免无限转圈 */
const CAMERA_LOAD_TIMEOUT = 15000

/** 摄像头加载超时兜底：loading 置 true 时启动定时器，超时仍未完成则停止加载并提示（如权限弹窗悬挂）。
 *  注意：无摄像头/采集失败路径会及时清 cameraLoading=false（不走超时），因此超时提示只在
 *  真正"卡住"（如权限弹窗悬挂、getUserMedia 无返回）时出现，不会误报。 */
watch(cameraLoading, (loading) => {
  if (!loading) return
  setTimeout(() => {
    if (cameraLoading.value) {
      cameraLoading.value = false
      alertStore.showAlert(t('direct.quality.cameraLoadTimeout'), 'warning')
    }
  }, CAMERA_LOAD_TIMEOUT)
})

/** 当前预览摄像头 key（单路：deviceId 或 facing 值）。用户未选择摄像头时为空字符串 */
const previewCameraKey = computed(() => selectedCamera.value || '')

/** 预览/共享同时打开的摄像头路数上限：资源受限浏览器（VIA 等）限 1 路（防崩溃闪退），
 *  普通设备上限 4 路（多开 getUserMedia 流在低内存/部分浏览器会崩溃，故设上限） */
const MAX_PREVIEW_CAMERAS = isLowEndBrowser() ? 1 : 4

/** 预览 key 列表：多摄多选模式 → 全部选中设备逐路预览；单摄 → 主摄单路。
 *  未选择摄像头时为空数组（预览区显示"请选择摄像头"提示）。
 *  预览最多展示 MAX_PREVIEW_CAMERAS 路（与预览采集上限一致，避免格内无流的空窗）。 */
const previewKeys = computed(() => {
  if (!selectedCamera.value) return []
  if (multiCameraMode.value && selectedCameras.value.length > 0) return [...selectedCameras.value].slice(0, MAX_PREVIEW_CAMERAS)
  return [previewCameraKey.value]
})

/** 预览格内标签：多摄 → "摄像头 N"；单摄 → "实时预览" */
const multiCameraPreviewLabel = (index: number, count: number, key: string): string => {
  if (count > 1) return `${t('direct.quality.videoCamera')} ${index + 1}`
  return t('direct.quality.configPreview')
}

/** 采集指定摄像头并刷新预览：成败均由采集结果驱动，不再依赖 ref 回调时机误判失败。
   *  成功 → 递增版本号强制 video 重建并绑定新流（解决"切换摄像头预览不更新/卡失败"）；
   *  失败 → 标记该 key 显示占位（cameraPreviewError 已记录细分原因，如权限被拒/无摄像头）。 */
const refreshCameraPreview = async (facingMode?: string, deviceId?: string) => {
  const key = deviceId && deviceId !== 'user' && deviceId !== 'environment' ? deviceId : (facingMode || 'user')
  cameraLoading.value = true // 切换/重试期间显示加载动画
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
  cameraLoading.value = false
}

/** 重试单路预览：重新采集（统一设备模式，按 deviceId；成败由采集结果驱动） */
const retryCameraPreview = (key: string) =>
  refreshCameraPreview(undefined, key)

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
  // 视频共享：未选择摄像头时不开始，提示先选（桌面/手机均由用户自选后共享）
  if (kind === 'video' && !cameraSelected.value) {
    alertStore.showAlert(t('direct.quality.cameraNotSelected'), 'warning')
    return
  }
  writePreference(STORAGE_KEY_QUALITY, selectedQuality.value)
  // 音频来源：屏幕/视频共享均取下拉多选结果；屏幕共享额外存入本地偏好
  const audioSource = selectedAudioSource.value
  if (kind === 'screen') writePreference(STORAGE_KEY_AUDIO, audioSource)
  showQualityModal.value = false
  pendingQualityKind.value = null
  // 视频共享：接管选中摄像头预览流（不停止轨道）；码率/帧率由档位决定，不再手动调节。
  // 统一按设备（deviceId）共享：主摄（含音频）+ 附加路（仅视频）同时传输，接收端分屏显示。
  // 手机/平板未提供选择 UI → 用默认/首个设备：deviceId = 已选 或 设备列表第一个 或 'default'
  const shareDeviceId = kind === 'video'
    ? (selectedCamera.value || videoDevices.value[0]?.deviceId || 'default')
    : undefined
  const preview = kind === 'video' && shareDeviceId ? connection.getPreviewStream(shareDeviceId) || null : null
  // 附加摄像头：多摄多选模式下除主摄外的其余选中设备（idx 从 1 开始递增）。
  // 防御：同时共享太多路（每路一路 getUserMedia 实时流）在低内存/部分浏览器会崩溃闪退，
  // 故附加路最多 MAX_PREVIEW_CAMERAS-1（主流 + 附加合计 ≤ MAX_PREVIEW_CAMERAS）。
  const extraCameras = multiCameraMode.value
    ? selectedCameras.value
        .filter((id) => id !== selectedCamera.value)
        .slice(0, MAX_PREVIEW_CAMERAS - 1)
        .map((id, i) => ({ idx: i + 1, deviceId: id }))
    : []
  try {
    const result = await connection.startMediaShare(kind, selectedQuality.value, audioSource, {
      stream: preview,
      deviceId: shareDeviceId,
      cameras: extraCameras,
    })
    if (!result.ok) {
      alertStore.showAlert(mediaErrorText(result.reason), 'error')
      return
    }
    // 多摄部分失败提示（附加路打不开不阻断主流共享）
    if (connection.shareCameraFailures > 0) {
      alertStore.showAlert(t('direct.quality.cameraPartialFailed', { count: connection.shareCameraFailures }), 'warning')
    }
    // 多摄超过同时共享上限（为防闪退截断至 4 路）→ 提示用户
    if (multiCameraMode.value && selectedCameras.value.length > MAX_PREVIEW_CAMERAS) {
      alertStore.showAlert(t('direct.quality.maxCamerasCapped', { max: MAX_PREVIEW_CAMERAS }), 'warning')
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
    // 视频共享：刷新设备列表供共享中切换 + 同步本地附加路预览列表（多摄）
    if (kind === 'video') {
      const devices = await connection.listVideoInputDevices()
      if (devices.length > 0) videoDevices.value = devices
      refreshLocalCameraIdxList()
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

/** 共享者本地预览：绑定附加摄像头流（多摄共享时逐路显示，仅视频轨） */
const bindLocalCameraPreview = (el: unknown, idx: number) => {
  const video = el as HTMLVideoElement | null
  if (!video) return
  const stream = connection.localCameraStreams?.get(idx)
  if (stream && video.srcObject !== stream) {
    video.srcObject = stream
  }
}

/** 共享中的附加摄像头 idx 列表（响应式 key 列表触发渲染） */
const localCameraIdxList = ref<number[]>([])

/** 共享开始/结束时同步本地附加路预览列表 */
const refreshLocalCameraIdxList = () => {
  const idxs = connection.localCameraStreams ? Array.from(connection.localCameraStreams.keys()).sort((a, b) => a - b) : []
  localCameraIdxList.value = [...idxs]
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
