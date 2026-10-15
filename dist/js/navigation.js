// # 三页提前渲染，拖动时移动完整画面；交接前保持预览覆盖，避免空白帧。
export const PRIMARY_ROUTES=['home','history','residents'];
export function swipeTarget(route,dx){const index=PRIMARY_ROUTES.indexOf(route),next=index+(dx<0?1:-1);return index>=0?PRIMARY_ROUTES[next]||null:null;}
export function shouldFinishSwipe(dx,width,velocity=0){return Math.abs(dx)>Math.min(width*.24,110)||(Math.abs(dx)>34&&Math.abs(velocity)>.45);}
export function installNavigation({route,content,navigate,hydrate,position}){
  const prepared=new Map(),scrollPositions=new Map();let gesture=null,stage=null,suppress=0,finishing=false,wheelUntil=0;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eligible=target=>!!target.closest('#main')&&PRIMARY_ROUTES.includes(route())&&!document.querySelector('dialog[open]')&&!document.body.classList.contains('resident-sorting')&&!target.closest('input,textarea,select,button,a,summary,[data-sort-list],[data-swipe-ignore],.container-tabs,.photo-gallery,.avatar-crop-dialog');
  function makePane(html){const main=document.createElement('div');main.className='main-wrap swipe-main';main.innerHTML=html;main.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));hydrate(main);return main;}
  function prepare(){for(const key of PRIMARY_ROUTES)prepared.set(key,makePane(content(key)));}
  function cleanup(){stage?.layer.remove();stage=null;gesture=null;finishing=false;document.body.classList.remove('page-swiping');}
  function cancel(){if(stage||gesture?.locked)suppress=performance.now()+250;cleanup();}
  function setup(target,direction){
    if(stage)return;const source=document.getElementById('main'),header=document.querySelector('.site-header'),nav=document.querySelector('.bottom-nav'),top=header.getBoundingClientRect().bottom,bottom=getComputedStyle(nav).display==='none'?0:innerHeight-nav.getBoundingClientRect().top,width=innerWidth;
    scrollPositions.set(route(),scrollY);const destination=prepared.get(target).cloneNode(true),current=source.cloneNode(true),scroll=scrollPositions.get(target)||0;current.removeAttribute('id');current.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    const layer=document.createElement('div');layer.className='page-swipe-layer';layer.inert=true;layer.setAttribute('aria-hidden','true');Object.assign(layer.style,{top:`${top}px`,bottom:`${bottom}px`});
    const a=document.createElement('div'),b=document.createElement('div');a.className=b.className='page-slide';current.classList.add('swipe-main');current.style.transform=`translateY(${source.getBoundingClientRect().top-top}px)`;destination.style.transform=`translateY(${-scroll}px)`;a.append(current);b.append(destination);layer.append(a,b);document.body.append(layer);document.body.classList.add('page-swiping');
    source.querySelectorAll('[data-timeline-day],.species-variants,.container-tabs').forEach((node,i)=>{const copy=current.querySelectorAll('[data-timeline-day],.species-variants,.container-tabs')[i];if(copy)copy.scrollLeft=node.scrollLeft;});position(destination);
    stage={layer,a,b,target,direction,width,scroll};move(0);
  }
  function move(dx){if(!stage)return;stage.a.style.transform=`translate3d(${dx}px,0,0)`;stage.b.style.transform=`translate3d(${dx+stage.direction*stage.width}px,0,0)`;}
  async function settle(commit){
    if(!stage||finishing)return;finishing=true;suppress=performance.now()+500;const current=stage,duration=reduced()?0:240;
    for(const pane of [current.a,current.b])pane.style.transition=`transform ${duration}ms cubic-bezier(.22,.8,.3,1)`;
    move(commit?-current.direction*current.width:0);
    await new Promise(resolve=>setTimeout(resolve,duration));if(stage!==current)return;
    if(commit){navigate(current.target);window.scrollTo({top:current.scroll,behavior:'instant'});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);}
    if(stage===current)cleanup();
  }
  function start(target,x,y,event){
    if(stage||finishing||!eligible(target))return;gesture={x,y,lastX:x,lastTime:performance.now(),velocity:0,dx:0,locked:false};
    // # iOS 部分版本需在边缘起点阻止默认动作；浏览器自身手势仍以实际系统行为为准。
    if(event.type==='touchstart'&&(x<=20||x>=innerWidth-20)&&event.cancelable)event.preventDefault();
  }
  function drag(x,y,event){
    if(!gesture||finishing)return;const dx=x-gesture.x,dy=y-gesture.y;
    if(!gesture.locked){if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.25)return;const target=swipeTarget(route(),dx);if(!target){if(event.cancelable)event.preventDefault();gesture=null;return;}gesture.locked=true;setup(target,dx<0?1:-1);}
    if(event.cancelable)event.preventDefault();const now=performance.now();gesture.velocity=(x-gesture.lastX)/Math.max(1,now-gesture.lastTime);gesture.lastX=x;gesture.lastTime=now;gesture.dx=dx;
    const distance=stage.direction===1?Math.max(-stage.width,Math.min(0,dx)):Math.min(stage.width,Math.max(0,dx));move(distance);
  }
  function end(event){if(!gesture)return;const current=gesture;gesture=null;if(!current.locked)return;if(event.cancelable)event.preventDefault();settle(shouldFinishSwipe(current.dx,innerWidth,performance.now()-current.lastTime<100?current.velocity:0));}
  document.addEventListener('touchstart',event=>{if(event.touches.length!==1){cancel();return;}const p=event.touches[0];start(event.target,p.clientX,p.clientY,event);},{passive:false});
  document.addEventListener('touchmove',event=>{if(event.touches.length!==1){cancel();return;}const p=event.touches[0];drag(p.clientX,p.clientY,event);},{passive:false});
  document.addEventListener('touchend',end,{passive:false});document.addEventListener('touchcancel',cancel);
  document.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button===0)start(event.target,event.clientX,event.clientY,event);});
  document.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')drag(event.clientX,event.clientY,event);},{passive:false});document.addEventListener('pointerup',event=>{if(event.pointerType!=='touch')end(event);});document.addEventListener('pointercancel',event=>{if(event.pointerType!=='touch')cancel();});
  document.addEventListener('wheel',event=>{if(!eligible(event.target)||Math.abs(event.deltaX)<Math.abs(event.deltaY)*1.3||Math.abs(event.deltaX)<6)return;if(event.cancelable)event.preventDefault();if(performance.now()<wheelUntil||stage)return;const target=swipeTarget(route(),-event.deltaX);if(target){wheelUntil=performance.now()+650;setup(target,event.deltaX>0?1:-1);settle(true);}},{passive:false});
  document.addEventListener('click',event=>{
    if(stage||performance.now()<suppress){event.preventDefault();event.stopImmediatePropagation();return;}
    const anchor=event.target.closest('a[href^="#"]');if(!anchor||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const target=anchor.getAttribute('href').slice(1);if(!/^(home|history|residents|settings|tank\/.*)$/.test(target))return;
    event.preventDefault();event.stopImmediatePropagation();if(target===route())return;const a=PRIMARY_ROUTES.indexOf(route()),b=PRIMARY_ROUTES.indexOf(target);if(a>=0&&b>=0){setup(target,b>a?1:-1);settle(true);}else navigate(target);
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Tab'||event.key.startsWith('Arrow'))document.documentElement.classList.add('keyboard-nav');if(event.key==='Escape')cancel();},true);
  const pointerMode=()=>document.documentElement.classList.remove('keyboard-nav');document.addEventListener('pointerdown',pointerMode,true);document.addEventListener('touchstart',pointerMode,{passive:true,capture:true});
  window.addEventListener('resize',cancel);window.addEventListener('blur',cancel);
  return{prepare,cancel,get busy(){return !!stage;}};
}
