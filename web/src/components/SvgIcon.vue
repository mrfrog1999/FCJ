<template>
  <svg
    :width="size" :height="size" viewBox="0 0 24 24" fill="none"
    :stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  ><g v-html="pathData" /></svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: 'more' },
  size: { type: [Number, String], default: 24 },
  color: { type: String, default: 'currentColor' },
  strokeWidth: { type: [Number, String], default: 1.9 }
})

// 简约线性图标集（feather 风格，24x24）
const icons = {
  // 支出类
  utensils: '<path d="M4 3v7a3 3 0 0 0 6 0V3"/><path d="M7 3v18"/><path d="M20 3c-2.5 0-4 2-4 5v3h4"/><path d="M20 11v10"/>',
  car: '<path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><path d="M5 17v2h2v-2M17 17v2h2v-2"/><rect x="5" y="9" width="14" height="5" rx="1"/><path d="M7 12h.01M17 12h.01"/>',
  shopping: '<path d="M5 8h14l1 13H4L5 8z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  gamepad: '<path d="M6 9h12a4 4 0 0 1 4 4v2a3 3 0 0 1-5.2 2L15 15H9l-1.8 2A3 3 0 0 1 2 15v-2a4 4 0 0 1 4-4z"/><path d="M7 12v2M6 13h2"/><circle cx="16" cy="12.5" r=".8"/><circle cx="18" cy="14.5" r=".8"/>',
  home: '<path d="M4 10l8-7 8 7v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9z"/><path d="M9 21v-7h6v7"/>',
  medical: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  book: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"/><path d="M5 18a2 2 0 0 1 2-2h11"/><path d="M9 8h6"/>',
  gift: '<rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v7h14v-7"/><path d="M12 9v11"/><path d="M12 9H8.5a2.5 2.5 0 1 1 0-5C11 4 12 9 12 9zM12 9h3.5a2.5 2.5 0 1 0 0-5C13 4 12 9 12 9z"/>',
  plane: '<path d="M21 15l-8-3V6.5a1.5 1.5 0 0 0-3 0V12l-8 3v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-4.5l8 2.5v-2z"/>',
  // 收入类
  wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M16 15h2"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3"/><path d="M12 13v4M8 21h8M10 17h4"/>',
  chartup: '<path d="M4 18V6M4 18h16"/><path d="M7 14l4-4 3 3 5-6"/><path d="M15 7h4v4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  redpacket: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 8h14"/><path d="M9 3c0 2 1.3 3 3 3s3-1 3-3"/><circle cx="12" cy="14" r="2"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  // UI 导航
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  chart: '<path d="M4 20V4"/><rect x="7" y="12" width="3" height="8" rx="1"/><rect x="12" y="8" width="3" height="12" rx="1"/><rect x="17" y="4" width="3" height="16" rx="1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  bookopen: '<path d="M12 6c-2-1.5-5-2-9-1.5V19c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V4.5C17 4 14 4.5 12 6z"/><path d="M12 6v14.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4 4 0 0 0 7 18z"/>',
  edit: '<path d="M12 20H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l3 3"/><path d="M18 3l3 3-9 9-4 1 1-4 9-9z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M17 11a3 3 0 0 0 0-6M18 14a5 5 0 0 1 3 5v1"/>',
  walletcard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  pie: '<path d="M12 3v9h9"/><path d="M20.5 14A9 9 0 1 1 10 3.5"/>',
  flag: '<path d="M5 21V4M5 5h11l-2 3 2 3H5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  // 账户类型
  wechat: '<path d="M9 4.5c-4 0-7 2.6-7 5.8 0 1.8 1 3.4 2.6 4.4L4 17.5l2.9-1.4c.7.2 1.4.3 2.1.3h.5"/><path d="M7 8.5h.01M11 8.5h.01"/><path d="M15 11.5c-3.4 0-6.2 2.3-6.2 5.1 0 2.8 2.8 5.1 6.2 5.1.8 0 1.6-.1 2.3-.3l2.9 1.4-.6-2.6c1.6-1 2.6-2.5 2.6-4.2 0-2.5-2.5-4.5-5.7-4.5z"/><path d="M13 15.5h.01M17 15.5h.01"/>',
  bank: '<path d="M3 9.5L12 4l9 5.5"/><path d="M4.5 10.5v8M9 10.5v8M15 10.5v8M19.5 10.5v8"/><path d="M3 20h18"/>',
  fund: '<path d="M3 19h18"/><path d="M4 15l4.5-5 3.5 3 7-8"/><path d="M15 5h4v4"/>',
  alipay: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>'
}

const pathData = computed(() => icons[props.name] || icons.more)
</script>
