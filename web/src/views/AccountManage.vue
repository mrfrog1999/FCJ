<template>
  <div class="page account-page">
    <van-nav-bar title="账号管理" left-text="返回" left-arrow @click-left="$router.back()" />
    <div class="tip-bar">管理员可创建账号、重置密码，并为每个账号设置「关联记账成员」：该账号登录后记一笔，默认记在关联成员名下。点账号行即可快速设置。</div>

    <div class="add-bar"><van-button type="primary" block icon="plus" @click="openAdd">新建账号</van-button></div>

    <van-cell-group inset v-if="users.length">
      <van-cell v-for="u in users" :key="u.id" is-link @click="openBind(u)">
        <template #icon>
          <UserAvatar :avatar="u.avatar" :name="u.nickname" :color="memberColor(u.id)" :size="38" class="cell-avatar" />
        </template>
        <template #title>
          <div class="u-title">
            <span>{{ u.nickname }}</span>
            <van-tag v-if="u.is_admin" type="danger" size="mini">管理员</van-tag>
          </div>
        </template>
        <template #label>
          <div class="u-label">
            <div>账号：{{ u.username }}</div>
            <div class="bind-line">关联记账成员：<b>{{ u.bind_member_nickname || '本人（默认）' }}</b></div>
          </div>
        </template>
        <template #right-icon>
          <div class="u-actions">
            <van-icon name="edit" class="act" @click.stop="openEdit(u)" />
            <van-icon name="delete-o" class="act danger" v-if="!u.is_admin" @click.stop="remove(u)" />
          </div>
        </template>
      </van-cell>
    </van-cell-group>
    <van-empty v-else-if="loaded" description="暂无账号" />

    <!-- 新增 / 编辑弹窗 -->
    <van-popup v-model:show="showEdit" position="bottom" round>
      <div class="popup">
        <div class="popup-title">{{ editing ? '编辑账号' : '新建账号' }}</div>
        <div class="avatar-edit" @click="pickImage">
          <UserAvatar :avatar="form.avatar" :name="form.nickname" :color="memberColor(editing?.id)" :size="64" />
          <div class="avatar-tip"><van-icon name="photograph" /> 点击更换头像</div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" class="hidden-file" @change="onFile" />
        <div class="preset-colors">
          <span v-for="c in PRESET_COLORS" :key="c" class="preset-dot" :class="{ sel: form.avatar === c }" :style="{ background: c }" @click="form.avatar = c"></span>
        </div>
        <van-field v-model="form.username" label="账号" placeholder="登录账号（至少2位）" :disabled="!!editing" />
        <van-field v-model="form.nickname" label="昵称" placeholder="显示名称" />
        <van-field v-model="form.password" type="password" :label="editing ? '新密码' : '密码'" :placeholder="editing ? '不填则不修改' : '至少6位'" />
        <div class="bind-field" @click="bindPickerFor = 'edit'; bindShow = true">
          <div class="bf-label">关联记账成员</div>
          <div class="bf-value">{{ bindName(form.bind_member_id) }}<van-icon name="arrow" /></div>
        </div>
        <div class="hint">关联后，该账号记一笔时默认记在所选成员名下；不选则记在自己名下。</div>
        <div class="popup-btns">
          <van-button block @click="showEdit = false">取消</van-button>
          <van-button block type="primary" @click="save">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 关联记账成员选择弹窗 -->
    <van-popup v-model:show="bindShow" position="bottom" round>
      <div class="popup bind-popup">
        <div class="popup-title">关联记账成员</div>
        <div class="bind-hint">选择后，该账号记一笔默认归属到所选成员</div>
        <div class="member-list">
          <div class="member-opt" :class="{ on: (bindPickerFor === 'edit' ? form.bind_member_id : quickBindId) === null }" @click="pickBind(null)">
            <div class="mo-avatar self">本</div>
            <span class="mo-name">本人（不关联，记在自己名下）</span>
            <van-icon name="success" v-if="(bindPickerFor === 'edit' ? form.bind_member_id : quickBindId) === null" />
          </div>
          <div class="member-opt" v-for="m in store.members" :key="m.id"
            :class="{ on: (bindPickerFor === 'edit' ? form.bind_member_id : quickBindId) === m.id }" @click="pickBind(m.id)">
            <UserAvatar :avatar="memberAvatar(m)" :name="memberName(m)" :color="memberColor(m.id)" :size="30" />
            <span class="mo-name">{{ memberName(m) }}</span>
            <van-icon name="success" v-if="(bindPickerFor === 'edit' ? form.bind_member_id : quickBindId) === m.id" />
          </div>
        </div>
        <div class="popup-btns">
          <van-button block @click="bindShow = false">取消</van-button>
          <van-button block type="primary" @click="confirmBind">确定</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import UserAvatar from '../components/UserAvatar.vue'
import { memberColor, memberName, memberAvatar } from '../utils/members'
import { fileToAvatarDataUrl, PRESET_COLORS } from '../utils/avatar'

const store = useStore()
const users = ref([])
const loaded = ref(false)
const showEdit = ref(false)
const editing = ref(null)
const fileInput = ref(null)
const form = ref({ username: '', nickname: '', password: '', avatar: '', bind_member_id: null })

// 关联记账成员选择
const bindShow = ref(false)
const bindPickerFor = ref('edit')   // 'edit' 编辑弹窗内 | 'quick' 列表快速设置
const quickBindUser = ref(null)
const quickBindId = ref(null)

function bindName(id) {
  if (id == null) return '本人（默认）'
  const m = store.members.find(x => x.id === id)
  return m ? memberName(m) : '成员 #' + id
}
function openBind(u) {
  quickBindUser.value = u
  quickBindId.value = u.bind_member_id ?? null
  bindPickerFor.value = 'quick'
  bindShow.value = true
}
function pickBind(id) {
  if (bindPickerFor.value === 'edit') form.value.bind_member_id = id
  else quickBindId.value = id
}
async function confirmBind() {
  if (bindPickerFor.value === 'edit') { bindShow.value = false; return }
  const u = quickBindUser.value
  if (!u) { bindShow.value = false; return }
  try {
    await api.admin.updateUser(u.id, { bind_member_id: quickBindId.value })
    // 管理员给自己设置时同步到本地，立即影响默认记账成员
    if (u.id === store.user?.id) store.updateUser({ bind_member_id: quickBindId.value })
    showToast('已设置关联成员')
    bindShow.value = false
    load()
  } catch (e) { showToast(e.message) }
}

async function load() {
  loaded.value = false
  try {
    if (!store.members.length) await store.loadMembers().catch(() => {})
    users.value = await api.admin.users()
  } catch (e) { showToast(e.message) }
  loaded.value = true
}
function openAdd() {
  editing.value = null
  form.value = { username: '', nickname: '', password: '', avatar: '', bind_member_id: null }
  showEdit.value = true
}
function openEdit(u) {
  editing.value = u
  form.value = { username: u.username, nickname: u.nickname, password: '', avatar: u.avatar || '', bind_member_id: u.bind_member_id ?? null }
  showEdit.value = true
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
async function save() {
  const f = form.value
  if (!editing.value && !f.username.trim()) return showToast('请输入账号')
  if (!editing.value && String(f.password).length < 6) return showToast('密码至少6位')
  if (editing.value && f.password && String(f.password).length < 6) return showToast('密码至少6位')
  try {
    const payload = { nickname: f.nickname, avatar: f.avatar || null, bind_member_id: f.bind_member_id }
    if (editing.value) {
      await api.admin.updateUser(editing.value.id, { ...payload, password: f.password || undefined })
      if (editing.value.id === store.user?.id) store.updateUser({ bind_member_id: f.bind_member_id })
      showToast('已保存')
    } else {
      await api.admin.createUser({ username: f.username.trim(), nickname: f.nickname, password: f.password, avatar: f.avatar || null, bind_member_id: f.bind_member_id })
      showToast('账号已创建')
    }
    showEdit.value = false
    load()
  } catch (e) { showToast(e.message) }
}
async function remove(u) {
  try {
    await showConfirmDialog({ title: '删除账号', message: `确定删除「${u.nickname}」吗？该账号的数据将一并删除。` })
    await api.admin.deleteUser(u.id)
    showToast('已删除')
    load()
  } catch (e) { if (e !== 'cancel') showToast(e.message || '取消') }
}
onMounted(load)
</script>

<style scoped>
.account-page { padding-bottom: 20px; }
.tip-bar { font-size: 12px; color: #666; background: #fff7f3; margin: 12px 16px; padding: 10px 12px; border-radius: 10px; line-height: 1.6; }
.add-bar { margin: 12px 16px; }
.u-title { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; }
.u-label { font-size: 12px; color: #999; line-height: 1.5; }
.bind-line b { color: var(--primary); font-weight: 600; }
.u-actions { display: flex; gap: 16px; align-items: center; }
.act { font-size: 18px; color: #888; }
.act.danger { color: #ee0a24; }
.self-tag { font-size: 11px; color: #999; }
.popup { padding: 20px 16px calc(16px + env(safe-area-inset-bottom)); }
.popup-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px; }
.hint { font-size: 12px; color: #999; margin-top: 12px; }
.popup-btns { display: flex; gap: 10px; margin-top: 18px; }
.cell-avatar { margin-right: 12px; }
.avatar-edit { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer; }
.avatar-tip { font-size: 12px; color: var(--primary); display: flex; align-items: center; gap: 4px; }
.hidden-file { display: none; }
.preset-colors { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; justify-content: center; }
.preset-dot { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 3px solid transparent; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
.preset-dot.sel { border-color: #333; }
.bind-field { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f7f8fa; border-radius: 10px; margin-top: 12px; cursor: pointer; }
.bf-label { font-size: 14px; color: #646566; }
.bf-value { display: flex; align-items: center; gap: 4px; font-size: 14px; color: var(--primary); }
.bind-hint { font-size: 12px; color: #999; text-align: center; margin: -6px 0 12px; }
.bind-popup { max-height: 75vh; overflow: auto; }
.member-list { margin-top: 4px; }
.member-opt { display: flex; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.member-opt.on .mo-name { color: var(--primary); font-weight: 600; }
.mo-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mo-avatar.self { background: #eef0f2; color: #888; font-size: 13px; }
.mo-name { flex: 1; font-size: 15px; color: #333; }
</style>
