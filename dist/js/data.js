// # 数据层：新增数量保留原有确定程度，旧记录不追溯联动。
import { mergeLegacyGobyGroups } from './migrations.js';
export const STORAGE_KEY = 'little-aqua-diary:v1';
export const TYPES = {
  feed: { label: '喂食', icon: 'food', color: 'gold' },
  siphon: { label: '吸便', icon: 'clean', color: 'mint' },
  water: { label: '换水', icon: 'water', color: 'blue' },
  topup: { label: '加水', icon: 'drop', color: 'blue' },
  test: { label: '水质检测', icon: 'test', color: 'purple' },
  death: { label: '死亡', icon: 'leaf', color: 'gray' },
  add: { label: '新增生物', icon: 'fish', color: 'mint' },
  medication: { label: '用药', icon: 'medicine', color: 'purple' },
  salt: { label: '加盐', icon: 'salt', color: 'gold' },
  equipment: { label: '设备维护', icon: 'gear', color: 'gray' },
  observe: { label: '观察', icon: 'eye', color: 'coral' },
  custom: { label: '自定义事件', icon: 'pen', color: 'gray' }
};
export const WATER_FIELDS = [
  ['ph', 'pH', '', 0, 14], ['temperature', '温度', '℃', -10, 60],
  ['tan', '氨氮 / TAN', 'mg/L', 0, null], ['nitrite', '亚硝酸盐 NO₂⁻', 'mg/L', 0, null],
  ['nitrate', '硝酸盐 NO₃⁻', 'mg/L', 0, null], ['kh', 'KH', '°dKH', 0, null],
  ['gh', 'GH', '°dGH', 0, null], ['tds', 'TDS', 'ppm', 0, null], ['oxygen', '溶氧', 'mg/L', 0, null]
];
export const uid = (prefix = 'id') => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
export const isBlackShrimp = animal => animal.species.replace(/\s/g, '') === '黑壳虾'; // # 黑壳虾按组管理，其余居民可逐个取名。
export function membersFor(animal) {
  if (isBlackShrimp(animal)) return [];
  const existing = animal.members || [];
  const total = animal.countType === 'exact' ? Math.min(Number(animal.countValue), 200) : existing.length || 1;
  return Array.from({ length: total }, (_, i) => existing[i] || {
    id: `${animal.id}_member_${i + 1}`, name: i === 0 && total === 1 && animal.displayName !== animal.species ? animal.displayName || '' : '',
    length: total === 1 ? animal.length || '' : '', avatarId: ''
  });
}
export function seedData() {
  return {
    schemaVersion: 1,
    gobyGroupMergeVersion: 1,
    revision: 0,
    containers: [
      { id: 'turtle', name: '龟鱼缸', dimensions: '60 × 40 × 34 cm', estimatedVolume: '', type: 'tank', art: 'turtle', notes: '' },
      { id: 'goby', name: '鲫鱼 / 虾虎鱼缸', dimensions: '50 × 27 × 30 cm', estimatedVolume: '', type: 'tank', art: 'goby', notes: '' },
      { id: 'parrot', name: '鹦鹉鱼缸', dimensions: '48 × 28.9 × 31.3 cm', estimatedVolume: '', type: 'tank', art: 'parrot', notes: '' },
      { id: 'shrimp-a', name: '黑壳虾桶 A', dimensions: '', estimatedVolume: '约 12 L', type: 'bucket', art: 'shrimp', notes: '原来约 80 只，当前实际存活数量未知。' },
      { id: 'shrimp-b', name: '黑壳虾桶 B', dimensions: '', estimatedVolume: '约 12 L', type: 'bucket', art: 'shrimp', notes: '原来约 80 只，当前实际存活数量未知。' }
    ],
    animals: [
      { id: 'a1', containerId: 'turtle', species: '小青龟', displayName: '小青龟', icon: 'turtle', countType: 'exact', countValue: '1', length: '约 4 cm', notes: '' },
      { id: 'a2', containerId: 'turtle', species: '天使鱼', displayName: '天使鱼', icon: 'fish', countType: 'exact', countValue: '2', length: '约 4 / 3.5 cm', notes: '' },
      { id: 'a3', containerId: 'turtle', species: '黑壳虾', displayName: '黑壳虾', icon: 'shrimp', countType: 'range', countMin: 20, countMax: 30, countValue: '', length: '', notes: '' },
      { id: 'a4', containerId: 'goby', species: '鲫鱼', displayName: '鲫鱼', icon: 'fish', countType: 'exact', countValue: '2', length: '', notes: '' },
      { id: 'a5', containerId: 'goby', species: '虾虎鱼', displayName: '虾虎鱼', icon: 'fish', countType: 'exact', countValue: '2', length: '', notes: '原“虾虎鱼 / 沙塘鳢”个体的物种待确认。', uncertain: true, members: [
        { id: 'a5_member_1', name: '', length: '', avatarId: '' },
        { id: 'a6_member_1', name: '', length: '', avatarId: '' }
      ] },
      { id: 'a7', containerId: 'parrot', species: '鹦鹉鱼', displayName: '鹦鹉鱼', icon: 'fish', countType: 'exact', countValue: '2', length: '', notes: '' },
      { id: 'a8', containerId: 'parrot', species: '黑壳虾', displayName: '黑壳虾', icon: 'shrimp', countType: 'text', countValue: '少于 10 只', length: '', notes: '' },
      { id: 'a9', containerId: 'shrimp-a', species: '黑壳虾', displayName: '黑壳虾', icon: 'shrimp', countType: 'unknown', countValue: '存活数量待重新统计', length: '', notes: '原来约 80 只；当前数量未知。' },
      { id: 'a10', containerId: 'shrimp-b', species: '黑壳虾', displayName: '黑壳虾', icon: 'shrimp', countType: 'unknown', countValue: '存活数量待重新统计', length: '', notes: '原来约 80 只；当前数量未知。' }
    ],
    records: [],
    settings: { theme: 'shore', animations: true, reminders: [], lastBackupAt: null }
  };
}

// # 导入严格验证结构、引用、时间与数值；未知内容不会写入存储。
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validText = (v, max = 10000) => typeof v === 'string' && v.length <= max;
const dateValid = v => validText(v, 60) && Number.isFinite(Date.parse(v));
export function validateData(input) {
  const fail = message => { throw new Error(`备份格式无效：${message}`); };
  if (!isObject(input) || input.schemaVersion !== 1) fail('需要版本 1 的水族日记 JSON 备份');
  if (input.gobyGroupMergeVersion !== undefined && input.gobyGroupMergeVersion !== 1) fail('名单合并标记无效');
  for (const key of ['containers', 'animals', 'records']) {
    if (!Array.isArray(input[key]) || input[key].length > 100000) fail(`${key} 必须是有效数组`);
  }
  const ids = {};
  for (const key of ['containers', 'animals', 'records']) {
    ids[key] = new Set();
    for (const item of input[key]) {
      if (!isObject(item) || !validText(item.id, 150) || !item.id || ids[key].has(item.id)) fail(`${key} 的 ID 缺失或重复`);
      ids[key].add(item.id);
    }
  }
  const textFields = (item, fields) => fields.forEach(field => {
    if (item[field] !== undefined && !validText(item[field])) fail(`${field} 必须是文本`);
  });
  for (const c of input.containers) {
    if (!validText(c.name, 100) || !c.name.trim()) fail('容器名称为空');
    if (!['tank', 'bucket', 'other'].includes(c.type)) fail('容器类型无效');
    textFields(c, ['dimensions', 'estimatedVolume', 'notes', 'art']);
  }
  for (const a of input.animals) {
    if (!ids.containers.has(a.containerId)) fail('居民引用了不存在的容器');
    if (!validText(a.species, 100) || !a.species.trim()) fail('物种名称为空');
    if (!['exact', 'estimated', 'range', 'unknown', 'text'].includes(a.countType)) fail('数量类型无效');
    textFields(a, ['displayName', 'length', 'notes', 'icon']);
    if (a.uncertain !== undefined && typeof a.uncertain !== 'boolean') fail('物种待确认标记无效');
    for (const field of ['knownAdded', 'knownAddedBase', 'inventoryEpoch']) if (a[field] !== undefined && (!Number.isSafeInteger(a[field]) || a[field] < 0)) fail('新增数量累计或盘点标记无效');
    textFields(a, ['originRecordId']);
    if (a.countValue !== undefined && !(validText(a.countValue, 300) || (typeof a.countValue === 'number' && Number.isFinite(a.countValue)))) fail('数量无效');
    if (['exact', 'estimated'].includes(a.countType) && (String(a.countValue).trim() === '' || !Number.isInteger(Number(a.countValue)) || Number(a.countValue) < 0)) fail('数量须是非负整数');
    if (a.countType === 'range' && (!Number.isInteger(a.countMin) || !Number.isInteger(a.countMax) || a.countMin < 0 || a.countMax < a.countMin)) fail('数量区间无效');
    if (a.members !== undefined) {
      if (!Array.isArray(a.members) || a.members.length > 200) fail('个体名单无效');
      const memberIds = new Set();
      for (const m of a.members) {
        if (!isObject(m) || !validText(m.id, 150) || !m.id || memberIds.has(m.id)) fail('个体 ID 无效');
        memberIds.add(m.id);
        textFields(m, ['name', 'length', 'avatarId']);
        if (m.avatarId && !/^[a-zA-Z0-9_-]{1,150}$/.test(m.avatarId)) fail('头像引用无效');
      }
    }
  }
  const recordById = new Map(input.records.map(r => [r.id, r]));
  for (const r of input.records) {
    if (!ids.containers.has(r.containerId) || !Object.hasOwn(TYPES, r.type)) fail('记录引用或类型无效');
    if (!dateValid(r.timestamp) || !dateValid(r.createdAt) || !dateValid(r.updatedAt)) fail('记录时间无效');
    if (!isObject(r.details) || Object.keys(r.details).length > 40) fail('记录详情无效');
    for (const [key, value] of Object.entries(r.details)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || !(validText(value) || (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean')) fail('记录详情包含无效内容');
    }
    textFields(r, ['notes']);
    if (r.type === 'test') {
      for (const [key, , , min, max] of WATER_FIELDS) {
        if (r.details[key] !== undefined && (r.details[key] === '' || !Number.isFinite(Number(r.details[key])) || Number(r.details[key]) < min || (max !== null && Number(r.details[key]) > max))) fail('水质数值超出输入范围');
      }
    }
    for (const key of ['liters', 'percent']) {
      if (r.details[key] !== undefined && (!Number.isFinite(Number(r.details[key])) || Number(r.details[key]) <= 0 || (key === 'percent' && Number(r.details[key]) > 100))) fail('水量无效');
    }
    if (r.type === 'death' && (!validText(r.details.species, 100) || !r.details.species.trim() || !Number.isInteger(Number(r.details.quantity)) || Number(r.details.quantity) <= 0)) fail('死亡记录需要物种和正整数数量');
    if (r.photoIds !== undefined && (!Array.isArray(r.photoIds) || r.photoIds.length > 3 || new Set(r.photoIds).size !== r.photoIds.length || r.photoIds.some(id => !validText(id, 150) || !/^[a-zA-Z0-9_-]{1,150}$/.test(id)))) fail('照片引用无效');
    if (r.type === 'observe' && (!(validText(r.details.text) && r.details.text.trim()) && !r.photoIds?.length)) fail('观察内容或照片为空');
    if (r.type === 'custom' && (!validText(r.details.title, 300) || !r.details.title.trim())) fail('事件名称为空');
    if (r.type === 'add' && (!validText(r.details.species, 100) || !r.details.species.trim() || !validText(r.details.quantity, 300) || !r.details.quantity.trim())) fail('新增生物需要物种和数量');
    if (r.inventoryEffect !== undefined) {
      const effect = r.inventoryEffect;
      if (r.type !== 'add' || !isObject(effect) || effect.version !== 1 || !validText(effect.animalId, 150) || !effect.animalId || !Number.isSafeInteger(effect.quantity) || effect.quantity < 1 || Number(r.details.quantity) !== effect.quantity || !Number.isSafeInteger(effect.countingEpoch) || effect.countingEpoch < 0 || !Number.isSafeInteger(effect.creditedQuantity) || effect.creditedQuantity < 0 || effect.creditedQuantity > effect.quantity || !Array.isArray(effect.memberIds) || effect.memberIds.length > 200 || new Set(effect.memberIds).size !== effect.memberIds.length || effect.memberIds.some(id => !validText(id, 150) || !id)) fail('新增记录的数量联动无效');
    }
    if (['medication', 'salt'].includes(r.type) && (!validText(r.details.name, 300) || !r.details.name.trim() || !validText(r.details.dose, 300) || !r.details.dose.trim())) fail('添加记录需要名称和剂量');
    if (r.linkedRecordId !== undefined) {
      const linked = recordById.get(r.linkedRecordId);
      if (!linked || linked.id === r.id || linked.linkedRecordId !== r.id || linked.containerId !== r.containerId || linked.timestamp !== r.timestamp || !((r.type === 'siphon' && linked.type === 'water' && r.details.withWater === true) || (r.type === 'water' && linked.type === 'siphon' && linked.details.withWater === true))) fail('吸便与换水的关联无效');
    }
  }
  if (!isObject(input.settings) || !['shore', 'lagoon'].includes(input.settings.theme) || typeof input.settings.animations !== 'boolean' || !Array.isArray(input.settings.reminders)) fail('设置无效');
  const ruleIds = new Set();
  for (const rule of input.settings.reminders) {
    if (!isObject(rule) || !validText(rule.id, 150) || !rule.id || ruleIds.has(rule.id) || !ids.containers.has(rule.containerId) || !Object.hasOwn(TYPES, rule.type) || !Number.isInteger(rule.days) || rule.days < 1 || rule.days > 3650) fail('提醒规则无效');
    ruleIds.add(rule.id);
  }
  if (input.settings.lastBackupAt != null && !dateValid(input.settings.lastBackupAt)) fail('备份时间无效');
  const clean = JSON.parse(JSON.stringify(input));
  delete clean.assets; delete clean.exportedAt; // # 照片二进制不进入 localStorage，导入时单独恢复。
  return mergeLegacyGobyGroups(clean, membersFor);
}

// # 写入成功后才更新界面，防止配额不足时产生“已保存”的假象。
export class DiaryStore {
  constructor(storage) {
    this.storage = storage;
    this.issue = '';
    this.raw = null;
    this.locked = false;
    this.data = seedData();
    try {
      this.raw = storage.getItem(STORAGE_KEY);
      if (this.raw !== null) {
        try { this.data = validateData(JSON.parse(this.raw)); }
        catch { this.locked = true; this.issue = '本地数据无法读取，原始内容仍保留。请先导出原始数据，再导入有效备份。'; }
      } else storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch { this.issue = '浏览器未允许本地存储，记录可能无法保存。请使用普通浏览窗口并允许网站存储。'; }
  }
  commit(mutator) {
    if (this.locked) throw new Error(this.issue);
    let current = this.data;
    try {
      const latest = this.storage.getItem(STORAGE_KEY);
      if (latest) current = validateData(JSON.parse(latest));
    } catch { throw new Error('无法读取本地数据，请先导出备份并检查浏览器存储权限。'); }
    const next = JSON.parse(JSON.stringify(current));
    mutator(next);
    next.revision = (Number(current.revision) || 0) + 1;
    return this.replace(next);
  }
  replace(input) {
    const next = validateData(input);
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { throw new Error('未能保存：浏览器存储被禁用或空间不足。请导出备份，释放空间后重试。'); }
    this.data = next;
    this.issue = '';
    this.locked = false;
    this.raw = JSON.stringify(next);
    return next;
  }
  reload() {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) { this.issue = '浏览器中的日记数据已被清除，请导入备份恢复。'; this.locked = true; return; }
      this.data = validateData(JSON.parse(raw)); this.issue = ''; this.locked = false; this.raw = raw;
    } catch { this.issue = '另一窗口的数据无法读取，请导出备份后检查。'; this.locked = true; }
  }
}
export function countLabel(a) {
  if (a.knownAdded && ['unknown', 'text'].includes(a.countType)) return `待统计 · 新增 ${a.knownAdded} 只`;
  switch (a.countType) {
    case 'exact': return `×${a.countValue}`;
    case 'estimated': return `约 ${a.countValue} 只`;
    case 'range': return `约 ${a.countMin}–${a.countMax} 只`;
    case 'unknown': return a.countValue || '数量未知';
    default: return a.countValue || '数量待统计';
  }
}
export const shortCountLabel = a => a.countType === 'unknown' && !a.knownAdded ? '待统计' : countLabel(a); // # 未知总数与已登记的新增数量分别展示。
