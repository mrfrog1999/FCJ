<template>
  <div class="page chart-page" :style="{ '--accent': def.color }">
    <!-- 顶部导航 -->
    <van-nav-bar :title="def.title" left-arrow @click-left="$router.back()" @click-right="filterShow = true">
      <template #right><van-icon name="ellipsis" size="20" @click="filterShow = true" /></template>
    </van-nav-bar>

    <!-- 切换图表类型（点击标题下方的小条） -->
    <div class="chart-switch" @click="typePanelShow = true">
      <van-icon name="bars" /> {{ def.title }} <van-icon name="arrow-down" class="cs-arrow" />
    </div>

    <!-- 实心饼图 / 条形图 -->
    <div class="chart-stage">
      <div v-show="!isEmpty" ref="chartRef" class="chart-canvas"></div>
      <!-- 中心磨砂玻璃圆：白色半透明 + backdrop-filter 真模糊，覆盖在饼图中心 -->
      <div v-if="!isEmpty && viewMode === 'pie'" class="pie-center-glass">
        <span class="pcg-label">总计</span>
        <span class="pcg-amount">{{ fmt(total) }}</span>
      </div>
      <van-empty v-if="isEmpty" image-size="80px" description="该条件下暂无数据" />
    </div>

    <!-- 饼图下方的选中分类详情：三角指针 + 胶囊占比 + 明细行（参考图样式） -->
    <div v-if="!isEmpty && viewMode === 'pie' && selected" class="pie-detail">
      <div class="pd-pointer" :style="{ borderTopColor: selectedColor }"></div>
      <div class="pd-capsule" :style="{ color: selectedColor, borderColor: selectedColor }">{{ pctOf(selected.total) }}%</div>
      <div class="pd-row" @click="cycleDetail">
        <span class="pd-name">{{ selected.name }}</span>
        <span class="pd-amt">¥{{ fmt(selected.total) }}</span>
        <van-icon name="arrow" class="pd-arrow" />
      </div>
      <div class="pd-hint">按住饼图旋转，对准箭头查看分类</div>
    </div>

    <!-- 底部分类明细（条形图模式） -->
    <div v-if="!isEmpty && viewMode === 'bar'" class="bar-list card">
      <div class="bl-title">{{ def.title }}排行</div>
      <div v-for="(r, i) in rows" :key="r.name" class="bl-row">
        <span class="bl-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
        <span class="bl-name">{{ r.name }}</span>
        <span class="bl-amt">¥{{ fmt(r.total) }}</span>
        <span class="bl-pct">{{ pctOf(r.total) }}%</span>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div class="bottom-toolbar">
      <div class="time-nav">
        <van-icon name="arrow-left" class="tn-arrow" @click="shiftRange(-1)" />
        <span class="tn-label" @click="timeShow = true">{{ rangeLabel(range) }}</span>
        <van-icon name="arrow" class="tn-arrow" @click="shiftRange(1)" />
      </div>
      <div class="view-switch">
        <span :class="{ on: viewMode === 'pie' }" @click="viewMode = 'pie'">饼图</span>
        <span :class="{ on: viewMode === 'bar' }" @click="viewMode = 'bar'">条形图</span>
      </div>
    </div>

    <!-- 时间范围弹窗（参考图2） -->
    <van-popup v-model:show="timeShow" position="bottom" round :style="{ height: '62%' }">
      <div class="time-sheet">
        <div class="ts-title">统计时间</div>
        <div class="ts-list">
          <div v-for="opt in rangeOptions" :key="opt.value" class="ts-item" :class="{ on: range === opt.value }" @click="pickRange(opt.value)">
            <span>{{ opt.label }}</span>
            <van-icon v-if="range === opt.value" name="success" class="ts-check" />
          </div>
          <div class="ts-item custom" @click="customOn = !customOn">
            <span>自定义</span>
            <van-switch :model-value="customOn" @update:model-value="v => { customOn = v; if (v) range = 'custom' }" size="22" />
          </div>
          <div v-if="customOn" class="custom-dates">
            <van-field v-model="startDate" label="开始" placeholder="2026-01-01" />
            <van-field v-model="endDate" label="结束" placeholder="2026-12-31" />
          </div>
        </div>
        <van-button block type="primary" class="ts-done" @click="applyTime">完成</van-button>
      </div>
    </van-popup>

    <!-- 图表类型选择面板（参考图3 的网格，作为下拉） -->
    <van-popup v-model:show="typePanelShow" position="bottom" round :style="{ height: '78%' }">
      <div class="type-panel">
        <div class="tp-head">
          <span class="tp-hub" @click="goHub"><van-icon name="cluster-o" /> 统计中心</span>
          <span>切换图表</span>
          <van-icon name="close" @click="typePanelShow = false" />
        </div>
        <div class="tp-body">
          <div class="tp-side">
            <div v-for="tab in chartTabs" :key="tab.key" class="tp-side-item" :class="{ on: panelTab === tab.key }" @click="panelTab = tab.key">
              <span class="tpsi-text"><span v-for="(ch, i) in tab.label" :key="i">{{ ch }}</span></span>
            </div>
          </div>
          <div class="tp-grid-wrap">
            <div class="tp-grid">
              <div v-for="key in chartsByTab[panelTab]" :key="key" class="tp-item" :class="{ on: chartKey === key }" :style="{ '--ci': defs[key].color }" @click="chooseChart(key)">
                <div class="tp-ico"><van-icon :name="chartIcon[key] || 'bars'" /></div>
                <div class="tp-label">{{ defs[key].title }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 筛选抽屉（参考图1） -->
    <van-popup v-model:show="filterShow" position="right" :style="{ width: '86%', height: '100%' }">
      <div class="filter-drawer">
        <div class="fd-head">
          <van-icon name="arrow-left" @click="filterShow = false" />
          <span>筛选</span>
          <van-icon name="success" class="fd-ok" @click="applyFilter" />
        </div>
        <div class="fd-body">
          <div class="fd-row" @click="timeShow = true">
            <div class="fd-label"><van-icon name="clock-o" class="fi-time" />时间</div>
            <div class="fd-value">{{ rangeLabel(range) }}<van-icon name="arrow" /></div>
          </div>
          <div class="fd-row" @click="openPick('category')">
            <div class="fd-label"><van-icon name="apps-o" class="fi-cat" />分类</div>
            <div class="fd-value">{{ pickLabel('category') }}<van-icon name="arrow" /></div>
          </div>
          <div class="fd-row" @click="openPick('account')">
            <div class="fd-label"><van-icon name="credit-pay" class="fi-acc" />账户</div>
            <div class="fd-value">{{ pickLabel('account') }}<van-icon name="arrow" /></div>
          </div>
          <div class="fd-row amount-row">
            <div class="fd-label"><van-icon name="balance-o" class="fi-amt" />金额区间</div>
            <div class="amt-range">
              <input v-model="filterDraft.min_amount" type="number" inputmode="decimal" placeholder="最低" />
              <span>-</span>
              <input v-model="filterDraft.max_amount" type="number" inputmode="decimal" placeholder="最高" />
            </div>
          </div>
          <div class="fd-row" @click="openPick('member')">
            <div class="fd-label"><van-icon name="friends-o" class="fi-member" />成员</div>
            <div class="fd-value">{{ pickLabel('member') }}<van-icon name="arrow" /></div>
          </div>
          <div class="fd-row" @click="openPick('project')">
            <div class="fd-label"><van-icon name="folder-o" class="fi-project" />项目</div>
            <div class="fd-value">{{ pickLabel('project') }}<van-icon name="arrow" /></div>
          </div>
          <div class="fd-row" @click="openPick('merchant')">
            <div class="fd-label"><van-icon name="shop-o" class="fi-merchant" />商家</div>
            <div class="fd-value">{{ pickLabel('merchant') }}<van-icon name="arrow" /></div>
          </div>
          <div class="fd-row note-row">
            <div class="fd-label"><van-icon name="description" class="fi-note" />备注</div>
            <input v-model="filterDraft.note" class="note-input" placeholder="填写备注关键词" />
          </div>
        </div>
        <div class="fd-foot">
          <van-button block class="fd-reset" @click="resetFilter">重置</van-button>
          <van-button block type="primary" class="fd-save" @click="applyFilter">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 通用选择弹窗 -->
    <van-popup v-model:show="pickShow" position="bottom" round :style="{ height: '60%' }">
      <div class="pick-sheet">
        <div class="ps-head">选择{{ pickTitle }}</div>
        <div class="ps-list">
          <div class="ps-item" :class="{ on: pickCurrent === '' }" @click="selectPick('')">
            <span>全部</span><van-icon v-if="pickCurrent === ''" name="success" />
          </div>
          <div v-for="o in pickOptions" :key="o.value" class="ps-item" :class="{ on: pickCurrent === o.value }" @click="selectPick(o.value)">
            <span>{{ o.label }}</span><van-icon v-if="pickCurrent === o.value" name="success" />
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { showToast } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import { readCache, writeCache, readCacheAsync, writeCacheAsync } from '../utils/cache'
import {
  chartDefs as defs, chartTabs, chartsByTab, chartIcon,
  PIE_COLORS, RANGE_OPTIONS, rangeLabel, localGroup
} from '../utils/statsCharts'
import { memberName } from '../utils/members'

const route = useRoute()
const router = useRouter()
const store = useStore()

const chartKey = ref(route.query.key || 'expense_category')
if (!defs[chartKey.value]) chartKey.value = 'expense_category'
const def = computed(() => defs[chartKey.value])
const range = ref('all')
const viewMode = ref('pie')
const selectedName = ref('')
const rows = ref([])
const isEmpty = computed(() => !rows.value.length)
const total = computed(() => rows.value.reduce((s, r) => s + r.total, 0))
// 饼图扇区数据：分类过多时把长尾合并成「其他」，避免几十条细碎扇区挤成一团；
// 明细仍完整保留在 rows 里供图例与金额展示。
const PIE_MAX = 10
const pieRows = computed(() => {
  const all = rows.value
  if (all.length <= PIE_MAX + 1) return all
  const head = all.slice(0, PIE_MAX)
  const rest = all.slice(PIE_MAX)
  return [...head, { name: `其他 ${rest.length} 项`, total: rest.reduce((s, r) => s + r.total, 0) }]
})
const selected = computed(() => pieRows.value.find(r => r.name === selectedName.value) || null)

const fmt = n => Number(n || 0).toFixed(2)
const pctOf = v => total.value ? (v / total.value * 100).toFixed(2) : '0.00'
const pieColor = i => PIE_COLORS[i % PIE_COLORS.length]
// 选中项序号 / 颜色（供下方指针、胶囊、明细行与饼图联动）
const selectedIdx = computed(() => selected.value ? pieRows.value.findIndex(r => r.name === selected.value.name) : 0)
const selectedColor = computed(() => pieColor(Math.max(0, selectedIdx.value)))
// ---- 转盘交互：按住饼图旋转，正下方指针（90°）对准哪个扇区就显示该分类 ----
let rotation = 0      // 用户拖动累计的角度偏移（度）
let dragging = null   // 当前拖动状态
const norm360 = a => ((a % 360) + 360) % 360
// 让第 0 项（最大分类）中心正对指针的基准起始角
function baseAngleFor(pie) {
  if (!pie.length) return 90
  const t = pie.reduce((s, r) => s + r.total, 0) || 1
  return pie[0].total / t * 360 / 2 - 90
}
// 指针命中的扇区序号：echarts 绘制起始角 = -startAngle，扇区按数据顺序顺时针排列
function sectorAtPointer(startAngle, pie) {
  const t = pie.reduce((s, r) => s + r.total, 0) || 1
  const pointer = 90 // 正下方（canvas 坐标 y 向下）
  let acc = -startAngle
  for (let i = 0; i < pie.length; i++) {
    const sweep = pie[i].total / t * 360
    const a0 = norm360(acc)
    const a1 = a0 + sweep
    const hit = a1 >= 360 ? (pointer >= a0 || pointer < a1 - 360) : (pointer >= a0 && pointer < a1)
    if (hit) return i
    acc += sweep
  }
  return 0
}
// 让第 i 项中心对准指针所需的 rotation
function rotationForIndex(i) {
  const pie = pieRows.value
  if (!pie.length) return 0
  const t = pie.reduce((s, r) => s + r.total, 0) || 1
  const sweep0 = pie[0].total / t * 360
  let before = 0
  for (let k = 0; k < i; k++) before += pie[k].total / t * 360
  return before + pie[i].total / t * 360 / 2 - sweep0 / 2
}
// 应用旋转：只更新起始角（增量、关动画，保证跟手），并同步指针命中的分类
function applyRotation() {
  if (!chart || viewMode.value !== 'pie' || !pieRows.value.length) return
  const base = baseAngleFor(pieRows.value)
  chart.setOption({ animation: false, series: [{ startAngle: base + rotation }] })
  const idx = sectorAtPointer(base + rotation, pieRows.value)
  const name = pieRows.value[idx]?.name
  if (name && name !== selectedName.value) selectedName.value = name
}
function pointerAngle(e) {
  const rect = chartRef.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI
}
function onPiePointerDown(e) {
  if (viewMode.value !== 'pie' || isEmpty.value || !chartRef.value) return
  dragging = { id: e.pointerId, start: pointerAngle(e), from: rotation }
  try { chartRef.value.setPointerCapture(e.pointerId) } catch (_) {}
}
function onPiePointerMove(e) {
  if (!dragging || dragging.id !== e.pointerId) return
  let d = pointerAngle(e) - dragging.start
  if (d > 180) d -= 360
  if (d < -180) d += 360
  rotation = dragging.from - d // 手指顺时针拖，扇区跟着顺时针转
  applyRotation()
}
function onPiePointerUp(e) {
  if (!dragging || dragging.id !== e.pointerId) return
  try { chartRef.value?.releasePointerCapture(e.pointerId) } catch (_) {}
  dragging = null
}
// 点击明细行：循环切到下一个分类，同时把转盘转到该分类对准指针
function cycleDetail() {
  if (!pieRows.value.length) return
  const i = Math.max(0, selectedIdx.value)
  const next = (i + 1) % pieRows.value.length
  rotation = rotationForIndex(next)
  selectedName.value = pieRows.value[next].name
  applyRotation()
}

// 弹窗状态
const timeShow = ref(false)
const typePanelShow = ref(false)
const panelTab = ref(def.value.tab)
const filterShow = ref(false)
const pickShow = ref(false)
const pickType = ref('')
const pickCurrent = ref('')
const customOn = ref(false)
const startDate = ref('')
const endDate = ref('')
const rangeOptions = RANGE_OPTIONS

// 筛选：生效值 + 草稿值
const filter = ref({ category_id: '', account: '', member_id: '', project: '', merchant: '', min_amount: '', max_amount: '', note: '' })
const filterDraft = ref({ ...filter.value })

// 筛选可选项
const options = ref({ categories: [], accounts: [], merchants: [], projects: [], members: [] })
const pickOptions = computed(() => {
  const m = {
    category: options.value.categories.map(c => ({ value: c.id, label: c.name })),
    account: options.value.accounts.map(a => ({ value: a, label: a })),
    member: options.value.members.map(u => ({ value: u.id, label: u.name })),
    project: options.value.projects.map(p => ({ value: p, label: p })),
    merchant: options.value.merchants.map(p => ({ value: p, label: p }))
  }
  return m[pickType.value] || []
})
const pickTitle = computed(() => ({ category: '分类', account: '账户', member: '成员', project: '项目', merchant: '商家' }[pickType.value] || ''))
function pickLabel(type) {
  const key = { category: 'category_id', account: 'account', member: 'member_id', project: 'project', merchant: 'merchant' }[type]
  const val = filter.value[key]
  if (val === '' || val == null) return '全部'
  const found = pickOptionsFor(type).find(o => String(o.value) === String(val))
  return found ? found.label : '全部'
}
function pickOptionsFor(type) {
  const m = {
    category: options.value.categories.map(c => ({ value: c.id, label: c.name })),
    account: options.value.accounts.map(a => ({ value: a, label: a })),
    member: options.value.members.map(u => ({ value: u.id, label: u.name })),
    project: options.value.projects.map(p => ({ value: p, label: p })),
    merchant: options.value.merchants.map(p => ({ value: p, label: p }))
  }
  return m[type] || []
}

// 图表实例
const chartRef = ref(null)
let chart = null
// 当前已渲染的图表类型：类型切换必须 notMerge 清掉另一类的 xAxis/graphic 残留，
// 同类型内（点扇区选中）走增量更新，避免整图重建重放动画导致卡顿。
let chartKind = ''

function queryParams() {
  const p = { range: range.value }
  if (range.value === 'custom') {
    if (startDate.value) p.start_date = startDate.value
    if (endDate.value) p.end_date = endDate.value
  }
  const f = filter.value
  if (f.category_id !== '') p.category_id = f.category_id
  if (f.account !== '') p.account = f.account
  if (f.member_id !== '') p.member_id = f.member_id
  if (f.project !== '') p.project = f.project
  if (f.merchant !== '') p.merchant = f.merchant
  if (f.min_amount !== '') p.min_amount = f.min_amount
  if (f.max_amount !== '') p.max_amount = f.max_amount
  if (f.note !== '') p.note = f.note
  return p
}

const optionsCacheKey = computed(() => `stats_options_${store.currentBookId}`)

async function loadOptions() {
  try {
    const [fo, members] = await Promise.all([
      api.stats.filterOptions({ book_id: store.currentBookId || undefined }),
      store.members?.length ? Promise.resolve(store.members) : api.books.members(store.currentBookId).catch(() => [])
    ])
    const next = {
      categories: fo.categories || [], accounts: fo.accounts || [],
      merchants: fo.merchants || [], projects: fo.projects || [],
      members: (members || []).map(m => ({ id: m.id, name: memberName(m) }))
    }
    options.value = next
    writeCache(optionsCacheKey.value, next)
  } catch (e) {
    // 离线：读缓存的筛选项，保证筛选面板可用
    const cached = readCache(optionsCacheKey.value)
    if (cached) options.value = cached
  }
}

// 图表数据缓存 key：账本 + 图表 + 时间范围 + 全部筛选条件
const rowsCacheKey = computed(() => {
  const f = filter.value
  const parts = [
    store.currentBookId, chartKey.value, range.value,
    startDate.value, endDate.value,
    f.category_id, f.account, f.member_id, f.project, f.merchant, f.min_amount, f.max_amount, f.note
  ]
  return 'stats_rows_' + parts.map(x => String(x ?? '')).join('|')
})

// 全量流水明细缓存 key（供离线本地聚合，覆盖所有筛选/时间范围组合）
const rawCacheKey = computed(() => `stats_raw_${store.currentBookId}`)

// 在线时用全量明细填一份本地缓存：仅 group 类图表需要，供离线切换筛选时本地聚合
async function cacheRawRecords() {
  const d = def.value
  if (d.source && d.source !== 'budget' && d.source !== 'memberFlow') return
  try {
    const params = { with_transfers: 0 }
    if (store.currentBookId) params.book_id = store.currentBookId
    const list = await api.records.list(params)
    // 解包成纯数组（ref 的响应式 Proxy 无法被结构化克隆）
    await writeCacheAsync(rawCacheKey.value, JSON.parse(JSON.stringify(list)))
  } catch (e) { /* 明细缓存失败不影响主流程 */ }
}

function applyRows(data) {
  rows.value = data.slice().sort((a, b) => b.total - a.total)
  // 数据变化时转盘归零：最大分类正对指针（和参考图一致）
  rotation = 0
  if (!selectedName.value || !pieRows.value.find(r => r.name === selectedName.value)) {
    selectedName.value = pieRows.value[0]?.name || ''
  }
}

async function load() {
  const d = def.value
  try {
    let data = []
    if (d.source === 'accounts') {
      const list = await api.accounts.list({ book_id: store.currentBookId || undefined })
      data = list.filter(a => a.kind === d.kind && Math.abs(Number(a.balance || 0)) > 0.005)
        .map(a => ({ name: a.display_name || a.account, total: Math.abs(Number(a.balance)), icon: a.icon || '', color: a.color || '' }))
    } else if (d.source === 'trend') {
      const params = {}
      if (store.currentBookId) params.book_id = store.currentBookId
      const t = await api.stats.trend({ months: 12, ...params })
      const metric = d.metric === 'both' ? 'income' : d.metric
      data = t.map(x => ({ name: String(x.month).slice(2), total: Number(x[metric] || 0) })).filter(x => x.total > 0)
    } else if (d.source === 'budget') {
      data = await api.stats.group({ type: 'expense', group_by: 'category', ...queryParams() })
    } else if (d.source === 'memberFlow') {
      data = await api.stats.group({ type: 'income', group_by: 'member', ...queryParams() })
    } else {
      data = await api.stats.group({ type: d.type, group_by: d.groupBy, ...queryParams() })
    }
    applyRows(data)
    // 先解包成纯数组再缓存：ref 的响应式 Proxy 无法被结构化克隆，落 localStorage 用同步写入更稳
    writeCache(rowsCacheKey.value, JSON.parse(JSON.stringify(rows.value)))
    // 顺带缓存全量明细，供离线切换筛选时本地聚合（异步、不阻塞图表呈现）
    cacheRawRecords()
    await nextTick()
    renderChart()
  } catch (e) {
    // 离线/弱网：优先用全量明细本地聚合（筛选真正生效），其次读该视图缓存，都不弹网络错误
    let done = false
    const defForGroup = (d.source === 'budget') ? { type: 'expense', groupBy: 'category' }
      : (d.source === 'memberFlow') ? { type: 'income', groupBy: 'member' }
      : (!d.source ? d : null)
    if (defForGroup) {
      const raw = await readCacheAsync(rawCacheKey.value)
      if (Array.isArray(raw) && raw.length) {
        applyRows(localGroup(raw, defForGroup, queryParams()))
        done = true
      }
    }
    if (!done) {
      const cached = readCache(rowsCacheKey.value)
      if (Array.isArray(cached)) { applyRows(cached); done = true }
    }
    if (done) {
      await nextTick()
      renderChart()
    } else {
      // 无缓存可用时维持上一次数据，给出离线提示而非“网络错误”
      if (!rows.value.length) showToast('离线暂无缓存，联网后重试')
    }
  }
}

function renderChart() {
  if (!chartRef.value || isEmpty.value) return
  if (!chart || chart.getDom() !== chartRef.value) {
    if (chart) chart.dispose()
    chartKind = ''
    chart = echarts.init(chartRef.value)
  }
  const data = rows.value
  if (viewMode.value === 'bar') {
    const kindChanged = chartKind !== 'bar'
    chartKind = 'bar'
    chart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}<br/>¥${fmt(p[0].value)}` },
      grid: { left: 6, right: 16, top: 12, bottom: 6, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f2f2f2' } }, axisLabel: { color: '#999', fontSize: 10, formatter: v => v >= 10000 ? (v / 10000).toFixed(0) + '万' : v } },
      yAxis: { type: 'category', data: data.map(r => r.name).reverse(), axisLine: { lineStyle: { color: '#eee' } }, axisLabel: { color: '#666', fontSize: 11 } },
      series: [{
        type: 'bar', barWidth: '55%',
        data: data.map((r, i) => ({ value: r.total, itemStyle: { color: PIE_COLORS[i % PIE_COLORS.length], borderRadius: [0, 5, 5, 0] } })).reverse(),
        label: { show: true, position: 'right', fontSize: 10, color: '#999', formatter: p => '¥' + fmt(p.value) }
      }]
    }, kindChanged)
    return
  }

  // 实心饼图：同色系线性渐变（无立体果冻高光）、无白描边；
  // 中心磨砂玻璃圆与「总计/金额」用 DOM 覆盖层实现（Canvas 无法 backdrop-filter）。
  const pieData = pieRows.value
  const kindChanged = chartKind !== 'pie'
  chartKind = 'pie'
  // 鲜亮线性渐变：先增强饱和度让颜色更纯，再提亮亮端、暗端保持本色不发灰
  const flatColor = (hex) => {
    const c = hex.replace('#', '')
    let r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
    // 增强饱和度：把每个通道推离灰度均值，颜色更鲜艳
    const gray = (r + g + b) / 3
    const sat = (v) => Math.max(0, Math.min(255, Math.round(gray + (v - gray) * 1.32)))
    r = sat(r); g = sat(g); b = sat(b)
    const light = (v) => Math.min(255, Math.round(v + (255 - v) * 0.26))
    return new echarts.graphic.LinearGradient(0, 0, 0.4, 1, [
      { offset: 0, color: `rgb(${light(r)},${light(g)},${light(b)})` },
      { offset: 1, color: `rgb(${r},${g},${b})` }
    ])
  }
  chart.setOption({
    animation: true,
    animationDuration: 360,
    animationDurationUpdate: 240,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,.97)', borderColor: '#eee', borderWidth: 1,
      padding: [9, 13], textStyle: { color: '#333', fontSize: 12 },
      extraCssText: 'box-shadow:0 8px 28px rgba(0,0,0,.12);border-radius:12px;',
      formatter: p => `<div style="font-weight:600;margin-bottom:3px">${p.name}</div>¥${fmt(p.value)} · ${pctOf(p.value)}%`
    },
    series: [{
      type: 'pie',
      radius: '86%', center: ['50%', '50%'], startAngle: baseAngleFor(pieData) + rotation,
      minAngle: pieData.length > 1 ? 2 : 0,
      avoidLabelOverlap: true, label: { show: false }, labelLine: { show: false },
      selectedMode: false,
      // 去掉白色描边：无间隙纯色拼接；去掉所有 shadowBlur（手机端最耗性能）
      itemStyle: { borderColor: 'transparent', borderWidth: 0, borderRadius: 0 },
      // 点击分类不放大扇区
      emphasis: { scale: false },
      data: pieData.map((r, i) => ({
        name: r.name, value: r.total,
        itemStyle: { color: flatColor(pieColor(i)) }
      }))
    }]
  }, kindChanged)
}

// 交互
function pickRange(v) { range.value = v; if (v !== 'custom') customOn.value = false }
function applyTime() {
  if (range.value === 'custom' && (!startDate.value || !endDate.value)) { showToast('请选择开始和结束日期'); return }
  timeShow.value = false
  load()
}
function shiftRange(dir) {
  const idx = RANGE_OPTIONS.findIndex(o => o.value === range.value)
  const next = idx < 0 ? 0 : Math.max(0, Math.min(RANGE_OPTIONS.length - 1, idx + dir))
  range.value = RANGE_OPTIONS[next].value
  load()
}
function chooseChart(key) {
  typePanelShow.value = false
  if (key === chartKey.value) return
  selectedName.value = ''
  router.replace({ name: 'stats', query: { key } })
}
function goHub() {
  typePanelShow.value = false
  router.push({ name: 'stats-hub' })
}
watch(() => route.query.key, k => {
  chartKey.value = (k && defs[k]) ? k : 'expense_category'
  panelTab.value = def.value.tab
  selectedName.value = ''
  load()
})

function openPick(type) {
  pickType.value = type
  const key = { category: 'category_id', account: 'account', member: 'member_id', project: 'project', merchant: 'merchant' }[type]
  pickCurrent.value = String(filterDraft.value[key] ?? '')
  pickShow.value = true
}
function selectPick(v) {
  const key = { category: 'category_id', account: 'account', member: 'member_id', project: 'project', merchant: 'merchant' }[pickType.value]
  filterDraft.value[key] = v
  pickShow.value = false
}
function applyFilter() {
  filter.value = { ...filterDraft.value }
  filterShow.value = false
  load()
}
function resetFilter() {
  const empty = { category_id: '', account: '', member_id: '', project: '', merchant: '', min_amount: '', max_amount: '', note: '' }
  filterDraft.value = { ...empty }
  filter.value = { ...empty }
  filterShow.value = false
  load()
}

function onResize() { chart?.resize() }
watch(viewMode, () => {
  if (viewMode.value === 'pie') rotation = 0
  nextTick(renderChart)
})
watch([() => store.currentBookId], () => load())
function refreshIfNeeded() { load() }
// 服务端数据变更（其它端增删改/本端补传）后重算统计
function onRemotePull() { if (store.ready || store.currentBookId) load() }
onMounted(async () => {
  // 不 await：离线/弱网下 loadBase 卡在网络错误会挡住统计页用缓存渲染
  if (!store.ready) store.loadBase().catch(() => {})
  panelTab.value = def.value.tab
  loadOptions()
  load()
  window.addEventListener('resize', onResize)
  window.addEventListener('ssj:pull', onRemotePull)
  window.addEventListener('ssj:synced', onRemotePull)
  // 转盘：在饼图画布上按住旋转（touch-action:none 防止拖动时页面跟着滚）
  const el = chartRef.value
  if (el) {
    el.addEventListener('pointerdown', onPiePointerDown)
    el.addEventListener('pointermove', onPiePointerMove)
    el.addEventListener('pointerup', onPiePointerUp)
    el.addEventListener('pointercancel', onPiePointerUp)
  }
})
onActivated(() => { nextTick(onResize) })
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('ssj:pull', onRemotePull)
  window.removeEventListener('ssj:synced', onRemotePull)
  const el = chartRef.value
  if (el) {
    el.removeEventListener('pointerdown', onPiePointerDown)
    el.removeEventListener('pointermove', onPiePointerMove)
    el.removeEventListener('pointerup', onPiePointerUp)
    el.removeEventListener('pointercancel', onPiePointerUp)
  }
  chart?.dispose()
})
</script>

<style scoped>
.chart-page { background: #f5f6f8; min-height: 100vh; min-height: 100dvh; padding-bottom: calc(76px + env(safe-area-inset-bottom)); }
:deep(.van-nav-bar) { background: #fff; --van-nav-bar-text-color: #1a1a1a; --van-nav-bar-title-text-color: #1a1a1a; --van-nav-bar-icon-color: #1a1a1a; }

.chart-switch { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 10px auto 0; padding: 6px 16px; width: fit-content; background: #fff; border-radius: 18px; font-size: 13px; font-weight: 600; color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,.05); }
.chart-switch .cs-arrow { color: #bbb; font-size: 12px; }

/* 饼图区不要白底卡片：背景透明、无阴影，饼图直接落在页面上 */
.chart-stage { position: relative; margin: 12px 12px 0; border-radius: 18px; background: transparent; min-height: 460px; box-shadow: none; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-direction: column; }
.chart-canvas { width: 100%; height: 460px; touch-action: none; cursor: grab; }
.chart-canvas:active { cursor: grabbing; }
:deep(.van-empty) { padding: 60px 0; }
/* 中心磨砂玻璃圆：白色半透明 + backdrop-filter 真模糊；绝对定位覆盖在饼图正中 */
.pie-center-glass { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 132px; height: 132px; border-radius: 50%; background: rgba(255,255,255,.55); -webkit-backdrop-filter: blur(10px) saturate(1.3); backdrop-filter: blur(10px) saturate(1.3); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 4px 20px rgba(0,0,0,.08), inset 0 1px 1px rgba(255,255,255,.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; pointer-events: none; z-index: 5; }
.pcg-label { font-size: 12px; color: rgba(255,255,255,.9); text-shadow: 0 1px 3px rgba(0,0,0,.18); }
.pcg-amount { font-size: 19px; font-weight: 700; color: #fff; letter-spacing: .3px; text-shadow: 0 1px 4px rgba(0,0,0,.2); }

/* 饼图下方选中分类详情（参考图样式） */
.pie-detail { display: flex; flex-direction: column; align-items: center; margin-top: 2px; }
/* 指向饼图的三角指针 */
.pd-pointer { width: 0; height: 0; border-left: 11px solid transparent; border-right: 11px solid transparent; border-top: 16px solid #ff5e3a; filter: drop-shadow(0 3px 4px rgba(255,94,58,.35)); margin-bottom: 10px; }
/* 占比胶囊 */
.pd-capsule { padding: 5px 16px; border: 1.5px solid #ff5e3a; border-radius: 20px; font-size: 14px; font-weight: 700; line-height: 1.2; background: #fff; }
/* 明细行 */
.pd-row { display: flex; align-items: center; gap: 8px; margin-top: 20px; padding: 4px 10px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.pd-row:active { opacity: .6; }
.pd-name { font-size: 15px; font-weight: 600; color: #2b2f36; }
.pd-amt { font-size: 15px; font-weight: 600; color: #ff5e3a; }
.pd-arrow { font-size: 13px; color: #c8ccd2; }
.pd-hint { font-size: 11px; color: #b8bcc4; margin-top: 10px; }
.card { background: #fff; border-radius: 14px; margin: 12px; padding: 14px; }
.bl-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
.bl-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
.bl-row:last-child { border-bottom: none; }
.bl-rank { width: 20px; height: 20px; border-radius: 6px; background: #f2f3f5; color: #999; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bl-rank.top { background: var(--accent); color: #fff; }
.bl-name { flex: 1; color: #444; }
.bl-amt { color: #333; font-weight: 600; }
.bl-pct { color: #aaa; width: 48px; text-align: right; }

.bottom-toolbar { position: fixed; left: 12px; right: 12px; bottom: calc(14px + env(safe-area-inset-bottom)); height: 46px; background: #fff; border: 1px solid rgba(0,0,0,.04); border-radius: 23px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 16px; box-shadow: 0 6px 22px rgba(0,0,0,.14); z-index: 101; }
.time-nav { display: flex; align-items: center; gap: 12px; }
.tn-arrow { color: #bbb; font-size: 15px; }
.tn-label { color: #666; font-size: 13px; min-width: 56px; text-align: center; }
.view-switch { display: flex; background: #f5f6f8; border-radius: 18px; padding: 3px; }
.view-switch span { padding: 5px 12px; font-size: 12px; color: #999; border-radius: 15px; }
.view-switch span.on { background: var(--accent); color: #fff; font-weight: 600; }

/* 时间弹窗 */
.time-sheet { padding: 18px 16px 20px; height: 100%; display: flex; flex-direction: column; }
.ts-title { font-size: 16px; font-weight: 700; text-align: center; margin-bottom: 10px; }
.ts-list { flex: 1; overflow-y: auto; }
.ts-item { display: flex; align-items: center; justify-content: space-between; padding: 15px 6px; border-bottom: 1px solid #f5f5f5; font-size: 15px; color: #444; }
.ts-item.on { color: var(--accent); font-weight: 600; }
.ts-check { color: var(--accent); }
.custom-dates { padding: 8px 0; background: #fafbfc; border-radius: 10px; margin-top: 8px; }
.ts-done { background: var(--primary-grad); border: none; border-radius: 10px; margin-top: 12px; }

/* 图表类型面板 */
.type-panel { height: 100%; display: flex; flex-direction: column; }
.tp-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; font-size: 16px; font-weight: 700; border-bottom: 1px solid #f5f5f5; }
.tp-head .van-icon { color: #999; font-size: 18px; }
.tp-head .tp-hub { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; color: var(--primary); }
.tp-head .tp-hub .van-icon { font-size: 14px; color: var(--primary); }
.tp-body { flex: 1; display: flex; min-height: 0; }
.tp-side { width: 66px; flex-shrink: 0; background: #fafbfc; display: flex; flex-direction: column; padding-top: 8px; }
.tp-side-item { height: 56px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; position: relative; }
.tp-side-item .tpsi-text { display: flex; flex-direction: column; align-items: center; line-height: 1.15; }
.tp-side-item.on { background: #fff; color: var(--primary); font-weight: 700; }
.tp-side-item.on::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; background: var(--primary); border-radius: 3px; }
.tp-grid-wrap { flex: 1; min-width: 0; overflow-y: auto; background: linear-gradient(150deg,#fff6f0,#f3fbff,#faf3ff); padding: 14px 10px; }
.tp-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px 6px; }
.tp-item { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 2px; border-radius: 12px; border: 1px solid transparent; }
.tp-item.on { border-color: var(--primary); background: rgba(255,255,255,.85); }
.tp-ico { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--ci); background: #fff; box-shadow: 0 3px 8px rgba(0,0,0,.06); }
.tp-label { font-size: 11px; color: #555; font-weight: 600; }

/* 筛选抽屉 */
.filter-drawer { height: 100%; display: flex; flex-direction: column; background: #fff; }
.fd-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #f5f5f5; font-size: 16px; font-weight: 700; }
.fd-head .van-icon { font-size: 20px; color: #555; }
.fd-head .fd-ok { color: var(--primary); }
.fd-body { flex: 1; overflow-y: auto; }
.fd-row { display: flex; align-items: center; justify-content: space-between; padding: 15px 18px; border-bottom: 1px solid #f7f7f7; min-height: 54px; }
.fd-label { display: flex; align-items: center; gap: 9px; font-size: 14px; color: #333; flex-shrink: 0; }
.fd-label .van-icon { font-size: 17px; }
.fi-time { color: #00b578; } .fi-cat { color: #ec4899; } .fi-acc { color: #fa8c16; }
.fi-amt { color: #5b6ef5; } .fi-member { color: #ec4899; } .fi-project { color: #00b578; }
.fi-merchant { color: #fa8c16; } .fi-note { color: #5b6ef5; }
.fd-value { display: flex; align-items: center; gap: 6px; color: #999; font-size: 13px; }
.fd-value .van-icon { color: #ccc; font-size: 13px; }
.amt-range { display: flex; align-items: center; gap: 6px; }
.amt-range input { width: 74px; height: 30px; border: none; background: #f5f6f8; border-radius: 6px; padding: 0 8px; font-size: 12px; color: #333; text-align: center; }
.amt-range span { color: #ccc; }
.note-input { flex: 1; margin-left: 12px; border: none; outline: none; text-align: right; font-size: 13px; color: #333; background: transparent; }
.note-row { cursor: text; }
.fd-foot { display: flex; gap: 10px; padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid #f5f5f5; }
.fd-foot .van-button { border-radius: 10px; height: 42px; font-weight: 600; }
.fd-reset { background: #f5f6f8; color: #666; border: none; }
.fd-save { background: linear-gradient(90deg,#ffa26b,#ff6b35); border: none; }

/* 通用选择 */
.pick-sheet { height: 100%; display: flex; flex-direction: column; }
.ps-head { padding: 16px; font-size: 16px; font-weight: 700; text-align: center; border-bottom: 1px solid #f5f5f5; }
.ps-list { flex: 1; overflow-y: auto; padding: 6px 0; }
.ps-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #f7f7f7; font-size: 14px; color: #444; }
.ps-item.on { color: var(--primary); font-weight: 600; }
</style>
