// # 缸排序必须兼容旧备份、保留资料，并与现有本地事务的失败回滚规则一致。
import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData,validateData,orderedContainers,moveContainer,DiaryStore,STORAGE_KEY} from '../dist/js/data.js';
function fixture() {
  const data=seedData();data.containers=['a','b','c'].map(id=>({id,name:`缸${id}`,type:'tank'}));
  data.animals=[{id:'fish',containerId:'a',species:'孔雀鱼',countType:'exact',countValue:'1',members:[{id:'member',name:'小金',avatarId:'avatar',avatarSourceId:'source',avatarCrop:{x:.5,y:.5,zoom:1,rotation:0}}]}];
  const timestamp='2026-10-21T08:00:00+08:00';data.records=[{id:'record',containerId:'a',type:'feed',timestamp,createdAt:timestamp,updatedAt:timestamp,details:{},notes:''}];
  data.settings.reminders=[{id:'reminder',containerId:'a',type:'feed',days:1,status:'paused',pauseReason:'暂缓喂食'}];return data;
}
const ids=data=>orderedContainers(data).map(container=>container.id);
test('旧备份未设置缸排序时沿用创建顺序，不修改原数据',()=>{
  const data=validateData(fixture()),before=JSON.stringify(data);assert.deepEqual(ids(data),['a','b','c']);assert.equal(JSON.stringify(data),before);
  assert.equal(moveContainer(data,'a',-1),false);assert.equal(moveContainer(data,'c',1),false);assert.equal(JSON.stringify(data),before);
  assert.throws(()=>moveContainer(data,'a',0),/方向/);assert.throws(()=>moveContainer(data,'missing',1),/移除/);
});
test('移动后备份恢复保留顺序，容器原数组、记录、居民、提醒及头像引用不变',()=>{
  const data=fixture(),before=structuredClone(data);assert.equal(moveContainer(data,'b',-1),true);assert.deepEqual(ids(data),['b','a','c']);
  assert.equal(moveContainer(data,'b',1),true);assert.deepEqual(ids(data),['a','b','c']);moveContainer(data,'c',-1);
  const restored=validateData(JSON.parse(JSON.stringify(data)));assert.deepEqual(ids(restored),['a','c','b']);
  for(const key of ['containers','records','animals'])assert.deepEqual(restored[key],before[key]);
  assert.deepEqual(restored.settings.reminders,before.settings.reminders);assert.deepEqual(restored.settings.containerOrder,['a','c','b']);
});
test('删除后的旧排序ID安全忽略，新建缸追加到末尾，重命名不改变位置',()=>{
  const data=fixture();data.settings.containerOrder=['removed','c','a'];data.containers.push({id:'d',name:'新增缸',type:'bucket'});
  assert.deepEqual(ids(validateData(data)),['c','a','b','d']);data.containers[2].name='改名后的缸';assert.deepEqual(ids(data),['c','a','b','d']);
  moveContainer(data,'d',-1);assert.deepEqual(ids(data),['c','a','d','b']);assert.deepEqual(data.settings.containerOrder,['c','a','d','b']);
});
test('缸排序校验拒绝重复ID、非数组、空ID及无效内容',()=>{
  for(const order of [null,{},['a','a'],[''],['a',42],['x'.repeat(151)]]){const data=fixture();data.settings.containerOrder=order;assert.throws(()=>validateData(data),/缸排序/);}
  for(const order of [[],['already-deleted'],['c','a','b']]){const data=fixture();data.settings.containerOrder=order;assert.doesNotThrow(()=>validateData(data));}
});
test('并行窗口基于最新顺序移动，存储失败保留上次已保存顺序',()=>{
  const values=new Map([[STORAGE_KEY,JSON.stringify(fixture())]]);let fail=false;
  const storage={getItem:key=>values.get(key)??null,setItem(key,value){if(fail)throw Error('quota');values.set(key,value);}};
  const one=new DiaryStore(storage),two=new DiaryStore(storage);two.commit(data=>moveContainer(data,'c',-1));one.commit(data=>moveContainer(data,'a',1));
  assert.deepEqual(ids(one.data),['c','a','b']);const saved=values.get(STORAGE_KEY),snapshot=JSON.stringify(one.data);fail=true;
  assert.throws(()=>one.commit(data=>moveContainer(data,'a',1)),/未能保存/);assert.equal(values.get(STORAGE_KEY),saved);assert.equal(JSON.stringify(one.data),snapshot);
});
