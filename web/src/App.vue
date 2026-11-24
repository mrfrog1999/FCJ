<template>
  <!-- 全局沉浸式状态栏底衬：PWA/全屏下给状态栏提供主题色背景，保证白色状态栏文字始终可读；
       普通浏览器中 env(safe-area-inset-top)=0，高度为 0，不产生任何视觉影响。 -->
  <div class="global-statusbar" aria-hidden="true"></div>
  <router-view />
</template>

<script setup>
</script>

<style>
.global-statusbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top);
  background: #ff6b35;
  z-index: 10000;
  pointer-events: none;
}
</style>
