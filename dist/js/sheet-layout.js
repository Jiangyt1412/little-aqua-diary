// # 对话框使用独立内容滚动区；按实际可见视口避让键盘，不重复扣除底部安全区。
export function sheetViewport({height,visualHeight=height,offsetTop=0,scale=1,baselineHeight=height,focused=false,coarse=false}) {
  const positive=(value,fallback)=>Number.isFinite(value)&&value>0?value:fallback;
  const layout=positive(height,1),visible=positive(visualHeight,layout),top=Math.max(0,Number(offsetTop)||0);
  const bottom=Math.max(0,layout-visible-top),reduction=Math.max(layout,positive(baselineHeight,layout))-visible;
  return {height:visible,top,bottom,keyboard:!!(coarse&&scale<=1.05&&reduction>140&&(focused||bottom>140))};
}
const editable=node=>!!node?.matches?.('textarea:not([readonly]):not(:disabled),input:not([readonly]):not(:disabled):not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=range]):not([type=file]):not([type=button]):not([type=submit])');

export function installSheetLayout(root,{onResize=()=>{}}={}) {
  let baselineHeight=innerHeight,baselineWidth=innerWidth,frame=0,revealPending=false;
  const reveal=(dialog,target)=>{
    const scroller=target?.closest('.sheet-form-body');
    if(!dialog?.open||dialog.inert||!scroller)return;
    const field=target.getBoundingClientRect(),area=scroller.getBoundingClientRect(),gap=10;
    if(field.bottom>area.bottom-gap)scroller.scrollTop+=field.bottom-area.bottom+gap;
    else if(field.top<area.top+gap)scroller.scrollTop-=area.top+gap-field.top;
  };
  function update(ensure=false) {
    const viewport=window.visualViewport,active=document.activeElement;
    if(Math.abs(innerWidth-baselineWidth)>80){baselineHeight=innerHeight;baselineWidth=innerWidth;}
    else baselineHeight=Math.max(baselineHeight,innerHeight);
    const box=sheetViewport({height:innerHeight,visualHeight:viewport?.height,offsetTop:viewport?.offsetTop,scale:viewport?.scale||1,baselineHeight,focused:editable(active),coarse:matchMedia('(pointer:coarse)').matches});
    document.documentElement.style.setProperty('--visual-viewport-height',`${box.height}px`);
    document.documentElement.style.setProperty('--keyboard-inset',`${box.bottom}px`);
    document.body.classList.toggle('keyboard-open',box.keyboard);
    const dialog=root.querySelector('#sheet');
    if(dialog){dialog.classList.toggle('is-keyboard',box.keyboard);dialog.classList.toggle('is-writing-reason',box.keyboard&&active?.name==='pauseReason'&&dialog.contains(active));if(ensure)reveal(dialog,active);}
    onResize();return box;
  }
  const schedule=(ensure=false)=>{revealPending||=ensure;if(!frame)frame=requestAnimationFrame(()=>{frame=0;const revealNow=revealPending;revealPending=false;update(revealNow);});};
  function prepare(dialog) {
    const content=dialog.querySelector('.sheet-content'),form=content?.querySelector(':scope>form');
    content?.classList.toggle('has-sheet-form',!!form);
    if(form&&!form.querySelector(':scope>.sheet-form-body')) {
      const footer=form.querySelector(':scope>.sheet-footer');
      if(footer){const body=document.createElement('div');body.className='sheet-form-body';for(const node of [...form.childNodes])if(node!==footer)body.append(node);form.insertBefore(body,footer);form.classList.add('sheet-form');}
    }
    update();schedule(true);
  }
  window.visualViewport?.addEventListener('resize',()=>schedule(true));
  window.visualViewport?.addEventListener('scroll',()=>schedule());
  window.addEventListener('resize',()=>schedule(true));
  document.addEventListener('focusin',()=>schedule(true));
  document.addEventListener('focusout',()=>schedule());
  update();return {prepare,update:()=>schedule(true)};
}
