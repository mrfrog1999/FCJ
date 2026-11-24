<template>
  <img v-if="isPickedIcon(value)" :src="resolveImageSrc(value)" :style="imgStyle" class="smart-icon-img" alt="" />
  <SvgIcon v-else :name="value" :size="size" :color="color" :stroke-width="strokeWidth" />
</template>

<script setup>
import { computed } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { isPickedIcon, resolveImageSrc } from '../utils/categoryIconMap'

const props = defineProps({
  value: { type: String, default: '' },
  size: { type: [Number, String], default: 20 },
  color: { type: String, default: '#fff' },
  strokeWidth: { type: [Number, String], default: 1.8 }
})
const imgStyle = computed(() => ({ width: props.size + 'px', height: props.size + 'px' }))
</script>

<style scoped>
.smart-icon-img { display: block; object-fit: contain; flex-shrink: 0; }
</style>
