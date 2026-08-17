/**
 * 移动端检测：UA 关键字 + userAgentData（供屏幕共享音频来源等移动端差异逻辑使用）。
 * 系统声音拾取（getDisplayMedia audio）在安卓 / iOS / 鸿蒙上均不支持，
 * 移动端屏幕共享只能使用麦克风作为音频来源，UI 与采集逻辑据此收敛选项。
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/(Android|iPhone|iPad|iPod|HarmonyOS|鸿蒙|Mobile|Opera Mini|IEMobile|WPDesktop)/i.test(ua)) {
    return true
  }
  const uad = (navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData
  return !!(uad && typeof uad.mobile === 'boolean' ? uad.mobile : false)
}
