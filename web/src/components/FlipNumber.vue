<template>
  <span class="flip-number">
    <FlipChar
      v-for="(ch, i) in chars"
      :key="i"
      :char="ch"
      :delay="i * step"
      :card="card"
      :trigger="trigger"
    />
  </span>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import FlipChar from './FlipChar.vue'
const props = defineProps({
  value: { type: String, default: '' },
  step: { type: Number, default: 0.045 },
  card: { type: Boolean, default: true }
})
const chars = computed(() => Array.from(String(props.value)))
// 每次整体数值变化，递增信号，驱动所有位（包括数字未变的位）一起滚动
const trigger = ref(0)
watch(() => props.value, () => { trigger.value++ })
</script>

<style scoped>
.flip-number { display: inline-flex; align-items: baseline; }
</style>
