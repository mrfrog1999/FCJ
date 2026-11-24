<template>
  <div class="layout">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <!-- 底部渐变遮罩：从底部白色到上方透明，防止页面内容从半透明玻璃菜单漏出 -->
    <div class="tab-fade"></div>

    <!-- 悬浮液态玻璃菜单 -->
    <div class="bottom-bar">
      <div class="glass">
        <div class="tab" :class="{ active: route.name === 'home' }" @click="go('home')">
          <SvgIcon name="home" :size="22" /><span>首页</span>
        </div>
        <div class="tab" :class="{ active: route.name === 'detail' }" @click="go('detail')">
          <SvgIcon name="list" :size="22" /><span>流水</span>
        </div>
        <div class="add-wrap"><div class="add-btn" @click="router.push('/add')"><SvgIcon name="plus" :size="38" color="#fff" :stroke-width="2.6" /></div></div>
        <div class="tab" :class="{ active: route.name === 'stats' }" @click="go('stats')">
          <SvgIcon name="chart" :size="22" /><span>统计</span>
        </div>
        <div class="tab" :class="{ active: route.name === 'account-list' }" @click="go('account-list')">
          <SvgIcon name="walletcard" :size="22" /><span>账户</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../store'
import SvgIcon from '../components/SvgIcon.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

function go(name) { router.push({ name }) }

onMounted(() => {
  if (!store.ready) store.loadBase().catch(() => {})
})
</script>

<style scoped>
.layout { min-height: 100vh; }

/* 底部渐变遮罩：垫在玻璃菜单下方，底部白 → 上方透明 */
.tab-fade {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: calc(150px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #fff 0%, rgba(255, 255, 255, .97) 46%, rgba(255, 255, 255, .72) 74%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
  z-index: 99;
}

/* 悬浮液态玻璃菜单容器 */
.bottom-bar {
  position: fixed;
  left: 12px; right: 12px;
  bottom: calc(10px + env(safe-area-inset-bottom));
  z-index: 100;
}

/* 液态玻璃本体：半透明 + 背景模糊 + 边缘高光 + 悬浮阴影 */
.glass {
  height: 62px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  border-radius: 31px;
  background: rgba(255, 255, 255, .58);
  backdrop-filter: saturate(180%) blur(22px);
  -webkit-backdrop-filter: saturate(180%) blur(22px);
  border: 1px solid rgba(255, 255, 255, .72);
  box-shadow:
    0 10px 34px rgba(0, 0, 0, .13),
    0 2px 8px rgba(0, 0, 0, .05),
    inset 0 1px 0 rgba(255, 255, 255, .95),
    inset 0 -1px 0 rgba(255, 255, 255, .35);
}

.tab {
  flex: 1;
  text-align: center;
  color: #8a9099;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  transition: color .18s ease;
}
.tab.active { color: var(--primary); font-weight: 600; }

.add-wrap { width: 66px; display: flex; justify-content: center; align-items: flex-start; }
.add-btn {
  width: 58px; height: 58px;
  margin-top: -27px;
  border-radius: 50%;
  background: var(--primary-grad);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 16px rgba(255, 107, 53, .48), 0 0 0 4px rgba(255, 255, 255, .85);
  cursor: pointer;
  line-height: 1;
}
</style>
