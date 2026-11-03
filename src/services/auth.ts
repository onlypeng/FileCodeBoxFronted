/**
 * 管理员鉴权接口。
 *
 * ## 注意
 * 这三个方法**都不写 localStorage**——token 的存取由调用方（useAdminLogin /
 * auth-store）负责。刻意让 service 保持无状态：清 token 的时机涉及 UI 决策
 * （要不要弹登录框、要不要跳路由），放在这里会把它绑死。
 *
 * ## 边界
 * `verifyToken` 返回 **HTTP 200 + `valid: false`** 而不是 401：
 * 后端认为"拿着无效 token 来问"是一次正常的业务查询，不是鉴权失败，
 * 因此 client.ts 的 401 拦截器**不会**触发，需要调用方自己判 `valid`。
 */
import api from './client'
import type { ApiResponse } from '@/types'
import type { AdminLoginResponse, AdminVerifyResponse } from '@/types/auth'

export class AuthService {
  static async login(password: string): Promise<ApiResponse<AdminLoginResponse>> {
    return api.post('/admin/login', { password })
  }

  static async logout(): Promise<ApiResponse> {
    return api.post('/admin/logout')
  }

  static async verifyToken(): Promise<ApiResponse<AdminVerifyResponse>> {
    return api.get('/admin/verify')
  }
}
