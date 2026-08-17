/**
 * 后台统一管理 composable
 * 封装文件/收件箱/房间的后台管理服务调用，供管理视图使用，避免视图直接依赖 services
 */
import { FileService, CollectionService, RoomService } from '@/services'

export function useUnifiedAdmin() {
  /** 后台文件列表 */
  const getAdminFileList = (params: { page: number; size: number; keyword?: string; status?: string }) =>
    FileService.getAdminFileList(params)

  /** 后台单文件详情（含完整文本内容） */
  const getAdminFileDetail = (id: number) => FileService.getAdminFileDetail(id)

  /** 后台删除文件 */
  const deleteAdminFile = (id: number) => FileService.deleteAdminFile(id)

  /** 后台收件箱列表 */
  const getAdminCollectionList = (params: { page: number; size: number; keyword?: string; status?: string }) =>
    CollectionService.getAdminCollectionList(params)

  /** 后台收件箱文件列表 */
  const getAdminCollectionFiles = (collectionId: number) =>
    CollectionService.getAdminCollectionFiles(collectionId)

  /** 后台删除收件箱 */
  const deleteCollection = (collectionId: number) => CollectionService.deleteCollection(collectionId)

  /** 后台统一房间列表（临时房间房间） */
  const getAdminRoomList = (params: { page: number; size: number; keyword?: string; status?: string }) =>
    RoomService.getAdminRoomList(params)

  /** 后台删除房间 */
  const deleteAdminRoom = (roomId: number) => RoomService.deleteAdminRoom(roomId)

  /** 后台延长文件过期 */
  const extendAdminFile = (id: number, expireStyle: string, expireValue: number) =>
    FileService.extendAdminFile(id, expireStyle, expireValue)

  /** 后台修改文件备注 */
  const updateAdminFile = (id: number, remark: string) => FileService.updateAdminFile(id, remark)

  /** 后台保存文件过期（按当前时间重设） */
  const saveAdminFileExpire = (id: number, expireStyle: string, expireValue: number) =>
    FileService.saveAdminFileExpire(id, expireStyle, expireValue)

  /** 后台延长收件箱过期（target=manage/deliver/retrieve） */
  const extendAdminCollection = (collectionId: number, expireStyle: string, expireValue: number, target: string) =>
    CollectionService.extendAdminCollection(collectionId, expireStyle, expireValue, target)

  /** 后台保存收件箱过期（target=manage/deliver/retrieve） */
  const saveAdminCollectionExpire = (collectionId: number, expireStyle: string, expireValue: number, target: string) =>
    CollectionService.saveAdminCollectionExpire(collectionId, expireStyle, expireValue, target)

  /** 后台延长房间过期 */
  const extendAdminRoom = (roomId: number, expireStyle: string, expireValue: number) =>
    RoomService.extendAdminRoom(roomId, expireStyle, expireValue)

  /** 后台修改房间人员上限 */
  const updateAdminRoom = (roomId: number, maxMembers: number) => RoomService.updateAdminRoom(roomId, maxMembers)

  /** 后台保存房间过期（按当前时间重设） */
  const saveAdminRoomExpire = (roomId: number, expireStyle: string, expireValue: number) =>
    RoomService.saveAdminRoomExpire(roomId, expireStyle, expireValue)

  return {
    getAdminFileList,
    getAdminFileDetail,
    deleteAdminFile,
    getAdminCollectionList,
    getAdminCollectionFiles,
    deleteCollection,
    getAdminRoomList,
    deleteAdminRoom,
    extendAdminFile,
    updateAdminFile,
    saveAdminFileExpire,
    extendAdminCollection,
    saveAdminCollectionExpire,
    extendAdminRoom,
    updateAdminRoom,
    saveAdminRoomExpire,
  }
}
