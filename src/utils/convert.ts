/**
 * 存储容量的粗粒度换算（字节 → KB/MB/GB，取整）。
 *
 * ## 为什么不复用 common.ts 的 formatFileSize
 * 后者带两位小数、且数值过小时会自动降级单位，适合文件列表显示精确大小；
 * 这里是后台统计的容量概览，整数更醒目也不需要小数精度。两处刻意保留不同口径，
 * 不要合并成一个"通用"函数。
 *
 * ## 刻意不做
 * 不做小数、不做 TB 以上单位（当前配额量级到不了），也不返回原始数值。
 */
// 存储单位转换
export const getStorageUnit = (value: number) => {
  if (value >= 1024 * 1024 * 1024) {
    return Math.round(value / (1024 * 1024 * 1024)) + 'GB'
  } else if (value >= 1024 * 1024) {
    return Math.round(value / (1024 * 1024)) + 'MB'
  } else {
    return Math.round(value / 1024) + 'KB'
  }
}
