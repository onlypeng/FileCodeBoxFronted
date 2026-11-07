/**
 * 判定「取件被 403 拒绝」是否因为需要提取口令（二次口令）。
 *
 * 后端 detail 目前是中文字符串，但文案会变、也可能换成英文或结构化对象；
 * 因此这里同时兼容三种形态，避免把「403 + 别的错误」误判成口令弹窗，
 * 也避免换了文案后整个二次口令功能静默失效。
 */
export function isAccessCodeRequiredError(err: unknown): boolean {
  const response = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response
  if (response?.status !== 403) return false
  const detail = response.data?.detail
  if (detail && typeof detail === 'object') {
    const code = (detail as { code?: unknown }).code
    if (code === 'ACCESS_CODE_REQUIRED' || code === 'ACCESS_CODE_INVALID') return true
  }
  const text = typeof detail === 'string' ? detail : ''
  return /提取口令|二次口令|access[ _-]?code|passcode/i.test(text)
}
