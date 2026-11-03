/**
 * 管理后台鉴权相关类型。
 *
 * ## 注意
 * `must_change_password` 是**安全相关**字段：为 true 说明管理员还在用初始口令，
 * 前端必须在进入后台前强制改密。它同时出现在登录和校验两个响应里，
 * 是因为 token 可能在别的标签页被续期，只靠登录那一次判断会漏。
 */

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
