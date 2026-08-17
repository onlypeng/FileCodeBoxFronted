/**
 * 主题注册表
 *
 * 设计说明：
 * - 每套主题通过一组 CSS 自定义属性（CSS Variables）驱动界面样式，
 *   核心色板映射到 Tailwind 的 `indigo` 系（全站主色），背景/字体/圆角等
 *   通过 `--app-*` 系列变量应用，从而实现不改动组件即全局换肤。
 * - `data-theme` 属性挂在 <html> 上；深色系主题额外追加 `dark` 类，
 *   以兼容现有基于 Tailwind `dark:` 变体的组件。
 * - 优先级：用户本地选择 > 后台站点默认（spaTheme）> 系统偏好 > 浅色。
 */

export const THEME_IDS = {
  LIGHT: 'light',
  DARK: 'dark',
  ENTERPRISE: 'enterprise'
} as const

export type ThemeId = (typeof THEME_IDS)[keyof typeof THEME_IDS]

export type ThemeMode = 'light' | 'dark'

/** 每套主题的布局间距规范（文档化，后台主题管理页展示） */
export interface ThemeSpacingSpec {
  /** 间距密度：舒适 / 紧凑 */
  density: 'comfortable' | 'compact'
  /** 页面内边距 */
  pagePadding: string
  /** 卡片间距 */
  cardGap: string
  /** 区块内边距 */
  blockPadding: string
  /** 组件间距 */
  controlGap: string
}

/** 每套主题的组件样式规范（文档化，后台主题管理页展示） */
export interface ThemeComponentSpec {
  /** 按钮风格 */
  button: string
  /** 卡片风格 */
  card: string
  /** 输入框风格 */
  input: string
}

export interface ThemeDefinition {
  /** 主题唯一标识 */
  id: ThemeId
  /** 显示名称 */
  name: string
  /** 深色/浅色模式 */
  mode: ThemeMode
  /** 简要说明 */
  description: string
  /** 主色（Hex，用于后台卡片预览展示） */
  primaryColor: string
  /** 辅助色 */
  accentColor: string
  /** 中性色（背景色） */
  neutralColor: string
  /** 字体栈 */
  fontFamily: string
  /** 布局间距规范 */
  spacing: ThemeSpacingSpec
  /** 组件样式规范 */
  components: ThemeComponentSpec
}

/** 与后端 DEFAULT_CONFIG.themesChoices 中的 key 前缀约定保持一致 */
export const SPA_THEME_PREFIX = 'spa-theme'

export const THEMES: ThemeDefinition[] = [
  {
    id: THEME_IDS.LIGHT,
    name: '浅色清新',
    mode: 'light',
    description: '明亮清爽的默认浅色主题，适合绝大多数使用场景。',
    primaryColor: '#4f46e5',
    accentColor: '#7c3aed',
    neutralColor: '#ffffff',
    fontFamily:
      "'DingTalk', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Helvetica Neue', Arial, sans-serif",
    spacing: {
      density: 'comfortable',
      pagePadding: '24px',
      cardGap: '16px',
      blockPadding: '20px',
      controlGap: '12px'
    },
    components: {
      button: '主色渐变胶囊按钮，圆角 12px，悬停加深',
      card: '白色卡片 + 浅灰描边 + 柔和阴影',
      input: '浅色底 + 中灰描边，聚焦主色描边'
    }
  },
  {
    id: THEME_IDS.DARK,
    name: '深色暗夜',
    mode: 'dark',
    description: '护眼的深色主题，适合夜间或低光环境使用。',
    primaryColor: '#8b93f8',
    accentColor: '#a78bfa',
    neutralColor: '#1f2937',
    fontFamily:
      "'DingTalk', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Helvetica Neue', Arial, sans-serif",
    spacing: {
      density: 'comfortable',
      pagePadding: '24px',
      cardGap: '16px',
      blockPadding: '20px',
      controlGap: '12px'
    },
    components: {
      button: '高亮主色按钮，深色底 + 亮色文字',
      card: '深灰卡片 + 深色描边',
      input: '深灰底 + 深色描边，聚焦主色描边'
    }
  },
  {
    id: THEME_IDS.ENTERPRISE,
    name: '企业蓝',
    mode: 'light',
    description: '沉稳专业的商务蓝主题，强调效率与秩序感。',
    primaryColor: '#2563eb',
    accentColor: '#0ea5e9',
    neutralColor: '#f8fafc',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Helvetica Neue', Arial, sans-serif",
    spacing: {
      density: 'compact',
      pagePadding: '20px',
      cardGap: '12px',
      blockPadding: '16px',
      controlGap: '8px'
    },
    components: {
      button: '标准矩形按钮，圆角 4px，纯色填充',
      card: '白底卡片 + 蓝灰描边 + 轻阴影',
      input: '浅灰底 + 蓝灰描边，聚焦蓝色描边'
    }
  }
]

/** 默认主题 id */
export const DEFAULT_THEME_ID: ThemeId = THEME_IDS.LIGHT

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((theme) => theme.id === value)
}

export function getThemeById(id: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

/**
 * 将任意未知主题标识解析为合法的主题 id
 * （兼容后台配置中可能出现的 "spa-theme/light" 前缀形式）
 */
export function resolveThemeId(value: unknown): ThemeId {
  if (typeof value !== 'string') {
    return DEFAULT_THEME_ID
  }
  const normalized = value.includes('/') ? value.split('/').pop() : value
  return isThemeId(normalized) ? normalized : DEFAULT_THEME_ID
}
