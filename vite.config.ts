import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
export default defineConfig({
  plugins: [vue(), vueJsx()],
  server: {
    host: '0.0.0.0',
    // 允许任意 Host 访问（反代部署场景：Nginx/Caddy 反代到本 dev server 时 Host 为自定义域名，
    // 如 tfb.ylpxz.top，默认只放行 localhost/局域网 IP 会报 "Blocked request"）。
    // 开发环境可接受；如需更严格，可改为具体域名数组：['tfb.ylpxz.top', ...]
    allowedHosts: true,
    proxy: {
      // 开发代理：移动端通过局域网 IP 访问时，前端退化为同源请求，
      // 由 Vite 转发到后端，避免设备上 localhost:12345 指向自身导致 API 加载失败
      '/admin': { target: 'http://localhost:12345', changeOrigin: true },
      '/share': { target: 'http://localhost:12345', changeOrigin: true },
      '/chunk': { target: 'http://localhost:12345', changeOrigin: true },
      '/presign': { target: 'http://localhost:12345', changeOrigin: true },
      '/collection': { target: 'http://localhost:12345', changeOrigin: true },
      '/delivery': { target: 'http://localhost:12345', changeOrigin: true },
      '/room': { target: 'http://localhost:12345', changeOrigin: true },
      '/ws': { target: 'http://localhost:12345', changeOrigin: true, ws: true },
      // 根路径：仅 POST /（公共配置接口）转发到后端；GET /（SPA 页面）交还 Vite 处理
      '^/$': {
        target: 'http://localhost:12345',
        changeOrigin: true,
        bypass: (req) => (req.method === 'POST' ? undefined : '/')
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer]
    }
  }
})
