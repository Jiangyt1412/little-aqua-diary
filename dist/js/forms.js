// # 常用操作只记时间，编辑表单保留旧版数据；昵称和头像单独编辑。
import { TYPES, WATER_FIELDS, countLabel, diaryName, DIARY_NAME_MAX } from './data.js';
import { escapeHTML as e, localDateTime, timeLabel } from './logic.js';
import { icon, animalIcon } from './art.js';
import { additionQuantity } from './inventory.js';
import { PET_TEMPLATES, petIcon, inferPetTemplate } from './pets.js';
import { HABITATS, habitatArt } from './habitats.js';
export const options = (items, selected) => items.map(([value, label]) => `<option value="${e(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${e(label)}</option>`).join('');
export const field = (label, name, value = '', attrs = '') => `<label class="field"><span>${e(label)}</span><input name="${e(name)}" value="${e(value)}" ${attrs}></label>`;
export const textarea = (label, name, value = '', placeholder = '') => `<label class="field"><span>${e(label)}</span><textarea name="${e(name)}" rows="3" maxlength="5000" placeholder="${e(placeholder)}">${e(value)}</textarea></label>`;
export const selectField = (label, name, items, selected) => `<label class="field"><span>${e(label)}</span><select name="${e(name)}">${options(items, selected)}</select></label>`;
const text = 'type="text" maxlength="300"';
const number = 'type="number" step="any" inputmode="decimal" min="0.001"';
export const formFooter = (label = '保存', left = '') => `<div class="form-error" role="alert" hidden></div><footer class="sheet-footer">${left || '<button type="button" class="button secondary" data-action="close">取消</button>'}<button type="submit" class="button primary">${icon('check', 16)}${label}</button></footer>`;
// # 单字段编辑，不改变首页标题、缸名或任何居民资料。
export function diaryNameForm(data) {
  return `<form data-form="diary-name">${field('日记名称', 'diaryName', diaryName(data), `id="diary-name-input" type="text" maxlength="${DIARY_NAME_MAX}" required autocomplete="off"`)}${formFooter()}</form>`;
}
export function photoFields(ids = [], kind = 'observation') {
  const avatar = kind === 'avatar';
  return `<div class="photo-editor" data-photo-kind="${kind}"><div class="photo-drafts">${ids.map((id, i) => `<div class="photo-draft"><img data-photo-id="${e(id)}" alt="${avatar ? '头像' : `观察照片 ${i + 1}`}"/><button type="button" class="photo-remove" aria-label="移除照片 ${i + 1}" data-action="remove-draft-photo" data-id="${e(id)}">${icon('close', 12)}</button></div>`).join('')}</div><label class="photo-upload">${icon('camera', 19)}<span>${avatar ? (ids.length ? '更换头像' : '上传头像') : '添加照片'}</span><input type="file" name="photo-file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" ${avatar ? '' : 'multiple'} data-photo-upload="${kind}"></label><span class="photo-upload-status" role="status"></span></div>`;
}
export function recordForm(data, containerId, type, record) {
  const d = record?.details || {};
  const simple = ['feed', 'siphon', 'topup'].includes(type);
  let fields = '';
  switch (type) {
    case 'feed': case 'siphon': case 'topup': break;
    case 'water': fields = `<div class="field-grid">${field('换水量 · L', 'liters', d.liters, number + ' placeholder="如 12"')}${field('或比例 · %', 'percent', d.percent, number + ' max="100" placeholder="如 30"')}</div>`; break;
    case 'observe': fields = textarea('观察', 'text', d.text, '记下发现…') + photoFields(record?.photoIds || []); break;
    case 'test': fields = `<div class="field-grid">${WATER_FIELDS.slice(0, 5).map(([key, label, unit, min, max]) => field(`${label}${unit ? ` · ${unit}` : ''}`, key, d[key], `type="number" inputmode="decimal" step="any" min="${min}" ${max === null ? '' : `max="${max}"`} placeholder="选填"`)).join('')}</div><details class="extra-fields"><summary>其他参数</summary><div class="field-grid">${WATER_FIELDS.slice(5).map(([key, label, unit, min]) => field(`${label} · ${unit}`, key, d[key], `type="number" inputmode="decimal" step="any" min="${min}"`)).join('')}</div></details>`; break;
    case 'death': fields = field('物种', 'species', d.species, text + ' required') + field('死亡数量', 'quantity', d.quantity, 'type="number" min="1" step="1" inputmode="numeric" required'); break;
    case 'add': fields = additionSpeciesFields(data, containerId, record) + field('新增数量 · 只', 'quantity', d.quantity, record?.id && !record.inventoryEffect ? text + ' required' : 'type="number" min="1" step="1" inputmode="numeric" required') + `<details class="extra-fields"><summary>体长与来源</summary>${field('体长', 'length', d.length, text)}${field('来源', 'source', d.source, text)}</details>`; break;
    case 'medication': case 'salt': fields = field('名称', 'name', d.name ?? (type === 'salt' ? '盐' : ''), text + ' required') + field('剂量', 'dose', d.dose, text + ' required placeholder="如 20 g、5 ml"'); break;
    case 'equipment': fields = selectField('维护项目', 'task', ['过滤器清洗', '水妖精清洗', '水泵维护', '气石更换', '加热棒调整', '灯具调整', '其他'].map(v => [v, v]), d.task || '过滤器清洗'); break;
    default: fields = field('事件', 'title', d.title, text + ' required');
  }
  const timestamp = record?.timestamp || new Date().toISOString();
  return `<form id="record-form" data-form="record" data-type="${e(type)}" data-inventory-linked="${type === 'add' && (!record?.id || !!record.inventoryEffect)}" data-id="${e(record?.id || '')}"><input type="hidden" name="type" value="${e(type)}">${fields}<details class="record-meta" ${record?.id || simple ? 'open' : ''}><summary>${icon('clock', 14)}${timeLabel(timestamp)}${icon('down', 11)}</summary>${field('时间', 'timestamp', localDateTime(timestamp), 'type="datetime-local" required')}${selectField('容器', 'containerId', data.containers.map(c => [c.id, c.name]), containerId)}</details>${simple || type === 'observe' ? `<input type="hidden" name="notes" value="${e(record?.notes || '')}">` : textarea('备注', 'notes', record?.notes || '', '选填')}${formFooter(record?.id ? '保存修改' : '保存', record?.id ? `<button type="button" class="button danger-quiet" data-action="delete-record" data-id="${e(record.id)}">${icon('trash', 16)}删除</button>` : '')}</form>`;
}
export function additionSpeciesFields(data, containerId, record, selectedId, species) {
  const d = record?.details || {};
  if (record?.id && !record.inventoryEffect) return `<div id="addition-species-fields">${field('物种', 'species', species ?? d.species, 'type="text" maxlength="100" required')}<p class="inventory-hint">旧记录未联动，修改只更新记录。</p></div>`;
  const animals = data.animals.filter(a => a.containerId === containerId);
  const selected = selectedId ?? (containerId === record?.containerId ? record?.inventoryEffect?.animalId : '') ?? '';
  const animal = animals.find(a => a.id === selected);
  const items = [['', '新物种'], ...animals.map(a => [a.id, `${a.species} ${countLabel(a)}`])];
  if (selected && !animal) items.push([selected, `${d.species || '原物种'}（已移除）`]);
  return `<div id="addition-species-fields">${selectField('物种', 'inventoryAnimalId', items, selected)}${selected ? `<input type="hidden" name="species" value="${e(species ?? d.species ?? animal?.species)}">` : field('新物种名称', 'species', species ?? d.species, 'type="text" maxlength="100" required placeholder="如 黑壳虾"')}<p class="inventory-hint">${animal && ['unknown', 'text'].includes(animal.countType) ? '总数待统计，另记新增只数。' : '保存后同步居民。'}</p></div>`;
}
export function collectRecord(form, original, photoIds = []) {
  const fd = new FormData(form), type = String(fd.get('type'));
  const date = new Date(fd.get('timestamp')); if (!Number.isFinite(date.getTime())) throw new Error('请填写有效时间。');
  const details = original?.type === type ? { ...original.details } : {};
  const ignored = new Set(['type', 'containerId', 'timestamp', 'notes', 'photo-file', 'inventoryAnimalId']);
  if (type === 'water') { delete details.liters; delete details.percent; }
  for (const [key, value] of fd) if (!ignored.has(key) && typeof value === 'string') {
    if (value.trim()) details[key] = value.trim(); else delete details[key];
  }
  for (const key of ['liters', 'percent', ...WATER_FIELDS.map(f => f[0])]) if (details[key] !== undefined) details[key] = Number(details[key]);
  if (type === 'test' && !WATER_FIELDS.some(([key]) => details[key] !== undefined)) throw new Error('请填写至少一项检测结果。');
  if (type === 'observe' && !details.text && !photoIds.length) throw new Error('写一段观察，或添加照片。');
  if (type === 'death') details.quantity = Number(details.quantity);
  if (type === 'add' && form.dataset.inventoryLinked === 'true') details.quantity = String(additionQuantity(details.quantity));
  return { type, containerId: fd.get('containerId'), timestamp: date.toISOString(), details, notes: String(fd.get('notes') || '').trim(), ...(photoIds.length ? { photoIds: [...photoIds] } : {}) };
}
export function containerForm(c) {
  const selected = { goby: 'stream', turtle: 'meadow', parrot: 'lake' }[c?.art] || c?.art || 'meadow';
  return `<form data-form="container" data-id="${e(c?.id || '')}">${field('缸名', 'name', c?.name, 'type="text" maxlength="100" required placeholder="给这片小水域取个名字"')}${selectField('类型', 'type', [['tank', '鱼缸 / 龟缸'], ['bucket', '虾桶'], ['other', '其他']], c?.type || 'tank')}<fieldset class="visual-field"><legend>缸景</legend><div class="habitat-picker">${HABITATS.map(h => `<label class="habitat-option"><input type="radio" name="art" value="${h.id}" ${selected === h.id ? 'checked' : ''}><span>${habitatArt(h.id)}<b>${e(h.name)}</b></span></label>`).join('')}</div></fieldset><details class="extra-fields"><summary>尺寸与备注 · 选填</summary><div class="field-grid">${field('尺寸', 'dimensions', c?.dimensions, text + ' placeholder="长 × 宽 × 高 cm"')}${field('水量', 'estimatedVolume', c?.estimatedVolume, text + ' placeholder="如 12 L"')}</div>${textarea('备注', 'notes', c?.notes)}</details>${formFooter('保存', c ? `<button type="button" class="button danger-quiet" data-action="delete-container" data-id="${e(c.id)}">${icon('trash', 16)}删除</button>` : '')}</form>`;
}
export function petPicker(selected, open = false) {
  const current = PET_TEMPLATES.find(p => p.id === selected) || PET_TEMPLATES.find(p => p.id === 'crucian');
  return `<details class="appearance-picker" ${open ? 'open' : ''}><summary><span class="selected-pet-preview">${petIcon(current.id, 42)}<b>${e(current.name)}</b></span><span>选择形象 ${icon('down', 12)}</span></summary><div class="pet-picker">${PET_TEMPLATES.map(p => `<label class="pet-option"><input type="radio" name="templateId" value="${p.id}" ${current.id === p.id ? 'checked' : ''}><span>${petIcon(p.id, 62)}<small>${e(p.name)}</small></span></label>`).join('')}</div></details>`;
}
export function animalForm(data, a, containerId, templateId = '') {
  const selected = templateId || a?.templateId || inferPetTemplate(a?.species, a?.icon);
  const preset = PET_TEMPLATES.find(p => p.id === selected) || PET_TEMPLATES.find(p => p.id === 'crucian'), species = a?.species || preset.species;
  const initial = a || { countType: 'exact', countValue: selected === 'guppy-gold' ? '4' : '1' };
  return `<form data-form="animal" data-id="${e(a?.id || '')}" data-auto-species="${e(species)}">${petPicker(selected, !a && !templateId)}${field('物种名称', 'species', species, 'type="text" maxlength="100" required')}<div class="field-grid">${selectField('数量', 'countType', [['exact', '精确'], ['estimated', '约数'], ['range', '区间'], ['unknown', '未知'], ['text', '文字描述']], initial.countType)}${selectField('容器', 'containerId', data.containers.map(c => [c.id, c.name]), a?.containerId || containerId)}</div><div id="animal-count-fields">${countFields(initial.countType, initial)}</div><details class="extra-fields" ${a?.uncertain ? 'open' : ''}><summary>更多信息 · 选填</summary><label class="check-field"><input type="checkbox" name="uncertain" ${a?.uncertain ? 'checked' : ''}><span>物种待确认</span></label>${field('体长', 'length', a?.length, text)}${textarea('备注', 'notes', a?.notes)}</details>${formFooter('保存', a ? `<button type="button" class="button danger-quiet" data-action="delete-animal" data-id="${e(a.id)}">${icon('trash', 16)}删除</button>` : '')}</form>`;
}
export function countFields(type, a = {}) {
  if (type === 'range') return `<div class="field-grid">${field('最少', 'countMin', a?.countMin ?? '', 'type="number" min="0" step="1" inputmode="numeric" required')}${field('最多', 'countMax', a?.countMax ?? '', 'type="number" min="0" step="1" inputmode="numeric" required')}</div>`;
  if (['exact', 'estimated'].includes(type)) return field(type === 'exact' ? '只数' : '大约只数', 'countValue', a?.countValue ?? '', 'type="number" min="0" step="1" inputmode="numeric" required');
  return field('数量描述', 'countValue', a?.countValue || (type === 'unknown' ? '存活数量待重新统计' : ''), text + ` ${type === 'text' ? 'required' : ''}`);
}
export function memberForm(a, member, index) {
  const selected = member.templateId || a.templateId || inferPetTemplate(a.species, a.icon);
  return `<form data-form="member" data-animal="${e(a.id)}" data-member="${e(member.id)}"><div class="member-edit-heading"><span>${petIcon(selected, 48)}</span><div><strong>${e(a.species)}${membersCount(a) > 1 ? ` ${index + 1}` : ''}</strong><small>${e(countLabel(a))}</small></div></div>${photoFields(member.avatarId ? [member.avatarId] : [], 'avatar')}${field('名字', 'name', member.name || '', 'type="text" maxlength="100" placeholder="给它取个名字"')}${petPicker(selected)}${field('体长', 'length', member.length || '', text + ' placeholder="选填"')}${formFooter('保存')}</form>`;
}
function membersCount(a) { return a.countType === 'exact' ? Number(a.countValue) : a.members?.length || 1; }

// # 重复提醒保持短表单；暂停原因存入日记备份，不作健康建议。
export function reminderForm(data, rule, containerId = '') {
  return `<form data-form="reminder" data-id="${e(rule?.id || '')}">${selectField('缸', 'containerId', data.containers.map(c => [c.id, c.name]), rule?.containerId || containerId || data.containers[0]?.id)}${selectField('任务', 'type', ['feed', 'siphon', 'water', 'topup'].map(type => [type, TYPES[type].label]), rule?.type || 'feed')}<div class="field-grid">${field('每隔 · 天', 'days', rule?.days || 1, 'type="number" min="1" max="3650" step="1" inputmode="numeric" required')}${field('时间', 'time', rule?.time || '08:00', 'type="time" required')}</div>${field('开始日期', 'startDate', rule?.startDate || localDateTime().slice(0, 10), 'type="date" required')}<details class="extra-fields"><summary>备注名称 · 选填</summary>${field('名称', 'title', rule?.title, 'type="text" maxlength="100" placeholder="如 少量喂食"')}${rule?.pauseReason ? `<p class="pause-history">上次暂停：${e(rule.pauseReason)}</p>` : ''}</details>${formFooter('保存', rule ? `<button type="button" class="button danger-quiet" data-action="delete-reminder" data-id="${e(rule.id)}">删除提醒</button>` : '')}</form>`;
}
export function pauseForm(rule) {
  return `<form data-form="pause-reminder" data-id="${e(rule.id)}">${textarea('暂停原因 · 选填', 'pauseReason', rule.pauseReason, '如 生病期间控制饮食').replace('maxlength="5000"', 'maxlength="1000"')}<p class="form-note">暂停后不再显示到期提醒，可随时恢复。</p>${formFooter('暂停提醒')}</form>`;
}
