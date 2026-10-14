// # 应用协调层：本地事务、照片草稿、简化导航和旧备份兼容。
import { DiaryStore, STORAGE_KEY, TYPES, uid, validateData, membersFor, isBlackShrimp } from './data.js';
import { escapeHTML as e, localDate, timeLabel, downloadFile, csvText, shiftMonth } from './logic.js';
import { icon } from './art.js';
import { shell, NAV, managerContent } from './ui.js';
import { recordForm, collectRecord, containerForm, animalForm, countFields, memberForm, photoFields, additionSpeciesFields } from './forms.js';
import { PhotoStore, preparePhoto, prepareRestore, hydratePhotos, MAX_BACKUP_BYTES } from './media.js';
import { putAddition, removedAdditionProfiles, deleteDiaryRecord, clearDiaryRecords, resetInventoryBaseline } from './inventory.js';
let storage;
try { storage = window.localStorage; }
catch { storage = { getItem() { throw new Error('无法访问存储'); }, setItem() { throw new Error('无法访问存储'); } }; }
const store = new DiaryStore(storage), photos = new PhotoStore();
const emptyFilters = () => ({ search: '', container: '', type: '', from: '', to: '' });
const view = { page: 'home', tankId: '', month: localDate().slice(0, 7), selectedDay: '', residentContainer: '', historyLimit: 100, filtersOpen: false, filters: emptyFilters() };
const app = document.getElementById('app'), overlay = document.getElementById('overlay-root');
let pendingConfirm = null, focusBeforeDialog = null, toastTimer, searchTimer, recordDraft = null, photoDraft = null, modalBusy = false, undoRecordId = null;
const quickTapTimes = new Map();
function render() {
  const focused = document.activeElement, focusId = focused?.id, filterField = focused?.dataset.filterField;
  const selection = focused?.selectionStart;
  app.innerHTML = shell(store.data, view, store.issue);
  document.title = `${view.page === 'tank' ? store.data.containers.find(c => c.id === view.tankId)?.name || '鱼缸' : NAV.find(([id]) => id === view.page)?.[1] || '首页'} · 小小水族日记`;
  hydratePhotos(app, photos);
  if (!overlay.querySelector('dialog[open]')) {
    const replacement = focusId ? document.getElementById(focusId) : filterField ? app.querySelector(`[data-filter-field="${CSS.escape(filterField)}"]`) : null;
    if (replacement) { replacement.focus({ preventScroll: true }); if (typeof selection === 'number' && ['search', 'text'].includes(replacement.type)) replacement.setSelectionRange(selection, selection); }
  }
}
function toast(message, error = false, undo = '') {
  const root = document.getElementById('toast-root'); undoRecordId = undo || null;
  root.innerHTML = `<div class="toast ${error ? 'error' : ''}">${icon(error ? 'bell' : 'check', 16)}<span>${e(message)}</span>${undo ? '<button data-action="undo-record">撤销</button>' : ''}</div>`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { root.innerHTML = ''; undoRecordId = null; }, undo || error ? 6500 : 2800);
}
function discardPhotoDraft() {
  if (photoDraft) photoDraft.urls.forEach(url => URL.revokeObjectURL(url));
  photoDraft = null;
}
function closeSheet() {
  if (modalBusy) return;
  const dialog = overlay.querySelector('dialog'); if (dialog?.open) dialog.close();
  overlay.innerHTML = ''; pendingConfirm = null; recordDraft = null; discardPhotoDraft();
  document.body.classList.remove('modal-open');
  if (focusBeforeDialog?.isConnected) focusBeforeDialog.focus({ preventScroll: true });
}
function openSheet(title, content, glyph = 'pen', compact = false) {
  if (modalBusy) return false;
  if (!overlay.querySelector('dialog[open]')) focusBeforeDialog = document.activeElement;
  discardPhotoDraft(); recordDraft = null; pendingConfirm = null;
  overlay.innerHTML = `<dialog id="sheet" class="sheet ${compact ? 'compact-sheet' : ''}" aria-labelledby="sheet-title"><div class="sheet-handle"></div><header class="sheet-header"><div class="sheet-title">${icon(glyph, 21)}<h2 id="sheet-title">${e(title)}</h2></div><button class="icon-button" aria-label="关闭弹窗" data-action="close">${icon('close', 16)}</button></header><div class="sheet-content">${content}</div></dialog>`;
  const dialog = document.getElementById('sheet'); document.body.classList.add('modal-open'); dialog.showModal();
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeSheet(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSheet(); } });
  return true;
}
function confirmAction(title, message, callback, label = '确定', extra = '') {
  if (!openSheet(title, `<p class="confirm-message">${e(message)}</p>${extra}<footer class="sheet-footer"><button class="button secondary" data-action="close">取消</button><button class="button ${label.includes('删除') || label.includes('清空') ? 'danger' : 'primary'}" data-action="confirm">${e(label)}</button></footer>`, 'bell', true)) return;
  pendingConfirm = callback;
}
function formError(form, error) {
  const box = form?.querySelector('.form-error');
  if (box) { box.textContent = error.message || String(error); box.hidden = false; box.scrollIntoView({ block: 'nearest' }); }
  else toast(error.message || String(error), true);
}
function commitAndFinish(callback, message) { store.commit(callback); render(); closeSheet(); toast(message); }
function ensureContainers() {
  if (store.data.containers.length) return true;
  openSheet('添加缸', containerForm(null), 'tank'); toast('先添加一个缸'); return false;
}
function initializePhotoDraft(ids = [], kind = 'observation') {
  photoDraft = { ids: [...ids], kind, assets: new Map(), urls: new Map(), busy: false };
  hydratePhotos(overlay, photos);
}
function paintPhotoDraft() {
  if (!photoDraft) return;
  const editor = overlay.querySelector('.photo-editor'); if (!editor) return;
  editor.outerHTML = photoFields(photoDraft.ids, photoDraft.kind);
  overlay.querySelectorAll('img[data-photo-id]').forEach(img => {
    const url = photoDraft.urls.get(img.dataset.photoId);
    if (url) { img.src = url; img.classList.add('loaded'); }
    else hydratePhotos(img.parentElement, photos);
  });
}
async function uploadPhotos(input) {
  const draft = photoDraft; if (!draft || draft.busy || modalBusy) return;
  const files = [...input.files]; if (!files.length) return;
  const cap = draft.kind === 'avatar' ? 1 : 3;
  if (draft.kind !== 'avatar' && files.length + draft.ids.length > cap) { input.value = ''; toast('每条观察最多 3 张照片', true); return; }
  draft.busy = true;
  const status = overlay.querySelector('.photo-upload-status'); if (status) status.textContent = '处理照片…';
  const submit = overlay.querySelector('button[type="submit"]'); if (submit) submit.disabled = true;
  try {
    const prepared = [];
    for (const file of files.slice(0, cap)) prepared.push(await preparePhoto(file, draft.kind));
    if (photoDraft !== draft) return;
    if (draft.kind === 'avatar') draft.ids = [];
    prepared.forEach(asset => { draft.assets.set(asset.id, asset); draft.urls.set(asset.id, URL.createObjectURL(asset.blob)); draft.ids.push(asset.id); });
    paintPhotoDraft();
  } catch (error) { if (photoDraft === draft) formError(overlay.querySelector('form'), error); }
  finally {
    draft.busy = false;
    if (photoDraft === draft) { const current = overlay.querySelector('.photo-upload-status'); if (current) current.textContent = ''; if (submit) submit.disabled = false; input.value = ''; }
  }
}
// # 新照片先写入，元数据成功后才显示保存；失败清理新增照片并保留旧数据。
async function saveWithPhotos(form, mutator, message) {
  const draft = photoDraft;
  if (modalBusy || draft?.busy) throw new Error('照片仍在处理，请稍等。');
  const assets = draft ? draft.ids.map(id => draft.assets.get(id)).filter(Boolean) : [];
  modalBusy = true; overlay.querySelectorAll('button').forEach(b => { b.disabled = true; });
  try { await photos.putMany(assets); store.commit(mutator); }
  catch (error) { try { await photos.remove(assets.map(a => a.id)); } catch {} throw error; }
  finally { modalBusy = false; overlay.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
  render(); closeSheet(); toast(message);
}
function quickRecord(type, cid) {
  if (!ensureContainers()) return;
  const key = `${cid}:${type}`, now = Date.now();
  if (now - (quickTapTimes.get(key) || 0) < 900) return;
  quickTapTimes.set(key, now);
  const timestamp = new Date().toISOString(), id = uid('record');
  store.commit(data => { if (!data.containers.some(c => c.id === cid)) throw new Error('这个缸已被移除。'); data.records.push({ id, type, containerId: cid, timestamp, details: {}, notes: '', createdAt: timestamp, updatedAt: timestamp }); });
  if (overlay.querySelector('dialog')) closeSheet(); render();
  toast(`${TYPES[type].label} · ${timeLabel(timestamp)}`, false, id);
}
function openRecord(type = 'observe', containerId, record, forceForm = false) {
  if (!ensureContainers()) return;
  const cid = containerId || store.data.containers[0].id;
  if (!record && !forceForm && ['feed', 'siphon', 'topup'].includes(type)) return quickRecord(type, cid);
  const name = store.data.containers.find(c => c.id === cid)?.name || '';
  if (!openSheet(`${TYPES[type].label} · ${name}`, recordForm(store.data, cid, type, record), TYPES[type].icon)) return;
  recordDraft = record ? structuredClone(record) : null;
  if (type === 'observe' || record?.photoIds?.length) initializePhotoDraft(record?.photoIds || []);
}
function chooseRecord(containerId) {
  if (!ensureContainers()) return;
  const cid = containerId || store.data.containers[0].id;
  openSheet('记一笔', `<label class="field"><span>缸</span><select id="chooser-container">${store.data.containers.map(c => `<option value="${e(c.id)}" ${cid === c.id ? 'selected' : ''}>${e(c.name)}</option>`).join('')}</select></label><div class="type-chooser">${Object.entries(TYPES).map(([id, type]) => `<button data-action="chosen-record" data-type="${id}"><span class="chooser-icon ${type.color}">${icon(type.icon, 23)}</span>${type.label}</button>`).join('')}</div>`, 'book');
}
async function saveRecord(form) {
  const values = collectRecord(form, recordDraft, photoDraft?.ids || []);
  const id = form.dataset.id || uid('record'), now = new Date().toISOString();
  const selectedId = form.elements.inventoryAnimalId?.value || '';
  const preview = { ...values, id, createdAt: recordDraft?.createdAt || now, updatedAt: now };
  const removed = values.type === 'add' ? removedAdditionProfiles(store.data, preview, selectedId) : [];
  const accepted = new Set(removed.map(m => m.id));
  const perform = async () => saveWithPhotos(form, data => {
    if (!data.containers.some(c => c.id === values.containerId)) throw new Error('这个缸已被其他窗口删除。');
    const old = data.records.find(r => r.id === id);
    if (form.dataset.id && !old) throw new Error('这条记录已被其他窗口删除。');
    const entry = { ...values, id, createdAt: old?.createdAt || now, updatedAt: now };
    if (entry.type === 'add') {
      if (removedAdditionProfiles(data, entry, selectedId).some(m => !accepted.has(m.id))) throw new Error('居民名字或头像已有变化，请重新编辑并确认。');
      putAddition(data, entry, selectedId); return;
    }
    // # 旧版吸便与换水配对记录编辑后仍保持同时间、同容器和双向引用。
    const linked = old?.linkedRecordId ? data.records.find(r => r.id === old.linkedRecordId) : null;
    if (linked) {
      entry.linkedRecordId = linked.id; linked.timestamp = entry.timestamp; linked.containerId = entry.containerId; linked.updatedAt = now;
      if (entry.type === 'water') { delete linked.details.liters; delete linked.details.percent; for (const key of ['liters', 'percent']) if (entry.details[key] !== undefined) linked.details[key] = entry.details[key]; }
    }
    data.records = data.records.filter(r => r.id !== id); data.records.push(entry);
  }, form.dataset.id ? '修改已保存' : values.type === 'add' ? '记录与居民已同步' : '已记录');
  if (removed.length) confirmAction('修改新增数量？', `将移除 ${removed.length} 个已有名字或头像的新增个体。`, perform, '确认修改');
  else await perform();
}
function saveContainer(form) {
  const fd = new FormData(form), id = form.dataset.id || uid('container');
  const entry = Object.fromEntries(['name', 'type', 'dimensions', 'estimatedVolume', 'notes'].map(key => [key, String(fd.get(key) || '').trim()]));
  commitAndFinish(data => {
    const index = data.containers.findIndex(c => c.id === id);
    if (form.dataset.id && index < 0) throw new Error('这个缸已被其他窗口删除。');
    if (index < 0) data.containers.push({ id, ...entry, art: entry.type === 'bucket' ? 'shrimp' : 'goby' }); else data.containers[index] = { ...data.containers[index], ...entry };
  }, '已保存');
}
function saveAnimal(form) {
  const fd = new FormData(form), id = form.dataset.id || uid('animal');
  const entry = Object.fromEntries(['containerId', 'species', 'countType', 'countValue', 'length', 'notes', 'icon'].map(key => [key, String(fd.get(key) || '').trim()]));
  entry.uncertain = fd.has('uncertain');
  if (entry.countType === 'range') { entry.countMin = Number(fd.get('countMin')); entry.countMax = Number(fd.get('countMax')); if (entry.countMax < entry.countMin) throw new Error('最多数量不能少于最少数量。'); }
  const original = store.data.animals.find(a => a.id === id);
  const retained = old => isBlackShrimp(entry) ? [] : membersFor({ ...old, ...entry, id });
  const removed = old => (old?.members || []).filter(m => !retained(old).some(n => n.id === m.id) && (m.name || m.avatarId));
  const accepted = new Set(removed(original).map(m => m.id));
  const perform = () => commitAndFinish(data => {
    const index = data.animals.findIndex(a => a.id === id), old = data.animals[index];
    if (form.dataset.id && index < 0) throw new Error('这个物种已被其他窗口删除。');
    if (removed(old).some(m => !accepted.has(m.id))) throw new Error('居民名单已有变化，请重新编辑并确认。');
    const next = { ...old, id, ...entry, displayName: old?.displayName && old.displayName !== old.species ? old.displayName : entry.species };
    if (old?.members) next.members = retained(old);
    if (entry.countType !== 'range') { delete next.countMin; delete next.countMax; }
    resetInventoryBaseline(old, next);
    if (index < 0) data.animals.push(next); else data.animals[index] = next;
  }, '物种与数量已保存');
  if (accepted.size) confirmAction('减少居民数量？', `将移除最后 ${accepted.size} 个已命名或有头像的个体。可先备份。`, perform, '确认修改'); else perform();
}
function openMember(button) {
  const animal = store.data.animals.find(a => a.id === button.dataset.animal); if (!animal) return;
  const members = membersFor(animal), index = members.findIndex(m => m.id === button.dataset.member), member = members[index]; if (!member) return;
  if (openSheet('名字与头像', memberForm(animal, member, index), animal.icon || 'fish')) initializePhotoDraft(member.avatarId ? [member.avatarId] : [], 'avatar');
}
async function saveMember(form) {
  const fd = new FormData(form), avatarId = photoDraft?.ids[0] || '';
  await saveWithPhotos(form, data => {
    const animal = data.animals.find(a => a.id === form.dataset.animal); if (!animal) throw new Error('这个物种已被其他窗口删除。');
    const members = membersFor(animal), member = members.find(m => m.id === form.dataset.member); if (!member) throw new Error('数量已有变化，这个个体已被移除。');
    member.name = String(fd.get('name') || '').trim(); member.length = String(fd.get('length') || '').trim(); member.avatarId = avatarId; animal.members = members;
  }, '名字与头像已保存');
}
async function exportJSON() {
  if (store.locked) { downloadFile(`水族日记-原始数据-${localDate()}.txt`, store.raw ?? '', 'text/plain'); toast('原始数据已导出'); return; }
  toast('正在打包备份…');
  const snapshot = structuredClone(store.data), bundle = await photos.bundle(snapshot);
  bundle.settings.lastBackupAt = bundle.exportedAt;
  const contents = JSON.stringify(bundle);
  if (new Blob([contents]).size > MAX_BACKUP_BYTES) throw new Error('备份超过 256 MB，请减少照片后导出。');
  downloadFile(`小小水族日记-${localDate()}.json`, contents);
  try { store.commit(data => { data.settings.lastBackupAt = bundle.exportedAt; }); } catch {}
  render(); toast('备份已导出，包含照片');
}
async function importFile(file) {
  if (!file) return;
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('备份请小于 256 MB。');
    let raw; try { raw = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); } catch { throw new Error('无法解析 JSON，请选择日记备份。'); }
    const validated = validateData(raw), restored = await prepareRestore(raw, validated);
    confirmAction('恢复备份？', '当前名单和记录将被替换。', async () => {
      modalBusy = true; overlay.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try { await photos.putMany(restored.assets); restored.data.revision = (Number(store.data.revision) || 0) + 1; store.replace(restored.data); }
      catch (error) { try { await photos.remove(restored.assets.map(a => a.id)); } catch {} throw error; }
      finally { modalBusy = false; overlay.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
      view.filters = emptyFilters(); view.residentContainer = ''; view.selectedDay = ''; render(); closeSheet(); toast('备份已恢复');
    }, '确认恢复', `<div class="import-summary">${e(file.name)}<p>${validated.containers.length} 个缸 · ${validated.records.length} 条记录 · ${restored.assets.length} 张照片</p></div><button class="text-link" data-action="export-json">先备份当前数据</button>`);
  } catch (error) { toast(error.message, true); }
}
function viewPhotos(id) {
  const r = store.data.records.find(item => item.id === id); if (!r?.photoIds?.length) return;
  openSheet('观察照片', `<div class="photo-gallery">${r.photoIds.map((photoId, i) => `<figure><img data-photo-id="${e(photoId)}" alt="观察照片 ${i + 1}"><button class="text-link" data-action="download-photo" data-id="${e(photoId)}">${icon('export', 14)}保存照片</button></figure>`).join('')}</div>`, 'camera'); hydratePhotos(overlay, photos);
}
const actions = {
  close: closeSheet,
  manager: () => openSheet('管理与备份', managerContent(store.data), 'gear', true),
  confirm: async () => { if (modalBusy || !pendingConfirm) return; const fn = pendingConfirm; pendingConfirm = null; try { await fn(); } catch (error) { pendingConfirm = fn; toast(error.message, true); } },
  record: b => openRecord(b.dataset.type, b.dataset.container),
  'choose-record': b => chooseRecord(b.dataset.container),
  'chosen-record': b => openRecord(b.dataset.type, document.getElementById('chooser-container')?.value),
  'edit-record': b => { const r = store.data.records.find(r => r.id === b.dataset.id); if (r) openRecord(r.type, r.containerId, r); },
  'delete-record': b => {
    const r = store.data.records.find(r => r.id === b.dataset.id); if (!r) return;
    const effect = r.inventoryEffect, animal = store.data.animals.find(a => a.id === effect?.animalId);
    const named = animal ? membersFor(animal).filter(m => effect.memberIds.includes(m.id) && (m.name || m.avatarId)) : [];
    const accepted = new Set(named.map(m => m.id));
    confirmAction('删除记录？', effect ? `居民名单将减去本次新增的 ${effect.quantity} 只。${named.length ? `包含 ${named.length} 个已有名字或头像的个体。` : ''}` : r.linkedRecordId ? '关联的吸便与换水记录将一并删除。' : '删除后可通过备份恢复。', () => commitAndFinish(d => {
      const current = d.records.find(item => item.id === r.id);
      if (current && current.updatedAt !== r.updatedAt) throw new Error('记录已有变化，请重新打开并确认。');
      const a = d.animals.find(item => item.id === current?.inventoryEffect?.animalId);
      if (a && membersFor(a).some(m => current.inventoryEffect.memberIds.includes(m.id) && (m.name || m.avatarId) && !accepted.has(m.id))) throw new Error('居民名字或头像已有变化，请重新打开并确认。');
      deleteDiaryRecord(d, r.id);
    }, effect ? '记录与居民已同步删除' : '已删除'), '确定删除', effect ? `<button class="text-link" data-action="delete-record-only" data-id="${e(r.id)}">仅删除记录，保留居民</button>` : '');
  },
  'delete-record-only': b => commitAndFinish(d => deleteDiaryRecord(d, b.dataset.id, true), '记录已删除，居民保留'),
  'undo-record': () => { const id = undoRecordId; if (!id) return; const r = store.data.records.find(r => r.id === id); store.commit(d => { d.records = d.records.filter(r => r.id !== id); }); if (r) quickTapTimes.delete(`${r.containerId}:${r.type}`); render(); toast('已撤销'); },
  'toggle-filters': () => { view.filtersOpen = !view.filtersOpen; render(); },
  'clear-filters': () => { view.filters = emptyFilters(); view.historyLimit = 100; render(); },
  'more-history': () => { view.historyLimit += 100; render(); },
  'resident-filter': b => { view.residentContainer = b.dataset.id; render(); },
  month: b => { view.month = shiftMonth(view.month, Number(b.dataset.offset)); view.selectedDay = ''; render(); },
  'calendar-day': b => { view.selectedDay = view.selectedDay === b.dataset.date ? '' : b.dataset.date; render(); },
  'clear-day': () => { view.selectedDay = ''; render(); },
  'tank-history': b => { view.filters = { ...emptyFilters(), container: b.dataset.container }; view.filtersOpen = true; location.hash = 'history'; },
  'add-container': () => openSheet('添加缸', containerForm(null), 'tank'),
  'edit-container': b => { const c = store.data.containers.find(c => c.id === b.dataset.id); if (c) openSheet('编辑缸', containerForm(c), 'tank'); },
  'delete-container': b => { const c = store.data.containers.find(c => c.id === b.dataset.id); if (c) confirmAction(`删除${c.name}？`, '缸内居民和历史记录也将删除。请先备份。', () => commitAndFinish(d => { d.containers = d.containers.filter(c => c.id !== b.dataset.id); d.animals = d.animals.filter(a => a.containerId !== b.dataset.id); d.records = d.records.filter(r => r.containerId !== b.dataset.id); d.settings.reminders = d.settings.reminders.filter(r => r.containerId !== b.dataset.id); }, '缸已删除'), '确定删除'); },
  'add-animal': b => { if (ensureContainers()) openSheet('添加物种', animalForm(store.data, null, b.dataset.container || store.data.containers[0].id), 'fish'); },
  'edit-animal': b => { const a = store.data.animals.find(a => a.id === b.dataset.id); if (a) openSheet('物种与数量', animalForm(store.data, a, a.containerId), a.icon || 'fish'); },
  'delete-animal': b => { const a = store.data.animals.find(a => a.id === b.dataset.id); if (a) confirmAction(`删除${a.species}？`, '个体名字和头像引用将移除，历史维护记录保留。', () => commitAndFinish(d => { d.animals = d.animals.filter(a => a.id !== b.dataset.id); }, '已移除'), '确定删除'); },
  'edit-member': openMember,
  'remove-draft-photo': b => { if (!photoDraft || photoDraft.busy || modalBusy) return; photoDraft.ids = photoDraft.ids.filter(id => id !== b.dataset.id); paintPhotoDraft(); },
  'view-photos': b => viewPhotos(b.dataset.id),
  'download-photo': async b => { const asset = await photos.get(b.dataset.id); if (!asset?.blob) throw new Error('照片不可读取。'); const url = await photos.url(b.dataset.id), a = document.createElement('a'); a.href = url; a.download = `观察照片-${b.dataset.id.slice(-8)}.jpg`; document.body.append(a); a.click(); a.remove(); },
  'export-json': exportJSON,
  'export-csv': () => { downloadFile(`水族记录-${localDate()}.csv`, csvText(store.data), 'text/csv'); toast('记录表格已导出'); },
  'raw-export': () => { downloadFile(`水族日记-原始数据-${localDate()}.txt`, store.raw ?? JSON.stringify(store.data), 'text/plain'); toast('原始数据已导出'); },
  import: () => document.getElementById('import-file')?.click(),
  'clear-records': () => confirmAction('清空全部记录？', `将删除 ${store.data.records.length} 条记录。居民和头像保留。请先备份。`, () => commitAndFinish(clearDiaryRecords, '记录已清空'), '确认清空')
};
document.addEventListener('click', async event => {
  const b = event.target.closest('[data-action]'); if (!b || b.disabled || !Object.hasOwn(actions, b.dataset.action)) return;
  event.preventDefault(); try { await actions[b.dataset.action](b); } catch (error) { toast(error.message, true); }
});
document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-form]'); if (!form) return; event.preventDefault();
  const handlers = { record: saveRecord, container: saveContainer, animal: saveAnimal, member: saveMember };
  try { await handlers[form.dataset.form](form); } catch (error) { formError(form, error); }
});
document.addEventListener('input', event => {
  if (event.target.dataset.filterField === 'search') { view.filters.search = event.target.value; view.historyLimit = 100; clearTimeout(searchTimer); searchTimer = setTimeout(render, 160); }
});
document.addEventListener('change', async event => {
  const field = event.target;
  try {
    if (field.dataset.photoUpload) await uploadPhotos(field);
    else if (field.dataset.filterField) { view.filters[field.dataset.filterField] = field.value; view.historyLimit = 100; render(); }
    else if (field.id === 'import-file') { const file = field.files[0]; field.value = ''; await importFile(file); }
    else if (field.closest('#record-form')?.dataset.type === 'add' && ['inventoryAnimalId', 'containerId'].includes(field.name)) {
      const form = field.closest('form'), cid = form.elements.containerId.value;
      const chosen = field.name === 'inventoryAnimalId' ? field.value : store.data.animals.some(a => a.id === form.elements.inventoryAnimalId?.value && a.containerId === cid) ? form.elements.inventoryAnimalId.value : '';
      const animal = store.data.animals.find(a => a.id === chosen);
      const species = field.name === 'inventoryAnimalId' && animal ? animal.species : form.elements.species.value;
      document.getElementById('addition-species-fields').outerHTML = additionSpeciesFields(store.data, cid, recordDraft, chosen, species);
    }
    else if (field.name === 'countType') { const form = field.closest('form'), existing = store.data.animals.find(a => a.id === form.dataset.id); document.getElementById('animal-count-fields').innerHTML = countFields(field.value, existing); }
  } catch (error) { toast(error.message, true); }
});
function readRoute() {
  const hash = location.hash.slice(1); let tankId = '';
  if (hash.startsWith('tank/')) { try { tankId = decodeURIComponent(hash.slice(5)); } catch {} }
  if (tankId && view.tankId !== tankId) { view.month = localDate().slice(0, 7); view.selectedDay = ''; }
  view.page = tankId ? 'tank' : NAV.some(([key]) => key === hash) ? hash : 'home'; view.tankId = tankId;
  closeSheet(); render(); window.scrollTo({ top: 0, behavior: 'instant' });
  if (hash === 'settings') actions.manager();
}
window.addEventListener('hashchange', readRoute);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) { store.reload(); render(); } });
// # 跨午夜和重新打开页面时刷新日期；不从未记录日期推断未喂食。
let renderedDay = localDate();
setInterval(() => { if (localDate() !== renderedDay) { renderedDay = localDate(); render(); } }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderedDay = localDate(); store.reload(); render(); } });
readRoute();
