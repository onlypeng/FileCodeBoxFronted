import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_STATUS_CODES, TIME_CONSTANTS } from '@/constants'
import type { ApiErrorPayload } from '@/types'
import { clearStoredToken, readStoredToken } from '@/utils/auth-storage'

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
function resolveApiBaseURL(): string {
  const configured = typeof rawBaseURL === 'string' ? rawBaseURL.replace(/\/+$/, '') : ''
  if (import.meta.env.MODE === 'production' || !configured) {
    return configured
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  return isLocalHost ? configured : ''
}

export const apiBaseURL = resolveApiBaseURL()

const clientOptions = {
  baseURL: apiBaseURL,
  timeout: TIME_CONSTANTS.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
}

const apiClient = axios.create(clientOptions)
export const rawApiClient = axios.create(clientOptions)

const attachAuthToken = (config: InternalAxiosRequestConfig) => {
  const token = readStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

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
  (response) => response.data,
  handleAuthError
)

rawApiClient.interceptors.response.use((response) => response, handleAuthError)

export default apiClient
