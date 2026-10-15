// # 共用本地日历与小时标尺；时间位置按实际时分计算，重叠卡片排入额外轨道。
import { localDate, newestFirst, escapeHTML as e, timeLabel, recordSummary } from './logic.js';
import { TYPES } from './data.js';
import { icon } from './art.js';
export const HOUR_WIDTH=44, TIMELINE_PAD=38, TIMELINE_WIDTH=24*HOUR_WIDTH+2*TIMELINE_PAD;
export function shiftDay(day,offset){const date=new Date(`${day}T12:00:00`);date.setDate(date.getDate()+offset);return localDate(date);}
export function layoutEvents(records){
  const ends=[];
  return [...records].sort((a,b)=>-newestFirst(a,b)).map(record=>{
    const date=new Date(record.timestamp),minutes=date.getHours()*60+date.getMinutes()+date.getSeconds()/60,x=TIMELINE_PAD+minutes/60*HOUR_WIDTH;
    let lane=ends.findIndex(end=>x-end>=82);if(lane<0)lane=ends.length;ends[lane]=x;
    return{record,x,lane};
  });
}
export function historyTimeline(data,records,{day='',container='',limit=100}={}){
  const date=day || (records.length?localDate([...records].sort(newestFirst)[0].timestamp):localDate());
  const matched=records.filter(r=>localDate(r.timestamp)===date),visible=[...matched].sort((a,b)=>-newestFirst(a,b)).slice(0,limit);
  const rows=data.containers.filter(c=>!container||c.id===container).map(c=>{
    const events=layoutEvents(visible.filter(r=>r.containerId===c.id));
    const spacing=events.some(event=>event.record.photoIds?.length)?120:78;
    return{container:c,events,spacing,height:Math.max(124,Math.max(-1,...events.map(event=>event.lane))*spacing+(spacing===120?162:124))};
  });
  const first=visible.length?Math.min(...visible.map(r=>{const d=new Date(r.timestamp);return d.getHours()+d.getMinutes()/60;})):new Date().getHours();
  return{day:date,rows,total:matched.length,shown:visible.length,remaining:matched.length-visible.length,start:Math.max(0,(first-1)*HOUR_WIDTH)};
}
export function timelineMarkup(model){
  const controls=`<div class="timeline-date"><button class="icon-button" data-action="history-day" data-date="${shiftDay(model.day,-1)}" aria-label="前一天">${icon('back',16)}</button><label class="timeline-day-field"><span class="sr-only">查看日期</span><input type="date" data-history-day value="${model.day}" aria-label="查看记录日期"></label><button class="icon-button" data-action="history-day" data-date="${shiftDay(model.day,1)}" aria-label="后一天">${icon('chevron',16)}</button><button class="text-link" data-action="history-day" data-date="${localDate()}">今天</button></div>`;
  const eventMarkup=({record:r,x,lane},spacing)=>`<div class="timeline-event ${TYPES[r.type].color}" data-record="${e(r.id)}" style="left:${x.toFixed(3)}px;top:${42+lane*spacing}px;--stem:${22+lane*spacing}px"><i class="event-dot"></i><button class="event-card" data-action="edit-record" data-id="${e(r.id)}" aria-label="${e(`${timeLabel(r.timestamp)} ${TYPES[r.type].label} ${recordSummary(r)}`)}">${icon(TYPES[r.type].icon,17)}<span>${TYPES[r.type].label}</span><time datetime="${e(r.timestamp)}">${e(timeLabel(r.timestamp))}</time></button>${r.photoIds?.length?`<button class="event-photos" data-action="view-photos" data-id="${e(r.id)}" aria-label="查看${r.photoIds.length}张观察照片">${icon('camera',12)}${r.photoIds.length}</button>`:''}</div>`;
  return `${controls}<div class="history-timeline-viewport panel" data-swipe-ignore data-scroll-start="${model.start}" data-timeline-day="${model.day}" tabindex="0" role="region" aria-label="按缸排列的共享时间轴，可左右滚动"><div class="history-timeline" style="--timeline-width:${TIMELINE_WIDTH}px"><div class="timeline-corner">缸</div><div class="timeline-axis">${Array.from({length:9},(_,i)=>`<span style="left:${TIMELINE_PAD+i*3*HOUR_WIDTH}px">${String(i*3).padStart(2,'0')}:00</span>`).join('')}</div>${model.rows.map(({container:c,events,height,spacing})=>`<a href="#tank/${encodeURIComponent(c.id)}" class="timeline-tank" style="min-height:${height}px">${icon(c.type==='bucket'?'bucket':'tank',18)}<strong>${e(c.name)}</strong></a><div class="timeline-lane" data-timeline-container="${e(c.id)}" style="height:${height}px"><div class="timeline-track"></div>${events.map(event=>eventMarkup(event,spacing)).join('')}${!events.length?'<span class="timeline-row-empty">暂无记录</span>':''}</div>`).join('')}</div></div><div class="timeline-count">${model.shown} 条${model.remaining?` · 另有 ${model.remaining} 条`:''}</div>${model.remaining?'<button class="button secondary load-more" data-action="more-history">加载更多</button>':''}`;
}
// # 空间足够时让图表底边避开固定底栏；短屏保留自然页面滚动，不把图表压成一条。
export function fitTimelineViewports(root){
  const nav=document.querySelector('.bottom-nav'),bottom=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight;
  root.querySelectorAll('[data-timeline-day]').forEach(el=>{if(!el.isConnected)return;const top=el.getBoundingClientRect().top+(el.closest('.page-swipe-layer')?0:scrollY),available=Math.floor(Math.min(innerHeight*.65,bottom-top-12));el.style.maxHeight=available>=160?`${available}px`:'';});
}
export function positionTimelines(root,positions=new Map()){
  fitTimelineViewports(root);
  root.querySelectorAll('[data-timeline-day]').forEach(el=>{el.scrollLeft=positions.get(el.dataset.timelineDay)??Number(el.dataset.scrollStart);if(!el.dataset.wheelGuard){el.dataset.wheelGuard='true';el.addEventListener('wheel',event=>{if(Math.abs(event.deltaX)>Math.abs(event.deltaY)&&((event.deltaX<0&&el.scrollLeft<=0)||(event.deltaX>0&&el.scrollLeft+el.clientWidth>=el.scrollWidth-1))&&event.cancelable)event.preventDefault();},{passive:false});}});
}
