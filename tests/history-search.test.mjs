// # 搜索跨日期、组合条件与居民资料；结果总数和可见内容保持一致。
import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/js/data.js';
import {filterRecords,recordSummary} from '../dist/js/logic.js';
import {historyResults,historyPage} from '../dist/js/ui.js';
const filters=()=>({search:'',container:'',type:'',from:'',to:''});
function fixture(){
  const data=seedData(); data.containers=[{id:'a',name:'小龟缸',type:'tank'},{id:'b',name:'孔雀鱼缸',type:'tank'}];
  data.animals=[{id:'turtle',species:'小青龟',members:[{id:'one',name:'团团'}]}];
  data.records=[['first','a','2026-10-01T08:00:00+08:00','观察水色'],['last','a','2026-11-09T09:30:00+08:00','水色清澈'],['other','b','2026-11-09T09:35:00+08:00','水色较黄']].map(([id,containerId,timestamp,text])=>({id,containerId,timestamp,createdAt:timestamp,type:'observe',details:{text},notes:''}));
  return data;
}
const ids=html=>[...html.matchAll(/<article class="record-row" data-record="([^"]+)"/g)].map(m=>m[1]);
test('搜索匹配跨日记录，多个关键词可分别命中缸名与观察正文',()=>{
  const data=fixture(),f={...filters(),search:'小龟 水色'},view={filters:f,historyLimit:100,historyDay:'2026-11-09'};
  assert.deepEqual(filterRecords(data,f).map(r=>r.id),['last','first']);
  const html=historyResults(data,view);assert.deepEqual(ids(html),['last','first']);assert.match(html,/2 条 · 筛选结果/);assert.match(html,/2026 \/ 10 \/ 01/);assert.doesNotMatch(html,/data-history-day/);
});
test('日期与类型筛选共同生效，空结果和非法日期分别提示',()=>{
  const data=fixture(),view={filters:{...filters(),from:'2026-11-01',to:'2026-11-30',container:'a'},historyLimit:100};
  assert.deepEqual(ids(historyResults(data,view)),['last']);view.filters.type='water';assert.match(historyResults(data,view),/没有找到匹配记录/);
  view.filters.from='2026-12-01';assert.match(historyResults(data,view),/开始日期不能晚于结束日期/);
});
test('搜索名字和完整日期，全角输入兼容，不匹配隐藏 JSON 字段名称',()=>{
  const data=fixture();data.records[0].details.animalId='turtle';data.records[0].details.memberId='one';data.records[0].notes='pH 7.2';
  assert.equal(filterRecords(data,{search:'团团'}).length,1);assert.equal(filterRecords(data,{search:'ｐＨ ７．２'}).length,1);assert.equal(filterRecords(data,{search:'2026-10-01'}).length,1);assert.equal(filterRecords(data,{search:'animalId'}).length,0);
});
test('未筛选保留单日按缸时间轴，搜索结果分页不误改总数',()=>{
  const data=fixture(),view={filters:filters(),historyLimit:100,historyDay:'2026-11-09'};
  const page=historyPage(data,view);assert.match(page,/id="history-output"/);assert.match(page,/history-timeline-viewport/);
  view.filters.search='水色';view.historyLimit=1;const html=historyResults(data,view);assert.deepEqual(ids(html),['other']);assert.match(html,/3 条 · 筛选结果/);assert.match(html,/再显示 2 条/);
});
test('成长记录可读摘要包含个体与两项测量值',()=>{
  assert.equal(recordSummary({type:'growth',details:{residentName:'团团',weightGrams:125.5,lengthCm:8.2}}),'团团 · 125.5 g · 背甲长 8.2 cm');
});
