<template>
  <!-- 和账户页一样：整页自然滚动，不再固定视口高度、不再内部 flex 撑满。
       下拉刷新容器只包住内容、给一个最小高度即可，页面高度由内容决定。 -->
  <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="home-pull" pulling-text="下拉同步数据" loosing-text="释放立即同步" loading-text="正在同步..." success-text="同步完成">
  <div class="page home-page">
    <!-- 顶部纯色橙红 banner + 本月支出 -->
    <div class="hero">
      <!-- 顶部导航标题：居中显示 App 名称，落在橙色 banner 上方的白色导航区 -->
      <div class="home-nav-title">发财记</div>
      <div class="hero-content">
        <div class="hero-label">{{ monthNum }}月 · 支出</div>
        <div class="hero-amount-row">
          <div class="hero-amount">{{ money(monthStats.expense) }}</div>
          <van-icon :name="hidden ? 'closed-eye' : 'eye-o'" class="eye" @click="hidden = !hidden" />
        </div>
        <div class="hero-meta">
          <span>本月收入 <b>{{ money(monthStats.income) }}</b></span>
          <i></i>
          <span>预算 <em @click="openBudget">{{ budget > 0 ? '¥' + money(budget) : '点此设置' }}</em></span>
        </div>
      </div>
    </div>

    <!-- 统计列表 -->
    <div class="stat-list">
      <div class="stat-row" @click="goRange('day')">
        <div class="s-icon ic-today"><van-icon name="bell" /></div>
        <div class="s-main">
          <div class="s-title">今天</div>
          <div class="s-sub">最近一笔 {{ latestText }}</div>
        </div>
        <div class="s-nums">
          <div class="s-income">{{ money(todayStats.income) }}</div>
          <div class="s-expense">{{ money(todayStats.expense) }}</div>
        </div>
        <van-icon name="arrow" class="s-arrow" />
      </div>

      <div class="stat-row" @click="goRange('week')">
        <div class="s-icon ic-week"><van-icon name="calendar-o" /></div>
        <div class="s-main">
          <div class="s-title">本周</div>
          <div class="s-sub">{{ weekLabel }}</div>
        </div>
        <div class="s-nums">
          <div class="s-income">{{ money(weekStats.income) }}</div>
          <div class="s-expense">{{ money(weekStats.expense) }}</div>
        </div>
        <van-icon name="arrow" class="s-arrow" />
      </div>

      <div class="stat-row" @click="goRange('month')">
        <div class="s-icon ic-month"><van-icon name="gold-coin-o" /></div>
        <div class="s-main">
          <div class="s-title">{{ monthNum }}月</div>
          <div class="s-sub">{{ monthLabel }}</div>
        </div>
        <div class="s-nums">
          <div class="s-income">{{ money(monthStats.income) }}</div>
          <div class="s-expense">{{ money(monthStats.expense) }}</div>
        </div>
        <van-icon name="arrow" class="s-arrow" />
      </div>

      <div class="stat-row" @click="goRange('year')">
        <div class="s-icon ic-year"><van-icon name="gem-o" /></div>
        <div class="s-main">
          <div class="s-title">本年</div>
          <div class="s-sub">{{ year }}年</div>
        </div>
        <div class="s-nums">
          <div class="s-income">{{ money(yearStats.income) }}</div>
          <div class="s-expense">{{ money(yearStats.expense) }}</div>
        </div>
        <van-icon name="arrow" class="s-arrow" />
      </div>

    </div>

    <!-- 预算设置弹窗 -->
    <van-popup v-model:show="budgetShow" position="bottom" round>
      <div class="popup">
        <div class="popup-title">{{ monthNum }}月预算</div>
        <van-field v-model="budgetInput" type="number" placeholder="输入预算金额" label="¥" />
        <div class="popup-btns">
          <van-button block @click="budgetShow = false">取消</van-button>
          <van-button block type="primary" @click="saveBudget">保存</van-button>
        </div>
      </div>
    </van-popup>
  </div>
  </van-pull-refresh>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useStore } from '../store'
import { readCacheAsync, writeCacheAsync } from '../utils/cache'
import { mergePending, flushSync } from '../utils/offlineSync'
import { notify } from '../utils/notify'
import { api } from '../api'
import { afterNav } from '../utils/afterNav'

const store = useStore()
const router = useRouter()
const now = new Date()
const pad = n => String(n).padStart(2, '0')
const year = now.getFullYear()
const curMonth = `${year}-${pad(now.getMonth() + 1)}`
const monthNum = now.getMonth() + 1
const todayStr = `${curMonth}-${pad(now.getDate())}`
const hidden = ref(false)

// 冷启动先用本地缓存秒显真实数据，再后台刷新
const homeCacheKey = computed(() => `home_${store.currentBookId}_${year}`)
// 明细用 shallowRef，避免对大量记录递归建立响应式代理导致卡顿
const allRecords = shallowRef([])
const budget = ref(0)
const budgetShow = ref(false)
const budgetInput = ref('')

const fmt = n => Number(n || 0).toFixed(2)
const money = n => hidden.value ? '****' : fmt(n)
const dateOf = r => String(r.record_date || '').slice(0, 10)

// 本周（周一 ~ 周日）
const weekRange = computed(() => {
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now); monday.setDate(now.getDate() + diff)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const fmtD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return { start: fmtD(monday), end: fmtD(sunday) }
})

function statOf(pred) {
  let income = 0, expense = 0
  allRecords.value.forEach(r => {
    if (!pred(r)) return
    if (r.type === 'income') income += Number(r.amount)
    else expense += Number(r.amount)
  })
  return { income, expense }
}

const todayStats = computed(() => statOf(r => dateOf(r) === todayStr))
const weekStats = computed(() => statOf(r => dateOf(r) >= weekRange.value.start && dateOf(r) <= weekRange.value.end))
const monthStats = computed(() => statOf(r => dateOf(r).slice(0, 7) === curMonth))
const yearStats = computed(() => statOf(r => dateOf(r).slice(0, 4) === String(year)))

const latestText = computed(() => {
  const rec = allRecords.value.find(r => dateOf(r) === todayStr)
  if (!rec) return '暂无记录'
  return `${rec.category2 || rec.category_name || '未分类'} ${fmt(rec.amount)}`
})

const weekLabel = computed(() => {
  const s = weekRange.value.start.split('-'), e = weekRange.value.end.split('-')
  return `${Number(s[1])}月${Number(s[2])}日 - ${Number(e[1])}月${Number(e[2])}日`
})
const monthLabel = computed(() => {
  const last = new Date(year, now.getMonth() + 1, 0).getDate()
  return `${monthNum}月1日 - ${monthNum}月${last}日`
})

function goRange(range) { router.push({ name: 'detail', query: { range } }) }

async function openBudget() {
  budgetInput.value = budget.value > 0 ? String(budget.value) : ''
  budgetShow.value = true
}
async function saveBudget() {
  if (!budgetInput.value || Number(budgetInput.value) < 0) return showToast('请输入有效金额')
  try {
    await api.stats.setBudget({ book_id: store.currentBookId, month: curMonth, amount: budgetInput.value })
    store.touch()
    budget.value = Number(budgetInput.value)
    budgetShow.value = false
    showToast('预算已保存')
  } catch (e) { showToast(e.message) }
}

async function load() {
  const bookId = store.currentBookId
  if (!bookId) return
  try {
    const [list, bud] = await Promise.all([
      api.records.list({ book_id: bookId, month: String(year) }),
      api.stats.getBudget({ book_id: bookId, month: curMonth })
    ])
    allRecords.value = mergePending(list, bookId, String(year))
    budget.value = bud || 0
    writeCacheAsync(homeCacheKey.value, { list, budget: bud || 0 })
  } catch (e) {
    // 离线/弱网：把待同步队列里刚记的记录补进列表，金额与明细即时可见
    allRecords.value = mergePending(allRecords.value, bookId, String(year))
  }
}

// 下拉刷新：补传离线队列 → 拉取最新数据 → 通知其它页同步
const refreshing = ref(false)
async function onRefresh() {
  let synced = 0
  try {
    if (navigator.onLine !== false) {
      const r = await flushSync()
      synced = r.synced || 0
    }
    await load()
    // 通知其它页面重新拉服务端数据，让跨端变更也一并同步过来
    window.dispatchEvent(new CustomEvent('ssj:pull'))
    lastVersion = store.dataVersion
    if (navigator.onLine === false) notify({ title: '已同步到本地', desc: '当前离线，数据已缓存，联网后自动上传', type: 'offline' })
    else if (synced > 0) notify({ title: '同步完成', desc: `已上传 ${synced} 笔离线记录`, type: 'sync' })
    else notify({ title: '已同步到本地', desc: '数据已是最新', type: 'success' })
  } catch (e) {
    notify({ title: '同步失败', desc: e.message || '请稍后重试', type: 'error' })
  } finally {
    refreshing.value = false
  }
}

let lastVersion = -1
function refreshIfNeeded() {
  // 首次进入或数据发生变更后才重新取数，否则直接用 keep-alive 缓存
  if (lastVersion !== store.dataVersion) { lastVersion = store.dataVersion; load() }
}
function onRemotePull() { if (store.ready || store.currentBookId) load() }
onMounted(async () => {
  // 异步读 IndexedDB 缓存，命中先就位真实数据（预算也一并恢复）
  const cached = await readCacheAsync(homeCacheKey.value)
  if (cached && cached.list) {
    allRecords.value = cached.list
    budget.value = cached.budget || 0
    lastVersion = store.dataVersion - 1  // 仍触发一次后台静默刷新
  }
  // 不 await：离线/弱网下 loadBase 卡在网络错误会挡住缓存渲染
  if (!store.ready) store.loadBase().catch(() => {})
  refreshIfNeeded()
  window.addEventListener('ssj:pull', onRemotePull)
  window.addEventListener('ssj:synced', onRemotePull)
})
onActivated(() => { afterNav(() => { if (store.ready) refreshIfNeeded() }) })
onUnmounted(() => {
  window.removeEventListener('ssj:pull', onRemotePull)
  window.removeEventListener('ssj:synced', onRemotePull)
})
</script>

<style scoped>
/* 下拉刷新容器：覆盖首页可视区（tabbar 之上），让下拉手势可触发 */
.home-pull {
  position: relative;
  /* 铺满整个视口。原先扣了 58px（旧版底部 tabbar 的高度）+ 安全区：
     悬浮菜单改版后那 58px 早就没人占了，却把内容区硬生生截短 92px，
     卡片下面多出一截没来由的空白。菜单是浮层，内容区应该铺到屏幕底，
     再靠 .page 的 padding-bottom 把最后一点内容让开菜单。 */
  height: 100%;
  overflow: hidden;
  /* 下拉刷新 / 橡皮筋时整块内容向下位移，顶部会露出一条空隙。
     底衬统一为纯白（与 .hero 完全一致），下拉露出时不会闪出灰色底。 */
  background: #fff;
}
.home-pull::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: calc(226px + env(safe-area-inset-top));
  background: #fff;
  pointer-events: none;
  z-index: 0;
}
.home-pull :deep(.van-pull-refresh__track) { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }

/* 首页固定铺满一屏（tabbar 之上），不可滚动 */
.page.home-page {
  position: relative;
  z-index: 1; /* 压在 .home-pull::before 的模糊底衬之上，底衬只在页面下滑时露出来 */
  height: 100%;
  min-height: 0;
  padding-bottom: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* banner：橙红渐变只铺内容区，顶部状态栏安全区保持白色不上色。
   .hero 自身底色仍是白色（顶部那段就是白），::before 从安全区下沿开始铺渐变。 */
.hero { position: relative; flex: 0 0 calc(226px + env(safe-area-inset-top)); height: calc(226px + env(safe-area-inset-top)); overflow: hidden; padding-top: calc(env(safe-area-inset-top) + 10px); background: #fff; border-bottom: 1px solid #f0f0f0; }
.hero::before { content: ''; position: absolute; z-index: 0; left: 0; right: 0; top: calc(env(safe-area-inset-top) + 66px); bottom: 0; background: var(--primary-grad); }
/* 顶部导航标题：与其他页导航条对齐（安全区起 66px 区），水平垂直居中、深色字 */
.home-nav-title { position: absolute; z-index: 3; left: 0; right: 0; top: env(safe-area-inset-top); height: 66px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: #1a1a1a; }
.hero-content { position: absolute; z-index: 2; left: 22px; bottom: 32px; color: #fff; }
.hero-label { font-size: 14px; color: rgba(255,255,255,.88); margin-bottom: 4px; }
.hero-amount-row { display: flex; align-items: center; gap: 12px; }
.hero-amount { font-size: 44px; font-weight: 600; line-height: 1.1; letter-spacing: .5px; color: #fff; }
.eye { font-size: 18px; color: rgba(255,255,255,.85); cursor: pointer; }
.hero-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; opacity: .95; margin-top: 8px; color: #fff; }
.hero-meta b { font-weight: 500; }
.hero-meta em { font-style: normal; color: #fff; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.hero-meta i { display: inline-block; width: 1px; height: 12px; background: rgba(255,255,255,.5); }

/* 列表按内容自然高度，不拉伸铺满；下方留白交给 .home-pull 的白色底
   （已铺满整屏且在下拉刷新容器内），所以是白色可下拉区，而非灰色死区。 */
.stat-list { background: #fff; flex: 0 0 auto; display: flex; flex-direction: column; }
.stat-row { flex: 0 0 auto; height: 76px; min-height: 64px; display: flex; align-items: center; padding: 0 16px; border-bottom: 1px solid #f2f3f5; cursor: pointer; }
.stat-row:last-child { border-bottom: 0; }
.stat-row:active { background: #fafafa; }
.stat-row.custom { cursor: default; }
.stat-row.custom:active { background: #fff; }
.s-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; margin-right: 13px; }
.ic-today { background: #fff0f4; color: #ff6b9d; }
.ic-week { background: #eaf3ff; color: #4a90e2; }
.ic-month { background: #fff7e6; color: #ffb400; }
.ic-year { background: #fdeeff; color: #e15ce0; }
.ic-custom { background: #f2f3f5; color: #b8bcc4; }
.s-main { flex: 1; min-width: 0; }
.s-title { font-size: 16px; font-weight: 600; color: #222; }
.s-sub { font-size: 12px; color: #aaa; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-nums { text-align: right; flex-shrink: 0; margin-left: 8px; }
.s-income { color: #f2613a; font-size: 15px; font-weight: 600; }
.s-expense { color: #1ebd7e; font-size: 15px; font-weight: 600; margin-top: 3px; }
.s-arrow { color: #ccc; font-size: 15px; margin-left: 8px; flex-shrink: 0; }

.popup { padding: 20px 16px calc(24px + env(safe-area-inset-bottom)); }
.popup-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px; }
.popup-btns { display: flex; gap: 10px; margin-top: 18px; }
</style>
