/**
 * 路由表与全局导航守卫。
 *
 * ## 为什么用 hash 模式
 * createWebHashHistory 而不是 createWebHistory：本项目常被静态托管（vercel / 任意
 * 子目录 / file 服务）而不是带 rewrite 规则的服务器，history 模式下直接刷新
 * /direct/room/xxx 会落到 404。hash 模式把路径放在 # 后，服务端永远只见 index.html。
 *
 * ## meta 字段的语义
 * requiresAuth：需要管理员登录。只在 /admin 子树上标记，判断依据见 beforeEach。
 * showGlobalControls：是否在页面顶部渲染语言/主题切换。管理后台自带主题入口，
 *   所以关掉，避免出现两个主题控件。注意守卫不靠这个字段做权限判断。
 * showRouteLoading：是否显示全局转场 loading。所有页面都开，保持一致的手感。
 * title：i18n key 而非最终文案，由 AppShell/标题组件翻译。
 *
 * ## 刻意不做
 * - 不做细粒度角色/权限分级：后端目前只有单一管理员 Token，
 *   requiresAuth 是二值的，不预留 roles 字段以免过度设计。
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES, ROUTES } from '@/constants'
import { readStoredToken, clearStoredToken } from '@/utils/auth-storage'
import { useAdminStore } from '@/stores/adminStore'
import { AuthService } from '@/services'

const publicPageMeta = {
  showGlobalControls: true,
  showRouteLoading: true
}

const adminPageMeta = {
  requiresAuth: true,
  showGlobalControls: false,
  showRouteLoading: true
}

// requiresAuth 标在父级 /admin 上，子路由这里再展开一份 adminPageMeta。
// 原因：守卫读的是 to.meta（已合并的 meta），纯依赖继承虽然也能生效，
// 但一旦有人新增子路由而忘了思考这条链，就会静默地把管理页变成公开访问。
// 显式展开让"这是需要鉴权的页面"在每个子路由上都肉眼可见。
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: ROUTE_NAMES.HOME,
    component: () => import('@/views/HomeView.vue'),
    meta: {
      ...publicPageMeta,
      title: 'home'
    }
  },
  {
    path: ROUTES.SEND,
    name: ROUTE_NAMES.SEND,
    component: () => import('@/views/SendFileView.vue'),
    meta: {
      ...publicPageMeta,
      title: 'send'
    }
  },
  {
    path: ROUTES.COLLECTION_CREATE,
    name: ROUTE_NAMES.COLLECTION_CREATE,
    component: () => import('@/views/collection/CollectionCreateView.vue'),
    meta: {
      ...publicPageMeta,
      title: 'collection_create'
    }
  },
  {
    path: ROUTES.COLLECTION_MANAGE + '/:code',
    name: ROUTE_NAMES.COLLECTION_DETAIL,
    component: () => import('@/views/collection/CollectionDetailView.vue'),
    props: true,
    meta: {
      ...publicPageMeta,
      title: 'collection_detail'
    }
  },
  {
    path: ROUTES.COLLECTION_RETRIEVE + '/:code',
    redirect: (to) => `/?retrieve=${to.params.code}`
  },
  {
    path: ROUTES.DELIVERY_UPLOAD + '/:code',
    name: ROUTE_NAMES.DELIVERY_UPLOAD,
    component: () => import('@/views/delivery/UploadView.vue'),
    props: true,
    meta: {
      ...publicPageMeta,
      title: 'delivery_upload'
    }
  },
  {
    path: ROUTES.DIRECT,
    name: ROUTE_NAMES.DIRECT_HOME,
    component: () => import('@/views/DirectHomeView.vue'),
    meta: {
      ...publicPageMeta,
      title: 'direct_home'
    }
  },
  {
    path: ROUTES.DIRECT_ROOM + '/:code',
    name: ROUTE_NAMES.DIRECT_ROOM,
    component: () => import('@/views/DirectRoomView.vue'),
    props: true,
    meta: {
      ...publicPageMeta,
      title: 'direct_room'
    }
  },
// 历史 links 兼容区：以下三条重定向不是"顺手加的"，而是已经通过聊天窗口、
// 二维码发出去的旧链接格式。删除任意一条都会让存量链接 404，
// 而 URL 一旦发出去就无法召回，所以这类重定向只能长期保留、不能清理。
  // 兼容旧版房间分享链接（早期 chat/transfer/direct 前缀，统一重定向到 /direct/room/:code）
  {
    path: '/direct/chat/:code',
    redirect: (to) => `/direct/room/${to.params.code}`
  },
  {
    path: '/direct/transfer/:code',
    redirect: (to) => `/direct/room/${to.params.code}`
  },
  {
    path: '/direct/:code',
    redirect: (to) => `/direct/room/${to.params.code}`
  },
  {
    path: ROUTES.ADMIN,
    name: ROUTE_NAMES.ADMIN,
    component: () => import('@/layout/AdminLayout/AdminLayout.vue'),
    redirect: ROUTES.DASHBOARD,
    meta: adminPageMeta,
    children: [
      {
        path: 'dashboard',
        name: ROUTE_NAMES.DASHBOARD,
        component: () => import('@/views/manage/DashboardView.vue'),
        meta: {
          ...adminPageMeta,
          title: 'dashboard'
        }
      },
      {
        path: 'settings',
        name: ROUTE_NAMES.SETTINGS,
        component: () => import('@/views/manage/SystemSettingsView.vue'),
        meta: {
          ...adminPageMeta,
          title: 'settings'
        }
      },
      {
        path: 'unified',
        name: ROUTE_NAMES.UNIFIED_MANAGE,
        component: () => import('@/views/manage/UnifiedManageView.vue'),
        meta: {
          ...adminPageMeta,
          title: 'unified_manage'
        }
      }
    ]
  },
  {
    path: ROUTES.LOGIN,
    name: ROUTE_NAMES.LOGIN,
    component: () => import('@/views/manage/LoginView.vue'),
    meta: {
      showGlobalControls: true,
      showRouteLoading: true,
      title: 'login'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: ROUTES.HOME
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

// 已验证的 Token 短时缓存：同一个 Token 在 TTL 内不再重复请求 /admin/verify。
// 60s 是"用户能察觉的卡顿"与"Token 被吊销后仍被放行的时间窗"之间的折中；
// TTL 到期后会重新走一次真实校验，所以吊销最多延迟 60s 生效。
// 刻意不做滑动续期：续期会让"最后一次真实校验时间"变得不可预测，出问题更难排查。
let verifiedToken = ''
let verifiedAt = 0
const VERIFY_TTL = 60_000

/** 校验本地 Token 是否有效：先判空，再向后端 /admin/verify 校验签名与有效期 */
async function isTokenValid(): Promise<boolean> {
  const token = readStoredToken()
  if (!token) return false
  if (verifiedToken === token && Date.now() - verifiedAt < VERIFY_TTL) return true
  try {
    const res = await AuthService.verifyToken()
    if (res.code === 200) {
      verifiedToken = token
      verifiedAt = Date.now()
      // 同步"仍在使用默认口令"标记：刷新页面后也要继续强制改密
      const adminStore = useAdminStore()
      adminStore.setMustChangePassword(!!res.detail?.must_change_password)
      return true
    }
    return false
  } catch {
    return false
  }
}

// 唯一的权限判断依据：目标路由 meta.requiresAuth + 本地 Token 是否通过后端校验。
// 这里**不**解析 Token payload 判断权限/过期——签名密钥在服务端，前端解析不了，
// 硬解 base64 只能得到"看起来有效"的假象，所以每次都问服务端。
// 另外：verify 的网络异常按"无效"处理（catch 返回 false），宁可让用户重新登录，
// 也不放行到需要鉴权的页面。
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const valid = await isTokenValid()
    if (!valid) {
      clearStoredToken()
      return {
        path: ROUTES.LOGIN,
        query: {
          redirect: to.fullPath
        }
      }
    }
  }
})

export default router
