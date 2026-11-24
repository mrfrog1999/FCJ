// Service Worker：App Shell 离线可用
// - 页面导航：Network-First，断网回退缓存的 index.html（hash 路由，所有页面共用一份 shell）
// - 静态资源（JS/CSS/字体/manifest）：Cache-First，文件名带 hash 不可变，缓存后永久复用
// - 分类/银行/炫彩图标：Cache-First（文件名固定）
// - API：始终走网络，不做缓存；断网时由页面自身的 IndexedDB/localStorage 缓存兜底
const SHELL_VER = 'ssj-shell-v3';
const SHELL_CACHE = SHELL_VER + '-shell';
const ASSET_CACHE = SHELL_VER + '-asset';
const ICON_CACHE = 'ssj-icons-v1';
const SHELL_KEY = '/__app_shell__';

const isIcon = url => /\/(category-icons|bank-icons|fancy-icons)\//.test(url.pathname);
const isShellAsset = url =>
  url.origin === self.location.origin && (
    /\/assets\//.test(url.pathname) ||
    /\.webmanifest$/.test(url.pathname) ||
    /\.(png|jpg|jpeg|gif|webp|svg|woff2?|ttf|ico)$/.test(url.pathname)
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
    const cached = await cache.match(SHELL_KEY);
    if (cached) return cached;
    throw e;
  }
}

// 安装：主动抓一次 index.html，顺带把其中的 JS/CSS 与 manifest、图标预缓存，
// 让「在线访问过一次 → 之后断网」即可直接打开（无需逐个页面点开才缓存）
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    try {
      const res = await fetch('/index.html', { cache: 'reload' });
      if (res && res.ok) {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(SHELL_KEY, res.clone());
        const html = await res.text();
        const urls = [];
        const re = /(?:src|href)="(\/[^"]+)"/g;
        let m;
        while ((m = re.exec(html))) urls.push(m[1]);
        urls.push('/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png');
        const ac = await caches.open(ASSET_CACHE);
        await Promise.all(urls.map(u =>
          fetch(u).then(r => { if (r && r.ok) ac.put(u, r); }).catch(() => {})
        ));
      }
    } catch (e) { /* 首装失败不影响后续运行时缓存 */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith('ssj-shell-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：hash 路由统一走网络优先，断网回退缓存的 index.html
  if (req.mode === 'navigate') {
    e.respondWith(networkFirstShell(req));
    return;
  }

  // API：不缓存，交由页面本地缓存兜底
  if (/\/api\//.test(url.pathname)) return;

  // 分类 / 银行 / 炫彩图标：缓存优先
  if (isIcon(url)) {
    e.respondWith(cacheFirst(req, ICON_CACHE));
    return;
  }

  // 静态资源（JS/CSS/字体/manifest/图标）：缓存优先
  if (isShellAsset(url)) {
    e.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }
});
