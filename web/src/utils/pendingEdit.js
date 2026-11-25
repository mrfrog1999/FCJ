// 点击流水 / 账户流水等入口时，把手上已有的完整记录对象暂存下来，
// 记一笔页（常驻组件）可以用它同步填好表单——首帧就是这条记录的真实内容，
// 不必等 api.records.get 回来再填，避免滑入过程中先空一帧再「跳」出数据。
let pending = null

export function setPendingRecord(r) {
  pending = r ? { ...r } : null
}

export function takePendingRecord(id) {
  if (!pending) return null
  if (id != null && String(pending.id) !== String(id)) return null
  const r = pending
  pending = null
  return r
}

export function clearPendingRecord() {
  pending = null
}
