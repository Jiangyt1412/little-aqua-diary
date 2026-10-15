// # 只下载发布元数据与应用缓存；不会清理或写入日记、居民及照片。
import { setupPwa } from './pwa.js';
import { validDay } from './tasks.js';

export function compareAppVersions(left, right) {
  const parts = version => {
    if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error('发布版本格式无效。');
    const result = version.split('.').map(Number);
    if (!result.every(Number.isSafeInteger)) throw new Error('发布版本格式无效。');
    return result;
  };
  const a = parts(left), b = parts(right);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
export function validateReleaseInfo(value) {
  if (!value || typeof value !== 'object') throw new Error('发布信息无效。');
  compareAppVersions(value.version, value.version);
  if (!validDay(value.date) || !Array.isArray(value.notes) || value.notes.length > 10 || value.notes.some(note => !Array.isArray(note) || note.length !== 2 || note.some(text => typeof text !== 'string' || text.length > 1200))) throw new Error('发布信息无效。');
  return { version: value.version, date: value.date, notes: value.notes.map(note => [...note]) };
}
export async function fetchLatestRelease({ baseUrl = new URL('../', import.meta.url).href, fetcher = globalThis.fetch, timeoutMs = 12000 } = {}) {
  const url = new URL('release.json', baseUrl); url.searchParams.set('check', String(Date.now()));
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url.href, { cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error('发布信息暂不可用，请稍后重试。');
    const text = await response.text();
    if (text.length > 20000) throw new Error('发布信息无效。');
    let value; try { value = JSON.parse(text); } catch { throw new Error('发布信息无效。'); }
    return validateReleaseInfo(value);
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('无法联网检查，现有版本仍可使用。');
    throw error;
  } finally { clearTimeout(timer); }
}
function workerVersion(worker) {
  if (!worker) return Promise.resolve('');
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = version => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(version); };
    const timer = setTimeout(() => finish(''), 1000);
    channel.port1.onmessage = event => {
      try { compareAppVersions(event.data?.version, event.data?.version); finish(event.data.version); } catch { finish(''); }
    };
    try { worker.postMessage({ type: 'AQUA_VERSION' }, [channel.port2]); } catch { finish(''); }
  });
}
// # 完整缓存安装并确认控制页面的版本后，调用方才可以刷新；失败保持当前应用。
export async function prepareAppUpdate(version, onProgress = () => {}) {
  compareAppVersions(version, version);
  const registration = await setupPwa();
  if (!registration) throw new Error('当前浏览器无法准备更新，请用 Safari 打开在线网址。');
  onProgress('正在下载新版…');
  let candidate = registration.installing, timer;
  const onFound = () => { candidate = registration.installing; };
  registration.addEventListener('updatefound', onFound);
  try {
    await Promise.race([registration.update(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('网络较慢，请保持联网后重试。')), 20000); })]);
    clearTimeout(timer);
    const deadline = Date.now() + 40000;
    while (Date.now() < deadline) {
      if (candidate?.state === 'redundant') throw new Error('新版下载未完成，当前版本仍可使用。请联网重试。');
      const worker = registration.waiting || registration.installing || registration.active;
      if (worker && ['installed', 'activating', 'activated'].includes(worker.state)) {
        const installedVersion = await workerVersion(worker);
        if (installedVersion && compareAppVersions(installedVersion, version) > 0) throw new Error('已有更新的发布，请重新检查版本。');
        if (installedVersion === version) {
          if (worker.state === 'installed') worker.postMessage({ type: 'AQUA_ACTIVATE' });
          if (worker.state === 'activated' && await workerVersion(navigator.serviceWorker.controller) === version) { onProgress('新版已准备，正在打开…'); return version; }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error('新版尚未准备完成，请保持联网后重试；当前资料已保留。');
  } finally { clearTimeout(timer); registration.removeEventListener('updatefound', onFound); }
}
