// # 用多只乌龟、补记和历史关联验证曲线不混合个体、不补齐空值。
import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData,membersFor,validateData} from '../dist/js/data.js';
import {isTurtle,growthRecords,growthPanel,growthTargetFields,validateGrowthRecord} from '../dist/js/growth.js';
import {recordForm} from '../dist/js/forms.js';
process.env.TZ='Asia/Shanghai';
function fixture(){const d=seedData();d.containers=[{id:'tank',name:'演示龟缸',type:'tank'},{id:'pond',name:'新龟缸',type:'tank'}];d.animals=[{id:'turtle',species:'小青龟',containerId:'tank',countType:'exact',countValue:'2',templateId:'turtle'}];d.animals[0].members=membersFor(d.animals[0]);d.animals[0].members[0].name='演示小青';return d;}
function measurement(id,day,fields={},member='turtle_member_1'){const timestamp=`2026-11-${day}T08:00:00+08:00`;return{id,type:'growth',containerId:'tank',timestamp,createdAt:timestamp,updatedAt:timestamp,details:{animalId:'turtle',memberId:member,species:'小青龟',residentName:'演示小青',...fields},notes:''};}
const now=new Date('2026-11-13T12:00:00+08:00');
test('体重、背甲长度独立存储，补记排序按实际日期且不混合个体',()=>{
 const data=fixture();data.records=[measurement('later','12',{weightGrams:65}),measurement('other','10',{weightGrams:180},'turtle_member_2'),measurement('earlier','01',{weightGrams:60,lengthCm:4.3}),measurement('length','07',{lengthCm:4.5})];
 for(const record of data.records)validateGrowthRecord(data,record,now);
 assert.deepEqual(growthRecords(data,'turtle','turtle_member_1').map(r=>r.id),['earlier','length','later']);
 const restored=validateData(JSON.parse(JSON.stringify(data)));
 assert.deepEqual(restored,data);assert.equal(restored.records[0].details.lengthCm,undefined);
 const html=growthPanel(data,'turtle','turtle_member_1');assert.match(html,/体重曲线，2次测量/);assert.match(html,/背甲长度曲线，2次测量/);assert.doesNotMatch(html,/180/);
 data.records=data.records.filter(r=>r.id!=='earlier');assert.match(growthPanel(data,'turtle','turtle_member_1'),/再记录一次/);
});
test('拒绝空值、负数、非数值和未来测量，导入不会把空项目转成零',()=>{
 const data=fixture();for(const fields of[{}, {weightGrams:0},{weightGrams:-1},{weightGrams:'20'},{weightGrams:Infinity},{weightGrams:10,lengthCm:NaN}]){
  const r=measurement('bad','01',fields);assert.throws(()=>validateGrowthRecord(data,r,now));assert.throws(()=>validateData({...data,records:[r]}));
 }
 assert.throws(()=>validateGrowthRecord(data,measurement('future','20',{weightGrams:60}),now),/已经发生/);
 const one=measurement('one','01',{lengthCm:4.2});validateGrowthRecord(data,one,now);assert.doesNotThrow(()=>validateData({...data,records:[one]}));
});
test('转缸与删除后可更正历史，不能把新记录存给不存在或错误缸的个体',()=>{
 const data=fixture(),record=measurement('old','01',{weightGrams:60});data.records=[record];data.animals[0].containerId='pond';
 assert.doesNotThrow(()=>validateGrowthRecord(data,{...record,details:{...record.details,weightGrams:61}},now));
 assert.throws(()=>validateGrowthRecord(data,{...record,id:'new'},now),/不一致/);
 data.animals=[];assert.doesNotThrow(()=>validateData(data));assert.doesNotThrow(()=>validateGrowthRecord(data,record,now));
 assert.match(growthTargetFields(data,'tank',record),/原关联/);
});
test('死亡前可补记，死亡后测量被拒绝',()=>{
 const data=fixture();data.records=[{...measurement('death','10'),type:'death',details:{animalId:'turtle',memberId:'turtle_member_1',species:'小青龟',quantity:1,cause:'原因不明'}}];
 assert.doesNotThrow(()=>validateGrowthRecord(data,measurement('before','09',{weightGrams:60}),now));assert.throws(()=>validateGrowthRecord(data,measurement('after','11',{weightGrams:60}),now),/晚于/);
});
test('只有乌龟进入测量选择；表单固定单位、明确个体，空图不会假造曲线',()=>{
 const data=fixture();data.animals.push({id:'fish',species:'孔雀鱼',containerId:'tank',countType:'exact',countValue:'1'});
 assert.equal(isTurtle(data.animals[0]),true);assert.equal(isTurtle(data.animals[1]),false);
 const form=recordForm(data,'tank','growth');assert.match(form,/name="growthTarget" required/);assert.match(form,/体重 · g/);assert.match(form,/背甲直线长度 · cm/);assert.doesNotMatch(growthTargetFields(data,'tank'),/孔雀鱼/);
 const empty=growthPanel(data,'turtle','turtle_member_1');assert.doesNotMatch(empty,/<svg/);assert.match(empty,/记录第一次测量/);
});
