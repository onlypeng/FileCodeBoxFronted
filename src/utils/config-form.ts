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
