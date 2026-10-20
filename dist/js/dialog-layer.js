// # 对话框共用滚动锁；子窗口关闭后仍保留父窗口的手势归属。
const leases = new Map();
let pageLock = null, generation = 0;

export function hasScrollRoom({offset, size, extent, delta}) {
  const limit = Math.max(0, extent - size);
  return limit > 1 && (delta > 0 ? offset < limit - .5 : delta < 0 && offset > .5);
}

function topDialog() {
  return [...leases.keys()].filter(dialog => dialog.isConnected && dialog.open).at(-1);
}

function consumesScroll(target, dialog, dx, dy) {
  const vertical = Math.abs(dy) >= Math.abs(dx), delta = vertical ? dy : dx;
  for (let node = target?.nodeType === 1 ? target : target?.parentElement; node && dialog.contains(node); node = node.parentElement) {
    const style = getComputedStyle(node), overflow = vertical ? style.overflowY : style.overflowX;
    if (/auto|scroll|overlay/.test(overflow) && hasScrollRoom({
      offset: vertical ? node.scrollTop : node.scrollLeft,
      size: vertical ? node.clientHeight : node.clientWidth,
      extent: vertical ? node.scrollHeight : node.scrollWidth, delta
    })) return true;
    if (node === dialog) break;
  }
  return false;
}

function freezePage() {
  const html = document.documentElement, body = document.body, abort = new AbortController();
  const x = scrollX, y = scrollY, token = ++generation;
  const values = new Map(['--modal-scroll-x', '--modal-scroll-y', '--modal-scrollbar-gap', '--modal-viewport-shift'].map(name => [name, [body.style.getPropertyValue(name), body.style.getPropertyPriority(name)]]));
  const wasBodyLocked = body.classList.contains('modal-open'), wasRootLocked = html.classList.contains('dialog-lock');
  body.style.setProperty('--modal-scroll-x', `${x}px`);
  body.style.setProperty('--modal-scroll-y', `${y}px`);
  body.style.setProperty('--modal-scrollbar-gap', `${Math.max(0, innerWidth - html.clientWidth)}px`);
  html.classList.add('dialog-lock'); body.classList.add('modal-open');
  // # Safari 为输入框平移可见视口时，背景反向补偿；顶层原生对话框独立布局。
  const visualTop = window.visualViewport?.offsetTop || 0;
  const keepBackground = () => body.style.setProperty('--modal-viewport-shift', `${(window.visualViewport?.offsetTop || 0) - visualTop}px`);
  keepBackground();
  window.visualViewport?.addEventListener('scroll', keepBackground, {signal:abort.signal});
  window.visualViewport?.addEventListener('resize', keepBackground, {signal:abort.signal});
  let point = null;
  document.addEventListener('touchstart', event => {
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    point = touch ? {id: touch.identifier, x: touch.clientX, y: touch.clientY} : null;
  }, {capture:true, passive:true, signal:abort.signal});
  document.addEventListener('touchmove', event => {
    const dialog = topDialog();
    if (!dialog || event.touches.length !== 1 || !point) return;
    const touch = [...event.touches].find(touch => touch.identifier === point.id);
    if (!touch) return;
    const dx = point.x - touch.clientX, dy = point.y - touch.clientY;
    point = {id:touch.identifier, x:touch.clientX, y:touch.clientY};
    // # 原生输入和裁剪画布保留自身操作；其他拖动只能被最上层滚动区接收。
    if (dialog.contains(event.target) && event.target.closest?.('input,select,canvas,[contenteditable=true]')) return;
    if ((!dialog.contains(event.target) || !consumesScroll(event.target, dialog, dx, dy)) && event.cancelable) event.preventDefault();
  }, {capture:true, passive:false, signal:abort.signal});
  document.addEventListener('wheel', event => {
    const dialog = topDialog();
    if (dialog && !event.ctrlKey && (!dialog.contains(event.target) || !consumesScroll(event.target, dialog, event.deltaX, event.deltaY)) && event.cancelable) event.preventDefault();
  }, {capture:true, passive:false, signal:abort.signal});
  const observer = new MutationObserver(() => {
    for (const dialog of [...leases.keys()]) if (!dialog.isConnected || !dialog.open) releaseDialog(dialog);
  });
  observer.observe(body, {subtree:true, childList:true, attributes:true, attributeFilter:['open']});
  pageLock = {x, y, token, values, wasBodyLocked, wasRootLocked, abort, observer};
}

export function releaseDialog(dialog) {
  const release = leases.get(dialog);
  if (!release) return;
  leases.delete(dialog); dialog.removeEventListener('close', release);
  if (leases.size || !pageLock) return;
  const state = pageLock; pageLock = null;
  state.abort.abort(); state.observer.disconnect();
  if (!state.wasBodyLocked) document.body.classList.remove('modal-open');
  if (!state.wasRootLocked) document.documentElement.classList.remove('dialog-lock');
  for (const [name, [value, priority]] of state.values) {
    if (value) document.body.style.setProperty(name, value, priority);
    else document.body.style.removeProperty(name);
  }
  const restore = () => { if (!pageLock && generation === state.token) window.scrollTo({left:state.x, top:state.y, behavior:'instant'}); };
  restore(); requestAnimationFrame(restore);
}

export function presentDialog(dialog) {
  if (!pageLock) freezePage();
  const release = () => releaseDialog(dialog);
  leases.set(dialog, release); dialog.addEventListener('close', release, {once:true});
  try { dialog.showModal(); } catch (error) { release(); throw error; }
}
