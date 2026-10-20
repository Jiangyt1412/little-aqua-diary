// # 应用协调层：本地事务、照片草稿、简化导航和旧备份兼容。
import { DiaryStore, STORAGE_KEY, TYPES, uid, validateData, membersFor, isBlackShrimp, seedData, diaryName, diaryNameLength, checkedDiaryName, DIARY_NAME_MAX, countLabel } from './data.js';
import { escapeHTML as e, localDate, timeLabel, downloadFile, csvText, shiftMonth } from './logic.js';
import { icon } from './art.js';
import { homePage, historyPage, residentsPage, tankPage, shell, NAV, managerContent, tasksPanel, petGallery, updatePanel } from './ui.js';
import { recordForm, collectRecord, containerForm, animalForm, countFields, memberForm, photoFields, additionSpeciesFields, reminderForm, pauseForm, diaryNameForm } from './forms.js';
import { PhotoStore, preparePhoto, prepareRestore, hydratePhotos, MAX_BACKUP_BYTES } from './media.js';
import { editAvatar } from './avatar-crop.js';
import { speciesGroups, saveResidentOrder, CLEAN_RECORDS_COPY, START_EMPTY_COPY } from './species.js';
import { positionTimelines, fitTimelineViewports } from './timeline.js';
import { installNavigation } from './navigation.js';
import { dismissDialog, finishDialogMotion, transitionDialog, reducedMotion, installFeedback } from './motion.js';
import { presentDialog } from './dialog-layer.js'; // # 主弹窗与头像子窗共用滚动锁。
import { installSheetLayout } from './sheet-layout.js';
import { installSorting } from './sortable.js';
import { PET_TEMPLATES, petIcon } from './pets.js';
import { pauseTask, pauseResumeDate, resumeTask, taskState, tasksCalendar } from './tasks.js';
import { isUntouchedStarter } from './starter-reset.js';
import { setupPwa } from './pwa.js';
import { fetchLatestRelease, prepareAppUpdate, compareAppVersions } from './updates.js';
import { APP_VERSION } from './version.js';
import { putAddition, removedAdditionProfiles, deleteDiaryRecord, clearDiaryRecords, resetInventoryBaseline } from './inventory.js';
let storage;
try { storage = window.localStorage; }
catch { storage = { getItem() { throw new Error('无法访问存储'); }, setItem() { throw new Error('无法访问存储'); } }; }
const store = new DiaryStore(storage), photos = new PhotoStore();
const emptyFilters = () => ({ search: '', container: '', type: '', from: '', to: '' });
const view = { page: 'home', tankId: '', month: localDate().slice(0, 7), selectedDay: '', residentContainer: '', historyLimit: 100, filtersOpen: false, historyDay:'', filters: emptyFilters() };
const app = document.getElementById('app'), overlay = document.getElementById('overlay-root');
const sheetLayout = installSheetLayout(overlay,{onResize:()=>fitTimelineViewports(app)});
let pendingConfirm = null, focusBeforeDialog = null, toastTimer, searchTimer, recordDraft = null, photoDraft = null, modalBusy = false, undoRecordId = null;
const quickTapTimes = new Map();
let afterCreatingContainer = null, reminderContainerId = '';
const reminderScrolls = new Map();
const updateState = { phase: 'idle', latest: null, error: '', progress: '' };
let announcedVersion = '', sorting, navigation;
const timelinePositions=new Map();
const busyControls = new WeakMap();
// # 持久写入期间明确显示进度，并保存每个控件原来的可用状态。
function savingState(busy, label = '保存中…') {
  modalBusy = busy; overlay.querySelector('dialog')?.setAttribute('aria-busy', String(busy));
  overlay.querySelectorAll('button,input,select,textarea').forEach(control => {
    if (busy) { busyControls.set(control,{disabled:control.disabled,html:control.tagName==='BUTTON'?control.innerHTML:null});control.disabled=true; }
    else { const previous=busyControls.get(control);if(previous){control.disabled=previous.disabled;if(previous.html!==null)control.innerHTML=previous.html;busyControls.delete(control);} }
  });
  if (busy) {
    const submit=overlay.querySelector('button[type="submit"],button[data-action="confirm"]');
    if(submit)submit.innerHTML=`<span class="busy-pixel" aria-hidden="true"></span>${e(label)}`;
  }
}
function paintUpdates() {
  const panel = overlay.querySelector('[data-update-panel]');
  if (panel) panel.outerHTML = updatePanel(updateState);
}
async function checkUpdates(quiet = false) {
  if (['checking', 'installing'].includes(updateState.phase)) return;
  updateState.phase = 'checking'; updateState.error = ''; paintUpdates();
  try {
    updateState.latest = await fetchLatestRelease(); updateState.phase = 'checked';
    if (quiet && compareAppVersions(updateState.latest.version, APP_VERSION) > 0 && announcedVersion !== updateState.latest.version) {
      announcedVersion = updateState.latest.version; toast(`发现 v${announcedVersion}，可在管理中更新`);
    }
  } catch (error) { updateState.phase = 'error'; updateState.error = error.message || '无法检查版本，请稍后重试。'; }
  paintUpdates();
}
async function installUpdate() {
  if (!updateState.latest || compareAppVersions(updateState.latest.version, APP_VERSION) <= 0 || ['checking', 'installing'].includes(updateState.phase)) return;
  modalBusy = true; updateState.phase = 'installing'; updateState.error = '';
  overlay.querySelectorAll('button').forEach(button => { button.disabled = true; }); paintUpdates();
  try {
    await prepareAppUpdate(updateState.latest.version, progress => { updateState.progress = progress; paintUpdates(); });
    location.reload();
  } catch (error) {
    modalBusy = false; updateState.phase = 'error'; updateState.error = error.message || '更新未完成，请保持联网后重试。';
    overlay.querySelectorAll('button').forEach(button => { button.disabled = false; }); paintUpdates();
  }
}
function render() {
  sorting?.cancel();
  app.querySelectorAll('[data-timeline-day]').forEach(el=>timelinePositions.set(el.dataset.timelineDay,el.scrollLeft));
  const focused = document.activeElement, focusId = focused?.id, filterField = focused?.dataset.filterField;
  const selection = focused?.selectionStart;
  app.innerHTML = shell(store.data, view, store.issue);
  document.title = `${view.page === 'tank' ? store.data.containers.find(c => c.id === view.tankId)?.name || '鱼缸' : NAV.find(([id]) => id === view.page)?.[1] || '首页'} · ${diaryName(store.data)}`;
  hydratePhotos(app, photos);positionTimelines(app,timelinePositions);navigation?.prepare();
  if (!overlay.querySelector('dialog[open]')) {
    const replacement = focusId ? document.getElementById(focusId) : filterField ? app.querySelector(`[data-filter-field="${CSS.escape(filterField)}"]`) : null;
    if (replacement) { replacement.focus({ preventScroll: true }); if (typeof selection === 'number' && ['search', 'text'].includes(replacement.type)) replacement.setSelectionRange(selection, selection); }
  }
}
function toast(message, error = false, undo = '') {
  const root = document.getElementById('toast-root'); undoRecordId = undo || null;
  root.innerHTML = `<div class="toast ${error ? 'error' : ''}">${icon(error ? 'bell' : 'check', 16)}<span>${e(message)}</span>${undo ? '<button data-action="undo-record">撤销</button>' : ''}</div>`;
  const current=root.firstElementChild;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => {
    const finish=()=>{current.remove();if(!root.children.length)undoRecordId=null;};
    if(reducedMotion()){finish();return;}current.classList.add('toast-leaving');setTimeout(finish,160);
  }, undo || error ? 6500 : 2800);
}
function discardPhotoDraft() {
  if (photoDraft) { photoDraft.abort.abort(); photoDraft.urls.forEach(url => URL.revokeObjectURL(url)); }
  photoDraft = null;
}
function closeSheet(immediate = false) {
  if (modalBusy) return;
  const dialog = overlay.querySelector('dialog');
  afterCreatingContainer = null; pendingConfirm = null; recordDraft = null; discardPhotoDraft();
  dismissDialog(dialog, () => {
    if (dialog && !overlay.contains(dialog)) return;
    overlay.replaceChildren();
    if (focusBeforeDialog?.isConnected) focusBeforeDialog.focus({ preventScroll: true });
  }, immediate === true);
}
function openSheet(title, content, glyph = 'pen', compact = false, transition = {}) {
  if (modalBusy) return false;
  sorting?.cancel(); navigation?.cancel();
  finishDialogMotion(overlay.querySelector('dialog'));
  if (!overlay.querySelector('dialog[open]')) focusBeforeDialog = document.activeElement;
  discardPhotoDraft(); recordDraft = null; pendingConfirm = null;
  // # 同一窗口内切换内容时保留原生遮罩，避免先关再开造成闪白。
  const existing = overlay.querySelector('dialog[open]');
  if (existing) {
    transitionDialog(existing, () => {
      existing.classList.toggle('compact-sheet', compact);
      existing.querySelector('.sheet-title').innerHTML = `${icon(glyph, 21)}<h2 id="sheet-title">${e(title)}</h2>`;
      const body = existing.querySelector('.sheet-content'); body.innerHTML = content; sheetLayout.prepare(existing); body.scrollTop = transition.scrollTop || 0;
    }, transition.direction);
    existing.querySelector('[data-action="close"]').focus({preventScroll:true}); return true;
  }
  overlay.innerHTML = `<dialog id="sheet" class="sheet ${compact ? 'compact-sheet' : ''}" aria-labelledby="sheet-title"><div class="sheet-handle"></div><header class="sheet-header"><div class="sheet-title">${icon(glyph, 21)}<h2 id="sheet-title">${e(title)}</h2></div><button class="icon-button" aria-label="关闭弹窗" data-action="close">${icon('close', 16)}</button></header><div class="sheet-content">${content}</div></dialog>`;
  const dialog = document.getElementById('sheet'); sheetLayout.prepare(dialog); presentDialog(dialog);
  dialog.querySelector('[data-action="close"]').focus({preventScroll:true});
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
function ensureContainers(onCreated = null) {
  if (store.data.containers.length) return true;
  openSheet('添加缸', containerForm(null), 'tank'); afterCreatingContainer = onCreated; toast('先添加一个缸'); return false;
}
function initializePhotoDraft(ids = [], kind = 'observation', member = {}) {
  photoDraft = { ids: [...ids], kind, assets: new Map(), urls: new Map(), busy: false, abort: new AbortController(),
    avatarSourceId: member.avatarSourceId || '', avatarCrop: member.avatarCrop ? { ...member.avatarCrop } : null };
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
    if (draft.kind === 'avatar') {
      // # 完整取景只存压缩副本；裁剪与主表单确认前均不写入持久存储。
      const source = await preparePhoto(files[0]);
      if (photoDraft === draft) await cropDraftAvatar(draft, source, true);
      return;
    }
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
async function cropDraftAvatar(draft, source, isNew = false) {
  if (!source?.blob) throw new Error('头像不可读取，请重新上传照片。');
  const result = await editAvatar(source, isNew ? {} : draft.avatarCrop || {}, { signal: draft.abort.signal });
  if (!result || photoDraft !== draft) return;
  const asset = { id: uid('photo'), blob: result.blob, name: source.name || '头像', createdAt: new Date().toISOString() };
  if (isNew) draft.assets.set(source.id, source);
  draft.assets.set(asset.id, asset); draft.urls.set(asset.id, URL.createObjectURL(asset.blob));
  draft.ids = [asset.id]; draft.avatarSourceId = source.id; draft.avatarCrop = result.crop; paintPhotoDraft();
}
async function editDraftAvatar() {
  const draft = photoDraft; if (!draft || draft.kind !== 'avatar' || !draft.ids.length || draft.busy || modalBusy) return;
  draft.busy = true;
  const submit = overlay.querySelector('button[type="submit"]'); if (submit) submit.disabled = true;
  try {
    const id = draft.avatarSourceId || draft.ids[0], source = draft.assets.get(id) || await photos.get(id);
    if (photoDraft === draft) await cropDraftAvatar(draft, source);
  } catch (error) { if (photoDraft === draft) formError(overlay.querySelector('form'), error); }
  finally { draft.busy = false; if (photoDraft === draft && submit) submit.disabled = false; }
}
// # 新照片先写入，元数据成功后才显示保存；失败清理新增照片并保留旧数据。
async function saveWithPhotos(form, mutator, message, afterSave) {
  const draft = photoDraft;
  if (modalBusy || draft?.busy) throw new Error('照片仍在处理，请稍等。');
  const ids = draft ? [...new Set([...draft.ids, ...(draft.kind === 'avatar' && draft.ids.length && draft.avatarSourceId ? [draft.avatarSourceId] : [])])] : [];
  const assets = draft ? ids.map(id => draft.assets.get(id)).filter(Boolean) : [];
  savingState(true);
  try { await photos.putMany(assets); store.commit(mutator); }
  catch (error) { try { await photos.remove(assets.map(a => a.id)); } catch {} throw error; }
  finally { savingState(false); }
  render(); if (afterSave) afterSave(); else closeSheet(); toast(message);
}
function quickRecord(type, cid, reminderId = '') {
  if (!ensureContainers()) return;
  const key = `${cid}:${type}`, now = Date.now();
  if (now - (quickTapTimes.get(key) || 0) < 900) return;
  quickTapTimes.set(key, now);
  const timestamp = new Date().toISOString(), id = uid('record');
  store.commit(data => { if (!data.containers.some(c => c.id === cid)) throw new Error('这个缸已被移除。'); if (reminderId && !data.settings.reminders.some(r => r.id === reminderId && taskState(data,r).state !== 'paused' && r.containerId === cid && r.type === type)) throw new Error('提醒已暂停或移除。'); data.records.push({ id, type, containerId: cid, timestamp, details: {}, notes: '', createdAt: timestamp, updatedAt: timestamp, ...(reminderId ? { reminderId } : {}) }); });
  render();
  if (reminderId) openReminders(reminderContainerId);
  else if (overlay.querySelector('dialog')) closeSheet();
  toast(`${TYPES[type].label} · ${timeLabel(timestamp)}`, false, id);
}
function openRecord(type = 'observe', containerId, record, forceForm = false, reminderId = '') {
  if (!ensureContainers(id => openRecord(type, id, record, forceForm, reminderId))) return;
  const cid = containerId || store.data.containers[0].id;
  if (!record && !forceForm && ['feed', 'siphon', 'topup'].includes(type)) return quickRecord(type, cid);
  const name = store.data.containers.find(c => c.id === cid)?.name || '';
  if (!openSheet(`${TYPES[type].label} · ${name}`, recordForm(store.data, cid, type, record), TYPES[type].icon)) return;
  if (reminderId) { document.getElementById('record-form').dataset.reminder = reminderId; reminderBackButton(); }
  recordDraft = record ? structuredClone(record) : null;
  if (type === 'observe' || record?.photoIds?.length) initializePhotoDraft(record?.photoIds || []);
}
function chooseRecord(containerId) {
  if (!ensureContainers(id => chooseRecord(id))) return;
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
    // # 从提醒完成换水时也填写水量；编辑旧完成记录保留原提醒引用。
    if (form.dataset.reminder) {
      const rule = data.settings.reminders.find(r => r.id === form.dataset.reminder);
      if (!rule || taskState(data,rule).state === 'paused' || rule.containerId !== entry.containerId || rule.type !== entry.type) throw new Error('提醒已变化，请重新打开。');
      entry.reminderId = rule.id;
    } else if (old?.reminderId) entry.reminderId = old.reminderId;
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
  }, form.dataset.id ? '修改已保存' : values.type === 'add' ? '记录与居民已同步' : '已记录', form.dataset.reminder ? () => openReminders(reminderContainerId) : null);
  if (removed.length) confirmAction('修改新增数量？', `将移除 ${removed.length} 个已有名字或头像的新增个体。`, perform, '确认修改');
  else await perform();
}
function saveContainer(form) {
  const fd = new FormData(form), id = form.dataset.id || uid('container');
  const entry = Object.fromEntries(['name', 'type', 'dimensions', 'estimatedVolume', 'notes', 'art'].map(key => [key, String(fd.get(key) || '').trim()]));
  const continuation = afterCreatingContainer;
  commitAndFinish(data => {
    const index = data.containers.findIndex(c => c.id === id);
    if (form.dataset.id && index < 0) throw new Error('这个缸已被其他窗口删除。');
    if (index < 0) data.containers.push({ id, ...entry }); else data.containers[index] = { ...data.containers[index], ...entry };
  }, '已保存');
  if (!form.dataset.id && continuation) continuation(id);
}
function saveAnimal(form) {
  const fd = new FormData(form), id = form.dataset.id || uid('animal');
  const entry = Object.fromEntries(['containerId', 'species', 'countType', 'countValue', 'length', 'notes', 'templateId'].map(key => [key, String(fd.get(key) || '').trim()]));
  entry.icon = PET_TEMPLATES.find(p => p.id === entry.templateId)?.icon || 'fish';
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
function openSpeciesGroup(button) {
  const group = speciesGroups(store.data,button.dataset.container).find(group=>group.key===button.dataset.species); if(!group) return;
  const matching = button.dataset.template ? group.animals.filter(a=>(a.templateId || PET_TEMPLATES.find(p=>p.species===a.species)?.id)===button.dataset.template) : group.animals;
  if (matching.length===1) { const animal=matching[0]; openSheet('物种与数量',animalForm(store.data,animal,animal.containerId),animal.icon || 'fish'); return; }
  const animals = [...group.animals].sort((a,b)=>group.variants.indexOf(a.templateId)-group.variants.indexOf(b.templateId));
  openSheet(group.name, `<div class="species-edit-list">${animals.map(a=>`<button type="button" data-action="edit-animal" data-id="${e(a.id)}">${petIcon(a.templateId,42)}<span>${e(a.species)}</span><b>${e(countLabel(a))}</b>${icon('pen',14)}</button>`).join('')}</div><footer class="sheet-footer"><button type="button" class="button secondary" data-action="close">关闭</button></footer>`, 'fish');
}
function openMember(button) {
  const animal = store.data.animals.find(a => a.id === button.dataset.animal); if (!animal) return;
  const members = membersFor(animal), index = members.findIndex(m => m.id === button.dataset.member), member = members[index]; if (!member) return;
  if (openSheet('名字与头像', memberForm(animal, member, index), animal.icon || 'fish')) initializePhotoDraft(member.avatarId ? [member.avatarId] : [], 'avatar', member);
}
async function saveMember(form) {
  const fd = new FormData(form), avatarId = photoDraft?.ids[0] || '', avatarSourceId = photoDraft?.avatarSourceId || '', avatarCrop = photoDraft?.avatarCrop;
  await saveWithPhotos(form, data => {
    const animal = data.animals.find(a => a.id === form.dataset.animal); if (!animal) throw new Error('这个物种已被其他窗口删除。');
    const members = membersFor(animal), member = members.find(m => m.id === form.dataset.member); if (!member) throw new Error('数量已有变化，这个个体已被移除。');
    member.name = String(fd.get('name') || '').trim(); member.length = String(fd.get('length') || '').trim(); member.avatarId = avatarId; member.templateId = String(fd.get('templateId') || ''); animal.members = members;
    if (avatarId && avatarSourceId) {
      member.avatarSourceId = avatarSourceId;
      if (avatarCrop) member.avatarCrop = { ...avatarCrop }; else delete member.avatarCrop;
    }
    else { delete member.avatarSourceId; delete member.avatarCrop; }
  }, '名字与头像已保存');
}
function openNewAnimal(containerId = '', templateId = '') {
  if (!ensureContainers(id => openSheet('添加居民', animalForm(store.data, null, id, templateId), 'fish'))) return;
  openSheet('添加居民', animalForm(store.data, null, containerId || store.data.containers[0].id, templateId), 'fish');
}
function openReminders(containerId = '') {
  const returning = !!overlay.querySelector('.sheet-back[data-action="reminders"]') && reminderContainerId === containerId;
  reminderContainerId = containerId;
  openSheet('照顾日常', tasksPanel(store.data, false, containerId), 'bell', false, {direction:returning?'back':'forward',scrollTop:returning?reminderScrolls.get(containerId)||0:0});
}
// # 提醒的子表单有返回入口，保存、暂停和完成后回到同一份任务列表。
function reminderEditor(title, content, glyph = 'bell') {
  const manager = overlay.querySelector('.sheet-content .task-manager');
  if (manager) reminderScrolls.set(reminderContainerId, manager.closest('.sheet-content').scrollTop);
  if (!openSheet(title, content, glyph)) return;
  reminderBackButton();
}
function reminderBackButton() {
  const titleNode = overlay.querySelector('.sheet-title');
  titleNode.querySelector('svg')?.remove();
  titleNode.insertAdjacentHTML('afterbegin', `<button type="button" class="icon-button sheet-back" data-action="reminders" data-container="${e(reminderContainerId)}" aria-label="返回任务提醒">${icon('back',18)}</button>`);
  const cancel = overlay.querySelector('.sheet-footer [data-action="close"]');
  if (cancel) { cancel.dataset.action = 'reminders'; cancel.dataset.container = reminderContainerId; }
}
function finishReminder(callback, message) { store.commit(callback); render(); openReminders(reminderContainerId); toast(message); }
function saveReminder(form) {
  const fd = new FormData(form), id = form.dataset.id || uid('reminder'), now = new Date().toISOString();
  const values = { containerId: String(fd.get('containerId')), type: String(fd.get('type')), days: Number(fd.get('days')), time: String(fd.get('time')), startDate: String(fd.get('startDate')), title: String(fd.get('title') || '').trim() };
  if (!['feed', 'siphon', 'water', 'topup'].includes(values.type)) throw new Error('请选择喂食、吸便、换水或加水任务。');
  if (!Number.isInteger(values.days) || values.days < 1 || values.days > 3650) throw new Error('间隔请填写 1 至 3650 的整数天数。');
  finishReminder(data => {
    const index = data.settings.reminders.findIndex(r => r.id === id), old = data.settings.reminders[index];
    if (form.dataset.id && !old) throw new Error('这个提醒已被其他窗口删除。');
    const next = { ...old, ...values, id, status: old?.status || 'active', createdAt: old?.createdAt || now, updatedAt: now };
    if (old && taskState(data,old).autoResumed) { next.status = 'active'; delete next.pauseUntil; }
    if (index < 0) data.settings.reminders.push(next); else data.settings.reminders[index] = next;
  }, '提醒已保存');
}
function savePause(form) {
  const fd = new FormData(form), reason = String(fd.get('pauseReason') || '').trim(), now = new Date();
  const until = pauseResumeDate(String(fd.get('pauseLength')), String(fd.get('resumeDate') || ''), now);
  finishReminder(data => pauseTask(data, form.dataset.id, reason, now, until), until ? `已暂停，${until} 恢复` : '已暂停，等待手动恢复');
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
      savingState(true,'恢复中…');
      try { await photos.putMany(restored.assets); restored.data.revision = (Number(store.data.revision) || 0) + 1; store.replace(restored.data); }
      catch (error) { try { await photos.remove(restored.assets.map(a => a.id)); } catch {} throw error; }
      finally { savingState(false); }
      view.filters = emptyFilters(); view.residentContainer = ''; view.selectedDay = ''; render(); closeSheet(); toast('备份已恢复');
    }, '确认恢复', `<div class="import-summary">${e(file.name)}<p>${validated.containers.length} 个缸 · ${validated.records.length} 条记录 · ${restored.assets.length} 张照片</p></div><button class="text-link" data-action="export-json">先备份当前数据</button>`);
  } catch (error) { toast(error.message, true); }
}
function viewPhotos(id) {
  const r = store.data.records.find(item => item.id === id); if (!r?.photoIds?.length) return;
  openSheet('观察照片', `<div class="photo-gallery">${r.photoIds.map((photoId, i) => `<figure><img data-photo-id="${e(photoId)}" alt="观察照片 ${i + 1}"><button class="text-link" data-action="download-photo" data-id="${e(photoId)}">${icon('export', 14)}保存照片</button></figure>`).join('')}</div>`, 'camera'); hydratePhotos(overlay, photos);
}
const actions = {
  'edit-diary-name': () => {
    if (openSheet('日记名称', diaryNameForm(store.data), 'pen', true)) {
      const input = document.getElementById('diary-name-input'); input.focus(); input.select();
    }
  },
  close: closeSheet,
  reminders: b => openReminders(b?.dataset.container || ''),
  'add-reminder': b => { if (ensureContainers(id => reminderEditor('创建提醒', reminderForm(store.data, null, id)))) reminderEditor('创建提醒', reminderForm(store.data, null, b.dataset.container || reminderContainerId)); },
  'edit-reminder': b => { const r = store.data.settings.reminders.find(r => r.id === b.dataset.id); if (r) reminderEditor('编辑提醒', reminderForm(store.data, r)); },
  'pause-reminder': b => { const r = store.data.settings.reminders.find(r => r.id === b.dataset.id); if (r) reminderEditor('暂停提醒', pauseForm({...r,status:taskState(store.data,r).status}), 'pause'); },
  'resume-reminder': b => finishReminder(data => resumeTask(data, b.dataset.id), '提醒已恢复'),
  'delete-reminder': b => confirmAction('删除提醒？', '已有维护记录会保留。', () => finishReminder(data => { data.settings.reminders = data.settings.reminders.filter(r => r.id !== b.dataset.id); }, '提醒已删除'), '删除提醒'),
  'complete-reminder': b => { const r = store.data.settings.reminders.find(r => r.id === b.dataset.id); if (r && taskState(store.data,r).state !== 'paused' && ['feed', 'siphon', 'water', 'topup'].includes(r.type)) r.type === 'water' ? openRecord(r.type, r.containerId, null, true, r.id) : quickRecord(r.type, r.containerId, r.id); },
  'export-calendar': () => { downloadFile('水族维护提醒.ics', tasksCalendar(store.data, TYPES), 'text/calendar'); toast('日历文件已导出'); },
  'pet-gallery': () => openSheet('居民形象', petGallery(), 'fish'),
  'use-pet-template': b => openNewAnimal('', b.dataset.template),
  'install-help': () => openSheet('在 iPhone 上使用', '<ol class="install-steps"><li>用 Safari 打开这个网址。</li><li>点「共享」→「添加到主屏幕」。</li><li>开启「作为网页 App 打开」，点「添加」。</li></ol><p class="form-note">首次联网打开并缓存后，可离线记日记。提醒在 App 内显示；日历提醒需导入日历文件。</p>', 'phone', true),
  'start-empty': () => confirmAction('重新开始空白日记？', START_EMPTY_COPY + ' 操作不能直接撤销，请先保留含照片备份。', () => { commitAndFinish(data => { for (const key of Object.keys(data)) delete data[key]; Object.assign(data, seedData()); }, '空白日记已准备'); view.residentContainer = ''; view.filters = emptyFilters(); navigateRoute('home'); render(); }, '清空并开始', '<button class="text-link" data-action="export-json">先备份当前数据</button>'),
  'check-update': () => checkUpdates(),
  'install-update': installUpdate,
  manager: () => openSheet('管理与备份', managerContent(store.data, updateState), 'gear', true),
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
  'history-day': b=>{view.historyDay=b.dataset.date;view.historyLimit=100;render();},
  'clear-filters': () => { view.historyDay='';view.filters = emptyFilters(); view.historyLimit = 100; render(); },
  'more-history': () => { view.historyLimit += 100; render(); },
  'resident-filter': b => { view.residentContainer = b.dataset.id; render(); },
  month: b => { view.month = shiftMonth(view.month, Number(b.dataset.offset)); view.selectedDay = ''; render(); },
  'calendar-day': b => { view.selectedDay = view.selectedDay === b.dataset.date ? '' : b.dataset.date; render(); },
  'clear-day': () => { view.selectedDay = ''; render(); },
  'tank-history': b => { view.filters = { ...emptyFilters(), container: b.dataset.container }; view.filtersOpen = true; navigateRoute('history'); },
  'add-container': () => openSheet('添加缸', containerForm(null), 'tank'),
  'edit-container': b => { const c = store.data.containers.find(c => c.id === b.dataset.id); if (c) openSheet('编辑缸', containerForm(c), 'tank'); },
  'delete-container': b => { const c = store.data.containers.find(c => c.id === b.dataset.id); if (c) confirmAction(`删除${c.name}？`, '缸内居民和历史记录也将删除。请先备份。', () => commitAndFinish(d => { d.containers = d.containers.filter(c => c.id !== b.dataset.id); d.animals = d.animals.filter(a => a.containerId !== b.dataset.id); d.records = d.records.filter(r => r.containerId !== b.dataset.id); d.settings.reminders = d.settings.reminders.filter(r => r.containerId !== b.dataset.id); }, '缸已删除'), '确定删除'); },
  'add-animal': b => openNewAnimal(b.dataset.container),
  'edit-species-group': openSpeciesGroup,
  'edit-animal': b => { const a = store.data.animals.find(a => a.id === b.dataset.id); if (a) openSheet('物种与数量', animalForm(store.data, a, a.containerId), a.icon || 'fish'); },
  'delete-animal': b => { const a = store.data.animals.find(a => a.id === b.dataset.id); if (a) confirmAction(`删除${a.species}？`, '个体名字和头像引用将移除，历史维护记录保留。', () => commitAndFinish(d => { d.animals = d.animals.filter(a => a.id !== b.dataset.id); }, '已移除'), '确定删除'); },
  'edit-member': openMember,
  'edit-avatar-crop': editDraftAvatar,
  'remove-draft-photo': b => {
    if (!photoDraft || photoDraft.busy || modalBusy) return;
    photoDraft.ids = photoDraft.ids.filter(id => id !== b.dataset.id);
    if (photoDraft.kind === 'avatar') { photoDraft.avatarSourceId = ''; photoDraft.avatarCrop = null; }
    paintPhotoDraft();
  },
  'view-photos': b => viewPhotos(b.dataset.id),
  'download-photo': async b => { const asset = await photos.get(b.dataset.id); if (!asset?.blob) throw new Error('照片不可读取。'); const url = await photos.url(b.dataset.id), a = document.createElement('a'); a.href = url; a.download = `观察照片-${b.dataset.id.slice(-8)}.jpg`; document.body.append(a); a.click(); a.remove(); },
  'export-json': exportJSON,
  'export-csv': () => { downloadFile(`水族记录-${localDate()}.csv`, csvText(store.data), 'text/csv'); toast('记录表格已导出'); },
  'raw-export': () => { downloadFile(`水族日记-原始数据-${localDate()}.txt`, store.raw ?? JSON.stringify(store.data), 'text/plain'); toast('原始数据已导出'); },
  import: () => document.getElementById('import-file')?.click(),
  'clear-records': () => confirmAction('仅清空维护记录？', `将清空 ${store.data.records.length} 条记录。${CLEAN_RECORDS_COPY} 操作不能直接撤销。`, () => commitAndFinish(clearDiaryRecords, '维护记录已清空'), '清空维护记录', '<button class="text-link" data-action="export-json">先备份当前数据</button>')
};
document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); document.getElementById('main')?.focus(); return; }
  const b = event.target.closest('[data-action]'); if (!b || b.disabled || !Object.hasOwn(actions, b.dataset.action)) return;
  event.preventDefault(); try { await actions[b.dataset.action](b); } catch (error) { toast(error.message, true); }
});
document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-form]'); if (!form) return; event.preventDefault();
  const handlers = { record: saveRecord, container: saveContainer, animal: saveAnimal, member: saveMember, reminder: saveReminder, 'pause-reminder': savePause,
    'diary-name': form => { const name=checkedDiaryName(form.elements.diaryName.value); commitAndFinish(data => { data.settings.diaryName = name; }, '名称已保存'); } };
  try { await handlers[form.dataset.form](form); } catch (error) { formError(form, error); }
});
document.addEventListener('input', event => {
  if (event.target.name === 'diaryName') { const count=document.getElementById('diary-name-count'); if(count) { const length=diaryNameLength(event.target.value.trim()); count.textContent=`${length} / ${DIARY_NAME_MAX} 字`; count.classList.toggle('is-error',length>DIARY_NAME_MAX); } }
  if (event.target.name === 'countValue' && event.target.closest('[data-form="animal"]')) event.target.closest('form').dataset.quantityEdited = 'true';
  if (event.target.dataset.filterField === 'search') { view.filters.search = event.target.value;view.historyDay=''; view.historyLimit = 100; clearTimeout(searchTimer); searchTimer = setTimeout(render, 160); }
});
document.addEventListener('change', async event => {
  const field = event.target;
  try {
    if(field.hasAttribute('data-history-day')) {view.historyDay=field.value||'';view.historyLimit=100;render();}
    else if (['pauseLength','resumeDate'].includes(field.name)) {
      const form=field.closest('form'), custom=form.elements.pauseLength.value==='date', date=form.elements.resumeDate;
      form.querySelector('.pause-date').hidden=!custom; date.disabled=!custom; date.required=custom;
      const mode=form.elements.pauseLength.value, until=pauseResumeDate(mode,date.value);
      form.querySelector('.pause-schedule').textContent=until?`${until} ${form.dataset.time} 恢复`:'暂停至手动恢复。';
      form.querySelector('[data-pause-summary]').textContent=mode==='manual'?'手动恢复':mode==='date'?'指定日期':`暂停 ${mode} 天`;
      form.querySelector('[data-pause-resume]').textContent=form.querySelector('.pause-schedule').textContent;
      form.querySelector('.pause-help').textContent=mode==='manual'?'手动恢复后继续原计划。':'到期继续原计划，不补提醒。';
      sheetLayout.update();
    }
    else if (field.name === 'templateId') {
      const form = field.closest('form'), preset = PET_TEMPLATES.find(p => p.id === field.value); if (!preset) return;
      const preview = form.querySelector('.selected-pet-preview');
      preview.innerHTML = petIcon(preset.id, 42);
      preview.setAttribute('aria-label', preset.name);
      const picker = field.closest('details'); if (picker) { picker.open = false; picker.querySelector('summary').focus({ preventScroll: true }); }
      if (form.dataset.form === 'animal' && !form.dataset.id) {
        if (form.elements.species.value === form.dataset.autoSpecies) { form.elements.species.value = preset.species; form.dataset.autoSpecies = preset.species; }
        if (form.elements.countType.value === 'exact' && form.dataset.quantityEdited !== 'true') form.elements.countValue.value = preset.id === 'guppy-gold' ? '4' : '1';
      }
    }
    else if (field.dataset.photoUpload) await uploadPhotos(field);
    else if (field.dataset.filterField && field.dataset.filterField !== 'search') { view.filters[field.dataset.filterField] = field.value;view.historyDay=''; view.historyLimit = 100; render(); } // # 搜索由 input 更新，失焦不重建正在点击的记录按钮。
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
function navigateRoute(route,{scroll=0}={}){history.replaceState(null,'',`#${route}`);readRoute({scroll});}
function readRoute({scroll=0}={}) {
  const hash = location.hash.slice(1); let tankId = '';
  if (hash.startsWith('tank/')) { try { tankId = decodeURIComponent(hash.slice(5)); } catch {} }
  if (tankId && view.tankId !== tankId) { view.month = localDate().slice(0, 7); view.selectedDay = ''; }
  view.page = tankId ? 'tank' : NAV.some(([key]) => key === hash) ? hash : 'home'; view.tankId = tankId;
  closeSheet(true); render(); window.scrollTo({ top: scroll, behavior: 'instant' });
  if (hash === 'settings') actions.manager();
}
window.addEventListener('hashchange', readRoute);
window.addEventListener('storage', event => { navigation?.cancel(); if (event.key === STORAGE_KEY || event.key === null) { store.reload(); render(); } });
// # 跨午夜和重新打开页面时刷新日期；不从未记录日期推断未喂食。
let renderedMinute = Math.floor(Date.now() / 60000);
function refreshClock() {
  if(navigation?.busy)return;render();
  const panel=overlay.querySelector('.task-manager');
  if(panel) panel.outerHTML=tasksPanel(store.data,false,panel.dataset.reminderContainer||'');
}
setInterval(() => { const minute = Math.floor(Date.now() / 60000); if (!document.hidden && minute !== renderedMinute) { renderedMinute = minute; refreshClock(); } }, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { store.reload(); refreshClock(); } });
// # 只清理从未编辑的旧默认配置；任何个人修改都会保留。
if (!store.locked && !store.issue && await isUntouchedStarter(store.data)) {
  try { store.replace(seedData()); } catch (error) { store.issue = error.message; }
}
sorting = installSorting({
  onSort(change) {
    store.commit(data=>saveResidentOrder(data,change)); render(); toast('顺序已保存');
    const list=[...app.querySelectorAll('[data-sort-list]')].find(node=>node.dataset.sortList===change.kind && node.dataset.container===change.containerId && (node.dataset.species || '')===change.species);
    const item=list && [...list.children].find(node=>node.dataset.sortItem===change.focusItem);
    (item?.matches('button') ? item : item?.querySelector('.animal-chip-label,.species-name,button'))?.focus({preventScroll:true});
  },
  onError(error) { render(); toast(error.message,true); }
});
installFeedback();
navigation=installNavigation({route:()=>view.page==='tank'?`tank/${encodeURIComponent(view.tankId)}`:view.page,content:route=>route.startsWith('tank/')?tankPage(store.data,{...view,page:'tank',tankId:decodeURIComponent(route.slice(5))}):({home:homePage,history:historyPage,residents:residentsPage}[route])(store.data,{...view,page:route}),navigate:navigateRoute,hydrate:root=>hydratePhotos(root,photos),position:root=>positionTimelines(root,timelinePositions)});
readRoute();
window.addEventListener('aqua-update-ready' , () => checkUpdates(true));
// # 页面重开导致注册取消时，不在失效页面继续发起启动检查。
setupPwa().then(registration => { if (registration) checkUpdates(true); });
