/**
 * 仪表盘统计接口（纯读）。
 *
 * 刻意只有这一个方法：仪表盘聚合了文件/收件箱/房间三套统计，后端一次给全，
 * 拆成多个接口反而会导致卡片之间的数据不是同一时刻快照。
 */
import api from './client'
import type { ApiResponse, DashboardData } from '@/types'

export class StatsService {
  static async getDashboard(): Promise<ApiResponse<DashboardData>> {
    return api.get('/admin/dashboard')
  }
}
