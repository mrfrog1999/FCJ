<template>
  <div class="page edit-page">
    <!-- 顶部导航 -->
    <div class="topbar">
      <div class="nav-left" @click="$router.back()"><van-icon name="arrow-left" /></div>
      <div class="nav-title">编辑账户</div>
      <div class="nav-right"><span class="save-btn" @click="saveSort">保存</span></div>
    </div>

    <div class="tip">按分类显示账户 · 拖动右侧把手调整组内顺序，点击账户可编辑名称、图标与分类</div>

    <van-loading v-if="!loaded" class="page-loading" color="#1ebd7e" />

    <div v-else class="acc-list">
      <div class="group" v-for="g in groups" :key="g.key">
        <div class="group-head">
          <span>{{ g.name }}</span><span class="gh-count">{{ g.list.length }} 个账户</span>
        </div>
        <TransitionGroup name="acc" tag="div" class="rows">
          <div
            class="acc-item"
            v-for="a in g.list"
            :key="a.account"
            :data-account="a.account"
            draggable="true"
            @dragstart="onDragStart(a)"
            @dragover.prevent="onDragOver($event)"
            @dragend="onDragEnd"
            :class="{ dragging: dragAccount === a.account }"
          >
            <div class="acc-inner">
              <div class="acc-icon">
                <SmartIcon :value="iconName(a)" :size="28" :color="iconColor(a)" />
              </div>
              <div class="acc-info" @click="openDetail(a)">
                <div class="a-name">{{ displayName(a) }}</div>
                <div class="a-balance">{{ fmt(a.balance) }}</div>
              </div>
              <div class="drag-handle" @touchstart.prevent="onTouchStart(a, $event)" @touchmove.prevent="onTouchMove($event)" @touchend="onTouchEnd">
                <van-icon name="bars" />
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
      <van-empty v-if="!list.length" description="暂无账户" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '../store'
import { api } from '../api'
import SmartIcon from '../components/SmartIcon.vue'
import { categoryOf, CATEGORY_META } from '../utils/accountCategory'
import { showToast } from 'vant'

const store = useStore()
const router = useRouter()
const list = ref([])
const loaded = ref(false)
const fmt = n => Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 按分类分组，组内保持当前排序
const groups = computed(() => CATEGORY_META
  .map(c => ({ ...c, list: list.value.filter(a => categoryOf(a) === c.key) }))
  .filter(g => g.list.length))

const TYPE_RULES = [
  { re: /微信/, icon: 'wechat', color: '#fff' },
  { re: /支付宝|余额宝|钱宝/, icon: 'alipay', color: '#fff' },
  { re: /现金|零钱|钱包/, icon: 'wallet', color: '#e0483a' },
  { re: /信用卡|花呗|白条|借呗|分期|贷款/, icon: 'walletcard', color: '#fff' },
  { re: /基金|证券|理财|定期|公积金|医保|食堂|股票/, icon: 'fund', color: '#fff' },
  { re: /银行|卡|借记|储蓄|信用社|邮政/, icon: 'bank', color: '#fff' }
]
function displayName(a) {
  if (a.display_name) return a.display_name
  return String(a.account || '').replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/gu, '').trim() || a.account
}
function iconName(a) {
  if (a.icon) return a.icon
  const n = displayName(a)
  for (const r of TYPE_RULES) if (r.re.test(n)) return r.icon
  return 'wallet'
}
function iconColor(a) {
  if (a.icon) return a.color || '#fff'
  const n = displayName(a)
  for (const r of TYPE_RULES) if (r.re.test(n)) return r.color
  return '#fff'
}

// 拖拽排序：选中项浮起 + 组内实时重排（TransitionGroup 提供动画）；跨组拖动不改分类
const dragAccount = ref('')
let dragCat = ''

function accountFromPoint(x, y) {
  const el = document.elementFromPoint(x, y)
  const item = el && el.closest('.acc-item')
  return item ? item.getAttribute('data-account') : null
}
function reorderTo(target) {
  if (!target || target === dragAccount.value) return
  const arr = list.value.slice()
  const tgt = arr.find(x => x.account === target)
  if (!tgt || categoryOf(tgt) !== dragCat) return   // 只允许同组重排
  const from = arr.findIndex(x => x.account === dragAccount.value)
  const to = arr.findIndex(x => x.account === target)
  if (from < 0 || to < 0) return
  const [it] = arr.splice(from, 1)
  arr.splice(to, 0, it)
  list.value = arr
}

// 桌面端 HTML5 拖拽
function onDragStart(a) { dragAccount.value = a.account; dragCat = categoryOf(a) }
function onDragOver(e) { if (dragAccount.value) reorderTo(accountFromPoint(e.clientX, e.clientY)) }
function onDragEnd() { dragAccount.value = ''; dragCat = '' }

// 移动端触摸拖拽（把手）
function onTouchStart(a) { dragAccount.value = a.account; dragCat = categoryOf(a) }
function onTouchMove(e) {
  if (!dragAccount.value) return
  const t = e.touches[0]
  reorderTo(accountFromPoint(t.clientX, t.clientY))
}
function onTouchEnd() { dragAccount.value = ''; dragCat = '' }

async function saveSort() {
  try {
    await api.accounts.sort({ book_id: store.currentBookId, accounts: list.value.map(a => a.account) })
    store.touch()
    showToast('顺序已保存')
    router.back()
  } catch (e) { showToast(e.message || '保存失败') }
}

function openDetail(a) { router.push({ path: '/account-detail-edit', query: { account: a.account } }) }

onMounted(async () => {
  if (!store.ready) await store.loadBase().catch(() => {})
  try {
    list.value = await api.accounts.list(store.currentBookId ? { book_id: store.currentBookId } : {})
  } catch (e) { list.value = [] }
  loaded.value = true
})
</script>

<style scoped>
.edit-page { min-height: 100vh; padding-bottom: calc(20px + env(safe-area-inset-bottom)); background: #f5f6f8; }
.topbar { position: sticky; top: 0; z-index: 10; height: calc(52px + env(safe-area-inset-top)); padding-top: env(safe-area-inset-top); background: linear-gradient(135deg,#ff9a44 0%,#ff6b35 48%,#f0472d 100%); color: #fff; display: flex; align-items: center; justify-content: space-between; padding-left: 14px; padding-right: 14px; box-sizing: border-box; }
.nav-left { min-width: 60px; font-size: 20px; }
.nav-title { font-size: 16px; font-weight: 600; }
.nav-right { min-width: 60px; text-align: right; }
.save-btn { font-size: 14px; font-weight: 600; }
.tip { font-size: 12px; color: #999; padding: 12px 16px; line-height: 1.5; }
.page-loading { display: flex; justify-content: center; margin-top: 60px; }

.acc-list { background: #f5f6f8; }
.group { margin-top: 10px; }
.group-head { display: flex; align-items: center; justify-content: space-between; padding: 9px 16px; background: #eef0f2; color: #8a9099; font-size: 12px; }
.gh-count { font-variant-numeric: tabular-nums; }
.rows { background: #fff; }
.acc-item { position: relative; background: #fff; }
.acc-inner { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid #f2f3f5; background: #fff; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; will-change: transform; }
.rows .acc-item:last-child .acc-inner { border-bottom: none; }
/* 列表重排时其他项平滑让位 */
.acc-move { transition: transform .28s cubic-bezier(.22,.61,.36,1); }
/* 拖动中：选中项浮起 */
.acc-item.dragging { z-index: 100; pointer-events: none; }
.acc-item.dragging .acc-inner {
  transform: translateY(-3px) scale(1.04);
  box-shadow: 0 12px 30px rgba(0,0,0,.2), 0 2px 8px rgba(0,0,0,.1);
  border-radius: 12px;
  border-bottom-color: transparent;
}
.acc-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.acc-info { flex: 1; min-width: 0; cursor: pointer; }
.a-name { font-size: 15px; color: #222; font-weight: 500; }
.a-balance { font-size: 12px; color: #999; margin-top: 3px; }
.drag-handle { color: #bbb; font-size: 20px; padding: 8px; cursor: grab; touch-action: none; }
</style>
