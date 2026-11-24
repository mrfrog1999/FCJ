<template>
  <div class="page stats-home">
    <!-- 顶部标题栏 -->
    <div class="top-bar">
      <div class="top-title">统计中心<van-icon name="chart-trending-o" /></div>
      <div class="top-sub">多维度洞察你的每一笔收支</div>
    </div>

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
  router.push({ name: 'stats-chart', query: { key } })
}
</script>

<style scoped>
.stats-home { background: #f5f6f8; min-height: 100vh; padding-bottom: 90px; }

.top-bar { background: var(--primary-grad); padding: 20px 20px 24px; color: #fff; }
.top-title { display: flex; align-items: center; gap: 8px; font-size: 21px; font-weight: 800; letter-spacing: .5px; }
.top-title .van-icon { font-size: 20px; }
.top-sub { font-size: 12px; opacity: .88; margin-top: 6px; }

.hub { display: flex; margin: 12px; border-radius: 16px; overflow: hidden; min-height: 420px; box-shadow: 0 6px 22px rgba(0,0,0,.06); background: #fff; }

/* 左侧竖排 tab */
.side-tabs { width: 62px; flex-shrink: 0; background: #fafbfc; display: flex; flex-direction: column; padding-top: 10px; border-right: 1px solid #f0f0f0; }
.side-tab { height: 62px; display: flex; align-items: center; justify-content: center; position: relative; color: #999; cursor: pointer; transition: color .18s; }
.side-tab .st-text { display: flex; flex-direction: column; align-items: center; line-height: 1.15; font-size: 13px; font-weight: 600; }
.side-tab.on { color: var(--primary); background: #fff; }
.side-tab.on::before { content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; background: var(--primary); }

/* 右侧渐变内容区 */
.hub-main { flex: 1; min-width: 0; position: relative; overflow: hidden; padding: 16px 12px 20px; background: linear-gradient(150deg,#fff6f0 0%,#fff9f2 30%,#f3fbff 62%,#faf3ff 100%); }
.hub-glow { position: absolute; width: 240px; height: 240px; right: -80px; top: -100px; border-radius: 50%; background: radial-gradient(circle,rgba(255,150,90,.18),transparent 70%); pointer-events: none; }
.section-cap { position: relative; display: flex; align-items: baseline; justify-content: space-between; padding: 0 4px 12px; }
.cap-title { font-size: 14px; font-weight: 700; color: #333; }
.cap-count { font-size: 11px; color: #aaa; }

.chart-grid { position: relative; display: grid; grid-template-columns: repeat(3,1fr); gap: 12px 6px; }
.chart-item { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 2px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; transition: all .18s; }
.chart-item:active { transform: scale(.95); }
.chart-item.on { border-color: var(--primary); background: rgba(255,255,255,.8); box-shadow: 0 4px 12px rgba(255,107,53,.12); }
.ci-ico { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: var(--ci); background: #fff; box-shadow: 0 3px 10px rgba(0,0,0,.06); }
.ci-label { font-size: 11px; color: #555; font-weight: 600; text-align: center; }

.hub-hint { position: relative; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11px; color: #bbb; margin-top: 20px; }
</style>
