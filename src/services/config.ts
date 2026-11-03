/**
 * 系统配置读写接口。
 *
 * ## 注意 `getConfig` 与 `getUserConfig` 不是同一个东西
 * - `getConfig`（GET /admin/config/get）：**全量**配置，含密钥类字段，需管理员鉴权
 * - `getUserConfig`（POST /）：**公开**配置，任何访客都能拿
 * 两者返回类型都写成了 `ConfigState`，但后者实际只填了公开字段——
 * 类型层面上这是个已知的谎言，代价是省掉一份几乎一样的 `SystemConfig` 请求类型。
 * 用 `getUserConfig` 时不要去读那些本就不该下发的敏感字段，它们会是空串。
 *
 * ## 边界
 * `updateConfig` 是 PATCH 语义：只传变更字段，缺省即保持不变，因此参数用 `Partial`。
 */
import api from './client'
import type { ApiResponse, ConfigState } from '@/types'

export class ConfigService {
  static async getConfig(): Promise<ApiResponse<ConfigState>> {
    return api.get('/admin/config/get')
  }

  static async getUserConfig(): Promise<ApiResponse<ConfigState>> {
    return api.post('/')
  }

  static async updateConfig(config: Partial<ConfigState>): Promise<ApiResponse> {
    return api.patch('/admin/config/update', config)
  }
}
