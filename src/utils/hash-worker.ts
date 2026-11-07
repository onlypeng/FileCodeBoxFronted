/**
 * 在 Worker 中计算大文件的 SHA-256。
 *
 * 纯 JS 的 SHA-256（utils/sha256.ts）是 CPU 密集操作，在主线程算大文件会冻结 UI。
 * 这里把计算挪到 Worker：
 * - 主线程只做 blob.slice + arrayBuffer（可转移，不额外占内存）
 * - Worker 不可用（老浏览器 / 非 module worker 环境）时回退主线程，保证功能不丢
 */
import type { HashWorkerRequest, HashWorkerResponse } from '@/workers/hash.worker'
import { Sha256 } from '@/utils/sha256'

const DEFAULT_CHUNK = 4 * 1024 * 1024

let worker: Worker | null = null
let workerBroken = false
let seq = 0
const pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>()

function ensureWorker(): Worker | null {
  if (workerBroken) return null
  if (worker) return worker
  if (typeof Worker === 'undefined') {
    workerBroken = true
    return null
  }
  try {
    worker = new Worker(new URL('../workers/hash.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<HashWorkerResponse>) => {
      const data = e.data
      const entry = pending.get(data.id)
      if (!entry) return
      pending.delete(data.id)
      if (data.ok) entry.resolve(data.hash)
      else entry.reject(new Error(data.error || '哈希计算失败'))
    }
    worker.onerror = () => {
      // Worker 异常（不支持 / 加载失败）：标记不可用，后续走主线程回退
      workerBroken = true
      for (const [, entry] of pending) entry.reject(new Error('哈希 Worker 异常'))
      pending.clear()
      try {
        worker?.terminate()
      } catch {
        /* ignore */
      }
      worker = null
    }
    return worker
  } catch {
    workerBroken = true
    return null
  }
}

/** 主线程回退：切片 + 每片之间让出事件循环，尽量不长时间占满主线程 */
async function hashOnMainThread(blob: Blob, chunkSize: number): Promise<string> {
  const hasher = new Sha256()
  for (let offset = 0; offset < blob.size; offset += chunkSize) {
    const buf = await blob.slice(offset, Math.min(offset + chunkSize, blob.size)).arrayBuffer()
    hasher.update(new Uint8Array(buf))
    await new Promise((r) => setTimeout(r, 0))
  }
  return hasher.digestHex()
}

/** 计算 Blob 的 SHA-256（优先 Worker，失败自动回退主线程） */
export async function hashBlob(blob: Blob, chunkSize = DEFAULT_CHUNK): Promise<string> {
  const size = Math.max(1024 * 1024, chunkSize)
  const w = ensureWorker()
  if (!w) return hashOnMainThread(blob, size)

  const id = ++seq
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const request: HashWorkerRequest = { id, blob, chunkSize: size }
    try {
      w.postMessage(request)
    } catch {
      pending.delete(id)
      workerBroken = true
      hashOnMainThread(blob, size).then(resolve, reject)
    }
  })
}
