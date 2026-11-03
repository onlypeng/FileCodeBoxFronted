/**
 * 系统设置里"文件大小"的显示值（KB/MB/GB）↔ 后端字节值转换。
 *
 * ## 为什么需要这层
 * ConfigState.uploadSize 以字节存（后端按字节算配额），但界面上让人填的是
 * KB/MB/GB。转换只在这里做一次，避免每个设置页各自乘 1024 时口径不一致。
 *
 * ## 边界与刻意不做
 * bytesToFileSizeForm 用 Math.round，仅用于把已有值回填进表单（可读性优先）；
 * 提交走 fileSizeFormToBytes 的精确乘积，不把回读的舍入误差写回去。
 * 不在这里校验上下限，也不裁剪 config 的其他字段（整体展开后再覆盖 uploadSize）。
 */
import type { ConfigState } from '@/types'

export type FileSizeUnit = 'KB' | 'MB' | 'GB'

export type FileSizeForm = {
  value: number
  unit: FileSizeUnit
}

const FILE_SIZE_UNITS: Record<FileSizeUnit, number> = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024
}

export function bytesToFileSizeForm(bytes: number): FileSizeForm {
  if (bytes >= FILE_SIZE_UNITS.GB) {
    return {
      value: Math.round(bytes / FILE_SIZE_UNITS.GB),
      unit: 'GB'
    }
  }

  if (bytes >= FILE_SIZE_UNITS.MB) {
    return {
      value: Math.round(bytes / FILE_SIZE_UNITS.MB),
      unit: 'MB'
    }
  }

  return {
    value: Math.round(bytes / FILE_SIZE_UNITS.KB),
    unit: 'KB'
  }
}

export function fileSizeFormToBytes(value: number, unit: FileSizeUnit): number {
  return value * FILE_SIZE_UNITS[unit]
}

export function buildConfigSubmitPayload(
  config: ConfigState,
  fileSize: FileSizeForm
): ConfigState {
  return {
    ...config,
    uploadSize: fileSizeFormToBytes(fileSize.value, fileSize.unit),
  }
}
