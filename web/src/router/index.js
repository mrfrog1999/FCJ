import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    children: [
      { path: 'home', name: 'home', component: () => import('../views/Home.vue'), meta: { title: '首页' } },
      { path: 'detail', name: 'detail', component: () => import('../views/Detail.vue'), meta: { title: '流水' } },
      { path: 'stats', name: 'stats', component: () => import('../views/Stats.vue'), meta: { title: '统计' } },
      { path: 'stats-chart', name: 'stats-chart', component: () => import('../views/StatsChart.vue'), meta: { title: '统计图表' } },
      { path: 'account-list', name: 'account-list', component: () => import('../views/Accounts.vue'), meta: { title: '账户' } },
      { path: 'profile', name: 'profile', component: () => import('../views/Profile.vue'), meta: { title: '我的' } }
    ]
  },
  { path: '/add', name: 'add', component: () => import('../views/AddRecord.vue') },
  { path: '/categories', name: 'categories', component: () => import('../views/CategoryManage.vue') },
  { path: '/books', name: 'books', component: () => import('../views/BookManage.vue') },
  { path: '/accounts', name: 'accounts', component: () => import('../views/AccountManage.vue') },
  { path: '/backup', name: 'backup', component: () => import('../views/Backup.vue') },
  { path: '/account-detail', name: 'account-detail', component: () => import('../views/AccountDetail.vue') },
  { path: '/account-edit', name: 'account-edit', component: () => import('../views/AccountEdit.vue') },
  { path: '/account-detail-edit', name: 'account-detail-edit', component: () => import('../views/AccountDetailEdit.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('ssj_token')
  if (to.path !== '/login' && !token) return next('/login')
  if (to.path === '/login' && token) return next('/')
  next()
})

export default router
