// 分类中文名 -> 简约图标名
const nameMap = {
  '餐饮': 'utensils', '吃饭': 'utensils', '美食': 'utensils',
  '交通': 'car', '出行': 'car', '车费': 'car',
  '购物': 'shopping', '买东西': 'shopping', '网购': 'shopping',
  '娱乐': 'gamepad', '游戏': 'gamepad',
  '居家': 'home', '生活': 'home', '房租': 'home', '水电': 'home',
  '医疗': 'medical', '健康': 'medical', '看病': 'medical',
  '教育': 'book', '学习': 'book', '书籍': 'book',
  '人情': 'gift', '礼物': 'gift', '社交': 'gift',
  '旅行': 'plane', '旅游': 'plane', '出差': 'plane',
  '工资': 'wallet', '薪资': 'wallet', '收入': 'wallet',
  '奖金': 'trophy', '奖励': 'trophy',
  '理财': 'chartup', '投资': 'chartup', '收益': 'chartup',
  '兼职': 'briefcase', '副业': 'briefcase', '工作': 'briefcase',
  '红包': 'redpacket', '福利': 'redpacket',
  '其他': 'more', '其它': 'more', '杂项': 'more'
}

// 旧 emoji -> 简约图标名（兼容历史数据）
const emojiMap = {
  '🍜': 'utensils', '🍚': 'utensils', '🍽️': 'utensils',
  '🚌': 'car', '🚗': 'car', '🚕': 'car',
  '🛒': 'shopping', '🛍️': 'shopping',
  '🎮': 'gamepad', '🎲': 'gamepad',
  '🏠': 'home', '🏡': 'home',
  '💊': 'medical', '🏥': 'medical',
  '📚': 'book', '📖': 'book',
  '🎁': 'gift', '🎉': 'gift',
  '✈️': 'plane', '🛫': 'plane',
  '💰': 'wallet', '💵': 'wallet',
  '🏆': 'trophy', '🥇': 'trophy',
  '📈': 'chartup', '📊': 'chartup',
  '💼': 'briefcase',
  '🧧': 'redpacket',
  '📦': 'more', '🔧': 'more'
}

// 所有可选的分类图标（供分类管理页选择）
export const categoryIcons = [
  { name: 'utensils', label: '餐饮' }, { name: 'car', label: '交通' },
  { name: 'shopping', label: '购物' }, { name: 'gamepad', label: '娱乐' },
  { name: 'home', label: '居家' }, { name: 'medical', label: '医疗' },
  { name: 'book', label: '教育' }, { name: 'gift', label: '人情' },
  { name: 'plane', label: '旅行' }, { name: 'wallet', label: '工资' },
  { name: 'trophy', label: '奖金' }, { name: 'chartup', label: '理财' },
  { name: 'briefcase', label: '兼职' }, { name: 'redpacket', label: '红包' },
  { name: 'pie', label: '理财2' }, { name: 'flag', label: '目标' },
  { name: 'cloud', label: '云' }, { name: 'more', label: '其他' }
]

// 根据图标字段或分类名称解析出简约图标名
export function resolveIcon(iconField, nameField) {
  if (iconField && emojiMap[iconField]) return emojiMap[iconField]
  if (iconField && !/[^\x00-\x7F]/.test(iconField) && categoryIcons.some(i => i.name === iconField)) return iconField
  if (nameField && nameMap[nameField]) return nameMap[nameField]
  if (iconField && emojiMap[iconField]) return emojiMap[iconField]
  return 'more'
}
