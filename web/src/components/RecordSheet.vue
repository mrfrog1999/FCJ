<template>
  <van-popup :show="show" position="bottom" round :style="{ height: '88%' }" @update:show="v => emit('update:show', v)">
    <div class="sheet">
      <div class="head">
        <div class="type-switch">
          <span :class="{ on: type === 'expense' }" @click="setType('expense')">支出</span>
          <span :class="{ on: type === 'income' }" @click="setType('income')">收入</span>
        </div>
        <van-icon name="cross" size="20" color="#999" @click="close" />
      </div>

      <div class="amount-box"><span class="cur">¥</span><span class="num">{{ displayAmount }}</span></div>

      <div class="member-row" v-if="members.length">
        <div class="member-label"><SvgIcon name="team" :size="14" color="#999" /> 成员</div>
        <div class="member-list">
          <div v-for="m in members" :key="m.id" class="member-chip" :class="{ sel: memberId === m.id }" @click="memberId = m.id">
            <UserAvatar :avatar="memberAvatar(m)" :name="memberName(m)" :color="memberColor(m.id)" :size="22" />
            <span class="mname">{{ memberName(m) }}</span>
          </div>
        </div>
      </div>

      <div class="cats">
        <div v-for="c in cats" :key="c.id" class="cat" :class="{ sel: catId === c.id }" @click="catId = c.id">
          <div class="cico"><CategoryIcon :name="c.name" :icon="c.icon" :size="30" /></div>
          <div class="cname">{{ c.name }}</div>
        </div>
      </div>

      <div class="meta">
        <van-field v-model="note" placeholder="点此填写备注" :border="false" class="note-field" maxlength="30" />
        <div class="date-btn" @click="showDate = true"><SvgIcon name="calendar" :size="15" color="#888" /> {{ date }}</div>
      </div>

      <div class="keypad">
        <div v-for="(k, i) in keys" :key="i" class="key" @click="press(k)">{{ kLabel(k) }}</div>
      </div>

      <button class="save" @click="save">保存</button>
    </div>
  </van-popup>

  <van-popup v-model:show="showDate" position="bottom" round>
    <van-date-picker v-model="dateArr" title="选择日期" :max-date="todayArr" @confirm="onDate" @cancel="showDate = false" />
  </van-popup>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { showToast } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import SvgIcon from './SvgIcon.vue'
import CategoryIcon from './CategoryIcon.vue'
import UserAvatar from './UserAvatar.vue'
import { memberColor, memberName, memberAvatar } from '../utils/members'

const props = defineProps({ show: Boolean, record: Object })
const emit = defineEmits(['update:show', 'saved'])
const store = useStore()

const type = ref('expense')
const amount = ref('')
const catId = ref(null)
const note = ref('')
const date = ref('')
const memberId = ref(null)
const showDate = ref(false)
const dateArr = ref([])
const keys = ['7','8','9','4','5','6','1','2','3','.','0','del']

function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const today = localDate(new Date())
const todayArr = today.split('-')

const cats = computed(() => type.value === 'expense' ? store.expenseCats : store.incomeCats)
const displayAmount = computed(() => amount.value || '0')
const members = computed(() => store.members)

watch(() => props.show, async (v) => {
  if (!v) return
  // 确保成员列表就绪（弹窗可能在数据加载前打开）
  if (!store.members.length) await store.loadMembers()
  const defaultMember = store.members.find(m => m.id === store.user?.id)?.id || store.user?.id || store.members[0]?.id || null
  if (props.record) {
    const r = props.record
    type.value = r.type
    amount.value = String(r.amount)
    catId.value = r.category_id
    note.value = r.note || ''
    date.value = r.record_date
    memberId.value = r.member_id || r.user_id || defaultMember
  } else {
    type.value = 'expense'
    amount.value = ''
    catId.value = cats.value[0]?.id || null
    note.value = ''
    date.value = today
    memberId.value = defaultMember
  }
  dateArr.value = date.value.split('-')
})

function setType(t) {
  type.value = t
  catId.value = (t === 'expense' ? store.expenseCats : store.incomeCats)[0]?.id || null
}
function kLabel(k) { return k === 'del' ? '⌫' : k }
function press(k) {
  if (k === 'del') { amount.value = amount.value.slice(0, -1); return }
  if (k === '.') {
    if (!amount.value.includes('.')) amount.value = (amount.value || '0') + '.'
    return
  }
  if (amount.value.includes('.') && amount.value.split('.')[1].length >= 2) return
  if (amount.value === '0') amount.value = ''
  if (amount.value.replace('.', '').length >= 10) return
  amount.value += k
}
function close() { emit('update:show', false) }
function onDate({ selectedValues }) {
  date.value = selectedValues.join('-')
  showDate.value = false
}
async function save() {
  if (!amount.value || Number(amount.value) <= 0) return showToast('请输入金额')
  if (!catId.value) return showToast('请选择分类')
  const data = {
    book_id: store.currentBookId,
    category_id: catId.value,
    type: type.value,
    amount: Number(amount.value).toFixed(2),
    note: note.value.trim(),
    record_date: date.value,
    member_id: memberId.value
  }
  try {
    if (props.record?.id) await api.records.update(props.record.id, data)
    else await api.records.create(data)
    store.touch()
    showToast('保存成功')
    emit('saved')
  } catch (e) { showToast(e.message) }
}
</script>

<style scoped>
.sheet { display: flex; flex-direction: column; height: 100%; background: #fff; }
.head { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px 6px; }
.type-switch { display: flex; gap: 24px; }
.type-switch span { font-size: 16px; color: #999; padding-bottom: 6px; position: relative; }
.type-switch span.on { color: #1a1a1a; font-weight: 700; font-size: 18px; }
.type-switch span.on::after { content: ''; position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); width: 22px; height: 3px; border-radius: 2px; background: var(--primary); }
.amount-box { display: flex; align-items: baseline; padding: 10px 18px 6px; }
.amount-box .cur { font-size: 22px; margin-right: 6px; color: #333; }
.amount-box .num { font-size: 40px; font-weight: 600; color: #1a1a1a; letter-spacing: 1px; }
.member-row { display: flex; align-items: center; gap: 10px; padding: 2px 14px 8px; }
.member-label { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #999; flex-shrink: 0; }
.member-list { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0; scrollbar-width: none; }
.member-list::-webkit-scrollbar { display: none; }
.member-chip { display: flex; align-items: center; gap: 5px; padding: 4px 9px 4px 4px; border-radius: 18px; background: #f5f5f5; border: 1px solid transparent; white-space: nowrap; cursor: pointer; flex-shrink: 0; }
.member-chip.sel { border-color: var(--primary); background: rgba(255,107,53,.08); }
.mavatar { width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mname { font-size: 12px; color: #555; }
.member-chip.sel .mname { color: var(--primary); }
.cats { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px 4px; padding: 10px 12px; align-content: start; }
.cat { text-align: center; cursor: pointer; }
.cico { width: 46px; height: 46px; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; border: 2px solid transparent; }
.cat.sel .cico { border-color: var(--primary); border-radius: 12px; }
.cname { font-size: 11px; color: #666; }
.cat.sel .cname { color: var(--primary); }
.meta { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-top: 1px solid #f2f2f2; }
.note-field { flex: 1; background: #f7f7f7; border-radius: 8px; padding: 6px 10px; font-size: 13px; }
.date-btn { font-size: 12px; color: #666; background: #f7f7f7; border-radius: 8px; padding: 8px 10px; white-space: nowrap; display: flex; align-items: center; gap: 4px; }
.keypad { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid #eee; }
.key { text-align: center; padding: 11px 0; font-size: 20px; font-weight: 500; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; cursor: pointer; user-select: none; }
.key:active { background: #f5f5f5; }
.save { margin: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: var(--primary-grad); color: #fff; border: none; border-radius: 24px; padding: 13px; font-size: 16px; font-weight: 600; }
</style>
