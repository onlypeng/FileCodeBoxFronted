/**
 * 粘贴事件的两个纯函数：从 DataTransfer 里挑出文件、把文本插到光标选区。
 *
 * ## 为什么拆成纯函数
 * 插入逻辑不碰 DOM、不读 textarea 的 selectionStart，只做字符串拼接并返回新光标位置，
 * 由调用方决定怎么写回；这样不必为了测试去构造真实输入框。
 * 粘贴只取第一个 kind=file 的条目：一次粘贴多个文件的场景交给 FileUploadArea 统一处理。
 *
 * ## 刻意不做
 * 不校验文件类型/大小、不触发上传，也不在这里弹提示——这些都属于调用方职责。
 */
export const getClipboardFile = (items: DataTransferItemList): File | null => {
  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    if (item.kind !== 'file') {
      continue
    }

    const file = item.getAsFile()
    if (file) {
      return file
    }
  }
  return null
}

export type TextInsertionInput = {
  text: string
  insertText: string
  selectionStart: number
  selectionEnd: number
}

export type TextInsertionResult = {
  value: string
  cursor: number
}

export const insertTextAtSelection = ({
  text,
  insertText,
  selectionStart,
  selectionEnd
}: TextInsertionInput): TextInsertionResult => {
  const beforeSelection = text.substring(0, selectionStart)
  const afterSelection = text.substring(selectionEnd)
  return {
    value: beforeSelection + insertText + afterSelection,
    cursor: selectionStart + insertText.length
  }
}
