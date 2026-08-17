import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES, ROUTES } from '@/constants'
import { readStoredToken, clearStoredToken } from '@/utils/auth-storage'
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

// 已验证的 Token 短时缓存，避免每次导航都请求 /admin/verify
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
      return true
    }
    return false
  } catch {
    return false
  }
}

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
