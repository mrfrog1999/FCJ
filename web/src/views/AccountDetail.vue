<template>
  <div class="page account-detail">
    <van-nav-bar :title="account" left-arrow @click-left="$router.back()" />

    <div class="month-nav">
      <van-icon name="arrow-left" @click="changeMonth(-1)" />
      <span>{{ monthLabel }}</span>
      <van-icon name="arrow" @click="changeMonth(1)" />
    </div>

    <div class="gradient-card summary">
      <div class="sum-row">
        <div><div class="lbl">收入</div><div class="val">¥{{ fmt(summary.income) }}</div></div>
        <div><div class="lbl">支出</div><div class="val">¥{{ fmt(summary.expense) }}</div></div>
        <div><div class="lbl">余额变动</div><div class="val" :class="summary.net >= 0 ? 'up' : 'down'">{{ summary.net >= 0 ? '+' : '-' }}¥{{ fmt(Math.abs(summary.net)) }}</div></div>
      </div>
      <div class="sum-sub">
        <span>转入 ¥{{ fmt(summary.transferIn) }}</span>
        <span>转出 ¥{{ fmt(summary.transferOut) }}</span>
        <span>调整 ¥{{ fmt(summary.adjust) }}</span>
      </div>
      <div class="sum-note">当月 {{ summary.count }} 笔 · 转账只在账户间划转，不计入收支；收入/支出不含转账</div>
    </div>

    <div class="legend">
      <span><i class="lg income"></i>收入</span>
      <span><i class="lg expense"></i>支出</span>
      <span><i class="lg transfer"></i>转账</span>
      <span><i class="lg adjust"></i>变更</span>
    </div>

    <div v-if="groups.length">
      <div v-for="g in groups" :key="g.date">
        <div class="g-head flex between">
          <span>{{ g.label }}</span>
          <span class="muted">{{ g.items.length }} 笔</span>
        </div>
        <div v-for="f in g.items" :key="f.flow + '-' + f.id" class="rec">
          <div class="ricon">
            <CategoryIcon :name="flowStyle(f).name" :icon="flowStyle(f).icon" :size="28" />
          </div>
          <div class="rinfo">
            <div class="rname">
              {{ flowTitle(f) }}
              <span v-if="f.member_nickname || f.member_username" class="m-tag" :style="{ color: memberColor(f.member_nickname || f.member_username || '') , background: memberColor(f.member_nickname || f.member_username || '') + '18' }">
                <UserAvatar :avatar="f.member_avatar" :name="memberName(f)" :color="memberColor(f.member_nickname || f.member_username || '')" :size="14" />{{ memberName(f) }}
              </span>
            </div>
            <div class="rnote muted">{{ flowSub(f) }}</div>
          </div>
          <div class="ramt" :class="flowAmountClass(f)">{{ flowAmountText(f) }}</div>
        </div>
      </div>
    </div>
    <van-empty v-else-if="loaded" :description="`${monthLabel}该账户暂无流水`" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../store'
import { api } from '../api'
import CategoryIcon from '../components/CategoryIcon.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { memberName } from '../utils/members'

const route = useRoute()
const store = useStore()
const account = computed(() => route.query.account || '')
const now = new Date()
const month = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const flows = ref([])
const summary = ref({ income: 0, expense: 0, transferIn: 0, transferOut: 0, adjust: 0, net: 0, count: 0 })
const loaded = ref(false)

const fmt = n => Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const monthLabel = computed(() => { const [y, m] = month.value.split('-'); return `${y}年${Number(m)}月` })

// 成员配色复用固定色板（基于名称字符，稳定）
function memberColor(name) {
  const COLORS = ['#ff7a45', '#36cfc9', '#9254de', '#597ef7', '#52c41a', '#faad14', '#ff85c0', '#40a9ff']
  const code = [...String(name || '')].reduce((s, c) => s + c.codePointAt(0), 0)
  return COLORS[code % COLORS.length]
}

function changeMonth(delta) {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function formatDate(dateStr) {
  const d = (dateStr || '').slice(0, 10)
  const [, m, dd] = d.split('-')
  const week = ['周日','周一','周二','周三','周四','周五','周六'][new Date(d).getDay()]
  const t = new Date()
  const tstr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
  const yest = new Date(t); yest.setDate(yest.getDate() - 1)
  const ystr = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`
  const tag = d === tstr ? '今天 ' : d === ystr ? '昨天 ' : ''
  return `${tag}${Number(m)}月${Number(dd)}日 ${week}`
}
const groups = computed(() => {
  const map = {}
  flows.value.forEach(f => {
    const key = (f.date || '').slice(0, 10)
    if (!map[key]) map[key] = { date: key, label: formatDate(key), items: [] }
    map[key].items.push(f)
  })
  return Object.values(map)
})

function flowStyle(f) {
  switch (f.flow) {
    case 'income': return { name: f.category_name, icon: f.category_icon, color: f.category_color || '#1ebd7e', bg: (f.category_color || '#1ebd7e') + '1f' }
    case 'expense': return { name: f.category_name, icon: f.category_icon, color: f.category_color || '#ff6b35', bg: (f.category_color || '#ff6b35') + '1f' }
    case 'transfer_in': return { name: '', icon: 'chartup', color: '#52c41a', bg: '#52c41a1f' }
    case 'transfer_out': return { name: '', icon: 'plane', color: '#1890ff', bg: '#1890ff1f' }
    case 'balance_change': return { name: '', icon: 'wallet', color: '#9254de', bg: '#9254de1f' }
    case 'debt_change': return { name: '', icon: 'walletcard', color: '#faad14', bg: '#faad141f' }
    default: return { name: '', icon: 'more', color: '#999', bg: '#eee' }
  }
}
function flowTitle(f) {
  switch (f.flow) {
    case 'income': return f.category_name || '收入'
    case 'expense': return f.category_name || '支出'
    case 'transfer_in': return `转入 · 来自 ${f.from_account}`
    case 'transfer_out': return `转出 · 至 ${f.to_account}`
    case 'balance_change': return '余额调整'
    case 'debt_change': return '负债调整'
    default: return '流水'
  }
}
function flowSub(f) {
  const base = f.category2 || f.note || ''
  return base || (f.flow === 'transfer_out' || f.flow === 'transfer_in' ? '账户间转账' : '')
}
// 金额的正负与颜色统一按 delta（对账户余额的实际影响）判定，
// 这样信用卡刷卡消费=欠款增加(+)显示橙色、还款=欠款减少(-)显示绿色。
function flowAmountClass(f) {
  return (f.delta >= 0) ? 'amount-out' : 'amount-in'
}
function flowAmountText(f) {
  const d = Number(f.delta || 0)
  return `${d >= 0 ? '+' : '-'}${fmt(Math.abs(d))}`
}

async function load() {
  if (!account.value) return
  loaded.value = false
  const params = { account: account.value, month: month.value }
  if (store.currentBookId) params.book_id = store.currentBookId
  try {
    const res = await api.accounts.detail(params)
    flows.value = res.flows || []
    summary.value = res.summary || { income: 0, expense: 0, net: 0, count: 0 }
  } catch (e) { flows.value = [] }
  loaded.value = true
}
watch([month, () => store.currentBookId], load)
onMounted(async () => {
  if (!store.ready) await store.loadBase().catch(() => {})
  load()
})
</script>

<style scoped>
.account-detail { padding-bottom: calc(24px + env(safe-area-inset-bottom)); }
.month-nav { display: flex; align-items: center; justify-content: center; gap: 18px; padding: 12px; font-size: 15px; font-weight: 600; color: #333; }
.summary { margin: 0 12px 6px; border-radius: 14px; padding: 16px 18px 18px; }
.sum-row { display: flex; justify-content: space-around; text-align: center; }
.sum-row .lbl { font-size: 12px; opacity: .85; }
.sum-row .val { font-size: 18px; font-weight: 600; margin-top: 4px; }
.sum-row .val.up { color: var(--income); }
.sum-row .val.down { color: var(--expense); }
.sum-sub { display: flex; justify-content: center; gap: 14px; font-size: 11px; opacity: .85; margin-top: 12px; }
.sum-note { text-align: center; font-size: 10px; opacity: .7; margin-top: 8px; line-height: 1.5; }
.legend { display: flex; justify-content: center; gap: 16px; padding: 10px 0 4px; font-size: 11px; color: #999; }
.legend span { display: flex; align-items: center; gap: 4px; }
.lg { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.lg.income { background: #1ebd7e; } .lg.expense { background: #ff6b35; }
.lg.transfer { background: #1890ff; } .lg.adjust { background: #9254de; }
.g-head { font-size: 13px; font-weight: 600; background: #f5f6f8; padding: 8px 16px; }
.rec { display: flex; align-items: center; background: #fff; padding: 11px 16px; gap: 12px; }
.ricon { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rinfo { flex: 1; min-width: 0; }
.rname { font-size: 14px; display: flex; align-items: center; gap: 6px; }
.m-tag { font-size: 10px; padding: 2px 6px; border-radius: 8px; font-weight: 500; flex-shrink: 0; display: inline-flex; align-items: center; gap: 3px; }
.rnote { font-size: 11px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ramt { font-size: 16px; font-weight: 600; }
.amount-in { color: #1ebd7e; }
.amount-out { color: #ff6b35; }
.muted { color: #999; }
</style>
