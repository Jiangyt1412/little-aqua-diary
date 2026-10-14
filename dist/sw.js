// # 缓存当前版本应用壳；浏览器数据和照片仍留在 localStorage / IndexedDB。
const CACHE_PREFIX = 'little-aqua-diary-app-';
const CACHE = `${CACHE_PREFIX}v1.4.0`;
const SHELL = ['./', './index.html', './styles.css', './studio.css', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  ...['app', 'data', 'logic', 'inventory', 'media', 'forms', 'ui', 'art', 'pets', 'habitats', 'tasks', 'starter-reset', 'pwa', 'version'].map(name => `./js/${name}.js`)];
const urls = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && (url.pathname === new URL('./', self.registration.scope).pathname || url.pathname === new URL('./index.html', self.registration.scope).pathname)) {
    // # 页面与模块使用同一缓存版本，离线导航不等待失败的网络请求。
    event.respondWith(caches.match(new URL('./index.html', self.registration.scope).href).then(cached => cached || fetch(request)));
  } else if (urls.has(url.href)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});
