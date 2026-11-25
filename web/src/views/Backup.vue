<template>
  <div class="page backup-page">
    <van-nav-bar title="备份与恢复" left-arrow @click-left="$router.back()" />

    <div class="tip-bar">支持随手记导出的 .xls 备份文件。会解析「支出」「收入」「转账」「余额变更」「负债变更」全部工作表：收支记为流水，转账用于账户余额划转，余额/负债变更用于账户调整。成员、分类、账户自动适配。导出的文件同样包含这 5 个工作表，可完整恢复。</div>

    <!-- 导出 -->
    <div class="section-title">导出备份</div>
    <van-cell-group inset>
      <div class="sec-body">
        <div class="sec-desc">把当前账本的收支记录导出为 .xls 文件，可用于备份或在其他设备恢复。</div>
        <van-button block type="primary" plain :loading="exporting" @click="doExport"><van-icon name="down" /> 导出 XLS</van-button>
      </div>
    </van-cell-group>

    <!-- 定时邮件备份 -->
    <div class="section-title">定时邮件备份</div>
    <van-cell-group inset>
      <div class="sec-body">
        <div class="sec-desc">到设定时间自动把备份文件发送到你的 QQ 邮箱，格式与手动导出完全一致（5 个工作表）。每个账号独立设置。</div>
        <van-cell title="启用定时发送" label="按下方频率与时间自动发送备份">
          <template #right-icon><van-switch v-model="mail.enabled" size="22" /></template>
        </van-cell>
        <div class="mail-form" v-if="mail.enabled">
          <div class="mail-label">发送频率</div>
          <van-radio-group v-model="mail.frequency" direction="horizontal" class="freq-group">
            <van-radio name="daily">每天</van-radio>
            <van-radio name="weekly">每周</van-radio>
            <van-radio name="monthly">每月</van-radio>
            <van-radio name="yearly">每年</van-radio>
          </van-radio-group>

          <div v-if="mail.frequency === 'weekly'" class="mail-sub">
            <div class="mail-label">星期</div>
            <van-radio-group v-model="mail.weekday" direction="horizontal" class="freq-group week-group">
              <van-radio :name="0">日</van-radio>
              <van-radio :name="1">一</van-radio>
              <van-radio :name="2">二</van-radio>
              <van-radio :name="3">三</van-radio>
              <van-radio :name="4">四</van-radio>
              <van-radio :name="5">五</van-radio>
              <van-radio :name="6">六</van-radio>
            </van-radio-group>
          </div>
          <div v-if="mail.frequency === 'monthly'" class="mail-sub">
            <div class="mail-label">每月第几天</div>
            <van-stepper v-model="mail.month_day" :min="1" :max="31" />
          </div>
          <div v-if="mail.frequency === 'yearly'" class="mail-sub">
            <div class="mail-label">每年日期</div>
            <div class="year-row">
              <van-stepper v-model="mail.month" :min="1" :max="12" /> <span>月</span>
              <van-stepper v-model="mail.year_day" :min="1" :max="31" /> <span>日</span>
            </div>
          </div>

          <div class="mail-label">发送时间</div>
          <input type="time" v-model="mail.send_time" class="mail-time" />

          <van-field v-model="mail.smtp_user" label="发件邮箱" placeholder="你的QQ邮箱，如 xxx@qq.com" type="email" />
          <van-field v-model="mail.smtp_pass" label="授权码" :placeholder="mail.smtp_pass_set ? '已保存，留空则不修改' : 'QQ邮箱SMTP授权码'" type="password" />
          <van-field v-model="mail.to_email" label="收件邮箱" placeholder="接收备份的邮箱" type="email" />

          <div v-if="mail.last_sent_key" class="mail-last">上次发送标记：{{ mail.last_sent_key }}</div>
          <div class="mail-btns">
            <van-button block size="small" :loading="mailTesting" @click="testMail">测试邮箱</van-button>
            <van-button block size="small" :loading="mailSending" @click="sendMailNow">立即发送</van-button>
            <van-button block size="small" type="primary" :loading="mailSaving" @click="saveMail">保存设置</van-button>
          </div>
        </div>
      </div>
    </van-cell-group>

    <!-- 导入 -->
    <div class="section-title">导入恢复</div>
    <van-cell-group inset>
      <div class="sec-body">
        <div class="sec-desc">选择 .xls 备份文件，先预览内容再决定是否导入。</div>
        <input ref="fileInput" type="file" accept=".xls,.xlsx" class="hidden-file" @change="onFile" />
        <van-button block type="primary" plain @click="chooseFile"><van-icon name="upgrade" /> 选择备份文件</van-button>
        <div v-if="fileName" class="file-name">已选择：{{ fileName }}</div>
      </div>
    </van-cell-group>

    <!-- 预览结果 -->
    <van-cell-group inset v-if="preview" class="result-card">
      <div class="result-head">文件预览</div>
      <van-cell title="支出记录" :value="preview.expenseCount + ' 条'" />
      <van-cell title="收入记录" :value="preview.incomeCount + ' 条'" />
      <van-cell title="转账记录" :value="(preview.transferCount || 0) + ' 条'" />
      <van-cell title="余额/负债变更" :value="(preview.adjustmentCount || 0) + ' 条'" />
      <van-cell title="成员" :value="preview.memberCount + ' 位'" />
      <van-cell title="分类" :value="preview.categoryCount + ' 个'" />
      <van-cell v-if="skippedSheets.length" title="未导入工作表" :value="skippedSheets.join('、')" />
      <div class="mode-row">
        <span class="mode-label">导入方式</span>
        <van-radio-group v-model="mode" direction="horizontal">
          <van-radio name="append">追加</van-radio>
          <van-radio name="replace">覆盖（清空本账本旧记录）</van-radio>
        </van-radio-group>
      </div>
      <div class="result-btns">
        <van-button block @click="resetImport">取消</van-button>
        <van-button block type="primary" :loading="importing" @click="doImport">确认导入</van-button>
      </div>
    </van-cell-group>

    <!-- 清空流水 -->
    <div class="section-title danger-title">危险操作</div>
    <van-cell-group inset>
      <div class="sec-body">
        <div class="sec-desc">清空当前账本的全部流水（收支、转账、余额/负债变更）。成员、分类、账户、预算会保留。此操作不可撤销，建议先导出备份。</div>
        <van-button block type="danger" plain :loading="clearing" @click="doClear"><van-icon name="delete-o" /> 清空全部流水</van-button>
      </div>
    </van-cell-group>

    <van-action-sheet v-model:show="showBooks" :actions="bookActions" @select="onSelectBook" cancel-text="取消" />

    <!-- 过程进度弹层 -->
    <van-overlay :show="progress.show" :z-index="2000" :lock-scroll="true">
      <div class="progress-wrap" @click.stop>
        <div class="progress-card">
          <van-loading type="spinner" size="38px" color="#1989fa" />
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
.backup-page { padding-bottom: 24px; }
.tip-bar { font-size: 12px; color: #666; background: #fff7f3; margin: 12px 16px; padding: 10px 12px; border-radius: 10px; line-height: 1.6; }
.section-title { font-size: 13px; font-weight: 600; color: #333; margin: 18px 16px 8px; }
.danger-title { color: #ee0a24; }
.sec-body { padding: 14px 16px; }
.sec-desc { font-size: 12px; color: #999; line-height: 1.6; margin-bottom: 12px; }
.hidden-file { display: none; }
.file-name { font-size: 12px; color: var(--primary); margin-top: 10px; word-break: break-all; }

/* 定时邮件备份 */
.mail-form { border-top: 1px solid #f0f0f0; margin-top: 4px; padding-top: 14px; }
.mail-label { font-size: 13px; color: #333; margin: 14px 0 10px; }
.mail-form > .mail-label:first-child { margin-top: 0; }
.freq-group { gap: 8px 18px; flex-wrap: wrap; }
.week-group .van-radio { margin-right: 6px; }
.mail-sub { background: #fafafa; border-radius: 8px; padding: 8px 12px 12px; margin-top: 4px; }
.mail-time { width: 100%; box-sizing: border-box; border: none; border-bottom: 1px solid #eee; background: transparent; font-size: 15px; color: #333; padding: 10px 0; outline: none; }
.mail-form :deep(.van-field) { padding: 10px 0; }
.mail-form :deep(.van-field__label) { width: 76px; }
.mail-last { font-size: 11px; color: #999; margin-top: 10px; }
.mail-btns { display: flex; gap: 8px; margin-top: 16px; }
.mail-btns .van-button { flex: 1; padding: 0 4px; }
.result-card { margin-top: 16px; }
.result-head { font-size: 14px; font-weight: 600; padding: 14px 16px 4px; }
.mode-row { padding: 12px 16px; }
.mode-label { display: block; font-size: 13px; color: #333; margin-bottom: 10px; }
.result-btns { display: flex; gap: 10px; padding: 6px 16px 16px; }

/* 过程进度弹层 */
.progress-wrap { display: flex; align-items: center; justify-content: center; height: 100%; padding: 0 32px; }
.progress-card { width: 100%; max-width: 320px; background: #fff; border-radius: 16px; padding: 28px 22px 22px; text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.18); }
.progress-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 14px 0 16px; }
.progress-bar { height: 7px; background: #eef1f5; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #69c0ff, #1989fa); border-radius: 4px; transition: width .15s linear; }
.progress-pct { font-size: 12px; color: #1989fa; margin: 8px 0 16px; font-weight: 600; }
.progress-steps { text-align: left; margin: 0 auto 4px; max-width: 200px; }
.progress-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #bbb; margin: 9px 0; transition: color .2s; }
.progress-step.active { color: #1989fa; font-weight: 600; }
.progress-step.done { color: #52c41a; }
.step-dot { flex: none; width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 11px; }
.progress-step.done .step-dot { background: #52c41a; border-color: #52c41a; color: #fff; }
.progress-hint { font-size: 11px; color: #aaa; margin-top: 16px; }
</style>
