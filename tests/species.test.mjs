// # 汇总与排序不能改动原居民、数量联动或照片引用；未知数量不推算总数。
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData, validateData } from '../dist/js/data.js';
import { speciesGroups, speciesCount, saveResidentOrder } from '../dist/js/species.js';
import { clearDiaryRecords } from '../dist/js/inventory.js';
import { referencedPhotos } from '../dist/js/media.js';
function fixture() {
  const data=seedData(); data.containers=[{id:'one',name:'缸一',type:'tank'},{id:'two',name:'缸二',type:'tank'}];
  data.animals=[
    {id:'t',containerId:'one',species:'小青龟',templateId:'turtle',countType:'exact',countValue:'1'},
    {id:'p',containerId:'one',species:'天使鱼',templateId:'tetra-purple',countType:'exact',countValue:'1',members:[{id:'m',name:'紫米',avatarId:'avatar',avatarSourceId:'source',avatarCrop:{x:.5,y:.5,zoom:1,rotation:0}}]},
    {id:'r',containerId:'one',species:'天使鱼',templateId:'tetra-red',countType:'exact',countValue:'1',members:[{id:'m',name:'红豆'}]},
    {id:'other',containerId:'two',species:'天使鱼',templateId:'tetra-red',countType:'exact',countValue:'3'}
  ]; return data;
}
test('同缸同物种汇总数量并排颜色，不改原名单或跨缸合并',()=>{
  const data=fixture(),before=structuredClone(data),groups=speciesGroups(data,'one'),fish=groups[1];
  assert.equal(groups.length,2);assert.equal(fish.count,'×2');assert.deepEqual(fish.variants,['tetra-red','tetra-purple']);
  assert.deepEqual(fish.members.map(item=>item.member.name),['红豆','紫米']);assert.notEqual(fish.members[0].key,fish.members[1].key);
  assert.equal(speciesGroups(data,'two')[0].count,'×3');assert.deepEqual(data,before);
});
test('同图不同物种不混合，内置颜色只合并展示且不改原名称',()=>{
  const data=fixture();data.animals[1].species='彩色鱼 · 紫';data.animals[2].species='彩色鱼 · 红';
  assert.equal(speciesGroups(data,'one')[1].name,'彩色鱼');assert.equal(data.animals[1].species,'彩色鱼 · 紫');
  data.animals[2].species='另一种鱼';assert.equal(speciesGroups(data,'one').length,3);
  data.animals[2].species='__proto__';assert.doesNotThrow(()=>speciesGroups(data,'one'));
});
test('汇总保留约数与区间，未知或文字数量不显示虚构总数',()=>{
  const a=(countType,countValue,extra={})=>({countType,countValue,...extra});
  assert.equal(speciesCount([a('exact','1'),a('exact','2')]),'×3');
  assert.equal(speciesCount([a('exact','1'),a('estimated','2')]),'约 ×3');
  assert.equal(speciesCount([a('exact','1'),a('range','',{countMin:2,countMax:5})]),'×3–6');
  for(const type of ['unknown','text'])assert.equal(speciesCount([a('exact','2'),a(type,'待统计')]),'待统计');
  assert.equal(speciesCount([a('exact','9007199254740991'),a('exact','2')]),'待核对');
});
test('颜色与个体排序互相对应，JSON 恢复后保留原名字和头像副本',()=>{
  const data=fixture(),before=structuredClone(data.animals);
  saveResidentOrder(data,{kind:'variants',containerId:'one',species:'天使鱼',order:['tetra-purple','tetra-red']});
  let fish=speciesGroups(data,'one')[1];assert.deepEqual(fish.variants,['tetra-purple','tetra-red']);assert.equal(fish.members[0].member.name,'紫米');
  saveResidentOrder(data,{kind:'members',containerId:'one',species:'天使鱼',order:fish.members.map(item=>item.key).reverse()});
  fish=speciesGroups(validateData(JSON.parse(JSON.stringify(data))),'one')[1];assert.deepEqual(fish.variants,['tetra-red','tetra-purple']);
  assert.deepEqual(data.animals,before);assert.deepEqual(referencedPhotos(data),['avatar','source']);
});
test('物种排序只影响指定缸，新加居民、删除与陈旧排序均兼容',()=>{
  const data=fixture(),other=structuredClone(data.animals[3]);
  saveResidentOrder(data,{kind:'species',containerId:'one',order:['天使鱼','小青龟']});
  assert.deepEqual(speciesGroups(data,'one').map(group=>group.name),['天使鱼','小青龟']);
  data.animals.push({id:'new',containerId:'one',species:'新居民',countType:'exact',countValue:'1'});
  assert.deepEqual(speciesGroups(data,'one').map(group=>group.name),['天使鱼','小青龟','新居民']);
  data.containers=data.containers.filter(c=>c.id!=='one');data.animals=data.animals.filter(a=>a.containerId!=='one');
  assert.doesNotThrow(()=>validateData(data));assert.deepEqual(data.animals,[other]);
});
test('排序校验拒绝重复和无效项目，旧备份没有排序仍能恢复',()=>{
  assert.doesNotThrow(()=>validateData(fixture()));
  const entry={containerId:'one',species:'天使鱼',variants:['tetra-red','tetra-purple']};
  for(const order of [[entry,entry],[{...entry,variants:['red','red']}],[{...entry,variants:['bad/path']}],[{...entry,members:[42]}]]) {
    const data=fixture();data.settings.residentOrder=order;assert.throws(()=>validateData(data),/排序/);
  }
  assert.throws(()=>saveResidentOrder(fixture(),{kind:'species',containerId:'one',order:['a','a']}),/排序/);
});
test('清空维护记录保留名单、头像、名称、暂停原因和排序，仅移除记录照片引用',()=>{
  const data=fixture();data.settings.diaryName='保留的名字';data.settings.reminders=[{id:'rule',containerId:'one',type:'feed',days:1,status:'paused',pauseReason:'控制饮食'}];
  saveResidentOrder(data,{kind:'species',containerId:'one',order:['天使鱼','小青龟']});
  data.records=[{id:'observation',photoIds:['observation']}];const animals=structuredClone(data.animals),settings=structuredClone(data.settings);
  clearDiaryRecords(data);assert.deepEqual(data.animals,animals);assert.deepEqual(data.settings,settings);assert.deepEqual(data.records,[]);
  assert.deepEqual(referencedPhotos(data),['avatar','source']);
});
