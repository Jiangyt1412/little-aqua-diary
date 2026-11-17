// # 所有记录显式选择发生时间，补记跨日与原样编辑保留排序精度。
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData, TYPES } from '../dist/js/data.js';
import { recordForm, recordTimestamp, collectRecord } from '../dist/js/forms.js';
import { localDateTime } from '../dist/js/logic.js';
process.env.TZ = 'Asia/Shanghai';

test('每类新记录都直接显示完整发生时间，默认当前时间且不藏入折叠区', () => {
  const data = seedData();
  data.containers = [{ id: 'tank', name: '演示缸', type: 'tank' }];
  for (const type of Object.keys(TYPES)) {
    const before = Date.now(), html = recordForm(data, 'tank', type), after = Date.now();
    const initial = html.match(/data-initial-timestamp="([^"]+)"/)[1];
    assert.ok(Date.parse(initial) >= before && Date.parse(initial) <= after, type);
    assert.match(html, /<span>发生时间<\/span><input name="timestamp" value="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}" type="datetime-local" required/);
    assert.equal(html.match(/name="timestamp"/g).length, 1);
    assert.doesNotMatch(html.slice(0, html.indexOf('name="timestamp"')), /<details/);
    assert.equal(recordTimestamp(localDateTime(initial), initial), initial);
  }
});

test('编辑时未改分钟保留秒和毫秒，改变时间和跨日按新选择保存', () => {
  const original = '2026-11-17T00:12:56.789+08:00';
  assert.equal(recordTimestamp('2026-11-17T00:12', original), original);
  assert.equal(recordTimestamp('2026-11-17T00:13', original), '2026-11-16T16:13:00.000Z');
  assert.equal(recordTimestamp('2026-11-16T23:50', original), '2026-11-16T15:50:00.000Z');
  assert.equal(recordTimestamp('2026-11-18T01:02', original), '2026-11-17T17:02:00.000Z');
  for (const value of ['', ' ', null, undefined, 'invalid']) assert.throws(() => recordTimestamp(value, original), /有效时间/);
});

test('记录收集使用明确的发生时间，保留照片、备注和无关旧字段', t => {
  // # 无浏览器的单元测试只替换 FormData 读取适配器；验证保存逻辑不丢原记录数据。
  t.mock.method(globalThis, 'FormData', function (form) { return new Map(Object.entries(form.entries)); });
  const initial = '2026-11-17T08:12:56.789Z';
  const form = { dataset: { initialTimestamp: initial }, entries: { type: 'observe', timestamp: localDateTime(initial), containerId: 'tank', text: '新的观察', notes: '保留备注' } };
  const original = { type: 'observe', timestamp: initial, details: { text: '旧观察', legacy: '保留旧字段' } };
  const saved = collectRecord(form, original, ['photo-1']);
  assert.equal(saved.timestamp, initial);
  assert.deepEqual(saved.details, { text: '新的观察', legacy: '保留旧字段' });
  assert.deepEqual(saved.photoIds, ['photo-1']);
  assert.equal(saved.notes, '保留备注');
  form.entries.timestamp = '2026-11-15T09:20';
  assert.equal(collectRecord(form, original).timestamp, '2026-11-15T01:20:00.000Z');
  form.entries.type = 'feed';
  form.entries.timestamp = localDateTime(initial);
  assert.equal(collectRecord(form).timestamp, initial);
});
