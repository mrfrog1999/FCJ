// iOS 主屏 PWA 状态栏重新评估。
//
// 现象：从屏幕左边缘手势返回时，状态栏会重新判定为 black-translucent（白字、页面铺满到顶端）；
// 而点页面内的返回箭头（vue-router 的 history.back()，纯 SPA popstate）不会触发 WebKit 重算，
// 状态栏就停在进子页时被采样成的灰白半透明。
//
// 原理：iOS 状态栏由 WebKit 绘制，black-translucent 下按页面顶部内容动态采样配色。系统级导航
// （手势返回、冷启动）会重新采样；SPA 内部路由切换不会。这里在导航落定后主动触发一次重读，
// 让点箭头返回和手势返回得到一致的状态栏效果。仅 iOS standalone PWA 下生效，其它环境直接返回。

let busy = false

export function reevaluateStatusBar() {
  if (busy) return
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
  if (!isIOS || !standalone) return

  const SB_NAME = 'apple-mobile-web-app-status-bar-style'
  const sbMeta = document.querySelector('meta[name="' + SB_NAME + '"]')
  if (!sbMeta || !sbMeta.parentNode) return

  busy = true
  try {
    const parent = sbMeta.parentNode
    const next = sbMeta.nextSibling
    const content = sbMeta.getAttribute('content') || 'black-translucent'

    // 1) 移除状态栏 meta，强制一次同步重排
    parent.removeChild(sbMeta)
    void document.body.offsetHeight

    // 2) 下一帧重新插入，模拟「配置变更」让 WebKit 重读
    requestAnimationFrame(() => {
      const m = document.createElement('meta')
      m.setAttribute('name', SB_NAME)
      m.setAttribute('content', content)
      if (next && next.parentNode === parent) parent.insertBefore(m, next)
      else parent.appendChild(m)
      void document.body.offsetHeight
      busy = false
    })
  } catch (e) {
    busy = false
  }
}
