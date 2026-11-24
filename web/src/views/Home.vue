<template>
  <div class="page home-page">
    <!-- 顶部抽象背景 + 本月支出 -->
    <div class="hero">
      <div class="hero-bg" :style="{ backgroundImage: 'url(' + bgUrl + ')' }"></div>
      <div class="hero-mask"></div>
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

      <div class="stat-row custom" @click="router.push('/profile')">
        <div class="s-icon ic-custom"><van-icon name="setting-o" /></div>
        <div class="s-main"><div class="s-title">设置</div></div>
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
</template>

<script setup>
import { ref, shallowRef, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useStore } from '../store'
import { readCacheAsync, writeCacheAsync } from '../utils/cache'
import { api } from '../api'

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

const bgUrl = computed(() => {
  const code = localStorage.getItem('ssj_sharecode') || ''
  return '/assets/home-bg.jpg' + (code ? '?sharecode=' + encodeURIComponent(code) : '')
})

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
    allRecords.value = list
    budget.value = bud || 0
    writeCacheAsync(homeCacheKey.value, { list, budget: bud || 0 })
  } catch (e) { showToast(e.message) }
}

let lastVersion = -1
function refreshIfNeeded() {
  // 首次进入或数据发生变更后才重新取数，否则直接用 keep-alive 缓存
  if (lastVersion !== store.dataVersion) { lastVersion = store.dataVersion; load() }
}
onMounted(async () => {
  // 异步读 IndexedDB 缓存，命中先就位真实数据（预算也一并恢复）
  const cached = await readCacheAsync(homeCacheKey.value)
  if (cached && cached.list) {
    allRecords.value = cached.list
    budget.value = cached.budget || 0
    lastVersion = store.dataVersion - 1  // 仍触发一次后台静默刷新
  }
  if (!store.ready) await store.loadBase().catch(() => {})
  refreshIfNeeded()
})
onActivated(() => { if (store.ready) refreshIfNeeded() })
</script>

<style scoped>
/* 首页固定铺满一屏（tabbar 之上），不可滚动 */
.page.home-page {
  height: calc(100vh - 58px - env(safe-area-inset-bottom));
  height: calc(100dvh - 58px - env(safe-area-inset-bottom));
  min-height: 0;
  padding-bottom: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.hero { position: relative; flex: 0 0 190px; height: 190px; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
.hero-mask { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.18) 0%, rgba(0,0,0,.30) 55%, rgba(0,0,0,.42) 100%); }
.hero-content { position: absolute; z-index: 2; left: 22px; bottom: 24px; color: #fff; }
.hero-label { font-size: 14px; color: #ffcf9e; margin-bottom: 4px; }
.hero-amount-row { display: flex; align-items: center; gap: 12px; }
.hero-amount { font-size: 44px; font-weight: 600; line-height: 1.1; letter-spacing: .5px; }
.eye { font-size: 18px; color: rgba(255,255,255,.85); cursor: pointer; }
.hero-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; opacity: .95; margin-top: 8px; }
.hero-meta b { font-weight: 500; }
.hero-meta em { font-style: normal; color: #ffcf9e; cursor: pointer; }
.hero-meta i { display: inline-block; width: 1px; height: 12px; background: rgba(255,255,255,.4); }

.stat-list { background: #fff; flex: 0 0 auto; display: flex; flex-direction: column; }
.stat-row { flex: none; height: 64px; display: flex; align-items: center; padding: 0 16px; border-bottom: 1px solid #f2f3f5; cursor: pointer; }
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

.popup { padding: 20px 16px 24px; }
.popup-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px; }
.popup-btns { display: flex; gap: 10px; margin-top: 18px; }
</style>
