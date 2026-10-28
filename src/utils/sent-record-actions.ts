import type { SentFileRecord } from '@/types'
import { FileService } from '@/services'
import { copyRetrieveCode, copyRetrieveLink, copyWgetCommand } from '@/utils/clipboard'
import { buildSentRecordQrValue } from '@/utils/share-url'

type CopyNotify = (message: string, type: 'success' | 'error') => void

/**
 * 提前作废一条分享（调用方负责成功后移除本地记录）。
 *
 * 与"删除记录"不同：删除只是本地列表里看不见，分享仍然存在别人还能取；
 * 撤销是真的把服务端记录与文件删掉，别人立刻取不到。
 * 只有拿到过 ownerToken 的记录能撤销——旧版后端没下发，这种情况直接跳过。
 */
export async function revokeSentRecord(
  record: SentFileRecord,
  hooks: {
    confirm: (message: string) => Promise<boolean>
    notify: CopyNotify
    translate: (key: string) => string
  }
): Promise<boolean> {
  const t = hooks.translate
  if (!record.ownerToken) {
    hooks.notify(t('records.revokeUnavailable') || '该记录不支持撤销', 'error')
    return false
  }
  if (!record.retrieveCode) return false

  const ok = await hooks.confirm(
    t('records.revokeConfirm') || '撤销后这条分享将立即失效，任何人都无法再取件。确定撤销吗？'
  )
  if (!ok) return false

  try {
    await FileService.revoke(record.retrieveCode, record.ownerToken)
    hooks.notify(t('records.revokeSuccess') || '已撤销，该分享已失效', 'success')
    return true
  } catch {
    hooks.notify(t('records.revokeFailed') || '撤销失败，请稍后重试', 'error')
    return false
  }
}

export function createSentRecordActions(notify: CopyNotify) {
  return {
    copyLink: (record: SentFileRecord) =>
      copyRetrieveLink(record.retrieveCode, { notify }),
    copyCode: (record: SentFileRecord) =>
      copyRetrieveCode(record.retrieveCode, { notify }),
    copyWgetCommand: (record: SentFileRecord) =>
      copyWgetCommand(record.retrieveCode, record.filename, { notify }),
    getQRCodeValue: (record: SentFileRecord) => buildSentRecordQrValue(record)
  }
}
