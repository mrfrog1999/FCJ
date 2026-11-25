// 好看的全局通知：替代 Vant 默认黑色 toast，用于同步 / 离线等场景
// 用法：notify({ title: '已同步到本地', desc: '联网后会自动上传', type: 'sync' })
// type: sync | offline | success | info | error

const ICONS = {
  // 云同步（对勾）
  sync: '<path d="M20 6L9 17l-5-5"/>',
  // 离线云（云 + 斜杠）
  offline: '<path d="M7 18h11a4 4 0 0 0 .5-7.97A6 6 0 0 0 7.2 9.3"/><path d="M6.3 6.3A6 6 0 0 0 6 18h1"/><path d="M3 3l18 18"/>',
  // 成功对勾
  success: '<path d="M20 6L9 17l-5-5"/>',
  // 信息
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  // 错误
  error: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>'
}

const TONE = {
  sync: 'linear-gradient(135deg,#ff9a44,#ff6b35)',
  offline: 'linear-gradient(135deg,#4facfe,#2f80ed)',
  success: 'linear-gradient(135deg,#2fbf71,#12a05c)',
  info: 'linear-gradient(135deg,#8e9bab,#5b6776)',
  error: 'linear-gradient(135deg,#ff6b6b,#e8443c)'
}

let cur = null
let hideTimer = null

export function notify({ title = '', desc = '', type = 'info', duration = 2600 } = {}) {
  if (typeof document === 'undefined') return
  dismiss()

  const el = document.createElement('div')
  el.className = 'ssj-notify'
  el.setAttribute('role', 'status')
  const icon = ICONS[type] || ICONS.info
  const tone = TONE[type] || TONE.info
  el.innerHTML =
    '<div class="ssj-notify__icon" style="background:' + tone + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg>' +
    '</div>' +
    '<div class="ssj-notify__body">' +
      '<div class="ssj-notify__title">' + escapeHtml(title) + '</div>' +
      (desc ? '<div class="ssj-notify__desc">' + escapeHtml(desc) + '</div>' : '') +
    '</div>'

  document.body.appendChild(el)
  cur = el
  // 触发进入动画
  requestAnimationFrame(() => el && el.classList.add('ssj-notify--in'))
  el.addEventListener('click', dismiss)
  hideTimer = setTimeout(dismiss, duration)
}

export function dismiss() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  if (!cur) return
  const el = cur
  cur = null
  el.classList.remove('ssj-notify--in')
  el.classList.add('ssj-notify--out')
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el) }, 280)
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
