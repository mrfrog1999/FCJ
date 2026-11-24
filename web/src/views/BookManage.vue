<template>
  <div class="subpage">
    <van-nav-bar title="账本管理" left-text="返回" left-arrow @click-left="$router.back()" />
    <div class="desc">切换账本，或邀请好友一起协同记账</div>

    <div class="list">
      <van-swipe-cell v-for="b in store.books" :key="b.id">
        <div class="item" :class="{ current: b.id == store.currentBookId }" @click="switchBook(b)">
          <div class="bico"><SvgIcon name="bookopen" :size="24" color="var(--primary)" /></div>
          <div class="binfo">
            <div class="bname">{{ b.name }} <van-tag v-if="b.my_role === 'owner'" type="primary" size="mini">我的</van-tag><van-tag v-else type="success" size="mini">共享</van-tag></div>
            <div class="bmeta">{{ b.record_count }} 笔记录</div>
          </div>
          <div class="bright">
            <van-icon v-if="b.id == store.currentBookId" name="success" color="var(--primary)" size="22" />
            <van-icon name="friends-o" size="20" color="#999" @click.stop="showMembers(b)" />
          </div>
        </div>
        <template #right>
          <div v-if="b.my_role === 'owner'" class="del" @click="delBook(b)">删除</div>
        </template>
      </van-swipe-cell>
    </div>

    <div class="actions">
      <van-button block type="primary" @click="createShow = true">＋ 新建账本</van-button>
      <van-button block @click="joinShow = true">加入他人账本（输入邀请码）</van-button>
    </div>

    <van-popup v-model:show="createShow" position="bottom" round>
      <div class="popup">
        <div class="popup-title">新建账本</div>
        <van-field v-model="newName" placeholder="输入账本名称，如：旅行账本" />
        <div class="popup-btns"><van-button block @click="createShow = false">取消</van-button><van-button block type="primary" @click="createBook">创建</van-button></div>
      </div>
    </van-popup>

    <van-popup v-model:show="joinShow" position="bottom" round>
      <div class="popup">
        <div class="popup-title">加入账本</div>
        <van-field v-model="joinCode" placeholder="输入好友分享的邀请码" />
        <div class="popup-btns"><van-button block @click="joinShow = false">取消</van-button><van-button block type="primary" @click="joinBook">加入</van-button></div>
      </div>
    </van-popup>

    <van-popup v-model:show="memberShow" position="bottom" round>
      <div class="popup">
        <div class="popup-title">账本成员</div>
        <div v-for="m in members" :key="m.id" class="member">
          <div class="mav">{{ m.nickname?.[0] || 'U' }}</div>
          <div class="mname">{{ m.nickname || m.username }}</div>
          <van-tag :type="m.role === 'owner' ? 'primary' : 'default'" size="mini">{{ m.role === 'owner' ? '创建者' : '成员' }}</van-tag>
        </div>
        <div class="popup-btns"><van-button block @click="memberShow = false">关闭</van-button></div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import SvgIcon from '../components/SvgIcon.vue'

const store = useStore()
const createShow = ref(false)
const joinShow = ref(false)
const memberShow = ref(false)
const newName = ref('')
const joinCode = ref('')
const members = ref([])

function switchBook(b) { store.setBook(b.id); showToast('已切换到「' + b.name + '」'); }
async function createBook() {
  if (!newName.value.trim()) return showToast('请输入账本名称')
  try {
    await api.books.create(newName.value.trim())
    await store.loadBase()
    store.touch()
    createShow.value = false; newName.value = ''
    showToast('创建成功')
  } catch (e) { showToast(e.message) }
}
async function joinBook() {
  if (!joinCode.value.trim()) return showToast('请输入邀请码')
  try {
    const res = await api.books.join(joinCode.value.trim())
    await store.loadBase()
    store.touch()
    store.setBook(res.book.id)
    joinShow.value = false; joinCode.value = ''
    showToast('已加入「' + res.book.name + '」')
  } catch (e) { showToast(e.message) }
}
async function delBook(b) {
  try {
    await showConfirmDialog({ title: '删除账本', message: `确定删除「${b.name}」？该账本所有记录将被删除。` })
    await api.books.remove(b.id)
    await store.loadBase()
    store.touch()
    showToast('已删除')
  } catch (e) { if (e !== 'cancel') showToast(e.message || '取消') }
}
async function showMembers(b) {
  try { members.value = await api.books.members(b.id); memberShow.value = true }
  catch (e) { showToast(e.message) }
}
</script>

<style scoped>
.subpage { min-height: 100vh; min-height: 100dvh; background: #f5f6f8; padding-bottom: calc(30px + env(safe-area-inset-bottom)); }
.desc { font-size: 12px; color: #999; padding: 12px 16px; }
.list { background: #fff; }
.item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.item.current { background: #fff9f6; }
.bico { width: 42px; height: 42px; border-radius: 12px; background: #fff2ec; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.binfo { flex: 1; }
.bname { font-size: 15px; font-weight: 600; }
.bmeta { font-size: 12px; color: #999; margin-top: 3px; }
.bright { display: flex; align-items: center; gap: 12px; }
.del { height: 100%; background: #ee0a24; color: #fff; display: flex; align-items: center; padding: 0 20px; }
.actions { padding: 20px 16px; display: flex; flex-direction: column; gap: 12px; }
.popup { padding: 20px 16px calc(16px + env(safe-area-inset-bottom)); }
.popup-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 14px; }
.popup-btns { display: flex; gap: 10px; margin-top: 16px; }
.member { display: flex; align-items: center; gap: 10px; padding: 10px 0; }
.mav { width: 34px; height: 34px; border-radius: 50%; background: #ffe0d2; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 600; }
.mname { flex: 1; font-size: 14px; }
</style>
