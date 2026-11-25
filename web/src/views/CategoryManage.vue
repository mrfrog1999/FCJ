<template>
  <div class="subpage">
    <van-nav-bar title="分类管理" left-arrow @click-left="$router.back()" />

    <!-- 支出/收入切换 + 新增一级分类 -->
    <div class="type-switch">
      <div class="ts-tabs">
        <span :class="{ on: type === 'expense' }" @click="switchType('expense')">支出分类</span>
        <span :class="{ on: type === 'income' }" @click="switchType('income')">收入分类</span>
      </div>
      <span class="add-group-top" @click="addGroup">＋ 一级分类</span>
    </div>

    <!-- 按一级分类分组平铺显示 -->
    <div class="group" v-for="g in sortedGroups" :key="g.id">
      <div class="group-head" @click="toggleGroup(g)">
        <div class="gh-title">
          <van-icon :name="collapsed[g.id] ? 'arrow' : 'arrow-down'" class="gh-arrow" />
          <CategoryIcon :name="g.name" :icon="g.icon" :size="22" />
          <span class="gh-name">{{ g.name }}</span>
          <span class="gh-count">{{ groupSubs(g).length }}</span>
        </div>
        <div class="gh-actions" @click.stop>
          <van-icon name="plus" class="gh-act" @click.stop="openAdd(g)" />
          <van-icon name="edit" class="gh-act" @click.stop="editGroup(g)" />
        </div>
      </div>
      <div class="list" v-show="!collapsed[g.id]">
        <div v-for="c in groupSubs(g)" :key="c.id" class="item" @click="editCat(c)">
          <div class="ico"><CategoryIcon :name="c.name" :icon="c.icon" :size="28" /></div>
          <div class="nm">{{ c.name }}</div>
          <van-tag v-if="c.is_default" type="default" size="mini">默认</van-tag>
          <van-icon v-if="!c.is_default" name="delete-o" size="20" color="#ee0a24" @click.stop="delCat(c)" />
          <van-icon name="arrow" size="16" color="#ccc" />
        </div>
        <div class="empty-mini" v-if="!groupSubs(g).length">暂无二级分类，点右上角 ＋ 添加</div>
      </div>
    </div>

    <!-- 未分组的二级分类（兜底：删除一级后遗留） -->
    <div class="group" v-if="ungrouped.length">
      <div class="group-head">
        <div class="gh-title"><span class="gh-name">未分组</span><span class="gh-count">{{ ungrouped.length }}</span></div>
      </div>
      <div class="list">
        <div v-for="c in ungrouped" :key="c.id" class="item" @click="editCat(c)">
          <div class="ico"><CategoryIcon :name="c.name" :icon="c.icon" :size="28" /></div>
          <div class="nm">{{ c.name }}</div>
          <van-icon name="arrow" size="16" color="#ccc" />
        </div>
      </div>
    </div>

    <van-empty v-if="!groups.length && !ungrouped.length" description="暂无一级分类，点上方新增" image-size="70px" />

    <!-- 二级分类编辑弹窗 -->
    <van-popup v-model:show="showEdit" position="bottom" round>
      <div class="popup">
        <div class="popup-title">{{ editing ? '编辑二级分类' : '新增二级分类' }}</div>
        <van-field v-model="form.name" placeholder="分类名称" label="名称" />
        <div class="icon-pick-area" @click="openIconPicker">
          <div class="color-label">图标</div>
          <div class="icon-pick-preview">
            <CategoryIcon :name="form.name" :icon="form.icon" :size="30" />
            <span>点击选择图标（标准 / 银行）</span>
            <van-icon name="arrow" color="#ccc" />
          </div>
        </div>
        <div class="popup-btns">
          <van-button block @click="showEdit = false">取消</van-button>
          <van-button block type="primary" @click="save">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 一级分类编辑弹窗 -->
    <van-popup v-model:show="showGroupEdit" position="bottom" round>
      <div class="popup">
        <div class="popup-title">{{ editingGroup ? '编辑一级分类' : '新增一级分类' }}</div>
        <van-field v-model="groupForm.name" placeholder="一级分类名称" label="名称" />
        <div class="icon-pick-area" @click="openGroupIconPicker">
          <div class="color-label">图标</div>
          <div class="icon-pick-preview">
            <CategoryIcon :name="groupForm.name" :icon="groupForm.icon" :size="30" />
            <span>点击选择图标（标准 / 银行）</span>
            <van-icon name="arrow" color="#ccc" />
          </div>
        </div>
        <div class="popup-btns">
          <van-button v-if="editingGroup" block class="del-btn" @click="delGroup">删除</van-button>
          <van-button block @click="showGroupEdit = false">取消</van-button>
          <van-button block type="primary" @click="saveGroup">保存</van-button>
        </div>
      </div>
    </van-popup>

    <IconPicker v-model:show="iconPickerShow" v-model="form.icon" tab="standard" />
    <IconPicker v-model:show="groupIconPickerShow" v-model="groupForm.icon" tab="standard" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import CategoryIcon from '../components/CategoryIcon.vue'
import IconPicker from '../components/IconPicker.vue'
import { resolveIcon } from '../utils/icons'
import { isPickedIcon } from '../utils/categoryIconMap'
import { readCache, writeCache } from '../utils/cache'

const store = useStore()
const type = ref('expense')
const groups = ref([])
const collapsed = ref({})
function toggleGroup(g) { collapsed.value[g.id] = !collapsed.value[g.id] }

// 一级分类排序：「其他」开头的排最下面（其他收入在职业收入下面，其他杂项在最后）
const sortedGroups = computed(() => {
  return groups.value.slice().sort((a, b) => {
    const ao = String(a.name).startsWith('其他') ? 1 : 0
    const bo = String(b.name).startsWith('其他') ? 1 : 0
    if (ao !== bo) return ao - bo
    return (a.sort || 0) - (b.sort || 0)
  })
})

const showEdit = ref(false)
const editing = ref(null)
const form = ref({ name: '', icon: 'more', group_id: null })
const iconPickerShow = ref(false)
function openIconPicker() { iconPickerShow.value = true }

const showGroupEdit = ref(false)
const editingGroup = ref(null)
const groupForm = ref({ name: '', icon: 'more' })
const groupIconPickerShow = ref(false)
function openGroupIconPicker() { groupIconPickerShow.value = true }

// 每个一级分类下的二级分类（「其他杂项」排最下面）
function groupSubs(g) {
  return store.categories
    .filter(c => c.type === type.value && c.group_id === g.id)
    .slice()
    .sort((a, b) => {
      const ao = a.name === '其他杂项' ? 1 : 0
      const bo = b.name === '其他杂项' ? 1 : 0
      return ao - bo
    })
}
// 未分组兜底：所属组已不存在
const ungrouped = computed(() => {
  const ids = new Set(groups.value.map(g => g.id))
  return store.categories.filter(c => c.type === type.value && !ids.has(c.group_id))
})

async function loadGroups() {
  try {
    const all = await api.categories.groups()
    groups.value = all.filter(g => g.type === type.value)
    writeCache('category_groups', all)
  } catch (e) {
    // 离线：读缓存的一级分类，保证分组头正常显示
    const cached = readCache('category_groups')
    if (Array.isArray(cached)) groups.value = cached.filter(g => g.type === type.value)
  }
}
function switchType(t) { type.value = t; loadGroups() }

function editCat(c) {
  editing.value = c
  const icon = isPickedIcon(c.icon) ? c.icon : resolveIcon(c.icon, c.name)
  form.value = { name: c.name, icon, group_id: c.group_id }
  showEdit.value = true
}
function openAdd(g) {
  editing.value = null
  form.value = { name: '', icon: 'utensils', group_id: g.id }
  showEdit.value = true
}
async function save() {
  if (!form.value.name.trim()) return showToast('请输入分类名称')
  if (!form.value.group_id) return showToast('请先新增一级分类')
  try {
    const data = { name: form.value.name.trim(), icon: form.value.icon || 'more', type: type.value, group_id: form.value.group_id }
    if (editing.value) await api.categories.update(editing.value.id, data)
    else await api.categories.create(data)
    await store.loadBase()
    store.touch()
    showEdit.value = false
    showToast('保存成功')
  } catch (e) { showToast(e.message) }
}
async function delCat(c) {
  try {
    await showConfirmDialog({ title: '删除分类', message: `确定删除「${c.name}」吗？` })
    await api.categories.remove(c.id)
    await store.loadBase()
    store.touch()
    showToast('已删除')
  } catch (e) { if (e !== 'cancel') showToast(e.message || '取消') }
}

function addGroup() {
  editingGroup.value = null
  groupForm.value = { name: '', icon: 'more' }
  showGroupEdit.value = true
}
function editGroup(g) {
  editingGroup.value = g
  const icon = isPickedIcon(g.icon) ? g.icon : resolveIcon(g.icon, g.name)
  groupForm.value = { name: g.name, icon }
  showGroupEdit.value = true
}
async function saveGroup() {
  if (!groupForm.value.name.trim()) return showToast('请输入一级分类名称')
  try {
    const data = { name: groupForm.value.name.trim(), icon: groupForm.value.icon || 'more', type: type.value }
    if (editingGroup.value) await api.categories.groupUpdate(editingGroup.value.id, data)
    else await api.categories.groupCreate(data)
    await store.loadBase()
    await loadGroups()
    store.touch()
    showGroupEdit.value = false
    showToast('保存成功')
  } catch (e) { showToast(e.message) }
}
async function delGroup() {
  if (!editingGroup.value) return
  try {
    await showConfirmDialog({ title: '删除一级分类', message: `确定删除「${editingGroup.value.name}」吗？其下二级分类将保留但变为未分组。` })
    await api.categories.groupRemove(editingGroup.value.id)
    await store.loadBase()
    await loadGroups()
    store.touch()
    showGroupEdit.value = false
    showToast('已删除')
  } catch (e) { if (e !== 'cancel') showToast(e.message || '取消') }
}

onMounted(async () => {
  // 先同步就位缓存数据，避免离线时被网络请求卡住导致空白
  if (!store.categories.length) {
    const cached = readCache('base_categories')
    if (Array.isArray(cached)) store.categories = cached
  }
  const cachedGroups = readCache('category_groups')
  if (Array.isArray(cachedGroups)) groups.value = cachedGroups.filter(g => g.type === type.value)
  if (!store.ready) store.loadBase().catch(() => {})
  // 后台刷新一级分类（在线成功会更新缓存，离线则保留上面已就位的缓存）
  await loadGroups()
})
</script>

<style scoped>
.subpage { min-height: 100vh; background: #f5f6f8; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.type-switch { display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: #fff; border-bottom: 1px solid #f0f0f0; }
.ts-tabs { display: flex; gap: 24px; }
.ts-tabs span { color: #999; font-size: 15px; padding: 16px 0 12px; cursor: pointer; }
.ts-tabs span.on { color: var(--primary); font-weight: 700; border-bottom: 3px solid var(--primary); }
.add-group-top { font-size: 13px; color: var(--primary); cursor: pointer; padding: 8px 12px; border: 1px solid var(--primary); border-radius: 16px; }

/* 一级分类分组 */
.group { margin-top: 10px; }
.group-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #eef0f2; color: #6b7178; }
.gh-title { display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; min-width: 0; }
.gh-arrow { font-size: 12px; color: #9aa0a6; }
.gh-name { font-size: 14px; font-weight: 600; color: #444; }
.gh-count { font-size: 11px; color: #999; background: #fff; padding: 1px 7px; border-radius: 10px; }
.gh-actions { display: flex; align-items: center; gap: 16px; }
.gh-act { font-size: 17px; color: #9aa0a6; cursor: pointer; }
.list { background: #fff; }
.item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid #f5f5f5; }
.item:last-child { border-bottom: none; }
.ico { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nm { flex: 1; font-size: 15px; }
.empty-mini { padding: 14px 16px; font-size: 12px; color: #bbb; text-align: center; }

/* 弹窗 */
.popup { padding: 20px 16px calc(16px + env(safe-area-inset-bottom)); }
.popup-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 14px; }
.icon-pick-area { padding: 12px 16px 4px; }
.icon-pick-preview { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #f7f8fa; border-radius: 10px; cursor: pointer; }
.icon-pick-preview span { flex: 1; font-size: 13px; color: #666; }
.color-label { font-size: 14px; color: #646566; margin-bottom: 10px; }
.popup-btns { display: flex; gap: 10px; margin-top: 16px; }
.del-btn { color: #ee0a24; }
</style>
