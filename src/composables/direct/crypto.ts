/**
 * 中继分片端到端加密域：ECDH（P-256）+ AES-GCM 会话密钥握手。
 * 发送方与接收方各生成一次性密钥对，通过 crypto_setup 信令交换 SPKI 公钥，
 * 各自用私钥与对方公钥派生同一把密钥。密钥只在双方客户端内存中存在。
 * 服务器中转节点只看到密文，无法解密文件内容。
 */
import {
  decryptRelayChunk,
  deriveRelayAESKey,
  encryptRelayChunk,
  exportPublicKey,
  generateRelayKeyPair,
  importPublicKey,
} from '@/utils/relay-crypto'
import type { DirectWSMessage } from '@/types/direct'
import type { DirectConnectionContext } from './context'

const CRYPTO_HANDSHAKE_TIMEOUT = 5000 // 握手超时 5 秒

export function createDirectCrypto(ctx: DirectConnectionContext) {
  /** 确保本端密钥对存在 */
  async function ensureRelayKeyPair(): Promise<CryptoKeyPair> {
    if (!ctx.myRelayKeyPair) {
      try {
        ctx.myRelayKeyPair = await generateRelayKeyPair()
      } catch {
        return null as unknown as CryptoKeyPair
      }
    }
    return ctx.myRelayKeyPair
  }

  /** 收到对方 crypto_setup：用自己的私钥 + 对方公钥派生会话密钥 */
  async function handleCryptoSetup(msg: DirectWSMessage) {
    const fromId = msg.from_id || ''
    if (!fromId || !msg.pub) return
    if (ctx.relayKeys.has(fromId)) return // 已在握手/已就绪，忽略重复公钥
    const pair = await ensureRelayKeyPair()
    if (!pair) return
    const peerPublic = await importPublicKey(msg.pub)
    if (!peerPublic) return
    try {
      const key = await deriveRelayAESKey(pair.privateKey, peerPublic)
      ctx.relayKeys.set(fromId, key)
    } catch {
      return
    }
    // 应答：向对方发送自己的公钥（对方用其私钥与我的公钥派生出同一把密钥）
    const myPub = await exportPublicKey(pair.publicKey)
    ctx.sendSignal({ type: 'crypto_setup', target: fromId, pub: myPub })
    // 唤醒等待中的发送方
    ctx.cryptoWaiters.get(fromId)?.()
    ctx.cryptoWaiters.delete(fromId)
  }

  /** 与目标接收者完成加密握手：发公钥、等回包、派生密钥；超时返回 false */
  async function establishRelayKey(targetId: string): Promise<boolean> {
    if (ctx.relayKeys.has(targetId)) return true
    const pair = await ensureRelayKeyPair()
    if (!pair) return false
    const myPub = await exportPublicKey(pair.publicKey)
    ctx.sendSignal({ type: 'crypto_setup', target: targetId, pub: myPub })
    if (ctx.relayKeys.has(targetId)) return true
    // 等待对方回包（handleCryptoSetup 到达时唤醒）
    await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), CRYPTO_HANDSHAKE_TIMEOUT)
      const onKey = () => {
        clearTimeout(timer)
        resolve(true)
      }
      if (ctx.relayKeys.has(targetId)) {
        clearTimeout(timer)
        resolve(true)
        return
      }
      ctx.cryptoWaiters.set(targetId, onKey)
    })
    return ctx.relayKeys.has(targetId)
  }

  /** 清理加密状态（断开/房间退出时调用） */
  function clearRelayCrypto() {
    ctx.myRelayKeyPair = null
    ctx.relayKeys.clear()
    ctx.cryptoWaiters.clear()
  }

  return {
    ensureRelayKeyPair,
    handleCryptoSetup,
    establishRelayKey,
    clearRelayCrypto,
  }
}
