/** 管理后台登录响应（POST /admin/login） */
export interface AdminLoginResponse {
  token: string
  token_type: string
  /** 仍在使用默认管理员口令：为 true 时前端必须强制弹出改密弹窗 */
  must_change_password?: boolean
}

/** Token 有效性校验响应（GET /admin/verify） */
export interface AdminVerifyResponse {
  valid: boolean
  /** 同登录响应：仍在使用默认管理员口令 */
  must_change_password?: boolean
}
