// Service Worker：全量预缓存版 PWA
// - 安装时读取构建生成的 precache-manifest.json，一次性缓存 dist 下所有资源
//   （入口/懒加载页面 chunk、全部图标、manifest、App Shell），用户无需先逐个打开页面即可离线使用
// - 导航：Network-First，断网回退缓存的 index.html（hash 路由，所有页面共用一份 shell）
// - 静态资源：Cache-First；文件名带 hash 不可变，缓存后永久复用
// - API：始终走网络，不缓存；断网时由页面自身的 IndexedDB/localStorage 缓存兜底
// __BUILD_VERSION__ 由构建脚本注入，每次资源变化都会更新版本号 → 触发 SW 重装与缓存刷新
const BUILD_VERSION = '__BUILD_VERSION__';
const SHELL_CACHE = 'ssj-shell-' + BUILD_VERSION;
const ASSET_CACHE = 'ssj-assets-' + BUILD_VERSION;
const ICON_CACHE = 'ssj-icons-v1';
const MANIFEST_URL = '/precache-manifest.json';
const SHELL_KEY = '/__app_shell__';

const isIcon = url => /\/(category-icons|bank-icons|fancy-icons)\//.test(url.pathname);
const isShellAsset = url =>
  url.origin === self.location.origin && (
    /\/assets\//.test(url.pathname) ||
    /\.webmanifest$/.test(url.pathname) ||
    /\.(png|jpg|jpeg|gif|webp|svg|woff2?|ttf|ico|json)$/.test(url.pathname)
  );

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirstShell(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) await cache.put(SHELL_KEY, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(SHELL_KEY)
      || await caches.match('/index.html')
      || await caches.match('/');
    if (cached) return cached;
    throw e;
  }
}

// 安装：先缓存 App Shell，再按清单全量预缓存所有静态资源。
// 用版本化缓存 + 逐个 add（吞掉单个失败），避免某个资源 404 导致整批 addAll 失败、全部没缓存。
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    await cacheFirst('/index.html', SHELL_CACHE).catch(() => {});
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'reload' });
      if (res && res.ok) {
        const manifest = await res.json();
        const urls = Array.isArray(manifest.urls) ? manifest.urls : [];
        const cache = await caches.open(ASSET_CACHE);
        await Promise.all(urls.map(u =>
          fetch(u, { cache: 'reload' })
            .then(r => { if (r && r.ok) return cache.put(u, r); })
            .catch(() => {})
        ));
      }
    } catch (e) { /* 清单抓取失败不影响后续运行时缓存 */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith('ssj-shell-') && !keep.has(k))
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先，断网回退缓存的 index.html
  if (req.mode === 'navigate') {
    e.respondWith(networkFirstShell(req));
    return;
  }

  // API：不缓存，交由页面本地缓存兜底
  if (/\/api\//.test(url.pathname)) return;

  // 图标 / 通用静态资源：缓存优先（已全量预缓存，命中即离线可用）
  if (isIcon(url) || isShellAsset(url)) {
    e.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }
});
