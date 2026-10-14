import { legacySeedData as seedData } from './fixtures/legacy-data.mjs'; // # 旧备份回归资料。
// # 验证不可丢失的数据边界：未知数量、存储失败、备份验证与日期筛选。
import test from 'node:test';
import assert from 'node:assert/strict';
import { DiaryStore, STORAGE_KEY, validateData, countLabel, membersFor } from '../dist/js/data.js';
import { filterRecords, csvText, statistics, relativeTime, latestRecord, feedingMonth, shiftMonth } from '../dist/js/logic.js';
import { referencedPhotos } from '../dist/js/media.js';
process.env.TZ = 'Asia/Shanghai'; // # 固定测试时区，实际网页仍遵循使用者设备时区。
class MemoryStorage {
  constructor() { this.values = new Map([[STORAGE_KEY, JSON.stringify(seedData())]]); this.fail = false; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.fail) throw new Error('quota'); this.values.set(key, value); }
}
const makeRecord = (id, type, timestamp, details = {}) => ({ id, type, timestamp, containerId: 'turtle', details, notes: '', createdAt: timestamp, updatedAt: timestamp });
test('旧备份数量不虚构：两桶未知、区间与少于数量保留', () => {
  const d = validateData(seedData());
  assert.equal(d.containers.length, 5);
  assert.equal(d.records.length, 0);
  assert.equal(d.animals.filter(a => a.countType === 'unknown').length, 2);
  assert.equal(countLabel(d.animals.find(a => a.id === 'a3')), '约 20–30 只');
  assert.equal(countLabel(d.animals.find(a => a.id === 'a8')), '少于 10 只');
  assert.equal(d.animals.find(a => a.id === 'a5').uncertain, true);
});
test('存储写入失败不更改内存和已保存数据', () => {
  const storage = new MemoryStorage(), store = new DiaryStore(storage);
  const old = storage.getItem(STORAGE_KEY);
  storage.fail = true;
  assert.throws(() => store.commit(d => { d.containers[0].name = '失效修改'; }), /未能保存/);
  assert.equal(store.data.containers[0].name, '龟鱼缸');
  assert.equal(storage.getItem(STORAGE_KEY), old);
});
test('损坏的本地数据锁定写入并保留原始内容，有效备份可恢复', () => {
  const storage = new MemoryStorage(); storage.setItem(STORAGE_KEY, '{broken');
  const store = new DiaryStore(storage);
  assert.equal(store.locked, true);
  assert.equal(store.raw, '{broken');
  assert.throws(() => store.commit(d => { d.records = []; }));
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
  store.replace(seedData()); assert.equal(store.locked, false);
});
test('跨刷新保留记录，死亡记录不改变数量', () => {
  const storage = new MemoryStorage(), store = new DiaryStore(storage);
  const animals = JSON.stringify(store.data.animals);
  store.commit(d => { d.records.push(makeRecord('death-1', 'death', '2026-10-14T02:30:00Z', { species: '黑壳虾', quantity: 3 })); });
  const refreshed = new DiaryStore(storage);
  assert.equal(refreshed.data.records.length, 1);
  assert.equal(JSON.stringify(refreshed.data.animals), animals);
});
test('多个窗口写入先读取最新状态，避免覆盖另一窗口的新记录', () => {
  const storage = new MemoryStorage(), a = new DiaryStore(storage), b = new DiaryStore(storage);
  a.commit(d => { d.records.push(makeRecord('r1', 'feed', '2026-10-14T01:00:00Z')); });
  b.commit(d => { d.records.push(makeRecord('r2', 'topup', '2026-10-14T02:00:00Z', { liters: 1 })); });
  assert.equal(b.data.records.length, 2);
});
test('同一分钟内连续喂食，取最新创建的食物并按创建先后排序', () => {
  const d = seedData();
  const a = makeRecord('old', 'feed', '2026-10-14T00:00:00Z', { food: '龟粮' });
  const b = makeRecord('new', 'feed', a.timestamp, { food: '鱼粮' });
  a.createdAt = '2026-10-14T00:00:02Z'; b.createdAt = '2026-10-14T00:00:20Z';
  d.records = [a, b];
  assert.equal(latestRecord(d, 'turtle', 'feed').details.food, '鱼粮');
  assert.deepEqual(filterRecords(d, {}).map(r => r.id), ['new', 'old']);
});
test('JSON 往返与不合法备份检测', () => {
  const d = seedData(); assert.deepEqual(validateData(JSON.parse(JSON.stringify(d))), d);
  for (const mutate of [x => { x.schemaVersion = 2; }, x => { x.animals[0].containerId = 'missing'; }, x => { x.animals[0].id = 'a2'; }, x => { x.animals[2].countMax = 10; }, x => { x.settings.theme = 'invalid'; }, x => { x.records.push(makeRecord('r', 'test', 'bad', { ph: 8 })); }, x => { x.records.push(makeRecord('r', 'test', '2026-10-14T00:00:00Z', { ph: 15 })); }]) {
    const bad = seedData(); mutate(bad); assert.throws(() => validateData(bad), /备份格式无效/);
  }
});
test('记录筛选按本地日期覆盖当天边界，搜索备注和水质参数', () => {
  const d = seedData();
  d.records = [makeRecord('a', 'observe', '2026-10-13T16:00:00Z', { text: '尾鳍有白点' }), makeRecord('b', 'test', '2026-10-14T15:59:59Z', { ph: 6.8 }), makeRecord('c', 'feed', '2026-10-14T16:00:00Z', { food: '鱼粮' })];
  assert.deepEqual(filterRecords(d, { from: '2026-10-14', to: '2026-10-14' }).map(r => r.id), ['b', 'a']);
  assert.equal(filterRecords(d, { search: '白点' })[0].id, 'a');
  assert.equal(filterRecords(d, { search: 'pH', container: 'turtle', type: 'test' }).length, 1);
  assert.equal(filterRecords(d, { container: 'shrimp-a' }).length, 0);
});
test('统计区分补水和换水，并使用周一边界', () => {
  const d = seedData();
  d.records = [makeRecord('a', 'water', '2026-10-11T15:59:59Z'), makeRecord('b', 'water', '2026-10-11T16:00:00Z'), makeRecord('c', 'topup', '2026-10-14T00:00:00Z'), makeRecord('d', 'feed', '2026-10-14T00:00:00Z')];
  const s = statistics(d, new Date('2026-10-14T03:00:00Z'));
  assert.equal(s.weekWater, 1); assert.equal(s.weekFeed, 1); assert.equal(s.today, 2);
  assert.equal(relativeTime(null), '暂无记录');
});
test('CSV BOM、换行与引号转义，防止电子表格公式注入', () => {
  const d = seedData(); d.containers[0].name = '=1+1';
  const r = makeRecord('a', 'observe', '2026-10-14T00:00:00Z', { text: '虾,"正常"\n第二行' }); r.notes = '@SUM(A1)'; d.records.push(r);
  const csv = csvText(d);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"\'=1+1"')); assert.ok(csv.includes('"\'@SUM(A1)"'));
  assert.ok(csv.includes('虾,""正常""\n第二行')); assert.ok(csv.includes('详情JSON'));
});
test('吸便换水关联必须双向完整、同容器同时间', () => {
  const d = seedData();
  const a = makeRecord('a', 'siphon', '2026-10-14T00:00:00Z', { withWater: true });
  const b = makeRecord('b', 'water', a.timestamp); a.linkedRecordId = 'b'; b.linkedRecordId = 'a'; d.records = [a, b];
  assert.doesNotThrow(() => validateData(d));
  b.containerId = 'goby'; assert.throws(() => validateData(d), /关联无效/);
});
test('个体名字和头像独立保存，黑壳虾按组管理', () => {
  const d = seedData(), angel = d.animals.find(a => a.id === 'a2');
  angel.members = membersFor(angel);
  assert.equal(angel.members.length, 2);
  angel.members[0].name = '月亮'; angel.members[0].avatarId = 'photo_one'; angel.members[1].name = '星星';
  const restored = validateData(JSON.parse(JSON.stringify(d)));
  assert.equal(restored.animals.find(a => a.id === 'a2').members[1].name, '星星');
  assert.deepEqual(membersFor(d.animals.find(a => a.id === 'a3')), []);
  assert.deepEqual(referencedPhotos(d), ['photo_one']);
  assert.equal(membersFor({ ...angel, countValue: 1 })[0].name, '月亮');
});
test('照片引用校验，只有照片的观察有效，二进制不进入元数据', () => {
  const d = seedData(), r = makeRecord('photo-note', 'observe', '2026-10-14T00:00:00Z');
  r.photoIds = ['photo_one']; d.records.push(r); d.assets = [{ id: 'photo_one', dataURL: 'fixture' }];
  const clean = validateData(d); assert.equal(clean.assets, undefined); assert.deepEqual(clean.records[0].photoIds, ['photo_one']);
  r.photoIds = []; assert.throws(() => validateData(d), /观察/);
  r.photoIds = ['invalid/uri']; assert.throws(() => validateData(d), /照片引用/);
  r.photoIds = ['a', 'a']; assert.throws(() => validateData(d), /照片引用/);
});
test('喂食月历按本地日期、指定缸和闰月生成，次数与记录天数分开', () => {
  const d = seedData();
  d.records = [makeRecord('a', 'feed', '2024-02-28T16:00:00Z'), makeRecord('b', 'feed', '2024-02-29T09:00:00Z'), makeRecord('c', 'water', '2024-02-29T02:00:00Z'), makeRecord('outside', 'feed', '2024-02-29T16:00:00Z'), { ...makeRecord('other', 'feed', '2024-02-29T00:00:00Z'), containerId: 'goby' }];
  const month = feedingMonth(d, 'turtle', '2024-02');
  assert.equal(month.days.length, 29); assert.equal(month.leading, 3); assert.equal(month.feedCount, 2); assert.equal(month.feedDays, 1); assert.equal(month.waterCount, 1);
  assert.equal(month.days[28].feedCount, 2); assert.equal(month.days[27].feedCount, 0); assert.equal(month.records.length, 3);
  assert.equal(shiftMonth('2026-12', 1), '2027-01'); assert.equal(shiftMonth('2026-01', -1), '2025-12');
});
test('旧版带食物、加水量和主题的备份继续可读', () => {
  const d = seedData(); d.settings.theme = 'lagoon';
  d.records.push(makeRecord('legacy-feed', 'feed', '2026-10-14T00:00:00Z', { food: '龟粮', amount: '3 粒' }));
  d.records.push(makeRecord('legacy-topup', 'topup', '2026-10-14T00:00:00Z', { liters: 2 }));
  const clean = validateData(d); assert.equal(clean.records[0].details.food, '龟粮'); assert.equal(clean.records[1].details.liters, 2);
  assert.equal(filterRecords(clean, { search: '龟粮' }).length, 1);
});
