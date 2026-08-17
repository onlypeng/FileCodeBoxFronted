/**
 * 记录展示统一工具（取件/发件记录列表共用）
 * - 图标：多文件与单文件统一使用单文件图标
 * - 类型标签：多文件与单文件统一显示"文件"
 * - 文件数量：多文件返回子项数，单文件返回 1
 */
import { FileTextIcon, FileIcon, InboxIcon, UploadIcon } from 'lucide-vue-next'

/** 记录展示所需的最小字段结构（兼容取件/发件记录） */
export interface RecordDisplayLike {
  type?: string
  content?: string | null
  isCollection?: boolean
  isDelivery?: boolean
  isMultiFile?: boolean
  fileCount?: number
  multiFileItems?: Array<{ file_name: string }> | null
  collectionFiles?: Array<{ file_name: string }> | null
}

/** 文件数量：多文件返回子项数，单文件返回 1，文本返回 0 */
export function getRecordFileCount(record: RecordDisplayLike): number {
  const type = record.type || (record.content ? 'text' : 'file')
  if (type === 'text') return 0
  if (record.isCollection && record.collectionFiles?.length) return record.collectionFiles.length
  if (record.isMultiFile && record.multiFileItems?.length) return record.multiFileItems.length
  if (type === 'multiFile') return record.fileCount || 0
  return 1
}

/** 记录图标：多文件与单文件统一使用单文件图标 */
export function getRecordIcon(record: RecordDisplayLike, isDark: boolean) {
  const type = record.type || (record.content ? 'text' : 'file')
  switch (type) {
    case 'text':
      return { icon: FileTextIcon, color: isDark ? 'text-teal-400' : 'text-teal-500' }
    case 'multiFile':
      if (record.isCollection) {
        return { icon: InboxIcon, color: isDark ? 'text-indigo-400' : 'text-indigo-500' }
      }
      if (record.isDelivery) {
        return { icon: UploadIcon, color: isDark ? 'text-amber-400' : 'text-amber-500' }
      }
      return { icon: FileIcon, color: isDark ? 'text-sky-400' : 'text-sky-500' }
    default:
      return { icon: FileIcon, color: isDark ? 'text-sky-400' : 'text-sky-500' }
  }
}

/** 记录类型标签：多文件与单文件统一显示"文件" */
export function getRecordBadge(
  record: RecordDisplayLike,
  texts: { file: string; text: string; collection: string; delivery: string },
  isDark: boolean
) {
  const type = record.type || (record.content ? 'text' : 'file')
  switch (type) {
    case 'text':
      return { text: texts.text, class: isDark ? 'bg-teal-900/40 text-teal-200' : 'bg-teal-100 text-gray-900' }
    case 'multiFile':
      if (record.isCollection) {
        return { text: texts.collection, class: isDark ? 'bg-indigo-900/40 text-indigo-200' : 'bg-indigo-100 text-gray-900' }
      }
      if (record.isDelivery) {
        return { text: texts.delivery, class: isDark ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-gray-900' }
      }
      return { text: texts.file, class: isDark ? 'bg-sky-900/40 text-sky-200' : 'bg-sky-100 text-gray-900' }
    default:
      return { text: texts.file, class: isDark ? 'bg-sky-900/40 text-sky-200' : 'bg-sky-100 text-gray-900' }
  }
}
