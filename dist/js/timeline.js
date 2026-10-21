// # 共用本地日历与按记录自适应的时间标尺；时间位置按实际时分计算，重叠卡片排入额外轨道。
import { localDate, newestFirst, escapeHTML as e, timeLabel, recordSummary } from './logic.js';
import { TYPES, orderedContainers } from './data.js';
import { icon } from './art.js';
export const HOUR_WIDTH=44, TIMELINE_PAD=38, TIMELINE_WIDTH=24*HOUR_WIDTH+2*TIMELINE_PAD;
export function shiftDay(day,offset){const date=new Date(`${day}T12:00:00`);date.setDate(date.getDate()+offset);return localDate(date);}
const minuteOf = record => { const date=new Date(record.timestamp); return date.getHours()*60+date.getMinutes()+date.getSeconds()/60+date.getMilliseconds()/60000; };
export function adaptiveScale(records){
  if(!records.length)return{start:0,end:60,step:15,ticks:[]};
  const minutes=records.map(minuteOf);let first=Math.min(...minutes),last=Math.max(...minutes);
  if(last-first<10){first=Math.max(0,Math.min(1430,(first+last)/2-5));last=first+10;}
  const step=[1,2,5,10,15,30,60,120,180,240,360].find(value=>value>=(last-first)/3)||360;
  const start=Math.max(0,Math.floor(first/step)*step),end=Math.min(1440,Math.ceil(last/step)*step);
  const ticks=Array.from({length:Math.floor((end-start)/step)+1},(_,i)=>{const minute=start+i*step;return{minute,label:`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`,ratio:(minute-start)/(end-start)};});
  return{start,end,step,ticks};
}
export function layoutEvents(records,scale={start:0,end:1440},width=TIMELINE_WIDTH){
  const ends=[];
  return [...records].sort((a,b)=>-newestFirst(a,b)).map(record=>{
    const ratio=(minuteOf(record)-scale.start)/(scale.end-scale.start),x=TIMELINE_PAD+ratio*(width-2*TIMELINE_PAD);
    let lane=ends.findIndex(end=>x-end>=82);if(lane<0)lane=ends.length;ends[lane]=x;
    return{record,x,lane,ratio};
  });
}
export function historyTimeline(data,records,{day='',container='',limit=100}={}){
  const date=day || (records.length?localDate([...records].sort(newestFirst)[0].timestamp):localDate());
  const matched=records.filter(r=>localDate(r.timestamp)===date&&(!container||r.containerId===container)),scale=adaptiveScale(matched),visible=[...matched].sort((a,b)=>-newestFirst(a,b)).slice(0,limit);
  const rows=orderedContainers(data).filter(c=>!container||c.id===container).map(c=>{
    const events=layoutEvents(visible.filter(r=>r.containerId===c.id),scale,240);
    const spacing=events.some(event=>event.record.photoIds?.length)?120:78;
    return{container:c,events,spacing,height:Math.max(124,Math.max(-1,...events.map(event=>event.lane))*spacing+(spacing===120?162:124))};
  });
  return{day:date,rows,scale,total:matched.length,shown:visible.length,remaining:matched.length-visible.length,start:0};
}
export function timelineMarkup(model){
  // # 密集记录给坐标轴适量横向空间，避免手机上一个缸占满整屏；仍按记录时间自动缩放。
  const contentMin = Math.min(480, Math.max(240, TIMELINE_PAD * 2 + Math.max(0,...model.rows.map(row=>row.events.length)) * 82));
  const controls=`<div class="timeline-date"><button class="icon-button" data-action="history-day" data-date="${shiftDay(model.day,-1)}" aria-label="前一天">${icon('back',16)}</button><label class="timeline-day-field"><span class="sr-only">查看日期</span><input type="date" data-history-day value="${model.day}" aria-label="查看记录日期"></label><button class="icon-button" data-action="history-day" data-date="${shiftDay(model.day,1)}" aria-label="后一天">${icon('chevron',16)}</button><button class="text-link" data-action="history-day" data-date="${localDate()}">今天</button></div>`;
  if(!model.total)return `${controls}<div class="panel timeline-empty">这一天暂无记录</div>`;
  const left = ratio => `calc(${(ratio*100).toFixed(6)}% + ${(TIMELINE_PAD*(1-2*ratio)).toFixed(3)}px)`;
  const grid=model.scale.ticks.map(t=>`<i class="timeline-grid-line" style="left:${left(t.ratio)}"></i>`).join('');
  const eventMarkup=({record:r,x,lane,ratio},spacing)=>`<div class="timeline-event ${TYPES[r.type].color}" data-record="${e(r.id)}" data-position="${ratio}" style="left:${left(ratio)};top:${42+lane*spacing}px;--stem:${22+lane*spacing}px"><i class="event-dot"></i><button class="event-card" data-action="edit-record" data-id="${e(r.id)}" aria-label="${e(`${timeLabel(r.timestamp)} ${TYPES[r.type].label} ${recordSummary(r)}`)}">${icon(TYPES[r.type].icon,17)}<span>${TYPES[r.type].label}</span><time datetime="${e(r.timestamp)}">${e(timeLabel(r.timestamp))}</time></button>${r.photoIds?.length?`<button class="event-photos" data-action="view-photos" data-id="${e(r.id)}" aria-label="查看${r.photoIds.length}张观察照片">${icon('camera',12)}${r.photoIds.length}</button>`:''}</div>`;
  return `${controls}<div class="history-timeline-viewport panel" style="--timeline-content-min:${contentMin}px" data-swipe-ignore data-scroll-start="${model.start}" data-timeline-day="${model.day}" tabindex="0" role="region" aria-label="按缸排列的共享时间轴，可左右滚动"><div class="history-timeline"><div class="timeline-corner">缸</div><div class="timeline-axis">${model.scale.ticks.map(t=>`<span data-position="${t.ratio}" style="left:${left(t.ratio)}">${t.label}</span>`).join('')}</div>${model.rows.map(({container:c,events,height,spacing})=>`<a href="#tank/${encodeURIComponent(c.id)}" class="timeline-tank" style="min-height:${height}px">${icon(c.type==='bucket'?'bucket':'tank',18)}<strong>${e(c.name)}</strong></a><div class="timeline-lane" data-timeline-container="${e(c.id)}" style="min-height:${height}px">${grid}<div class="timeline-track"></div>${events.map(event=>eventMarkup(event,spacing)).join('')}${!events.length?'<span class="timeline-row-empty">暂无记录</span>':''}</div>`).join('')}</div></div><div class="timeline-count">${model.shown} 条${model.remaining?` · 另有 ${model.remaining} 条`:''}</div>${model.remaining?'<button class="button secondary load-more" data-action="more-history">加载更多</button>':''}`;
}
// # 在实际列宽下重新分轨，所有缸使用同一时间范围；只隐藏过密刻度文字，不隐藏事件。
function fitTimelineContents(viewport){
  viewport.querySelectorAll('.timeline-lane').forEach(lane=>{
    const ends=[],slots=[],heights=[];
    lane.querySelectorAll('.timeline-event').forEach(event=>{
      const x=TIMELINE_PAD+Number(event.dataset.position)*(lane.clientWidth-2*TIMELINE_PAD);let row=ends.findIndex(end=>x-end>=82);if(row<0)row=ends.length;ends[row]=x;
      event.style.left=`${x}px`;slots.push({event,row});heights[row]=Math.max(heights[row]||0,event.querySelector('.event-photos')?108:64);
    });
    // # 只为真正带照片的分轨留照片空间，其他记录不随之拉高。
    const offsets=[];let cursor=42;heights.forEach((height,row)=>{offsets[row]=cursor;cursor+=height+14;});
    slots.forEach(({event,row})=>{event.style.top=`${offsets[row]}px`;event.style.setProperty('--stem',`${offsets[row]-20}px`);});
    const height=Math.max(124,cursor+6);lane.style.minHeight=`${height}px`;lane.previousElementSibling.style.minHeight=`${height}px`;
  });
  const ticks=[...viewport.querySelectorAll('.timeline-axis>span')],width=viewport.querySelector('.timeline-axis').clientWidth;
  let last=-Infinity,previous=null;
  ticks.forEach((tick,i)=>{const x=TIMELINE_PAD+Number(tick.dataset.position)*(width-2*TIMELINE_PAD);const show=i===0||i===ticks.length-1||x-last>=46;tick.style.visibility=show?'visible':'hidden';if(show){if(i===ticks.length-1&&x-last<46&&previous)previous.style.visibility='hidden';last=x;previous=tick;}});
}
// # 空间足够时让图表底边避开固定底栏；短屏保留自然页面滚动，不把图表压成一条。
export function fitTimelineViewports(root){
  const nav=document.querySelector('.bottom-nav'),bottom=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight;
  root.querySelectorAll('[data-timeline-day]').forEach(el=>{if(!el.isConnected)return;fitTimelineContents(el);const top=el.getBoundingClientRect().top+(el.closest('.page-swipe-layer')?0:scrollY),available=Math.floor(Math.min(innerHeight*.65,bottom-top-12));el.style.maxHeight=available>=160?`${available}px`:'';});
}
export function positionTimelines(root,positions=new Map()){
  fitTimelineViewports(root);
  root.querySelectorAll('[data-timeline-day]').forEach(el=>{el.scrollLeft=positions.get(el.dataset.timelineDay)??Number(el.dataset.scrollStart);if(!el.dataset.wheelGuard){el.dataset.wheelGuard='true';el.addEventListener('wheel',event=>{if(Math.abs(event.deltaX)>Math.abs(event.deltaY)&&((event.deltaX<0&&el.scrollLeft<=0)||(event.deltaX>0&&el.scrollLeft+el.clientWidth>=el.scrollWidth-1))&&event.cancelable)event.preventDefault();},{passive:false});}});
}
