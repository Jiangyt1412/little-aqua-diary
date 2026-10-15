// # 头像取景使用本地 Canvas；拖动、双指缩放和方向键共享同一裁剪边界。
import { decodePhoto } from './media.js';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
export function cropGeometry(width, height, value = {}, frame = 480) {
  if (![width, height, frame].every(n => Number.isFinite(n) && n > 0)) throw new Error('裁剪尺寸无效。');
  const rotation = [0, 90, 180, 270].includes(value.rotation) ? value.rotation : 0;
  const zoom = clamp(finite(value.zoom, 1), 1, 6);
  const w = rotation % 180 ? height : width, h = rotation % 180 ? width : height;
  const scale = Math.max(frame / w, frame / h) * zoom, half = frame / (2 * scale);
  const cx = clamp(clamp(finite(value.x, .5), 0, 1) * w, half, w - half);
  const cy = clamp(clamp(finite(value.y, .5), 0, 1) * h, half, h - half);
  return { w, h, cx, cy, scale, crop: { x: cx / w, y: cy / h, zoom, rotation } };
}
export function paintCrop(canvas, image, crop) {
  const frame = canvas.width, g = cropGeometry(image.naturalWidth, image.naturalHeight, crop, frame);
  const context = canvas.getContext('2d');
  context.save(); context.fillStyle = '#f7f4eb'; context.fillRect(0, 0, frame, frame);
  context.translate(frame / 2, frame / 2); context.scale(g.scale, g.scale);
  context.translate(-g.cx, -g.cy); context.translate(g.w / 2, g.h / 2);
  context.rotate(g.crop.rotation * Math.PI / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  context.restore(); return g.crop;
}
export async function editAvatar(asset, initial = {}, { signal } = {}) {
  if (signal?.aborted) return null;
  const image = await decodePhoto(asset.blob);
  if (signal?.aborted) return null;
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'avatar-crop-dialog';
    dialog.setAttribute('aria-labelledby', 'avatar-crop-title');
    dialog.innerHTML = `<header class="avatar-crop-header"><h2 id="avatar-crop-title">裁剪头像</h2><button type="button" class="icon-button" data-crop="cancel" aria-label="取消裁剪">×</button></header><div class="avatar-crop-body"><div class="avatar-crop-frame"><canvas width="960" height="960" tabindex="0" aria-label="头像裁剪区，拖动或使用方向键移动照片"></canvas><span class="avatar-crop-guide" aria-hidden="true"></span></div><p class="avatar-crop-hint">拖动取景 · 双指缩放</p><label class="avatar-zoom"><span>缩放</span><input type="range" min="1" max="6" step="0.01" value="1" aria-label="头像缩放"><output>1.0×</output></label><div class="avatar-crop-tools"><button type="button" class="button small secondary" data-crop="rotate">旋转</button><button type="button" class="button small secondary" data-crop="reset">重置</button></div><p class="avatar-crop-error" role="alert" hidden></p><footer class="avatar-crop-footer"><button type="button" class="button secondary" data-crop="cancel">取消</button><button type="button" class="button primary" data-crop="apply">使用头像</button></footer></div>`;
    const canvas = dialog.querySelector('canvas'), range = dialog.querySelector('input'), output = dialog.querySelector('output');
    const listeners = new AbortController(), events = { signal: listeners.signal }, points = new Map();
    let crop = cropGeometry(image.naturalWidth, image.naturalHeight, initial || {}).crop, gesture = null, disposed = false, busy = false;
    const paint = () => {
      crop = paintCrop(canvas, image, crop); range.value = String(crop.zoom); output.value = crop.zoom.toFixed(1) + '×';
    };
    const finish = result => {
      if (disposed) return; disposed = true; listeners.abort();
      signal?.removeEventListener('abort', abort); if (dialog.open) dialog.close(); dialog.remove(); resolve(result);
    };
    const abort = () => finish(null);
    const localPoint = event => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
    const midpoint = list => ({ x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 });
    const distance = list => Math.hypot(list[1].x - list[0].x, list[1].y - list[0].y);
    const startGesture = () => {
      const list = [...points.values()], frame = canvas.getBoundingClientRect().width;
      gesture = list.length ? { list, frame, geometry: cropGeometry(image.naturalWidth, image.naturalHeight, crop, frame) } : null;
    };
    canvas.addEventListener('pointerdown', event => {
      if (busy || (event.pointerType === 'mouse' && event.button !== 0) || points.size >= 2) return;
      event.preventDefault(); canvas.setPointerCapture(event.pointerId); points.set(event.pointerId, localPoint(event)); startGesture();
    }, events);
    canvas.addEventListener('pointermove', event => {
      if (!points.has(event.pointerId) || !gesture || busy) return;
      event.preventDefault(); points.set(event.pointerId, localPoint(event));
      const current = [...points.values()], g = gesture.geometry;
      if (current.length === 1) {
        crop = { ...g.crop, x: (g.cx - (current[0].x - gesture.list[0].x) / g.scale) / g.w, y: (g.cy - (current[0].y - gesture.list[0].y) / g.scale) / g.h };
      } else if (gesture.list.length === 2) {
        const before = midpoint(gesture.list), after = midpoint(current);
        const zoom = clamp(g.crop.zoom * distance(current) / Math.max(1, distance(gesture.list)), 1, 6), scale = g.scale * zoom / g.crop.zoom;
        const anchorX = g.cx + (before.x - gesture.frame / 2) / g.scale, anchorY = g.cy + (before.y - gesture.frame / 2) / g.scale;
        crop = { ...g.crop, zoom, x: (anchorX - (after.x - gesture.frame / 2) / scale) / g.w, y: (anchorY - (after.y - gesture.frame / 2) / scale) / g.h };
      }
      paint();
    }, events);
    const endPointer = event => { if (points.delete(event.pointerId)) startGesture(); };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, endPointer, events);
    canvas.addEventListener('keydown', event => {
      const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!movement || busy) return; event.preventDefault();
      const g = cropGeometry(image.naturalWidth, image.naturalHeight, crop, canvas.getBoundingClientRect().width), step = (event.shiftKey ? 30 : 10) / g.scale;
      crop = { ...crop, x: crop.x - movement[0] * step / g.w, y: crop.y - movement[1] * step / g.h }; paint();
    }, events);
    range.addEventListener('input', () => { if (!busy) { crop.zoom = Number(range.value); points.clear(); gesture = null; paint(); } }, events);
    dialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); finish(null); }, events);
    dialog.addEventListener('click', async event => {
      const button = event.target.closest('[data-crop]'); if (!button) return;
      const action = button.dataset.crop;
      if (action === 'cancel') { finish(null); return; }
      if (busy) return;
      points.clear(); gesture = null;
      if (action === 'rotate') { crop = { ...crop, x: 1 - crop.y, y: crop.x, rotation: (crop.rotation + 90) % 360 }; paint(); }
      if (action === 'reset') { crop = { x: .5, y: .5, zoom: 1, rotation: 0 }; paint(); }
      if (action === 'apply') {
        busy = true; dialog.querySelectorAll('button,input').forEach(control => { control.disabled = true; });
        try {
          const target = document.createElement('canvas'); target.width = target.height = 480; const selected = paintCrop(target, image, crop);
          const blob = await new Promise(done => target.toBlob(done, 'image/jpeg', .88));
          if (!blob) throw new Error('头像生成失败，请重试。'); finish({ blob, crop: selected });
        } catch (error) {
          if (!disposed) { const box = dialog.querySelector('[role="alert"]'); box.textContent = error.message || '裁剪失败，请重试。'; box.hidden = false; }
        } finally {
          busy = false; if (!disposed) dialog.querySelectorAll('button,input').forEach(control => { control.disabled = false; });
        }
      }
    }, events);
    signal?.addEventListener('abort', abort, { once: true });
    document.body.append(dialog); dialog.showModal(); paint(); canvas.focus({ preventScroll: true });
  });
}
