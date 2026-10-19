// # 弹窗在退出动画结束后移除；快速切换和减少动态效果均有同步结束路径。
const closing = new WeakMap();
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
export function dismissDialog(dialog, after = () => {}, immediate = false) {
  if (!dialog) { after(); return; }
  if (closing.has(dialog)) { if (immediate) finishDialogMotion(dialog); return; }
  let timer, finished = false;
  const done = () => {
    if (finished) return; finished = true; clearTimeout(timer); closing.delete(dialog);
    dialog.removeEventListener('animationend', ended); if (dialog.open) dialog.close(); after();
  };
  const ended = event => { if (event.target === dialog && event.animationName === 'dialog-exit') done(); };
  if (immediate || reducedMotion() || !dialog.open) { done(); return; }
  closing.set(dialog, done); dialog.inert = true; dialog.classList.add('dialog-closing');
  dialog.addEventListener('animationend', ended); timer = setTimeout(done, 220);
}
