// # 回归提前维护、记录更正、居民死亡和照片保留。
import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData,membersFor,validateData} from '../dist/js/data.js';
import {taskState,pauseTask,resumeTask,tasksCalendar} from '../dist/js/tasks.js';
import {livingAnimal,residentDeath,validateResidentDeath} from '../dist/js/mortality.js';
import {clearDiaryRecords} from '../dist/js/inventory.js';
import {referencedPhotos} from '../dist/js/media.js';
import {speciesGroups} from '../dist/js/species.js';
process.env.TZ='Asia/Shanghai';
const entry=(id,type,date,details={})=>({id,type,containerId:'tank',timestamp:date,createdAt:date,updatedAt:date,details,notes:''});
function fixture(){const d=seedData();d.containers=[{id:'tank',name:'演示缸',type:'tank'}];d.animals=[{id:'fish',species:'孔雀鱼',containerId:'tank',countType:'exact',countValue:'2',templateId:'guppy-gold'}];d.animals[0].members=membersFor(d.animals[0]);d.animals[0].members[0].avatarId='photo_demo';d.settings.reminders=[{id:'water',containerId:'tank',type:'water',days:3,startDate:'2026-10-27',time:'08:00'}];return d;}
test('26日提前换水改29日，补记旧记录不覆盖最新维护，编辑删除均重算',()=>{
 const d=fixture(),rule=d.settings.reminders[0],now=new Date('2026-10-28T12:00:00');
 const day=()=>taskState(d,rule,now).nextDue.getDate();assert.equal(day(),27);
 d.records.push(entry('water','water','2026-10-26T20:00:00+08:00'));assert.equal(day(),29);
 d.records.push(entry('old','water','2026-10-24T20:00:00+08:00'));assert.equal(day(),29);
 d.records[0].timestamp='2026-10-28T10:00:00+08:00';assert.equal(day(),31);
 d.records.shift();assert.equal(day(),27);d.records=[];assert.equal(day(),27);
 assert.equal(taskState(d,rule,new Date('2026-11-15T10:00:00')).nextDue.getMonth(),9);
});
test('同缸同动作共享完成记录，未来、其他缸、其他动作不影响日期',()=>{
 const d=fixture(),rule=d.settings.reminders[0],now=new Date('2026-10-28T12:00:00');
 d.records=[{...entry('done','water','2026-10-26T10:00:00+08:00'),reminderId:'another'},entry('future','water','2026-10-30T10:00:00+08:00'),entry('feed','feed','2026-10-28T10:00:00+08:00'),{...entry('other','water','2026-10-28T10:00:00+08:00'),containerId:'other'}];
 const state=taskState(d,rule,now);assert.equal(state.nextDue.getDate(),29);assert.equal(state.nextDue.getHours(),8);
 assert.match(tasksCalendar(d,{},now),/DTSTART:20261029T080000/);
});
test('暂停不被记录解除，恢复前操作不抵消新计划',()=>{
 const d=fixture(),rule=d.settings.reminders[0];d.records=[entry('done','water','2026-10-26T10:00:00+08:00')];
 pauseTask(d,'water','观察',new Date('2026-10-26T11:00:00'),'2026-10-29');assert.equal(taskState(d,rule,new Date('2026-10-28T12:00:00')).state,'paused');
 assert.equal(taskState(d,rule,new Date('2026-10-29T09:00:00')).nextDue.getDate(),29);
 resumeTask(d,'water',new Date('2026-10-28T07:00:00'));assert.equal(taskState(d,rule,new Date('2026-10-28T09:00:00')).nextDue.getDate(),28);
});
test('个体死亡可撤销，原始名单、头像和完整备份不丢失',()=>{
 const d=fixture(),a=d.animals[0],before=structuredClone(a),memberId=a.members[0].id;
 const r=entry('death','death','2026-10-26T10:00:00+08:00',{animalId:a.id,memberId,species:a.species,quantity:1,cause:'原因不明'});
 validateResidentDeath(d,r);d.records.push(r);assert.deepEqual(a,before);assert.equal(livingAnimal(d,a).countValue,'1');assert.equal(speciesGroups(d,'tank')[0].count,'×1');assert.equal(residentDeath(d,a.id,memberId).details.cause,'原因不明');
 const restored=validateData(JSON.parse(JSON.stringify(d)));assert.deepEqual(referencedPhotos(restored),['photo_demo']);assert.equal(livingAnimal(restored,restored.animals[0]).countValue,'1');
 assert.throws(()=>validateResidentDeath(d,{...r,id:'duplicate'}),/已经登记/);
 a.containerId='moved';assert.equal(livingAnimal(d,a).countValue,'1');a.containerId='tank';
 clearDiaryRecords(d);assert.equal(d.records.length,1);assert.equal(livingAnimal(d,a).countValue,'1');d.records=[];assert.equal(livingAnimal(d,a).countValue,'2');
});
test('未知总数不伪造余额，旧死亡记录不猜关联，超过存活数被拒绝',()=>{
 const d=fixture(),a=d.animals[0];d.records=[entry('legacy','death','2026-10-26T10:00:00+08:00',{species:a.species,quantity:1})];assert.equal(livingAnimal(d,a).countValue,'2');
 const r=entry('group','death','2026-10-26T10:00:00+08:00',{animalId:a.id,species:a.species,quantity:3});assert.throws(()=>validateResidentDeath(d,r),/超过/);
 a.countType='unknown';a.countValue='待统计';validateResidentDeath(d,r);d.records.push(r);assert.equal(livingAnimal(d,a).countValue,'待统计');assert.equal(livingAnimal(d,a).countType,'unknown');
});
