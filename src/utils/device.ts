/**
 * 移动端检测：结合【触屏能力】+ UA 关键字 + userAgentData + 平台架构，避免纯 UA 误判/漏判。
 * 优先级：
 *  - userAgentData.mobile（权威标签）
 *  - UA 关键字（安卓/iOS/鸿蒙/华为浏览器/EMUI 等）
 *  - ARM 架构（手机/平板几乎全是 ARM）
 *  - 触屏能力（粗指针 + 多点触控；触屏笔记本误判为移动端的代价远低于鸿蒙/安卓漏判）
 * 用途：屏幕共享音频来源、前后置摄像头选择等移动端差异逻辑（不是多摄像头支持与否的判定依据）。
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  // 1) userAgentData：浏览器提供的权威移动设备标签（Chrome/Edge 桌面 UA + 未开移动模拟时为 false）
  try {
    const uad = (navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData
    if (uad && typeof uad.mobile === 'boolean') return uad.mobile
  } catch {
    /* fallthrough */
  }
  // 2) UA 关键字（含鸿蒙/华为/EMUI 等；鸿蒙浏览器 UA 常不带 Mobile，但带系统/内核标识）
  const ua = navigator.userAgent || ''
  if (/(Android|iPhone|iPod|HarmonyOS|鸿蒙|Mobile|Opera Mini|IEMobile|WPDesktop|PlayStation Vita|HuaweiBrowser|ArkWeb|EMUI)/i.test(ua)) {
    return true
  }
  // iPad：旧版 Safari 上报 Macintosh 桌面 UA，但仍是触屏平板（移动端行为）
  if (/iPad|Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1) {
    return true
  }
  // 3) ARM 架构：手机/平板几乎全为 ARM；桌面 x86/AMD64 不在此列。
  //    鸿蒙/安卓浏览器 UA 可能完全中性（无 Android/Mobile），此信号能覆盖这类漏判。
  try {
    const platform = (navigator as { platform?: string }).platform || ''
    if (/arm|aarch64|armv/i.test(platform) && !/win|macintosh|linux x86/i.test(platform)) {
      return true
    }
  } catch {
    /* ignore */
  }
  // 4) 触屏能力兜底：粗指针触屏 + 支持多点触控。
  //    不限制屏幕尺寸/DPR：触屏笔记本误判为移动端的代价（前后置模式+音频收敛）远小于鸿蒙漏判
  try {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    if (coarse && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) {
      return true
    }
  } catch {
    /* ignore */
  }
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
