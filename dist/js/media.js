// # 照片二进制存入 IndexedDB；文字继续使用 localStorage，JSON 备份包含照片。
import { uid } from './data.js';
export const MAX_BACKUP_BYTES = 256 * 1024 * 1024;
export function referencedPhotos(data) {
  return [...new Set([
    ...data.records.flatMap(r => r.photoIds || []),
    ...data.animals.flatMap(a => (a.members || []).map(m => m.avatarId).filter(Boolean))
  ])];
}
const blobToDataURL = blob => new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('照片读取失败。')); reader.readAsDataURL(blob);
});
async function decodePhoto(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image(); img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 100000000) throw new Error('图片尺寸无效或过大。');
    return img;
  } catch { throw new Error(/heic|heif/i.test(blob.type) || /\.(heic|heif)$/i.test(blob.name || '') ? '无法解码这张 HEIC 照片，请使用支持 HEIC 的 Safari，或选择 JPG、PNG。' : '无法读取照片，请选择 JPG、PNG 或 WebP。'); }
  finally { URL.revokeObjectURL(url); }
}
export async function preparePhoto(file, kind = 'observation') {
  if (!file || file.size > 20 * 1024 * 1024) throw new Error('每张照片请小于 20 MB。');
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !(file.type === '' && /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))) throw new Error('请选择 JPG、PNG、WebP 或 HEIC 照片。');
  const img = await decodePhoto(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (kind === 'avatar') {
    canvas.width = canvas.height = 480;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.fillStyle = '#f7f4eb'; ctx.fillRect(0, 0, 480, 480);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 480, 480);
  } else {
    const scale = Math.min(1, 1440 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.fillStyle = '#f7f4eb'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .78));
  if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('照片压缩后仍过大，请选择较小的图片。');
  return { id: uid('photo'), blob, name: String(file.name || '照片').slice(0, 200), createdAt: new Date().toISOString() };
}
export class PhotoStore {
  constructor() { this.connection = null; this.urls = new Map(); }
  open() {
    if (this.connection) return this.connection;
    this.connection = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('浏览器不支持照片存储。')); return; }
      const request = indexedDB.open('little-aqua-diary-photos', 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('photos')) request.result.createObjectStore('photos', { keyPath: 'id' }); };
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); this.connection = null; }; resolve(request.result); };
      request.onerror = () => reject(new Error('无法打开照片存储，请检查浏览器权限。'));
      request.onblocked = () => reject(new Error('照片存储正在被另一窗口占用，请关闭其他日记窗口后重试。'));
    }).catch(error => { this.connection = null; throw error; });
    return this.connection;
  }
  async get(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readonly'); const request = tx.objectStore('photos').get(id);
      request.onsuccess = () => {
        const asset = request.result;
        // # 新图片存二进制字节以兼容 WebKit，旧版 Blob 记录仍可直接读取。
        resolve(asset && !asset.blob && asset.bytes ? { ...asset, blob: new Blob([asset.bytes], { type: asset.mime || 'image/jpeg' }) } : asset);
      };
      request.onerror = () => reject(new Error('照片读取失败。'));
    });
  }
  async putMany(assets) {
    if (!assets.length) return;
    const stored = await Promise.all(assets.map(async asset => {
      const value = { ...asset, bytes: await asset.blob.arrayBuffer(), mime: asset.blob.type };
      delete value.blob; return value;
    }));
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      stored.forEach(asset => tx.objectStore('photos').put(asset));
      tx.oncomplete = resolve; tx.onabort = () => reject(new Error('照片未能保存，浏览器空间不足或权限受限。')); tx.onerror = () => {};
    });
  }
  async remove(ids) {
    if (!ids.length) return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      ids.forEach(id => { tx.objectStore('photos').delete(id); const url = this.urls.get(id); if (url) URL.revokeObjectURL(url); this.urls.delete(id); });
      tx.oncomplete = resolve; tx.onabort = () => reject(new Error('照片清理失败。')); tx.onerror = () => {};
    });
  }
  async url(id) {
    if (this.urls.has(id)) return this.urls.get(id);
    const asset = await this.get(id);
    if (!asset?.blob) throw new Error('照片不可读取，请导入含照片的备份。');
    const url = URL.createObjectURL(asset.blob); this.urls.set(id, url); return url;
  }
  async bundle(data) {
    const assets = [];
    for (const id of referencedPhotos(data)) {
      const asset = await this.get(id);
      if (!asset?.blob) throw new Error('有照片缺失，未导出不完整备份。请先恢复照片。');
      assets.push({ id, name: asset.name || '照片', createdAt: asset.createdAt, dataURL: await blobToDataURL(asset.blob) });
    }
    return { ...structuredClone(data), assets, exportedAt: new Date().toISOString() };
  }
}
// # 恢复使用全新照片 ID；元数据写入失败时不会覆盖当前照片。
export async function prepareRestore(raw, data) {
  const assets = raw.assets ?? [];
  if (!Array.isArray(assets) || assets.length > 20000) throw new Error('备份照片列表无效。');
  const byId = new Map();
  for (const asset of assets) {
    if (!asset || typeof asset.id !== 'string' || !/^[a-zA-Z0-9_-]{1,150}$/.test(asset.id) || byId.has(asset.id) || typeof asset.dataURL !== 'string' || asset.dataURL.length > 3 * 1024 * 1024 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(asset.dataURL)) throw new Error('备份照片格式无效。');
    byId.set(asset.id, asset);
  }
  const mapping = new Map(), prepared = [];
  for (const id of referencedPhotos(data)) {
    const asset = byId.get(id); if (!asset) throw new Error('备份缺少所引用的照片，当前数据未被覆盖。');
    const [header, body] = asset.dataURL.split(',');
    let bytes; try { bytes = Uint8Array.from(atob(body), c => c.charCodeAt(0)); } catch { throw new Error('备份照片编码无效。'); }
    const blob = new Blob([bytes], { type: header.slice(5).split(';')[0] });
    await decodePhoto(blob);
    const newId = uid('photo'); mapping.set(id, newId);
    prepared.push({ id: newId, blob, name: typeof asset.name === 'string' ? asset.name.slice(0, 200) : '照片', createdAt: new Date().toISOString() });
  }
  const restored = structuredClone(data);
  restored.records.forEach(r => { if (r.photoIds) r.photoIds = r.photoIds.map(id => mapping.get(id)); });
  restored.animals.forEach(a => { a.members?.forEach(m => { if (m.avatarId) m.avatarId = mapping.get(m.avatarId); }); });
  return { data: restored, assets: prepared };
}
export async function hydratePhotos(root, photos) {
  await Promise.allSettled([...root.querySelectorAll('img[data-photo-id]')].map(async img => {
    try { const url = await photos.url(img.dataset.photoId); if (img.isConnected) { img.src = url; img.classList.add('loaded'); } }
    catch { if (img.isConnected) { img.alt = '照片不可读取'; img.classList.add('photo-missing'); } }
  }));
}
