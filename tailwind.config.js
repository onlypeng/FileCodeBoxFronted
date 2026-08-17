import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  // 使用 class 模式：dark: 变体跟随应用内主题切换（html.dark），而非操作系统偏好
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 全站主色板映射到主题 CSS 变量：切换 data-theme 即可全局换肤。
        // 使用 RGB 通道 + <alpha-value> 占位符，保证 /40 等透明度修饰类可用。
        indigo: {
          50: 'rgb(var(--indigo-50) / <alpha-value>)',
          100: 'rgb(var(--indigo-100) / <alpha-value>)',
          200: 'rgb(var(--indigo-200) / <alpha-value>)',
          300: 'rgb(var(--indigo-300) / <alpha-value>)',
          400: 'rgb(var(--indigo-400) / <alpha-value>)',
          500: 'rgb(var(--indigo-500) / <alpha-value>)',
          600: 'rgb(var(--indigo-600) / <alpha-value>)',
          700: 'rgb(var(--indigo-700) / <alpha-value>)',
          800: 'rgb(var(--indigo-800) / <alpha-value>)',
          900: 'rgb(var(--indigo-900) / <alpha-value>)',
          950: 'rgb(var(--indigo-950) / <alpha-value>)'
        }
      },
      borderRadius: {
        // 圆角映射到主题 CSS 变量：不同主题可呈现圆润/直角等不同组件风格
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      }
    },
  },
  plugins: [
    typography,
  ],
}
