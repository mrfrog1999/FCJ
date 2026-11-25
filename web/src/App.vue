<template>
  <!-- 注意：这里刻意不再放「状态栏纯色底衬」。
       PWA 全屏下各页面自己的头部（渐变 banner / 封面图 / 白色导航栏）已经用
       padding-top: env(safe-area-inset-top) 把背景铺到状态栏底下，视觉是连续的；
       若再盖一条固定纯色，#ff6b35 就会在渐变/图片/白导航栏上切出一条生硬的色带。 -->
  <router-view v-slot="{ Component }">
    <!-- 页面切换动画已关闭：直接渲染，不再套 transition。
         主框架常驻：进出记一笔时不再卸载/重建首页（底部菜单、页面结构都留在内存里），
         返回首页即刻恢复，避免重建 DOM 造成的掉帧。其余页面不缓存，保持每次进入刷新。 -->
    <keep-alive include="MainLayout">
      <component :is="Component" />
    </keep-alive>
  </router-view>

  <!-- 记一笔常驻层：App 启动即挂载并完成渲染、布局与光栅化。
       点击「+」时只切一个 class 触发 CSS animation，元素不需要挂载、不需要重新布局，
       动画在那一帧直接开始播放——这是消除「点一下卡一下」的关键。
       关闭态刻意保持「原位 + opacity:0」而不是 display:none / 屏外，
       这样纹理始终留在视口内不被丢弃，滑入时没有重新光栅化的开销。 -->
  <AddRecord
    :class="['add-stage', stageCls]"
    :aria-hidden="stageCls !== 'is-open'"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AddRecord from './views/AddRecord.vue'

const route = useRoute()
const stageCls = ref('') // '' 隐藏 | is-open 已展开（无动画，瞬时显隐）

// 页面切换动画已全部关闭：记一笔由常驻层直接显隐，不再有滑入滑出。
watch(
  () => route.name,
  (name) => {
    stageCls.value = name === 'add' ? 'is-open' : ''
  },
  { immediate: true }
)
</script>

<style>
/* 记一笔常驻层（class 会合并到 AddRecord 的根元素 .add-page 上） */
.add-stage {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 500;
  background: #fff;
  opacity: 0;
  pointer-events: none;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
/* 页面切换动画已关闭：记一笔瞬时显示/隐藏，不再滑入滑出 */
.add-stage.is-open {
  opacity: 1;
  pointer-events: auto;
}

/* 记一笔路由占位元素：零尺寸、不可见，仅为让路由历史正常运行 */
.add-ph {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

</style>
