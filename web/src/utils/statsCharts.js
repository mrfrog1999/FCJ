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
  expense_merchant: 'shop-o', expense_project: 'cluster-o', expense_member: 'friends-o',
  income_category: 'bars', income_category2: 'list-switch', income_account: 'credit-pay',
  income_project: 'cluster-o', income_member: 'friends-o',
  asset_asset: 'gold-coin-o', asset_liability: 'balance-list-o',
  monthly_income: 'arrow-up', monthly_expense: 'arrow-down', monthly_compare: 'bar-chart-o',
  monthly_budget: 'bill-o', monthly_member: 'friends-o'
}

// 鲜艳渐变色板（用于立体饼图）
export const PIE_COLORS = [
  '#ff5e5b', '#ff8a3d', '#ffc23d', '#7ed957', '#2ecc71', '#1abc9c',
  '#22c1e0', '#3b82f6', '#5b6ef5', '#8b5cf6', '#c04df9', '#ec4899',
  '#f43f5e', '#fb923c', '#facc15', '#4ade80', '#14b8a6', '#38bdf8',
  '#818cf8', '#a855f7', '#d946ef', '#fb7185'
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
