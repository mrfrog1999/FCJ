<template>
  <div class="page flow-page"
    @touchstart.capture="edge.onStart"
    @touchmove.capture="edge.onMove"
    @touchend.capture="edge.onEnd"
    @touchcancel.capture="edge.onEnd">
    <!-- 顶部橙红渐变 banner + 导航 + 结余 -->
    <div class="hero">
      <div class="navbar">
        <div class="nav-left" @click="goBack">
          <van-icon name="arrow-left" />
        </div>
        <div class="nav-title">{{ isAccountDetail ? lockedAccount : '流水' }}</div>
        <div class="nav-right"></div>
      </div>
      <div class="hero-sum">
        <div class="hero-label">{{ isAccountDetail ? '净流入' : (isAllYears && activeYear ? activeYear + ' 年结余' : '结余') }}</div>
        <div class="hero-balance">
          <FlipNumber v-if="bannerReady" :value="fmt(bannerSummary.balance)" :step="0.05" :card="false" />
          <span v-else class="hero-ph hero-ph-lg"></span>
        </div>
        <div class="hero-sub">
          <span>{{ isAccountDetail ? '流入' : '收入' }} <b class="income-txt"><FlipNumber v-if="bannerReady" :value="fmt(bannerSummary.income)" :step="0.035" :card="false" /><span v-else class="hero-ph hero-ph-sm"></span></b></span>
          <i></i>
          <span>{{ isAccountDetail ? '流出' : '支出' }} <b class="expense-txt"><FlipNumber v-if="bannerReady" :value="fmt(bannerSummary.expense)" :step="0.035" :card="false" /><span v-else class="hero-ph hero-ph-sm"></span></b></span>
        </div>
      </div>
      <!-- 右下角筛选按钮 -->
      <div class="hero-filter" :class="{ on: hasFilter }" @click="openFilter">
        <svg class="hero-filter-svg" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path d="M388.4 529.7H147.2c-27.1 0-49.2-22.1-49.2-49.2V239.3c0-27.1 22.1-49.2 49.2-49.2h241.2c27.1 0 49.2 22.1 49.2 49.2v241.2c0 27.1-22 49.2-49.2 49.2zM147.2 236c-1.8 0-3.3 1.5-3.3 3.3v241.2c0 1.8 1.5 3.3 3.3 3.3h241.2c1.8 0 3.3-1.5 3.3-3.3V239.3c0-1.8-1.5-3.3-3.3-3.3H147.2zM388.4 912.9H147.2c-27.1 0-49.2-22.1-49.2-49.2V622.5c0-27.1 22.1-49.2 49.2-49.2h241.2c27.1 0 49.2 22.1 49.2 49.2v241.2c0 27.2-22 49.2-49.2 49.2zM147.2 619.3c-1.8 0-3.3 1.5-3.3 3.3v241.2c0 1.8 1.5 3.3 3.3 3.3h241.2c1.8 0 3.3-1.5 3.3-3.3V622.5c0-1.8-1.5-3.3-3.3-3.3l-241.2 0.1zM780.2 912.9H539c-27.1 0-49.2-22.1-49.2-49.2V622.5c0-27.1 22.1-49.2 49.2-49.2h241.2c27.1 0 49.2 22.1 49.2 49.2v241.2c0 27.2-22.1 49.2-49.2 49.2zM539 619.3c-1.8 0-3.3 1.5-3.3 3.3v241.2c0 1.8 1.5 3.3 3.3 3.3h241.2c1.8 0 3.3-1.5 3.3-3.3V622.5c0-1.8-1.5-3.3-3.3-3.3l-241.2 0.1z" fill="#F9C73D"></path>
          <path d="M691.8 498.2l-170-169.9c-10.2-10.2-10.2-26.8 0-37l169.9-169.9c10.2-10.2 26.8-10.2 37 0l169.9 169.9c10.2 10.2 10.2 26.8 0 37L728.7 498.2c-10.1 10.2-26.8 10.2-36.9 0z" fill="#FFEABB"></path>
          <path d="M710.3 529.6c-12.8 0-25.5-4.9-35.3-14.6L505.1 345.1c-19.4-19.4-19.4-51.1 0-70.5l169.9-170c19.4-19.4 51.1-19.4 70.5 0l169.9 169.9c19.4 19.4 19.4 51.1 0 70.5L745.5 515c-9.7 9.7-22.5 14.6-35.2 14.6z m0-392.1c-0.6 0-1.3 0.2-1.7 0.7l-170 169.9c-0.9 0.9-0.9 2.5 0 3.4l169.9 169.9c0.6 0.6 1.2 0.7 1.7 0.7s1.1-0.1 1.7-0.7l169.9-169.9c0.9-0.9 0.9-2.5 0-3.4L712 138.2c-0.5-0.5-1.1-0.7-1.7-0.7z" fill="#F9C73D"></path>
        </svg>
      </div>
    </div>

    <!-- 列表区：和账户页一样整页自然滚动，不再用内部滚动容器 -->
    <div class="list-scroll" :class="{ 'mask-on': swipeMaskOn }">
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
            <div class="cell-wrap" v-for="(r, i) in d.items" :key="r.id">
            <van-swipe-cell>
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
            <div class="cell-mask"></div>
            </div>
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
import { ref, shallowRef, computed, watch, onMounted, onActivated, onDeactivated, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import SvgIcon from '../components/SvgIcon.vue'
import CategoryIcon from '../components/CategoryIcon.vue'
import FlipNumber from '../components/FlipNumber.vue'
import { memberName } from '../utils/members'
import { readCacheAsync, writeCacheAsync } from '../utils/cache'
import { mergePending, revokePending } from '../utils/offlineSync'
import { setPendingRecord } from '../utils/pendingEdit'
import { afterNav } from '../utils/afterNav'
import { transferIconUrl } from '../utils/categoryIconMap'
import { iconTheme } from '../utils/theme'
import { createEdgeBackGuard } from '../utils/edgeBack'

// iOS 左边缘右滑返回穿透保护：避免满屏 swipe-cell 吞掉系统返回手势
const edge = createEdgeBackGuard()

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
let io = null
// 滚动容器是 #app（body 锁高做 flex，整页滚动移到 #app 内部）
const pageScroller = () => document.querySelector('#app')

const catFilter = ref('all')
// 账户详情模式：/account-detail 复用本页，用 query.account 预筛该账户的流水。
// 该账户固定不可被筛选弹窗的「重置」清掉，banner 标题也据此显示账户名。
const isAccountDetail = computed(() => route.name === 'account-detail')
const lockedAccount = computed(() => isAccountDetail.value ? (route.query.account || '') : '')
const accountFilter = ref(isAccountDetail.value ? (route.query.account || 'all') : 'all')
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
  // 账户筛选：普通账户按 account 精确匹配；转账的 account 存的是 from_account，
  // 账户详情模式下同时匹配 to_account，这样从转入方账户进去也能看到这笔转入。
  if (accountFilter.value !== 'all') {
    const hit = r.account === accountFilter.value ||
      (isAccountDetail.value && r.type === 'transfer' && r.to_account === accountFilter.value)
    if (!hit) return false
  }
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

// 账户详情专属口径：账户看的是资金「流入/流出」，和普通流水页的收入/支出不同，
// 转账必须计入 —— 转入(to_account=该账户)=流入，转出(from_account=该账户)=流出。
//   流入 = 收入 + 转入
//   流出 = 支出 + 转出
//   大数字(结余) = 流入 - 流出
// 基于全部记录(allRecords)统计该账户所有年份数据，不受分类/成员等筛选影响。
const accountFlowSummary = computed(() => {
  const acc = lockedAccount.value
  let inflow = 0, outflow = 0
  allRecords.value.forEach(r => {
    const amt = Number(r.amount) || 0
    if (r.type === 'transfer') {
      if (r.to_account === acc) inflow += amt
      if (r.from_account === acc) outflow += amt
      return
    }
    if (r.account !== acc) return
    if (r.type === 'income') inflow += amt
    else outflow += amt // 支出及其它均视为流出
  })
  return { income: inflow, expense: outflow, balance: inflow - outflow }
})

// banner 汇总：
// - 账户详情模式：显示该账户所有数据的「流入/流出」总账，不随滚动年份切换。
// - 普通流水页：全部年份时按当前滚动到的 activeYear 显示那一年；单一年份显示全部。
const bannerSummary = computed(() => {
  if (isAccountDetail.value) return accountFlowSummary.value
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

// 首屏渲染预算：按「天」裁剪，默认只渲染最近 6 天，滚到底再逐批追加。
// 之前按整月裁剪，遇到记账密集的月份（上百条）首次挂载要创建几千个节点，
// 点「流水」会卡 200ms 以上；改成天数预算后首屏节点量降一个数量级，
// 汇总数字仍然基于全量 filtered 计算，不受裁剪影响。
const DAY_PAGE = 6
const visibleDays = ref(DAY_PAGE)

// 折叠的年份不参与预算（它们的日期行本来就不渲染，计入会导致哨兵反复空转）
const totalDays = computed(() => monthBlocks.value.reduce(
  (s, m) => (foldYears.value[m.year] ? s : s + m.days.length), 0))

const visibleBlocks = computed(() => {
  let budget = visibleDays.value
  const out = []
  for (const mb of monthBlocks.value) {
    const folded = !!foldYears.value[mb.year]
    if (budget <= 0 && !folded) break
    const days = []
    for (const d of mb.days) {
      if (!folded) {
        if (budget <= 0) break
        budget--
      }
      days.push(d)
    }
    if (days.length) out.push({ ...mb, days })
  }
  return out
})
const hasMore = computed(() => visibleDays.value < totalDays.value)

function loadMore() {
  if (!hasMore.value) return
  visibleDays.value = Math.min(visibleDays.value + DAY_PAGE, totalDays.value)
}
// 哨兵元素一出现/重建就自动绑定滚动监听，离开则断开
watch(sentinelRef, el => {
  if (io) { io.disconnect(); io = null }
  if (!el || typeof IntersectionObserver === 'undefined') return
  io = new IntersectionObserver(entries => {
    if (entries[0] && entries[0].isIntersecting) loadMore()
  }, { root: pageScroller() || null, rootMargin: '80px' })
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
// 返回：有历史就回退（保留 iOS 手势/返回键的正确栈），深链直达才回首页。
// 之前一律 push('/home') 会让历史越叠越深，手势返回时会退回流水页。
function goBack() {
  if (router.options.history.state.back) router.back()
  else router.push('/home')
}
function edit(r) {
  if (r._local) return showToast('这笔还没上传，联网同步后可编辑')
  rememberScroll()
  // 把这条记录先交给记一笔页，让它滑入的首帧就是真实数据（不等接口回来再填）
  setPendingRecord(r)
  router.push({ path: '/add', query: { id: r.id } })
}
async function remove(r) {
  // 本地待同步记录：直接从队列撤销，无需请求服务端
  if (r._local) {
    try {
      await showConfirmDialog({ title: '删除记录', message: '确定删除这笔还未上传的记录吗？' })
      revokePending(r._clientId)
      allRecords.value = allRecords.value.filter(x => x.id !== r.id)
      showToast('已删除')
    } catch (e) { /* 取消 */ }
    return
  }
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
    // 服务端为准：其它端删除的记录自然消失；再把本地尚未上传的乐观记录补进来
    allRecords.value = mergePending(list, bookId, isAllYears.value ? '' : String(year.value))
    // 大明细写 IndexedDB（异步、不阻塞）；不 await，避免拖慢数据呈现
    writeCacheAsync(detailCacheKey.value, list)
  } catch (e) {
    // 离线/弱网：主动读本页缓存作为底座，再合并待同步队列，保证页面照常打开
    const cached = await readCacheAsync(detailCacheKey.value)
    const base = (Array.isArray(cached) && cached.length) ? cached : allRecords.value
    allRecords.value = mergePending(base, bookId, isAllYears.value ? '' : String(year.value))
  }
  loaded.value = true
  // 非静默刷新才把列表滚回顶部、更新 banner；静默刷新保留当前浏览位置
  if (!silent) {
    await nextTick()
    const sc = pageScroller()
    if (sc) sc.scrollTop = 0
    updateActiveYear()
  }
  // activeYear 已确定，此刻 bannerSummary 为最终值，才放行数字组件直接就位（不再先显示 0）
  await nextTick()
  bannerReady.value = true
}

// 滚动联动：banner 显示当前视口顶部所在月份块的年份。
// 整页 window 滚动后，sticky banner 底边就是内容区的「顶部」参照线。
function updateActiveYear() {
  if (!isAllYears.value) { activeYear.value = ''; return }
  const blocks = document.querySelectorAll('.flow-page .month-block[data-year]')
  if (!blocks || !blocks.length) return
  const heroEl = document.querySelector('.flow-page .hero')
  const top = heroEl ? heroEl.getBoundingClientRect().bottom : 0
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
// 服务端数据变更（其它端增删改/本端补传完成）后静默重拉，让删除等操作实时同步过来
function onRemotePull() { if (store.ready || store.currentBookId) load(true) }

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
  // 不再 await：离线/弱网下 loadBase 会把网络错误抛出而卡住，导致缓存无法渲染、页面打不开。
  // 基础数据放后台加载，失败也不影响本页用缓存 + 待同步队列正常打开。
  if (!store.ready) store.loadBase().catch(() => {})
  refreshIfNeeded()
  pageScroller()?.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('ssj:pull', onRemotePull)
  window.addEventListener('ssj:synced', onRemotePull)
})
// 切走再回来时记住 #app 的 scrollTop，返回后静默重拉可能重建节点把位置清零，这里自己存一份还原。
// 路由层（router/index.js）也按 fullPath 统一记忆，双重保险。
let savedScrollTop = 0
function rememberScroll() { savedScrollTop = pageScroller()?.scrollTop || 0 }
function restoreScroll() {
  const sc = pageScroller()
  if (sc && savedScrollTop > 0) sc.scrollTop = savedScrollTop
}
onDeactivated(rememberScroll)

// 进出「记一笔」时本页不会被 deactivate（常驻层是叠加在 MainLayout 上的），
// 所以要在点击那一刻记一次，等返回动画播完再把位置放回去。
watch(() => route.name, async (n, old) => {
  if (old !== 'add' || n !== 'detail') return
  afterNav(async () => {
    restoreScroll()
    if (store.ready) refreshIfNeeded()
    await nextTick()
    restoreScroll()
  })
})

// 从其它顶层页面（分类/备注等）返回本页：同样要等转场结束再重算，
// 否则重算成千条记录的分组会和位移抢同一帧，让返回动画起步就掉帧。
onActivated(() => {
  afterNav(async () => {
    restoreScroll()
    if (store.ready) refreshIfNeeded()
    await nextTick()
    restoreScroll()
  })
})
onUnmounted(() => {
  pageScroller()?.removeEventListener('scroll', onScroll)
  window.removeEventListener('ssj:pull', onRemotePull)
  window.removeEventListener('ssj:synced', onRemotePull)
})
</script>

<style scoped>
/* 和账户页一样：整页自然滚动，最小一屏高 + 底部留白给 tab，内容自然往下排 */
.page.flow-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding-bottom: calc(20px + var(--sab));
  box-sizing: border-box;
}

/* 顶部导航栏：纯白背景、深色文字，sticky 固定不动——绝不给它上渐变。
   橙红渐变 banner 只在导航下方的数据区 .hero-sum，通栏全宽、无圆角。 */
.hero {
  position: sticky; top: 0; z-index: 20;
  padding-top: calc(env(safe-area-inset-top) + 10px);
  padding-bottom: 0;
  box-sizing: border-box; overflow: hidden;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  color: #1a1a1a;
}
.navbar { position: relative; z-index: 2; height: 56px; display: flex; align-items: center; justify-content: flex-start; gap: 8px; padding: 0 14px; color: #1a1a1a; font-size: 16px; }
.nav-left, .nav-right { display: flex; align-items: center; min-height: 44px; }
.nav-left { min-width: 24px; width: 24px; position: relative; }
.nav-left::before { content: ''; position: absolute; left: -12px; right: -12px; top: -12px; bottom: -12px; }
.nav-left { cursor: pointer; -webkit-tap-highlight-color: transparent; }
.nav-left:active .van-icon { opacity: .5; transform: scale(.9); }
.nav-left .van-icon { font-size: 20px; transition: transform .1s ease, opacity .1s ease; }
.nav-right { justify-content: flex-end; gap: 18px; }
.nav-title { font-size: 16px; font-weight: 600; margin-right: auto; display: flex; align-items: center; gap: 3px; cursor: pointer; }
/* 导航下方的通栏橙红渐变 banner：全宽、无圆角，结余/收支白色文字 */
.hero-sum { position: relative; z-index: 2; margin: 0; padding: 10px 20px 16px; border-radius: 0; background: var(--primary-grad); color: #fff; }
.hero-label { font-size: 13px; opacity: .92; }
.hero-balance { font-size: 38px; font-weight: 600; letter-spacing: 0; line-height: 1.15; margin: 2px 0 6px; }
.hero-sub { font-size: 12px; opacity: .98; display: flex; align-items: center; gap: 10px; }
.hero-sub b { font-weight: 600; }
.hero-sub i { display: inline-block; width: 1px; height: 11px; background: rgba(255,255,255,.45); margin: 0 2px; }
/* 渐变底上收入/支出用纯白，靠文字与正负号区分，不用绿/红 */
.income-txt, .expense-txt { color: #fff; }
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
.list-scroll { position: relative; flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.list-scroll::-webkit-scrollbar { display: none; }
/* 行级左侧「白色→透明」渐变遮罩：常驻在每条流水行(日行)左侧，
   柔化行内容左边缘；年份条/月份头不在 .cell-wrap 内，天然无遮罩。
   pointer-events:none 不拦截触摸，右滑返回与左滑删除都不受影响。 */
.cell-wrap { position: relative; }
.cell-mask {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 84px;
  background: linear-gradient(to right, #fff 0%, #fff 22%, rgba(255, 255, 255, .82) 48%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
  z-index: 15;
}
.month-list { margin-top: 0; }
/* 长列表渲染优化：跳过屏幕外月份块的布局与绘制，首屏更快 */
.month-block { content-visibility: auto; contain-intrinsic-size: auto 320px; }
.month-head { display: flex; align-items: center; padding: 12px 16px; background: #f5f6f8; color: #666; font-size: 13px; }
.mh-title { font-weight: 600; font-size: 14px; color: #333; }
.mh-bal { flex: 1; text-align: right; margin-right: 8px; }
.month-head .van-icon { color: #aaa; }
.day-block { background: #fff; }
/* 只把 swipe-cell(手势控制区)本身向右挪 30px，背景色(.day-block 白底)铺满不动。
   width:auto 自动补偿外边距，右边界仍贴最右、删除按钮位置不变；
   边缘起手的 target 落在 .day-block 白底而非 swipe-cell，
   swipe-cell 收不到 touch 就不 preventDefault，iOS 系统边缘返回手势得以触发。 */
.day-block :deep(.van-swipe-cell) { margin-left: 30px; }
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
