import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES, ROUTES } from '@/constants'
import { readStoredToken } from '@/utils/auth-storage'

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
    redirect: '/?tab=send'
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
    path: ROUTES.DELIVERY_ENTER,
    redirect: '/'
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

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !readStoredToken()) {
    return {
      path: ROUTES.LOGIN,
      query: {
        redirect: to.fullPath
      }
    }
  }
})

export default router
