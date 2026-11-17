// # 测量属于明确的个体；曲线只连接真实测量值，不推算缺失值或健康结论。
import { membersFor } from './data.js';
import { escapeHTML as e, localDate, timeLabel } from './logic.js';
import { residentDeath } from './mortality.js';
export const isTurtle = animal => animal?.templateId === 'turtle' || animal?.icon === 'turtle' || /龟|turtle|tortoise/i.test(animal?.species || '');
export function growthRecords(data, animalId, memberId) {
  return data.records.filter(r => r.type === 'growth' && r.details.animalId === animalId && r.details.memberId === memberId)
    .sort((a,b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || Date.parse(a.createdAt) - Date.parse(b.createdAt));
}
// # 两项分别回溯最新有效实测值，不把补记、空缺或其他个体当作当前数据。
export function latestGrowth(data, animalId, memberId, now = new Date()) {
  const latest = {};
  for (const record of growthRecords(data,animalId,memberId)) {
    if (Date.parse(record.timestamp) > now.getTime()) continue;
    for (const key of ['weightGrams','lengthCm']) {
      const value=record.details[key];
      if (Number.isFinite(value) && value>0) latest[key]={value,timestamp:record.timestamp,recordId:record.id};
    }
  }
  return latest;
}
export function latestGrowthMarkup(data, animalId, member, now = new Date()) {
  const latest=latestGrowth(data,animalId,member.id,now);
  return `<span class="latest-growth" aria-label="最近测量"><span class="latest-growth-title">最近测量</span>${[['weightGrams','体重','g'],['lengthCm','背甲长','cm']].map(([key,label,unit])=>{
    const point=latest[key], day=point&&localDate(point.timestamp);
    return `<span class="latest-growth-item" data-measure="${key}"><span>${label}</span><strong>${point?`${shortNumber(point.value)} ${unit}`:'未记录'}</strong>${point?`<time datetime="${e(point.timestamp)}" title="${e(day)} 测量">${e(day)}</time>`:''}</span>`;
  }).join('')}${!latest.lengthCm && member.length?`<span class="growth-legacy">资料体长：${e(member.length)}</span>`:''}</span>`;
}
export function growthTargetFields(data, containerId, record) {
  const d = record?.details || {}, selected = d.animalId && d.memberId ? JSON.stringify([d.animalId,d.memberId]) : '';
  const choices = data.animals.filter(a => a.containerId === containerId && isTurtle(a)).flatMap(a => membersFor(a).map((m,i) => ({value:JSON.stringify([a.id,m.id]),label:`${a.species} · ${m.name || `居民 ${i+1}`}`,species:a.species,name:m.name || `居民 ${i+1}`})));
  if (selected && !choices.some(c=>c.value===selected)) choices.push({value:selected,label:`${d.residentName || d.species || '原居民'}（原关联）`,species:d.species || '',name:d.residentName || ''});
  return `<div id="growth-target-fields"><label class="field"><span>测量对象</span><select name="growthTarget" required><option value="">选择一只乌龟</option>${choices.map(c=>`<option value="${e(c.value)}" data-species="${e(c.species)}" data-resident-name="${e(c.name)}" ${c.value===selected?'selected':''}>${e(c.label)}</option>`).join('')}</select></label>${!choices.length?'<p class="form-note">这个缸还没有乌龟居民。请先在居民页添加乌龟，再记录测量。</p>':''}</div>`;
}
export function validateGrowthRecord(data, entry, now = new Date()) {
  const d=entry.details, old=data.records.find(r=>r.id===entry.id), unchanged=old?.type==='growth' && old.details.animalId===d.animalId && old.details.memberId===d.memberId && old.containerId===entry.containerId;
  if (!d.animalId || !d.memberId) throw new Error('请选择一只乌龟，避免混合不同个体的成长记录。');
  const measures=['weightGrams','lengthCm'].filter(k=>d[k]!==undefined);
  if (!measures.length || measures.some(k=>typeof d[k]!=='number' || !Number.isFinite(d[k]) || d[k]<=0)) throw new Error('请填写至少一项大于 0 的体重或背甲长度。');
  if (!Number.isFinite(Date.parse(entry.timestamp)) || Date.parse(entry.timestamp)>now.getTime()) throw new Error('测量时间应为已经发生的时间。');
  const animal=data.animals.find(a=>a.id===d.animalId), member=animal && membersFor(animal).find(m=>m.id===d.memberId);
  // # 转缸、移除个体或改物种后仍允许更正原历史关联，不把记录转给新个体。
  if ((!animal || !member || !isTurtle(animal) || animal.containerId!==entry.containerId) && !unchanged) throw new Error('测量对象与所选缸不一致，请重新选择。');
  const death=residentDeath(data,d.animalId,d.memberId);
  if (death && Date.parse(entry.timestamp)>Date.parse(death.timestamp)) throw new Error('测量时间晚于该居民的死亡登记，请核对时间。');
}
const shortNumber = n => Number(n.toFixed(3)).toLocaleString('zh-CN',{maximumFractionDigits:3});
function chart(records, key, title, unit) {
  const points=records.filter(r=>Number.isFinite(r.details[key])).map(r=>({time:Date.parse(r.timestamp),value:r.details[key],date:localDate(r.timestamp)}));
  if (!points.length) return `<section class="growth-chart"><h3>${title} <small>${unit}</small></h3><p class="small-empty">还没有${title}测量</p></section>`;
  const start=points[0].time,end=points.at(-1).time,values=points.map(p=>p.value),low=Math.min(...values),high=Math.max(...values),pad=(high-low)*.15 || high*.1 || 1,min=Math.max(0,low-pad),max=high+pad;
  const x=t=>start===end?190:48+(t-start)/(end-start)*286, y=v=>162-(v-min)/(max-min)*130;
  const path=points.map((p,i)=>`${i?'L':'M'}${x(p.time).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ');
  const ticks=[min,(min+max)/2,max], dates=start===end?[points[0]]:[points[0],points.at(-1)];
  return `<section class="growth-chart"><div class="growth-chart-heading"><h3>${title} <small>${unit}</small></h3><strong>${shortNumber(points.at(-1).value)} <small>${unit}</small></strong></div><svg viewBox="0 0 356 196" role="img" aria-label="${title}曲线，${points.length}次测量，${e(points[0].date)}至${e(points.at(-1).date)}，最新${shortNumber(points.at(-1).value)}${unit}">${ticks.map(v=>`<line x1="48" x2="334" y1="${y(v)}" y2="${y(v)}" stroke="var(--line,#dce5d7)"/><text x="40" y="${y(v)+4}" text-anchor="end" fill="currentColor" font-size="10">${shortNumber(v)}</text>`).join('')}<path d="${path}" fill="none" stroke="var(--primary,#2e705b)" stroke-width="2.5" stroke-linejoin="round"/>${points.map(p=>`<circle cx="${x(p.time)}" cy="${y(p.value)}" r="3.5" fill="var(--primary,#2e705b)"><title>${e(p.date)} · ${shortNumber(p.value)} ${unit}</title></circle>`).join('')}${dates.map((p,i)=>`<text x="${x(p.time)}" y="186" text-anchor="${start===end?'middle':i?'end':'start'}" fill="currentColor" font-size="10">${e(p.date)}</text>`).join('')}</svg>${points.length===1?'<p class="form-note">再记录一次，就能看到变化曲线。</p>':''}</section>`;
}
export function growthPanel(data, animalId, memberId) {
  const animal=data.animals.find(a=>a.id===animalId), member=animal&&membersFor(animal).find(m=>m.id===memberId);
  if (!animal || !member) return '<p class="small-empty">这个居民已被移除。</p>';
  const records=growthRecords(data,animalId,memberId), attrs=`data-animal="${e(animalId)}" data-member="${e(memberId)}"`;
  return `<div class="growth-panel"><div class="section-toolbar"><div><h2>${e(member.name || animal.species)}</h2><p class="form-note">体重 · 背甲直线长度</p></div><button class="button primary" data-action="record-growth" ${attrs}>记测量</button></div><div class="growth-charts">${chart(records,'weightGrams','体重','g')}${chart(records,'lengthCm','背甲长度','cm')}</div><p class="form-note">按实际日期排列，两项分别显示；未测量的项目留空。</p><section class="growth-history"><h3>测量记录 <small>${records.length} 条</small></h3>${records.length?`<div class="growth-records">${[...records].reverse().map(r=>`<button class="growth-record" data-action="edit-record" data-id="${e(r.id)}" aria-label="编辑 ${e(localDate(r.timestamp))} ${timeLabel(r.timestamp)} 的测量"><time>${e(localDate(r.timestamp))}<small>${timeLabel(r.timestamp)}</small></time><span>${r.details.weightGrams!==undefined?`${shortNumber(r.details.weightGrams)} g`:'—'}<small>体重</small></span><span>${r.details.lengthCm!==undefined?`${shortNumber(r.details.lengthCm)} cm`:'—'}<small>背甲长度</small></span><span aria-hidden="true">›</span></button>`).join('')}</div>`:'<p class="small-empty">记录第一次测量，开始观察成长。</p>'}</section></div>`;
}
