/**
 * 文件传输域：房间内文件 offer/应答、发送队列、分片传输（P2P 直连或服务器中转）。
 * P2P 建连与加密握手能力由组合器注入（p2pApi / cryptoApi），避免与对应域硬耦合。
 */
import { Sha256 } from '@/utils/sha256'
import { encodeDirectFrame } from '@/utils/direct-frame'
import { encryptRelayChunk } from '@/utils/relay-crypto'
import type { DirectTransferMode } from '@/types/direct'
import type { DirectConnectionContext } from './context'

/** 文件传输域所需的外部能力（组合器注入） */
export interface FileSendP2PApi {
  establishP2P: (targetId: string) => Promise<RTCDataChannel | null>
}

export interface FileSendCryptoApi {
  establishRelayKey: (targetId: string) => Promise<boolean>
  relayKeys: Map<string, CryptoKey>
}

const DRAIN_THRESHOLD = 4 * 1024 * 1024 // 发送缓冲背压阈值 4MB

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function createDirectFileSend(ctx: DirectConnectionContext) {
  let p2pApi: FileSendP2PApi | null = null
  let cryptoApi: FileSendCryptoApi | null = null

  function setP2PApi(api: FileSendP2PApi) {
    p2pApi = api
  }
  function setCryptoApi(api: FileSendCryptoApi) {
    cryptoApi = api
  }

  /**
   * 选择文件发起发送：加入聊天流并广播 file_offer（等待对方确认）。
   * 返回是否成功发起（房间需有其他成员）。
   */
  function offerFiles(files: File[]): boolean {
    if (files.length === 0) return false
    if (ctx.directStore.onlineCount < 2) return false
    const created = ctx.directStore.offerFiles(files)
    for (const item of created) {
      ctx.sendSignal({
        type: 'file_offer',
        transfer_id: item.transferId,
        file_name: item.fileName,
        file_size: item.fileSize,
      })
    }
    return created.length > 0
  }

  /** 接收侧回应发送者：接受/拒绝 */
  function respondFileOffer(transferId: string, accept: boolean) {
    const item = ctx.directStore.getFileItem(transferId)
    if (!item || item.fileDirection !== 'incoming' || !item.offerFromId) return
    ctx.sendSignal({
      type: 'file_response',
      transfer_id: transferId,
      accept,
      target: item.offerFromId,
    })
    if (!accept) {
      ctx.directStore.declineIncomingFile(transferId)
    }
  }

  /** 串行处理发送队列（逐个接收者传输） */
  function processSendQueue() {
    if (ctx.queueProcessing) return
    ctx.queueProcessing = true
    ;(async () => {
      try {
        while (true) {
          const tasks = ctx.directStore.consumePendingSends()
          if (tasks.length === 0) break
          for (const task of tasks) {
            await sendToRecipient(task.transferId, task.clientId)
          }
          await sleep(50)
        }
      } finally {
        ctx.queueProcessing = false
      }
    })()
  }

  /** 向单个接收者发送完整文件：优先直连（P2P），失败回退服务器中转（受后台开关/大小/限速限制） */
  async function sendToRecipient(transferId: string, targetClientId: string) {
    const file = ctx.directStore.getFileHandle(transferId)
    if (!file) return
    try {
      await sendToRecipientInner(transferId, targetClientId, file)
    } catch {
      // 通道异常等未预期错误 → 该接收者标记失败，避免未处理 Promise 拒绝
      ctx.directStore.markRecipientFailed(transferId, targetClientId)
    }
  }

  async function sendToRecipientInner(transferId: string, targetClientId: string, file: File) {
    // 1. 尝试建立直连通道（已有/等待/发起，超时回退）
    const dc = p2pApi ? await p2pApi.establishP2P(targetClientId) : null
    const mode: DirectTransferMode = dc ? 'p2p' : 'relay'
    ctx.directStore.setFileMode(transferId, mode)

    // 2. 中继模式受后台限制（文件大小 / 中转开关）；P2P 不受限制
    if (mode === 'relay') {
      // 房间文件中转单文件大小上限（MB，0=不限制），独立于全局 uploadSize（文件柜普通上传）
      const maxRelayMb = Number(ctx.configStore.config.directMaxRelaySize) || 0
      if (maxRelayMb > 0 && file.size > maxRelayMb * 1024 * 1024) {
        ctx.directStore.markRecipientFailed(transferId, targetClientId)
        ctx.directStore.addSystem(ctx.t('direct.file.relayLimitExceeded'))
        return
      }
      if (ctx.configStore.config.directRelayEnabled === 0) {
        ctx.directStore.markRecipientFailed(transferId, targetClientId)
        ctx.directStore.addSystem(ctx.t('direct.file.relayDisabled'))
        return
      }
    }
    // 分片大小：后台可配置（directRelayChunkSize，KB），兜底 64KB
    const chunkSizeKb = Number(ctx.configStore.config.directRelayChunkSize) || 64
    const chunkSize = Math.min(256 * 1024, Math.max(16 * 1024, chunkSizeKb * 1024)) // 限制 16KB~256KB

    ctx.directStore.setFileStatus(transferId, 'transferring')
    const startPayload = {
      type: 'file_start',
      transfer_id: transferId,
      file_name: file.name,
      file_size: file.size,
      sender: ctx.currentNickname.value,
      mode,
      from_id: ctx.directStore.myClientId,
    }
    if (dc) {
      dc.send(JSON.stringify(startPayload))
    } else {
      ctx.sendSignal({ ...startPayload, target: targetClientId })
    }

    // 3. 中继模式：先完成端到端加密握手（ECDH 交换，密钥仅存在于双方客户端）
    let relayKey: CryptoKey | undefined
    if (mode === 'relay' && cryptoApi) {
      const established = await cryptoApi.establishRelayKey(targetClientId)
      if (!established) {
        ctx.directStore.markRecipientFailed(transferId, targetClientId)
        ctx.directStore.addSystem(ctx.t('direct.file.relayEncryptFailed'))
        ctx.sendSignal({ type: 'file_cancel', transfer_id: transferId, target: targetClientId })
        return
      }
      relayKey = cryptoApi.relayKeys.get(targetClientId)
    }

    // 4. 分片发送（控制帧与数据同通道；数据帧带 transfer_id/index 帧头）
    const hasher = new Sha256() // 发送过程流式计算 SHA-256，用于接收侧完整性校验
    let offset = 0
    let index = 0
    let failed = false
    while (offset < file.size) {
      const end = Math.min(offset + chunkSize, file.size)
      let buf: ArrayBuffer
      try {
        buf = await file.slice(offset, end).arrayBuffer()
      } catch {
        failed = true
        break
      }
      hasher.update(new Uint8Array(buf))
      if (dc) {
        // P2P：明文帧（DTLS 已加密）
        const framed = encodeDirectFrame(transferId, index, buf)
        // P2P 背压：通道缓冲过大时等待
        while (dc.readyState === 'open' && dc.bufferedAmount > DRAIN_THRESHOLD) await sleep(30)
        if (dc.readyState !== 'open') {
          failed = true
          break
        }
        try {
          dc.send(JSON.stringify({ type: 'file_chunk', transfer_id: transferId, index }))
          dc.send(framed)
        } catch {
          failed = true
          break
        }
      } else {
        // 中继：只加密「分片载荷」（AES-GCM → nonce + 密文），再套明文帧头。
        // 接收端 decodeDirectFrame 按明文帧头(0xA5)解析 → decryptRelayChunk(frame.payload)。
        // 绝不能把整个 framed（含明文帧头）再整体加密，否则接收端收到的首字节是 nonce，
        // 命中 0xA5 概率仅 1/256 → 帧被静默丢弃 → 接收进度 0、发送端 hash_mismatch 失败。
        let encryptedBuf: ArrayBuffer
        try {
          encryptedBuf = relayKey ? await encryptRelayChunk(relayKey, buf) : buf
        } catch {
          failed = true
          break
        }
        const framed = encodeDirectFrame(transferId, index, encryptedBuf, true)
        // 中继背压：WebSocket 缓冲过大时等待（避免慢网内存上涨）
        while (ctx.ws.value && ctx.ws.value.readyState === WebSocket.OPEN && ctx.ws.value.bufferedAmount > DRAIN_THRESHOLD) await sleep(30)
        if (!ctx.ws.value || ctx.ws.value.readyState !== WebSocket.OPEN) {
          failed = true
          break
        }
        ctx.sendSignal({ type: 'file_chunk', transfer_id: transferId, index })
        try {
          ctx.ws.value.send(framed)
        } catch {
          failed = true
          break
        }
      }
      ctx.directStore.updateFileProgress(transferId, end)
      offset = end
      index++
      // 周期性让出主线程，保证进度条渲染
      if (index % 32 === 0) await sleep(0)
    }

    const fileHash = hasher.digestHex()

    // 5. 结束
    if (failed) {
      ctx.directStore.markRecipientFailed(transferId, targetClientId)
      const cancelPayload = { type: 'file_cancel', transfer_id: transferId }
      if (dc) {
        dc.send(JSON.stringify(cancelPayload))
      } else {
        ctx.sendSignal({ ...cancelPayload, target: targetClientId })
      }
    } else {
      const endPayload = { type: 'file_end', transfer_id: transferId, file_hash: fileHash }
      if (dc) {
        dc.send(JSON.stringify(endPayload))
      } else {
        ctx.sendSignal({ ...endPayload, target: targetClientId })
      }
      ctx.directStore.markRecipientDone(transferId, targetClientId)
    }
  }

  /** 取消发送任务（对仍在传输中的接收者发送 file_cancel） */
  function cancelOutgoing(transferId: string) {
    const item = ctx.directStore.getFileItem(transferId)
    if (!item || item.fileDirection !== 'outgoing') return
    for (const r of item.recipients || []) {
      if (r.status === 'confirmed' || r.status === 'transferring') {
        const entry = ctx.p2p.get(r.client_id)
        if (entry && entry.dc && entry.ready) {
          entry.dc.send(JSON.stringify({ type: 'file_cancel', transfer_id: transferId }))
        } else {
          ctx.sendSignal({ type: 'file_cancel', transfer_id: transferId, target: r.client_id })
        }
      }
    }
    ctx.directStore.setFileStatus(transferId, 'canceled')
  }

  return {
    setP2PApi,
    setCryptoApi,
    offerFiles,
    respondFileOffer,
    processSendQueue,
    sendToRecipient,
    sendToRecipientInner,
    cancelOutgoing,
  }
}
