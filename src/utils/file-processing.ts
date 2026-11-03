/**
 * 上传侧的文件指纹与打包：算用于秒传去重的 hash、把多文件压成 zip。
 *
 * ## 为什么大文件只取首尾各 5MB、且不进 Worker
 * 这里算的只是内容指纹、不是安全校验：读完整文件进内存会长时间阻塞主线程，
 * 首尾切片加文件大小已足以区分不同文件；计算很轻，没必要额外起 Worker。
 * 权威 SHA-256 由服务端落盘时算，下载侧的全量校验才走 hash-worker.ts 的 Worker。
 *
 * ## 边界
 * http 非安全上下文没有 crypto.subtle，降级为文件名+大小+修改时间的非加密哈希：
 * 此时本就无法与服务端摘要比对，宁可给稳定值也别抛错中断上传。
 */
import JSZip from 'jszip'

const SMALL_FILE_HASH_LIMIT = 10 * 1024 * 1024
const LARGE_FILE_HASH_CHUNK_SIZE = 5 * 1024 * 1024

const generateFallbackHash = (file: File): string => {
  const fileInfo = `${file.name}-${file.size}-${file.lastModified}`
  let hash = 0
  for (let i = 0; i < fileInfo.length; i++) {
    const char = fileInfo.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(64, '0')
}

const createSha256Hash = async (data: BufferSource): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const calculateFileHash = async (file: File): Promise<string> => {
  try {
    if (file.size <= SMALL_FILE_HASH_LIMIT) {
      const buffer = await file.arrayBuffer()
      return window.isSecureContext ? createSha256Hash(buffer) : generateFallbackHash(file)
    }

    const firstChunk = file.slice(0, LARGE_FILE_HASH_CHUNK_SIZE)
    const lastChunk = file.slice(-LARGE_FILE_HASH_CHUNK_SIZE)
    const [firstBuffer, lastBuffer] = await Promise.all([
      firstChunk.arrayBuffer(),
      lastChunk.arrayBuffer()
    ])
    const combined = new Uint8Array(firstBuffer.byteLength + lastBuffer.byteLength + 16)
    combined.set(new Uint8Array(firstBuffer), 0)
    combined.set(new Uint8Array(lastBuffer), firstBuffer.byteLength)
    const sizeBytes = new TextEncoder().encode(file.size.toString())
    combined.set(sizeBytes, firstBuffer.byteLength + lastBuffer.byteLength)

    return window.isSecureContext ? createSha256Hash(combined) : generateFallbackHash(file)
  } catch (error) {
    console.error('File hash calculation failed:', error)
    return generateFallbackHash(file)
  }
}

export const packFilesAsZip = async (files: File[]): Promise<File> => {
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.name, file)
  }
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
  return new File([blob], `files_${Date.now()}.zip`, { type: 'application/zip' })
}
