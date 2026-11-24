<template>
  <div class="page">
    <div class="gradient-card head">
      <div class="prof-nav">
        <van-icon name="arrow-left" class="back-ico" @click="$router.push('/home')" />
        <span>我的</span>
      </div>
      <div class="head-user" @click="openProfile">
        <UserAvatar :avatar="store.user?.avatar" :name="store.user?.nickname" :color="memberColor(store.user?.id)" :size="58" />
        <div class="uinfo">
          <div class="uname">{{ store.user?.nickname || '随手记用户' }}</div>
          <div class="uid">账号：{{ store.user?.username }}</div>
        </div>
        <van-icon name="edit" class="edit-ico" size="18" />
      </div>
    </div>

    <van-cell-group inset class="cell-card">
      <van-cell title="编辑资料" icon="user-o" is-link label="修改昵称和头像" @click="openProfile" />
      <van-cell title="分类管理" icon="apps-o" is-link @click="$router.push('/categories')" />
      <van-cell title="主题" icon="brush-o" :value="themeLabel" is-link @click="openTheme" />
      <van-cell title="本月预算" icon="balance-pay" :value="budget > 0 ? '¥' + fmt(budget) : '未设置'" is-link @click="openBudget" />
      <van-cell v-if="isAdmin" title="账号管理" icon="setting-o" is-link @click="$router.push('/accounts')" />
    </van-cell-group>

    <van-cell-group inset class="cell-card">
      <van-cell title="当前账本" :value="store.currentBook?.name || '-'" />
      <van-cell title="备份与恢复" icon="down" is-link label="导出 / 导入 XLS 备份" @click="$router.push('/backup')" />
      <van-cell title="版本" value="v1.0.0" />
    </van-cell-group>

    <div class="logout" @click="logout">退出登录</div>

    <van-popup v-model:show="budgetShow" position="bottom" round>
      <div class="popup">
        <div class="popup-title">设置本月预算（{{ month }}）</div>
        <van-field v-model="budgetInput" type="number" placeholder="输入预算金额" label="¥" />
        <div class="popup-btns">
          <van-button block @click="budgetShow = false">取消</van-button>
          <van-button block type="primary" @click="saveBudget">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 主题选择弹窗 -->
    <van-popup v-model:show="themeShow" position="bottom" round>
      <div class="popup">
        <div class="popup-title">选择主题</div>
        <div class="theme-desc">切换后所有分类图标会整体更换风格，仅对当前账号生效</div>
        <div class="theme-list">
          <div v-for="t in THEMES" :key="t.value" class="theme-item" :class="{ on: themeVal === t.value }" @click="themeVal = t.value">
            <span class="theme-name">{{ t.label }}</span>
            <van-icon v-if="themeVal === t.value" name="success" class="theme-check" />
          </div>
        </div>
        <div class="popup-btns">
          <van-button block @click="themeShow = false">取消</van-button>
          <van-button block type="primary" :loading="themeSaving" @click="saveTheme">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 编辑资料弹窗 -->
    <van-popup v-model:show="profileShow" position="bottom" round>
      <div class="popup">
        <div class="popup-title">编辑资料</div>
        <div class="avatar-edit" @click="pickImage">
          <UserAvatar :avatar="form.avatar" :name="form.nickname" :color="memberColor(store.user?.id)" :size="72" />
          <div class="avatar-tip"><van-icon name="photograph" /> 点击更换头像</div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" class="hidden-file" @change="onFile" />
        <div class="preset-label">或选择头像颜色</div>
        <div class="preset-colors">
          <span v-for="c in PRESET_COLORS" :key="c" class="preset-dot" :class="{ sel: form.avatar === c }"
            :style="{ background: c }" @click="form.avatar = c"></span>
        </div>
        <van-field v-model="form.nickname" label="昵称" placeholder="输入显示名称" maxlength="16" />
        <div class="popup-btns">
          <van-button block @click="profileShow = false">取消</van-button>
          <van-button block type="primary" :loading="saving" @click="saveProfile">保存</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import UserAvatar from '../components/UserAvatar.vue'
import { memberColor } from '../utils/members'
import { fileToAvatarDataUrl, PRESET_COLORS } from '../utils/avatar'
import { iconTheme, setIconTheme, THEME_STANDARD, THEME_FANCY } from '../utils/theme'

const store = useStore()
const router = useRouter()
const now = new Date()
const month = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const budget = ref(0)
const budgetShow = ref(false)
const budgetInput = ref('')
const profileShow = ref(false)
const saving = ref(false)
const fileInput = ref(null)
const form = ref({ nickname: '', avatar: '' })

const THEMES = [
  { value: THEME_STANDARD, label: '标准' },
  { value: THEME_FANCY, label: '炫彩' }
]
const themeShow = ref(false)
const themeVal = ref(iconTheme.value)
const themeSaving = ref(false)
const themeLabel = computed(() => themeVal.value === THEME_STANDARD ? '标准' : '炫彩')

const fmt = n => Number(n || 0).toFixed(2)
const isAdmin = computed(() => store.user?.username === 'admin')

function openProfile() {
  form.value = { nickname: store.user?.nickname || '', avatar: store.user?.avatar || '' }
  profileShow.value = true
}

function openTheme() {
  themeVal.value = iconTheme.value
  themeShow.value = true
}

async function saveTheme() {
  themeSaving.value = true
  try {
    await api.auth.updateProfile({ theme: themeVal.value })
    store.updateUser({ theme: themeVal.value })
    setIconTheme(themeVal.value)
    themeShow.value = false
    showToast('主题已切换')
  } catch (e) { showToast(e.message) }
  themeSaving.value = false
}
function pickImage() { fileInput.value?.click() }
async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    showToast('处理图片中…')
    form.value.avatar = await fileToAvatarDataUrl(file)
  } catch (err) { showToast(err.message) }
  e.target.value = ''
}
async function saveProfile() {
  const nick = String(form.value.nickname || '').trim()
  if (!nick) return showToast('请输入昵称')
  saving.value = true
  try {
    const res = await api.auth.updateProfile({ nickname: nick, avatar: form.value.avatar || null })
    store.updateUser({ nickname: res.nickname, avatar: res.avatar })
    profileShow.value = false
    showToast('保存成功')
  } catch (e) { showToast(e.message) }
  saving.value = false
}

async function openBudget() {
  budgetInput.value = budget.value > 0 ? String(budget.value) : ''
  budgetShow.value = true
}
async function saveBudget() {
  if (!budgetInput.value || Number(budgetInput.value) < 0) return showToast('请输入有效金额')
  try {
    await api.stats.setBudget({ book_id: store.currentBookId, month: month.value, amount: budgetInput.value })
    store.touch()
    budget.value = Number(budgetInput.value)
    budgetShow.value = false
    showToast('保存成功')
  } catch (e) { showToast(e.message) }
}
function logout() {
  store.logout()
  router.replace('/login')
}
onMounted(async () => {
  if (store.currentBookId) {
    try { budget.value = (await api.stats.getBudget({ book_id: store.currentBookId, month: month.value })) || 0 } catch (e) {}
  }
})
</script>

<style scoped>
.page { padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.head { border-radius: 0 0 20px 20px; padding-top: env(safe-area-inset-top); }
.prof-nav { display: flex; align-items: center; gap: 10px; color: #fff; font-size: 16px; font-weight: 600; height: 52px; padding: 0 14px; }
.back-ico { font-size: 20px; cursor: pointer; }
.head-user { display: flex; align-items: center; padding: 4px 20px 30px; cursor: pointer; }
.head :deep(.uavatar) { margin-right: 14px; box-shadow: 0 2px 8px rgba(0,0,0,.12); border: 2px solid rgba(255,255,255,.6); }
.edit-ico { margin-left: auto; opacity: .85; }
.uname { font-size: 19px; font-weight: 600; }
.uid { font-size: 12px; opacity: .85; margin-top: 4px; }
.cell-card { margin-top: 14px; }
.logout { margin: 24px 16px; background: #fff; color: #ee0a24; text-align: center; padding: 13px; border-radius: 12px; font-size: 15px; }
.popup { padding: 20px 16px calc(16px + env(safe-area-inset-bottom)); }
.popup-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px; }
.popup-btns { display: flex; gap: 10px; margin-top: 18px; }
.avatar-edit { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 18px; cursor: pointer; }
.avatar-tip { font-size: 12px; color: var(--primary); display: flex; align-items: center; gap: 4px; }
.hidden-file { display: none; }
.preset-label { font-size: 12px; color: #999; margin: 4px 0 10px; }
.preset-colors { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
.preset-dot { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 3px solid transparent; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
.preset-dot.sel { border-color: #333; }
.theme-desc { font-size: 12px; color: #999; text-align: center; margin: -8px 0 14px; }
.theme-list { display: flex; flex-direction: column; gap: 10px; }
.theme-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 10px; background: #f7f8fa; border: 2px solid transparent; cursor: pointer; }
.theme-item.on { border-color: var(--primary, #ff6b35); background: #fff5f1; }
.theme-name { font-size: 15px; color: #333; }
.theme-item.on .theme-name { color: var(--primary, #ff6b35); font-weight: 600; }
.theme-check { color: var(--primary, #ff6b35); font-size: 18px; }
</style>
