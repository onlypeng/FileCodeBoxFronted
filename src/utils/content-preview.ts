import { marked } from 'marked'
import DOMPurify from 'dompurify'

const MARKDOWN_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'a',
  'img'
]

const MARKDOWN_ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class']

/**
 * 对简单 HTML（聊天消息等）进行白名单消毒
 * 仅允许 a/span 标签与必要的链接属性，统一收敛 XSS 防御
 */
export function sanitizeSimpleHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:)/i
  })
}

export async function renderMarkdownPreview(content: string): Promise<string> {
  try {
    const rawHtml = await marked(content)
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: MARKDOWN_ALLOWED_TAGS,
      ALLOWED_ATTR: MARKDOWN_ALLOWED_ATTR,
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
    })
  } catch (error) {
    console.error('Markdown 渲染失败:', error)
    return content
  }
}
