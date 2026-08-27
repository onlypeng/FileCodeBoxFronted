/**
 * 移动端检测：UA 标识为主 + 触屏兜底，判断 手机/平板/电脑。
 * 判断优先级：
 *  1) userAgentData.mobile：true → 移动；false 不提前返回（部分 WebView/鸿蒙 UA-CH 标签异常为 false，
 *     若因此返回 false 会漏判手机显示"传屏幕"）→ 继续后续 UA/触屏判断
 *  2) UA 关键字（iPhone/Android+Mobile/鸿蒙/HarmonyOS/EMUI/HuaweiBrowser 等；iPad/Android 平板）
 *  3) 触屏兜底：粗指针(pointer:coarse) 或 多点触控(maxTouchPoints>0) → 手持设备必为触屏，
 *     确保 UA 不完整的手机/平板不漏判为桌面。
 * 用途：隐藏移动端不可用的"传屏幕"、音频来源收敛等移动端差异逻辑。
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  // 1) userAgentData：正向信号（true=移动），false 不提前返回（继续 UA/触屏判断）
  try {
    const uad = (navigator as unknown as { userAgentData?: { mobile?: boolean; platform?: string } }).userAgentData
    if (uad && typeof uad.mobile === 'boolean') {
      if (uad.mobile) return true
      if (uad.platform && /iPad|iOS|Android/i.test(uad.platform)) return true
      // mobile=false 且 platform 非移动：不返回，继续走 UA/触屏兜底
    }
  } catch {
    /* fallthrough */
  }
  // 2) UA 关键字（先平板再手机）
  const ua = navigator.userAgent || ''
  if (isTabletDevice()) return true
  if (/(iPhone|iPod|Android.*Mobile|HarmonyOS|鸿蒙|Mobile|Opera Mini|IEMobile|WPDesktop|PlayStation Vita|HuaweiBrowser|ArkWeb|EMUI)/i.test(ua)) {
    return true
  }
  // 3) 触屏兜底：粗指针 或 多点触控 → 手持设备必为触屏（触屏笔记本误判代价小：仅隐藏传屏幕/音频收敛）
  try {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    const touch = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0
    if (coarse || touch) return true
  } catch {
    /* ignore */
  }
  return false
}

/** 平板检测（iPad / Android Tablet…）：UA 标识判断，供移动端差异逻辑细分 */
export function isTabletDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad/i.test(ua)) return true
  // Android 平板：Android 但无 Mobile 标记（表尺寸）
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return true
  // 触屏本（如 Surface）不算平板 UA
  return false
}

/**
 * 资源受限/轻量浏览器检测（VIA、Opera Mini、部分极速 WebView、UC Mini 等）。
 * 这类浏览器内存小、编码/解码能力弱：同时打开多路高清摄像头流 + WebRTC 编码极易崩溃闪退。
 * 识别后摄像头采集应降级：低分辨率(≤720p)、限制同时路数(≤2)、跳过主摄探测等。
 */
export function isLowEndBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (
    /Via|via browser|Opera Mini|IEMobile|UCBrowser.*Mini|Quark|夸克|极速|Lite|MiniBrowser/i.test(ua)
  ) {
    return true
  }
  // 轻量 WebView 常无 chrome 版本特征（纯 WebView 内核），且内存不可读时，用粗指针+低噪兜底：
  // 不再额外兜底，避免误伤正常浏览器。以上 UA 命中即判为低端。
  return false
}
