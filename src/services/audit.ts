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
