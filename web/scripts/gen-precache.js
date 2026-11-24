// 构建后生成 PWA 预缓存清单：把 dist 下所有静态资源（含懒加载页面 chunk、全部图标）列入清单，
// 让 Service Worker 安装时一次性缓存全部资源，用户无需先逐个打开页面即可离线使用。
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const dist = path.join(__dirname, '..', 'dist')
if (!fs.existsSync(dist)) {
  console.error('[precache] dist 不存在，请先运行 vite build')
  process.exit(1)
}

// SW 自身与清单不进预缓存列表（SW 由浏览器按字节更新；清单由 SW 安装时单独读取）
const EXCLUDE = new Set(['sw.js', 'precache-manifest.json'])

function walk(dir, base) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const rel = base ? base + '/' + entry.name : entry.name
    if (entry.isDirectory()) out.push(...walk(full, rel))
    else if (!EXCLUDE.has(rel)) out.push(rel)
  }
  return out
}

const files = walk(dist, '').sort()
// 全部资源部署在站点根路径，缓存 URL 用绝对路径与浏览器实际请求一致
const urls = files.map(f => '/' + f)

// 版本号由「文件名 + 大小」派生：任何资源增删/替换都会改变版本，触发 SW 重装并刷新缓存
const hashInput = files.map(f => {
  const size = fs.statSync(path.join(dist, f)).size
  return f + ':' + size
}).join('|')
const version = crypto.createHash('sha1').update(hashInput).digest('hex').slice(0, 12)

fs.writeFileSync(
  path.join(dist, 'precache-manifest.json'),
  JSON.stringify({ version, urls })
)

// 把版本号注入 sw.js 占位符，使 sw.js 每次构建字节都变化 → 浏览器检测到更新 → 重新安装
const swPath = path.join(dist, 'sw.js')
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8').replace(/__BUILD_VERSION__/g, version)
  fs.writeFileSync(swPath, sw)
}

console.log(`[precache] 已生成清单：${urls.length} 个资源，版本 ${version}`)
