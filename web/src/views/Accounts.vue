<template>
  <div class="page account-page">
    <!-- 顶部风景 banner -->
    <div class="hero" :class="{ compact: heroCompact }">
      <div class="navbar">
        <div class="nav-left" @click="$router.back()"><van-icon name="arrow-left" /></div>
        <div class="nav-title">账户</div>
        <div class="nav-right" @click="goEdit">
          <van-icon name="edit" />
        </div>
      </div>
      <div class="hero-sum">
        <div class="hero-label">净资产</div>
        <div class="hero-balance">
          <FlipNumber v-if="bannerReady" :value="fmt(totals.net)" :step="0.05" :card="false" />
          <span v-else class="hero-ph hero-ph-lg"></span>
        </div>
        <div class="hero-sub">
          <span>资产 <b class="income-txt"><FlipNumber v-if="bannerReady" :value="fmt(totals.asset)" :step="0.035" :card="false" /><span v-else class="hero-ph hero-ph-sm"></span></b></span>
          <i></i>
          <span>负债 <b class="expense-txt"><FlipNumber v-if="bannerReady" :value="fmt(totals.liability)" :step="0.035" :card="false" /><span v-else class="hero-ph hero-ph-sm"></span></b></span>
        </div>
      </div>
    </div>

    <van-loading v-if="!loaded" class="page-loading" color="#1ebd7e" />

    <template v-else>
      <!-- 五类账户分组 -->
      <div class="group" v-for="g in groups" :key="g.key">
        <div class="group-head">
          <span>{{ g.name }}</span><span class="gh-amount">{{ fmt(g.sum) }}</span>
        </div>
        <div class="rows">
          <div class="row" v-for="a in g.list" :key="a.account" @click="openDetail(a)">
            <div class="acc-icon">
              <SmartIcon :value="meta(a).icon" :size="28" :color="meta(a).color" />
            </div>
            <div class="row-info">
              <div class="rname">{{ displayName(a) }}</div>
              <div class="rsub" v-if="subLabel(a)">{{ subLabel(a) }}</div>
            </div>
            <div class="ramt">{{ fmt(a.balance) }}</div>
            <van-icon name="arrow" class="rarrow" />
          </div>
        </div>
      </div>

      <van-empty v-if="!accounts.length" description="暂无账户数据" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '../store'
import { readCache, writeCache } from '../utils/cache'
import { api } from '../api'
import { afterNav } from '../utils/afterNav'
import SmartIcon from '../components/SmartIcon.vue'
import FlipNumber from '../components/FlipNumber.vue'
import { categoryOf, CATEGORY_META } from '../utils/accountCategory'
import { showToast } from 'vant'

const store = useStore()
const router = useRouter()
// 冷启动先用本地缓存秒显真实数据（key 含账本）
const accCacheKey = computed(() => `accounts_${store.currentBookId}`)
const cachedAcc = readCache(accCacheKey.value)
const accounts = ref(cachedAcc || [])
const loaded = ref(false)
// 命中缓存立即放行秒显；无缓存则等网络到位再放行，避免先显示 0
const bannerReady = ref(!!(cachedAcc && cachedAcc.length))

// 顶部 banner 吸顶：PWA 全屏时整页滚动会让头部滚走，列表内容直接顶到状态栏底下，
// 和时间/信号图标叠在一起。这里让 banner 吸附在顶部，滚过一屏后收起余额区、
// 只保留导航条（含状态栏底色），保证任何滚动位置状态栏都有干净的背景。
const heroCompact = ref(false)
let scrollTicking = false
// 滚动容器是 #app（body 锁高做 flex，整页滚动移到 #app 内部），不是 window。
// 上次文档流方案里账户页"坏掉"就是这里还在读 window.scrollY（永远为 0）导致 banner 不收起。
const pageScroller = () => document.querySelector('#app')
function onPageScroll() {
  // 橙红 banner 常驻顶部：按用户要求固定、不随页面滚动，不再随滚动收起。
  // heroCompact 恒为 false，整块 hero（白导航 + 橙红数据区）始终吸附在顶部。
}

const fmt = n => Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 显示名：优先用自定义 display_name，否则用原始账户名（保留开头的 emoji 前缀，用户靠它区分账户）
function displayName(a) {
  if (a.display_name) return a.display_name
  return a.account || ''
}
// 裸名：仅用于图标/副标题的关键词匹配，去掉 emoji 前缀避免干扰匹配；不影响列表显示
function bareName(a) {
  return String(a.account || '').replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/gu, '').trim() || displayName(a)
}

// 五类账户分组（公共工具：用户自定义分类优先，否则按名称推断）
function groupSum(list) { return list.reduce((s, a) => s + Number(a.balance || 0), 0) }
const groups = computed(() => CATEGORY_META
  .map(c => {
    const list = accounts.value.filter(a => categoryOf(a) === c.key)
    return { ...c, list, sum: groupSum(list) }
  })
  .filter(g => g.list.length))

const totals = computed(() => {
  let asset = 0, liability = 0
  accounts.value.forEach(a => {
    // 负债账户 balance 即欠款（正数欠钱、负数溢缴款），直接累加；资产账户累加余额
    if (a.kind === 'liability') liability += Number(a.balance || 0)
    else asset += Number(a.balance || 0)
  })
  return { asset, liability, net: asset - liability }
})

// 图标与配色：按账户名关键词匹配
const TYPE_RULES = [
  { re: /微信/, icon: 'wechat', color: '#fff', bg: '#22c55e' },
  { re: /支付宝|余额宝|钱宝/, icon: 'alipay', color: '#fff', bg: '#2f8fe8' },
  { re: /现金|零钱|钱包/, icon: 'wallet', color: '#e0483a', bg: '#fff2ef' },
  { re: /信用卡|花呗|白条|借呗|分期|贷款/, icon: 'walletcard', color: '#fff', bg: '#e0483a' },
  { re: /基金|证券|理财|定期|公积金|医保|食堂|股票/, icon: 'fund', color: '#fff', bg: '#2f8fe8' },
  { re: /银行|卡|借记|储蓄|信用社|邮政/, icon: 'bank', color: '#fff', bg: '#3b7ddd' }
]
function meta(a) {
  // 自定义图标/颜色优先
  if (a.icon) return { icon: a.icon, color: a.color || '#fff', bg: a.color || '#7aa7c7' }
  const name = bareName(a)
  for (const r of TYPE_RULES) if (r.re.test(name)) return r
  return { icon: 'wallet', color: '#fff', bg: '#7aa7c7' }
}

// 副标题（原 App 的账户备注，数据未导入，按常见账户还原）
const SUB_MAP = {
  '建设银行': '工资卡', '工行银行卡': '工资卡', '浦发信用卡': '灵活 +', '浦发卡': '灵活 +',
  '邮储借记卡': '天天盈货币基金', '燕郊工商银行': '燕郊工行贷款卡'
}
function subLabel(a) {
  if (a.note) return a.note
  const name = bareName(a)
  if (SUB_MAP[name]) return SUB_MAP[name]
  if (/信用卡/.test(name)) return '信用卡'
  return ''
}

function goEdit() { router.push('/account-edit') }
function openDetail(a) { router.push({ path: '/account-detail', query: { account: a.account } }) }

let lastVersion = -1
/* silent=true 用于「返回本页」的静默刷新：
   不能把 loaded 置回 false，否则整张列表会被 v-if 卸载，页面高度骤降，
   浏览器会把滚动位置钳到 0 —— 表现为从账户详情返回时被拉回顶部、并闪一下骨架。 */
async function load(silent = false) {
  lastVersion = store.dataVersion
  if (!silent) loaded.value = false
  try {
    const list = await api.accounts.list(store.currentBookId ? { book_id: store.currentBookId } : {})
    accounts.value = list
    writeCache(accCacheKey.value, list)
  } catch (e) { /* 断网保留本地缓存数据，不清空 */ }
  loaded.value = true
  await nextTick()
  bannerReady.value = true
}
watch(() => store.currentBookId, () => load())
function refreshIfNeeded() {
  if (lastVersion !== store.dataVersion) load(true)
}
onMounted(async () => {
  pageScroller()?.addEventListener('scroll', onPageScroll, { passive: true })
  if (!store.ready) await store.loadBase().catch(() => {})
  refreshIfNeeded()
})
onActivated(() => { onPageScroll(); afterNav(() => { if (store.ready) refreshIfNeeded() }) })
onUnmounted(() => pageScroller()?.removeEventListener('scroll', onPageScroll))
</script>

<style scoped>
.account-page { padding-bottom: calc(20px + env(safe-area-inset-bottom)); background: #f5f6f8; min-height: 100vh; }

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
  transition: padding-bottom .24s cubic-bezier(.22,.61,.36,1);
}
.hero.compact { padding-bottom: 0; }
/* 收起时不做滚动锚定补偿，避免浏览器自动调 scrollTop 与阈值判断打架 */
.account-page { overflow-anchor: none; }
.navbar { position: relative; z-index: 2; height: 56px; display: flex; align-items: center; justify-content: flex-start; gap: 8px; padding: 0 14px; color: #1a1a1a; }
.nav-left, .nav-right { display: flex; align-items: center; min-height: 44px; }
.nav-left { min-width: 24px; width: 24px; position: relative; }
.nav-left::before { content: ''; position: absolute; left: -12px; right: -12px; top: -12px; bottom: -12px; }
.nav-left { cursor: pointer; -webkit-tap-highlight-color: transparent; }
.nav-left:active .van-icon { opacity: .5; transform: scale(.9); }
.nav-left .van-icon { font-size: 20px; transition: transform .1s ease, opacity .1s ease; }
.nav-right { justify-content: flex-end; gap: 18px; }
.nav-title { font-size: 16px; font-weight: 600; margin-right: auto; }
/* 导航下方的通栏橙红渐变 banner：全宽、无圆角，净资产/资产/负债白色文字。
   数据区结构与样式与流水页 Detail.vue 完全一致，保证两页 banner 高度逐像素统一。 */
.hero-sum { position: relative; z-index: 2; margin: 0; padding: 10px 20px 16px; border-radius: 0; background: var(--primary-grad); color: #fff; }
.hero-label { font-size: 13px; opacity: .92; }
.hero-balance { font-size: 38px; font-weight: 600; letter-spacing: 0; line-height: 1.15; margin: 2px 0 6px; }
.hero-sub { font-size: 12px; opacity: .98; display: flex; align-items: center; gap: 10px; }
.hero-sub b { font-weight: 600; }
.hero-sub i { display: inline-block; width: 1px; height: 11px; background: rgba(255,255,255,.45); margin: 0 2px; }
.income-txt, .expense-txt { color: #fff; }
/* 数据就绪前的占位：只占位置、完全透明不可见，避免先显示 0 造成跳变 */
.hero-ph { display: inline-block; height: 1em; vertical-align: middle; background: transparent; }
.hero-ph-lg { width: 5.6em; }
.hero-ph-sm { width: 3.4em; }

.page-loading { display: flex; justify-content: center; margin-top: 60px; }

/* 分组 */
.group { margin-top: 10px; }
.group-head { display: flex; align-items: center; justify-content: space-between; padding: 9px 16px; background: #eef0f2; color: #8a9099; font-size: 12px; }
.gh-amount { font-variant-numeric: tabular-nums; }
.rows { background: #fff; }
.row { display: flex; align-items: center; padding: 11px 14px; gap: 11px; border-bottom: 1px solid #f2f3f5; }
.row:last-child { border-bottom: none; }
.row:active { background: #f7f8fa; }
.acc-icon { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.row-info { flex: 1; min-width: 0; }
.rname { font-size: 15px; color: #1a1a1a; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rsub { font-size: 11px; color: #a0a6ad; margin-top: 3px; }
.ramt { font-size: 15px; font-weight: 600; color: #1a1a1a; font-variant-numeric: tabular-nums; }
.rarrow { font-size: 14px; color: #c8ccd0; }
</style>
