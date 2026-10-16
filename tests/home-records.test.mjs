// # 回归首页记录数量和完整列表，避免编辑后记录被静默截断。
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData } from '../dist/js/data.js';
import { homePage } from '../dist/js/ui.js';

function fixture(count) {
  const data = seedData(), now = new Date();
  data.containers.push({ id: 'demo-tank', name: '演示缸', type: 'tank', art: 'lake' });
  data.records = Array.from({ length: count }, (_, i) => {
    const timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 40, i, 123).toISOString();
    return { id: `record-${i}`, containerId: 'demo-tank', type: 'observe', timestamp, createdAt: timestamp, updatedAt: timestamp, details: { text: `演示观察 ${i}` }, notes: '' };
  });
  return data;
}
const visibleIds = html => [...html.matchAll(/<article class="record-row" data-record="([^"]+)"/g)].map(match => match[1]);

test('今天七条记录全部显示，数量和按时间倒序的列表一致', () => {
  const data = fixture(7), html = homePage(data);
  assert.match(html, /今天 <span class="count-tag">7<\/span>/);
  assert.deepEqual(visibleIds(html), data.records.map(r => r.id).toReversed());
});

test('超过六条仍完整显示，当日之外的记录不计入今天且渲染不改原资料', () => {
  const data = fixture(16), earlier = structuredClone(data.records[0]), date = new Date(earlier.timestamp);
  date.setDate(date.getDate() - 1); earlier.id = 'yesterday'; earlier.timestamp = date.toISOString(); data.records.push(earlier);
  const before = structuredClone(data), html = homePage(data);
  assert.equal(visibleIds(html).length, 16); assert.equal(visibleIds(html).includes('yesterday'), false);
  assert.match(html, /今天 <span class="count-tag">16<\/span>/); assert.deepEqual(data, before);
});

test('把首条记录改为当天较早时间后仍可在列表底部找到', () => {
  const data = fixture(7), edited = data.records.at(-1), time = new Date(edited.timestamp);
  time.setHours(7, 0, 0, 0); edited.timestamp = time.toISOString(); edited.details.text = '已修改的演示观察';
  const html = homePage(data), ids = visibleIds(html);
  assert.equal(ids.length, 7); assert.equal(ids.at(-1), edited.id); assert.ok(html.includes('已修改的演示观察'));
});
