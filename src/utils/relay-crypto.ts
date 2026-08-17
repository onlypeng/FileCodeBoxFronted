// 服务器中转分片的端到端加密（浏览器 Web Crypto API）
//
// 原理：发送方与接收方各生成一次性 ECDH（P-256）密钥对，通过 WebSocket 信令
// （crypto_setup）交换 SPKI 公钥，各自用私钥与对方公钥派生同一把 AES-GCM 会话密钥。
// 之后中继的二进制分片用该密钥加密（12 字节随机 nonce + 密文，nonce 前置在负载前）。
// 服务器中转节点只看到密文，无法解密文件内容；P2P 直连通道由 DTLS 保护，无需此层。
//
// 密钥只在双方客户端内存中存在：断线重连后重新握手。

const NONCE_LENGTH = 12

/** 生成一次性 ECDH 密钥对（不可导出私钥） */
export async function generateRelayKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  )
}

/** 导出公钥为 SPKI base64（用于信令传输） */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', publicKey)
  return b64FromBuffer(spki)
}

/** 从 SPKI base64 导入对方公钥；非法输入返回 null */
export async function importPublicKey(spkiB64: string): Promise<CryptoKey | null> {
  try {
    const spki = b64ToBuffer(spkiB64)
    return await crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    )
  } catch {
    return null
  }
}

/** 用本方私钥与对方公钥派生 AES-GCM 会话密钥（双方推导结果一致） */
export async function deriveRelayAESKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/** 加密一个分片：返回 nonce(12B) + AES-GCM 密文 */
export async function encryptRelayChunk(
  key: CryptoKey,
  data: ArrayBuffer
): Promise<ArrayBuffer> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    data
  )
  const out = new Uint8Array(NONCE_LENGTH + ciphertext.byteLength)
  out.set(nonce, 0)
  out.set(new Uint8Array(ciphertext), NONCE_LENGTH)
  return out.buffer
}

/** 解密一个加密分片（nonce 前置）；认证失败或密钥错误返回 null */
export async function decryptRelayChunk(
  key: CryptoKey,
  payload: ArrayBuffer
): Promise<ArrayBuffer | null> {
  if (payload.byteLength < NONCE_LENGTH + 16) return null
  try {
    const nonce = payload.slice(0, NONCE_LENGTH)
    const ciphertext = payload.slice(NONCE_LENGTH)
    return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext)
  } catch {
    return null
  }
}

function b64FromBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function b64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
