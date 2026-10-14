// # 新增记录和居民名单在同一事务中更新；旧记录不追溯重放。
import { uid, membersFor, isBlackShrimp } from './data.js';
export function additionQuantity(value) {
  const number = Number(value);
  if (String(value ?? '').trim() === '' || !Number.isSafeInteger(number) || number < 1) throw new Error('新增数量请填写正整数只数。');
  return number;
}
const normalize = value => String(value || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
const epoch = animal => animal.inventoryEpoch || 0;
function changeCount(animal, delta) {
  if (['exact', 'estimated'].includes(animal.countType)) {
    const next = Number(animal.countValue) + delta;
    if (!Number.isSafeInteger(next) || next < 0) throw new Error('当前数量不足以撤销新增，请核对名单，或只删除记录。');
    animal.countValue = String(next);
  } else if (animal.countType === 'range') {
    const min = animal.countMin + delta, max = animal.countMax + delta;
    if (!Number.isSafeInteger(max) || min < 0) throw new Error('当前数量区间无法自动撤销，请核对名单，或只删除记录。');
    animal.countMin = min; animal.countMax = max;
  }
}
function checkMemberCount(animal, members) {
  if (animal.countType === 'exact' && members.length > Math.min(Number(animal.countValue), 200)) throw new Error('个体名单已手动调整，自动撤销会影响其他居民。请核对名单，或只删除记录。');
}
function refreshKnownCounts(data) {
  for (const animal of data.animals) {
    if (!['unknown', 'text'].includes(animal.countType)) { delete animal.knownAdded; continue; }
    const active = data.records.filter(r => r.inventoryEffect?.animalId === animal.id && r.inventoryEffect.countingEpoch === epoch(animal));
    const total = active.reduce((sum, r) => sum + (r.inventoryEffect.creditedQuantity ?? r.inventoryEffect.quantity), animal.knownAddedBase || 0);
    if (!Number.isSafeInteger(total)) throw new Error('新增数量累计过大，请核对名单。');
    if (total) animal.knownAdded = total; else delete animal.knownAdded;
  }
}
function cleanupEmpty(data, animal) {
  if (animal.originRecordId && animal.countType === 'exact' && Number(animal.countValue) === 0 && !animal.members?.length && !animal.notes && (!animal.displayName || animal.displayName === animal.species)) data.animals = data.animals.filter(a => a.id !== animal.id);
}
function reverseAddition(data, record) {
  const effect = record.inventoryEffect;
  if (!effect) return [];
  const animal = data.animals.find(a => a.id === effect.animalId); if (!animal) return [];
  const members = membersFor(animal), ids = new Set(effect.memberIds);
  const removed = members.filter(m => ids.has(m.id)), retained = members.filter(m => !ids.has(m.id));
  changeCount(animal, -effect.quantity); checkMemberCount(animal, retained);
  if (!isBlackShrimp(animal)) animal.members = retained;
  cleanupEmpty(data, animal);
  return removed;
}
function resolveTarget(data, entry, selectedId) {
  if (selectedId) {
    const animal = data.animals.find(a => a.id === selectedId && a.containerId === entry.containerId);
    if (!animal) throw new Error('对应物种已移动或移除，请重新选择。');
    return animal;
  }
  const matches = data.animals.filter(a => a.containerId === entry.containerId && normalize(a.species) === normalize(entry.details.species));
  if (matches.length > 1) throw new Error('这个缸有多个同名物种组，请从已有物种中选择。');
  if (matches.length) return matches[0];
  const species = String(entry.details.species || '').trim(); if (!species) throw new Error('请填写物种。');
  const animal = { id: uid('animal'), containerId: entry.containerId, species, displayName: species, countType: 'exact', countValue: '0', icon: species.includes('龟') ? 'turtle' : species.includes('鱼') ? 'fish' : species.includes('虾') ? 'shrimp' : 'fish', length: entry.details.length || '', notes: '', originRecordId: entry.id };
  data.animals.push(animal); return animal;
}
function appendMembers(animal, members, quantity, reusable = [], length = '') {
  if (isBlackShrimp(animal)) return [];
  const added = [];
  for (let i = 0; i < Math.min(quantity, Math.max(0, 200 - members.length)); i++) {
    const member = reusable[i] || { id: uid('member'), name: '', avatarId: '', length };
    members.push(member); added.push(member.id);
  }
  animal.members = members; return added;
}
// # 相同目标仅应用数量差值；移动目标时迁移本次新增个体的名字和头像。
export function putAddition(data, entry, selectedId = '') {
  const old = data.records.find(r => r.id === entry.id);
  if (old && !old.inventoryEffect) { data.records = data.records.filter(r => r.id !== entry.id); data.records.push(entry); return; }
  const quantity = additionQuantity(entry.details.quantity);
  const previous = old?.inventoryEffect;
  if (previous && previous.animalId === selectedId && !data.animals.some(a => a.id === selectedId) && quantity === previous.quantity && entry.containerId === old.containerId) {
    entry.inventoryEffect = structuredClone(previous); data.records = data.records.filter(r => r.id !== entry.id); data.records.push(entry); return;
  }
  const animal = resolveTarget(data, entry, selectedId);
  let memberIds, creditedQuantity;
  if (previous?.animalId === animal.id) {
    const delta = quantity - previous.quantity, members = membersFor(animal);
    const keptIds = previous.memberIds.slice(0, Math.min(quantity, previous.memberIds.length));
    const removedIds = new Set(previous.memberIds.filter(id => !keptIds.includes(id)));
    const retained = members.filter(m => !removedIds.has(m.id));
    changeCount(animal, delta); checkMemberCount(animal, retained);
    if (!isBlackShrimp(animal)) animal.members = retained;
    memberIds = keptIds.filter(id => retained.some(m => m.id === id));
    if (delta > 0) memberIds.push(...appendMembers(animal, retained, delta, [], entry.details.length || ''));
    const credit = previous.countingEpoch === epoch(animal) ? previous.creditedQuantity ?? previous.quantity : 0;
    creditedQuantity = Math.max(0, credit + delta);
  } else {
    const reusable = old ? reverseAddition(data, old) : [];
    const members = membersFor(animal); changeCount(animal, quantity);
    memberIds = appendMembers(animal, members, quantity, reusable, entry.details.length || ''); creditedQuantity = quantity;
  }
  entry.inventoryEffect = { version: 1, animalId: animal.id, quantity, memberIds, countingEpoch: epoch(animal), creditedQuantity };
  data.records = data.records.filter(r => r.id !== entry.id); data.records.push(entry);
  cleanupEmpty(data, animal); refreshKnownCounts(data);
}
export function removedAdditionProfiles(data, entry, selectedId) {
  const before = data.animals.flatMap(a => membersFor(a)), after = structuredClone(data);
  putAddition(after, structuredClone(entry), selectedId);
  const retained = new Set(after.animals.flatMap(a => membersFor(a)).map(m => m.id));
  return before.filter(m => !retained.has(m.id) && (m.name || m.avatarId));
}
export function deleteDiaryRecord(data, id, onlyRecord = false) {
  const record = data.records.find(r => r.id === id); if (!record) return;
  if (record.inventoryEffect) {
    if (onlyRecord) {
      const animal = data.animals.find(a => a.id === record.inventoryEffect.animalId);
      if (animal && ['unknown', 'text'].includes(animal.countType) && record.inventoryEffect.countingEpoch === epoch(animal)) animal.knownAddedBase = (animal.knownAddedBase || 0) + (record.inventoryEffect.creditedQuantity ?? record.inventoryEffect.quantity);
    } else reverseAddition(data, record);
  }
  data.records = data.records.filter(r => r.id !== id && r.id !== record.linkedRecordId);
  refreshKnownCounts(data);
}
export function clearDiaryRecords(data) {
  data.animals.forEach(a => { if (['unknown', 'text'].includes(a.countType)) a.knownAddedBase = a.knownAdded || 0; });
  data.records = [];
}
// # 手动盘点建立新的未知数量基线，不把旧新增记录重新累计。
export function resetInventoryBaseline(old, next) {
  const changed = ['countType', 'countValue', 'countMin', 'countMax'].some(key => String(old?.[key] ?? '') !== String(next[key] ?? ''));
  if (old && changed) { next.inventoryEpoch = epoch(old) + 1; delete next.knownAdded; delete next.knownAddedBase; }
}
