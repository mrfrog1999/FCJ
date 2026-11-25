import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router, { preloadRoutes } from './router'
import './styles.css'
import { useStore } from './store'
import { startSyncDaemon } from './utils/offlineSync'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(Vant)
app.mount('#app')

// iOS/WebKit 上，:active 伪类只有在「页面存在 touch 监听」时才会随手指按下触发，
// 否则元素按下的样式要等到 touchend 才一闪而过。这里挂一个空监听激活它，
// 让底部 tab、返回按钮等的按下背景色/缩放反馈在真机上即时出现。
document.addEventListener('touchstart', () => {}, { passive: true })

// 补传成功后让各页重新拉数据，用服务端正式记录替换本地乐观记录
window.addEventListener('ssj:synced', () => useStore(pinia).touch())
// 服务端数据可能已变更（其它端增删改）：递增版本号，让各页静默重拉
window.addEventListener('ssj:pull', () => useStore(pinia).touch())
// 空闲时预加载所有页面 chunk，消除首次切换的白屏
if (typeof requestIdleCallback === 'function') requestIdleCallback(() => preloadRoutes(), { timeout: 1200 })
else setTimeout(() => preloadRoutes(), 600)

// 启动后台同步守护（联网 / 页面可见 / 定时 / 冷启动各触发一次）
startSyncDaemon()

// 注册 Service Worker
// 线上网关要求静态资源带 sharecode，SW 安装预缓存时也需要它，
// 因此把 sharecode 作为脚本 URL 的 query 传入（SW 内用 self.location 读取）。
if ('serviceWorker' in navigator) {
  // 新版本自动生效：SW 一直在后台更新，但页面跑的仍然是旧 JS，
  // 于是「改了看不到、要手动杀 App」反复发生。这里在检测到控制器切换
  // （= 新 SW 已接管）时自动重载一次，只在本次启动前就已经有 SW 时才做，
  // 首次安装不会平白闪一下。
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    location.reload()
  })

  window.addEventListener('load', () => {
    let code = ''
    try { code = localStorage.getItem('ssj_sharecode') || '' } catch (e) {}
    const swUrl = '/sw.js' + (code ? '?sharecode=' + encodeURIComponent(code) : '')
    navigator.serviceWorker.register(swUrl).catch(() => {})
  })

  // 从后台切回来时主动查一次更新（iOS 不会自己定期查）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return
    navigator.serviceWorker.getRegistration()
      .then(r => r && r.update())
      .catch(() => {})
  })
}
