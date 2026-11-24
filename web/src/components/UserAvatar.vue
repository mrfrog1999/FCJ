<template>
  <span class="uavatar" :class="{ img: isImage }" :style="boxStyle">
    <img v-if="isImage" :src="avatar" alt="" />
    <span v-else class="initial">{{ initial }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  avatar: { type: String, default: '' },
  name: { type: String, default: '' },
  color: { type: String, default: '#ff7a45' },
  size: { type: [Number, String], default: 40 }
})

const isImage = computed(() => typeof props.avatar === 'string' && /^data:image\//.test(props.avatar))
const isPresetColor = computed(() => typeof props.avatar === 'string' && /^#[0-9a-fA-F]{6}$/.test(props.avatar))
const initial = computed(() => (props.name || '随').trim().charAt(0).toUpperCase())
const boxStyle = computed(() => {
  const s = typeof props.size === 'number' ? props.size + 'px' : props.size
  const bg = isImage.value ? 'transparent' : (isPresetColor.value ? props.avatar : (props.color || '#ff7a45'))
  return {
    width: s,
    height: s,
    fontSize: `calc(${s} * 0.42)`,
    background: bg
  }
})
</script>

<style scoped>
.uavatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
  line-height: 1;
  user-select: none;
}
.uavatar.img { background: transparent !important; }
.uavatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
