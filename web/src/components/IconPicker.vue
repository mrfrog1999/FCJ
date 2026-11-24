<template>
  <Teleport to="body">
    <Transition name="picker-fade">
      <div v-if="show" class="icon-picker-page">
        <!-- 顶部导航 -->
        <div class="ip-nav">
          <div class="ip-back" @click="close"><van-icon name="arrow-left" /></div>
          <div class="ip-title">图标</div>
          <div class="ip-nav-right"></div>
        </div>

        <!-- 图标网格 -->
        <div class="ip-scroll">
          <div class="ip-grid">
            <div
              v-for="it in currentList"
              :key="it.value"
              class="ip-cell"
              :class="{ sel: modelValue === it.value }"
              @click="pick(it.value)"
            >
              <img :src="it.src" class="ip-img" alt="" />
            </div>
          </div>
          <div class="ip-empty-hint">{{ tabLabel }} · 共 {{ currentList.length }} 个</div>
        </div>

        <!-- 底部 tab：标准 / 银行 / 炫彩 -->
        <div class="ip-tabbar">
          <div class="ip-tab" :class="{ on: activeTab === 'standard' }" @click="activeTab = 'standard'">
            <span class="ipt-label">标准</span>
          </div>
          <div class="ip-tab" :class="{ on: activeTab === 'bank' }" @click="activeTab = 'bank'">
            <span class="ipt-label">银行</span>
          </div>
          <div class="ip-tab" :class="{ on: activeTab === 'fancy' }" @click="activeTab = 'fancy'">
            <span class="ipt-label">炫彩</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { standardIconOptions, bankIconOptions, fancyIconOptions } from '../utils/categoryIconMap'

const props = defineProps({
  show: { type: Boolean, default: false },
  modelValue: { type: String, default: '' },
  // 初始 tab：standard / bank / fancy
  tab: { type: String, default: 'standard' }
})
const emit = defineEmits(['update:show', 'update:modelValue'])

const activeTab = ref(props.tab || 'standard')
// 每次打开时同步外部传入的初始 tab
watch(() => props.show, (v) => { if (v) activeTab.value = props.tab || 'standard' })
const tabList = {
  standard: standardIconOptions,
  bank: bankIconOptions,
  fancy: fancyIconOptions
}
const currentList = computed(() => tabList[activeTab.value] || standardIconOptions)
const tabLabel = computed(() => ({ standard: '标准图标', bank: '银行图标', fancy: '炫彩图标' })[activeTab.value] || '图标')

function pick(value) {
  emit('update:modelValue', value)
  emit('update:show', false)
}
function close() {
  emit('update:show', false)
}
</script>

<style scoped>
.icon-picker-page {
  position: fixed; inset: 0; z-index: 3000;
  display: flex; flex-direction: column;
  background: #f5f6f8;
}
/* 顶部导航 */
.ip-nav {
  flex: 0 0 auto;
  height: calc(52px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  background: #fff;
  display: flex; align-items: center;
  border-bottom: 1px solid #f0f0f0;
  box-sizing: border-box;
}
.ip-back { width: 56px; padding-left: 14px; font-size: 22px; color: #333; cursor: pointer; }
.ip-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.ip-nav-right { width: 56px; }

/* 图标网格 */
.ip-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.ip-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 14px 10px; }
.ip-cell {
  aspect-ratio: 1;
  background: #fff;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform .12s ease;
}
.ip-cell:active { transform: scale(.94); }
.ip-cell.sel { border-color: var(--primary, #ff6b35); background: #fff5f1; }
.ip-img { width: 52%; height: 52%; object-fit: contain; }
.ip-empty-hint { text-align: center; color: #bbb; font-size: 12px; padding: 10px 0 26px; }

/* 底部 tab */
.ip-tabbar {
  flex: 0 0 auto;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  border-top: 1px solid #f0f0f0;
  display: flex; box-sizing: border-box;
}
.ip-tab { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; }
.ipt-label { font-size: 15px; color: #999; }
.ip-tab.on .ipt-label { color: var(--primary, #ff6b35); font-weight: 700; }
.ip-tab.on::after {
  content: ''; position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  width: 26px; height: 3px; border-radius: 2px; background: var(--primary, #ff6b35);
}

.picker-fade-enter-active, .picker-fade-leave-active { transition: opacity .2s ease; }
.picker-fade-enter-from, .picker-fade-leave-to { opacity: 0; }
</style>
