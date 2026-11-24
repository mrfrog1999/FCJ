// 新分类图标库：语义 -> 图标文件（/category-icons/ 下的彩色 PNG/WebP）
// 图标文件名为压缩包原始随机名，此处按图标内容语义映射，不改文件本身。
import { standardIcons, bankIcons, fancyIcons } from './iconFiles'
import { iconTheme, THEME_FANCY } from './theme'

// 平台网关要求静态资源带 sharecode，否则 403。与 api/index.js 的 withSharecode 保持一致。
function withShare(url) {
  try {
    const code = localStorage.getItem('ssj_sharecode')
    if (code) url += (url.includes('?') ? '&' : '?') + 'sharecode=' + encodeURIComponent(code)
  } catch (e) {}
  return url
}

// 标准图标 URL（/category-icons/）
export function iconUrl(file) {
  return withShare('/category-icons/' + file)
}

// 银行图标 URL（/bank-icons/，压缩包原图不修改）
export function bankIconUrl(file) {
  return withShare('/bank-icons/' + file)
}

// 炫彩图标 URL（/fancy-icons/，压缩包原图不修改）
export function fancyIconUrl(file) {
  return withShare('/fancy-icons/' + file)
}

// 转账图标：标准主题用 -w2.webp（红圈双向箭头），炫彩主题用指定神像图标
const TRANSFER_STANDARD_FILE = '-w2.webp'
const TRANSFER_FANCY_FILE = 'CsoXM2FSifuEUFMWAAAAAGhYg64237.png'
export function transferIconUrl() {
  return iconTheme.value === THEME_FANCY
    ? fancyIconUrl(TRANSFER_FANCY_FILE)
    : iconUrl(TRANSFER_STANDARD_FILE)
}

// 带前缀的图标值 -> 展示 URL。图标选择页选中的值形如 bank:abc.png / std:2iS.png / fancy:xxx.png
export function resolveImageSrc(value) {
  if (!value) return ''
  if (value.startsWith('bank:')) return bankIconUrl(value.slice(5))
  if (value.startsWith('fancy:')) return fancyIconUrl(value.slice(6))
  if (value.startsWith('std:')) return iconUrl(value.slice(4))
  return ''
}

// 是否为「图标选择页」产出的带前缀图标值
export function isPickedIcon(value) {
  return typeof value === 'string' && (value.startsWith('bank:') || value.startsWith('std:') || value.startsWith('fancy:'))
}

// 一级/二级分类通用语义映射（覆盖数据库现有 16 种 icon 字段）
export const iconFileBySemantic = {
  utensils: '2iS.png',      // 碗/餐具 -> 餐饮
  car: 'PuK.png',           // 汽车 -> 交通/打车
  shopping: '3rg.png',      // 购物袋 -> 购物
  gamepad: 'Ywg.png',       // 游戏手柄/奖杯风格 -> 娱乐
  home: '7cB.png',          // 房子 -> 居家
  medical: '4kl.png',       // 医疗箱 -> 医疗
  book: 'KO1.png',          // 书本 -> 教育
  gift: 'Be1.png',          // 礼物盒 -> 人情
  plane: 'nSR.png',         // 飞机 -> 旅行
  wallet: '77C.png',        // 钱袋 -> 工资/钱包
  trophy: 'Ywg.png',        // 奖杯 -> 奖金
  chartup: 'h0Z.png',       // 上升图表 -> 理财
  briefcase: 'BkF.png',     // 公文包 -> 兼职
  redpacket: 'H7I.png',     // 人民币/红包 -> 红包
  more: 'x4N.png',          // 更多/其他
  phone: 'HWp.png',        // 手机 -> 手机费/通讯
  pie: 'W5x.png',           // 饼图 -> 理财2
  flag: 'Fed.png',          // 目标旗帜
  cloud: 'h0Z.png',         // 云/趋势
  // 账户类型语义（兼容历史）
  wechat: 'nZx.png', bank: '7cB.png', fund: 'h0Z.png',
  alipay: 'OTn.png', card: '1-A.png'
}

// 二级分类名 -> 更精细的语义图标（优先于 icon 字段），让同类二级分类更有辨识度
const nameSemanticMap = {
  // 餐饮细类
  '早午晚餐': 'utensils', '水果零食': 'fruit', '肉类': 'meat', '菜': 'vegetable',
  '米面油': 'rice', '宝宝食品': 'utensils', '烟酒茶': 'drink', '餐饮': 'utensils',
  '腐败聚会': 'drink', '休闲玩乐': 'gamepad',
  // 交通细类
  '公共交通': 'bus', '私家车费用': 'car', '过路费': 'car', '停车费': 'parking',
  '打车租车': 'taxi', '修车': 'car', '保养': 'car', '油卡': 'fuel', '洗车': 'car', '违章': 'car', '交通': 'car',
  // 购物细类
  '衣服裤子': 'clothes', '数码装备': 'digital', '化妆饰品': 'cosmetic', '鞋帽包包': 'bag', '日常用品': 'shopping', '购物': 'shopping',
  // 居家细类
  '水电煤气': 'home', '物业管理': 'home', '维修保养': 'home', '装修': 'home',
  '房租': 'home', '房贷利息': 'home', '房贷本金': 'home', '有线电视费': 'tv', '居家': 'home',
  // 医疗细类
  '好医保': 'medical', '美容费': 'cosmetic', '药品费': 'medicine', '治疗费': 'medical', '保健费': 'medical', '医疗': 'medical',
  // 教育细类
  '书报杂志': 'book', '文具用品': 'book', '培训进修': 'book', '教育': 'book',
  // 人情细类
  '孝敬家长': 'gift', '送礼请客': 'gift', '慈善捐助': 'gift', '还人钱物': 'gift', '人情': 'gift',
  // 旅行娱乐
  '旅游度假': 'plane', '运动健身': 'sport', '宠物宝贝': 'pet', '旅行': 'plane',
  // 通讯
  '手机费': 'phone', '上网费': 'wifi', '邮寄费': 'package', '座机费': 'phone',
  // 其他支出
  '可报销': 'more', '其他支出': 'more', '信用卡支出': 'card', '意外丢失': 'more', '烂账损失': 'more', '银行手续': 'card', '投资亏损': 'chartup', '其他': 'more',
  // 收入细类
  '工资': 'wallet', '工资收入': 'wallet', '存款利息': 'wallet', '意外来钱': 'wallet', '公积金': 'home',
  '余额宝收益': 'chartup', '经营所得': 'briefcase', '借款': 'wallet', '奖金收入': 'trophy', '奖金': 'trophy',
  '刷app红包': 'redpacket', '中奖收入': 'trophy', '保险报销': 'medical', '信用卡还款': 'card', '信用卡收入': 'card',
  '王大朋': 'wallet', '工资返还': 'wallet', '收礼金': 'gift', '礼金收入': 'gift', '报销': 'wallet',
  '职业过节费': 'wallet', '兼职收入': 'briefcase', '拼车收入': 'car', '医保折': 'medical', '加班收入': 'wallet',
  '龙华园房租': 'home', '利息收入': 'wallet', '投资收入': 'chartup', '张明私活': 'briefcase',
  '爸给的钱': 'wallet', '过节费': 'wallet', '理财': 'chartup', '兼职': 'briefcase', '红包': 'redpacket'
}

// 精细语义 -> 图标文件
const detailSemanticFile = {
  fruit: 'JCX.png',        // 胡萝卜/水果
  meat: 'FpI.png',         // 碗/肉
  vegetable: 'Tdl.png',    // 蔬菜/沙拉碗
  rice: '4S1.png',         // 米桶
  drink: 'TPc.png',        // 酒杯/饮料
  bus: 'ONC.png',          // 公交
  parking: 'Fed.png',      // 停车P
  taxi: 'PuK.png',          // 汽车/出租
  fuel: '8me.png',         // 92号油
  clothes: '6KV.png',      // 领带/衣服
  digital: '4Yw.png',      // 相机/数码
  cosmetic: 'ENf.png',     // 化妆
  bag: 'BkF.png',          // 包
  tv: 'BV5.png',            // 显示器/电视
  medicine: 'MwA.png',     // 药丸
  sport: 'h0Z.png',        // 运动趋势
  pet: 'H8P.png',          // 猪/宠物
  wifi: 'A09.png',         // 信号/无线
  package: 'S4K.png',      // 包裹/礼物袋
  card: '1-A.png'          // 银行卡
}

// 旧 emoji -> 语义（兼容历史数据）
const emojiSemantic = {
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
  '💼': 'briefcase', '🧧': 'redpacket',
  '📦': 'more', '🔧': 'more'
}

// 供分类管理页展示的可选图标（语义 + 文件）
export const categoryIconOptions = Object.entries(iconFileBySemantic)
  .filter(([k]) => !['wechat', 'bank', 'fund', 'alipay', 'card'].includes(k))
  .map(([semantic, file]) => ({ semantic, file }))

// 图标选择页用的完整选项：标准 + 银行，value 带前缀以便存库与回显
export const standardIconOptions = standardIcons.map(f => ({ value: 'std:' + f, src: iconUrl(f), file: f }))
export const bankIconOptions = bankIcons.map(f => ({ value: 'bank:' + f, src: bankIconUrl(f), file: f }))
export const fancyIconOptions = fancyIcons.map(f => ({ value: 'fancy:' + f, src: fancyIconUrl(f), file: f }))

// 稳定字符串哈希：同一分类名始终映射到同一个炫彩图标，切换主题/重进不跳动
function stableHash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0)
}

// 炫彩主题：把分类映射到 /fancy-icons/ 下的固定图标
function resolveFancyIconFile(iconField, nameField) {
  // 用户在图标选择页手动选中的炫彩图标，优先尊重
  if (iconField && iconField.startsWith('fancy:')) return fancyIconUrl(iconField.slice(6))
  // 其余分类按「分类名 + icon 字段」稳定哈希到某个炫彩图标，保证整体换风格且每次一致
  const key = (nameField || '') + '|' + (iconField || '')
  const file = fancyIcons[stableHash(key) % fancyIcons.length]
  return fancyIconUrl(file)
}

// 标准主题下：解析标准/银行前缀 + 语义图标（忽略 fancy: 前缀，回退到语义映射）
function resolveStandardIconFile(iconField, nameField) {
  // 0) 图标选择页产出的带前缀值（bank: / std:）—— 最高优先级；fancy: 在标准主题下忽略
  if (iconField && iconField.startsWith('bank:')) return bankIconUrl(iconField.slice(5))
  if (iconField && iconField.startsWith('std:')) return iconUrl(iconField.slice(4))
  // 1) 分类名精确命中精细语义
  if (nameField && nameSemanticMap[nameField]) {
    const sem = nameSemanticMap[nameField]
    if (detailSemanticFile[sem]) return iconUrl(detailSemanticFile[sem])
    if (iconFileBySemantic[sem]) return iconUrl(iconFileBySemantic[sem])
  }
  // 2) icon 字段是 emoji（历史数据）
  if (iconField && emojiSemantic[iconField]) {
    return iconUrl(iconFileBySemantic[emojiSemantic[iconField]])
  }
  // 3) icon 字段是语义名
  if (iconField && iconFileBySemantic[iconField]) {
    return iconUrl(iconFileBySemantic[iconField])
  }
  // 4) 分类名模糊匹配
  if (nameField) {
    const rules = [
      [/餐|饭|食|菜|肉|水果|零/, 'utensils'], [/车|交通|行|路|油|洗/, 'car'],
      [/购物|衣服|鞋|包|用品|数码/, 'shopping'], [/房|家|租|水|电|物业|装修/, 'home'],
      [/医|药|病|疗|保/, 'medical'], [/书|教育|学|培训|文具/, 'book'],
      [/礼|人情|捐|送/, 'gift'], [/旅游|旅行|飞机|出差/, 'plane'],
      [/工资|薪|钱|收入|利息|红包|收益/, 'wallet'], [/奖|中奖/, 'trophy'],
      [/理财|投资|基金|股票/, 'chartup'], [/兼职|副业|工作|经营/, 'briefcase'],
      [/娱乐|游戏|玩|运动|健身|宠物/, 'gamepad'], [/手机|电话|上网|通讯|邮/, 'phone'],
      [/红包|福利/, 'redpacket']
    ]
    for (const [re, sem] of rules) {
      if (re.test(nameField)) return iconUrl(iconFileBySemantic[sem])
    }
  }
  return iconUrl(iconFileBySemantic.more)
}

// 根据分类名 + icon 字段 + 当前主题解析出图标 URL（响应式：主题切换会实时重算）
export function resolveIconFile(iconField, nameField) {
  // 读取响应式主题值（建立依赖，切换主题时所有 CategoryIcon 自动更新）
  if (iconTheme.value === THEME_FANCY) return resolveFancyIconFile(iconField, nameField)
  return resolveStandardIconFile(iconField, nameField)
}
