// # 使用旧版名单验证升级和备份恢复，不读取真实居民、记录或照片。
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData, validateData, membersFor, DiaryStore, STORAGE_KEY, countLabel } from '../dist/js/data.js';
import { putAddition, deleteDiaryRecord } from '../dist/js/inventory.js';
import { referencedPhotos } from '../dist/js/media.js';
const animal = (data, id) => data.animals.find(a => a.id === id);
function legacyData() {
  const data = seedData(); delete data.gobyGroupMergeVersion;
  Object.assign(animal(data, 'a5'), { countValue: '1', notes: '' });
  delete animal(data, 'a5').members; delete animal(data, 'a5').uncertain;
  data.animals.push({ id: 'a6', containerId: 'goby', species: '虾虎鱼 / 沙塘鳢', displayName: '虾虎鱼 / 沙塘鳢', icon: 'fish', countType: 'exact', countValue: '1', length: '', notes: '物种待确认', uncertain: true });
  return data;
}
const record = (id, quantity, species = '虾虎鱼 / 沙塘鳢') => ({ id, type: 'add', containerId: 'goby', timestamp: '2026-10-15T01:00:00Z', createdAt: '2026-10-15T01:00:00Z', updatedAt: '2026-10-15T01:00:00Z', details: { species, quantity: String(quantity) }, notes: '' });
test('新安装只有一组虾虎鱼，两条居民继续保留原个体 ID', () => {
  const data = seedData(), goby = animal(data, 'a5');
  assert.equal(animal(data, 'a6'), undefined); assert.equal(countLabel(goby), '×2');
  assert.deepEqual(membersFor(goby).map(m => m.id), ['a5_member_1', 'a6_member_1']);
  assert.equal(data.animals.flatMap(membersFor).length, 9);
  assert.deepEqual(validateData(data), data);
});
test('旧 JSON 合并数量且保留名字、头像、体长、备注及原始历史文字', () => {
  const old = legacyData(), a = animal(old, 'a5'), b = animal(old, 'a6');
  a.members = membersFor(a); b.members = membersFor(b);
  Object.assign(a.members[0], { name: '小石', avatarId: 'photo_a' });
  Object.assign(b.members[0], { name: '小灰', avatarId: 'photo_b', length: '3 cm' });
  a.notes = '原组备注'; b.notes = '原个体备注';
  const history = record('legacy', 1); old.records.push(history);
  const original = JSON.stringify(old), restored = validateData(JSON.parse(original));
  const goby = animal(restored, 'a5');
  assert.equal(goby.countValue, '2'); assert.equal(animal(restored, 'a6'), undefined);
  assert.deepEqual(goby.members, [...a.members, ...b.members]);
  assert.deepEqual(referencedPhotos(restored), ['photo_a', 'photo_b']);
  assert.match(goby.notes, /原组备注/); assert.match(goby.notes, /原个体备注/);
  assert.deepEqual(restored.records[0], history); assert.equal(JSON.stringify(old), original);
  assert.deepEqual(validateData(restored), restored);
});
test('旧本地数据读取与重复刷新不重复加数，失败写入保留原始数据', () => {
  const raw = JSON.stringify(legacyData());
  const storage = { value: raw, fail: false, getItem: () => storage.value, setItem: (key, value) => { assert.equal(key, STORAGE_KEY); if (storage.fail) throw new Error('quota'); storage.value = value; } };
  const first = new DiaryStore(storage); assert.equal(animal(first.data, 'a5').countValue, '2');
  assert.equal(storage.value, raw); assert.equal(animal(new DiaryStore(storage).data, 'a5').countValue, '2');
  storage.fail = true;
  assert.throws(() => first.commit(d => putAddition(d, record('failed', 1, '虾虎鱼'), 'a5')), /未能保存/);
  assert.equal(storage.value, raw); assert.equal(first.data.records.length, 0);
  storage.fail = false;
  first.commit(d => putAddition(d, record('saved', 1, '虾虎鱼'), 'a5'));
  assert.equal(animal(new DiaryStore(storage).data, 'a5').countValue, '3');
  assert.equal(animal(first.data, 'a6'), undefined);
});
test('两组原有新增记录合并后仍可编辑差值和撤销，个体资料保留', () => {
  const old = legacyData();
  putAddition(old, record('target-add', 1, '虾虎鱼'), 'a5');
  putAddition(old, record('source-add', 2), 'a6');
  const sourceProfile = animal(old, 'a6').members.at(-1);
  sourceProfile.name = '新居民'; sourceProfile.avatarId = 'photo_new';
  const restored = validateData(old);
  assert.equal(animal(restored, 'a5').countValue, '5');
  assert.ok(restored.records.every(r => r.inventoryEffect.animalId === 'a5'));
  putAddition(restored, record('source-add', 3), 'a5');
  assert.equal(animal(restored, 'a5').countValue, '6');
  assert.deepEqual(animal(restored, 'a5').members.find(m => m.id === sourceProfile.id), sourceProfile);
  deleteDiaryRecord(restored, 'target-add'); assert.equal(animal(restored, 'a5').countValue, '5');
  deleteDiaryRecord(restored, 'source-add'); assert.equal(animal(restored, 'a5').countValue, '2');
  assert.deepEqual(membersFor(animal(restored, 'a5')).map(m => m.id), ['a5_member_1', 'a6_member_1']);
  assert.doesNotThrow(() => validateData(restored));
});
test('未知数量合并不编造总数，不重放盘点前贡献，保留累计基线', () => {
  const old = legacyData(), a = animal(old, 'a5'), b = animal(old, 'a6');
  Object.assign(a, { countType: 'unknown', countValue: '待统计', inventoryEpoch: 2, knownAddedBase: 4 });
  Object.assign(b, { countType: 'text', countValue: '少于 10 只', inventoryEpoch: 7, knownAddedBase: 3 });
  putAddition(old, record('active-a', 2, '虾虎鱼'), 'a5');
  putAddition(old, record('active-b', 5), 'a6');
  const stale = record('before-count', 9); stale.inventoryEffect = { version: 1, animalId: 'a6', quantity: 9, memberIds: [], countingEpoch: 1, creditedQuantity: 9 }; old.records.push(stale);
  const restored = validateData(old), goby = animal(restored, 'a5');
  assert.equal(goby.countType, 'unknown'); assert.equal(goby.knownAdded, 14);
  assert.match(goby.notes, /少于 10 只/);
  assert.equal(restored.records.find(r => r.id === stale.id).inventoryEffect.creditedQuantity, 0);
  putAddition(restored, record(stale.id, 9), 'a5'); assert.equal(goby.knownAdded, 14);
  putAddition(restored, record(stale.id, 10), 'a5'); assert.equal(goby.knownAdded, 15);
  deleteDiaryRecord(restored, 'active-b'); assert.equal(goby.knownAdded, 10);
  deleteDiaryRecord(restored, 'active-a', true); assert.equal(goby.knownAdded, 10);
  assert.doesNotThrow(() => validateData(restored));
});
test('约数与区间合并保持原有确定程度', () => {
  const estimate = legacyData(); animal(estimate, 'a6').countType = 'estimated';
  assert.equal(countLabel(animal(validateData(estimate), 'a5')), '约 2 只');
  const range = legacyData(); Object.assign(animal(range, 'a6'), { countType: 'range', countMin: 2, countMax: 4, countValue: '' });
  assert.equal(countLabel(animal(validateData(range), 'a5')), '约 3–5 只');
  const mixed = legacyData(); Object.assign(animal(mixed, 'a6'), { countType: 'unknown', countValue: '尚未统计' });
  assert.equal(animal(validateData(mixed), 'a5').countType, 'unknown');
});
test('跨组重复个体 ID 会迁移关联，撤销原来源记录不误删目标居民', () => {
  const old = legacyData(); putAddition(old, record('source-add', 1), 'a6');
  const id = old.records[0].inventoryEffect.memberIds[0];
  animal(old, 'a5').members = [{ id, name: '原目标居民', avatarId: 'photo_target', length: '' }];
  const restored = validateData(old), goby = animal(restored, 'a5');
  assert.equal(new Set(goby.members.map(m => m.id)).size, 3);
  assert.notEqual(restored.records[0].inventoryEffect.memberIds[0], id);
  deleteDiaryRecord(restored, 'source-add');
  assert.equal(goby.members.find(m => m.id === id).name, '原目标居民');
});
test('不合并使用者已改名、移缸、删除目标或超过个体容量的名单', () => {
  for (const change of [d => { animal(d, 'a6').species = '其他鱼'; }, d => { animal(d, 'a6').containerId = 'turtle'; }, d => { d.animals = d.animals.filter(a => a.id !== 'a5'); }, d => { animal(d, 'a5').countValue = '200'; }]) {
    const old = legacyData(); change(old); const restored = validateData(old);
    assert.deepEqual(restored.animals, old.animals); assert.deepEqual(restored.records, old.records);
  }
  const current = seedData(); current.animals.push(legacyData().animals.find(a => a.id === 'a6'));
  assert.equal(validateData(current).animals.length, current.animals.length);
});
