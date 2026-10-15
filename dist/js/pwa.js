// # 主屏幕安装与离线缓存；不注册假的系统定时通知。
let registrationPromise;
export function setupPwa() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(null);
  if (registrationPromise) return registrationPromise;
  const register = () => navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(registration => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) window.dispatchEvent(new Event('aqua-update-ready'));
      });
    });
    return registration;
  }).catch(() => null);
  registrationPromise = document.readyState === 'complete' ? register() : new Promise(resolve => window.addEventListener('load', () => resolve(register()), { once: true }));
  return registrationPromise;
}
