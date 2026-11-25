<template>
  <div class="login">
    <div class="brand">
      <div class="logo"><SvgIcon name="wallet" :size="60" color="#fff" :stroke-width="1.5" /></div>
      <div class="name">随手记</div>
      <div class="slogan">轻松记录每一笔 · 多人协同 · 多端同步</div>
    </div>
    <div class="form">
      <div class="form-title">账号登录</div>
      <van-field v-model="username" placeholder="请输入账号" left-icon="user-o" :border="false" class="fld" />
      <van-field v-model="password" type="password" placeholder="请输入密码" left-icon="lock" :border="false" class="fld" />
      <div class="err">{{ err }}</div>
      <button class="btn" :disabled="loading" @click="submit">{{ loading ? '请稍候...' : '登录' }}</button>
      <div class="tip">账号由管理员统一分配，如需账号请联系管理员</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useStore } from '../store'
import { api } from '../api'
import SvgIcon from '../components/SvgIcon.vue'

const router = useRouter()
const store = useStore()
const username = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)

async function submit() {
  err.value = ''
  if (!username.value || !password.value) { err.value = '请输入账号和密码'; return }
  loading.value = true
  try {
    const res = await api.auth.login({ username: username.value, password: password.value })
    store.setAuth(res.token, res.user)
    await store.loadBase()
    showToast('登录成功')
    router.replace('/')
  } catch (e) { err.value = e.message }
  loading.value = false
}
</script>

<style scoped>
.login { min-height: 100vh; min-height: 100dvh; padding-top: env(safe-area-inset-top); background: linear-gradient(180deg, #ffffff 0%, #ffffff 42%, #f5f6f8 42%); }
.brand { text-align: center; padding: 70px 0 30px; color: #1a1a1a; }
.logo { display: flex; justify-content: center; filter: drop-shadow(0 4px 10px rgba(0,0,0,.15)); }
.name { font-size: 28px; font-weight: 700; margin-top: 6px; letter-spacing: 2px; }
.slogan { font-size: 12px; opacity: .9; margin-top: 8px; }
.form { background: #fff; margin: 20px 24px; border-radius: 18px; padding: 24px 20px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
.form-title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 20px; color: #1a1a1a; }
.fld { background: #f7f7f7; border-radius: 10px; margin-bottom: 12px; padding: 10px 12px; }
.err { color: #ee0a24; font-size: 12px; min-height: 18px; }
.btn { width: 100%; background: var(--primary-grad); color: #fff; border: none; border-radius: 24px; padding: 13px; font-size: 16px; font-weight: 600; margin-top: 6px; }
.btn:disabled { opacity: .6; }
.tip { text-align: center; color: #bbb; font-size: 11px; margin-top: 14px; }
</style>
