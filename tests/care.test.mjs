// # 四类维护统计、定时暂停和旧名称兼容的行为边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData,validateData,checkedDiaryName,diaryNameLength,TYPES} from '../dist/js/data.js';
import {careMonth} from '../dist/js/logic.js';
import {pauseTask,pauseResumeDate,resumeTask,taskState,tasksCalendar} from '../dist/js/tasks.js';
import {PET_GROUPS} from '../dist/js/pets.js';
process.env.TZ='Asia/Shanghai'; // # 固定日期边界，页面使用设备本地时间。
function diary(){const d=seedData();d.containers=[{id:'tank',name:'演示缸',type:'tank'}];d.settings.reminders=[{id:'feed',containerId:'tank',type:'feed',days:3,time:'08:00',startDate:'2026-10-15',status:'active'}];return d;}
const record=(id,type,time,containerId='tank')=>({id,type,containerId,timestamp:time,createdAt:time,updatedAt:time,details:{},notes:''});
test('四类维护同月按本地日和指定缸计数，其他记录保留在当天详情',()=>{
 const d=diary();d.records=[record('f1','feed','2024-02-28T16:00:00Z'),record('f2','feed','2024-02-29T15:59:59Z'),record('s','siphon','2024-02-29T03:00:00Z'),record('t','topup','2024-02-29T04:00:00Z'),record('w','water','2024-02-29T05:00:00Z'),record('o','observe','2024-02-29T06:00:00Z'),record('other','water','2024-02-29T05:00:00Z','other'),record('next','water','2024-02-29T16:00:00Z')];
 const month=careMonth(d,'tank','2024-02');assert.equal(month.days.length,29);assert.deepEqual(month.counts,{feed:2,siphon:1,topup:1,water:1});assert.deepEqual(month.days[28].counts,month.counts);assert.equal(month.days[28].careCount,5);assert.equal(month.days[28].records.length,6);assert.equal(month.days[27].careCount,0);
});
test('指定恢复日自动恢复，以恢复日为新周期，不补暂停期间的待办',()=>{
 const d=diary(),now=new Date('2026-10-15T10:00:00+08:00');pauseTask(d,'feed','控制饮食',now,pauseResumeDate('3','',now));
 const restored=validateData(JSON.parse(JSON.stringify(d))),rule=restored.settings.reminders[0];assert.equal(rule.pauseUntil,'2026-10-18');
 assert.equal(taskState(restored,rule,new Date('2026-10-18T07:59:59')).state,'paused');
 let state=taskState(restored,rule,new Date('2026-10-18T08:00:00'));assert.equal(state.state,'due');assert.equal(state.autoResumed,true);assert.equal(state.nextDue.toISOString(),'2026-10-18T00:00:00.000Z');
 restored.records=[record('pause','feed','2026-10-17T09:00:00+08:00')];assert.equal(taskState(restored,rule,new Date('2026-10-18T09:00:00')).state,'due');
 restored.records.push(record('resumed','feed','2026-10-18T08:10:00+08:00'));state=taskState(restored,rule,new Date('2026-10-18T09:00:00'));assert.equal(state.nextDue.toISOString(),'2026-10-21T00:00:00.000Z');assert.equal(state.state,'upcoming');assert.equal(rule.pauseReason,'控制饮食');
});
test('调整恢复日与提前恢复均保留原因，手动暂停不自动恢复',()=>{
 const d=diary(),now=new Date('2026-10-15T10:00:00');pauseTask(d,'feed','出门',now,'2026-10-22');pauseTask(d,'feed','出门',now,'2026-10-18');assert.equal(d.settings.reminders[0].pauseUntil,'2026-10-18');
 resumeTask(d,'feed',new Date('2026-10-16T07:00:00'));const rule=d.settings.reminders[0];assert.equal(rule.pauseUntil,undefined);assert.equal(rule.pauseReason,'出门');assert.equal(taskState(d,rule,new Date('2026-10-16T07:00:00')).nextDue.getDate(),16);
 pauseTask(d,'feed','长期观察',now);assert.equal(taskState(d,rule,new Date('2027-10-15T10:00:00')).state,'paused');
 for(const value of ['2026-10-15','2026-02-31','2026-10-14',''])assert.throws(()=>pauseResumeDate('date',value,now),/恢复日期/);
 assert.throws(()=>pauseResumeDate('0','',now),/恢复日期/);assert.equal(pauseResumeDate('manual','',now),'');assert.equal(pauseResumeDate('1','',now),'2026-10-16');
 const invalid=diary();invalid.settings.reminders[0].pauseUntil='2026-02-31';assert.throws(()=>validateData(invalid),/恢复日期/);
});
test('定时暂停的日历从恢复日开始，无期限暂停不导出',()=>{
 const d=diary(),now=new Date('2026-10-15T10:00:00');pauseTask(d,'feed','外出',now,'2026-10-18');const text=tasksCalendar(d,TYPES,now);assert.match(text,/DTSTART:20261018T080000/);assert.match(text,/RRULE:FREQ=DAILY;INTERVAL=3/);assert.ok(!text.includes('20261015T080000'));
 pauseTask(d,'feed','外出',now);assert.throws(()=>tasksCalendar(d,TYPES,now),/没有正在运行/);
});
test('跨年和夏令时的暂停按日历天计算并保持原提醒时刻',()=>{
 assert.equal(pauseResumeDate('3','',new Date('2026-12-30T23:30:00')),'2027-01-02');process.env.TZ='America/New_York';
 try{const d=diary(),now=new Date('2026-03-07T10:00:00');pauseTask(d,'feed','出门',now,pauseResumeDate('1','',now));const rule=d.settings.reminders[0];assert.equal(rule.pauseUntil,'2026-03-08');assert.equal(taskState(d,rule,new Date('2026-03-08T07:59:00')).state,'paused');const state=taskState(d,rule,new Date('2026-03-08T08:00:00'));assert.equal(state.nextDue.getHours(),8);assert.equal(state.nextDue.getTimezoneOffset(),240);}finally{process.env.TZ='Asia/Shanghai';}
});
test('新名称上限20可见字，旧24字原样可读，组合Emoji不按UTF16拆开',()=>{
 assert.equal(checkedDiaryName(' 水族日记 '),'水族日记');assert.equal(checkedDiaryName('鱼'.repeat(20)).length,20);assert.throws(()=>checkedDiaryName('鱼'.repeat(21)),/20/);assert.throws(()=>checkedDiaryName(' '),/20/);assert.equal(diaryNameLength('🎣👨‍👩‍👧‍👦'),2);assert.doesNotThrow(()=>checkedDiaryName('🎣'.repeat(20)));
 const d=diary();d.settings.diaryName='鱼'.repeat(24);assert.equal(validateData(d).settings.diaryName,d.settings.diaryName);d.settings.diaryName='鱼'.repeat(25);assert.throws(()=>validateData(d),/名称/);
});
test('形象选择中五种颜色共享独立分组，鱼型不混入颜色组',()=>{
 const fish=PET_GROUPS.find(g=>g.id==='fish'),family=fish.families.find(f=>f.id==='tetra');assert.deepEqual(family.templates.map(p=>p.id),['tetra-red','tetra-purple','tetra-yellow','tetra-green','tetra-blue']);assert.ok(fish.families.filter(f=>f.id!=='tetra').every(f=>f.templates.length===1));assert.deepEqual(fish.families.flatMap(f=>f.templates).map(p=>p.id),fish.templates.map(p=>p.id));
});
