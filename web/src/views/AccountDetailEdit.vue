<template>
  <div class="page detail-edit-page">
    <div class="topbar">
      <div class="nav-left" @click="$router.back()"><van-icon name="arrow-left" /></div>
      <div class="nav-title">编辑账户</div>
      <div class="nav-right"></div>
    </div>

    <van-loading v-if="!loaded" class="page-loading" color="#1ebd7e" />
    <template v-else>
      <div class="preview">
        <div class="acc-icon">
          <SmartIcon :value="form.icon" :size="40" />
        </div>
        <div class="preview-name">{{ form.display_name || bareName }}</div>
      </div>

      <van-cell-group inset class="fg">
        <van-field v-model="form.display_name" label="名称" :placeholder="bareName" maxlength="16" clearable />
        <van-field v-model="form.note" label="备注" placeholder="备注（可选）" maxlength="20" clearable />
      </van-cell-group>

      <div class="section-title">账户分类</div>
      <div class="cat-grid">
        <div
          v-for="c in catOptions"
          :key="c.key"
          class="cat-chip"
          :class="{ sel: form.category === c.key }"
          @click="form.category = c.key"
        >{{ c.name }}</div>
      </div>

      <div class="section-title">选择图标</div>
      <div class="icon-pick-row" @click="openIconPicker">
        <div class="ic"><SmartIcon :value="form.icon" :size="28" /></div>
        <span class="ipr-text">点击选择图标（标准 / 银行）</span>
        <van-icon name="arrow" color="#ccc" />
      </div>

      <div class="btn-wrap">
        <van-button round block type="primary" @click="save">保存</van-button>
      </div>
    </template>

    <IconPicker v-model:show="iconPickerShow" v-model="form.icon" tab="bank" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../store'
import { api } from '../api'
import SmartIcon from '../components/SmartIcon.vue'
import IconPicker from '../components/IconPicker.vue'
import { CATEGORY_META, inferCategory } from '../utils/accountCategory'
import { showToast } from 'vant'

const store = useStore()
const route = useRoute()
const router = useRouter()
const account = String(route.query.account || '')
const loaded = ref(false)
const iconPickerShow = ref(false)
function openIconPicker() { iconPickerShow.value = true }

const bareName = account.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/gu, '').trim() || account
// 分类选项（五类）；新账户默认按名称推断
const catOptions = CATEGORY_META
const guessedCat = inferCategory({ account, kind: '' })
const form = ref({ display_name: '', note: '', icon: 'wallet', color: '#7aa7c7', category: guessedCat })

const TYPE_RULES = [
  { re: /微信/, icon: 'wechat', bg: '#22c55e' },
  { re: /支付宝|余额宝|钱宝/, icon: 'alipay', bg: '#2f8fe8' },
  { re: /现金|零钱|钱包/, icon: 'wallet', bg: '#fff2ef' },
  { re: /信用卡|花呗|白条|借呗|分期|贷款/, icon: 'walletcard', bg: '#e0483a' },
  { re: /基金|证券|理财|定期|公积金|医保|食堂|股票/, icon: 'fund', bg: '#2f8fe8' },
  { re: /银行|卡|借记|储蓄|信用社|邮政/, icon: 'bank', bg: '#3b7ddd' }
]

async function save() {
  try {
    await api.accounts.saveMeta({
      book_id: store.currentBookId,
      account,
      display_name: form.value.display_name,
      icon: form.value.icon,
      color: form.value.color,
      note: form.value.note,
      category: form.value.category
    })
    store.touch()
    showToast('保存成功')
    router.back()
  } catch (e) { showToast(e.message || '保存失败') }
}

onMounted(async () => {
  if (!store.ready) await store.loadBase().catch(() => {})
  try {
    const list = await api.accounts.list(store.currentBookId ? { book_id: store.currentBookId } : {})
    const a = list.find(x => x.account === account)
    if (a) {
      form.value.display_name = a.display_name || ''
      form.value.note = a.note || ''
      form.value.category = a.category || inferCategory(a)
      if (a.icon) form.value.icon = a.icon
      if (a.color) form.value.color = a.color
      else {
        const rule = TYPE_RULES.find(r => r.re.test(bareName))
        if (rule) { form.value.icon = rule.icon; form.value.color = rule.bg }
      }
    } else {
      const rule = TYPE_RULES.find(r => r.re.test(bareName))
      if (rule) { form.value.icon = rule.icon; form.value.color = rule.bg }
    }
  } catch (e) {}
  loaded.value = true
})
</script>

<style scoped>
.detail-edit-page { min-height: 100vh; min-height: 100dvh; padding-bottom: calc(30px + env(safe-area-inset-bottom)); background: #f5f6f8; }
.topbar { position: sticky; top: 0; z-index: 10; height: calc(52px + env(safe-area-inset-top)); padding-top: env(safe-area-inset-top); background: linear-gradient(135deg,#ff9a44 0%,#ff6b35 48%,#f0472d 100%); color: #fff; display: flex; align-items: center; justify-content: space-between; padding-left: 14px; padding-right: 14px; box-sizing: border-box; }
.nav-left { min-width: 60px; font-size: 20px; }
.nav-title { font-size: 16px; font-weight: 600; }
.nav-right { min-width: 60px; }
.page-loading { display: flex; justify-content: center; margin-top: 60px; }
.preview { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 26px 0 18px; }
.acc-icon { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; }
.preview-name { font-size: 14px; color: #666; }
.fg { margin-top: 4px; }
.section-title { font-size: 13px; color: #999; padding: 18px 16px 10px; }
.cat-grid { display: flex; flex-wrap: wrap; gap: 10px; padding: 0 16px; }
.cat-chip { padding: 8px 16px; border-radius: 20px; background: #fff; color: #666; font-size: 13px; cursor: pointer; border: 1px solid #e5e5e5; }
.cat-chip.sel { background: var(--primary); color: #fff; border-color: var(--primary); font-weight: 500; }
.icon-pick-row { display: flex; align-items: center; gap: 12px; margin: 0 16px; padding: 10px 12px; background: #fff; border-radius: 12px; cursor: pointer; }
.icon-pick-row .ic { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; }
.ipr-text { flex: 1; font-size: 14px; color: #555; }
.btn-wrap { padding: 28px 16px 0; }
</style>
