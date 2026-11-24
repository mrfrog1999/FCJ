// 账户分类：五类（与随手记官方口径一致），顺序即展示顺序
export const CATEGORY_META = [
  { key: 'cash', name: '现金账户' },
  { key: 'finance', name: '金融账户' },
  { key: 'credit', name: '信用卡账户' },
  { key: 'invest', name: '投资账户' },
  { key: 'virtual', name: '虚拟账户' }
]

// 显示名：优先用自定义 display_name，否则去掉 emoji 前缀
export function bareName(a) {
  if (a.display_name) return a.display_name
  return String(a.account || '').replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/gu, '').trim() || a.account
}

// 根据账户名/类型推断分类（无自定义分类时使用）
export function inferCategory(a) {
  const n = bareName(a)
  if (/微信|现金|支付宝|钱包|零钱/.test(n)) return 'cash'
  if (a.kind === 'liability' || /信用卡|花呗|白条|借呗|分期|贷款|欠款/.test(n)) return 'credit'
  if (/定期|理财|证券|基金|股票|国债/.test(n)) return 'invest'
  if (/余额宝|钱宝|零钱通|余额/.test(n)) return 'virtual'
  return 'finance'
}

// 最终分类：用户自定义优先，否则推断
export function categoryOf(a) {
  if (a.category && CATEGORY_META.some(c => c.key === a.category)) return a.category
  return inferCategory(a)
}
