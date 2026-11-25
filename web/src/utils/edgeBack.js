// ============================================================
// iOS 系统「左边缘右滑返回」穿透保护
// ------------------------------------------------------------
// 流水页 / 账本页整屏都是 van-swipe-cell（左滑删除）。Vant 在 touchmove
// 检测到横向手势时会调用 preventDefault，这会取消 WebKit 的系统边缘返回手势，
// 于是这些页面无法右滑返回，而没有 swipe-cell 的页面一切正常。
//
// 本工具在捕获阶段识别「贴屏幕左边缘起手 + 明确向右」的手势：
//   - 对该手势的 touchmove 只调用 stopPropagation，让 swipe-cell 收不到，
//     因而不会 preventDefault；
//   - 绝不调用 preventDefault，系统返回手势才能被 WebKit 正常识别。
// 纵向滚动、向左滑(删除)都不受影响：方向一旦判定为纵向或向左，立即放弃拦截，
// 交还给 swipe-cell 与浏览器默认滚动。
//
// 用法：在页面根元素上加捕获监听
//   <div @touchstart.capture="edge.onStart"
//        @touchmove.capture="edge.onMove"
//        @touchend.capture="edge.onEnd"
//        @touchcancel.capture="edge.onEnd">
//   const edge = createEdgeBackGuard()
// ============================================================

const EDGE_ZONE = 30      // 左边缘触发区宽度(px)，系统返回手势大致在此范围内起手
const LOCK_DISTANCE = 10  // 方向锁定距离，与 Vant useTouch 保持一致

export function createEdgeBackGuard() {
  let startX = 0
  let startY = 0
  // none: 未参与 | pending: 边缘起手待判方向 | forward: 已确认交给系统返回手势
  let state = 'none'

  function onStart(e) {
    state = 'none'
    const t = e.touches && e.touches[0]
    if (!t) return
    // 只在屏幕最左边缘起手才可能是系统返回手势
    if (t.clientX <= EDGE_ZONE) {
      startX = t.clientX
      startY = t.clientY
      state = 'pending'
    }
  }

  function onMove(e) {
    if (state === 'none') return
    if (state === 'forward') {
      // 持续拦截到手势结束，避免后续某个 touchmove 漏到 swipe-cell 触发 preventDefault
      e.stopPropagation()
      return
    }
    const t = e.touches && e.touches[0]
    if (!t) return
    const dx = t.clientX - startX
    const dy = t.clientY - startY
    if (dx > LOCK_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      // 明确向右：交还给系统返回手势
      state = 'forward'
      e.stopPropagation() // 只阻断 DOM 传播，绝不 preventDefault
    } else if (dy > LOCK_DISTANCE && Math.abs(dy) > Math.abs(dx)) {
      state = 'none' // 判定为纵向滚动，恢复默认滚动
    } else if (dx < -LOCK_DISTANCE) {
      state = 'none' // 判定为向左滑(删除)，交还给 swipe-cell
    }
  }

  function onEnd() {
    state = 'none'
  }

  return { onStart, onMove, onEnd }
}
