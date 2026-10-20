// # 缓存当前版本应用壳；浏览器数据和照片仍留在 localStorage / IndexedDB。
const CACHE_PREFIX = 'little-aqua-diary-app-';
const VERSION = '1.6.8';
const CACHE = `${CACHE_PREFIX}v1.6.8`;
const SHELL = ['./', './index.html', './styles.css', './studio.css', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.svg?v=1.6.8', './icon-192.png?v=1.6.8', './icon-512.png?v=1.6.8', './apple-touch-icon.png?v=1.6.8',
  ...['app', 'data', 'logic', 'inventory', 'media', 'avatar-crop', 'species', 'sortable', 'timeline', 'navigation', 'motion', 'sheet-layout', 'forms', 'ui', 'art', 'pets', 'habitats', 'tasks', 'starter-reset', 'pwa', 'updates', 'version'].map(name => `./js/${name}.js`)];
const urls = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  // # 强制从网络校验新版资源，避免把浏览器 HTTP 缓存中的旧模块装入新版缓存。
  event.waitUntil((async () => {
    // # 失败安装可能留下空的目标缓存；仅重建空缓存，不清理正在使用的完整应用。
    if (await caches.has(CACHE)) {
      const previous = await caches.open(CACHE);
      if (!(await previous.keys()).length) await caches.delete(CACHE);
    }
    const cache = await caches.open(CACHE);
    // # 每次安装请求使用全新地址，按原路径保存；连续失败重试也不复用旧的 HTTP 响应。
    const attempt = `${VERSION}-${Date.now()}`;
    for (let offset = 0; offset < SHELL.length; offset += 4) {
      // # 等待同批请求全部结束，再报告失败，避免安装结束后仍有写入进行。
      const results = await Promise.allSettled(SHELL.slice(offset, offset + 4).map(async path => {
        const key = new URL(path, self.registration.scope), url = new URL(key);
        url.searchParams.set('aqua-install', attempt);
        const response = await fetch(url.href, { cache: 'reload' });
        if (!response.ok || response.status === 206) throw new Error('新版资源下载失败。');
        await cache.put(key.href, response);
      }));
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
    }
    const metadata = await cache.match(new URL('./js/version.js', self.registration.scope).href);
    if (!metadata || !(await metadata.text()).includes(`APP_VERSION = '${VERSION}'`)) throw new Error('发布版本尚未一致，保留当前应用。');
    await self.skipWaiting();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'AQUA_VERSION') event.ports[0]?.postMessage({ version: VERSION });
  if (event.data?.type === 'AQUA_ACTIVATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && (url.pathname === new URL('./', self.registration.scope).pathname || url.pathname === new URL('./index.html', self.registration.scope).pathname)) {
    // # 页面与模块使用同一缓存版本，离线导航不等待失败的网络请求。
    event.respondWith(caches.open(CACHE).then(cache => cache.match(new URL('./index.html', self.registration.scope).href)).then(cached => cached || fetch(request)));
  } else if (urls.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(cached => cached || fetch(request)));
  }
});
