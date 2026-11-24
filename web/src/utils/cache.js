// 本地缓存层
// - 大明细（上万条流水）走 IndexedDB：容量大、异步不阻塞主线程、结构化克隆免 JSON 序列化
// - localStorage 保留给小数据（账户列表 / 统计聚合 / 预算），同步读取首屏即用
const PREFIX = 'ssj_cache_v1_'
const DB_NAME = 'ssj_cache_db'
const DB_VER = 1
const STORE = 'payloads'

function uidKey() {
  const uid = localStorage.getItem('ssj_user') || ''
  try { return JSON.parse(uid)?.id || '' } catch (e) { return '' }
}
function fullKey(key) { return `${PREFIX}${uidKey()}_${key}` }

let dbPromise = null
function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'))
      const req = indexedDB.open(DB_NAME, DB_VER)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error || new Error('open failed'))
    } catch (e) { reject(e) }
  })
  return dbPromise
}

function fresh(obj) {
  if (!obj || typeof obj !== 'object' || !('data' in obj)) return null
  if (obj.ts && Date.now() - obj.ts > 7 * 24 * 3600 * 1000) return null
  return obj.data
}

// ---------- IndexedDB（异步，承载大明细） ----------
export async function readCacheAsync(key) {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(fullKey(key))
      req.onsuccess = () => resolve(fresh(req.result))
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    return readCache(key) // 降级：IndexedDB 不可用时读 localStorage 小缓存
  }
}

export async function writeCacheAsync(key, data) {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ ts: Date.now(), data }, fullKey(key))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } catch (e) {
    // 写不进就静默放弃，不影响主流程（明细缓存只是加速手段）
  }
}

// ---------- localStorage（同步，小数据 / 降级） ----------
export function readCache(key) {
  try {
    const raw = localStorage.getItem(fullKey(key))
    if (!raw) return null
    return fresh(JSON.parse(raw))
  } catch (e) { return null }
}

export function writeCache(key, data) {
  try {
    localStorage.setItem(fullKey(key), JSON.stringify({ ts: Date.now(), data }))
  } catch (e) { /* 超限静默失败 */ }
}

// 清空本用户全部缓存（IndexedDB + localStorage），退出登录 / 数据整体重置时调用
export function clearCache() {
  // 前缀在同步阶段就算好，避免异步后 ssj_user 已被 logout 清空
  const prefix = `${PREFIX}${uidKey()}_`
  const keys = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.indexOf(prefix) === 0) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch (e) { /* ignore */ }
  // IndexedDB 整库清空（不涉及用户前缀），异步处理即可
  openDB().then(db => new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = resolve
    tx.onerror = resolve
  })).catch(() => {})
}
