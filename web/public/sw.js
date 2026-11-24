// Service Worker：图标走 Cache-First（文件名固定、内容不变），其余资源透传保证最新
const ICON_CACHE = 'ssj-icons-v1';
const isIcon = url => /\/(category-icons|bank-icons|fancy-icons)\//.test(url.pathname);

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 图标：Cache-First，命中即返回，未命中则请求并写入缓存
  if (isIcon(url)) {
    e.respondWith(
      caches.open(ICON_CACHE).then(async cache => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // 其余资源：透传，保证每次都是最新内容
  e.respondWith(fetch(req));
});
