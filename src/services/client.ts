/**
 * 全站唯一的 HTTP 出口。
 *
 * ## 问题
 * 后端接口统一包一层 `{ code, message, detail }`，且几乎所有业务都还要带管理员
 * Authorization 头。若每个 service 各自 new 一个 axios，鉴权与 401 处理就会
 * 复制十几份，且"后端返回 200 但业务码非 200"这类半成功响应无法统一判定。
 *
 * ## 方案
 * 对外只暴露**两个**实例，区别是响应拦截器怎么裁：
 * - `apiClient`（默认导出）：响应拦截器直接 `return response.data`，
 *   调用方拿到的就是解包后的 `ApiResponse<T>`。绝大多数 service 用这个。
 * - `rawApiClient`：原样返回整个 AxiosResponse。只给"要拿响应头/原始 Blob"
 *   的场景用（目前只有下载文件需要区分 HTTP 错误与业务体）。
 *
 * ## 刻意不做
 * - **不在拦截器里统一 throw 业务错误**。业务码非 200 是调用方要判断的事，
 *   拦截器吃掉它会让"我需要拿到 detail 里的部分数据"这类需求无法实现。
 *   因此这里只处理 HTTP 层的 401。
 * - 401 只做**清 token + 抛事件**，不主动跳转路由：本项目允许匿名访问大部分页面，
 *   跳登录是 App 外壳收到事件后的决定，service 层不该知道路由。
 * - 不重试、不加全局 loading：重试语义由上传类 Composable 自己决定，
 *   全局 loading 会与并发请求互相打架。
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_STATUS_CODES, TIME_CONSTANTS } from '@/constants'
import type { ApiErrorPayload } from '@/types'
import { clearStoredToken, readStoredToken } from '@/utils/auth-storage'

/**
 * 鉴权失效广播事件名。
 *
 * 用自定义事件而非直接 import router：client 处在依赖链底层，
 * 引入路由会造成循环依赖（路由守卫又要 import store，store 又要 import service）。
 */
export const AUTH_EVENTS = {
  UNAUTHORIZED: 'filecodebox:auth:unauthorized'
} as const

const rawBaseURL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_API_BASE_URL_PROD
    : import.meta.env.VITE_API_BASE_URL_DEV

// 开发环境：当页面通过局域网 IP（移动端真机调试等）访问时，VITE_API_BASE_URL_DEV 的
// http://localhost:12345 指向设备自身，API 会加载失败（表现为配置回退、过期单位只剩"天"等）。
// 此时退化为同源相对路径，由 Vite dev server 代理到后端（见 vite.config.ts proxy）。
/**
 * 决定实际使用的后端地址，并作为唯一的解析结果导出（`apiBaseURL`）。
 *
 * 副作用：无（纯函数，只读 `window.location`）。
 *
 * @returns 后端地址；**空串表示走同源相对路径**，由部署层的反向代理转发。
 *          调用方不应把空串当成"没有配 baseURL"而自行兜底成 `/`，
 *          axios 对空 baseURL 的处理已经是相对路径。
 */
function resolveApiBaseURL(): string {
  const configured = typeof rawBaseURL === 'string' ? rawBaseURL.replace(/\/+$/, '') : ''
  if (import.meta.env.MODE === 'production' || !configured) {
    return configured
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  return isLocalHost ? configured : ''
}

/**
 * 实际生效的后端地址，同时也是拼接**下载直链**的基准。
 *
 * 注意它可能是空串（局域网调试或同源部署），因此用它拼 URL 时不能用
 * `` `${apiBaseURL}/x` `` 之外的任何拼接方式再补斜杠。
 */
export const apiBaseURL = resolveApiBaseURL()

/**
 * 基础配置，两个实例共用同一份。
 *
 * `timeout` 只是**普通接口**的默认超时（见 TIME_CONSTANTS.REQUEST_TIMEOUT）。
 * 上传类请求在 `multipartUploadConfig` 里被显式改成 0（不超时）——大文件在弱网下
 * 传半小时很正常，继承这里的超时会让人传到一半失败。
 */
const clientOptions = {
  baseURL: apiBaseURL,
  timeout: TIME_CONSTANTS.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
}

const apiClient = axios.create(clientOptions)

/**
 * 未经 `response.data` 裁剪的实例：拿到的是完整 `AxiosResponse`。
 *
 * 只为两类需求保留：读取响应头（如 Content-Disposition 里的文件名）与
 * `responseType: 'blob'` 的下载。**不要为了绕过类型转换而使用它**——
 * 那样会让错误分支回到 axios 原生形状，与其余 service 的错误处理不一致。
 */
export const rawApiClient = axios.create(clientOptions)

/**
 * 每次请求前从 localStorage 读 token 并挂到 Authorization。
 *
 * 刻意**每次重读**而不是构造时缓存一次：多标签页共享同一个 localStorage key，
 * 另一个标签页登出后本页若用缓存值会带着失效 token 继续请求。
 * token 不存在时不设 header（而不是设空串）：匿名接口对空 Authorization 的处理
 * 在不同后端版本上不一致。
 */
const attachAuthToken = (config: InternalAxiosRequestConfig) => {
  const token = readStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

/**
 * 响应错误拦截器：只负责 401 的收尾，其余错误原样抛给调用方。
 *
 * 边界：仅当**HTTP 状态码**为 401 时触发。后端"业务码非 200 但 HTTP 200"
 * 的情况不在这里处理（那是业务失败，不是鉴权失效）。
 *
 * 副作用：清 localStorage 里的 token，并向 window 派发 `AUTH_EVENTS.UNAUTHORIZED`。
 * 返回值恒为 rejected Promise——这里不会有任何错误被静默吞掉。
 */
const handleAuthError = (error: AxiosError<ApiErrorPayload>) => {
  if (error.response?.status === API_STATUS_CODES.UNAUTHORIZED) {
    clearStoredToken()
    window.dispatchEvent(new CustomEvent(AUTH_EVENTS.UNAUTHORIZED))
  }
  return Promise.reject(error)
}

apiClient.interceptors.request.use(
  attachAuthToken,
  (error) => Promise.reject(error)
)

rawApiClient.interceptors.request.use(
  attachAuthToken,
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  // 解包：调用方直接拿 ApiResponse<T>，无需每次写 `.data`
  (response) => response.data,
  handleAuthError
)

// 不对称是有意为之：rawApiClient 必须保留 status / headers / config
rawApiClient.interceptors.response.use((response) => response, handleAuthError)

export default apiClient
