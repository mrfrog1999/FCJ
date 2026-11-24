<template>
  <img class="cat-icon-img" :src="file" :style="{ width: size + 'px', height: size + 'px' }" alt="" />
</template>

<script setup>
import { computed } from 'vue'
import { resolveIconFile } from '../utils/categoryIconMap'

const props = defineProps({
  name: { type: String, default: '' },   // 分类名（二级，用于精细映射）
  icon: { type: String, default: '' },   // icon 字段（语义名或 emoji）
  size: { type: [Number, String], default: 24 }
})

const file = computed(() => resolveIconFile(props.icon, props.name))
</script>

<style scoped>
.cat-icon-img { display: block; object-fit: contain; flex-shrink: 0; }
</style>
