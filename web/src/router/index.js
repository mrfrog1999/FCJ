import { createRouter, createWebHashHistory } from 'vue-router'
import { h } from 'vue'
import MainLayout from '../views/MainLayout.vue'
import { reevaluateStatusBar } from '../utils/statusBar'

// 页面切换动画已全部关闭：不再需要方向计算、导航栈、动画等待窗口等机制。

// 「记一笔」不再由路由渲染，而是作为 App 级常驻层在启动时就挂载好（见 App.vue）。
// 路由 /add 只承担「历史记录 + 触发器」职责，渲染一个零尺寸占位元素，
// 这样点击「+」时没有任何组件挂载/首次布局开销，页面立即可见。
const AddPlaceholder = { name: 'AddPlaceholder', render: () => h('div', { class: 'add-ph' }) }

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    children: [
      { path: 'home', name: 'home', component: () => import('../views/Home.vue'), meta: { title: '首页' } },
      { path: 'detail', name: 'detail', component: () => import('../views/Detail.vue'), meta: { title: '流水' } },
      { path: 'stats', name: 'stats', component: () => import('../views/StatsChart.vue'), meta: { title: '统计' } },
      { path: 'stats-hub', name: 'stats-hub', component: () => import('../views/Stats.vue'), meta: { title: '统计中心' } },
      { path: 'stats-chart', name: 'stats-chart', component: () => import('../views/StatsChart.vue'), meta: { title: '统计图表' } },
      { path: 'account-list', name: 'account-list', component: () => import('../views/Accounts.vue'), meta: { title: '账户' } },
      { path: 'profile', name: 'profile', component: () => import('../views/Profile.vue'), meta: { title: '设置' } }
    ]
  },
  { path: '/add', name: 'add', component: AddPlaceholder },
  { path: '/categories', name: 'categories', component: () => import('../views/CategoryManage.vue') },
  { path: '/books', name: 'books', component: () => import('../views/BookManage.vue') },
  { path: '/accounts', name: 'accounts', component: () => import('../views/AccountManage.vue') },
  { path: '/backup', name: 'backup', component: () => import('../views/Backup.vue') },
  // 账户详情 = 流水页按账户预筛：直接复用 Detail.vue，用 query.account 初始化账户筛选。
  // 形式/交互与流水页完全一致（结余 banner、年/月折叠、按日分组、编辑删除）。
  { path: '/account-detail', name: 'account-detail', component: () => import('../views/Detail.vue') },
  { path: '/account-edit', name: 'account-edit', component: () => import('../views/AccountEdit.vue') },
  { path: '/account-detail-edit', name: 'account-detail-edit', component: () => import('../views/AccountDetailEdit.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
  // 滚动位置改由下方 scrollMemo 手动管理：
  // hash 模式下浏览器不会为 pushState 记录滚动位置，scrollBehavior 的 savedPosition 拿不到值，
  // 返回长页面（账户/分类）还是会被拉回顶部。自己按 fullPath 记住再恢复更可靠。
})

// 每个页面离开时的滚动位置。返回时原样恢复，前进到新页面则回到顶部。
// 滚动容器是 #app（body 锁高做 flex 纵向，整页滚动移到 #app 内部），
// 所以读写都走 #app.scrollTop。
const scrollMemo = new Map()
const scroller = () => document.querySelector('#app')

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('ssj_token')
  if (to.path !== '/login' && !token) return next('/login')
  if (to.path === '/login' && token) return next('/')

  // 记录离开页的滚动位置（同一路由 query 变化也按 fullPath 分开记）
  if (from.name && from.fullPath !== to.fullPath) {
    const el = scroller()
    scrollMemo.set(from.fullPath, el ? el.scrollTop : 0)
  }

  next()
})

router.afterEach(to => {
  // 恢复目标页的滚动位置（新页面为 0）。等两帧让 keep-alive 页面重新插入、布局稳定后再滚，
  // 否则拿到的高度还是 0，scrollTo 会被浏览器截断。
  const y = scrollMemo.get(to.fullPath) || 0
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = scroller()
    if (el && Math.abs(el.scrollTop - y) > 1) el.scrollTop = y
  }))

  // iOS 主屏 PWA：点箭头返回走 SPA popstate，WebKit 不会像手势返回那样重算状态栏，
  // 会停在进子页时的灰白半透明。这里主动触发一次重读，让状态栏恢复黑底白字全透明。
  reevaluateStatusBar()
})

// 空闲时预加载所有懒加载页面 chunk，避免首次切换时因加载脚本出现白屏
export function preloadRoutes() {
  const walk = list => list.forEach(r => {
    if (typeof r.component === 'function') {
      try { Promise.resolve(r.component()).catch(() => {}) } catch (e) {}
    }
    if (r.children) walk(r.children)
  })
  walk(routes)
}

export default router
