// 离线写入 + 联网自动同步
// - 离线/弱网新增流水或转账时：生成 client_id 入队，并在页面列表里乐观显示
// - 联网后：按入队顺序补传（带 client_id，服务端幂等防重复），成功后通知页面刷新
import { api } from '../api'
import * as q from './syncQueue'

export function makeClientId() {
  try { return globalThis.crypto?.randomUUID?.() || ('c' + Date.now() + Math.random().toString(36).slice(2)) }
  catch (e) { return 'c' + Date.now() + Math.random().toString(36).slice(2) }
}

function currentUser() {
  try { return JSON.parse(localStorage.getItem('ssj_user') || '{}') } catch (e) { return {} }
}

// 新增失败时入队；返回本次生成的 clientId
export function enqueueCreate(kind, payload) {
  const clientId = makeClientId()
  q.enqueue({ kind, payload, clientId })
  return clientId
}

// 把队列里的待同步项构造成可直接渲染的本地记录（字段对齐后端返回）
function toLocalRecord(op) {
  const p = op.payload || {}
  const user = currentUser()
  const base = {
    id: 'local_' + op.clientId,
    _local: true,
    _clientId: op.clientId,
    user_id: user.id,
    book_id: p.book_id,
    record_date: p.record_date || p.transfer_date || '',
    member_id: p.member_id,
    member_nickname: user.nickname || '',
    note: p.note || '',
    amount: Number(p.amount || 0)
  }
  if (op.kind === 'record.create') {
    return {
      ...base,
      type: p.type,
      category_id: p.category_id,
      category1: p.category1 || '',
      category2: p.category2 || '',
      category_name: p.category2 || p.category_name || '',
      account: p.account || ''
    }
  }
  if (op.kind === 'transfer.create') {
    return {
      ...base,
      type: 'transfer',
      from_account: p.from_account || '',
      to_account: p.to_account || '',
      account: p.from_account || ''
    }
  }
  return null
}

// 撤销一条尚未上传的本地记录（用户离线时删掉记错的那笔）
export function revokePending(clientId) { q.removeByClientId(clientId) }

// 取当前账本/年份的待同步记录；year 为空表示全部年份
export function getPendingFor(bookId, year) {
  const out = []
  for (const op of q.list()) {
    const r = toLocalRecord(op)
    if (!r) continue
    if (bookId && String(r.book_id) !== String(bookId)) continue
    if (year && String(r.record_date).slice(0, 4) !== String(year)) continue
    out.push(r)
  }
  return out
}

// 合并待同步记录进列表（去重 + 按日期倒序），供离线时页面直接显示
export function mergePending(list, bookId, year) {
  const pending = getPendingFor(bookId, year)
  if (!pending.length) return list
  const base = Array.isArray(list) ? list.slice() : []
  const ids = new Set(base.map(r => String(r.id)))
  const extra = pending.filter(r => !ids.has(String(r.id)))
  if (!extra.length) return base
  return extra.concat(base).sort((a, b) => String(b.record_date || '').localeCompare(String(a.record_date || '')))
}

let flushing = false

// 补传队列。返回 { synced, remaining }
export async function flushSync() {
  if (flushing) return { synced: 0, remaining: q.count(), busy: true }
  if (!localStorage.getItem('ssj_token')) return { synced: 0, remaining: q.count() }
  const items = q.list()
  if (!items.length) return { synced: 0, remaining: 0 }

  flushing = true
  let synced = 0
  try {
    for (const op of items) {
      try {
        const payload = { ...(op.payload || {}), client_id: op.clientId }
        if (op.kind === 'record.create') await api.records.create(payload)
        else if (op.kind === 'transfer.create') await api.transfers.create(payload)
        else { q.remove(op.id); continue } // 未知类型直接丢弃，避免卡住队列
        q.remove(op.id)
        synced++
      } catch (e) {
        if (e.isNetwork) {
          // 网络仍不通：保留该条及其后所有条目，下次再按序补传
          q.markTry(op.id)
          break
        }
        // 业务错误（400/403/404 等）：这条数据服务端不接收，丢弃避免永久卡死
        q.remove(op.id)
      }
    }
  } finally {
    flushing = false
  }

  const remaining = q.count()
  if (synced > 0) {
    // 通知页面重新拉数据，用服务端正式记录替换本地乐观记录
    window.dispatchEvent(new CustomEvent('ssj:synced', { detail: { synced } }))
  }
  return { synced, remaining }
}

// 启动后台同步守护：联网事件、页面可见、定时兜底、冷启动各触发一次
// - push：把离线队列补传到服务端（带 client_id 幂等）
// - pull：通知各页重新拉服务端最新数据，让其它端的新增/修改/删除自动同步过来
let started = false
export function startSyncDaemon() {
  if (started || typeof window === 'undefined') return
  started = true
  const hasLogin = () => !!localStorage.getItem('ssj_token')
  const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false
  const pull = () => {
    if (hasLogin() && isOnline()) window.dispatchEvent(new CustomEvent('ssj:pull'))
  }
  const tick = () => {
    if (!hasLogin()) return
    if (isOnline()) {
      if (q.count()) flushSync()
      pull()
    }
  }
  window.addEventListener('online', () => setTimeout(tick, 300))
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick() })
  setTimeout(tick, 1200)
  setInterval(tick, 20000)
}
