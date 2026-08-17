import api from './client'
import { buildAbsoluteUrl } from '@/utils/share-url'
import type { ApiResponse } from '@/types'
import type {
  CreateCollectionRequest,
  CreateCollectionResponse,
  CollectionManageResponse,
  CollectionRetrieveResponse,
  AdminCollectionItem,
  CollectionFileItem,
  UpdateCollectionConfigRequest,
  UpdateCollectionConfigResponse,
} from '@/types/collection'

export class CollectionService {
  /** 创建收件箱（返回三码） */
  static async create(
    data: CreateCollectionRequest
  ): Promise<ApiResponse<CreateCollectionResponse>> {
    return api.post('/collection/create/', data)
  }

  /** 通过取件码获取收件箱文件列表（只读） */
  static async getRetrieveInfo(
    retrieveCode: string
  ): Promise<ApiResponse<CollectionRetrieveResponse>> {
    return api.get(`/collection/retrieve/${retrieveCode}`)
  }

  /** 获取收件箱管理信息（使用 collection_code） */
  static async getManageInfo(
    collectionCode: string
  ): Promise<ApiResponse<CollectionManageResponse>> {
    return api.get(`/collection/manage/${collectionCode}`)
  }

  /** 通过投件码获取收件箱管理信息 */
  static async getManageInfoByDeliveryCode(
    deliveryCode: string
  ): Promise<ApiResponse<CollectionManageResponse>> {
    return api.get(`/collection/manage-by-delivery/${deliveryCode}`)
  }

  /** 获取收件箱状态（同管理信息） */
  static async getStatus(
    collectionCode: string
  ): Promise<ApiResponse<CollectionManageResponse>> {
    return api.get(`/collection/status/${collectionCode}`)
  }

  /** 下载收件箱中的单个文件（需管理码或取件码校验） */
  static getDownloadUrl(fileId: number, code: string): string {
    return buildAbsoluteUrl(`/collection/download/${fileId}?code=${encodeURIComponent(code)}`)
  }

  /** 下载收件箱所有文件（ZIP） */
  static getZipDownloadUrl(collectionCode: string): string {
    return buildAbsoluteUrl(`/collection/zip/${collectionCode}`)
  }

  /** 删除收件箱中的文件 */
  static async deleteFile(fileId: number, code: string): Promise<ApiResponse> {
    return api.delete(`/collection/delete/${fileId}`, { params: { code } })
  }

  /** 更新收件箱配置 */
  static async updateConfig(
    collectionCode: string,
    data: UpdateCollectionConfigRequest
  ): Promise<ApiResponse<UpdateCollectionConfigResponse>> {
    return api.patch(`/collection/update/${collectionCode}`, data)
  }

  /** 下载多文件分享中的单个文件 */
  static getMultiFileDownloadUrl(itemId: number, code: string): string {
    return buildAbsoluteUrl(`/share/download/item/${itemId}?code=${code}`)
  }

  /** 下载多文件分享的ZIP */
  static getMultiFileZipUrl(code: string): string {
    return buildAbsoluteUrl(`/share/zip/${code}`)
  }

  // ============ 后台管理接口 ============

  /** 获取收件箱列表 */
  static async getAdminCollectionList(params: {
    page: number
    size: number
    keyword?: string
    status?: string
  }): Promise<ApiResponse<{ page: number; size: number; data: AdminCollectionItem[]; total: number }>> {
    return api.get('/admin/collection/list', { params })
  }

  /** 获取收件箱文件列表 */
  static async getAdminCollectionFiles(collectionId: number): Promise<ApiResponse<CollectionFileItem[]>> {
    return api.get(`/admin/collection/${collectionId}/files`)
  }

  /** 删除收件箱 */
  static async deleteCollection(collectionId: number): Promise<ApiResponse> {
    return api.delete(`/admin/collection/${collectionId}`)
  }

  /** 延长收件箱过期：target=manage/deliver/retrieve */
  static async extendAdminCollection(
    collectionId: number,
    expireStyle: string,
    expireValue: number,
    target: string
  ): Promise<ApiResponse> {
    return api.post(`/admin/collection/${collectionId}/extend`, {
      expire_style: expireStyle,
      expire_value: expireValue,
      target,
    })
  }

  /** 保存收件箱过期（target=manage(整箱)/deliver/retrieve，按当前时间重设） */
  static async saveAdminCollectionExpire(
    collectionId: number,
    expireStyle: string,
    expireValue: number,
    target: string
  ): Promise<ApiResponse> {
    return api.patch(`/admin/collection/${collectionId}/expire`, {
      expire_style: expireStyle,
      expire_value: expireValue,
      target,
    })
  }
}
