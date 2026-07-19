import type { CollectionRecord, ReceivedFileRecord, SentFileRecord } from '@/types/file'

export type UnifiedKind = 'received' | 'sent' | 'collection'

export interface UnifiedRecordItem {
  kind: UnifiedKind
  id: number
  data: ReceivedFileRecord | SentFileRecord | CollectionRecord
  icon: { icon: unknown; color: string }
  badge: { text: string; class: string }
  displayName: string
  infoLine: string
}
