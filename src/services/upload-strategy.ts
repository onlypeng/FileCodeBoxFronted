/**
 * 单文件分片上传编排：算整文件哈希 → init → 逐片上传 → complete。
 * 哈希供服务端秒传/去重，init 回传的 uploaded_chunks 用于断点续传（跳过已传片），
 * 所以进度要把已完成片叠加到当前片上，否则续传时进度条会倒退。
 *
 * 边界：片大小钳在 1~100MB，过大失去续传意义、过小片数爆炸；进度封顶 99%，
 * 100% 留给 complete 成功。刻意不做：不重试单片，重查已传片是上层会话的职责。
 */
import { FileService } from './file'
import type { ApiResponse, ChunkUploadInitResponse, FileUploadResponse, UploadProgress } from '@/types'
import { calculateFileHash } from '@/utils/file-processing'

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024
// 分片大小合理范围：最小 1MB / 最大 100MB（过大失去断点续传意义；过小分片数过多）
const CHUNK_SIZE_MIN = 1 * 1024 * 1024
const CHUNK_SIZE_MAX = 100 * 1024 * 1024

type ChunkedUploadOptions = {
  /** 上传分片大小（MB；缺省 5）。由后台 uploadChunkSize 传入 */
  chunkSizeMb?: number
  expireValue: number
  expireStyle: string
  remark?: string
  /** 提取口令（可选）：在"完成上传"时随记录一起提交 */
  accessCode?: string
  onHashCalculated?: (hash: string) => void
  onProgress?: (progress: UploadProgress) => void
  messages?: {
    initFailed?: string
    chunkFailed?: (index: number) => string
    completeFailed?: string
  }
}

type ChunkedUploadResult = ChunkUploadInitResponse | FileUploadResponse

const calculateCompletedBytes = (uploadedChunks: Set<number>, chunkSize: number, fileSize: number) =>
  Array.from(uploadedChunks).reduce((total, index) => {
    const chunkStart = index * chunkSize
    const chunkEnd = Math.min((index + 1) * chunkSize, fileSize)
    return total + Math.max(0, chunkEnd - chunkStart)
  }, 0)

export const uploadChunkedFile = async (
  file: File,
  options: ChunkedUploadOptions
): Promise<ApiResponse<ChunkedUploadResult>> => {
  // 分片大小：后台 uploadChunkSize（MB）→ 字节，限 1MB~100MB，兜底 5MB
  const chunkSizeMb = Number(options.chunkSizeMb) || 0
  const chunkSize = Math.min(CHUNK_SIZE_MAX, Math.max(CHUNK_SIZE_MIN, chunkSizeMb > 0 ? chunkSizeMb * 1024 * 1024 : DEFAULT_CHUNK_SIZE))
  const fileHash = await calculateFileHash(file)
  options.onHashCalculated?.(fileHash)

  const chunks = Math.ceil(file.size / chunkSize)
  const initResponse = await FileService.initChunkUpload({
    file_name: file.name,
    file_size: file.size,
    chunk_size: chunkSize,
    file_hash: fileHash
  })

  if (initResponse.code !== 200) {
    throw new Error(options.messages?.initFailed || 'Init chunk upload failed')
  }

  // 秒传/断点续传命中时也不能提前返回：complete 才是提交过期策略、备注与
  // 提取口令的唯一入口，跳过它会生成一条「没有过期设置的孤儿分享」。
  // existed 只表示分片已在服务端（uploaded_chunks 会装满），下面的循环自然跳过。

  const initDetail = initResponse.detail
  const uploadId = initDetail?.upload_id
  if (!uploadId) {
    throw new Error(options.messages?.initFailed || 'Init chunk upload failed')
  }

  const uploadedChunks = new Set(initDetail.uploaded_chunks || [])
  for (let index = 0; index < chunks; index++) {
    if (uploadedChunks.has(index)) {
      continue
    }

    const start = index * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    const chunkResponse = await FileService.uploadChunk(
      uploadId,
      index,
      new Blob([chunk], { type: file.type }),
      (progress) => {
        const completedBytes = calculateCompletedBytes(uploadedChunks, chunkSize, file.size)
        const percentage = Math.round(((completedBytes + progress.loaded) * 100) / file.size)
        options.onProgress?.({
          loaded: completedBytes + progress.loaded,
          total: file.size,
          percentage: Math.min(percentage, 99)
        })
      }
    )

    if (chunkResponse.code !== 200) {
      throw new Error(options.messages?.chunkFailed?.(index) || `Chunk upload failed: ${index}`)
    }
    uploadedChunks.add(index)
  }

  const completeResponse = await FileService.completeChunkUpload(uploadId, {
    expire_value: options.expireValue,
    expire_style: options.expireStyle,
    remark: options.remark,
    access_code: options.accessCode
  })

  if (completeResponse.code !== 200) {
    throw new Error(options.messages?.completeFailed || 'Complete chunk upload failed')
  }

  return completeResponse
}
