// # 弹窗在退出动画结束后移除；快速切换和减少动态效果均有同步结束路径。
import { releaseDialog } from './dialog-layer.js'; // # 关闭动画结束后才归还底层滚动。
const closing = new WeakMap(), transitions = new WeakMap();
export const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
// # 只为用户主动展开的原生详情加轻淡入，保留系统下拉菜单和键盘操作。
export function installFeedback() {
  const requested = new WeakSet();
  document.addEventListener('click', event => {
    const summary = event.target.closest('summary');
    if (summary?.parentElement.tagName === 'DETAILS') requested.add(summary.parentElement);
  });
  document.addEventListener('toggle', event => {
    const details = event.target;
    if (!requested.delete(details) || !details.open || reducedMotion()) return;
    [...details.children].filter(node => node.tagName !== 'SUMMARY').forEach(node => node.animate([{opacity:.25,transform:'translateY(-3px)'},{opacity:1,transform:'translateY(0)'}],{duration:150,easing:'ease-out'}));
  }, true);
}
export function finishDialogMotion(dialog) { closing.get(dialog)?.(); }
export function finishDialogTransition(dialog) { transitions.get(dialog)?.(); }
// # 用旧内容的惰性快照衔接新内容；高度与前后方向同时过渡，遮罩不重建。
export function transitionDialog(dialog, change, direction = 'forward') {
  finishDialogTransition(dialog);
  const body = dialog.querySelector('.sheet-content'), title = dialog.querySelector('.sheet-title');
  if (reducedMotion()) { change(); return; }
  dialog.getAnimations().filter(animation => animation.animationName === 'dialog-enter').forEach(animation => animation.finish());
  const from = dialog.getBoundingClientRect(), area = body.getBoundingClientRect(), snapshot = body.cloneNode(true);
  snapshot.classList.add('sheet-transition-snapshot'); snapshot.inert = true; snapshot.setAttribute('aria-hidden', 'true');
  for (const node of [snapshot, ...snapshot.querySelectorAll('*')]) for (const attr of [...node.attributes]) {
    if (attr.name === 'id' || attr.name === 'name' || attr.name === 'autofocus' || attr.name.startsWith('data-')) node.removeAttribute(attr.name);
  }
  Object.assign(snapshot.style, {top:`${area.top-from.top-1}px`,left:`${area.left-from.left-1}px`,width:`${area.width}px`,height:`${area.height}px`});
  const scrolls = [body, ...body.querySelectorAll('*')].map(node => [node.scrollLeft, node.scrollTop]);
  change(); const to = dialog.getBoundingClientRect(); dialog.append(snapshot);
  [snapshot, ...snapshot.querySelectorAll('*')].forEach((node, index) => { node.scrollLeft=scrolls[index][0];node.scrollTop=scrolls[index][1]; });
  const sign = direction === 'back' ? -1 : 1, distance = area.width, options = {duration:300,easing:'cubic-bezier(.22,.8,.25,1)'};
  const animations = [
    dialog.animate([{height:`${from.height}px`},{height:`${to.height}px`}], options),
    snapshot.animate([{transform:'translateX(0)'},{transform:`translateX(${-sign*distance}px)`}], options),
    body.animate([{transform:`translateX(${sign*distance}px)`},{transform:'translateX(0)'}], options),
    title.animate([{opacity:.35},{opacity:1}], options)
  ];
  const abort = new AbortController(); let finished = false;
  const done = () => {
    if (finished) return; finished=true;abort.abort();animations.forEach(animation=>animation.cancel());snapshot.remove();
    if (transitions.get(dialog) === done) transitions.delete(dialog);
  };
  transitions.set(dialog, done);
  window.addEventListener('resize',done,{signal:abort.signal});
  window.visualViewport?.addEventListener('resize',done,{signal:abort.signal});
  Promise.allSettled(animations.map(animation=>animation.finished)).then(done);
}
export function dismissDialog(dialog, after = () => {}, immediate = false) {
  if (!dialog) { after(); return; }
  finishDialogTransition(dialog);
  if (closing.has(dialog)) { if (immediate) finishDialogMotion(dialog); return; }
  let timer, finished = false;
  const done = () => {
    if (finished) return; finished = true; clearTimeout(timer); closing.delete(dialog);
    dialog.removeEventListener('animationend', ended); if (dialog.open) dialog.close(); releaseDialog(dialog); after();
  };
  const ended = event => { if (event.target === dialog && event.animationName === 'dialog-exit') done(); };
  if (immediate || reducedMotion() || !dialog.open) { done(); return; }
  closing.set(dialog, done); dialog.inert = true; dialog.classList.add('dialog-closing');
  dialog.addEventListener('animationend', ended); timer = setTimeout(done, 220);
}
