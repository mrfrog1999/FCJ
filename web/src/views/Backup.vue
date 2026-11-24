<template>
  <div class="page backup-page">
    <van-nav-bar title="备份与恢复" left-text="返回" left-arrow @click-left="$router.back()" />

    <!-- 顶部 Hero -->
    <div class="hero">
      <div class="hero-ring ring-a"></div>
      <div class="hero-ring ring-b"></div>
      <div class="hero-content">
        <div class="hero-icon"><van-icon name="shield-o" /></div>
        <div class="hero-title">数据安全中心</div>
        <div class="hero-sub">导出 · 备份 · 恢复，守护每一笔记录</div>
        <div class="hero-tip"><van-icon name="info-o" /> 完整支持 5 张工作表 · 各账号独立配置</div>
      </div>
    </div>

    <!-- 导出备份 -->
    <div class="card">
      <div class="card-head">
        <div class="badge badge-export"><van-icon name="down" /></div>
        <div class="card-head-txt">
          <div class="card-title">导出备份</div>
          <div class="card-sub">把账本保存为 .xls 文件</div>
        </div>
      </div>
      <div class="card-desc">包含支出、收入、转账、余额/负债变更共 5 张工作表，可用于备份或在其他设备完整恢复。</div>
      <van-button block type="primary" class="main-btn" :loading="exporting" @click="doExport">
        <van-icon name="down" /> 导出 XLS 备份文件
      </van-button>
    </div>

    <!-- 定时邮件备份 -->
    <div class="card">
      <div class="card-head">
        <div class="badge badge-mail"><van-icon name="envelop-o" /></div>
        <div class="card-head-txt">
          <div class="card-title">定时邮件备份</div>
          <div class="card-sub">自动发送备份到 QQ 邮箱</div>
        </div>
        <van-switch v-model="mail.enabled" size="24" class="mail-switch" @change="onMailToggle" />
      </div>
      <div class="card-desc">设定频率与时间，到点自动把备份文件发送到你的邮箱，格式与手动导出完全一致。</div>

      <div class="mail-form" v-if="mail.enabled">
        <div class="form-block">
          <div class="form-label"><span class="lbl-dot"></span>发送频率</div>
          <div class="chip-group">
            <div class="chip" :class="{on: mail.frequency==='daily'}" @click="mail.frequency='daily'">每天</div>
            <div class="chip" :class="{on: mail.frequency==='weekly'}" @click="mail.frequency='weekly'">每周</div>
            <div class="chip" :class="{on: mail.frequency==='monthly'}" @click="mail.frequency='monthly'">每月</div>
            <div class="chip" :class="{on: mail.frequency==='yearly'}" @click="mail.frequency='yearly'">每年</div>
          </div>

          <div class="mail-sub" v-if="mail.frequency==='weekly'">
            <div class="form-label sm">选择星期</div>
            <div class="chip-group week">
              <div class="chip" :class="{on: mail.weekday===0}" @click="mail.weekday=0">日</div>
              <div class="chip" :class="{on: mail.weekday===1}" @click="mail.weekday=1">一</div>
              <div class="chip" :class="{on: mail.weekday===2}" @click="mail.weekday=2">二</div>
              <div class="chip" :class="{on: mail.weekday===3}" @click="mail.weekday=3">三</div>
              <div class="chip" :class="{on: mail.weekday===4}" @click="mail.weekday=4">四</div>
              <div class="chip" :class="{on: mail.weekday===5}" @click="mail.weekday=5">五</div>
              <div class="chip" :class="{on: mail.weekday===6}" @click="mail.weekday=6">六</div>
            </div>
          </div>
          <div class="mail-sub" v-if="mail.frequency==='monthly'">
            <div class="form-label sm">每月第几天</div>
            <div class="stepper-row"><van-stepper v-model="mail.month_day" :min="1" :max="31" /><span class="unit">日</span></div>
          </div>
          <div class="mail-sub" v-if="mail.frequency==='yearly'">
            <div class="form-label sm">每年日期</div>
            <div class="stepper-row">
              <van-stepper v-model="mail.month" :min="1" :max="12" /><span class="unit">月</span>
              <van-stepper v-model="mail.year_day" :min="1" :max="31" /><span class="unit">日</span>
            </div>
          </div>
        </div>

        <div class="form-block">
          <div class="form-label"><span class="lbl-dot"></span>发送时间</div>
          <div class="time-wrap"><van-icon name="clock-o" /><input type="time" v-model="mail.send_time" class="mail-time" /></div>
        </div>

        <div class="form-block">
          <div class="form-label"><span class="lbl-dot"></span>邮箱配置</div>
          <div class="fields">
            <van-field v-model="mail.smtp_user" label="发件邮箱" placeholder="你的QQ邮箱，如 xxx@qq.com" type="email" />
            <van-field v-model="mail.smtp_pass" label="授权码" :placeholder="mail.smtp_pass_set ? '已保存，留空则不修改' : 'QQ邮箱SMTP授权码'" type="password" />
            <van-field v-model="mail.to_email" label="收件邮箱" placeholder="接收备份的邮箱" type="email" />
          </div>
          <div class="field-hint"><van-icon name="info-o" /> 需在 QQ 邮箱开启 SMTP 服务并生成授权码（非登录密码）</div>
        </div>

        <div v-if="mail.last_sent_key" class="mail-last"><van-icon name="success" /> 上次发送：{{ mail.last_sent_key }}</div>

        <div class="mail-btns">
          <van-button block size="small" class="btn-ghost" :loading="mailTesting" @click="testMail">测试邮箱</van-button>
          <van-button block size="small" class="btn-ghost" :loading="mailSending" @click="sendMailNow">立即发送</van-button>
          <van-button block size="small" type="primary" class="btn-save" :loading="mailSaving" @click="saveMail">保存设置</van-button>
        </div>
      </div>
      <div class="mail-off" v-else><van-icon name="envelop-o" /> 打开上方开关以配置定时发送</div>
    </div>

    <!-- 导入恢复 -->
    <div class="card">
      <div class="card-head">
        <div class="badge badge-import"><van-icon name="upgrade" /></div>
        <div class="card-head-txt">
          <div class="card-title">导入恢复</div>
          <div class="card-sub">从 .xls 文件恢复数据</div>
        </div>
      </div>
      <div class="card-desc">选择备份文件，先预览内容再决定是否导入。成员、分类、账户会自动适配。</div>
      <input ref="fileInput" type="file" accept=".xls,.xlsx" class="hidden-file" @change="onFile" />
      <van-button block type="primary" class="main-btn" @click="chooseFile"><van-icon name="upgrade" /> 选择备份文件</van-button>
      <div v-if="fileName" class="file-name"><van-icon name="description" /> {{ fileName }}</div>
    </div>

    <!-- 预览结果 -->
    <div class="card result-card" v-if="preview">
      <div class="card-head">
        <div class="badge badge-preview"><van-icon name="description" /></div>
        <div class="card-head-txt">
          <div class="card-title">文件预览</div>
          <div class="card-sub">确认内容后再导入</div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-item"><div class="stat-num">{{ fmt(preview.expenseCount) }}</div><div class="stat-lbl">支出记录</div></div>
        <div class="stat-item"><div class="stat-num">{{ fmt(preview.incomeCount) }}</div><div class="stat-lbl">收入记录</div></div>
        <div class="stat-item"><div class="stat-num">{{ fmt(preview.transferCount || 0) }}</div><div class="stat-lbl">转账记录</div></div>
        <div class="stat-item"><div class="stat-num">{{ fmt(preview.adjustmentCount || 0) }}</div><div class="stat-lbl">余额/负债变更</div></div>
        <div class="stat-item"><div class="stat-num">{{ fmt(preview.memberCount) }}</div><div class="stat-lbl">成员</div></div>
        <div class="stat-item"><div class="stat-num">{{ fmt(preview.categoryCount) }}</div><div class="stat-lbl">分类</div></div>
      </div>
      <div v-if="skippedSheets.length" class="skip-tip">未导入工作表：{{ skippedSheets.join('、') }}</div>
      <div class="mode-block">
        <div class="form-label"><span class="lbl-dot"></span>导入方式</div>
        <van-radio-group v-model="mode" direction="horizontal" class="mode-radio">
          <van-radio name="append">追加</van-radio>
          <van-radio name="replace">覆盖（清空旧记录）</van-radio>
        </van-radio-group>
      </div>
      <div class="result-btns">
        <van-button block @click="resetImport">取消</van-button>
        <van-button block type="primary" :loading="importing" @click="doImport">确认导入</van-button>
      </div>
    </div>

    <!-- 危险操作 -->
    <div class="card danger-card">
      <div class="card-head">
        <div class="badge badge-danger"><van-icon name="warning-o" /></div>
        <div class="card-head-txt">
          <div class="card-title">危险操作</div>
          <div class="card-sub">请谨慎操作</div>
        </div>
      </div>
      <div class="card-desc">清空当前账本的全部流水（收支、转账、余额/负债变更）。成员、分类、账户、预算会保留。此操作不可撤销，建议先导出备份。</div>
      <van-button block type="danger" class="danger-btn" :loading="clearing" @click="doClear"><van-icon name="delete-o" /> 清空全部流水</van-button>
    </div>

    <van-action-sheet v-model:show="showBooks" :actions="bookActions" @select="onSelectBook" cancel-text="取消" />

    <!-- 过程进度弹层 -->
    <van-overlay :show="progress.show" :z-index="2000" :lock-scroll="true">
      <div class="progress-wrap" @click.stop>
        <div class="progress-card">
          <van-loading type="spinner" size="38px" color="#ff6b35" />
          <div class="progress-title">{{ progress.title }}</div>
          <div class="progress-bar"><div class="progress-fill" :style="{ width: progress.percent + '%' }"></div></div>
          <div class="progress-pct">{{ progress.percent }}%</div>
          <div class="progress-steps">
            <div v-for="(s, i) in progress.steps" :key="i" class="progress-step" :class="{ done: i < progress.current, active: i === progress.current }">
              <span class="step-dot">{{ i < progress.current ? '✓' : i + 1 }}</span>
              <span class="step-label">{{ s }}</span>
            </div>
          </div>
          <div class="progress-hint">数据较多时可能需要几秒，请勿关闭页面</div>
        </div>
      </div>
    </van-overlay>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from '../store'
import { api } from '../api'
import { clearCache } from '../utils/cache'
import { showToast, showDialog, showLoadingToast, closeToast } from 'vant'

const store = useStore()
const showBooks = ref(false)
const fileInput = ref(null)
const fileName = ref('')
const preview = ref(null)
const mode = ref('append')
const importing = ref(false)
const exporting = ref(false)
const clearing = ref(false)

// ---------- 定时邮件备份 ----------
const mail = ref({
  enabled: false, frequency: 'daily', send_time: '09:00',
  weekday: 1, month_day: 1, month: 1, year_day: 1,
  smtp_user: '', smtp_pass: '', smtp_pass_set: false,
  to_email: '', last_sent_key: ''
})
const mailSaving = ref(false)
const mailTesting = ref(false)
const mailSending = ref(false)

async function loadMailSettings() {
  try {
    const cfg = await api.emailBackup.getSettings()
    mail.value = { ...mail.value, ...cfg, smtp_pass: '' }
  } catch (e) { /* 首次无配置，用默认值 */ }
}

function mailPayload(enabledOverride) {
  const m = mail.value
  return {
    enabled: enabledOverride !== undefined ? enabledOverride : m.enabled,
    frequency: m.frequency, send_time: m.send_time,
    weekday: m.weekday, month_day: m.month_day, month: m.month, year_day: m.year_day,
    smtp_user: m.smtp_user, smtp_pass: m.smtp_pass, to_email: m.to_email,
    book_id: store.currentBookId || null
  }
}

// 开关变化：关闭立即持久化（此时配置表单已隐藏，不能依赖保存按钮）；打开仅提示配置后保存
async function onMailToggle(val) {
  if (val) {
    showToast('请填写邮箱配置后点「保存设置」')
    return
  }
  mailSaving.value = true
  try {
    await api.emailBackup.saveSettings(mailPayload(false))
    showToast('已关闭定时备份')
  } catch (e) {
    mail.value.enabled = true
    showToast('关闭失败：' + e.message)
  }
  mailSaving.value = false
}

async function saveMail() {
  mailSaving.value = true
  try {
    const res = await api.emailBackup.saveSettings(mailPayload())
    mail.value.smtp_pass_set = res.config.smtp_pass_set
    mail.value.smtp_pass = ''
    showToast(mail.value.enabled ? '已保存，定时备份已启用' : '已保存，定时备份未启用')
  } catch (e) { showToast(e.message) }
  mailSaving.value = false
}

async function testMail() {
  mailTesting.value = true
  try {
    await api.emailBackup.test({ smtp_user: mail.value.smtp_user, smtp_pass: mail.value.smtp_pass, to_email: mail.value.to_email })
    showToast('测试邮件已发送，请查收')
  } catch (e) { showToast(e.message) }
  mailTesting.value = false
}

async function sendMailNow() {
  mailSending.value = true
  try {
    const res = await api.emailBackup.sendNow({ smtp_user: mail.value.smtp_user, smtp_pass: mail.value.smtp_pass, to_email: mail.value.to_email })
    showToast(`备份已发送（${res.stamp}）`)
    await loadMailSettings()
  } catch (e) { showToast(e.message) }
  mailSending.value = false
}

const bookName = computed(() => store.currentBook?.name || '-')
const bookActions = computed(() => store.books.map(b => ({ id: b.id, name: b.name })))
const skippedSheets = computed(() => (preview.value?.skippedSheets || []))
const fmt = n => Number(n || 0).toLocaleString()

// ---------- 进度弹层 ----------
const progress = ref({ show: false, title: '', steps: [], current: 0, percent: 0 })
let progressTimer = null
function startProgress(title, steps) {
  clearInterval(progressTimer)
  progress.value = { show: true, title, steps, current: 0, percent: 0 }
  progressTimer = setInterval(() => {
    const p = progress.value
    // 缓动逼近 92%，等请求真正完成后再跳到 100%
    p.percent = Math.min(92, p.percent + Math.max(1, (92 - p.percent) * 0.09))
    p.current = Math.min(steps.length - 1, Math.floor(p.percent / (100 / steps.length)))
  }, 120)
}
function finishProgress() {
  clearInterval(progressTimer)
  progress.value.percent = 100
  progress.value.current = progress.value.steps.length
  setTimeout(() => { progress.value.show = false }, 450)
}
function abortProgress() {
  clearInterval(progressTimer)
  progress.value.show = false
}
onBeforeUnmount(() => clearInterval(progressTimer))

function chooseFile() { fileInput.value?.click() }
function resetImport() {
  preview.value = null
  fileName.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fileName.value = file.name
  preview.value = null
  const toast = showLoadingToast({ message: '正在解析备份文件…', forbidClick: true, duration: 0 })
  try {
    preview.value = await api.backup.preview(file)
    _pendingFile = file
    toast.close()
  } catch (err) {
    toast.close()
    showToast(err.message)
  }
}
let _pendingFile = null

function onSelectBook(action) {
  store.setBook(action.id)
  showBooks.value = false
}

async function doExport() {
  if (!store.currentBookId) return showToast('请先选择账本')
  exporting.value = true
  startProgress('正在导出备份', ['读取账本数据', '生成 Excel 文件', '准备下载'])
  try {
    const url = api.backup.exportUrl(store.currentBookId)
    const resp = await fetch(url)
    if (!resp.ok) throw new Error('导出失败，请重试')
    const blob = await resp.blob()
    finishProgress()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `suisoji_backup_${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  } catch (e) {
    abortProgress()
    showToast(e.message)
  }
  exporting.value = false
}

async function doImport() {
  if (!_pendingFile) return showToast('请先选择文件')
  if (mode.value === 'replace') {
    try {
      await showDialog({
        title: '覆盖导入',
        message: '将清空当前账本的全部旧记录，再导入文件数据。此操作不可撤销，确定继续？',
        confirmButtonText: '确定覆盖'
      })
    } catch (e) { return }
  }
  importing.value = true
  startProgress('正在导入数据', ['解析备份文件', '写入流水记录', '处理转账与调整', '完成导入'])
  try {
    const res = await api.backup.import(_pendingFile, store.currentBookId, mode.value)
    finishProgress()
    clearCache()
    await store.loadBase()
    store.touch()
    showToast(`导入成功：支出 ${fmt(res.expense)} 条、收入 ${fmt(res.income)} 条`)
    resetImport()
  } catch (e) {
    abortProgress()
    showToast(e.message)
  }
  importing.value = false
}

async function doClear() {
  if (!store.currentBookId) return showToast('请先选择账本')
  try {
    await showDialog({
      title: '确认清空',
      message: `将清空账本「${bookName.value}」的全部流水，且不可恢复。建议先导出备份。确定继续？`,
      confirmButtonText: '确定清空',
      confirmButtonColor: '#ee0a24'
    })
  } catch (e) { return }
  clearing.value = true
  try {
    const res = await api.backup.clear(store.currentBookId)
    const total = Number(res.records || 0) + Number(res.transfers || 0) + Number(res.adjustments || 0)
    showToast(`已清空 ${fmt(total)} 条流水`)
    clearCache()
    await store.loadBase()
    store.touch()
  } catch (e) { showToast(e.message) }
  clearing.value = false
}

onMounted(async () => {
  if (!store.ready) await store.loadBase().catch(() => {})
  loadMailSettings()
})
</script>

<style scoped>
.backup-page { padding-bottom: calc(32px + env(safe-area-inset-bottom)); background: #f5f6f8; }

/* 顶部 Hero */
.hero { position: relative; overflow: hidden; margin: 12px 12px 6px; border-radius: 16px; background: var(--primary-grad); padding: 22px 20px 20px; color: #fff; box-shadow: 0 8px 24px rgba(255,107,53,.25); }
.hero-ring { position: absolute; border: 1.5px solid rgba(255,255,255,.18); border-radius: 50%; pointer-events: none; }
.ring-a { width: 160px; height: 160px; right: -40px; top: -60px; }
.ring-b { width: 230px; height: 230px; right: -90px; top: -95px; }
.hero-content { position: relative; z-index: 1; }
.hero-icon { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 12px; }
.hero-title { font-size: 21px; font-weight: 800; letter-spacing: .5px; }
.hero-sub { font-size: 13px; opacity: .92; margin-top: 5px; }
.hero-tip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; margin-top: 14px; background: rgba(255,255,255,.18); padding: 5px 10px; border-radius: 20px; }

/* 功能卡片 */
.card { background: #fff; border-radius: 14px; margin: 12px; padding: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 12px; }
.badge { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 21px; color: #fff; flex-shrink: 0; }
.badge-export { background: linear-gradient(135deg,#4facfe,#00c6ff); }
.badge-mail { background: var(--primary-grad); }
.badge-import { background: linear-gradient(135deg,#43e97b,#38f9d7); }
.badge-preview { background: linear-gradient(135deg,#667eea,#764ba2); }
.badge-danger { background: linear-gradient(135deg,#ff8a5b,#ee0a24); }
.card-head-txt { flex: 1; min-width: 0; }
.card-title { font-size: 15px; font-weight: 700; color: #1a1a1a; }
.card-sub { font-size: 11px; color: #999; margin-top: 3px; }
.card-desc { font-size: 12px; color: #8a8a8a; line-height: 1.7; margin: 12px 0 14px; }
.main-btn { border-radius: 10px; height: 42px; font-weight: 600; font-size: 14px; }
.main-btn.van-button--primary { background: var(--primary-grad); border: none; box-shadow: 0 4px 12px rgba(255,107,53,.25); }

/* 定时邮件备份 */
.mail-switch { flex-shrink: 0; }
.mail-form { margin-top: 14px; border-top: 1px dashed #ececec; padding-top: 2px; }
.form-block { padding: 12px 0 6px; }
.form-block + .form-block { border-top: 1px solid #f5f5f5; }
.form-label { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 12px; }
.form-label.sm { font-size: 12px; color: #666; margin-bottom: 10px; }
.lbl-dot { width: 4px; height: 14px; border-radius: 2px; background: var(--primary); }
.chip-group { display: flex; flex-wrap: wrap; gap: 9px; }
.chip { padding: 7px 16px; border-radius: 18px; background: #f5f6f8; color: #666; font-size: 13px; border: 1px solid transparent; transition: all .18s; user-select: none; }
.chip.on { background: var(--primary-grad); color: #fff; font-weight: 600; box-shadow: 0 3px 8px rgba(255,107,53,.25); }
.chip-group.week .chip { padding: 6px 0; width: 38px; text-align: center; }
.mail-sub { background: #fafbfc; border-radius: 10px; padding: 12px; margin-top: 12px; }
.stepper-row { display: flex; align-items: center; gap: 10px; }
.unit { font-size: 13px; color: #666; }
.time-wrap { display: flex; align-items: center; gap: 10px; background: #fafbfc; border-radius: 10px; padding: 0 14px; height: 44px; color: var(--primary); font-size: 18px; }
.mail-time { flex: 1; border: none; background: transparent; font-size: 16px; color: #333; outline: none; font-family: var(--app-font); }
.fields { background: #fafbfc; border-radius: 10px; overflow: hidden; }
.fields :deep(.van-field) { padding: 11px 14px; }
.fields :deep(.van-field__label) { width: 72px; color: #555; }
.field-hint { display: flex; align-items: flex-start; gap: 5px; font-size: 11px; color: #aaa; margin-top: 10px; line-height: 1.5; }
.mail-last { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #07c160; background: #f0fbf5; padding: 8px 12px; border-radius: 8px; margin-top: 12px; }
.mail-btns { display: flex; gap: 8px; margin-top: 16px; }
.mail-btns .van-button { flex: 1; padding: 0 2px; font-size: 12px; }
.btn-ghost.van-button { background: #fff; color: var(--primary); border: 1px solid var(--primary); }
.btn-save.van-button { background: var(--primary-grad); border: none; }
.mail-off { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: #bbb; background: #fafbfc; border-radius: 10px; padding: 18px; margin-top: 14px; }

/* 文件选择 */
.hidden-file { display: none; }
.file-name { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--primary); margin-top: 12px; word-break: break-all; }

/* 预览结果 */
.stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 14px 0; }
.stat-item { background: #fafbfc; border-radius: 10px; padding: 12px 6px; text-align: center; }
.stat-num { font-size: 18px; font-weight: 700; color: var(--primary); }
.stat-lbl { font-size: 11px; color: #999; margin-top: 4px; }
.skip-tip { font-size: 11px; color: #ff976a; background: #fff7f0; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; }
.mode-block { padding: 8px 0 4px; }
.mode-radio { gap: 8px 20px; flex-wrap: wrap; }
.result-btns { display: flex; gap: 10px; margin-top: 14px; }
.result-btns .van-button { flex: 1; }
.result-btns .van-button--primary { background: var(--primary-grad); border: none; }

/* 危险操作 */
.danger-card { border-left: 3px solid #ee0a24; padding-left: 14px; }
.danger-btn { border-radius: 10px; height: 42px; font-weight: 600; }

/* 过程进度弹层 */
.progress-wrap { display: flex; align-items: center; justify-content: center; height: 100%; padding: 0 32px; }
.progress-card { width: 100%; max-width: 320px; background: #fff; border-radius: 16px; padding: 28px 22px 22px; text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.18); }
.progress-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 14px 0 16px; }
.progress-bar { height: 7px; background: #eef1f5; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--primary-grad); border-radius: 4px; transition: width .15s linear; }
.progress-pct { font-size: 12px; color: var(--primary); margin: 8px 0 16px; font-weight: 600; }
.progress-steps { text-align: left; margin: 0 auto 4px; max-width: 200px; }
.progress-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #bbb; margin: 9px 0; transition: color .2s; }
.progress-step.active { color: var(--primary); font-weight: 600; }
.progress-step.done { color: #52c41a; }
.step-dot { flex: none; width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 11px; }
.progress-step.done .step-dot { background: #52c41a; border-color: #52c41a; color: #fff; }
.progress-hint { font-size: 11px; color: #aaa; margin-top: 16px; }
</style>
