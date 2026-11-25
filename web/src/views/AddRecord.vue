<template>
  <div class="add-page" :class="{ 'kp-folded': keypadFold }">
    <!-- 顶部导航 -->
    <div class="navbar">
      <div class="nav-left" @click="back"><van-icon name="arrow-left" /></div>
      <div class="nav-title">{{ isEdit ? '编辑' : '记一笔' }}</div>
      <div class="nav-save" @click="save"><van-icon name="checked" />保存</div>
    </div>

    <!-- 类型 Tab -->
    <div class="type-tabs">
      <div class="tt" :class="{ on: type === 'template' }" @click="switchType('template')">模板</div>
      <div class="tt" :class="{ on: type === 'expense' }" @click="switchType('expense')">支出</div>
      <div class="tt" :class="{ on: type === 'income' }" @click="switchType('income')">收入</div>
      <div class="tt" :class="{ on: type === 'transfer' }" @click="switchType('transfer')">转账</div>
      <div class="tt tt-more" @click="showAllTypes = !showAllTypes"><van-icon name="arrow-down" /></div>
    </div>

    <!-- 金额区 -->
    <div class="amount-area">
      <div class="amount-input" :class="{ income: type === 'income' }">{{ displayAmount }}</div>
    </div>
    <div class="amount-line" :class="{ income: type === 'income' }"></div>

    <!-- 表单区 -->
    <div class="form-area">
      <!-- 分类（转账时隐藏） -->
      <div class="form-row" v-if="type !== 'transfer'" @click="openCat">
        <div class="fr-ico cat"><SvgIcon name="grid" :size="18" color="#ff5c8a" /></div>
        <div class="fr-label">分类</div>
        <div class="fr-value">
          <template v-if="catName">
            {{ catParent }} <span class="arrow-sep">›</span> {{ catName }}
          </template>
          <span v-else class="ph">选择分类</span>
        </div>
        <van-icon name="arrow" class="fr-arrow" />
      </div>

      <!-- 转账：转出/转入账户 -->
      <div class="form-row transfer-account-row" v-if="type === 'transfer'">
        <div class="fr-ico acc"><SvgIcon name="walletcard" :size="18" color="#e8a317" /></div>
        <div class="ta-col" @click="openTransferAccount('from')">
          <div class="ta-label">转出</div>
          <div class="ta-val" :class="{ ph: !fromAccount }">{{ fromAccount || '选择账户' }}<span v-if="fromAccount" class="currency"> (CNY)</span></div>
        </div>
        <div class="ta-swap" @click="swapAccount"><van-icon name="exchange" /></div>
        <div class="ta-col" @click="openTransferAccount('to')">
          <div class="ta-label">转入</div>
          <div class="ta-val" :class="{ ph: !toAccount }">{{ toAccount || '选择账户' }}<span v-if="toAccount" class="currency"> (CNY)</span></div>
        </div>
      </div>

      <!-- 账户（非转账） -->
      <div class="form-row" v-if="type !== 'transfer'" @click="openAccount">
        <div class="fr-ico acc"><SvgIcon name="walletcard" :size="18" color="#e8a317" /></div>
        <div class="fr-label">账户</div>
        <div class="fr-value">
          <template v-if="account">{{ account }} <span class="currency">(CNY)</span></template>
          <span v-else class="ph">选择账户</span>
        </div>
        <van-icon v-if="account" name="cross" class="fr-clear" @click.stop="account = ''" />
        <van-icon v-else name="arrow" class="fr-arrow" />
      </div>

      <!-- 时间 -->
      <div class="form-row" @click="openTime">
        <div class="fr-ico time"><van-icon name="clock-o" size="17" color="#ff5e3a" /></div>
        <div class="fr-label">时间</div>
        <div class="fr-value">{{ timeLabel }}</div>
        <van-icon name="cross" class="fr-clear" @click.stop="resetTime" />
      </div>

      <!-- 成员 -->
      <div class="form-row" @click="openMember">
        <div class="fr-ico member"><SvgIcon name="team" :size="18" color="#ff5c8a" /></div>
        <div class="fr-label">成员</div>
        <div class="fr-value">
          <span v-if="memberNameVal" class="member-val">
            <UserAvatar :avatar="memberAvatarVal" :name="memberNameVal" :color="memberColorVal" :size="20" />
            {{ memberNameVal }}
          </span>
          <span v-else class="ph">选择成员</span>
        </div>
        <van-icon name="cross" class="fr-clear" @click.stop="memberId = currentUserId" />
      </div>

      <!-- 备注 -->
      <div class="form-row note-row">
        <div class="fr-ico note"><SvgIcon name="edit" :size="18" color="#9254de" /></div>
        <div class="fr-label">备注</div>
        <input v-model="note" class="fr-input" placeholder="..." maxlength="40" />
      </div>
    </div>

    <!-- 数字键盘 -->
    <div class="keypad" :class="{ folded: keypadFold }">
      <div class="kp-fold" @click="keypadFold = !keypadFold"><van-icon :name="keypadFold ? 'arrow-up' : 'arrow-down'" /></div>
      <div class="kp-body" v-show="!keypadFold">
        <div class="kp-side">
          <div class="side-btn expense" :class="{ on: type === 'expense' }" @click="switchType('expense')">支出</div>
          <div class="side-btn income" :class="{ on: type === 'income' }" @click="switchType('income')">收入</div>
          <div class="side-btn transfer" :class="{ on: type === 'transfer' }" @click="switchType('transfer')">转账</div>
        </div>
        <div class="kp-grid">
          <div class="key" @click="press('7')">7</div>
          <div class="key" @click="press('8')">8</div>
          <div class="key" @click="press('9')">9</div>
          <div class="key op" @click="press('-')">−</div>

          <div class="key" @click="press('4')">4</div>
          <div class="key" @click="press('5')">5</div>
          <div class="key" @click="press('6')">6</div>
          <div class="key op" @click="press('+')">+</div>

          <div class="key" @click="press('1')">1</div>
          <div class="key" @click="press('2')">2</div>
          <div class="key" @click="press('3')">3</div>
          <div class="key confirm" @click="save">确<br>定</div>

          <div class="key" @click="press('.')">.</div>
          <div class="key" @click="press('0')">0</div>
          <div class="key" @click="press('del')">C</div>
        </div>
      </div>
    </div>

    <!-- 分类选择弹层：一级 -->
    <van-popup v-model:show="catShow" position="bottom" round :style="{ height: '70%' }">
      <div class="picker-pop">
        <div class="picker-head"><span>选择分类</span><van-icon name="cross" @click="catShow = false" /></div>
        <div class="picker-body" v-if="!catSubMode">
          <div class="group-item" v-for="(g, i) in catTree" :key="i" @click="pickCatGroup(g)">
            <span>{{ g.name }}</span><van-icon name="arrow" />
          </div>
        </div>
        <div class="picker-body" v-else>
          <div class="sub-head" @click="catSubMode = false"><van-icon name="arrow-left" /> {{ curGroup.name }}</div>
          <div class="sub-grid">
            <div class="sub-cat" v-for="c in curGroup.children" :key="c.id" @click="pickCat(c)">
              <div class="sc-ico"><CategoryIcon :name="c.name" :icon="c.icon" :size="30" /></div>
              <div class="sc-name">{{ c.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 账户选择 -->
    <van-popup v-model:show="accountShow" position="bottom" round :style="{ height: '70%' }">
      <div class="picker-pop">
        <div class="picker-head"><span>{{ transferTarget === 'from' ? '选择转出账户' : (transferTarget === 'to' ? '选择转入账户' : '选择账户') }}</span><van-icon name="cross" @click="accountShow = false" /></div>
        <div class="picker-search"><van-search v-model="accountKw" placeholder="搜索账户" shape="round" background="#fff" /></div>
        <div class="picker-body">
          <div class="group-item" v-for="a in filteredAccounts" :key="a" @click="pickAccount(a)">
            <span>{{ a }}</span><van-icon name="success" v-if="(transferTarget === 'from' ? fromAccount : transferTarget === 'to' ? toAccount : account) === a" />
          </div>
          <van-empty v-if="!filteredAccounts.length" description="暂无账户" image-size="60px" />
        </div>
      </div>
    </van-popup>

    <!-- 成员选择 -->
    <van-popup v-model:show="memberShow" position="bottom" round>
      <div class="picker-pop">
        <div class="picker-head"><span>选择成员</span><van-icon name="cross" @click="memberShow = false" /></div>
        <div class="picker-body">
          <div class="group-item" v-for="m in members" :key="m.id" @click="pickMember(m)">
            <span class="mi">
              <UserAvatar :avatar="memberAvatar(m)" :name="memberName(m)" :color="memberColor(m.id)" :size="22" />
              {{ memberName(m) }}
            </span>
            <van-icon name="success" v-if="memberId === m.id" />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 时间选择：iOS 风格三列滚轮（日期 / 时 / 分） -->
    <van-popup v-model:show="timeShow" position="bottom" :round="false" @opened="syncWheels">
      <div class="dt-pop">
        <div class="dt-head">
          <span class="dt-cancel" @click="timeShow = false">取消</span>
          <span class="dt-title">{{ dtTitle }}</span>
          <span class="dt-done" @click="confirmTime">完成</span>
        </div>
        <div class="dt-body">
          <div class="dt-highlight"></div>
          <div class="wheel" v-for="col in wheelCols" :key="col.key" :data-key="col.key" :style="{ flex: col.flex || 1 }" :ref="el => setWheel(col.key, el)" @scroll="onWheelScroll(col.key)">
            <div class="wheel-pad"></div>
            <div class="wheel-item" v-for="(opt, oi) in col.options" :key="oi"
              :class="{ on: isCurrent(col, opt) }" @click="col.onPick(opt)">{{ col.label(opt) }}</div>
            <div class="wheel-pad"></div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
// 命名供 App.vue 的 <KeepAlive include="AddRecord"> 精确缓存：
// 记一笔实例常驻内存，反复进出不再重新挂载，消除点击后的挂载空窗。
defineOptions({ name: 'AddRecord' })

import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import { enqueueCreate } from '../utils/offlineSync'
import { notify } from '../utils/notify'
import { readCache, writeCache } from '../utils/cache'
import { takePendingRecord } from '../utils/pendingEdit'
import SvgIcon from '../components/SvgIcon.vue'
import CategoryIcon from '../components/CategoryIcon.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { memberColor, memberName, memberAvatar } from '../utils/members'

const route = useRoute()
const router = useRouter()
const store = useStore()
const isEdit = computed(() => !!route.query.id)
const isTransferEdit = computed(() => !!route.query.id && String(route.query.id).startsWith('transfer_'))

const type = ref('expense')
const amount = ref('')
const catId = ref(null)
const catParent = ref('')
const catName = ref('')
const account = ref('')
const fromAccount = ref('')
const toAccount = ref('')
const transferTarget = ref('') // 'from' | 'to' | ''
const note = ref('')
const memberId = ref(null)
const dateObj = ref(new Date())
const timeShow = ref(false)

// 日期时间滚轮（iOS 风格：日期 / 时 / 分 三列）
const ITEM_H = 44
const draft = ref({ year: 0, month: 0, day: 0, hour: 0, minute: 0 })
const wheelEls = {}
function setWheel(key, el) { if (el) wheelEls[key] = el }
function rangeArr(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r }
function daysInMonth(y, m) { return new Date(y, m, 0).getDate() }
const pad2 = n => String(n).padStart(2, '0')
const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 日期列：以选中日期前后若干天为选项，今天/昨天用中文显示
const today0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()
const DAY_SPAN = 30
const dateOptions = computed(() => {
  const d = draft.value
  const base = new Date(d.year, d.month - 1, d.day)
  const list = []
  for (let off = -DAY_SPAN; off <= DAY_SPAN; off++) {
    const day = new Date(base); day.setDate(base.getDate() + off)
    const diff = Math.round((day.getTime() - today0.getTime()) / 86400000)
    let label
    if (diff === 0) label = '今天'
    else if (diff === -1) label = '昨天'
    else if (diff === 1) label = '明天'
    else label = `${day.getMonth() + 1}月${day.getDate()}日 ${weekNames[day.getDay()]}`
    list.push({ label, y: day.getFullYear(), m: day.getMonth() + 1, d: day.getDate() })
  }
  return list
})
const hourOptions = computed(() => rangeArr(0, 23))
const minuteOptions = computed(() => rangeArr(0, 59))

// 标题：今天 13:49 / 昨天 09:30 / 11月20日 周五 18:00
const dtTitle = computed(() => {
  const d = draft.value
  const day = dateOptions.value.find(o => o.y === d.year && o.m === d.month && o.d === d.day)
  const dayLabel = day ? day.label : `${d.month}月${d.day}日`
  return `${dayLabel} ${pad2(d.hour)}:${pad2(d.minute)}`
})

const wheelCols = computed(() => {
  const d = draft.value
  const curDate = dateOptions.value.find(o => o.y === d.year && o.m === d.month && o.d === d.day)
  return [
    {
      key: 'date', flex: 1.7,
      options: dateOptions.value, current: curDate, label: o => o.label,
      onPick: o => { draft.value = { ...draft.value, year: o.y, month: o.m, day: o.d }; scrollWheelTo('date', false) }
    },
    {
      key: 'hour', flex: 0.8,
      options: hourOptions.value, current: d.hour, label: v => String(v).padStart(2, '0'),
      onPick: v => { draft.value = { ...draft.value, hour: v }; scrollWheelTo('hour', false) }
    },
    {
      key: 'minute', flex: 0.8,
      options: minuteOptions.value, current: d.minute, label: v => String(v).padStart(2, '0'),
      onPick: v => { draft.value = { ...draft.value, minute: v }; scrollWheelTo('minute', false) }
    }
  ]
})
function isCurrent(col, opt) {
  if (col.current && typeof col.current === 'object') return opt.y === col.current.y && opt.m === col.current.m && opt.d === col.current.d
  return opt === col.current
}
const catShow = ref(false)
const catSubMode = ref(false)
const curGroup = ref({ name: '', children: [] })
const accountShow = ref(false)
const accountKw = ref('')
const memberShow = ref(false)
const showAllTypes = ref(false)
const keypadFold = ref(false)
const accounts = ref([])
const catTree = ref([])

const currentUserId = computed(() => store.user?.id)
const members = computed(() => store.members)

const memberNameVal = computed(() => {
  const m = members.value.find(x => x.id === memberId.value)
  return m ? memberName(m) : ''
})
const memberAvatarVal = computed(() => {
  const m = members.value.find(x => x.id === memberId.value)
  return m ? memberAvatar(m) : ''
})
const memberColorVal = computed(() => memberColor(memberId.value))

// 金额显示：0.00 或表达式
const displayAmount = computed(() => {
  if (!amount.value) return '0.00'
  return amount.value
})

const timeLabel = computed(() => {
  const d = dateObj.value
  if (!d) return ''
  const pad = n => String(n).padStart(2, '0')
  const today = new Date()
  const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  const dayPrefix = isToday ? '今天 ' : `${d.getFullYear()}年`
  return dayPrefix + `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const filteredAccounts = computed(() => {
  const kw = accountKw.value.trim()
  if (!kw) return accounts.value
  return accounts.value.filter(a => a.toLowerCase().includes(kw.toLowerCase()))
})

function localDateTime(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function parseDate(s) {
  if (!s) return new Date()
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
  const d = new Date(s)
  return isNaN(d) ? new Date() : d
}

// 用一条记录对象同步填满表单。列表页点击时已经把整条记录传过来（见 utils/pendingEdit），
// 所以编辑页滑进来的第一帧就是这条记录的真实内容，不会先露出空表单再「跳」出数据。
function fillFromRecord(r) {
  const isTransfer = r.type === 'transfer' || String(r.id || '').startsWith('transfer_')
  type.value = isTransfer ? 'transfer' : (['expense', 'income'].includes(r.type) ? r.type : 'expense')
  amount.value = (r.amount === null || r.amount === undefined || r.amount === '') ? '' : Number(r.amount).toFixed(2)
  catId.value = r.category_id || null
  catParent.value = r.category1 || ''
  catName.value = r.category2 || r.category_name || ''
  account.value = r.account || ''
  fromAccount.value = r.from_account || ''
  toAccount.value = r.to_account || ''
  note.value = r.note || ''
  if (r.member_id) memberId.value = r.member_id
  else if (r.user_id) memberId.value = r.user_id
  const d = r.record_date || r.transfer_date
  if (d) dateObj.value = parseDate(d)
}

// 记一笔是 App 级常驻组件（见 App.vue），不会反复挂载/销毁，
// 因此用 watch 路由代替 onActivated：每次真正进入 /add（含冷启动直达、编辑传参变化）时
// 按当前路由重新初始化表单，语义与原来的 onActivated 完全一致。
function initForm() {
  const accKey = 'accounts_' + store.currentBookId
  const cachedTree = readCache('cat_tree')
  const cachedAcc = readCache(accKey)

  // ① 同步阶段：先用本地缓存即时填充，页面首帧即完整，滑入动画期间不做网络等待/大量重渲染
  const initTree = cachedTree || { expense: [], income: [] }
  catTree.value = initTree.expense?.length ? initTree.expense : (initTree.income || [])
  if (cachedAcc?.length) accounts.value = cachedAcc.map(a => a.account).filter(Boolean)

  // 默认成员：优先用账号关联的记账成员，其次登录账号自己，兜底第一个成员
  const bindId = store.user?.bind_member_id
  const defaultMember = store.members.find(m => m.id === bindId)?.id
    || store.members.find(m => m.id === store.user?.id)?.id
    || store.user?.id || store.members[0]?.id || null

  const editId = route.query.id
  const transferEdit = editId && String(editId).startsWith('transfer_')
  const pendingRecord = editId ? takePendingRecord(editId) : null
  const hasPending = !!pendingRecord
  if (!editId) {
    // 新建：同步设好默认表单，立即可交互
    type.value = 'expense'
    amount.value = ''
    catParent.value = ''
    catName.value = ''
    account.value = ''
    fromAccount.value = ''
    toAccount.value = ''
    note.value = ''
    memberId.value = defaultMember
    dateObj.value = new Date()
  } else {
    // 编辑：先用调用方带过来的记录同步填充（首帧即完整），下面再后台拉最新值校准
    if (pendingRecord) fillFromRecord(pendingRecord)
    else if (!memberId.value) memberId.value = defaultMember
  }

  // ② 后台阶段：并行刷新基础数据与缓存，全部不阻塞首屏渲染
  if (!store.ready) store.loadBase().catch(() => {})
  if (!store.members.length) store.loadMembers().catch(() => {})
  Promise.all([
    api.categories.tree().catch(() => null),
    api.accounts.list({ book_id: store.currentBookId }).catch(() => null)
  ]).then(([treeRaw, accs]) => {
    const tree = treeRaw || cachedTree || { expense: [], income: [] }
    if (treeRaw) writeCache('cat_tree', treeRaw)
    if (accs?.length) writeCache(accKey, accs)
    catTree.value = tree.expense?.length ? tree.expense : (tree.income || [])
    const accList = accs?.length ? accs : (cachedAcc || [])
    accounts.value = accList.map(a => a.account).filter(Boolean)
    // 成员列表异步回来后，若此前未定出成员则补全
    if (!editId) {
      const dm = store.members.find(m => m.id === store.user?.bind_member_id)?.id
        || store.members.find(m => m.id === store.user?.id)?.id
        || store.user?.id || store.members[0]?.id || null
      if (!memberId.value && dm) memberId.value = dm
    }
  }).catch(() => {})

  // ③ 编辑模式兜底：只有没拿到「点击时带过来的记录」（刷新直达 / 深链）才请求详情。
  // 已同步填充过的不再发请求，避免回包覆盖用户正在改的内容，也少一次主线程更新。
  if (hasPending) return
  if (transferEdit) {
    // 编辑转账：id 形如 transfer_123
    api.transfers.get(String(editId).replace('transfer_', '')).then(r => {
      fillFromRecord({ ...r, type: 'transfer', id: editId })
      if (!memberId.value) memberId.value = defaultMember
    }).catch(() => showToast('加载转账失败'))
  } else if (editId) {
    // 编辑模式：加载普通收支记录详情
    api.records.get(editId).then(r => {
      fillFromRecord(r)
      if (!memberId.value) memberId.value = defaultMember
    }).catch(() => showToast('加载记录失败'))
  }
}

// 仅在真正处于 /add 时初始化（常驻组件在其它页面时不发无谓请求）
watch(
  () => (route.name === 'add' ? route.fullPath : ''),
  v => { if (v) initForm() },
  { immediate: true }
)

function switchType(t) {
  if (t === 'template') { showToast('模板功能暂未开放'); return }
  type.value = t
  catId.value = null; catParent.value = ''; catName.value = ''
}

// 键盘输入（支持简单 + - 运算）
function press(k) {
  let cur = amount.value
  if (k === 'del') { amount.value = cur.slice(0, -1); return }
  if (k === '+' || k === '-') {
    if (!cur) { if (k === '-') amount.value = '-'; return }
    if (/[+\-]$/.test(cur)) amount.value = cur.slice(0, -1) + k
    else amount.value = cur + k
    return
  }
  if (k === '.') {
    const last = cur.split(/[+\-]/).pop()
    if (!last.includes('.')) amount.value = (cur === '' || /[+\-]$/.test(cur)) ? cur + '0.' : cur + '.'
    return
  }
  // 数字：限制每段两位小数
  const last = cur.split(/[+\-]/).pop()
  if (last.includes('.') && last.split('.')[1].length >= 2) return
  if (cur.replace(/[+\-.]/g, '').length >= 10) return
  if (cur === '0') cur = ''
  amount.value = cur + k
}

function calcAmount(expr) {
  try {
    if (!expr || expr === '-') return NaN
    const parts = expr.match(/[+\-]?[^+\-]+/g) || []
    let sum = 0
    parts.forEach(p => { sum += Number(p) })
    return sum
  } catch (e) { return NaN }
}

function back() { router.back() }

async function save() {
  const amt = calcAmount(amount.value)
  if (!amount.value || isNaN(amt) || amt <= 0) return showToast('请输入金额')

  // 转账
  if (type.value === 'transfer') {
    if (!fromAccount.value) return showToast('请选择转出账户')
    if (!toAccount.value) return showToast('请选择转入账户')
    if (fromAccount.value === toAccount.value) return showToast('转出与转入账户不能相同')
    const payload = {
      book_id: store.currentBookId,
      from_account: fromAccount.value,
      to_account: toAccount.value,
      amount: amt.toFixed(2),
      note: note.value.trim(),
      transfer_date: localDateTime(dateObj.value),
      member_id: memberId.value
    }
    try {
      let offline = false
      if (isTransferEdit.value) {
        await api.transfers.update(String(route.query.id).replace('transfer_', ''), payload)
      } else {
        try { await api.transfers.create(payload) }
        catch (e) {
          if (!e.isNetwork) throw e
          enqueueCreate('transfer.create', payload)
          offline = true
        }
      }
      store.touch()
      if (offline) notify({ title: '已同步到本地', desc: '联网后将自动上传这笔转账', type: 'offline' })
      else showToast('保存成功')
      setTimeout(() => router.back(), 400)
    } catch (e) { showToast(e.message) }
    return
  }

  // 普通收支
  if (type.value === 'expense' && !catId.value) return showToast('请选择分类')
  const payload = {
    book_id: store.currentBookId,
    category_id: catId.value,
    type: type.value,
    amount: amt.toFixed(2),
    note: note.value.trim(),
    record_date: localDateTime(dateObj.value),
    member_id: memberId.value,
    account: account.value,
    category1: catParent.value,
    category2: catName.value
  }
  try {
    let offline = false
    if (isEdit.value) {
      await api.records.update(route.query.id, payload)
    } else {
      try { await api.records.create(payload) }
      catch (e) {
        if (!e.isNetwork) throw e
        enqueueCreate('record.create', payload)
        offline = true
      }
    }
    store.touch()
    if (offline) notify({ title: '已同步到本地', desc: '联网后将自动上传这笔记录', type: 'offline' })
    else showToast('保存成功')
    setTimeout(() => router.back(), 400)
  } catch (e) { showToast(e.message) }
}

// 分类选择
function openCat() {
  const applyTree = tree => {
    if (!tree) tree = { expense: [], income: [] }
    catTree.value = type.value === 'income' && tree.income.length ? tree.income : tree.expense
    catShow.value = true
    catSubMode.value = false
  }
  api.categories.tree().then(tree => {
    writeCache('cat_tree', tree)
    applyTree(tree)
  }).catch(() => applyTree(readCache('cat_tree')))
}
function pickCatGroup(g) { curGroup.value = g; catSubMode.value = true }
function pickCat(c) {
  // 反查所属一级
  const g = catTree.value.find(x => x.children.some(ch => ch.id === c.id))
  catParent.value = g?.name || ''
  catName.value = c.name
  catId.value = c.id
  catShow.value = false
}

function openAccount() { transferTarget.value = ''; accountKw.value = ''; accountShow.value = true }
function openTransferAccount(target) { transferTarget.value = target; accountKw.value = ''; accountShow.value = true }
function swapAccount() { const t = fromAccount.value; fromAccount.value = toAccount.value; toAccount.value = t }
function pickAccount(a) {
  if (transferTarget.value === 'from') fromAccount.value = a
  else if (transferTarget.value === 'to') toAccount.value = a
  else account.value = a
  accountShow.value = false
}
function openMember() { memberShow.value = true }
function pickMember(m) { memberId.value = m.id; memberShow.value = false }
function scrollWheelTo(key, smooth) {
  const col = wheelCols.value.find(c => c.key === key)
  const el = wheelEls[key]
  if (!col || !el) return
  const idx = col.options.findIndex(o => isCurrent(col, o))
  if (idx < 0) return
  if (el.scrollTo) el.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' })
  else el.scrollTop = idx * ITEM_H
}
function syncWheels() {
  wheelCols.value.forEach(c => scrollWheelTo(c.key, false))
}
function openTime() {
  const d = dateObj.value
  draft.value = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() }
  timeShow.value = true
  nextTick(() => nextTick(syncWheels))
}
// 滚动停止后，根据当前列高亮位置同步 draft（滑动选择时标题/值实时联动）
const scrollTimers = {}
function onWheelScroll(key) {
  clearTimeout(scrollTimers[key])
  scrollTimers[key] = setTimeout(() => {
    const el = document.querySelector('.dt-body .wheel[data-key="' + key + '"]')
    const col = wheelCols.value.find(c => c.key === key)
    if (!el || !col) return
    const idx = Math.max(0, Math.min(col.options.length - 1, Math.round(el.scrollTop / ITEM_H)))
    const opt = col.options[idx]
    if (!opt) return
    if (key === 'date') draft.value = { ...draft.value, year: opt.y, month: opt.m, day: opt.d }
    else if (key === 'hour') draft.value = { ...draft.value, hour: opt }
    else if (key === 'minute') draft.value = { ...draft.value, minute: opt }
  }, 100)
}
function confirmTime() {
  // 直接从 DOM 读取三列当前高亮项，避免滑动时 draft 未同步的问题
  wheelCols.value.forEach(col => {
    const el = document.querySelector('.dt-body .wheel[data-key="' + col.key + '"]')
    if (!el) return
    const idx = Math.max(0, Math.min(col.options.length - 1, Math.round(el.scrollTop / ITEM_H)))
    const opt = col.options[idx]
    if (!opt) return
    if (col.key === 'date') draft.value = { ...draft.value, year: opt.y, month: opt.m, day: opt.d }
    else if (col.key === 'hour') draft.value = { ...draft.value, hour: opt }
    else if (col.key === 'minute') draft.value = { ...draft.value, minute: opt }
  })
  const d = draft.value
  dateObj.value = new Date(d.year, d.month - 1, d.day, d.hour, d.minute)
  timeShow.value = false
}
function resetTime() { dateObj.value = new Date() }
</script>

<style scoped>
.add-page { min-height: 100vh; background: #fff; padding-bottom: calc(262px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.add-page.kp-folded { padding-bottom: calc(30px + env(safe-area-inset-bottom)); }
/* 导航栏吸顶：PWA 全屏时页面内容滚动不会顶到状态栏底下与时间/信号重叠 */
.navbar { height: calc(56px + env(safe-area-inset-top)); padding-top: calc(env(safe-area-inset-top) + 10px); display: flex; align-items: center; justify-content: flex-start; padding-left: 14px; padding-right: 16px; position: sticky; top: 0; z-index: 9; background: #fff; border-bottom: 1px solid #f0f0f0; }
.nav-left { font-size: 20px; color: #1a1a1a; width: 24px; min-height: 44px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; -webkit-tap-highlight-color: transparent; position: relative; }
.nav-left::before { content: ''; position: absolute; left: -12px; right: -12px; top: -12px; bottom: -12px; }
.nav-left:active .van-icon { opacity: .5; transform: scale(.9); }
.nav-left .van-icon { transition: transform .1s ease, opacity .1s ease; }
.nav-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-left: 8px; }
.nav-save { display: flex; align-items: center; gap: 3px; margin-left: auto; color: #1a1a1a; font-size: 15px; font-weight: 600; cursor: pointer; }
.type-tabs { display: flex; align-items: center; border-bottom: 1px solid #f2f2f2; padding: 0 12px; height: 44px; }
.tt { flex: 1; text-align: center; font-size: 14px; color: #999; height: 44px; line-height: 44px; position: relative; }
.tt.on { color: #ff9a2e; font-weight: 600; }
.tt.on::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 26px; height: 3px; border-radius: 2px; background: #ff9a2e; }
.tt-more { flex: 0 0 32px; color: #bbb; }
.amount-area { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 18px 10px; }
.amount-input { font-size: 48px; font-weight: 500; color: #00b389; letter-spacing: 1px; line-height: 1.1; word-break: break-all; }
.amount-input.income { color: #ff5e3a; }
.amount-line { height: 2px; margin: 0 18px; background: #00b389; border-radius: 2px; }
.amount-line.income { background: #ff5e3a; }
.form-area { padding: 8px 0; }
.form-row { display: flex; align-items: center; min-height: 52px; padding: 0 16px; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.fr-ico { width: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; }
.fr-label { font-size: 15px; color: #333; width: 40px; flex-shrink: 0; }
.fr-value { flex: 1; font-size: 15px; color: #333; text-align: right; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.fr-value .ph { color: #c8c8c8; }
.arrow-sep { color: #ccc; margin: 0 3px; }
.currency { color: #999; font-size: 13px; }
/* 转账账户行：转出 | 交换 | 转入 */
.transfer-account-row { cursor: default; }
.ta-col { flex: 1; min-width: 0; text-align: center; cursor: pointer; padding: 4px 0; }
.ta-label { font-size: 12px; color: #999; margin-bottom: 4px; }
.ta-val { font-size: 14px; color: #333; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ta-val.ph { color: #c8c8c8; }
.ta-swap { width: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #ff9a2e; font-size: 20px; cursor: pointer; }
.ta-swap:active { transform: scale(.85); }
.fr-arrow { color: #ccc; margin-left: 6px; font-size: 14px; }
.fr-clear { color: #ccc; margin-left: 6px; font-size: 16px; }
.member-val { display: inline-flex; align-items: center; gap: 5px; }
.note-row { cursor: default; }
.fr-input { flex: 1; border: none; outline: none; text-align: right; font-size: 15px; color: #333; background: transparent; }
.fr-input::placeholder { color: #c8c8c8; }

/* 键盘 */
.keypad { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; background: #f7f8fa; border-top: 1px solid #ececec; padding-bottom: env(safe-area-inset-bottom); }
.kp-fold { height: 30px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 18px; }
.kp-body { display: flex; height: 232px; }
.kp-side { width: 58px; flex-shrink: 0; display: flex; flex-direction: column; border-right: 1px solid #e8e8e8; }
.side-btn { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #888; border-bottom: 1px solid #e8e8e8; }
.side-btn.expense.on { color: #00b389; font-weight: 600; background: #fff; }
.side-btn.income.on { color: #ff5e3a; font-weight: 600; background: #fff; }
.side-btn.transfer.on { color: #ff9a2e; font-weight: 600; background: #fff; }
.kp-grid { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
.key { display: flex; align-items: center; justify-content: center; font-size: 22px; color: #222; background: #fff; border-right: 1px solid #eee; border-bottom: 1px solid #eee; cursor: pointer; user-select: none; }
.key:active { background: #eef0f2; }
.key.op { color: #666; font-size: 24px; }
.key.confirm { grid-row: span 2; background: linear-gradient(180deg, #ffb347, #ff9426); color: #fff; font-size: 18px; font-weight: 600; line-height: 1.3; border: none; }
.key.confirm:active { background: #ff8a1a; }

/* 弹层 */
.picker-pop { padding-bottom: env(safe-area-inset-bottom); }
.picker-head { height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #f2f2f2; font-size: 16px; font-weight: 600; }
.picker-head .van-icon { color: #999; font-size: 20px; }
.picker-search { padding: 8px 12px; }
.picker-body { max-height: calc(70vh - 110px); overflow-y: auto; }
.group-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #f5f5f5; font-size: 15px; }
.group-item .van-icon { color: #ccc; }
.group-item .van-icon.success { color: #07c160; }
.mi { display: inline-flex; align-items: center; gap: 8px; }
.sub-head { display: flex; align-items: center; gap: 6px; padding: 12px 16px; font-size: 14px; color: #666; background: #fafafa; }
.sub-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px 4px; padding: 16px 10px; }
.sub-cat { text-align: center; cursor: pointer; }
.sc-ico { width: 48px; height: 48px; margin: 0 auto 5px; display: flex; align-items: center; justify-content: center; }
.sc-name { font-size: 11px; color: #555; }

/* 日期时间选择器：iOS 风格 */
.dt-pop { padding-bottom: env(safe-area-inset-bottom); background: #fff; }
.dt-head { height: 58px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; border-bottom: 1px solid #f2f2f2; }
.dt-cancel { font-size: 16px; color: #8a9099; cursor: pointer; }
.dt-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.dt-done { font-size: 16px; color: #ff6a13; font-weight: 600; cursor: pointer; }
.dt-body { position: relative; display: flex; height: 264px; min-height: 264px; padding: 0 12px; }
.dt-highlight { position: absolute; left: 12px; right: 12px; top: 110px; height: 44px; background: #f4f5f7; border-radius: 10px; pointer-events: none; }
.wheel { flex: 1; height: 264px; min-height: 0; overflow-y: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; scroll-snap-type: y mandatory; }
.wheel::-webkit-scrollbar { display: none; }
.wheel-pad { height: 110px; }
.wheel-item { height: 44px; line-height: 44px; text-align: center; font-size: 17px; color: #b0b4ba; scroll-snap-align: center; cursor: pointer; white-space: nowrap; }
.wheel-item.on { color: #1a1a1a; font-weight: 600; font-size: 18px; }
</style>
