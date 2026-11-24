// 全局图标主题：standard（标准）/ fancy（炫彩，默认）
// 响应式 ref，切换后所有分类图标（CategoryIcon）会实时重算。
import { ref } from 'vue'

export const THEME_STANDARD = 'standard'
export const THEME_FANCY = 'fancy'

// 初始值取本地缓存，默认炫彩；store 加载用户信息后会用服务端值覆盖
function readInitial() {
  try {
    const v = localStorage.getItem('ssj_theme')
    return v === THEME_STANDARD || v === THEME_FANCY ? v : THEME_FANCY
  } catch (e) { return THEME_FANCY }
}

export const iconTheme = ref(readInitial())

export function setIconTheme(t) {
  const v = t === THEME_STANDARD ? THEME_STANDARD : THEME_FANCY
  iconTheme.value = v
  try { localStorage.setItem('ssj_theme', v) } catch (e) {}
}

export function isFancyTheme() {
  return iconTheme.value === THEME_FANCY
}
