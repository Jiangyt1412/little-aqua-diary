// # 主屏幕安装与离线缓存；不注册假的系统定时通知。
export function setupPwa() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const register = () => navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(registration => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) window.dispatchEvent(new Event('aqua-update-ready'));
      });
    });
  }).catch(() => {});
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
