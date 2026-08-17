/**
 * 媒体域：传屏幕/传视频的采集、质量档位、带宽自适应、共享控制，以及
 * P2P 不可用时的服务器中转（MediaRecorder → 分片中继）。
 * P2P 能力（建连/码率控制）由组合器经 setP2PApi 注入，避免与 p2p 域硬耦合。
 */
import { useDirectStore } from '@/stores/directStore'
import { useConfigStore } from '@/stores/configStore'
import { isMobileDevice } from '@/utils/device'
import { encodeDirectFrame } from '@/utils/direct-frame'
import type { DirectWSMessage } from '@/types/direct'
import type {
  DirectConnectionContext,
  MediaQualityPreset,
  ScreenAcquireResult,
} from './context'

/** 媒体域所需的最小 P2P 能力集（由组合器注入） */
export interface MediaP2PApi {
  removeP2P: (targetId: string) => void
  initiateP2P: (targetId: string) => unknown
  establishP2P: (targetId: string) => Promise<RTCDataChannel | null>
  capP2PVideoBitrate: (pc: RTCPeerConnection, preset: MediaQualityPreset) => void
}

export function createDirectMedia(ctx: DirectConnectionContext) {
  const directStore = useDirectStore()
  const configStore = useConfigStore()

  /** P2P 能力（组合器组装后注入） */
  let p2pApi: MediaP2PApi | null = null
  function setP2PApi(api: MediaP2PApi) {
    p2pApi = api
  }

  /** 当前通过中继观看的查看者 client_id 集合（共享者端维护，用于重建转发目标） */
  const mediaRelaySubscribers = new Set<string>()

  /** 接收者侧拉流的媒体流（P2P 媒体轨道由本端持有，P2P 连接本身在 ctx.p2p 中管理） */
  const mediaPullStreams = new Map<string, MediaStream>()

  // ============ 共享媒体质量档位与带宽自适应 ============
  // 固定档位：流畅(low)/标清(sd)/高清(hd)/超清(uhd,2K)/原画(origin,不压缩)。
  // 自动档：P2P 用 getStats 实测可用带宽；中转用后台限速配置或 RTT 粗估，动态匹配档位。
  // origin 分辨率宽高为 0：表示不施加分辨率/帧率约束（保留采集源原始分辨率），仅限制码率上限。
  const MEDIA_QUALITY_PRESETS: Record<'low' | 'sd' | 'hd' | 'uhd' | 'origin', MediaQualityPreset> = {
    low: { width: 640, height: 360, frameRate: 10, videoBitrate: 250_000, audioBitrate: 48_000, minBandwidth: 300_000 },
    sd: { width: 640, height: 480, frameRate: 15, videoBitrate: 500_000, audioBitrate: 64_000, minBandwidth: 900_000 },
    hd: { width: 1280, height: 720, frameRate: 20, videoBitrate: 1_200_000, audioBitrate: 64_000, minBandwidth: 2_400_000 },
    uhd: { width: 2560, height: 1440, frameRate: 24, videoBitrate: 4_000_000, audioBitrate: 96_000, minBandwidth: 8_000_000 },
    origin: { width: 0, height: 0, frameRate: 30, videoBitrate: 8_000_000, audioBitrate: 128_000, minBandwidth: 15_000_000 },
  }
  const MEDIA_QUALITY_ORDER: Array<'low' | 'sd' | 'hd' | 'uhd' | 'origin'> = ['low', 'sd', 'hd', 'uhd', 'origin']

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  /** getStats 候选对报告的字段子集（标准 RTCStats 不含 state/bitrate，按需声明） */
  interface RTCStatsLike {
    type?: string
    state?: string
    availableOutgoingBitrate?: number
    currentRoundTripTime?: number
  }

  // ============ 共享前本地预览（视频配置页面实时调节参数） ============

  // ============ 带宽实测（getStats 采样） ============
  function startBandwidthSampling() {
    if (ctx.bandwidthTimer) return
    void sampleBandwidth()
    ctx.bandwidthTimer = setInterval(() => void sampleBandwidth(), 3000)
  }

  function stopBandwidthSampling() {
    if (ctx.bandwidthTimer) {
      clearInterval(ctx.bandwidthTimer)
      ctx.bandwidthTimer = null
    }
  }

  /** 采样所有活跃 P2P 连接的可用带宽与 RTT（每 3s；auto 档匹配依据） */
  async function sampleBandwidth() {
    let bitrate = 0
    let rtt = 0
    for (const entry of ctx.p2p.values()) {
      try {
        const stats = await entry.pc.getStats()
        stats.forEach((report: RTCStatsLike) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.availableOutgoingBitrate) {
            bitrate = Math.max(bitrate, report.availableOutgoingBitrate)
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime) {
            rtt = Math.max(rtt, report.currentRoundTripTime * 1000)
          }
        })
      } catch {
        /* ignore */
      }
    }
    if (bitrate > 0) ctx.estimatedBandwidth.value = bitrate
    if (rtt > 0) ctx.estimatedRtt.value = rtt
  }

  /** 按可用带宽（bps）映射档位；kind 为 video 时上限 sd（移动端友好） */
  function bandwidthToPreset(availableBps: number, kind: 'screen' | 'video'): MediaQualityPreset {
    let idx = 0
    for (let i = 0; i < MEDIA_QUALITY_ORDER.length; i++) {
      if (availableBps >= MEDIA_QUALITY_PRESETS[MEDIA_QUALITY_ORDER[i]].minBandwidth) idx = i
    }
    let preset = MEDIA_QUALITY_PRESETS[MEDIA_QUALITY_ORDER[idx]]
    // 视频通话最高 sd（手机摄像头/带宽友好）；屏幕共享可达 超清/原画
    if (kind === 'video' && idx > 1) preset = MEDIA_QUALITY_PRESETS.sd
    return preset
  }

  /** 解析最终档位：auto → 按实测/配置带宽匹配；固定档 → 直接用 */
  async function resolveQuality(kind: 'screen' | 'video', requested: string): Promise<MediaQualityPreset> {
    if (requested === 'low' || requested === 'sd' || requested === 'hd' || requested === 'uhd' || requested === 'origin') {
      return MEDIA_QUALITY_PRESETS[requested]
    }
    // auto：优先后台中转限速（中转场景，最准确的约束）；否则用 P2P getStats 实测；再否则 RTT 粗估
    const relayLimit = configStore.config.directRelaySpeedLimit || 0
    if (relayLimit > 0) {
      // KB/s → bps（限速为服务端转发速率，取 80% 作为可用带宽）
      return bandwidthToPreset(relayLimit * 1024 * 0.8, kind)
    }
    if (ctx.estimatedBandwidth.value > 0) {
      return bandwidthToPreset(ctx.estimatedBandwidth.value, kind)
    }
    // 无实测数据：低 RTT 可尝试高清，否则标清
    if (ctx.estimatedRtt.value > 0 && ctx.estimatedRtt.value > 300) {
      return MEDIA_QUALITY_PRESETS.sd
    }
    return kind === 'video' ? MEDIA_QUALITY_PRESETS.sd : MEDIA_QUALITY_PRESETS.hd
  }

  /** 对视频轨道施加分辨率/帧率约束（按档位；origin 档 width=0 表示保留采集源原始分辨率，不约束） */
  async function applyTrackQuality(track: MediaStreamTrack, preset: MediaQualityPreset): Promise<void> {
    try {
      if (preset.width <= 0) {
        // 原画：只放开帧率上限（不强制），保留原始分辨率
        await track.applyConstraints({ frameRate: { max: preset.frameRate } })
        return
      }
      await track.applyConstraints({
        width: { ideal: preset.width },
        height: { ideal: preset.height },
        frameRate: { ideal: preset.frameRate, max: preset.frameRate },
      })
    } catch {
      /* 部分浏览器/设备不支持约束时忽略（仍可传输，只是未降档） */
    }
  }

  // ============ 共享音频来源（屏幕共享：无/麦克风/系统声音/两者；视频通话：麦克风） ============
  /** 麦克风开关（仅控制非系统音频轨道；系统音频由 setMediaSystemAudioEnabled 控制） */
  function setMediaAudioEnabled(enabled: boolean): void {
    if (!ctx.localMediaStream.value) return
    for (const track of ctx.localMediaStream.value.getAudioTracks()) {
      if (ctx.mediaSystemAudioTracks.has(track)) continue // 系统音频单独控制
      try {
        track.enabled = enabled
      } catch {
        /* ignore */
      }
    }
  }

  /** 系统声音开关（屏幕共享拾取的本机声音；仅当存在系统音轨时有效） */
  function setMediaSystemAudioEnabled(enabled: boolean): void {
    for (const track of ctx.mediaSystemAudioTracks) {
      try {
        track.enabled = enabled
      } catch {
        /* ignore */
      }
    }
  }

  /** 当前共享是否含音频（供 UI 显示音量开关） */
  function hasMediaAudio(): boolean {
    return !!ctx.localMediaStream.value && ctx.localMediaStream.value.getAudioTracks().length > 0
  }

  /** 当前共享是否含系统声音（供 UI 显示系统音开关） */
  function hasMediaSystemAudio(): boolean {
    return ctx.mediaSystemAudioTracks.size > 0
  }

  /** 记录系统音频轨道（getDisplayMedia audio 产生，与麦克风轨道区分） */
  function markSystemAudioTracks(stream: MediaStream): void {
    for (const track of stream.getAudioTracks()) ctx.mediaSystemAudioTracks.add(track)
  }

  /** 媒体能力检查：非安全上下文（http/局域网 IP）时 mediaDevices 不可用，手机真机常见 */
  function mediaCapabilityIssue(): string | null {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return 'insecure'
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'unsupported'
    }
    return null
  }

  // ============ 媒体采集（屏幕/麦克风/摄像头，含能力降级） ============
  /** 用户取消类错误（getDisplayMedia/getUserMedia 弹窗被拒或系统拦截）——尊重用户，不做静默兜底 */
  const USER_CANCEL_ERRORS = ['NotAllowedError', 'AbortError', 'SecurityError']

  /**
   * 屏幕采集，按能力逐级降级（华为/鸿蒙浏览器 getDisplayMedia 缺失或不可用时最关键）：
   * 1. getDisplayMedia 存在且可用 → 真实屏幕流（仅视频；音频由麦克风单独拾取）
   * 2. 屏幕采集 API 缺失/不可用（华为浏览器常见）→ getUserMedia 前置摄像头充当"传屏幕"
   * 3. 全部失败 → 明确返回不支持
   */
  async function acquireScreenStream(): Promise<ScreenAcquireResult> {
    const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: typeof MediaDevices.prototype.getDisplayMedia }
    if (typeof md.getDisplayMedia === 'function') {
      try {
        const stream = await md.getDisplayMedia({ video: true })
        return { ok: true, stream, mode: 'display' }
      } catch (err) {
        const name = (err as DOMException | undefined)?.name || ''
        if (USER_CANCEL_ERRORS.includes(name)) {
          return { ok: false, stream: null, reason: 'denied' } // 用户取消 / 系统拦截：尊重用户
        }
        // API 存在但不可用（TypeError/NotSupportedError/NotFoundError 等，华为浏览器常见）→ 继续降级
      }
    }
    if (typeof md.getUserMedia === 'function') {
      try {
        const stream = await md.getUserMedia({ video: { facingMode: 'user' } })
        return { ok: true, stream, mode: 'camera' }
      } catch {
        /* facingMode 约束可能被部分浏览器拒绝 → 再试纯视频约束 */
      }
      try {
        const stream = await md.getUserMedia({ video: true })
        return { ok: true, stream, mode: 'camera' }
      } catch {
        return { ok: false, stream: null, reason: 'unsupported' }
      }
    }
    return { ok: false, stream: null, reason: 'unsupported' }
  }

  /** 预取/校验麦克风：权限被拒或设备无麦克风时返回 null（屏幕共享仍继续，仅标记 micFailed） */
  async function acquireMicTrack(): Promise<MediaStream | null> {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      return null
    }
  }

  /** 麦克风获取失败后重试：重新拾取麦克风并加入共享流（手机端"静默无声音"的补救入口） */
  async function retryAddMicrophone(): Promise<boolean> {
    const local = ctx.localMediaStream.value
    if (!local) return false
    // 已含麦克风轨道则无需重试
    if (local.getAudioTracks().some((t) => !ctx.mediaSystemAudioTracks.has(t))) return true
    const micStream = await acquireMicTrack()
    if (!micStream) return false
    for (const t of micStream.getAudioTracks()) local.addTrack(t)
    ctx.micFailed.value = false
    return true
  }

  /** 枚举可用视频输入设备（摄像头）；权限未授予时 label 可能为空，deviceId 仍可用 */
  async function listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return []
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter((d) => d.kind === 'videoinput' && d.deviceId)
    } catch {
      return []
    }
  }

  /** 获取摄像头（视频通话）；优先带麦克风，权限/设备不支持时降级为仅视频。
   *  facingMode：'user'=前置 / 'environment'=后置（移动端多摄像头时由系统自动选择该方向
   *  最合适的摄像头并处理变焦，不精确指定 deviceId）；deviceId：桌面端精确指定设备。
   *  采集约束逐级放宽，任一尝试成功后即返回：
   *   1. 指定约束 + 麦克风（首选；音频权限被拒/无麦克风时整体失败）
   *   2. 指定约束、仅视频（去掉麦克风；音频拖累视频采集的移动端浏览器常见）
   *   3. exact deviceId 失败时按 facingMode 降级、仅视频（设备被占用/已移除）
   *   4. 完全无约束 { video: true } 纯视频（部分移动浏览器/WebView 对 facingMode 或
   *      deviceId:{exact} 约束抛 OverconstrainedError/NotFoundError，即使有摄像头；
   *      无约束让浏览器自动选默认摄像头，作为最后的兜底）
   *  全部失败时把错误名记录到 ctx.cameraPreviewError（NotFoundError=无摄像头设备）。 */
  async function acquireCameraStream(facingMode?: string, deviceId?: string): Promise<MediaStream | null> {
    const validDevice = !!deviceId && deviceId !== 'user' && deviceId !== 'environment'
    const constraints: MediaTrackConstraints = validDevice
      ? { deviceId: { exact: deviceId } }
      : facingMode
        ? { facingMode }
        : { facingMode: 'user' }
    const recordFail = (err: unknown) => {
      ctx.cameraPreviewError.value = (err as DOMException | undefined)?.name || 'UnknownError'
    }
    const clearFail = () => {
      ctx.cameraPreviewError.value = null
    }
    /** 单次采集尝试；失败记录错误名（DOMException.name 由浏览器区分具体原因） */
    const attempt = async (video: MediaTrackConstraints | boolean, audio: boolean): Promise<MediaStream | null> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video, ...(audio ? { audio: true } : {}) })
        clearFail()
        return stream
      } catch (err) {
        recordFail(err)
        return null
      }
    }
    // 尝试序列：约束+麦克风 → 约束仅视频 → facingMode 仅视频（exact 失败时）→ 无约束仅视频
    const attempts: Array<{ video: MediaTrackConstraints | boolean; audio: boolean }> = [
      { video: constraints, audio: true },
      { video: constraints, audio: false },
    ]
    if (validDevice && facingMode) {
      attempts.push({ video: { facingMode }, audio: false })
    }
    attempts.push({ video: true, audio: false })
    for (const a of attempts) {
      const stream = await attempt(a.video, a.audio)
      if (stream) return stream
    }
    return null
  }

  // ============ 共享前本地预览（视频配置页面实时调节参数） ============
  /** 打开共享前预览（仅视频；屏幕共享预览会触发屏幕采集弹窗，不做预览）。
   *  预取的流在用户确认共享时直接作为共享流复用，保证"实时调节参数"所见即所得。
   *  facingMode（移动端前置/后置）或 deviceId（桌面端指定设备）传任一即切换摄像头重开预览。
   *  多摄像头：每路预览流按 key（deviceId 或 facing 值）存 previewStreams，供多选场景逐路预览。 */
  async function startSharePreview(kind: 'screen' | 'video', facingMode?: string, deviceId?: string): Promise<boolean> {
    if (kind !== 'video') return false
    const key = deviceId && deviceId !== 'user' && deviceId !== 'environment' ? deviceId : (facingMode || 'user')
    // 该摄像头已预览：复用
    if (ctx.previewStreams.get(key)) return true
    // 媒体能力预检：非安全上下文（http/局域网 IP，手机真机常见）或浏览器不支持 mediaDevices 时，
    // 直接记录失败原因，避免 getUserMedia 抛出不具信息量的错误（原先误报"设备不支持多路"）
    const issue = mediaCapabilityIssue()
    if (issue) {
      ctx.cameraPreviewError.value = issue
      return false
    }
    // 无 key 切换（默认调用）：沿用单路预览逻辑（保留 previewStream 兼容）
    if (!facingMode && !deviceId) {
      if (ctx.previewStream.value) return true
      const stream = await acquireCameraStream()
      if (!stream) return false
      ctx.previewStream.value = stream
      return true
    }
    // 切换单路预览（不传 facingMode/deviceId 之外的 key 场景）：释放旧单路预览
    if (ctx.previewStream.value && !deviceId && !facingMode) {
      for (const t of ctx.previewStream.value.getTracks()) t.stop()
      ctx.previewStream.value = null
    }
    const stream = await acquireCameraStream(facingMode, deviceId)
    if (!stream) return false
    ctx.previewStreams.set(key, stream)
    // 兼容单路读取点：同步到 previewStream
    ctx.previewStream.value = stream
    return true
  }

  /** 按 key 获取指定摄像头的预览流（多摄像头逐路预览绑定用） */
  function getPreviewStream(key: string): MediaStream | undefined {
    return ctx.previewStreams.get(key) || (key === (ctx.previewStream.value?.getVideoTracks()[0]?.getSettings?.().deviceId || 'user') ? ctx.previewStream.value || undefined : undefined)
  }

  /** 关闭预览：停止全部预览轨道并清空（未确认共享时调用） */
  function stopSharePreview(): void {
    const stream = ctx.previewStream.value
    if (stream) {
      for (const t of stream.getTracks()) t.stop()
    }
    ctx.previewStream.value = null
    for (const s of Array.from(ctx.previewStreams.values())) {
      for (const t of s.getTracks()) t.stop()
    }
    ctx.previewStreams.clear()
  }

  /** 确认共享时接管预览流：清空预览引用但不停止轨道（轨道归属转移到共享流） */
  function takePreviewStream(): MediaStream | null {
    const stream = ctx.previewStream.value
    ctx.previewStream.value = null
    // 多路预览：仅取主路（索引 0）；附加预览流不进入共享（共享阶段按 selectedCameras 重新采集）
    return stream
  }

  // ============ 共享中控制（分辨率切换 / 麦克风开关，即时生效） ============
  /** 切换共享分辨率档位（low/sd/hd；auto 按带宽）。立即应用到：
   *  轨道约束（浏览器编码跟随）+ P2P sender 码率 + 中转重启录制（新流带 init segment，查看者重建）。 */
  async function setMediaQuality(quality: string): Promise<boolean> {
    if (!ctx.localMediaStream.value) return false
    const kind = ctx.localMediaType.value || 'screen'
    if (quality === 'auto') quality = 'auto'
    const preset = await resolveQuality(kind, quality)
    ctx.currentMediaPreset.value = preset
    // 1) 各路轨道分辨率/帧率约束（主流 + 附加摄像头）
    for (const s of ctx.localCameraStreams.values()) {
      const vTrack = s.getVideoTracks()[0]
      if (vTrack) await applyTrackQuality(vTrack, preset)
    }
    // 2) P2P 各连接码率上限
    if (p2pApi) {
      for (const entry of ctx.p2p.values()) {
        p2pApi.capP2PVideoBitrate(entry.pc, preset)
      }
    }
    // 3) 中转：重启录制（新 transfer_id → 查看者重建 MediaSource，从头播新档位流）
    await restartMediaRelay()
    return true
  }

  /** 重启中转录制（档位/摄像头切换后调用）：广播 file_cancel → 停旧录制 → 新建（新 transfer_id）→ 重建转发目标 */
  async function restartMediaRelay(): Promise<void> {
    if (ctx.mediaRecorders.size === 0) return
    stopMediaRelay()
    const local = ctx.localMediaStream.value
    if (!local) return
    for (const tid of Array.from(ctx.mediaRelayTransferToSharer.keys())) ctx.mediaRelayTransferToSharer.delete(tid)
    for (const sid of Array.from(ctx.sharerToRelayTransfer.keys())) ctx.sharerToRelayTransfer.delete(sid)
    await ensureMediaRecorders()
    // 仅向已订阅的查看者重建各路转发目标（后端 add_file_target）
    for (const subscriberId of mediaRelaySubscribers) {
      for (const [idx, tid] of Array.from(ctx.mediaRelayTransferIds.entries())) {
        const src = idx === 0 ? local : ctx.localCameraStreams.get(idx)
        if (!src) continue
        const hasAudio = src.getAudioTracks().length > 0
        ctx.sendSignal({
          type: 'file_start',
          transfer_id: tid,
          file_name: idx === 0 ? 'screen-share.webm' : `camera-${idx}.webm`,
          file_size: 0,
          mode: 'media-relay',
          media_mime: hasAudio ? 'video/webm;codecs=vp8,opus' : 'video/webm;codecs=vp8',
          camera_idx: idx,
          target: subscriberId,
        })
      }
    }
  }

  /** 共享中切换摄像头：采集新视频轨 → 替换本地流 → P2P replaceTrack（无需重新协商）→ 中转重启录制。
   *  facingMode：移动端前置/后置（系统自动选该方向摄像头）；deviceId：桌面端指定设备。 */
  async function switchCamera(facingMode?: string, deviceId?: string): Promise<boolean> {
    const local = ctx.localMediaStream.value
    if (!local) return false
    // 1) 采集新摄像头视频轨（仅视频；失败即返回，不动原状态）
    let newTrack: MediaStreamTrack | null = null
    try {
      // 防御：deviceId 可能混入位置值（user/environment），exact 会抛错
      const validDevice = !!deviceId && deviceId !== 'user' && deviceId !== 'environment'
      const stream = await navigator.mediaDevices.getUserMedia({
        video: validDevice ? { deviceId: { exact: deviceId } } : facingMode ? { facingMode } : { facingMode: 'user' },
      })
      newTrack = stream.getVideoTracks()[0] || null
      if (!newTrack) {
        for (const t of stream.getTracks()) t.stop()
        return false
      }
    } catch {
      return false
    }
    // 2) 先 P2P replaceTrack：全部成功后才替换本地流。
    //    任一失败 → stop 新轨、返回 false，本地流保持原状（避免"本地已换、P2P 未换"的黑屏卡死）
    if (p2pApi) {
      const entries = Array.from(ctx.p2p.values())
      const senders: Array<RTCRtpSender | null> = entries.map((entry) =>
        entry.pc.getSenders().find((s) => s.track && s.track.kind === 'video') || null
      )
      for (const sender of senders) {
        if (!sender) continue
        try {
          await sender.replaceTrack(newTrack)
        } catch {
          // replaceTrack 失败（连接已关闭/协商中）：回滚已替换的 sender，并放弃本次切换
          for (const done of senders) {
            if (done) done.replaceTrack(local.getVideoTracks()[0] ?? null).catch(() => {})
          }
          newTrack.stop()
          return false
        }
      }
    }
    // 3) 替换本地流的视频轨（此时 P2P 已全部就绪）
    for (const t of local.getVideoTracks()) {
      local.removeTrack(t)
      t.stop()
    }
    local.addTrack(newTrack)
    // 4) 中转：重启录制（新 transfer_id → 查看者重建 MediaSource）。
    //    失败不阻断主流程（本地/P2P 已切换成功），仅停止录制；下次订阅会重建
    try {
      await restartMediaRelay()
    } catch {
      /* 中转重启失败：本地与 P2P 已切换，录制待下次订阅重建 */
    }
    return true
  }

  // ============ 发起共享 / 拉流 ============
  /**
   * 发起传屏幕 / 传视频：获取本地媒体流 → 广播"正在共享" → 成员点"查看"主动拉流。
   * 移动端兼容：屏幕共享一律用麦克风作为音频来源；华为鸿蒙浏览器 getDisplayMedia
   * 行为不标准 → 按能力逐级降级；视频通话优先带麦克风，失败降级为仅视频。
   */
  async function startMediaShare(kind: 'screen' | 'video', quality: string = 'auto', audio: string = 'mic', overrides: { stream?: MediaStream | null; facingMode?: string; deviceId?: string; cameras?: Array<{ idx: number; deviceId?: string; facingMode?: string }> } = {}): Promise<{ ok: boolean; reason?: string }> {
    const myId = directStore.myClientId
    if (!myId) return { ok: false, reason: 'not-ready' }
    if (ctx.localMediaStream.value) return { ok: true } // 已在共享
    // 手机/平板暂不支持屏幕共享（系统 getDisplayMedia 不可用或体验差），仅允许传视频
    if (kind === 'screen' && isMobileDevice()) {
      return { ok: false, reason: 'screen-mobile' }
    }
    const issue = mediaCapabilityIssue()
    if (issue) return { ok: false, reason: issue }
    const mobile = isMobileDevice()
    ctx.screenUsesCamera.value = false
    let stream: MediaStream | null = null
    try {
      if (kind === 'screen') {
        // 移动端：系统声音不支持，音频来源强制收敛为 无/麦克风（UI 同步只展示这两项）
        const wantSystem = !mobile && (audio === 'system' || audio === 'both')
        const wantMic = audio === 'mic' || audio === 'both' || (mobile && audio === 'system')
        ctx.mediaSystemAudioTracks.clear()
        if (wantSystem) {
          // 桌面端：请求系统声音（浏览器支持 tab/窗口级音频；不支持或用户拒绝时降级为仅视频）
          try {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
            })
          } catch {
            stream = null
          }
          if (!stream) {
            // 用户拒绝了系统声音（或设备不支持）→ 回退纯视频 + 麦克风（若要求）
            try {
              stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
            } catch {
              return { ok: false, reason: 'denied' }
            }
          }
          // 标记系统音频轨道（控制面板可单独开关；麦克风轨道不在此集合）
          if (stream) markSystemAudioTracks(stream)
        } else {
          // 屏幕采集：标准 getDisplayMedia 优先；华为/鸿蒙浏览器无屏幕采集 API 或不可用时，
          // 自动降级为前置摄像头"传屏幕"（acquireScreenStream 内处理；用户取消则尊重用户）。
          const acq = await acquireScreenStream()
          if (!acq.ok) return { ok: false, reason: acq.reason }
          stream = acq.stream
          ctx.screenUsesCamera.value = acq.mode === 'camera'
        }
        // 麦克风：单独拾取并合并轨道到共享流。
        if (wantMic && stream) {
          const micStream = await acquireMicTrack()
          if (!micStream) {
            // 麦克风不可用：屏幕共享仍然继续（用户可用系统声音或选择纯视频）
            ctx.micFailed.value = true
          } else {
            for (const t of micStream.getAudioTracks()) stream.addTrack(t)
          }
        }
      } else {
        // 视频通话：单摄像头流（主流含音频）。getUserMedia 同一时刻仅允许一路活动视频源，
        // 多摄像头通过"切换"实现（switchCamera：replaceTrack + 中转重启），而非同时多路。
        try {
          stream = overrides.stream || await acquireCameraStream(overrides.facingMode, overrides.deviceId)
        } catch {
          return { ok: false, reason: 'camera-error' }
        }
        if (!stream) {
          // 无摄像头设备（NotFoundError）→ 专门 reason，供视图显示"未检测到摄像头"；其余按被拒处理
          return { ok: false, reason: ctx.cameraPreviewError.value === 'NotFoundError' ? 'no-camera' : 'denied' }
        }
      }
        // 用户选择「无声音」：剥离音频轨道（stop 并移除），否则"无声音"选项在视频共享下无效
        if (audio === 'none' && stream) {
          for (const t of stream.getAudioTracks()) {
            t.stop()
            stream.removeTrack(t)
          }
        }
    } catch {
      return { ok: false, reason: 'denied' } // 用户取消或权限拒绝
    }
    if (!stream) return { ok: false, reason: 'denied' }
    // 媒体获取之后再解析档位（避免媒体采集调用远离用户手势）
    const preset = await resolveQuality(kind, quality)
    ctx.currentMediaPreset.value = preset
    // 压缩：对视频轨道施加分辨率/帧率约束（按档位，降低码率与带宽）
    const vTrack = stream.getVideoTracks()[0]
    if (vTrack) await applyTrackQuality(vTrack, preset)
    // 记录当前音频来源（控制面板据此显示系统声音开关）
    ctx.currentShareAudioKind.value = kind === 'screen' ? (audio as 'none' | 'mic' | 'system' | 'both') : 'mic'
    ctx.localMediaStream.value = stream
    ctx.localMediaType.value = kind
    // 停止共享（用户点停 / 屏幕共享结束）时通知房间
    stream.getVideoTracks()[0]?.addEventListener('ended', () => stopMediaShare())
    // 广播"正在共享"，供其他成员决定是否查看
    // 通知成员共享类型与摄像头数量（接收端据此声明对应数量的视频轨道槽位）
    ctx.sendSignal({ type: 'media_available', media_type: kind, camera_count: kind === 'video' ? 1 : undefined })
    // 启动 P2P 带宽采样（auto 档后续可据此优化；P2P 建连后生效）
    startBandwidthSampling()
    // 注意：不在这里替成员发起拉流。拉流必须由查看者自己发起（pullMedia(sharerId)）
    return { ok: true }
  }

  /** 接收者：向共享者发起媒体拉流（声明接收媒体轨道 → 重新协商）。
   *  P2P 建立失败或协商失败时自动回退服务器中转（requestMediaRelay）。 */
  async function pullMedia(sharerId: string): Promise<boolean> {
    const myId = directStore.myClientId
    if (!myId || !sharerId || sharerId === myId) return false
    if (!p2pApi) return requestMediaRelay(sharerId)
    // 确保与共享者的 P2P 连接可用：不存在或已断开 → 重建
    const existing = ctx.p2p.get(sharerId)
    if (existing && (existing.pc.connectionState === 'failed' || existing.pc.connectionState === 'closed')) {
      p2pApi.removeP2P(sharerId)
    }
    // 复用连接二次拉流（结束共享后再传视频）：旧连接上已协商过媒体收发器，
    // 共享者换新流 addTrack 后 ontrack 不会再触发 → 重建连接保证从零协商
    const reused = ctx.p2p.get(sharerId)
    if (reused && reused.pc.getTransceivers().length > 0) {
      p2pApi.removeP2P(sharerId)
    }
    if (!ctx.p2p.get(sharerId)) {
      p2pApi.initiateP2P(sharerId)
      const dc = await p2pApi.establishP2P(sharerId)
      if (!dc) {
        // P2P 直连不可用（对称 NAT/无 TURN/反代信令不通）→ 自动切服务器中转
        return requestMediaRelay(sharerId)
      }
    }
    const pc = ctx.p2p.get(sharerId)?.pc
    if (!pc) {
      return requestMediaRelay(sharerId)
    }
    // 声明接收视频/音频轨道（Offer 侧需 transceiver 才能协商出媒体 m-line）。
    // 多摄像头：按共享者声明的摄像头数声明对应数量的 video 槽位（发送端按 idx 顺序 addTrack，
    // 接收端 ontrack 按到达顺序映射摄像头索引）
    try {
      if (pc.getTransceivers().every((t) => !t.receiver.track)) {
        // 按共享者声明的摄像头数声明视频槽位；未知（拉流早于 media_available）时按上限 4 兜底，
        // 避免多摄像头时附加路因槽位不足被 WebRTC 丢弃（空槽不占带宽）
        const camCount = directStore.activeShares[sharerId]?.cameraCount || 4
        for (let i = 0; i < camCount; i++) {
          pc.addTransceiver('video', { direction: 'recvonly' })
        }
        // 双音频槽位：屏幕共享可能同时携带"系统声音 + 麦克风"两条音轨
        pc.addTransceiver('audio', { direction: 'recvonly' })
        pc.addTransceiver('audio', { direction: 'recvonly' })
      }
    } catch {
      return requestMediaRelay(sharerId)
    }
    // 重新协商：声明接收媒体轨道
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      ctx.sendSignal({ type: 'media_offer', target: sharerId, description: pc.localDescription! })
    } catch {
      return requestMediaRelay(sharerId)
    }
    directStore.setViewingShare(sharerId)
    return true
  }

  // ==================== 媒体服务器中转（P2P 不可用时兜底，MediaRecorder → 分片中继） ====================
  /** 查看者：向共享者请求服务器中转订阅（P2P 不可用时自动调用；受后台开关控制） */
  function requestMediaRelay(sharerId: string): boolean {
    if (configStore.config.directRelayEnabled === 0) {
      // 后台已关闭服务器中转 → 不订阅（P2P 不可用时无法观看）
      return false
    }
    // 只清该共享者相关残留（不误清其他共享者的映射）
    directStore.clearMediaRelaySource(sharerId)
    const prevMap = ctx.sharerToRelayTransfer.get(sharerId)
    if (prevMap) {
      for (const tid of prevMap.values()) ctx.mediaRelayTransferToSharer.delete(tid)
      ctx.sharerToRelayTransfer.delete(sharerId)
    }
    ctx.sendSignal({ type: 'media_subscribe', target: sharerId })
    directStore.setViewingShare(sharerId)
    return true
  }

  /** 共享者：收到查看者的中转订阅 → 启动录制并向后端建立转发目标。
   *  若已有录制在运行（新查看者加入）→ 重启录制：换新 transfer_id + index 归零，
   *  新流的首个 blob 含完整 WebM init segment，新查看者才能从头解码。
   *  重启后向所有当前订阅者（含新加入者）重新声明转发目标。 */
  async function handleMediaSubscribe(msg: DirectWSMessage) {
    const fromId = msg.from_id || ''
    const local = ctx.localMediaStream.value
    if (!fromId || !local) return
    if (configStore.config.directRelayEnabled === 0) {
      ctx.sendSignal({ type: 'file_cancel', transfer_id: '', message: 'relay_disabled', target: fromId })
      return
    }
    mediaRelaySubscribers.add(fromId)
    if (ctx.mediaRecorders.size > 0) {
      // 新查看者加入：重启录制（换新 transfer_id，新流首个 blob 含完整 init segment，新查看者才能从头解码）
      stopMediaRelay()
    }
    await ensureMediaRecorders()
    if (ctx.mediaRelayTransferIds.size === 0) return
    // 向所有当前订阅者重新声明各路转发目标（后端 add_file_target 建立 sender→target 多目标映射）
    for (const subscriberId of mediaRelaySubscribers) {
      for (const [idx, tid] of Array.from(ctx.mediaRelayTransferIds.entries())) {
        const src = idx === 0 ? local : ctx.localCameraStreams.get(idx)
        if (!src) continue
        const hasAudio = src.getAudioTracks().length > 0
        ctx.sendSignal({
          type: 'file_start',
          transfer_id: tid,
          file_name: idx === 0 ? 'screen-share.webm' : `camera-${idx}.webm`,
          file_size: 0,
          mode: 'media-relay',
          media_mime: hasAudio ? 'video/webm;codecs=vp8,opus' : 'video/webm;codecs=vp8',
          camera_idx: idx,
          target: subscriberId,
        })
      }
    }
  }

  /** 幂等创建中转 MediaRecorder（单路：共享视频为单摄像头流） */
  async function ensureMediaRecorders(): Promise<void> {
    if (typeof MediaRecorder === 'undefined') return
    const q = ctx.currentMediaPreset.value
    const main = ctx.localMediaStream.value
    if (!main) return
    const streams: Array<[number, MediaStream]> = [[0, main]] as Array<[number, MediaStream]>
    for (const [idx, local] of streams) {
      if (ctx.mediaRecorders.has(idx)) {
        const r = ctx.mediaRecorders.get(idx)!
        if (r.state !== 'inactive') continue
      }
      try {
        // 屏幕共享（getDisplayMedia 仅视频）无音频轨道 → 只用视频 codec；
        // 视频通话含麦克风 → 视频+音频 codec。
        const hasAudio = local.getAudioTracks().length > 0
        const mime = hasAudio ? 'video/webm;codecs=vp8,opus' : 'video/webm;codecs=vp8'
        const opts: MediaRecorderOptions = {
          mimeType: MediaRecorder.isTypeSupported(mime) ? mime : undefined,
          videoBitsPerSecond: q.videoBitrate,
          audioBitsPerSecond: q.audioBitrate,
        }
        const recorder = new MediaRecorder(local, opts)
        ctx.mediaRecorders.set(idx, recorder)
        const transferId = `m-${Date.now().toString(36)}-${idx}`
        ctx.mediaRelayTransferIds.set(idx, transferId)
        ctx.mediaRelayIndex.set(idx, 0)
        ctx.mediaRelayBuffer.set(idx, [])
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            const buf = ctx.mediaRelayBuffer.get(idx) || []
            if (buf.length >= 20) buf.shift() // 缓冲超限丢最旧 blob 保实时
            buf.push(e.data)
            ctx.mediaRelayBuffer.set(idx, buf)
            void flushMediaRelay(idx)
          }
        }
        recorder.start(500) // 每 500ms 产出分片
      } catch {
        ctx.mediaRecorders.delete(idx)
        ctx.mediaRelayTransferIds.delete(idx)
      }
    }
  }

  /** 把某路缓冲中的媒体 Blob 逐块作为独立媒体帧发送（不硬切 256KB——
   *  WebM 段若被中途切开，接收侧 appendBuffer 解析会失败导致黑屏。500ms blob 通常 <1MB） */
  async function flushMediaRelay(idx = 0) {
    const transferId = ctx.mediaRelayTransferIds.get(idx)
    const buf = ctx.mediaRelayBuffer.get(idx)
    if (!transferId || !buf) return
    // 每路独立发送（并发多路会各自触发，无需全局 sending 锁）
    const sending = mediaRelaySendingFlags.get(idx)
    if (sending) return
    mediaRelaySendingFlags.set(idx, true)
    try {
      while (buf.length > 0) {
        const blob = buf.shift()!
        const bytes = new Uint8Array(await blob.arrayBuffer())
        const idxN = ctx.mediaRelayIndex.get(idx) || 0
        const framed = encodeDirectFrame(transferId, idxN, bytes.buffer, false, true)
        // 中继背压
        while (ctx.ws.value && ctx.ws.value.readyState === WebSocket.OPEN && ctx.ws.value.bufferedAmount > 4 * 1024 * 1024) await sleep(30)
        if (!ctx.ws.value || ctx.ws.value.readyState !== WebSocket.OPEN) return
        ctx.sendSignal({ type: 'file_chunk', transfer_id: transferId, index: idxN })
        await ctx.sendBinary(framed)
        ctx.mediaRelayIndex.set(idx, idxN + 1)
        // 周期性让出主线程
        if (idxN % 32 === 0) await sleep(0)
      }
    } finally {
      mediaRelaySendingFlags.set(idx, false)
    }
  }
  /** 每路发送锁（多摄像头并发发送互不阻塞） */
  const mediaRelaySendingFlags = new Map<number, boolean>()

  /** 停止全部中转录制（广播各路 file_cancel 结束流） */
  function stopMediaRelay() {
    for (const [idx, recorder] of Array.from(ctx.mediaRecorders.entries())) {
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch { /* ignore */ }
      const tid = ctx.mediaRelayTransferIds.get(idx)
      if (tid) {
        ctx.sendSignal({ type: 'file_cancel', transfer_id: tid, mode: 'media-relay' })
      }
    }
    ctx.mediaRecorders.clear()
    ctx.mediaRelayTransferIds.clear()
    ctx.mediaRelayBuffer.clear()
    ctx.mediaRelayIndex.clear()
    mediaRelaySendingFlags.clear()
    ctx.mediaRelayTransferToSharer.clear()
  }

  /** 接收侧：收到中转媒体的 file_start（带 media_mime）→ 记录映射并初始化 MediaSource。
   *  若该共享者换了新的 transfer_id（共享者重启录制）→ 必须重建 MediaSource 从头播 */
  function handleRelayMediaStart(msg: DirectWSMessage) {
    const sharerId = msg.from_id || ''
    const transferId = msg.transfer_id || ''
    const idx = msg.camera_idx ?? 0
    if (!sharerId) return
    // 共享者重启了该路录制 → 重建该路 MediaSource
    const prevMap = ctx.sharerToRelayTransfer.get(sharerId)
    const prevTid = prevMap ? prevMap.get(idx) : undefined
    if (transferId && prevTid && prevTid !== transferId) {
      directStore.clearMediaRelaySource(`${sharerId}:${idx}`)
      ctx.mediaRelayTransferToSharer.delete(prevTid)
    }
    if (transferId) {
      ctx.mediaRelayTransferToSharer.set(transferId, `${sharerId}:${idx}`)
      const m = ctx.sharerToRelayTransfer.get(sharerId) || new Map()
      m.set(idx, transferId)
      ctx.sharerToRelayTransfer.set(sharerId, m)
    }
    directStore.initMediaRelaySource(sharerId, msg.media_mime || 'video/webm;codecs=vp8', idx)
  }

  /** 接收侧：file_cancel 到达（共享结束/该路结束）→ 关闭中转媒体源并清理映射 */
  function handleRelayMediaCancel(sharerId: string, idx?: number) {
    if (idx !== undefined) {
      // 单路结束（如切换摄像头时旧路）
      directStore.clearMediaRelaySource(`${sharerId}:${idx}`)
      const prevMap = ctx.sharerToRelayTransfer.get(sharerId)
      if (prevMap) {
        const tid = prevMap.get(idx)
        if (tid) {
          ctx.mediaRelayTransferToSharer.delete(tid)
          prevMap.delete(idx)
        }
        if (prevMap.size === 0) ctx.sharerToRelayTransfer.delete(sharerId)
      }
      return
    }
    // 全部结束（共享者停止共享）
    directStore.clearMediaRelaySource(sharerId)
    const prevMap = ctx.sharerToRelayTransfer.get(sharerId)
    if (prevMap) {
      for (const tid of prevMap.values()) ctx.mediaRelayTransferToSharer.delete(tid)
      ctx.sharerToRelayTransfer.delete(sharerId)
    }
  }

  /** 应答方（共享者）：收到接收者的媒体 offer → 把本地共享轨道挂到该连接并回 answer */
  async function handleMediaOffer(msg: DirectWSMessage) {
    const fromId = msg.from_id
    if (!fromId || !msg.description) return
    const entry = ctx.p2p.get(fromId)
    if (!entry || !entry.pc) return
    const pc = entry.pc
    try {
      // 本端正在共享 → 将各路媒体轨道加入该连接（接收者主动拉流；附加摄像头按 idx 顺序 addTrack）
      const local = ctx.localMediaStream.value
      if (local) {
        const hasMedia = pc.getSenders().some((s) => s.track && local.getTracks().includes(s.track))
        if (!hasMedia) {
          for (const track of local.getTracks()) {
            pc.addTrack(track, local)
          }
        }
      }
      // 压缩：对视频发送器设置最大码率（按当前档位，WebRTC 编码硬限）
      if (p2pApi) p2pApi.capP2PVideoBitrate(pc, ctx.currentMediaPreset.value)
      await pc.setRemoteDescription(msg.description)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      ctx.sendSignal({ type: 'media_answer', target: fromId, description: pc.localDescription! })
    } catch {
      /* 协商失败静默 */
    }
  }

  /** 接收者：收到 answer → 完成媒体协商 */
  async function handleMediaAnswer(msg: DirectWSMessage) {
    if (!msg.from_id || !msg.description) return
    const entry = ctx.p2p.get(msg.from_id)
    if (entry && entry.pc && entry.pc.signalingState === 'have-local-offer') {
      try {
        await entry.pc.setRemoteDescription(msg.description)
      } catch {
        /* ignore */
      }
    }
  }

  /** 收到"某人正在共享"广播：记录通知 + 房间内共享记录（仅首次共享时提示避免重复） */
  function handleMediaAvailable(msg: DirectWSMessage) {
    const fromId = msg.from_id || ''
    if (!fromId) return
    const kind = msg.media_type === 'video' ? 'video' : 'screen'
    const member = directStore.members.find((m) => m.client_id === fromId)
    const nickname = member?.nickname || '匿名'
    const isNew = !directStore.activeShares[fromId]
    directStore.setActiveShare(fromId, kind, nickname, msg.camera_count)
    if (isNew) {
      directStore.addSystem(
        kind === 'video'
          ? ctx.t('direct.room.shareStartedVideo', { name: nickname })
          : ctx.t('direct.room.shareStartedScreen', { name: nickname })
      )
    }
  }

  /** 收到"共享已结束"广播：清除远端流/中转媒体源与通知 */
  function handleMediaCancel(msg: DirectWSMessage) {
    const fromId = msg.from_id || ''
    if (!fromId) return
    const wasViewing = directStore.viewingShares.includes(fromId)
    const member = directStore.members.find((m) => m.client_id === fromId)
    const nickname = member?.nickname || '匿名'
    const kind = directStore.activeShares[fromId]?.mediaType || 'screen'
    const pull = mediaPullStreams.get(fromId)
    if (pull) {
      for (const track of pull.getTracks()) track.stop()
      mediaPullStreams.delete(fromId)
    }
    directStore.clearIncomingMediaStream(fromId)
    directStore.clearMediaRelaySource(fromId)
    directStore.removeActiveShare(fromId)
    if (wasViewing) {
      directStore.addSystem(
        kind === 'video'
          ? ctx.t('direct.room.shareEndedVideo', { name: nickname })
          : ctx.t('direct.room.shareEndedScreen', { name: nickname })
      )
    }
  }

  /** 查看者退出查看：本地停止拉流 + 通知共享者 + 重建与该成员的 P2P 连接 */
  function stopViewing(sharerId: string) {
    const pull = mediaPullStreams.get(sharerId)
    if (pull) {
      for (const track of pull.getTracks()) track.stop()
      mediaPullStreams.delete(sharerId)
    }
    directStore.clearIncomingMediaStream(sharerId)
    ctx.sendSignal({ type: 'media_unsubscribe', target: sharerId })
    if (p2pApi) p2pApi.removeP2P(sharerId)
  }

  /** 共享者：收到查看者退出通知 → 重建与该查看者的 P2P 连接，并移除中继订阅记录 */
  function handleMediaUnsubscribe(msg: DirectWSMessage) {
    const fromId = msg.from_id || ''
    if (!fromId) return
    mediaRelaySubscribers.delete(fromId)
    if (p2pApi) p2pApi.removeP2P(fromId)
  }

  /** 停止本地共享：停本地流、停止中转录制、停止带宽采样并广播结束 */
  function stopMediaShare() {
    stopMediaRelay()
    mediaRelaySubscribers.clear()
    stopBandwidthSampling()
    ctx.micFailed.value = false
    ctx.screenUsesCamera.value = false
    // 预览流若未被确认共享（takePreviewStream）则一并清理，避免轨道泄漏
    if (ctx.previewStream.value) {
      for (const t of ctx.previewStream.value.getTracks()) t.stop()
      ctx.previewStream.value = null
    }
    const stream = ctx.localMediaStream.value
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      ctx.localMediaStream.value = null
      ctx.localMediaType.value = null
    }
    // 清理各 P2P 连接上已停止的媒体轨道 sender（轨道 ended 后 sender 仍占据媒体 m-line）。
    // 若不清理，再次共享（如传屏幕→传视频）时新轨道 addTrack 会因 m-line 已被占用而被丢弃
    if (p2pApi) {
      for (const entry of ctx.p2p.values()) {
        try {
          for (const sender of entry.pc.getSenders()) {
            if (sender.track && sender.track.readyState === 'ended') {
              entry.pc.removeTrack(sender)
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
    ctx.sendSignal({ type: 'media_cancel' })
  }

  /** 断开时清理所有本地/拉流媒体 */
  function clearLocalMedia() {
    stopMediaRelay()
    mediaRelaySubscribers.clear()
    stopBandwidthSampling()
    ctx.micFailed.value = false
    ctx.screenUsesCamera.value = false
    if (ctx.previewStream.value) {
      for (const t of ctx.previewStream.value.getTracks()) t.stop()
      ctx.previewStream.value = null
    }
    const stream = ctx.localMediaStream.value
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      ctx.localMediaStream.value = null
      ctx.localMediaType.value = null
    }
    for (const pull of mediaPullStreams.values()) {
      for (const track of pull.getTracks()) track.stop()
    }
    mediaPullStreams.clear()
  }

  return {
    setP2PApi,
    bandwidthToPreset,
    resolveQuality,
    sampleBandwidth,
    startBandwidthSampling,
    stopBandwidthSampling,
    applyTrackQuality,
    setMediaQuality,
    switchCamera,
    setMediaAudioEnabled,
    setMediaSystemAudioEnabled,
    hasMediaAudio,
    hasMediaSystemAudio,
    markSystemAudioTracks,
    mediaCapabilityIssue,
    acquireScreenStream,
    listVideoInputDevices,
    acquireMicTrack,
    retryAddMicrophone,
    acquireCameraStream,
    startSharePreview,
    stopSharePreview,
    takePreviewStream,
    getPreviewStream,
    startMediaShare,
    pullMedia,
    requestMediaRelay,
    handleMediaSubscribe,
    ensureMediaRecorders,
    flushMediaRelay,
    stopMediaRelay,
    handleRelayMediaStart,
    handleRelayMediaCancel,
    handleMediaOffer,
    handleMediaAnswer,
    handleMediaAvailable,
    handleMediaCancel,
    stopViewing,
    handleMediaUnsubscribe,
    stopMediaShare,
    clearLocalMedia,
  }
}
