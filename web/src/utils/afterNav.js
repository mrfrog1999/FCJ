import { ref } from 'vue'

// 转场进行中的截止时间戳（毫秒）。
// 页面 onActivated 里常有「刷新数据 / 重算长列表」这类重活，
// 若和转场动画抢同一帧，会掉帧甚至把首帧位移推迟几十毫秒（点进去先顿一下再动）。
// 统一用 afterNav 把这些工作挪到动画结束之后。
export const navBusyUntil = ref(0)

export function afterNav(fn, extra = 40) {
  const wait = navBusyUntil.value - Date.now()
  if (wait > 0) {
    setTimeout(fn, wait + extra)
  } else {
    fn()
  }
}
