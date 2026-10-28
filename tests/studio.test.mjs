// # 空白初始数据、旧资料保护、提醒和日历格式的行为验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { seedData, validateData, DiaryStore, STORAGE_KEY, membersFor, TYPES } from '../dist/js/data.js';
import { legacySeedData } from './fixtures/legacy-data.mjs';
import { isUntouchedStarter } from '../dist/js/starter-reset.js';
import { taskState, taskStates, pauseTask, resumeTask, tasksCalendar } from '../dist/js/tasks.js';
import { referencedPhotos } from '../dist/js/media.js';
import { PET_TEMPLATES, inferPetTemplate, petIcon } from '../dist/js/pets.js';
import { HABITATS, habitatArt } from '../dist/js/habitats.js';
process.env.TZ = 'Asia/Shanghai'; // # 固定测试时区，生产使用设备时区。
const original = JSON.parse(await fs.readFile(new URL('./fixtures/original-data.json', import.meta.url), 'utf8'));
const blankStorage = () => ({ value: null, fail: false, getItem() { return this.value; }, setItem(key, value) { assert.equal(key, STORAGE_KEY); if (this.fail) throw new Error('quota'); this.value = value; } });
function taskData() {
  const data = seedData(); data.containers.push({ id: 'tank', name: '演示缸', type: 'tank', art: 'lake' });
  data.settings.reminders.push({ id: 'feed-task', type: 'feed', containerId: 'tank', days: 1, time: '08:00', startDate: '2026-10-15', status: 'active' });
  return data;
}
const care = (id, time, extra = {}) => ({ id, type: 'feed', containerId: 'tank', timestamp: time, createdAt: time, updatedAt: time, details: {}, notes: '', ...extra });
test('新安装和刷新始终从空白开始，不预设四条孔雀鱼或任何缸', () => {
  const data = seedData(); assert.deepEqual([data.containers, data.animals, data.records, data.settings.reminders], [[], [], [], []]);
  const storage = blankStorage(), store = new DiaryStore(storage);
  assert.deepEqual(store.data, data); assert.deepEqual(new DiaryStore(storage).data, data);
  assert.deepEqual(validateData(JSON.parse(storage.value)), data);
});
test('自动转空白只识别两版完整未编辑默认配置，个人改动均不匹配', async () => {
  assert.equal(await isUntouchedStarter(original), true); assert.equal(await isUntouchedStarter(legacySeedData()), true);
  for (const change of [d => { d.revision = 1; }, d => { d.containers[0].name = '我的缸'; }, d => { d.animals[0].countValue = '2'; }, d => { d.animals[0].notes = '我的备注'; }, d => { d.animals[0].members = [{ id: 'named', name: '青团', avatarId: '' }]; }, d => { d.records.push(care('personal', '2026-10-15T01:00:00Z')); }]) {
    const data = legacySeedData(); change(data); assert.equal(await isUntouchedStarter(data), false);
  }
  assert.equal(await isUntouchedStarter(seedData()), false);
});
test('旧备份恢复原样保留两组物种、数量和照片引用，不再自动合并', () => {
  const data = structuredClone(original); data.animals[0].members = membersFor(data.animals[0]); data.animals[0].members[0].name = '旧名字'; data.animals[0].members[0].avatarId = 'old_photo';
  const restored = validateData(data); assert.deepEqual(restored, data);
  assert.equal(restored.animals.find(a => a.id === 'a6').species, '虾虎鱼 / 沙塘鳢');
  assert.deepEqual(referencedPhotos(restored), ['old_photo']);
});
test('已有个人日记加载保持原数据，空白重置写入失败不丢失记录', () => {
  const storage = blankStorage(), personal = legacySeedData(); personal.containers[0].name = '已使用的缸'; storage.value = JSON.stringify(personal);
  const store = new DiaryStore(storage); assert.deepEqual(store.data, personal);
  storage.fail = true; assert.throws(() => store.replace(seedData()), /未能保存/); assert.deepEqual(store.data, personal); assert.deepEqual(JSON.parse(storage.value), personal);
});
test('自建四个孔雀鱼个体，独立形象和名字随备份保留', () => {
  const data = taskData(); data.animals.push({ id: 'guppy', containerId: 'tank', species: '孔雀鱼 · 黄金玻璃猫', templateId: 'guppy-gold', icon: 'fish', countType: 'exact', countValue: '4' });
  const animal = data.animals[0]; animal.members = membersFor(animal); animal.members[0].name = '桃桃'; animal.members[1].templateId = 'tetra-yellow';
  const restored = validateData(data); assert.equal(restored.animals[0].members.length, 4); assert.equal(restored.animals[0].members[0].name, '桃桃'); assert.equal(restored.animals[0].members[1].templateId, 'tetra-yellow');
});
test('新增形象可选择且旧物种兼容，未知输入不插入 SVG', () => {
  for (const id of ['crucian', 'shrimp', 'guppy-gold', 'goby']) assert.ok(PET_TEMPLATES.some(p => p.id === id));
  assert.equal(inferPetTemplate('黄金玻璃猫孔雀鱼'), 'guppy-gold'); assert.equal(inferPetTemplate('黑壳虾'), 'shrimp');
  assert.equal(petIcon('<script>alert(1)</script>').includes('<script>'), false);
  assert.equal(HABITATS.length, 4); assert.equal(habitatArt('meadow').includes('habitat-resident'), false);
  assert.equal((habitatArt('lake', '', [{ templateId: 'guppy-gold', countType: 'exact', countValue: '4' }]).match(/class="habitat-resident"/g) || []).length, 4);
  assert.equal(habitatArt('<script>', '<img>', [{ species: '<svg onload=alert(1)>' }]).includes('onload='), false);
});
test('到时出现待办，实际维护后转为下一次提醒，未来记录不提前完成', () => {
  const data = taskData(), rule = data.settings.reminders[0];
  assert.equal(taskState(data, rule, new Date('2026-10-15T07:59:00')).state, 'upcoming');
  assert.equal(taskState(data, rule, new Date('2026-10-15T08:00:00')).state, 'due');
  data.records.push(care('future', '2026-10-15T10:00:00+08:00'));
  assert.equal(taskState(data, rule, new Date('2026-10-15T09:00:00')).state, 'due');
  data.records.push(care('done', '2026-10-15T08:10:00+08:00'));
  const state = taskState(data, rule, new Date('2026-10-15T09:00:00'));
  assert.equal(state.state, 'upcoming'); assert.equal(state.nextDue.getDate(), 16); assert.equal(state.nextDue.getHours(), 8);
});
test('从任务提前完成可记录本次；其他缸和任务不误完成，同类提醒共享实际记录', () => {
  const data = taskData(), rule = data.settings.reminders[0];
  data.records.push(care('other-tank', '2026-10-15T08:10:00+08:00', { containerId: 'other' }), care('other-type', '2026-10-15T08:10:00+08:00', { type: 'topup' }), care('other-task', '2026-10-15T08:10:00+08:00', { reminderId: 'other-task', type: 'water' }));
  assert.equal(taskState(data, rule, new Date('2026-10-15T09:00:00')).state, 'due');
  data.records.push(care('early', '2026-10-15T07:00:00+08:00', { reminderId: rule.id }));
  assert.equal(taskState(data, rule, new Date('2026-10-15T07:30:00')).nextDue.getDate(), 16);
  data.records.pop(); assert.equal(taskState(data, rule, new Date('2026-10-15T09:00:00')).state, 'due');
});
test('跨午夜未完成任务仍到期，完成后从实际日期重新计算间隔', () => {
  const data = taskData(), rule = data.settings.reminders[0]; rule.days = 3;
  assert.equal(taskState(data, rule, new Date('2026-10-16T07:00:00')).state, 'due');
  data.records.push(care('late', '2026-10-16T07:00:00+08:00'));
  const state = taskState(data, rule, new Date('2026-10-16T07:30:00')); assert.equal(state.nextDue.getDate(), 19); assert.equal(state.nextDue.getHours(), 8);
});
test('夏令时前后按本地日历重复，保持每天同一时刻', () => {
  process.env.TZ = 'America/New_York';
  try {
    const data = taskData(), rule = data.settings.reminders[0]; rule.startDate = '2026-03-07';
    data.records.push(care('done', '2026-03-07T08:05:00-05:00'));
    const next = taskState(data, rule, new Date('2026-03-07T09:00:00-05:00')).nextDue;
    assert.equal(next.getDate(), 8); assert.equal(next.getHours(), 8); assert.equal(next.getTimezoneOffset(), 240);
  } finally { process.env.TZ = 'Asia/Shanghai'; }
});
test('暂停及原因随 JSON 保存，恢复后保留原因而不积压旧待办', () => {
  const data = taskData(); pauseTask(data, 'feed-task', '生病期间控制饮食', new Date('2026-10-15T10:00:00+08:00'));
  const restored = validateData(JSON.parse(JSON.stringify(data))); assert.equal(taskStates(restored)[0].state, 'paused');
  resumeTask(restored, 'feed-task', new Date('2026-10-20T07:00:00+08:00'));
  assert.equal(restored.settings.reminders[0].pauseReason, '生病期间控制饮食');
  assert.equal(taskStates(restored, new Date('2026-10-20T07:00:00+08:00'))[0].nextDue.getDate(), 20);
});
test('日历仅导出运行中的任务，含稳定 UID、循环和显示提醒', () => {
  const data = taskData(); data.settings.reminders.push({ ...data.settings.reminders[0], id: 'paused-water', type: 'water', status: 'paused' });
  const text = tasksCalendar(data, TYPES, new Date('2026-10-15T07:00:00+08:00'));
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 1); assert.match(text, /UID:task-feed-task@little-aqua-diary/);
  assert.match(text, /DTSTART:20261015T080000/); assert.match(text, /RRULE:FREQ=DAILY;INTERVAL=1/); assert.match(text, /ACTION:DISPLAY\r\nTRIGGER:PT0S/); assert.ok(text.endsWith('END:VCALENDAR\r\n'));
  assert.equal(text.includes('paused-water'), false); assert.match(tasksCalendar(data, TYPES), /UID:task-feed-task@little-aqua-diary/);
  data.settings.reminders[0].status = 'paused'; assert.throws(() => tasksCalendar(data, TYPES), /没有正在运行/);
});
test('日历文本转义及 UTF-8 折行阻止换行注入，不截断中文', () => {
  const data = taskData(); data.containers[0].name = '小缸,白天;夜间\\水域\nEND:VEVENT'; data.settings.reminders[0].title = '照顾'.repeat(40);
  const text = tasksCalendar(data, TYPES); const lines = text.split('\r\n');
  assert.ok(lines.every(line => Buffer.byteLength(line, 'utf8') <= 75));
  const unfolded = text.replace(/\r\n /g, ''); assert.ok(unfolded.includes('小缸\\,白天\\;夜间\\\\水域\\nEND:VEVENT'));
  assert.ok(unfolded.includes('照顾'.repeat(40))); assert.equal((text.match(/\r\nEND:VEVENT\r\n/g) || []).length, 1);
});
test('无效提醒时间、日期、频率及暂停原因拒绝保存，旧规则继续兼容', () => {
  for (const change of [r => { r.time = '24:00'; }, r => { r.time = ['08:00']; }, r => { r.startDate = '2026-02-31'; }, r => { r.days = 0; }, r => { r.days = 1.5; }, r => { r.status = 'unknown'; }, r => { r.pauseReason = 'x'.repeat(1001); }]) {
    const data = taskData(); change(data.settings.reminders[0]); assert.throws(() => validateData(data), /备份格式无效/);
  }
  const old = taskData(); old.settings.reminders = [{ id: 'old', type: 'water', containerId: 'tank', days: 7 }]; assert.doesNotThrow(() => validateData(old));
});
