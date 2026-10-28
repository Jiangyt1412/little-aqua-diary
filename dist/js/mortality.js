// # 已故状态从明确关联的死亡记录派生，原名单和照片保持完整。
import { membersFor } from './data.js';
const losses = (data, id) => data.records.filter(r => r.type === 'death' && r.details.animalId === id);
export const residentDeath = (data, animalId, memberId) => losses(data, animalId).find(r => r.details.memberId === memberId) || null;
export const residentLosses = (data, animalId) => losses(data, animalId).reduce((n, r) => n + Number(r.details.quantity), 0);
export function livingAnimal(data, animal) {
  const loss = residentLosses(data, animal.id), value = { ...animal };
  if (['exact', 'estimated'].includes(value.countType)) value.countValue = String(Math.max(0, Number(value.countValue) - loss));
  if (value.countType === 'range') { value.countMin = Math.max(0, value.countMin - loss); value.countMax = Math.max(0, value.countMax - loss); }
  value.members = membersFor(animal).filter(m => !residentDeath(data, animal.id, m.id));
  return value;
}
export function validateResidentDeath(data, entry, excludeRecordId = entry.id) {
  const d = entry.details;
  if (!d.animalId) { if (d.memberId) throw new Error('请先选择对应物种。'); return; }
  const animal = data.animals.find(a => a.id === d.animalId);
  const old = data.records.find(r => r.id === excludeRecordId);
  const unchangedTarget = old?.details.animalId === d.animalId && old?.details.memberId === d.memberId && old.containerId === entry.containerId;
  if (!animal) { if (unchangedTarget) return; throw new Error('该居民已被移除，请重新选择。'); }
  if (animal.containerId !== entry.containerId && !unchangedTarget) throw new Error('居民与所选缸不一致。');
  if (Date.parse(entry.timestamp) > Date.now()) throw new Error('死亡时间不能晚于现在。');
  const others = { ...data, records: data.records.filter(r => r.id !== excludeRecordId) };
  if (d.memberId) {
    if (!membersFor(animal).some(m => m.id === d.memberId) && !unchangedTarget) throw new Error('该个体已被移除，请重新选择。');
    if (Number(d.quantity) !== 1) throw new Error('个体死亡登记的数量应为 1。');
    if (residentDeath(others, animal.id, d.memberId)) throw new Error('这个居民已经登记死亡，请修改原记录。');
  }
  const total = residentLosses(others, animal.id) + Number(d.quantity);
  if (animal.countType === 'exact' && total > Number(animal.countValue)) throw new Error('死亡数量超过当前存活数量，请核对居民数量。');
}
