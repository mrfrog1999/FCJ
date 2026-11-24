<template>
  <div class="page chart-page" :style="{ '--accent': def.color }">
    <!-- 顶部导航 -->
    <van-nav-bar :title="def.title" left-text="返回" left-arrow @click-left="$router.back()" @click-right="filterShow = true">
      <template #right><van-icon name="ellipsis" size="20" @click="filterShow = true" /></template>
    </van-nav-bar>

    <!-- 切换图表类型（点击标题下方的小条） -->
    <div class="chart-switch" @click="typePanelShow = true">
      <van-icon name="bars" /> {{ def.title }} <van-icon name="arrow-down" class="cs-arrow" />
    </div>

    <!-- 立体饼图 / 条形图 -->
    <div class="chart-stage">
      <div v-show="!isEmpty" ref="chartRef" class="chart-canvas"></div>
      <van-empty v-if="isEmpty" image-size="80px" description="该条件下暂无数据" />

      <!-- 选中项信息（饼图模式） -->
      <div v-if="!isEmpty && viewMode === 'pie' && selected" class="picked-info">
        <div class="picked-pct">{{ pctOf(selected.total) }}%</div>
        <div class="picked-row">
          <span class="picked-name">{{ selected.name }}</span>
          <span class="picked-amt">¥{{ fmt(selected.total) }}</span>
          <van-icon name="arrow" class="picked-arrow" />
        </div>
      </div>
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
            <div class="fd-label"><van-icon name="cluster-o" class="fi-project" />项目</div>
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
import {
  chartDefs as defs, chartTabs, chartsByTab, chartIcon,
  PIE_COLORS, shade, RANGE_OPTIONS, rangeLabel
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
const selected = computed(() => rows.value.find(r => r.name === selectedName.value) || rows.value[0] || null)

const fmt = n => Number(n || 0).toFixed(2)
const pctOf = v => total.value ? (v / total.value * 100).toFixed(2) : '0.00'

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

async function loadOptions() {
  try {
    const [fo, members] = await Promise.all([
      api.stats.filterOptions({ book_id: store.currentBookId || undefined }),
      store.members?.length ? Promise.resolve(store.members) : api.books.members(store.currentBookId).catch(() => [])
    ])
    options.value = {
      categories: fo.categories || [], accounts: fo.accounts || [],
      merchants: fo.merchants || [], projects: fo.projects || [],
      members: (members || []).map(m => ({ id: m.id, name: memberName(m) }))
    }
  } catch (e) { /* 筛选项加载失败不阻断图表 */ }
}

async function load() {
  try {
    const d = def.value
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
    rows.value = data.sort((a, b) => b.total - a.total)
    if (!rows.value.find(r => r.name === selectedName.value)) selectedName.value = rows.value[0]?.name || ''
    await nextTick()
    renderChart()
  } catch (e) { showToast(e.message || '加载失败') }
}

function renderChart() {
  if (!chartRef.value || isEmpty.value) return
  if (!chart || chart.getDom() !== chartRef.value) {
    if (chart) chart.dispose()
    chart = echarts.init(chartRef.value)
    chart.on('click', p => {
      if (p.name) { selectedName.value = p.name; if (viewMode.value === 'pie') renderChart() }
    })
  }
  const data = rows.value
  if (viewMode.value === 'bar') {
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
    }, true)
    return
  }

  // 立体饼图：底层深色做厚度 + 表层渐变
  const mkData = dark => data.map((r, i) => {
    const c = PIE_COLORS[i % PIE_COLORS.length]
    return {
      name: r.name, value: r.total, selected: r.name === selected.value?.name,
      itemStyle: {
        color: dark ? shade(c, -0.28) : new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: shade(c, 0.28) }, { offset: 1, color: c }
        ]),
        borderColor: dark ? shade(c, -0.35) : 'rgba(255,255,255,.55)',
        borderWidth: dark ? 0 : 1.5
      }
    }
  })
  // 立体效果：底层深色饼图整体下移（约6px）形成厚度，表层为渐变亮色
  chart.setOption({
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/>¥${fmt(p.value)} (${pctOf(p.value)}%)` },
    graphic: [{
      type: 'circle', shape: { r: 58 },
      style: { fill: 'rgba(255,255,255,.92)', shadowBlur: 12, shadowColor: 'rgba(0,0,0,.12)' },
      z: 10, silent: true, left: 'center', top: 'middle'
    }, {
      type: 'text', left: 'center', top: '43%',
      style: { text: '总计', fill: '#999', fontSize: 11, align: 'center' }, z: 11, silent: true
    }, {
      type: 'text', left: 'center', top: '52%',
      style: { text: '¥' + fmt(total.value), fill: '#333', fontSize: 16, fontWeight: 'bold', align: 'center' }, z: 11, silent: true
    }],
    series: [
      { type: 'pie', radius: ['34%', '66%'], center: ['50%', '52%'], silent: true, z: 1,
        label: { show: false }, labelLine: { show: false }, data: mkData(true) },
      { type: 'pie', radius: ['34%', '66%'], center: ['50%', '50%'], z: 3,
        avoidLabelOverlap: true, label: { show: false }, labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 6 }, data: mkData(false) }
    ]
  }, true)
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
  router.replace({ name: 'stats-chart', query: { key } })
}
watch(() => route.query.key, k => {
  if (k && defs[k]) { chartKey.value = k; panelTab.value = def.value.tab; selectedName.value = ''; load() }
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
watch(viewMode, () => nextTick(renderChart))
watch([() => store.currentBookId], () => load())
function refreshIfNeeded() { load() }
onMounted(async () => {
  if (!store.ready) await store.loadBase().catch(() => {})
  panelTab.value = def.value.tab
  await loadOptions()
  load()
  window.addEventListener('resize', onResize)
})
onActivated(() => { nextTick(onResize) })
onUnmounted(() => { window.removeEventListener('resize', onResize); chart?.dispose() })
</script>

<style scoped>
.chart-page { background: #f5f6f8; min-height: 100vh; padding-bottom: 90px; }
:deep(.van-nav-bar) { background: #fff; }

.chart-switch { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 10px auto 0; padding: 6px 16px; width: fit-content; background: #fff; border-radius: 18px; font-size: 13px; font-weight: 600; color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,.05); }
.chart-switch .cs-arrow { color: #bbb; font-size: 12px; }

.chart-stage { position: relative; margin: 12px; border-radius: 16px; background: #fff; min-height: 360px; box-shadow: 0 4px 18px rgba(0,0,0,.05); overflow: hidden; display: flex; align-items: center; justify-content: center; flex-direction: column; }
.chart-canvas { width: 100%; height: 340px; }
:deep(.van-empty) { padding: 60px 0; }

.picked-info { display: flex; flex-direction: column; align-items: center; padding: 0 0 18px; }
.picked-pct { padding: 3px 14px; border: 1px solid var(--accent); color: var(--accent); border-radius: 14px; font-size: 13px; font-weight: 700; }
.picked-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 14px; }
.picked-name { color: #333; font-weight: 600; }
.picked-amt { color: var(--accent); font-weight: 700; }
.picked-arrow { color: #ccc; font-size: 13px; }

.card { background: #fff; border-radius: 14px; margin: 12px; padding: 14px; }
.bl-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
.bl-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
.bl-row:last-child { border-bottom: none; }
.bl-rank { width: 20px; height: 20px; border-radius: 6px; background: #f2f3f5; color: #999; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bl-rank.top { background: var(--accent); color: #fff; }
.bl-name { flex: 1; color: #444; }
.bl-amt { color: #333; font-weight: 600; }
.bl-pct { color: #aaa; width: 48px; text-align: right; }

.bottom-toolbar { position: fixed; left: 12px; right: 12px; bottom: calc(82px + env(safe-area-inset-bottom)); height: 46px; background: #fff; border-radius: 23px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 16px; box-shadow: 0 4px 18px rgba(0,0,0,.1); z-index: 20; }
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
