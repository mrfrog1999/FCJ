// 离线待同步队列（Outbox）
// - 离线/弱网写入失败时把操作持久化到 localStorage，联网后统一补传
// - 所有条目带 userId，按当前登录用户过滤，避免多人共用设备串数据
// - 用固定 key（而非随用户切换的 key），这样退出重登仍能继续同步
const KEY = 'ssj_sync_queue_v1'

function currentUserId() {
  try { return JSON.parse(localStorage.getItem('ssj_user') || '{}').id || 0 } catch (e) { return 0 }
}

function readAll() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch (e) { return [] }
}

function writeAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch (e) { /* 超限静默失败 */ }
}

// 当前用户的待同步项（按入队时间升序，保证写入顺序）
export function list() {
  const uid = currentUserId()
  return readAll().filter(x => x && x.userId === uid).sort((a, b) => a.ts - b.ts)
}

export function count() { return list().length }

// op: { kind, payload, clientId }
export function enqueue(op) {
  const all = readAll()
  all.push({
    id: (globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)),
    userId: currentUserId(),
    kind: op.kind,
    payload: op.payload,
    clientId: op.clientId,
    ts: Date.now(),
    tries: 0
  })
  writeAll(all)
}

export function markTry(id) {
  const all = readAll()
  const item = all.find(x => x.id === id)
  if (item) item.tries = (item.tries || 0) + 1
  writeAll(all)
}

export function remove(id) {
  writeAll(readAll().filter(x => x.id !== id))
}

// 按 clientId 撤销一条尚未上传的本地记录
export function removeByClientId(clientId) {
  writeAll(readAll().filter(x => x.clientId !== clientId))
}

export function clearUser() {
  const uid = currentUserId()
  writeAll(readAll().filter(x => x && x.userId !== uid))
}
