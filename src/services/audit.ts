/**
 * 后台审计日志查询。
 *
 * ## 取舍
 * 日志条目类型（`AuditLogItem`）定义在这里而不是 `types/`：它只服务于这一个
 * 后台列表接口，没有第二个消费方，放进 types 会让人误以为是共享模型。
 * 通过 `services/index.ts` 对外导出类型即可。
 *
 * 所有字段都是**后端原样下发**：`action` / `result` 用字符串而非枚举，
 * 因为审计动作会持续新增，收敛成联合类型会让旧数据无法反序列化。
 */
import api from './client'
import type { ApiResponse } from '@/types'

/** 审计日志条目（对应后端 GET /admin/audit 的 items） */
export interface AuditLogItem {
  id: number
  action: string
  target_type: string
  target_id: string
  result: string
  detail: string
  ip: string
  actor: string
  created_at: string | null
}

export interface AuditLogResponse {
  total: number
  page: number
  size: number
  items: AuditLogItem[]
}

export class AuditService {
  /** 后台：审计日志查询（按时间倒序） */
  static async list(params: {
    page: number
    size: number
    action?: string
    target_id?: string
    result?: string
  }): Promise<ApiResponse<AuditLogResponse>> {
    return api.get('/admin/audit', { params })
  }
}
