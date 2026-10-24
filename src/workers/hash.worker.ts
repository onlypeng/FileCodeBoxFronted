/// <reference lib="webworker" />
/**
 * 大文件 SHA-256 计算（Worker 线程）。
 *
 * utils/sha256.ts 是纯 JS 实现，虽然支持增量 update，但计算本身是 CPU 密集的：
 * 在主线程算上百 MB 会冻结 UI。放到 Worker 后主线程只负责切片并把 ArrayBuffer
 * 交给 Worker，界面全程可响应。
 */
import { Sha256 } from '@/utils/sha256'

export interface HashWorkerRequest {
  id: number
  blob: Blob
  chunkSize: number
}

export type HashWorkerResponse =
  | { id: number; ok: true; hash: string }
  | { id: number; ok: false; error: string }

const ctx = self as unknown as Worker

ctx.onmessage = async (e: MessageEvent<HashWorkerRequest>) => {
  const { id, blob, chunkSize } = e.data
  try {
    const hasher = new Sha256()
    for (let offset = 0; offset < blob.size; offset += chunkSize) {
      const buf = await blob.slice(offset, Math.min(offset + chunkSize, blob.size)).arrayBuffer()
      hasher.update(new Uint8Array(buf))
    }
    const response: HashWorkerResponse = { id, ok: true, hash: hasher.digestHex() }
    ctx.postMessage(response)
  } catch (err) {
    const response: HashWorkerResponse = { id, ok: false, error: String(err) }
    ctx.postMessage(response)
  }
}
