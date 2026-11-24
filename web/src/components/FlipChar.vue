<template>
  <span v-if="!isDigit" class="sf-sep">{{ char }}</span>
  <span v-else class="sf" :class="{ card }" :style="{ '--d': delay + 's' }">
    <span class="sf-ghost">0</span>
    <span class="sf-track" :class="{ anim: animating }" :style="{ transform: 'translateY(' + (-n * 1.3) + 'em)' }">
      <span class="sf-n" v-for="(d, idx) in digits" :key="idx">{{ d }}</span>
    </span>
  </span>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
const props = defineProps({
  char: { type: String, default: '' },
  delay: { type: Number, default: 0 },
  card: { type: Boolean, default: true },
  trigger: { type: Number, default: 0 }
})
const isDigit = computed(() => /[0-9]/.test(props.char))
const digit = computed(() => Number(props.char) || 0)
// 0-9 三遍：起点固定在第二遍，终点始终落在起点之后，保证每轮都只向上滚（从下往上翻）
const digits = [0,1,2,3,4,5,6,7,8,9, 0,1,2,3,4,5,6,7,8,9, 0,1,2,3,4,5,6,7,8,9]
// 首次直接就位到目标数字（第二遍的目标位），无入场滚动，避免先显示 0 再跳真实值
const n = ref(10 + digit.value)
const animating = ref(false)
let timer = null
let currentDigit = digit.value   // 当前显示的数字，作为下一次滚动起点
function roll() {
  const from = 10 + currentDigit              // 起点：第二遍的当前数字
  const target = digit.value                  // 本次目标数字
  let delta = (target - currentDigit + 10) % 10
  if (delta === 0) delta = 10                 // 数字不变也滚一整圈，所有位一起动
  currentDigit = target                       // 更新起点供下次使用
  animating.value = false                     // 先关动画，瞬间回到起点（显示字符不变，看不出跳变）
  n.value = from
  clearTimeout(timer)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    animating.value = true                    // 开动画
    n.value = from + delta                    // n 只增不减 → track 恒向上 → 数字统一从下往上翻
  }))
}
// 仅在后续数值/触发信号变化时滚动；首次挂载已直接就位，不做动画
watch(() => [props.char, props.trigger], roll)
</script>

<style scoped>
.sf {
  position: relative; display: inline-block;
  height: 1.3em; line-height: 1.3em;
  overflow: hidden; vertical-align: top;
  font-variant-numeric: tabular-nums;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
}
.sf-ghost { visibility: hidden; }
.sf.card { background: transparent; border-radius: 0; box-shadow: none; }
.sf-sep { display: inline-block; height: 1.3em; line-height: 1.3em; text-align: center; vertical-align: top; }

.sf-track { position: absolute; left: 0; top: 0; right: 0; display: block; will-change: transform; }
.sf-track.anim { transition: transform .7s cubic-bezier(.22,.85,.3,1) var(--d); }
.sf-n { display: block; height: 1.3em; line-height: 1.3em; text-align: center; }
</style>
