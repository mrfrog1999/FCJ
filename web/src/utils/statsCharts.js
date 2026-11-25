// 统计中心图表类型定义（入口页与详情页共用）

// 左侧竖排分组
export const chartTabs = [
  { key: 'expense', label: '支出图表' },
  { key: 'income', label: '收入图表' },
  { key: 'asset', label: '资产图表' },
  { key: 'monthly', label: '月报' }
]

// 每个图表的定义
// group 类：type + groupBy 走 /api/stats/group
// accounts 类：走 /api/accounts，按 kind 过滤
// trend 类：走 /api/stats/trend
export const chartDefs = {
  expense_category:   { title: '分类支出', tab: 'expense', type: 'expense', groupBy: 'category',   color: '#00b578' },
  expense_category2:  { title: '二级支出', tab: 'expense', type: 'expense', groupBy: 'category2',  color: '#00b578' },
  expense_account:    { title: '账户支出', tab: 'expense', type: 'expense', groupBy: 'account',    color: '#00b578' },
  expense_merchant:   { title: '商家支出', tab: 'expense', type: 'expense', groupBy: 'merchant',   color: '#00b578' },
  expense_project:    { title: '项目支出', tab: 'expense', type: 'expense', groupBy: 'project',    color: '#00b578' },
  expense_member:     { title: '成员支出', tab: 'expense', type: 'expense', groupBy: 'member',     color: '#00b578' },

  income_category:    { title: '分类收入', tab: 'income', type: 'income', groupBy: 'category',   color: '#ff4d4f' },
  income_category2:   { title: '二级收入', tab: 'income', type: 'income', groupBy: 'category2',  color: '#ff4d4f' },
  income_account:     { title: '账户收入', tab: 'income', type: 'income', groupBy: 'account',    color: '#ff4d4f' },
  income_project:     { title: '项目收入', tab: 'income', type: 'income', groupBy: 'project',    color: '#ff4d4f' },
  income_member:      { title: '成员收入', tab: 'income', type: 'income', groupBy: 'member',     color: '#ff4d4f' },

  asset_asset:        { title: '资产', tab: 'asset', source: 'accounts', kind: 'asset',     color: '#9254de' },
  asset_liability:    { title: '负债', tab: 'asset', source: 'accounts', kind: 'liability', color: '#9254de' },

  monthly_income:     { title: '月度收入', tab: 'monthly', source: 'trend', metric: 'income', color: '#fa8c16' },
  monthly_expense:    { title: '月度支出', tab: 'monthly', source: 'trend', metric: 'expense', color: '#fa8c16' },
  monthly_compare:    { title: '收支对比', tab: 'monthly', source: 'trend', metric: 'both',   color: '#fa8c16' },
  monthly_budget:     { title: '预算支出', tab: 'monthly', source: 'budget', color: '#fa8c16' },
  monthly_member:     { title: '成员收支', tab: 'monthly', source: 'memberFlow', color: '#fa8c16' }
}

// 每个 tab 下的图表项（保持参考图顺序）
export const chartsByTab = {
  expense: ['expense_category', 'expense_category2', 'expense_account', 'expense_merchant', 'expense_project', 'expense_member'],
  income: ['income_category', 'income_category2', 'income_account', 'income_project', 'income_member'],
  asset: ['asset_asset', 'asset_liability'],
  monthly: ['monthly_income', 'monthly_expense', 'monthly_compare', 'monthly_budget', 'monthly_member']
}

// 网格项图标（Vant icon name，本地已注册）
export const chartIcon = {
  expense_category: 'bars', expense_category2: 'list-switch', expense_account: 'credit-pay',
  expense_merchant: 'shop-o', expense_project: 'folder-o', expense_member: 'friends-o',
  income_category: 'bars', income_category2: 'list-switch', income_account: 'credit-pay',
  income_project: 'folder-o', income_member: 'friends-o',
  asset_asset: 'gold-coin-o', asset_liability: 'balance-list-o',
  monthly_income: 'arrow-up', monthly_expense: 'arrow-down', monthly_compare: 'bar-chart-o',
  monthly_budget: 'bill-o', monthly_member: 'friends-o'
}

// 现代和谐色板：色相环均匀铺开、饱和度/明度统一，扁平纯色即可出彩，
// 不再依赖高饱和彩虹 + 立体渐变。前 10 色为主色，后 6 色为同调延伸。
export const PIE_COLORS = [
  '#FF6B6B', '#FF9F43', '#FFC847', '#8FCB6F', '#4FC9BE', '#45B7E5',
  '#5B7CFA', '#9B72F2', '#EC7BC4', '#F2759B', '#FFAB6B', '#7FD8C4',
  '#7B9FF5', '#C39BF5', '#F0A6CB', '#B8BCCB'
]

// hex 调亮/调暗，用于生成扇区渐变的亮面与暗面
export function shade(hex, percent) {
  const h = hex.replace('#', '')
  const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255
  if (percent >= 0) {
    r = Math.round(r + (255 - r) * percent)
    g = Math.round(g + (255 - g) * percent)
    b = Math.round(b + (255 - b) * percent)
  } else {
    r = Math.round(r * (1 + percent)); g = Math.round(g * (1 + percent)); b = Math.round(b * (1 + percent))
  }
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

// 时间范围选项
export const RANGE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '天', value: 'today' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '季', value: 'quarter' },
  { label: '年', value: 'year' }
]

export function rangeLabel(range) {
  if (range === 'custom') return '自定义'
  return RANGE_OPTIONS.find(o => o.value === range)?.label || '全部时间'
}

// ---------- 离线本地聚合 ----------
// 用缓存的全量流水明细在本地复刻 /api/stats/group 的分组与筛选，
// 使离线/弱网时切换筛选条件也能得到正确结果（与服务端口径一致）。
function pad(n) { return String(n).padStart(2, '0') }
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function rangeStart(range, q) {
  const today = new Date()
  if (range === 'custom') return q.start_date || ''
  if (range === 'all') return ''
  if (range === 'today') return ymd(today)
  if (range === 'week') { const d = new Date(today); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d) }
  if (range === 'month') return ymd(new Date(today.getFullYear(), today.getMonth(), 1))
  if (range === 'quarter') return ymd(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1))
  if (range === 'year') return ymd(new Date(today.getFullYear(), 0, 1))
  return ''
}

export function localGroup(raw, def, q) {
  const type = def.type || 'expense'
  const groupBy = def.groupBy || 'category'
  const range = q.range || 'all'
  const start = rangeStart(range, q)
  const end = range === 'custom' ? (q.end_date || '') : ''

  const grouped = new Map()
  for (const r of raw) {
    if (r.type !== type) continue
    const date = String(r.record_date || '')
    if (range === 'today') { if (date.slice(0, 10) !== start) continue }
    else if (start && date.slice(0, 10) < start) continue
    if (end && date.slice(0, 10) > end) continue

    if (q.category_id && String(r.category_id) !== String(q.category_id)) continue
    if (q.account && String(r.account || '') !== String(q.account)) continue
    if (q.member_id && String(r.member_id ?? r.user_id) !== String(q.member_id)) continue
    if (q.project && String(r.project || '') !== String(q.project)) continue
    if (q.merchant && String(r.merchant || '') !== String(q.merchant)) continue
    const amt = Number(r.amount || 0)
    if (q.min_amount && amt < Number(q.min_amount)) continue
    if (q.max_amount && amt > Number(q.max_amount)) continue
    if (q.note && !String(r.note || '').includes(String(q.note))) continue

    let gid, name, icon = '', color = ''
    if (groupBy === 'category') {
      gid = r.category_id; name = r.category_name || '未分类'; icon = r.category_icon || ''; color = r.category_color || ''
    } else if (groupBy === 'category2') {
      name = r.category2 || r.category1 || '未分类'; gid = name
    } else if (groupBy === 'account') {
      name = r.account || '未指定账户'; gid = name
    } else if (groupBy === 'merchant') {
      if (!r.merchant) continue; name = r.merchant; gid = name
    } else if (groupBy === 'project') {
      if (!r.project) continue; name = r.project; gid = name
    } else if (groupBy === 'member') {
      gid = r.member_id ?? r.user_id
      name = r.member_nickname || r.member_username || '未指定成员'
    } else { continue }

    const cur = grouped.get(gid) || { id: gid, name, icon, color, total: 0, count: 0 }
    cur.total += amt
    cur.count += 1
    grouped.set(gid, cur)
  }
  return Array.from(grouped.values()).map(x => ({ ...x, total: +x.total.toFixed(2) }))
}
