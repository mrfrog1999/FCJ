import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'
import './styles.css'
import { useStore } from './store'
import { startSyncDaemon } from './utils/offlineSync'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(Vant)
app.mount('#app')

// 补传成功后让各页重新拉数据，用服务端正式记录替换本地乐观记录
window.addEventListener('ssj:synced', () => useStore(pinia).touch())
// 服务端数据可能已变更（其它端增删改）：递增版本号，让各页静默重拉
window.addEventListener('ssj:pull', () => useStore(pinia).touch())
// 启动后台同步守护（联网 / 页面可见 / 定时 / 冷启动各触发一次）
startSyncDaemon()

// 注册 Service Worker（仅用于支持添加到主屏幕全屏运行，不缓存资源）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
