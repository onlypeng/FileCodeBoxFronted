/**
 * 文件分享的全套接口：上传（普通/多文件/分片）、取件、后台管理。
 *
 * ## 三条上传通道并存，别选错
 * 1. `uploadFile` / `uploadFiles`：一次性 POST，适合小文件
 * 2. `initChunkUpload` + `uploadChunk` + `completeChunkUpload`：断点续传，
 *    编排逻辑在 `upload-strategy.ts`，不要在这里手写循环
 * 3. 预签名直传见 `PresignUploadService`（对象存储场景）
 *
 * ## 易错点：取件次数会被消耗
 * `selectFile` 每调一次就消耗一次下载次数（后端在 select 时计数）。
 * 只想知道剩余次数/是否过期时必须用 `getFileInfo`，它是只读的。
 * 把 `selectFile` 当成查询详情用会导致用户点一下"查看"次数就减一。
 *
 * ## 刻意不做
 * 不在这里做文件名/大小的前端拦截：真正的限制以后端为准，前端拦一套会导致
 * 绕过前端的请求行为不一致。
 */
import api, { rawApiClient } from './client'
import { multipartUploadConfig } from './shared'
import type {
  ApiResponse,
  ChunkUploadCompleteRequest,
  ChunkUploadInitRequest,
  ChunkUploadInitResponse,
  ChunkUploadResponse,
  FileListResponse,
  FileUploadResponse,
  ShareSelectResponse,
  UploadProgress
} from '@/types'

/**
 * form-urlencoded 请求头与配套的编码函数。
 *
 * 保留原因：后端少数接口只认 form-urlencoded 而不认 JSON。目前本文件内没有调用方，
 * 删除前请先确认没有其它分支引用。
 *
 * 注意 `String(value)` 会把 undefined/null 渲染成字面量 "undefined"，
 * 调用方必须先过滤空值——这里刻意不自动过滤：静默丢字段会让后端以缺参报错，
 * 比传错值更难排查。
 */
const urlEncodedConfig = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}

const toUrlEncodedForm = (data: Record<string, string | number>) => {
  const form = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    form.append(key, String(value))
  })
  return form
}

export class FileService {
  /**
   * 单文件一次性上传，**不带**过期配置（用后端的默认有效期）。
   *
   * 与 `uploadFiles` 的区别不只是数量：这里只 append `file` 一个字段，
   * 适合不需要让用户选有效期的场景。要指定过期请用 `uploadFiles`。
   *
   * 边界：失败**不会抛异常**，而是返回 `code !== 200` 的 `ApiResponse`，
   * 调用方必须自己判 code（拦截器只处理 HTTP 层错误）。
   */
  static async uploadFile(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<FileUploadResponse>> {
    const formData = new FormData()
    formData.append('file', file)

    return api.post('/share/file/', formData, multipartUploadConfig(onProgress))
  }

  /**
   * 多文件（也可传单文件）上传并指定过期方式。
   *
   * `files` 字段名不能写成 `file`：后端按列表接收，写成单数只会收到第一个。
   * `remark` / `accessCode` 为空时整个字段都**不带**（而不是传空串），
   * 这样后端不会把一个被显式设为空串的值覆盖掉默认。
   *
   * @param expireStyle day/hour/minute/count/forever，需与 expireValue 配套
   * @param accessCode 二次口令；留空表示不设口令
   */
  static async uploadFiles(
    files: File[],
    expireValue: number = 1,
    expireStyle: string = 'day',
    onProgress?: (progress: UploadProgress) => void,
    remark?: string,
    accessCode?: string
  ): Promise<ApiResponse<FileUploadResponse>> {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    formData.append('expire_value', String(expireValue))
    formData.append('expire_style', expireStyle)
    if (remark) {
      formData.append('remark', remark)
    }
    if (accessCode) {
      formData.append('access_code', accessCode)
    }

    return api.post('/share/file/', formData, multipartUploadConfig(onProgress))
  }

  /** 提前作废自己发起的分享（需要上传时下发的发起者凭证） */
  static async revoke(code: string, ownerToken: string): Promise<ApiResponse> {
    return api.post('/share/revoke', { code, owner_token: ownerToken })
  }

  static async initChunkUpload(
    request: ChunkUploadInitRequest
  ): Promise<ApiResponse<ChunkUploadInitResponse>> {
    return api.post(
      '/chunk/upload/init/',
      {
        file_name: request.file_name,
        file_size: request.file_size,
        chunk_size: request.chunk_size,
        file_hash: request.file_hash
      }
    )
  }

  static async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<ChunkUploadResponse>> {
    const formData = new FormData()
    formData.append('chunk', chunk)
    return api.post(
      `/chunk/upload/chunk/${uploadId}/${chunkIndex}`,
      formData,
      multipartUploadConfig(onProgress)
    )
  }

  static async completeChunkUpload(
    uploadId: string,
    request: ChunkUploadCompleteRequest
  ): Promise<ApiResponse<FileUploadResponse>> {
    return api.post(
      `/chunk/upload/complete/${uploadId}`,
      {
        expire_value: request.expire_value,
        expire_style: request.expire_style,
        remark: request.remark || '',
        access_code: request.access_code || ''
      }
    )
  }

  /**
   * 按取件码取分享详情。
   *
   * **副作用：每调用一次就消耗一次下载次数**（后端在 select 时计数）。
   * 因此它只能用在用户确实要开始下载这一步；只想刷新剩余次数/文件列表/是否过期时
   * 请用 `getFileInfo`（只读）。误用会让用户在记录页点一下"查看"就少一次。
   *
   * @param accessCode 二次口令。口令校验通过后服务端会在响应里下发短期 `accessKey`，
   *                   后续下载单项/打包都要带上它（见 `CollectionService.getMultiFileDownloadUrl`）
   */
  static async selectFile(code: string, accessCode?: string): Promise<ApiResponse<ShareSelectResponse>> {
    return api.post('/share/select/', { code, access_code: accessCode || '' })
  }

  /** 只读查询文件分享详情（不消耗取件次数），供记录查看刷新剩余次数/文件列表/过期状态 */
  static async getFileInfo(
    code: string,
    options?: { accessCode?: string; ownerToken?: string }
  ): Promise<ApiResponse<ShareSelectResponse>> {
    return api.get('/share/select/info/', {
      params: {
        code,
        access_code: options?.accessCode || '',
        owner_token: options?.ownerToken || ''
      }
    })
  }

  /**
   * 判断一段码属于什么业务（文件分享/投递箱/房间），用于把用户引导到正确页面。
   *
   * 返回 `type` 是字符串而非枚举：后端的码类型会随新功能扩展，
   * 收敛成联合类型会让旧前端在新增类型时直接崩掉（穷尽性检查）。
   *
   * @throws 网络错误会以 rejected Promise 抛出；**码不存在时返回业务码非 200**（不抛）
   */
  static async checkCodeType(code: string): Promise<ApiResponse<{ type: string; code: string; title?: string; expired?: boolean }>> {
    return api.get('/share/check_code/', { params: { code } })
  }

  /**
   * 下载文件内容。
   *
   * **这是本 service 唯一「响应形状与其它接口不同」的方法**：走 `rawApiClient` +
   * `responseType: 'blob'`，返回裸 Blob 而不是 `ApiResponse`。
   * 后果是**读不到业务错误码**——分享过期/次数用尽时后端返回的是一段 JSON，
   * 这里会原样当成文件内容交给调用方，用户会下载到一个坏文件。
   * 因此调用方务必先用 `getFileInfo`（只读）确认可取，再调本方法。
   *
   * @throws 网络错误 / HTTP 4xx、5xx 会以 rejected Promise 抛出
   *         （service 层的其它方法几乎都不抛，这里是例外，注意区分）
   */
  static async downloadFile(code: string): Promise<Blob> {
    const response = await rawApiClient.get<Blob>(`/download/${code}`, {
      responseType: 'blob'
    })
    return response.data
  }

  static async getAdminFileList(params: {
    page: number
    size: number
    keyword?: string
    status?: string
  }): Promise<ApiResponse<FileListResponse>> {
    return api.get('/admin/file/list', { params })
  }

  /** 单文件详情（含完整文本内容） */
  static async getAdminFileDetail(id: number): Promise<ApiResponse> {
    return api.get(`/admin/file/${id}`)
  }

  /**
   * 后台删除文件。
   *
   * id 走**请求体**而不是 query：后端用 DELETE + body 的语义（且 id 不宜出现在 URL 里，
   * 会被网关 access log 记录）。axios 的 DELETE 必须把 id 放在 `data` 下，
   * 放在 `params` 会变成 query string，后端收不到。
   */
  static async deleteAdminFile(id: number): Promise<ApiResponse> {
    return api.delete('/admin/file/delete', {
      data: { id }
    })
  }

  /** 延长文件过期（day/hour/minute/count/forever） */
  static async extendAdminFile(id: number, expireStyle: string, expireValue: number): Promise<ApiResponse> {
    return api.post('/admin/file/extend', { id, expire_style: expireStyle, expire_value: expireValue })
  }

  /** 修改文件备注（文本分享内容） */
  static async updateAdminFile(id: number, remark: string): Promise<ApiResponse> {
    return api.patch(`/admin/file/${id}`, { remark })
  }

  /** 保存文件过期时间（按当前时间重设） */
  static async saveAdminFileExpire(id: number, expireStyle: string, expireValue: number): Promise<ApiResponse> {
    return api.patch(`/admin/file/${id}/expire`, { expire_style: expireStyle, expire_value: expireValue })
  }
}
