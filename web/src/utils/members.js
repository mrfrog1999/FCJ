// 成员展示辅助：固定配色 + 昵称兜底，供记账弹窗与流水页复用
const COLORS = ['#ff7a45', '#36cfc9', '#9254de', '#597ef7', '#52c41a', '#faad14', '#ff85c0', '#40a9ff']

export function memberColor(id) {
  return COLORS[(Math.abs(Number(id) || 1) - 1) % COLORS.length]
}

export function memberName(m) {
  if (!m) return '未指定'
  // 同时兼容成员对象与账单记录里 JOIN 出来的 member_nickname
  return m.nickname || m.username || m.member_nickname || m.member_username || '成员'
}

export function memberInitial(m) {
  return memberName(m).trim().charAt(0).toUpperCase()
}

// 取成员头像：兼容成员对象(avatar)与记录 JOIN(member_avatar)
export function memberAvatar(m) {
  if (!m) return ''
  return m.avatar || m.member_avatar || ''
}
