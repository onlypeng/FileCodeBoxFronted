/**
 * WebRTC P2P 域：RTCPeerConnection 建连 / 协商 / ICE 管理。
 * 数据通道消息统一交给 ctx.handleP2PDataMessage（组合器路由到文件接收逻辑）；
 * 连接失败自动回退服务器中转（requestMediaRelay）由组合器延迟注入，避免与媒体域硬耦合。
 */
import type { DirectWSMessage } from '@/types/direct'
import type { DirectConnectionContext, MediaQualityPreset, P2PEntry } from './context'

export interface P2POptions {
  /** P2P 建连等待超时（毫秒），超时回退服务器中转 */
  p2pTimeout?: number
}

export function createDirectP2P(ctx: DirectConnectionContext, options: P2POptions = {}) {
  const { p2pTimeout = 4000 } = options
  /** 连接失败时的媒体中转回退（由组合器注入媒体域方法；null=未注入则忽略） */
  let mediaRelayRequest: ((sharerId: string) => boolean) | null = null

  function setMediaRelayRequest(fn: (sharerId: string) => boolean) {
    mediaRelayRequest = fn
  }

  function setupP2PChannel(targetId: string, pc: RTCPeerConnection, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer'
    dc.onopen = () => {
      const entry = ctx.p2p.get(targetId)
      if (entry) {
        entry.ready = true
        if (entry.timer) {
          clearTimeout(entry.timer)
          entry.timer = undefined
        }
        ctx.directStore.setP2PActive(true)
        const waiters = entry.waiters.splice(0)
        for (const w of waiters) w(dc)
      }
    }
    dc.onclose = () => {
      removeP2P(targetId)
    }
    dc.onerror = () => {
      // onclose 会随之触发
    }
    // P2P 通道上的文件控制帧与二进制分片（与中继走同一套接收逻辑）
    dc.onmessage = (e) => ctx.handleP2PDataMessage(e)
  }

  function makePCPair(targetId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ctx.rtcConfig)
    // 多摄像头共享：video 轨道按到达顺序映射摄像头索引（发送端按 idx 顺序 addTrack）
    let videoTrackIdx = 0
    pc.onicecandidate = (e) => {
      if (e.candidate) ctx.sendSignal({ type: 'rtc_ice', target: targetId, candidate: e.candidate.toJSON() })
    }
    pc.ondatachannel = (e) => {
      const entry = ctx.p2p.get(targetId)
      if (entry) entry.dc = e.channel
      setupP2PChannel(targetId, pc, e.channel)
    }
    pc.ontrack = (e) => {
      // 远端媒体流（传屏幕/传视频）：多摄像头按 idx 存储，供房间页分路渲染
      if (e.streams && e.streams[0]) {
        if (e.track && e.track.kind === 'video') {
          ctx.directStore.setIncomingMediaStream(targetId, e.streams[0], videoTrackIdx)
          videoTrackIdx++
        } else {
          ctx.directStore.setIncomingMediaStream(targetId, e.streams[0], 0)
        }
      }
    }
    pc.onconnectionstatechange = () => {
      if (pc && ['failed', 'closed'].includes(pc.connectionState)) {
        removeP2P(targetId)
        // P2P 连接失败且尚未收到媒体流 → 自动回退服务器中转（避免黑屏无感知）
        if (!ctx.directStore.getIncomingMediaStream(targetId) && mediaRelayRequest) {
          mediaRelayRequest(targetId)
        }
      }
    }
    return pc
  }

  function removeP2P(targetId: string) {
    const entry = ctx.p2p.get(targetId)
    if (!entry) return
    ctx.p2p.delete(targetId)
    if (entry.timer) clearTimeout(entry.timer)
    const waiters = entry.waiters.splice(0)
    for (const w of waiters) w(null)
    try {
      entry.pc.close()
    } catch {
      /* ignore */
    }
    refreshP2PActive()
  }

  function closeAllP2P() {
    for (const id of Array.from(ctx.p2p.keys())) removeP2P(id)
    ctx.pendingIce.clear()
    refreshP2PActive()
  }

  function refreshP2PActive() {
    let active = false
    ctx.p2p.forEach((e) => {
      if (e.ready) active = true
    })
    ctx.directStore.setP2PActive(active)
  }

  /** 预协商：房间成员变化时，自动与尚未建连的成员建立直连通道（发送文件前提前就绪） */
  function maybeInitP2P() {
    const myId = ctx.directStore.myClientId
    if (!myId) return
    for (const m of ctx.directStore.members) {
      if (m.client_id === myId) continue
      if (ctx.p2p.has(m.client_id)) continue // 已有通道或已在协商
      // 固定由 client_id 较大的一方发起 offer，避免双方同时发 offer 的协商碰撞
      if (myId > m.client_id) {
        initiateP2P(m.client_id)
      }
    }
  }

  /** 创建与目标接收者的直连通道并发起 offer（不设回退超时，协商失败随连接状态清理） */
  function initiateP2P(targetId: string): P2PEntry {
    const pc = makePCPair(targetId)
    const entry: P2PEntry = { pc, dc: null, ready: false, waiters: [] }
    const dc = pc.createDataChannel('file')
    entry.dc = dc
    setupP2PChannel(targetId, pc, dc)
    ctx.p2p.set(targetId, entry)
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => ctx.sendSignal({ type: 'rtc_offer', target: targetId, description: pc.localDescription! }))
      .catch(() => removeP2P(targetId))
    return entry
  }

  /**
   * 建立与目标接收者的直连通道：已有就绪通道则复用，协商中则等待，否则发起协商。
   * 超时仍未就绪则返回 null（调用方回退服务器中转）。
   */
  function establishP2P(targetId: string): Promise<RTCDataChannel | null> {
    const existing = ctx.p2p.get(targetId)
    if (existing && existing.ready && existing.dc) {
      return Promise.resolve(existing.dc)
    }
    const entry = existing || initiateP2P(targetId)
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const i = entry.waiters.indexOf(wrapped)
        if (i !== -1) entry.waiters.splice(i, 1)
        resolve(null)
      }, p2pTimeout)
      const wrapped: (dc: RTCDataChannel | null) => void = (dc) => {
        clearTimeout(timer)
        resolve(dc)
      }
      entry.waiters.push(wrapped)
    })
  }

  /** 应答方：收到 offer → 创建连接并回 answer */
  function handleRtcOffer(msg: DirectWSMessage) {
    const fromId = msg.from_id
    if (!fromId || !msg.description) return
    if (ctx.p2p.has(fromId)) {
      // 已存在连接：若该连接协商过媒体（传屏幕/传视频后再次拉流，查看者重建连接从零协商），
      // 旧连接的收发器状态对新媒体协商是脏的（ontrack 不会重新触发，新音视频轨收不到），
      // 此时应整体替换为新连接；纯文件通道的重复 offer 仍忽略（防重复协商）。
      // 判定：RTP 收发器（audio/video）存在即说明协商过媒体——SCTP 数据通道不产生收发器。
      const existing = ctx.p2p.get(fromId)!
      if (existing.pc.getTransceivers().length === 0) return
      removeP2P(fromId)
    }
    const pc = makePCPair(fromId)
    const entry: P2PEntry = { pc, dc: null, ready: false, waiters: [] }
    ctx.p2p.set(fromId, entry)
    pc.setRemoteDescription(msg.description)
      .then(() => pc.createAnswer())
      .then((answer) => pc.setLocalDescription(answer))
      .then(() => ctx.sendSignal({ type: 'rtc_answer', target: fromId, description: pc.localDescription! }))
      .catch(() => removeP2P(fromId))
    flushPendingIce(fromId, pc)
  }

  function handleRtcAnswer(msg: DirectWSMessage) {
    if (!msg.from_id || !msg.description) return
    const entry = ctx.p2p.get(msg.from_id)
    if (entry && entry.pc.signalingState === 'have-local-offer') {
      entry.pc.setRemoteDescription(msg.description).catch(() => {})
    }
  }

  function handleRtcIce(msg: DirectWSMessage) {
    if (!msg.from_id || !msg.candidate) return
    const entry = ctx.p2p.get(msg.from_id)
    if (entry && entry.pc) {
      entry.pc.addIceCandidate(msg.candidate).catch(() => {})
    } else {
      if (!ctx.pendingIce.has(msg.from_id)) ctx.pendingIce.set(msg.from_id, [])
      ctx.pendingIce.get(msg.from_id)!.push(msg.candidate)
    }
  }

  function flushPendingIce(fromId: string, pc: RTCPeerConnection) {
    const list = ctx.pendingIce.get(fromId)
    if (list) {
      for (const c of list) pc.addIceCandidate(c).catch(() => {})
      ctx.pendingIce.delete(fromId)
    }
  }

  /** 对 P2P 连接的视频发送器设置最大码率（按档位，配合拥塞控制进一步控带宽） */
  function capP2PVideoBitrate(pc: RTCPeerConnection, preset: MediaQualityPreset) {
    try {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
      if (sender) {
        const params = sender.getParameters()
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}]
        params.encodings[0].maxBitrate = preset.videoBitrate
        void sender.setParameters(params).catch(() => {})
      }
    } catch {
      /* ignore */
    }
  }

  return {
    setMediaRelayRequest,
    setupP2PChannel,
    makePCPair,
    removeP2P,
    closeAllP2P,
    maybeInitP2P,
    initiateP2P,
    establishP2P,
    handleRtcOffer,
    handleRtcAnswer,
    handleRtcIce,
    flushPendingIce,
    capP2PVideoBitrate,
  }
}
