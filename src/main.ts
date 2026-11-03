/**
 * 应用入口：组装 Vue 插件链并挂载根组件。
 *
 * ## 顺序为什么重要
 * - 首行引 main.css：暗色主题依赖 CSS 变量切换，必须早于任何组件样式求值，
 *   否则首屏会闪一下浅色底。
 * - pinia 先于 router 安装：router/index.ts 的 beforeEach 守卫内会调用
 *   useAdminStore() 同步"仍在使用默认口令"标记，pinia 未安装时该调用拿不到实例。
 * - i18n 放在最后：插件本身与上面两者无依赖，但固定顺序可以让
 *   "运行时环境先就绪、再装载视图"这条约束在读代码时一目了然。
 *
 * ## 刻意不做
 * - 不注册全局错误处理器、全局组件或第三方 UI 库：本项目体量小，显式 import
 *   比全局注册更容易追踪依赖，也避免打进无谓的产物体积。
 * - 不在此处预拉取公共配置或做环境探测—— ARCHITECTURE.md 要求
 *   composable 不在初始化阶段自动发请求，配置加载时机由具体页面显式决定。
 */
import './assets/style/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
