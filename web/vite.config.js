import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  // 构建时间戳：Profile.vue 的「版本」一栏直接显示 __BUILD_AT__。
  // 必须在构建期替换成字符串字面量，否则运行时是未定义标识符，
  // 组件 setup 会抛 ReferenceError 导致整个设置页空白。
  define: {
    __BUILD_AT__: JSON.stringify(new Date().toLocaleString('sv-SE', { hour12: false }))
  },
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
