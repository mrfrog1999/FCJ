<template>
  <div class="page flow-page">
    <!-- 顶部橙红渐变 banner + 导航 + 结余 -->
    <div class="hero">
      <div class="navbar">
        <div class="nav-left" @click="$router.push('/home')">
          <van-icon name="arrow-left" />
        </div>
        <div class="nav-title">流水</div>
        <div class="nav-right"></div>
      </div>
      <div class="hero-sum">
        <div class="hero-label">{{ isAllYears && activeYear ? activeYear + ' 年结余' : '结余' }}</div>
        <div class="hero-balance">
          <FlipNumber v-if="bannerReady" :value="fmt(bannerSummary.balance)" :step="0.05" :card="false" />
          <span v-else class="hero-ph hero-ph-lg"></span>
        </div>
        <div class="hero-sub">
          <span>收入 <b class="income-txt"><FlipNumber v-if="bannerReady" :value="fmt(bannerSummary.income)" :step="0.035" :card="false" /><span v-else class="hero-ph hero-ph-sm"></span></b></span>
          <i></i>
          <span>支出 <b class="expense-txt"><FlipNumber v-if="bannerReady" :value="fmt(bannerSummary.expense)" :step="0.035" :card="false" /><span v-else class="hero-ph hero-ph-sm"></span></b></span>
        </div>
      </div>
      <!-- 右下角筛选按钮 -->
      <div class="hero-filter" :class="{ on: hasFilter }" @click="openFilter">
                        <svg class="hero-filter-svg" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M153.6 256h716.8a51.2 51.2 0 0 0 0-102.4H153.6a51.2 51.2 0 0 0 0 102.4zM665.6 460.8H153.6a51.2 51.2 0 0 0 0 102.4h512a51.2 51.2 0 0 0 0-102.4zM460.8 768H153.6a51.2 51.2 0 0 0 0 102.4h307.2a51.2 51.2 0 0 0 0-102.4z" fill="#ffffff"></path></svg>
      </div>
    </div>

    <!-- 列表滚动区：仅在 banner 之下滚动，不滚到页面顶部 -->
    <div ref="scrollRef" class="list-scroll" @scroll="onScroll">
    <div v-if="visibleBlocks.length" class="month-list">
      <div class="month-block" v-for="(mb, mi) in visibleBlocks" :key="mb.key" :data-year="mb.year">
        <div class="year-bar" v-if="mi === 0 || mb.year !== visibleBlocks[mi - 1].year" @click="toggleYear(mb.year)">
          <div class="yb-left">
            <span class="yb-num">{{ mb.year }}</span>
            <span class="yb-unit">年</span>
          </div>
          <div class="yb-right">
            <div class="yb-balance">结余 <b>{{ fmt(yearInfo(mb.year).balance) }}</b></div>
            <div class="yb-row2">
              <span class="yb-income">收入 <b>{{ fmt(yearInfo(mb.year).income) }}</b></span>
              <span class="yb-divider">|</span>
              <span class="yb-expense">支出 <b>{{ fmt(yearInfo(mb.year).expense) }}</b></span>
            </div>
          </div>
          <van-icon class="yb-fold" :name="foldYears[mb.year] ? 'arrow-down' : 'arrow-up'" />
        </div>
        <div v-if="!foldYears[mb.year]">
          <div class="month-head" @click="toggleMonth(mb.key)">
            <span class="mh-title">{{ mb.label }}</span>
            <span class="mh-bal">结余 {{ fmt(mb.balance) }}</span>
            <van-icon :name="foldMonths[mb.key] ? 'arrow-down' : 'arrow-up'" />
          </div>
          <div v-show="!foldMonths[mb.key]">
          <div class="day-block" v-for="d in mb.days" :key="d.date">
            <van-swipe-cell v-for="(r, i) in d.items" :key="r.id">
              <div class="flow-row" @click="edit(r)">
                <div class="date-col" v-if="i === 0">
                  <div class="d-day">{{ dayOf(d.date) }}</div>
                  <div class="d-week">{{ weekOf(d.date) }}</div>
                </div>
                <div class="date-col ph" v-else></div>
                <div class="cat-icon">
                  <img v-if="r.type === 'transfer'" :src="transferIcon" class="transfer-ico-img" alt="" />
                  <CategoryIcon v-else :name="r.category2 || r.category_name" :icon="r.category_icon" :size="30" />
                </div>
                <div class="row-info">
                  <template v-if="r.type === 'transfer'">
                    <div class="rname">{{ r.from_account || '' }} <span class="transfer-arrow">→</span> {{ r.to_account || '' }}</div>
                    <div class="rnote" v-if="r.note">{{ r.note }}</div>
                    <div class="rsub"><span class="rtime">{{ timeOf(r.record_date) }}</span><template v-if="memberLabel(r)"> · {{ memberLabel(r) }}</template></div>
                  </template>
                  <template v-else>
                    <div class="rname">{{ r.category2 || r.category_name || '未分类' }}</div>
                    <div class="rnote" v-if="realNote(r)">{{ realNote(r) }}</div>
                    <div class="rsub"><span class="rtime">{{ timeOf(r.record_date) }}</span><template v-if="r.account"> {{ r.account }}</template><template v-if="r.account && memberLabel(r)"> · </template><template v-if="memberLabel(r)">{{ memberLabel(r) }}</template></div>
                  </template>
                </div>
                <div class="ramt" :class="r.type === 'income' ? 'amt-income' : (r.type === 'transfer' ? 'amt-transfer' : 'amt-expense')">{{ r.type === 'income' ? '+' : '' }}{{ fmt(r.amount) }}</div>
              </div>
              <template #right><div class="del" @click="remove(r)">删除</div></template>
            </van-swipe-cell>
          </div>
          </div>
        </div>
      </div>
      <div ref="sentinelRef" class="list-sentinel">
        <van-loading v-if="hasMore" size="18px" color="#1ebd7e">加载更多…</van-loading>
        <span v-else>— 共 {{ filtered.length }} 笔 · 已到底部 —</span>
      </div>
    </div>
    <van-empty v-else-if="loaded" :description="isAllYears ? '还没有记录' : '这一年还没有记录'" />
    </div>

    <!-- 筛选弹窗：年份 / 分类 / 成员 -->
    <van-popup v-model:show="filterShow" position="bottom" round :style="{ height: '70%' }">
      <div class="picker-pop">
        <div class="picker-head">
          <span>筛选</span>
          <van-icon name="cross" @click="filterShow = false" />
        </div>
        <div class="filter-body">
          <div class="fg">
            <div class="fg-title">年份</div>
            <div class="fg-chips">
              <span class="chip" :class="{ on: String(year) === 'all' }" @click="pickYear('all')">全部</span>
              <span class="chip" v-for="y in yearOptions" :key="y" v-if="y !== 'all'" :class="{ on: String(year) === String(y) }" @click="pickYear(y)">{{ y }}</span>
            </div>
          </div>
          <div class="fg">
            <div class="fg-title">分类</div>
            <div class="fg-chips">
              <span class="chip" :class="{ on: catFilter === 'all' }" @click="catFilter = 'all'">全部</span>
              <span class="chip" v-for="c in catOptions" :key="c" :class="{ on: catFilter === c }" @click="catFilter = c">{{ c }}</span>
            </div>
          </div>
          <div class="fg">
            <div class="fg-title">成员</div>
            <div class="fg-chips">
              <span class="chip" :class="{ on: String(memberFilter) === 'all' }" @click="memberFilter = 'all'">全部</span>
              <span class="chip" v-for="m in store.members" :key="m.id" :class="{ on: String(memberFilter) === String(m.id) }" @click="memberFilter = m.id">{{ memberName(m) }}</span>
            </div>
          </div>
        </div>
        <div class="filter-foot">
          <van-button block @click="resetFilter">重置</van-button>
          <van-button block type="primary" @click="filterShow = false">完成</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 搜索 -->
    <van-popup v-model:show="showSearch" position="top" :style="{ height: '60px' }">
      <van-search v-model="keyword" placeholder="搜索分类/账户/备注" show-action @search="showSearch = false" @cancel="keyword = ''; showSearch = false" />
    </van-popup>

  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onActivated, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import SvgIcon from '../components/SvgIcon.vue'
import CategoryIcon from '../components/CategoryIcon.vue'
import FlipNumber from '../components/FlipNumber.vue'
import { memberName } from '../utils/members'
import { readCacheAsync, writeCacheAsync } from '../utils/cache'
import { transferIconUrl } from '../utils/categoryIconMap'
import { iconTheme } from '../utils/theme'

const store = useStore()
const route = useRoute()
const router = useRouter()
// 转账图标随主题切换（iconTheme 用于建立响应式依赖）
const transferIcon = computed(() => { iconTheme.value; return transferIconUrl() })
const now = new Date()
const year = ref('all')  // 默认显示全部年份
// 冷启动先用本地缓存秒显真实数据（key 含账本，切账本自动读对应缓存）
const detailCacheKey = computed(() => `detail_v2_${store.currentBookId}_${year.value}`)
// 全量明细用 shallowRef：两万多笔记录若用 ref 会被递归代理成几十万个 Proxy，首屏卡顿的主因。
// 这些记录只做整体替换、不改内部字段，shallowRef 完全够用且赋值近乎零开销。
const allRecords = shallowRef([])

// 首页快捷跳转范围：day / week / month / year 或空（全部）
const range = ref(route.query.range || '')
const pad2 = n => String(n).padStart(2, '0')
// "全部年份"用 year='all' 表示；涉及具体日期的计算回退到当前年，避免 NaN
const isAllYears = computed(() => year.value === 'all')
const baseYear = computed(() => (year.value === 'all' ? now.getFullYear() : year.value))
const todayStr = `${baseYear.value}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
const curMonth = String(baseYear.value) + '-' + pad2(now.getMonth() + 1)
const weekStart = (() => {
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(now); m.setDate(now.getDate() + diff)
  return `${m.getFullYear()}-${pad2(m.getMonth() + 1)}-${pad2(m.getDate())}`
})()
const loaded = ref(false)
// 缓存命中 / 网络到位后放行，避免先显示 0 再跳
const bannerReady = ref(false)
const foldMonths = ref({})
const foldYears = ref({})          // 年份折叠状态：true=折叠
const activeYear = ref('')         // banner 当前显示的年份（滚动联动）
const keyword = ref('')

// 按月分批渲染：默认只渲染最近 1 个月，滚动到底再逐月加载，避免一次性挂载大量 van-swipe-cell
const MONTH_PAGE = 1
const visibleMonths = ref(MONTH_PAGE)
const sentinelRef = ref(null)
const scrollRef = ref(null)
let io = null

const catFilter = ref('all')
const accountFilter = ref('all')
const memberFilter = ref('all')
const typeFilter = ref('all')

const showSearch = ref(false)
const filterShow = ref(false)

// 是否有筛选生效（控制 banner 筛选按钮高亮）
const hasFilter = computed(() => !isAllYears.value || catFilter.value !== 'all' || String(memberFilter.value) !== 'all')

function openFilter() { filterShow.value = true }
function pickYear(v) {
  year.value = (v === 'all' ? 'all' : Number(v))
  range.value = ''
}
function resetFilter() {
  year.value = 'all'
  range.value = ''
  catFilter.value = 'all'
  memberFilter.value = 'all'
}

const rangeLabel = computed(() => {
  const allLabel = '全部年份'
  if (isAllYears.value) return allLabel
  return ({
    day: '今天', week: '本周', month: `${Number(curMonth.slice(5))}月`, year: `${year.value}年`
  }[range.value] || `${year.value}年`)
})

const fmt = n => Number(n || 0).toFixed(2)
const timeOf = s => (String(s || '').split('T')[1] || '').slice(0, 5)
const dayOf = s => Number(String(s || '').slice(8, 10))
const weekOf = s => {
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return w[new Date(String(s || '').slice(0, 10)).getDay()] || ''
}
const memberLabel = r => memberName(r)
function realNote(r) {
  let n = String(r.note || '').trim()
  if (!n) return ''
  // 历史备注格式："账户:账户名 真实备注"，剥离账户前缀，保留真实备注
  if (n.startsWith('账户:')) {
    const sp = n.indexOf(' ')
    n = sp >= 0 ? n.slice(sp + 1).trim() : ''
  }
  return n
}

// 快捷范围过滤（首页跳转）
function inRange(r) {
  if (!range.value) return true
  const d = String(r.record_date || '').slice(0, 10)
  if (range.value === 'day') return d === todayStr
  if (range.value === 'week') return d >= weekStart && d <= todayStr
  if (range.value === 'month') return d.slice(0, 7) === curMonth
  if (range.value === 'year') return isAllYears.value ? true : d.slice(0, 4) === String(year.value)
  return true
}

// 筛选后的记录
const filtered = computed(() => allRecords.value.filter(r => {
  if (!inRange(r)) return false
  const cat = r.category2 || r.category_name || ''
  if (catFilter.value !== 'all' && cat !== catFilter.value) return false
  if (accountFilter.value !== 'all' && r.account !== accountFilter.value) return false
  const mid = String(r.member_id || r.user_id || '')
  if (memberFilter.value !== 'all' && mid !== String(memberFilter.value)) return false
  if (typeFilter.value !== 'all' && r.type !== typeFilter.value) return false
  if (keyword.value) {
    const k = keyword.value.toLowerCase()
    const hay = [cat, r.account, memberLabel(r), realNote(r), r.note].join(' ').toLowerCase()
    if (!hay.includes(k)) return false
  }
  return true
}))

// 汇总
const summary = computed(() => {
  let income = 0, expense = 0
  filtered.value.forEach(r => {
    if (r.type === 'transfer') return // 转账只在账户间划转，不计收支
    if (r.type === 'income') income += Number(r.amount)
    else expense += Number(r.amount)
  })
  return { income, expense, balance: income - expense }
})

// 某年的结余/收入/支出（供年份折叠标签展示）
function yearInfo(y) {
  const t = yearTotals.value[y] || {}
  const income = Number(t.income || 0)
  const expense = Number(t.expense || 0)
  return { income, expense, balance: income - expense }
}

// banner 汇总：全部年份时按当前滚动到的 activeYear 计算那一年的结余/收入/支出
const bannerSummary = computed(() => {
  if (!isAllYears.value || !activeYear.value) return summary.value
  const t = yearTotals.value[activeYear.value]
  if (t) return { income: t.income, expense: t.expense, balance: t.income - t.expense }
  return summary.value
})

// 各年份收支汇总：用于 banner 切换、年标签折叠后仍显示该年数据
const yearTotals = computed(() => {
  const m = {}
  filtered.value.forEach(r => {
    const y = String(r.record_date || '').slice(0, 4)
    if (!y) return
    if (r.type === 'transfer') return // 转账不计收支
    if (!m[y]) m[y] = { income: 0, expense: 0 }
    if (r.type === 'income') m[y].income += Number(r.amount)
    else m[y].expense += Number(r.amount)
  })
  return m
})

// 全部年份模式下，activeYear 必须始终指向一个有效年份。
// 缓存命中 / 后台静默刷新后，若 activeYear 为空或已不在当前数据中，自动取最新年份，
// 保证 banner 首屏就显示「某年结余」而不是全部数据的汇总（不再依赖用户滚动才切换）。
watch(yearTotals, (totals) => {
  if (!isAllYears.value) return
  if (activeYear.value && totals[activeYear.value]) return
  const years = Object.keys(totals).sort()
  if (years.length) activeYear.value = years[years.length - 1]
}, { immediate: true })

// 月份 → 日期 分组
const monthBlocks = computed(() => {
  const map = {}
  filtered.value.forEach(r => {
    const ym = String(r.record_date || '').slice(0, 7)
    if (!ym) return
    if (!map[ym]) map[ym] = { key: ym, income: 0, expense: 0, days: {} }
    const b = map[ym]
    if (r.type === 'transfer') { /* 转账不计收支，但仍进入日期分组展示 */ }
    else if (r.type === 'income') b.income += Number(r.amount)
    else b.expense += Number(r.amount)
    const date = String(r.record_date || '').slice(0, 10)
    if (!b.days[date]) b.days[date] = { date, items: [] }
    b.days[date].items.push(r)
  })
  return Object.values(map)
    .sort((a, b) => b.key.localeCompare(a.key))
    .map(m => ({
      key: m.key,
      year: m.key.slice(0, 4),
      label: `${Number(m.key.slice(5))}月`,
      balance: m.income - m.expense,
      days: Object.values(m.days).sort((a, b) => b.date.localeCompare(a.date))
    }))
})

// 按月份裁剪：默认只渲染最近 1 个月，滚动到底再逐月增加（汇总仍基于全量 filtered）
const visibleBlocks = computed(() => monthBlocks.value.slice(0, visibleMonths.value))
const hasMore = computed(() => visibleMonths.value < monthBlocks.value.length)

function loadMore() {
  if (!hasMore.value) return
  let next = visibleMonths.value + MONTH_PAGE
  // 跳过被折叠年份的月份：否则折叠后高度塌陷，哨兵反复进入视口逐月空转（列表空白+一直转）
  while (next < monthBlocks.value.length && foldYears.value[monthBlocks.value[next - 1].year]) next++
  visibleMonths.value = Math.min(next, monthBlocks.value.length)
}
// 哨兵元素一出现/重建就自动绑定滚动监听，离开则断开
watch(sentinelRef, el => {
  if (io) { io.disconnect(); io = null }
  if (!el || typeof IntersectionObserver === 'undefined') return
  io = new IntersectionObserver(entries => {
    if (entries[0] && entries[0].isIntersecting) loadMore()
  }, { root: scrollRef.value || null, rootMargin: '80px' })
  io.observe(el)
})

const catOptions = computed(() => {
  const set = new Set(allRecords.value.map(r => r.category2 || r.category_name).filter(Boolean))
  return Array.from(set).sort()
})
const accountOptions = computed(() => {
  const set = new Set(allRecords.value.map(r => r.account).filter(Boolean))
  return Array.from(set).sort()
})
const yearOptions = computed(() => ['all', ...Array.from({ length: 16 }, (_, i) => now.getFullYear() - i)])


function toggleMonth(k) { foldMonths.value = { ...foldMonths.value, [k]: !foldMonths.value[k] } }
function toggleYear(y) {
  // foldYears[y] !== true 表示当前展开，点击后折叠；模板用 === false 判断展开
  foldYears.value = { ...foldYears.value, [y]: foldYears.value[y] !== true }
}
function edit(r) {
  router.push({ path: '/add', query: { id: r.id } })
}
async function remove(r) {
  try {
    await showConfirmDialog({ title: '删除记录', message: '确定删除这笔记录吗？' })
    if (r.type === 'transfer') await api.transfers.remove(String(r.id).replace('transfer_', ''))
    else await api.records.remove(r.id)
    store.touch()
    showToast('已删除')
    load()
  } catch (e) { if (e !== 'cancel') showToast(e.message || '取消') }
}

let lastVersion = -1
// silent=true 表示首屏已有缓存、后台静默刷新：不重置折叠/列表批次/滚动位置，避免视觉跳动
async function load(silent = false) {
  lastVersion = store.dataVersion
  const bookId = store.currentBookId
  if (!bookId) return
  if (!silent) {
    loaded.value = false
    visibleMonths.value = MONTH_PAGE
    foldMonths.value = {}
    foldYears.value = {}
  }
  try {
    // 全部年份：不传 month，后端返回账本全部记录；否则按年份返回
    const params = { book_id: bookId, with_transfers: 1 }
    if (!isAllYears.value) params.month = String(year.value)
    const list = await api.records.list(params)
    allRecords.value = list
    // 大明细写 IndexedDB（异步、不阻塞）；不 await，避免拖慢数据呈现
    writeCacheAsync(detailCacheKey.value, list)
  } catch (e) { showToast(e.message) }
  loaded.value = true
  // 非静默刷新才把列表滚回顶部、更新 banner；静默刷新保留当前浏览位置
  if (!silent) {
    await nextTick()
    if (scrollRef.value) scrollRef.value.scrollTop = 0
    updateActiveYear()
  }
  // activeYear 已确定，此刻 bannerSummary 为最终值，才放行数字组件直接就位（不再先显示 0）
  await nextTick()
  bannerReady.value = true
}

// 滚动联动：banner 显示当前滚动容器顶部所在月份块的年份
function updateActiveYear() {
  if (!isAllYears.value) { activeYear.value = ''; return }
  const container = scrollRef.value
  const blocks = container?.querySelectorAll('.month-block[data-year]')
  if (!blocks || !blocks.length) return
  const top = container.getBoundingClientRect().top
  let y = blocks[0].getAttribute('data-year')
  for (const b of blocks) {
    if (b.getBoundingClientRect().top <= top + 8) y = b.getAttribute('data-year')
    else break
  }
  activeYear.value = y
}
let scrollTicking = false
function onScroll() {
  if (scrollTicking) return
  scrollTicking = true
  window.requestAnimationFrame(() => { scrollTicking = false; updateActiveYear() })
}

// 从首页带范围跳转时同步（含组件复用场景）
watch(() => route.query.range, v => {
  range.value = v || ''
  foldMonths.value = {}
})
// 筛选条件变化时，回到首屏批次，避免停留在很深的加载位置
watch([range, catFilter, accountFilter, memberFilter, typeFilter, keyword], () => {
  visibleMonths.value = MONTH_PAGE
})
watch([year, () => store.currentBookId], () => load(false))
// 首次进入（含缓存命中后的后台刷新）用静默模式，避免重置首屏已显示的缓存列表
function refreshIfNeeded() {
  if (lastVersion !== store.dataVersion) load(true)
}
onMounted(async () => {
  // 异步读 IndexedDB 明细缓存（不阻塞主线程），命中则先就位真实数据
  const cached = await readCacheAsync(detailCacheKey.value)
  if (cached && cached.length) {
    allRecords.value = cached
    // 数据就位后同步确定 banner 年份与就绪态（watch yearTotals 也会兜底设 activeYear）
    await nextTick()
    updateActiveYear()
    bannerReady.value = true
    lastVersion = store.dataVersion - 1  // 保证下面仍触发一次后台静默刷新
  }
  if (!store.ready) await store.loadBase().catch(() => {})
  refreshIfNeeded()
})
onActivated(() => { if (store.ready) refreshIfNeeded() })
</script>

<style scoped>
/* 页面固定为 tabbar 之上的一屏，列表内部独立滚动 */
.page.flow-page {
  height: calc(100vh - 58px - env(safe-area-inset-bottom));
  height: calc(100dvh - 58px - env(safe-area-inset-bottom));
  min-height: 0;
  padding-bottom: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* 顶部橙红渐变 banner：固定不滚动（高度贴合文字，覆盖浏览器头部状态栏） */
.hero {
  position: relative; z-index: 20; flex: 0 0 auto;
  padding-top: env(safe-area-inset-top);
  padding-bottom: 18px;
  box-sizing: border-box; overflow: hidden;
  background: linear-gradient(135deg, #ff9a44 0%, #ff6b35 48%, #f0472d 100%);
}
.navbar { position: relative; z-index: 2; height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; color: #fff; font-size: 18px; }
.nav-left, .nav-right { display: flex; align-items: center; min-width: 96px; }
.nav-right { justify-content: flex-end; gap: 18px; }
.nav-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 3px; cursor: pointer; }
.hero-sum { position: relative; z-index: 2; padding: 2px 20px 0; color: #fff; }
.hero-label { font-size: 13px; opacity: .92; }
.hero-balance { font-size: 38px; font-weight: 600; letter-spacing: 0; line-height: 1.15; margin: 2px 0 6px; }
.hero-sub { font-size: 12px; opacity: .98; display: flex; align-items: center; gap: 10px; }
.hero-sub b { font-weight: 600; }
.hero-sub i { display: inline-block; width: 1px; height: 11px; background: rgba(255,255,255,.5); margin: 0 2px; }
.income-txt { color: #fff3e8; }
.expense-txt { color: #d8fff0; }
/* 数据就绪前的占位：只占位置、完全透明不可见，避免先显示 0 造成跳变 */
.hero-ph { display: inline-block; height: 1em; vertical-align: middle; background: transparent; }
.hero-ph-lg { width: 5.6em; }
.hero-ph-sm { width: 3.4em; }

/* 年份标签条 */
.year-bar { display: flex; align-items: center; gap: 14px; padding: 14px 16px 12px; background: #fff; cursor: pointer; }
.yb-left { display: flex; align-items: baseline; gap: 3px; flex-shrink: 0; }
.yb-num { font-size: 30px; font-weight: 700; color: #1a1a1a; letter-spacing: -.5px; line-height: 1; }
.yb-unit { font-size: 13px; color: #666; }
.yb-right { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.yb-balance { font-size: 15px; color: #333; }
.yb-balance b { font-size: 17px; font-weight: 700; color: #1a1a1a; font-variant-numeric: tabular-nums; }
.yb-row2 { display: flex; align-items: center; gap: 12px; font-size: 12px; }
.yb-income { color: #ee0a24; }
.yb-expense { color: #07a35a; }
.yb-row2 b { color: #999; font-weight: 500; font-variant-numeric: tabular-nums; }
.yb-divider { color: #e0e0e0; }
.yb-fold { font-size: 15px; color: #999; flex-shrink: 0; }

/* 月份分组 */
/* 列表独立滚动区：仅占 banner 之下的剩余高度 */
.list-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; padding-bottom: calc(132px + env(safe-area-inset-bottom)); }
.list-scroll::-webkit-scrollbar { display: none; }
.month-list { margin-top: 0; }
/* 长列表渲染优化：跳过屏幕外月份块的布局与绘制，首屏更快 */
.month-block { content-visibility: auto; contain-intrinsic-size: auto 320px; }
.month-head { display: flex; align-items: center; padding: 12px 16px; background: #f5f6f8; color: #666; font-size: 13px; }
.mh-title { font-weight: 600; font-size: 14px; color: #333; }
.mh-bal { flex: 1; text-align: right; margin-right: 8px; }
.month-head .van-icon { color: #aaa; }
.day-block { background: #fff; }
.flow-row { display: flex; align-items: center; padding: 14px 14px; gap: 10px; background: #fff; }
.flow-row:active { background: #f7f8fa; }
.date-col { width: 36px; flex-shrink: 0; text-align: center; }
.d-day { font-size: 19px; font-weight: 600; color: #333; line-height: 1; }
.d-week { font-size: 11px; color: #aaa; margin-top: 3px; }
/* 图标与第一行文字(名称)垂直居中对齐：顶部对齐内容区后上移半个图标高差，不受下方行数影响 */
.cat-icon { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; align-self: flex-start; margin-top: -7px; }
.transfer-ico-img { width: 30px; height: 30px; object-fit: contain; display: block; flex-shrink: 0; }
.row-info { flex: 1; min-width: 0; }
.rname { font-size: 15px; color: #222; font-weight: 500; line-height: 20px; }
.transfer-arrow { color: #9a9a9a; }
.rnote { font-size: 12px; color: #aaa; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rsub { font-size: 11px; color: #aaa; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rtime { margin-right: 8px; }
.ramt { font-size: 16px; font-weight: 600; flex-shrink: 0; }
.amt-expense { color: #1ebd7e; }
.amt-income { color: #f2613a; }
.amt-transfer { color: #9a9a9a; }
.del { height: 100%; background: #ee0a24; color: #fff; display: flex; align-items: center; padding: 0 20px; font-size: 14px; }
.list-sentinel { text-align: center; color: #c4c4c4; font-size: 11px; padding: 18px 0 8px; min-height: 20px; }
.list-sentinel :deep(.van-loading) { display: inline-flex; }
.list-sentinel :deep(.van-loading__text) { color: #9aa3a8; font-size: 11px; margin-left: 6px; }

/* banner 右下角筛选按钮 */
.hero-filter {
  position: absolute; z-index: 3;
  right: 14px; bottom: 12px;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, .22));
  transition: transform .15s;
}
.hero-filter:active { transform: scale(.9); }
.hero-filter-svg { width: 26px; height: 26px; display: block; }
.hero-filter:not(.on) { opacity: .85; }

/* 选择器弹窗 */
.picker-pop { height: 100%; display: flex; flex-direction: column; }
.picker-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 10px; font-size: 16px; font-weight: 600; }
.picker-head .van-icon { font-size: 18px; color: #999; }
.picker-search { padding: 0 8px; }
.picker-list { flex: 1; overflow-y: auto; padding: 6px 12px 20px; }
.opt { display: flex; align-items: center; justify-content: space-between; padding: 13px 6px; font-size: 14px; border-bottom: 1px solid #f2f3f5; }
.opt.on { color: var(--primary); font-weight: 600; }
/* 筛选弹窗 */
.filter-body { flex: 1; overflow-y: auto; padding: 0 18px 12px; }
.fg { padding: 12px 0; border-bottom: 1px solid #f2f3f5; }
.fg:last-child { border-bottom: none; }
.fg-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; }
.fg-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.fg-chips .chip { padding: 7px 16px; font-size: 13px; color: #555; background: #f5f6f8; border-radius: 16px; cursor: pointer; }
.fg-chips .chip.on { color: #fff; background: var(--primary); font-weight: 600; }
.filter-foot { display: flex; gap: 10px; padding: 12px 18px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid #f2f3f5; }
</style>
