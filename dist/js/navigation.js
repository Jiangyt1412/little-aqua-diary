// # 三页提前渲染，拖动时移动完整画面；交接前保持预览覆盖，避免空白帧。
export const PRIMARY_ROUTES=['home','history','residents'];
export function swipeTarget(route,dx){const index=PRIMARY_ROUTES.indexOf(route),next=index+(dx<0?1:-1);return index>=0?PRIMARY_ROUTES[next]||null:null;}
export function shouldFinishSwipe(dx,width,velocity=0){return Math.abs(dx)>Math.min(width*.24,110)||(Math.abs(dx)>34&&Math.abs(velocity)>.45);}
export function detailSwipeTarget(route,dx,x,origin='home'){return route.startsWith('tank/')&&x<=28&&x>=0&&dx>0&&PRIMARY_ROUTES.includes(origin)?origin:null;}
export function installNavigation({route,content,navigate,hydrate,position}){
  const prepared=new Map();let gesture=null,stage=null,suppress=0,finishing=false,wheelUntil=0,detailOrigin={route:'home',scroll:0};
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eligible=target=>!!target.closest('#main')&&(PRIMARY_ROUTES.includes(route())||route().startsWith('tank/'))&&!document.querySelector('dialog[open]')&&!document.body.classList.contains('resident-sorting')&&!target.closest('input,textarea,select,button,a,summary,[data-sort-list],[data-swipe-ignore],.container-tabs,.photo-gallery,.avatar-crop-dialog');
  function makePane(html){const main=document.createElement('div');main.className='main-wrap swipe-main';main.innerHTML=html;main.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));hydrate(main);return main;}
  function prepare(){for(const key of PRIMARY_ROUTES)prepared.set(key,makePane(content(key)));}
  function cleanup(){stage?.animations?.forEach(animation=>animation.cancel());stage?.layer.remove();stage=null;gesture=null;finishing=false;document.body.classList.remove('page-swiping');}
  function cancel(){if(stage||gesture?.locked)suppress=performance.now()+250;cleanup();}
  function setup(target,direction,kind='primary',scroll=0){
    if(stage)return;const source=document.getElementById('main'),header=document.querySelector('.site-header'),nav=document.querySelector('.bottom-nav'),top=header.getBoundingClientRect().bottom,bottom=getComputedStyle(nav).display==='none'?0:innerHeight-nav.getBoundingClientRect().top,width=innerWidth;
    // # 主页面从页首进入，预览与落地一致，避免旧滚动位置把标题留在顶栏下。
    const destination=(prepared.get(target)||makePane(content(target))).cloneNode(true),current=source.cloneNode(true);current.removeAttribute('id');current.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    const layer=document.createElement('div');layer.className='page-swipe-layer';layer.dataset.navigation=kind;layer.inert=true;layer.setAttribute('aria-hidden','true');Object.assign(layer.style,{top:`${top}px`,bottom:`${bottom}px`});
    const a=document.createElement('div'),b=document.createElement('div');a.className=b.className='page-slide';current.classList.add('swipe-main');current.style.transform=`translateY(${source.getBoundingClientRect().top-top}px)`;destination.style.transform=`translateY(${-scroll}px)`;a.append(current);b.append(destination);kind==='back'?layer.append(b,a):layer.append(a,b);document.body.append(layer);document.body.classList.add('page-swiping');
    source.querySelectorAll('[data-timeline-day],.species-variants,.container-tabs').forEach((node,i)=>{const copy=current.querySelectorAll('[data-timeline-day],.species-variants,.container-tabs')[i];if(copy)copy.scrollLeft=node.scrollLeft;});position(destination);
    stage={layer,a,b,target,direction,width,scroll,kind};move(0);
  }
  function move(dx){
    if(!stage)return;const {a,b,width,direction,kind}=stage;
    a.style.transform=`translate3d(${kind==='forward'?dx*.24:dx}px,0,0)`;
    b.style.transform=`translate3d(${kind==='back'?(-width+dx)*.24:dx+direction*width}px,0,0)`;
  }
  async function settle(commit){
    if(!stage||finishing)return;finishing=true;const current=stage,duration=reduced()?0:current.kind==='forward'?300:240;suppress=performance.now()+duration+60;
    // # 显式提供起终帧，避免点击时浏览器把同一任务内的 CSS 起终状态合并成一次跳变。
    const panes=[current.a,current.b],starts=panes.map(pane=>pane.style.transform);
    move(commit?-current.direction*current.width:0);
    if(duration){
      current.animations=panes.map((pane,index)=>pane.animate([{transform:starts[index]},{transform:pane.style.transform}],{duration,easing:'cubic-bezier(.22,.8,.3,1)'}));
      await Promise.allSettled(current.animations.map(animation=>animation.finished));
    }
    if(stage!==current)return;
    if(commit){navigate(current.target,{scroll:current.scroll});window.scrollTo({top:current.scroll,behavior:'instant'});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);}
    if(stage===current)cleanup();
  }
  function start(target,x,y,event){
    if(gesture||stage||finishing||!eligible(target)||(route().startsWith('tank/')&&x>28))return;gesture={x,y,lastX:x,lastTime:performance.now(),velocity:0,dx:0,locked:false,back:route().startsWith('tank/'),touch:event.type==='touchstart'};
    // # iOS 部分版本需在边缘起点阻止默认动作；浏览器自身手势仍以实际系统行为为准。
    if(event.type==='touchstart'&&(x<=20||x>=innerWidth-20)&&event.cancelable)event.preventDefault();
  }
  function drag(x,y,event){
    if(!gesture||finishing)return;const dx=x-gesture.x,dy=y-gesture.y;
    if(!gesture.locked){if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.25)return;const target=gesture.back?detailSwipeTarget(route(),dx,gesture.x,detailOrigin.route):swipeTarget(route(),dx);if(!target){if(!gesture.back&&event.cancelable)event.preventDefault();gesture=null;return;}gesture.locked=true;setup(target,dx<0?1:-1,gesture.back?'back':'primary',gesture.back?detailOrigin.scroll:0);}
    if(event.cancelable)event.preventDefault();const now=performance.now();gesture.velocity=(x-gesture.lastX)/Math.max(1,now-gesture.lastTime);gesture.lastX=x;gesture.lastTime=now;gesture.dx=dx;
    const distance=stage.direction===1?Math.max(-stage.width,Math.min(0,dx)):Math.min(stage.width,Math.max(0,dx));move(distance);
  }
  function end(event){if(!gesture)return;const current=gesture;gesture=null;if(!current.locked)return;if(event.cancelable)event.preventDefault();settle(shouldFinishSwipe(current.dx,innerWidth,performance.now()-current.lastTime<100?current.velocity:0));}
  document.addEventListener('touchstart',event=>{if(event.touches.length!==1){cancel();return;}const p=event.touches[0];start(event.target,p.clientX,p.clientY,event);},{passive:false});
  document.addEventListener('touchmove',event=>{if(event.touches.length!==1){cancel();return;}if(!gesture?.touch)return;const p=event.touches[0];drag(p.clientX,p.clientY,event);},{passive:false});
  document.addEventListener('touchend',event=>{if(gesture?.touch)end(event);},{passive:false});document.addEventListener('touchcancel',()=>{if(gesture?.touch)cancel();});
  document.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button===0)start(event.target,event.clientX,event.clientY,event);});
  document.addEventListener('pointermove',event=>{if(event.pointerType!=='touch'&&!gesture?.touch)drag(event.clientX,event.clientY,event);},{passive:false});document.addEventListener('pointerup',event=>{if(event.pointerType!=='touch'&&!gesture?.touch)end(event);});document.addEventListener('pointercancel',event=>{if(event.pointerType!=='touch'&&gesture&&!gesture.touch)cancel();});
  document.addEventListener('wheel',event=>{if(!PRIMARY_ROUTES.includes(route())||!eligible(event.target)||Math.abs(event.deltaX)<Math.abs(event.deltaY)*1.3||Math.abs(event.deltaX)<6)return;if(event.cancelable)event.preventDefault();if(performance.now()<wheelUntil||stage)return;const target=swipeTarget(route(),-event.deltaX);if(target){wheelUntil=performance.now()+650;setup(target,event.deltaX>0?1:-1);settle(true);}},{passive:false});
  document.addEventListener('click',event=>{
    if(stage||performance.now()<suppress){event.preventDefault();event.stopImmediatePropagation();return;}
    const anchor=event.target.closest('a[href^="#"]');if(!anchor||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;let target=anchor.getAttribute('href').slice(1);if(anchor.hasAttribute('data-detail-back')&&route().startsWith('tank/'))target=detailOrigin.route;if(!/^(home|history|residents|settings|tank\/.*)$/.test(target))return;
    event.preventDefault();event.stopImmediatePropagation();if(target===route()){window.scrollTo({top:0,behavior:reduced()?'instant':'smooth'});return;}const a=PRIMARY_ROUTES.indexOf(route()),b=PRIMARY_ROUTES.indexOf(target);if(route().startsWith('tank/')&&target===detailOrigin.route){setup(target,-1,'back',detailOrigin.scroll);settle(true);}else if(target.startsWith('tank/')){if(a>=0)detailOrigin={route:route(),scroll:scrollY};setup(target,1,'forward');settle(true);}else if(a>=0&&b>=0){setup(target,b>a?1:-1);settle(true);}else navigate(target);
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Tab'||event.key.startsWith('Arrow'))document.documentElement.classList.add('keyboard-nav');if(event.key==='Escape')cancel();},true);
  const pointerMode=()=>document.documentElement.classList.remove('keyboard-nav');document.addEventListener('pointerdown',pointerMode,true);document.addEventListener('touchstart',pointerMode,{passive:true,capture:true});
  window.addEventListener('resize',cancel);window.addEventListener('blur',cancel);
  return{prepare,cancel,get busy(){return !!stage;}};
}
