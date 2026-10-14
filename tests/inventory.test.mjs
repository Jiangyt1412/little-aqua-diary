// # 验证新增联动的数量差值、名字保留、不确定数量和原子回滚。
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData, validateData, DiaryStore, membersFor, countLabel } from '../dist/js/data.js';
import { putAddition, deleteDiaryRecord, removedAdditionProfiles, clearDiaryRecords, resetInventoryBaseline } from '../dist/js/inventory.js';
const record = (id, species, quantity, containerId = 'turtle') => ({ id, containerId, type: 'add', timestamp: '2026-10-14T00:00:00Z', createdAt: '2026-10-14T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z', details: { species, quantity: String(quantity) }, notes: '' });
const animal = (d, id) => d.animals.find(a => a.id === id);
class Storage {
  constructor() { this.value = null; this.fail = false; }
  getItem() { return this.value; }
  setItem(k, v) { if (this.fail) throw new Error('quota'); this.value = v; }
}
test('已有精确物种累加并生成个体，重复保存只更新记录', () => {
  const d = seedData(), a = animal(d, 'a2'); a.members = membersFor(a); a.members[0].name = '月亮'; a.members[0].avatarId = 'photo_1';
  putAddition(d, record('new-1', '天使鱼', 3), 'a2');
  assert.equal(a.countValue, '5'); assert.equal(a.members.length, 5); assert.equal(a.members[0].name, '月亮'); assert.equal(d.records[0].inventoryEffect.memberIds.length, 3);
  const ids = a.members.map(m => m.id);
  putAddition(d, { ...record('new-1', '天使鱼', 3), notes: '只改备注' }, 'a2');
  assert.equal(a.countValue, '5'); assert.deepEqual(a.members.map(m => m.id), ids); assert.doesNotThrow(() => validateData(d));
});
test('修改数量应用差值，删除只移除本次新增个体', () => {
  const d = seedData(), a = animal(d, 'a2'); a.members = membersFor(a); a.members[0].name = '原居民';
  putAddition(d, record('r', '天使鱼', 2), 'a2'); const newId = d.records[0].inventoryEffect.memberIds[0]; a.members.find(m => m.id === newId).name = '新居民';
  putAddition(d, record('r', '天使鱼', 4), 'a2'); assert.equal(a.countValue, '6'); assert.equal(a.members.find(m => m.id === newId).name, '新居民');
  a.members.find(m => m.id === d.records[0].inventoryEffect.memberIds.at(-1)).name = '会移除的新居民';
  const removed = removedAdditionProfiles(d, record('r', '天使鱼', 1), 'a2'); assert.equal(removed.length, 1); assert.equal(removed[0].name, '会移除的新居民');
  putAddition(d, record('r', '天使鱼', 1), 'a2'); assert.equal(a.countValue, '3');
  deleteDiaryRecord(d, 'r'); assert.equal(a.countValue, '2'); assert.equal(a.members.length, 2); assert.equal(a.members[0].name, '原居民');
});
test('新物种自动创建，同名匹配不重复创建，删除归零时清理空组', () => {
  const d = seedData(); putAddition(d, record('r1', '孔雀鱼', 2)); const a = d.animals.find(a => a.species === '孔雀鱼'); assert.ok(a); assert.equal(a.members.length, 2);
  putAddition(d, record('r2', ' 孔雀鱼 ', 1)); assert.equal(d.animals.filter(a => a.species === '孔雀鱼').length, 1); assert.equal(a.countValue, '3');
  deleteDiaryRecord(d, 'r1'); assert.equal(a.countValue, '1'); deleteDiaryRecord(d, 'r2'); assert.equal(animal(d, a.id), undefined); assert.doesNotThrow(() => validateData(d));
  putAddition(d, record('goby-species', '虾虎鱼', 1, 'shrimp-a')); assert.equal(d.animals.find(a => a.containerId === 'shrimp-a' && a.species === '虾虎鱼').icon, 'fish');
});
test('改缸和目标迁移本次新增个体，名字头像保留', () => {
  const d = seedData(); putAddition(d, record('r', '天使鱼', 2), 'a2'); const effect = d.records[0].inventoryEffect, memberId = effect.memberIds[0]; const m = animal(d, 'a2').members.find(m => m.id === memberId); m.name = '新月'; m.avatarId = 'photo_m';
  putAddition(d, record('r', '鲫鱼', 2, 'goby'), 'a4'); assert.equal(animal(d, 'a2').countValue, '2'); assert.equal(animal(d, 'a4').countValue, '4');
  const moved = animal(d, 'a4').members.find(m => m.id === memberId); assert.equal(moved.name, '新月'); assert.equal(moved.avatarId, 'photo_m'); assert.doesNotThrow(() => validateData(d));
});
test('约数和区间保持类型，未知和文字总数只显示新增累计', () => {
  const d = seedData(); animal(d, 'a4').countType = 'estimated';
  putAddition(d, record('estimate', '鲫鱼', 3, 'goby'), 'a4'); assert.equal(countLabel(animal(d, 'a4')), '约 5 只');
  putAddition(d, record('range', '黑壳虾', 5), 'a3'); assert.equal(countLabel(animal(d, 'a3')), '约 25–35 只');
  putAddition(d, record('unknown', '黑壳虾', 5, 'shrimp-a'), 'a9'); const unknown = animal(d, 'a9'); assert.equal(unknown.countType, 'unknown'); assert.equal(unknown.knownAdded, 5); assert.equal(countLabel(unknown), '待统计 · 新增 5 只');
  putAddition(d, record('text', '黑壳虾', 3, 'parrot'), 'a8'); assert.equal(animal(d, 'a8').countValue, '少于 10 只'); assert.equal(countLabel(animal(d, 'a8')), '待统计 · 新增 3 只');
  deleteDiaryRecord(d, 'unknown'); assert.equal(unknown.knownAdded, undefined); assert.equal(unknown.countType, 'unknown'); assert.doesNotThrow(() => validateData(d));
});
test('旧记录编辑和删除不追溯联动；手动盘点后不重复累计', () => {
  const d = seedData(), legacy = record('legacy', '天使鱼', '约 20 只'); d.records.push(legacy);
  putAddition(d, { ...legacy, notes: '修改历史备注' }, 'a2'); assert.equal(animal(d, 'a2').countValue, '2'); deleteDiaryRecord(d, 'legacy'); assert.equal(animal(d, 'a2').countValue, '2');
  putAddition(d, record('new', '黑壳虾', 5, 'shrimp-a'), 'a9'); const old = structuredClone(animal(d, 'a9')); animal(d, 'a9').countValue = '尚未盘点'; resetInventoryBaseline(old, animal(d, 'a9'));
  putAddition(d, record('new', '黑壳虾', 5, 'shrimp-a'), 'a9'); assert.equal(animal(d, 'a9').knownAdded, undefined);
  putAddition(d, record('new', '黑壳虾', 7, 'shrimp-a'), 'a9'); assert.equal(animal(d, 'a9').knownAdded, 2);
});
test('只删除记录和清空历史保留数量，后续新增累计仍正确', () => {
  const d = seedData(); putAddition(d, record('r1', '黑壳虾', 5, 'shrimp-a'), 'a9'); deleteDiaryRecord(d, 'r1', true); assert.equal(animal(d, 'a9').knownAdded, 5);
  putAddition(d, record('r2', '黑壳虾', 3, 'shrimp-a'), 'a9'); assert.equal(animal(d, 'a9').knownAdded, 8); clearDiaryRecords(d); assert.equal(animal(d, 'a9').knownAdded, 8);
  putAddition(d, record('r3', '黑壳虾', 2, 'shrimp-a'), 'a9'); assert.equal(animal(d, 'a9').knownAdded, 10); deleteDiaryRecord(d, 'r3'); assert.equal(animal(d, 'a9').knownAdded, 8); assert.doesNotThrow(() => validateData(d));
});
test('保存失败同时回滚记录与数量，多窗口新增保留双方贡献', () => {
  const storage = new Storage(), a = new DiaryStore(storage), b = new DiaryStore(storage), before = storage.value;
  storage.fail = true; assert.throws(() => a.commit(d => putAddition(d, record('failure', '天使鱼', 3), 'a2')), /未能保存/); assert.equal(storage.value, before); assert.equal(animal(a.data, 'a2').countValue, '2');
  storage.fail = false; a.commit(d => putAddition(d, record('a', '天使鱼', 1), 'a2')); b.commit(d => putAddition(d, record('b', '天使鱼', 2), 'a2')); assert.equal(animal(b.data, 'a2').countValue, '5'); assert.equal(b.data.records.length, 2);
});
test('非法数量和同名歧义拒绝保存，人工调整后不足撤销不损失原居民', () => {
  for (const quantity of [0, -1, 1.5, '约 3', Number.MAX_SAFE_INTEGER + 1]) { const store = new DiaryStore(new Storage()); assert.throws(() => store.commit(d => putAddition(d, record('bad', '天使鱼', quantity), 'a2'))); assert.equal(store.data.records.length, 0); }
  const store = new DiaryStore(new Storage()); store.commit(d => { d.animals.push({ ...animal(d, 'a2'), id: 'duplicate' }); }); assert.throws(() => store.commit(d => putAddition(d, record('dup', '天使鱼', 1))), /多个同名/);
  store.commit(d => putAddition(d, record('r', '天使鱼', 2), 'a2')); store.commit(d => { const a = animal(d, 'a2'); a.countValue = '1'; a.members = a.members.slice(0, 1); });
  const before = JSON.stringify(store.data); assert.throws(() => store.commit(d => deleteDiaryRecord(d, 'r')), /不足/); assert.equal(JSON.stringify(store.data), before);
  store.commit(d => deleteDiaryRecord(d, 'r', true)); assert.equal(animal(store.data, 'a2').countValue, '1');
});
test('联动信息 JSON 往返后仍可撤销，损坏贡献数量拒绝导入', () => {
  const d = seedData(); putAddition(d, record('r', '天使鱼', 2), 'a2'); const restored = validateData(JSON.parse(JSON.stringify(d))); deleteDiaryRecord(restored, 'r'); assert.equal(animal(restored, 'a2').countValue, '2');
  d.records[0].inventoryEffect.quantity = 10; assert.throws(() => validateData(d), /数量联动/);
});
