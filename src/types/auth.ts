/** 管理后台登录响应（POST /admin/login） */
export interface AdminLoginResponse {
  token: string
  token_type: string
}

/** Token 有效性校验响应（GET /admin/verify） */
export interface AdminVerifyResponse {
  valid: boolean
}
