<template>
  <div class="layout">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <!-- 底部渐变遮罩：仅首页显示（跟随玻璃菜单） -->
    <div class="tab-fade" v-if="route.name === 'home'"></div>

    <!-- 非首页底部柔化遮罩：内容向下渐变到背景色，避免生硬切断（不拦截点击） -->
    <div class="page-fade" v-if="route.name !== 'home'"></div>

    <!-- 悬浮液态玻璃菜单：仅首页显示 -->
    <div class="bottom-bar" v-if="route.name === 'home'">
      <div class="glass">
        <div class="tab" :class="{ active: route.name === 'home' }" @click="go('home')">
          <SvgIcon name="home" :size="22" /><span>首页</span>
        </div>
        <div class="tab" :class="{ active: route.name === 'detail' }" @click="go('detail')">
          <SvgIcon name="list" :size="22" /><span>流水</span>
        </div>
        <div class="add-wrap" v-if="route.name === 'home'"><div class="add-btn" @click="router.push('/add')"><SvgIcon name="plus" :size="38" color="#fff" :stroke-width="2.6" /></div></div>
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

function go(name) {
  // 统计入口默认进入「分类支出」统计
  if (name === 'stats') return router.push({ name: 'stats', query: { key: 'expense_category' } })
  router.push({ name })
}

onMounted(() => {
  if (!store.ready) store.loadBase().catch(() => {})
})
</script>

<style scoped>
.layout { min-height: 100vh; min-height: 100dvh; }

/* 底部渐变遮罩：垫在玻璃菜单下方，底部白 → 上方透明 */
.tab-fade {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  /* 只覆盖玻璃菜单区域并略微上延，避免把页面内容/固定工具栏大面积洗白 */
  height: calc(118px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #fff 0%, #fff 40%, rgba(255, 255, 255, .9) 58%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
  z-index: 99;
}

/* 非首页底部柔化：从透明渐变到背景色，让列表自然淡出 */
.page-fade {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: calc(84px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #f5f6f8 0%, rgba(245, 246, 248, .92) 42%, rgba(245, 246, 248, 0) 100%);
  pointer-events: none;
  z-index: 30;
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
