<template>
  <div class="layout">
    <router-view v-slot="{ Component, route }">
      <!-- 页面切换动画已关闭：直接渲染，不再套 transition（无左右推动） -->
      <keep-alive>
        <component :is="Component" :key="route.name" />
      </keep-alive>
    </router-view>

    <!-- 底部渐变遮罩已移除：
         之前首页的白色 tab-fade 会把下半屏洗成白块，流水页的 page-fade 则直接盖住最后一行记录。
         现在内容自然滚到安全区之上结束，底部留白交给各页 padding + env(safe-area-inset-bottom)。 -->

    <!-- 悬浮液态玻璃菜单：账户 / 流水 / 记一笔 / 统计 / 设置
         Teleport 到 body：它必须相对「视口」定位，而不是相对 .layout。
         .layout 是转场动画的载体（page-*-enter/leave-active 会落在这个根元素上，
         带 transform + will-change），一旦它成为 fixed 的包含块，菜单就会按
         .layout 的高度（首页 852、账户页 4057）来算 bottom；
         iOS 在动画 class 移除后不会立刻重算 fixed 位置，于是表现为
         「刚进首页时菜单浮在半空，手指下拉页面才归位」。
         挂到 body 后，任何页面/转场尺寸变化都影响不到它。 -->
    <Teleport to="body">
      <div ref="barEl" class="bottom-bar" :class="{ 'is-off': route.name !== 'home' }" :aria-hidden="route.name !== 'home'">
        <div class="glass">
          <div class="tab" :class="{ active: route.name === 'account-list', pressed: pressedTab === 'account-list' }" @pointerdown="setPressed('account-list')" @click="go('account-list')">
            <SvgIcon name="walletcard" :size="26" /><span>账户</span>
          </div>
          <div class="tab" :class="{ active: route.name === 'detail', pressed: pressedTab === 'detail' }" @pointerdown="setPressed('detail')" @click="go('detail')">
            <SvgIcon name="list" :size="26" /><span>流水</span>
          </div>
          <div class="add-wrap"><div class="add-btn" :class="{ pressed: pressedTab === 'add' }" @pointerdown="setPressed('add')" @click="router.push('/add')"><SvgIcon name="plus" :size="38" color="#fff" :stroke-width="2.6" /></div></div>
          <div class="tab" :class="{ active: route.name === 'stats', pressed: pressedTab === 'stats' }" @pointerdown="setPressed('stats')" @click="go('stats')">
            <SvgIcon name="pie" :size="26" /><span>统计</span>
          </div>
          <div class="tab" :class="{ active: route.name === 'profile', pressed: pressedTab === 'profile' }" @pointerdown="setPressed('profile')" @click="go('profile')">
            <SvgIcon name="setting" :size="26" /><span>设置</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
defineOptions({ name: 'MainLayout' })
import { onMounted, onUnmounted, ref, watch } from 'vue'
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

/* ---------------- 底部菜单的定位 ----------------
   只交给 CSS：position: fixed + bottom: 0 + 高度里含安全区。
   之前这里有一整套「用 visualViewport.height 反推位置、写 transform 补偿」的 JS，
   想解决「进页面时 fixed 层画错位置、下拉才归位」。结果是：iOS PWA 全屏下
   visualViewport.height 不含底部安全区（比 innerHeight 小 40 上下），
   算出来的目标比真实位置低，于是每次进入首页都把菜单往上拽 40 多像素——
   截图里「tab 浮起来、下面露一条灰」就是它干的。
   现在把这套逻辑整个删掉，位置只由 CSS 决定，JS 一行都不碰菜单几何。 */
const barEl = ref(null)

/* 按压反馈用显式状态而不是 CSS :active / :hover：
   手指按下 tab 会立刻触发路由跳转，元素跟着页面切走，
   浏览器可能来不及清除伪类，返回后高亮就「粘」在按钮上。
   这里按下时置位，抬手/取消/页面切走时一律清空。
   另外 iOS 手势右滑返回走的是原生 popstate，
   pointerup 常被系统接管而丢失，所以再加两道兜底：
   ① 监听 popstate 立即清；② 按下后 600ms 强制自动清，
   保证任何事件丢失都不可能让高亮残留。 */
/* 按压反馈靠「一次性动画」而非持续状态：
   真机上手势返回会走原生 popstate，触摸序列经常错乱，
   :active / :hover 或 JS 布尔状态都可能在页面切走时卡住、返回后残留。
   这里 class 只当动画触发器：CSS animation 播放一次后自动回退到透明，
   即便 class 因任何原因残留、任何清除事件丢失，高亮也会自己消失。
   setPressed 先清后下一帧再置，保证连点能重新触发动画。 */
const pressedTab = ref('')
let pressTimer = null
function releasePress() {
  pressedTab.value = ''
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
}
function setPressed(name) {
  pressedTab.value = ''
  if (pressTimer) clearTimeout(pressTimer)
  requestAnimationFrame(() => { pressedTab.value = name })
  pressTimer = setTimeout(releasePress, 420)
}
watch(() => route.fullPath, () => { releasePress(); fixBarBottom() })

// 菜单定位完全交给 CSS：position: fixed + bottom: 0 + 左右通栏。
// 这里不再有任何 JS 测量/补偿——之前用 innerHeight 或 visualViewport 反推位置，
// 在 iOS 全屏 PWA 下两者都不等于实际视口，算出的偏差把本已贴底的菜单推离底部，
// 反而制造了「刚进来浮空、滚一下才归位」。JS 一行都不碰它的几何。

// ?diag=1：左下角显示实时视口数据，真机上核对用
function makeDiag() {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;left:-9999px;top:0;width:0;height:env(safe-area-inset-bottom,0px);pointer-events:none'
  document.body.appendChild(probe)

  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;padding:8px 10px;border-radius:8px;' +
    'background:rgba(0,0,0,.78);color:#fff;font:11px/1.5 ui-monospace,Menlo,monospace;white-space:pre;pointer-events:none'
  document.body.appendChild(box)
  const tick = () => {
    const el = barEl.value
    const vv = window.visualViewport
    const r = el ? el.getBoundingClientRect() : null
    const g = document.querySelector('.glass')
    const gr = g ? g.getBoundingClientRect() : null
    const bs = getComputedStyle(document.body)
    const bd = document.body.getBoundingClientRect()
    const probeH = Math.min(Math.round(probe.getBoundingClientRect().height || 0), 34)
      const htmlB = document.documentElement.getBoundingClientRect()
      box.textContent =
      `BUILD v-pie-gpu-enter-20\n` +
      `innerH ${window.innerHeight} docH ${document.documentElement.clientHeight} htmlH ${Math.round(htmlB.height)}\n` +
      `vvH ${vv ? Math.round(vv.height) : '-'} vvTop ${vv ? Math.round(vv.offsetTop) : '-'} vvB ${vv ? Math.round(vv.offsetTop + vv.height) : '-'}\n` +
      `sab ${probeH} bodyPos ${bs.position} bodyT ${Math.round(bd.top)} bodyB ${Math.round(bd.bottom)}\n` +
      `barTop ${r ? Math.round(r.top) : '-'} barBottom ${r ? Math.round(r.bottom) : '-'} gap ${r ? Math.round(window.innerHeight - r.bottom) : '-'}\n` +
      `glassTop ${gr ? Math.round(gr.top) : '-'} glassBottom ${gr ? Math.round(gr.bottom) : '-'}`
    requestAnimationFrame(tick)
  }
  tick()
}

onMounted(() => {
  if (!store.ready) store.loadBase().catch(() => {})
  if (new URLSearchParams(location.search).get('diag')) makeDiag()
  reportDiag()
  fixBarBottom()
  window.addEventListener('resize', fixBarBottom)
  window.addEventListener('orientationchange', fixBarBottom)
  const vv = window.visualViewport
  if (vv) vv.addEventListener('resize', fixBarBottom)
  setTimeout(fixBarBottom, 800)
  window.addEventListener('pointerup', releasePress)
  window.addEventListener('pointercancel', releasePress)
  window.addEventListener('blur', releasePress)
  window.addEventListener('popstate', releasePress)
  document.addEventListener('visibilitychange', releasePress)
})
onUnmounted(() => {
  window.removeEventListener('resize', fixBarBottom)
  window.removeEventListener('orientationchange', fixBarBottom)
  window.removeEventListener('pointerup', releasePress)
  window.removeEventListener('pointercancel', releasePress)
  window.removeEventListener('blur', releasePress)
  window.removeEventListener('popstate', releasePress)
  document.removeEventListener('visibilitychange', releasePress)
  if (pressTimer) clearTimeout(pressTimer)
})

/* ---- 把 body 高度精确锁到可点击视口 ----
   真机铁证：clientHeight=894 是 WebKit 真正派发触摸/渲染的视口，100vh=956 是物理屏。
   body 一旦撑到 956，tab（flex 末项）落到 857~956、中心 907 > 894，
   落在可点击区外 → 统计等 tab 点了没反应。
   这里保证 body = clientHeight(894)，tab 回到 795~894 可点击区；
   底部 894~956 的系统安全区由白背景铺满，视觉上仍通到底。
   只在偏差 > 1px 时修正，普通浏览器 clientHeight == 视口、不会触发。 */
function fixBarBottom() {
  /* 锁高目标必须用 innerHeight（layout viewport，真机稳定 = 894），
     绝不能用 documentElement.clientHeight：
     html 现在设了 height:100vh(956) 来把白底铺满物理屏，会把
     documentElement.clientHeight 一起抬到 956；若还拿它锁 body，
     body 涨到 956 → tab 落到 857~956、中心 907 超出 894 可点击区
     → 统计等 tab 又点不动。innerHeight 不受 html CSS height 影响，
     始终是可点击视口，body 锁它 = tab 留在点击区内。 */
  const target = window.innerHeight || document.documentElement.clientHeight
  if (document.body && Math.abs(document.body.getBoundingClientRect().height - target) > 1) {
    document.body.style.height = target + 'px'
  }
}

/* ---- 诊断自动回传 ----
   页面加载后把真机视口的实测几何 POST 给服务端（写 diag.log），
   一次定位「tab 不贴底」的真机差异，用户无需手动看/抄任何数据。 */
function reportDiag() {
  let n = 0
  const grab = () => {
    try {
      const vv = window.visualViewport
      const el = barEl.value
      const g = document.querySelector('.glass')
      const probe = document.createElement('div')
      probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:env(safe-area-inset-bottom,0px);pointer-events:none'
      document.body.appendChild(probe)
      const probe2 = probe.cloneNode()
      probe2.style.height = 'env(safe-area-inset-top,0px)'
      document.body.appendChild(probe2)
      const rr = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) } }
      const barRect = rr(el)
      const payload = {
        build: 'v-pie-gpu-enter-20',
        ua: navigator.userAgent.slice(0, 180),
        mode: matchMedia('(display-mode: standalone)').matches ? 'standalone' : (navigator.standalone ? 'ios-standalone' : 'browser'),
        route: route.name,
        screen: { w: screen.width, h: screen.height, availH: screen.availHeight },
        dpr: window.devicePixelRatio,
        innerW: window.innerWidth, innerH: window.innerHeight,
        docClientH: document.documentElement.clientHeight,
        vv: vv ? { h: Math.round(vv.height), top: Math.round(vv.offsetTop), scale: +vv.scale.toFixed(2) } : null,
        sat: Math.round(probe2.getBoundingClientRect().height || 0),
        sab: Math.round(probe.getBoundingClientRect().height || 0),
        /* 决定性：实测 100vh / 100dvh 到底等于多少。
           账户页用 min-height:100vh 能通到底，说明 vh ≠ innerHeight(894)。 */
        vh: (() => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:100vh'; document.body.appendChild(d); const v = Math.round(d.getBoundingClientRect().height); d.remove(); return v })(),
        dvh: (() => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:100dvh'; document.body.appendChild(d); const v = Math.round(d.getBoundingClientRect().height); d.remove(); return v })(),
        /* 决定性：html 实际绘制高度。v-pie-gpu-enter-20 起 html=100vh(956) 铺满物理屏，
           body 锁 innerHeight(894) 保住 tab 点击——两者必须同时成立。 */
        htmlH: Math.round(document.documentElement.getBoundingClientRect().height),
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        body: rr(document.body), app: rr(document.querySelector('#app')),
        bar: barRect, glass: rr(g),
        barGap: barRect && barRect.h ? Math.round(window.innerHeight - barRect.bottom) : null,
        /* 关键：tab 底到「物理屏底」的距离。>0 说明白块在视口外，纯 DOM 够不到；
           =0 说明 tab 已贴物理底。这是判定那一刀该切在哪的决定性字段。 */
        physGap: barRect && barRect.h ? Math.round(screen.height - barRect.bottom) : null,
      }
      probe.remove(); probe2.remove()
      fetch('/api/diag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {})
    } catch (e) { /* 诊断失败不影响主流程 */ }
  }
  grab()
  const t = setInterval(() => { grab(); if (++n >= 9) clearInterval(t) }, 1000)
}

</script>

<style scoped>
/* 高度相对 #app（已扣除底部 tab），而非 100vh。
   用 100vh 会比 #app 高出一条 tab 的高度，首页这类固定一屏的页面会凭空多出
   可滚动区域，头部被带着滚、底部露白。改成 100% 后首页正好铺满不再误滚动。
   注意必须用明确的 height（而非只有 min-height）：首页 .home-pull 用 height:100%
   继承高度，若父级只有 min-height，百分比会退化成内容高度、铺不满，
   下方就会露出 body 灰底且不在下拉刷新容器内。内容多的页面溢出后仍由
   #app 正常滚动（overflow 默认 visible，scrollHeight 会计入溢出内容）。 */
.layout { height: 100%; min-height: 100%; }

/* 底部不再用大面积渐变遮罩洗白内容：
   页面背景（#f5f6f8）从 tab 下面自然透上来即可；遮罩会盖住列表最后一行、洗白下半屏。 */

/* 底部 tab bar：body 是锁高的 flex 容器，#app 占满剩余高度并自己滚动，
   tab Teleport 到 body 后作为最后一个 flex 子项，走文档流自然贴住屏幕底。
   关键：不用 position:fixed。iOS PWA 冷启动首帧的视觉视口还没稳定，
   fixed 元素按「临时视口」定位，会把 tab 画高、下方露出页面背景，
   要等切一次页面/滚动触发 WebKit 重算才归位——这正是「首次进首页浮空、
   进账户页再返回就正常」的根因。文档流由布局直接算出位置，首帧即贴底。 */
.bottom-bar {
  position: relative;
  flex: 0 0 auto;
  margin-top: auto; /* 双保险：即使 body 高度有偏差，也强制贴到 flex 容器最底 */
  z-index: 100;
  /* 白色背景通到底，不留灰缝。安全区高度已并入 .glass 里，这里不再重复 padding。 */
  padding-bottom: 0;
  background: #fff;
  border-top: 1px solid rgba(0, 0, 0, .055);
  box-shadow: 0 -2px 16px rgba(0, 0, 0, .05);
}

/* 非首页不显示 tab（账户页/流水页/统计页本来就没有 tab，和原始一致） */
.bottom-bar.is-off {
  display: none;
}

/* 内容行：固定 52px，垂直居中（原生 iOS tab bar 是 49pt）
   背景、边框、阴影、圆角、安全区全部交给外层 .bottom-bar，
   这一层只负责把 4 个 tab 和中间的加号排好，所以内部不会再有空块。 */
.glass {
  /* 图标文字在整条（含安全区）里垂直居中：tab 栏贴底时，
     文字距屏幕底只有 ~25px，比 iOS 原生 tab bar 还贴底。
     不要把安全区拆成 padding——那会把图标文字顶上去，
     文字距屏底反而变成 40+px，视觉上更「没居底」。 */
  height: calc(64px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  /* 把底部安全区从「内容区」里摘出去：真机 sab=34，整条 98px，
     若只在整条里 align-items:center，图标文字中心会落到 98/2=49px
     （y≈845），相对真正可见的 64px tab 区（796~860）偏下 17px。
     这里用 padding-bottom 吃掉安全区，box-sizing:border-box 下内容区
     自动变成 64px，图标文字在可见区正中（y≈828）——整体上移、居中对齐。 */
  padding: 0 6px env(safe-area-inset-bottom, 0px);
  background: none;
  border: 0;
  box-shadow: none;
}

/* iOS（含 iOS 上的 Chrome，都是 WebKit）：关掉 backdrop-filter 用近乎不透明的白。
   带 backdrop-filter 的 fixed 元素在 WebKit 里是已知问题——模糊层由合成器单独维护，
   页面进入 / 视口高度变化时不会立刻跟着重算，表现为「刚进来 tab 位置不对，滚一下才归位」。
   原生 tab bar 本来就是接近实心的，换成 rgba(255,255,255,.94) 观感一致、位置彻底稳。 */
@supports (-webkit-touch-callout: none) {
  .bottom-bar {
    background: #fff;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

.tab {
  flex: 1;
  text-align: center;
  color: #8a9099;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: color .18s ease;
}
.tab.active { color: var(--primary); font-weight: 600; }
/* 点按反馈：只包住图标的一小团柔和光晕，边缘自然淡出，
   不铺满整个 tab、不盖住文字，避免「整块橙色方块」的生硬观感。
   同时图标文字变主色 + 图标轻微缩放，反馈清晰又干净。 */
.tab { cursor: pointer; -webkit-tap-highlight-color: transparent; position: relative; }
.tab::before {
  content: '';
  position: absolute;
  top: 3px; left: 50%;
  width: 40px; height: 40px;
  margin-left: -20px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 107, 53, .16) 0%, rgba(255, 107, 53, .07) 45%, rgba(255, 107, 53, 0) 72%);
  opacity: 0;
  pointer-events: none;
}
/* 一次性动画：把 .pressed 当触发器，动画播完关键帧终值是 opacity:0，
   元素自动回到透明，不靠 JS 清状态、不靠伪类恢复。
   forwards 让动画停在 100% 的透明态，杜绝任何 linger。 */
.tab.pressed::before { animation: tabFlash .42s ease-out forwards; }
@keyframes tabFlash {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
.tab.pressed { animation: tabTextFlash .42s ease-out forwards; }
@keyframes tabTextFlash {
  0% { color: var(--primary); }
  100% { color: #8a9099; }
}
.tab.pressed :deep(svg) { animation: tabIconFlash .42s ease-out forwards; }
@keyframes tabIconFlash {
  0% { transform: scale(.92); }
  100% { transform: scale(1); }
}
/* active 选中态文字必须保持主色，优先级高于 flash 动画的灰色终值 */
.tab.active.pressed { animation: none; color: var(--primary); }

.add-wrap { width: 72px; display: flex; justify-content: center; align-items: flex-start; }
.add-btn {
  width: 64px; height: 64px;
  margin-top: -30px;
  border-radius: 50%;
  background: var(--primary-grad);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 16px rgba(255, 107, 53, .48), 0 0 0 4px rgba(255, 255, 255, .85);
  cursor: pointer;
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
  transition: transform .12s ease, box-shadow .12s ease;
}
/* 点按即时反馈：一次性动画，播完自动回到原样，绝不残留按下态 */
.add-btn.pressed { animation: addFlash .42s ease-out forwards; }
@keyframes addFlash {
  0% { transform: scale(.88); box-shadow: 0 3px 10px rgba(255, 107, 53, .4), 0 0 0 4px rgba(255, 255, 255, .85); }
  100% { transform: scale(1); box-shadow: 0 6px 16px rgba(255, 107, 53, .48), 0 0 0 4px rgba(255, 255, 255, .85); }
}
</style>
