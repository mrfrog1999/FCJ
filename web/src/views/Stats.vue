<template>
  <div class="page stats-home">
    <!-- 顶部导航栏：纯白背景、固定不动——绝不上渐变 -->
    <div class="top-bar">
      <div class="nav-left" @click="goBack"><van-icon name="arrow-left" /></div>
      <div class="nav-title">统计中心</div>
    </div>
    <div class="top-sub">多维度洞察你的每一笔收支</div>

    <div class="hub">
      <!-- 左侧竖排 tab -->
      <div class="side-tabs">
        <div
          v-for="tab in chartTabs"
          :key="tab.key"
          class="side-tab"
          :class="{ on: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span class="st-text"><span v-for="(ch, i) in tab.label" :key="i">{{ ch }}</span></span>
        </div>
      </div>

      <!-- 右侧渐变内容区 -->
      <div class="hub-main">
        <div class="hub-glow"></div>
        <div class="section-cap">
          <span class="cap-title">{{ activeTabLabel }}</span>
          <span class="cap-count">{{ currentItems.length }} 个图表</span>
        </div>
        <div class="chart-grid">
          <div
            v-for="key in currentItems"
            :key="key"
            class="chart-item"
            :class="{ on: lastOpened === key }"
            :style="{ '--ci': defs[key].color }"
            @click="openChart(key)"
          >
            <div class="ci-ico"><van-icon :name="chartIcon[key] || 'bars'" /></div>
            <div class="ci-label">{{ defs[key].title }}</div>
          </div>
        </div>
        <div class="hub-hint"><van-icon name="info-o" /> 点击图表查看详细分析</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { chartTabs, chartsByTab, chartDefs as defs, chartIcon } from '../utils/statsCharts'

const router = useRouter()
const activeTab = ref('expense')
const lastOpened = ref(localStorage.getItem('ssj_stats_last') || '')
const activeTabLabel = computed(() => chartTabs.find(t => t.key === activeTab.value)?.label || '')
const currentItems = computed(() => chartsByTab[activeTab.value] || [])

function openChart(key) {
  lastOpened.value = key
  localStorage.setItem('ssj_stats_last', key)
  router.push({ name: 'stats', query: { key } })
}
function goBack() {
  if (router.options.history.state.back) router.back()
  else router.push('/home')
}
</script>

<style scoped>
.stats-home { background: #f5f6f8; min-height: 100vh; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }

/* 顶部导航栏：纯白背景、深色文字，sticky 固定不动——绝不上渐变。
   橙红渐变只在导航下方的数据区 .hub。 */
.top-bar { position: sticky; top: 0; z-index: 20; height: calc(56px + env(safe-area-inset-top)); padding: calc(10px + env(safe-area-inset-top)) 0 0; box-sizing: border-box; display: flex; align-items: center; justify-content: flex-start; color: #1a1a1a; background: #fff; border-bottom: 1px solid #f0f0f0; }
.nav-left { font-size: 20px; color: #1a1a1a; width: 24px; min-height: 44px; margin-left: 14px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; -webkit-tap-highlight-color: transparent; position: relative; }
.nav-left::before { content: ''; position: absolute; left: -12px; right: -12px; top: -12px; bottom: -12px; }
.nav-left .van-icon { transition: transform .1s ease, opacity .1s ease; }
.nav-left:active .van-icon { opacity: .5; transform: scale(.9); }
.nav-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-left: 8px; }
.top-sub { font-size: 12px; opacity: .68; padding: 10px 20px 0; }

/* 导航下方的通栏橙红渐变 banner：全宽、无圆角 */
.hub { display: flex; margin: 0; border-radius: 0; overflow: hidden; min-height: 420px; flex: 1 1 auto; background: var(--primary-grad); }

/* 左侧竖排 tab */
.side-tabs { width: 62px; flex-shrink: 0; background: rgba(255,255,255,.16); display: flex; flex-direction: column; padding-top: 10px; border-right: 1px solid rgba(255,255,255,.25); }
.side-tab { height: 62px; display: flex; align-items: center; justify-content: center; position: relative; color: rgba(255,255,255,.8); cursor: pointer; transition: color .18s; }
.side-tab .st-text { display: flex; flex-direction: column; align-items: center; line-height: 1.15; font-size: 13px; font-weight: 600; }
.side-tab.on { color: #fff; background: rgba(255,255,255,.12); }
.side-tab.on::before { content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; background: #fff; }

/* 右侧内容区：透明，透出 .hub 的橙红渐变 */
.hub-main { flex: 1; min-width: 0; position: relative; overflow: hidden; padding: 16px 12px 20px; background: transparent; }
.hub-glow { position: absolute; width: 240px; height: 240px; right: -80px; top: -100px; border-radius: 50%; background: radial-gradient(circle,rgba(255,255,255,.22),transparent 70%); pointer-events: none; }
.section-cap { position: relative; display: flex; align-items: baseline; justify-content: space-between; padding: 0 4px 12px; }
.cap-title { font-size: 14px; font-weight: 700; color: #fff; }
.cap-count { font-size: 11px; color: rgba(255,255,255,.85); }

.chart-grid { position: relative; display: grid; grid-template-columns: repeat(3,1fr); gap: 12px 6px; }
.chart-item { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 2px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; transition: all .18s; }
.chart-item:active { transform: scale(.95); }
.chart-item.on { border-color: rgba(255,255,255,.9); background: rgba(255,255,255,.22); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
.ci-ico { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: var(--ci); background: #fff; box-shadow: 0 3px 10px rgba(0,0,0,.1); }
.ci-label { font-size: 11px; color: #fff; font-weight: 600; text-align: center; }

.hub-hint { position: relative; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,.85); margin-top: 20px; }
</style>
