// 临时房间二进制分片帧格式
// 修复并发中继/P2P 传输的"二进制帧串台"问题：每个二进制分片自带 transfer_id 与 index，
// 接收端按帧头路由到对应传输任务，不再依赖全局 chunkContext。
//
// 帧结构：
//   [0xA5 magic][1B transfer_id 长度][transfer_id UTF-8][4B index(大端)][1B flags][分片数据]
//
// flags 低 2 位：
//   bit0 = 1 → 分片数据为加密负载（nonce(12B) + AES-GCM 密文），用于服务器中转分片的端到端加密；
//           P2P 直连通道走 DTLS 自带加密，分片数据保持明文（bit0 = 0）。
//   bit1 = 1 → 媒体帧（传屏幕/传视频的服务器中转流）：接收端走 MediaSource 流式播放旁路，
//           不经文件分片的序号强校验/按大小组装逻辑。

const FRAME_MAGIC = 0xa5
const FRAME_FLAG_ENCRYPTED = 0x01
const FRAME_FLAG_MEDIA = 0x02

export interface DecodedDirectFrame {
  transferId: string
  index: number
  payload: ArrayBuffer
  /** 分片数据是否已加密（AES-GCM，payload 为 nonce + 密文） */
  encrypted: boolean
  /** 是否为媒体帧（传屏幕/传视频的服务器中转流） */
  media: boolean
}

/** 编码一个二进制分片帧 */
export function encodeDirectFrame(
  transferId: string,
  index: number,
  payload: ArrayBuffer,
  encrypted = false,
  media = false
): ArrayBuffer {
  const idBytes = new TextEncoder().encode(transferId)
  const total = 1 + 1 + idBytes.byteLength + 4 + 1 + payload.byteLength
  const buf = new ArrayBuffer(total)
  const u8 = new Uint8Array(buf)
  const view = new DataView(buf)
  let offset = 0
  u8[offset++] = FRAME_MAGIC
  u8[offset++] = idBytes.byteLength
  u8.set(idBytes, offset)
  offset += idBytes.byteLength
  view.setUint32(offset, index >>> 0, false)
  offset += 4
  let flags = 0
  if (encrypted) flags |= FRAME_FLAG_ENCRYPTED
  if (media) flags |= FRAME_FLAG_MEDIA
  u8[offset++] = flags
  u8.set(new Uint8Array(payload), offset)
  return buf
}

/** 解码一个二进制分片帧；非法帧返回 null */
export function decodeDirectFrame(buf: ArrayBuffer): DecodedDirectFrame | null {
  const u8 = new Uint8Array(buf)
  if (u8.byteLength < 7 || u8[0] !== FRAME_MAGIC) return null
  const idLen = u8[1]
  const headerLen = 1 + 1 + idLen + 4 + 1
  if (u8.byteLength < headerLen) return null
  const transferId = new TextDecoder().decode(u8.subarray(2, 2 + idLen))
  const view = new DataView(buf, 2 + idLen, 4)
  const index = view.getUint32(0, false)
  const flags = u8[1 + 1 + idLen + 4]
  const payload = buf.slice(headerLen)
  return {
    transferId,
    index,
    payload,
    encrypted: (flags & FRAME_FLAG_ENCRYPTED) !== 0,
    media: (flags & FRAME_FLAG_MEDIA) !== 0,
  }
}
