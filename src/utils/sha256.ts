// 增量 SHA-256（纯 TS 实现）
// 用于临时房间的流式完整性校验：发送/接收过程中逐分片喂入，不依赖 crypto.subtle，
// 兼容 http 局域网部署（无安全上下文）。仅作完整性校验用途，非安全加密。

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0
}

export class Sha256 {
  private h0 = 0x6a09e667
  private h1 = 0xbb67ae85
  private h2 = 0x3c6ef372
  private h3 = 0xa54ff53a
  private h4 = 0x510e527f
  private h5 = 0x9b05688c
  private h6 = 0x1f83d9ab
  private h7 = 0x5be0cd19
  private chunk = new Uint8Array(64)
  private chunkLen = 0
  private totalLen = 0

  private process(block: Uint8Array) {
    const w = new Array<number>(64)
    const dv = new DataView(block.buffer, block.byteOffset, 64)
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(i * 4, false)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let a = this.h0, b = this.h1, c = this.h2, d = this.h3
    let e = this.h4, f = this.h5, g = this.h6, h = this.h7
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + s1 + ch + K[i] + w[i]) >>> 0
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (s0 + maj) >>> 0
      h = g; g = f; f = e; e = (d + temp1) >>> 0
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0
    }
    this.h0 = (this.h0 + a) >>> 0
    this.h1 = (this.h1 + b) >>> 0
    this.h2 = (this.h2 + c) >>> 0
    this.h3 = (this.h3 + d) >>> 0
    this.h4 = (this.h4 + e) >>> 0
    this.h5 = (this.h5 + f) >>> 0
    this.h6 = (this.h6 + g) >>> 0
    this.h7 = (this.h7 + h) >>> 0
  }

  /** 喂入一段数据（可多次调用） */
  update(data: Uint8Array): this {
    let offset = 0
    this.totalLen += data.byteLength
    if (this.chunkLen > 0) {
      const need = 64 - this.chunkLen
      const take = Math.min(need, data.byteLength)
      this.chunk.set(data.subarray(0, take), this.chunkLen)
      this.chunkLen += take
      offset += take
      if (this.chunkLen === 64) {
        this.process(this.chunk)
        this.chunkLen = 0
      }
    }
    while (offset + 64 <= data.byteLength) {
      this.process(data.subarray(offset, offset + 64))
      offset += 64
    }
    if (offset < data.byteLength) {
      const rest = data.subarray(offset)
      this.chunk.set(rest, this.chunkLen)
      this.chunkLen += rest.byteLength
    }
    return this
  }

  /** 完成计算，返回 64 位十六进制摘要 */
  digestHex(): string {
    const totalBitsHi = Math.floor(this.totalLen / 0x20000000)
    const totalBitsLo = (this.totalLen * 8) >>> 0

    // 长度字段固定放在最后一块的 [56, 64) 字节
    const writeLen = (block: Uint8Array) => {
      const dv = new DataView(block.buffer, block.byteOffset, 64)
      dv.setUint32(56, totalBitsHi, false)
      dv.setUint32(60, totalBitsLo, false)
    }

    if (this.chunkLen < 56) {
      // 单块即可容纳：消息 + 0x80 + 零填充 + 长度
      this.chunk.fill(0, this.chunkLen + 1, 64)
      this.chunk[this.chunkLen] = 0x80
      writeLen(this.chunk)
      this.process(this.chunk)
    } else {
      // 两块：第一块补 0x80 + 零填充，第二块仅长度
      this.chunk.fill(0, this.chunkLen + 1, 64)
      this.chunk[this.chunkLen] = 0x80
      this.process(this.chunk)
      const final = new Uint8Array(64)
      writeLen(final)
      this.process(final)
    }

    const out = [this.h0, this.h1, this.h2, this.h3, this.h4, this.h5, this.h6, this.h7]
    return out.map((x) => x.toString(16).padStart(8, '0')).join('')
  }
}

/** 便捷函数：一次性计算完整数据摘要 */
export function sha256Hex(data: Uint8Array): string {
  return new Sha256().update(data).digestHex()
}
