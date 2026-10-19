// # 弹窗在退出动画结束后移除；快速切换和减少动态效果均有同步结束路径。
const closing = new WeakMap();
export const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
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
