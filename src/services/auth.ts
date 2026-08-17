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
