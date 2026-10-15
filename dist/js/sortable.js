// # 手机长按后才拦截移动；普通滑动照常滚动，取消时恢复原顺序。
export function installSorting({ onSort, onError, root = document }) {
  let pending = null, active = null, suppressUntil = 0;
  const clearPending = () => { if (pending) clearTimeout(pending.timer); pending = null; };
  const items = list => [...list.children].filter(child => child.hasAttribute('data-sort-item'));
  const cancel = () => {
    clearPending();
    if (active) {
      suppressUntil = performance.now() + 450;
      for (const item of active.original) if (item.parentElement === active.list) active.list.append(item);
      active.item.classList.remove('is-sorting'); active.ghost.remove(); active = null; document.body.classList.remove('resident-sorting');
    }
  };
  const descriptor = list => ({ kind: list.dataset.sortList, containerId: list.dataset.container, species: list.dataset.species || '' });
  const persist = (list, order, focusItem) => { try { onSort({ ...descriptor(list), order, focusItem }); } catch (error) { onError(error); } };
  const begin = (target, x, y, type) => {
    if (document.querySelector('dialog[open]')) return;
    const item = target.closest('[data-sort-item]'), list = item?.parentElement;
    if (!list?.dataset.sortList || items(list).length < 2) return;
    clearPending();
    pending = { item, list, x, y, type, timer: setTimeout(() => {
      if (!item.isConnected) { clearPending(); return; }
      const preview = item.querySelector('[data-sort-preview]') || item, rect = preview.getBoundingClientRect(), ghost = preview.cloneNode(true);
      ghost.classList.add('sort-ghost'); ghost.setAttribute('aria-hidden','true'); ghost.inert=true; ghost.removeAttribute('id'); ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      Object.assign(ghost.style, { width: rect.width + 'px', height: rect.height + 'px', left: rect.left + 'px', top: rect.top + 'px' });
      document.body.append(ghost); item.classList.add('is-sorting'); document.body.classList.add('resident-sorting');
      active = { item, list, ghost, original: items(list), offsetX: x - rect.left, offsetY: y - rect.top, type };
      pending = null;
    }, 420) };
  };
  const directItem = (node, list) => {
    while (node && node.parentElement !== list) node = node.parentElement;
    return node?.hasAttribute('data-sort-item') ? node : null;
  };
  const move = (x, y, event) => {
    if (pending && Math.hypot(x - pending.x, y - pending.y) > 9) clearPending();
    if (!active) return;
    if (!active.item.isConnected) { cancel(); return; }
    if (event.cancelable) event.preventDefault();
    const { item, list, ghost } = active; ghost.style.left = x - active.offsetX + 'px'; ghost.style.top = y - active.offsetY + 'px';
    const hit = directItem(document.elementFromPoint(x, y), list);
    if (hit && hit !== item) {
      const rect = hit.getBoundingClientRect(), axis = list.dataset.sortAxis, current = item.getBoundingClientRect();
      const rowDifference = (rect.top + rect.height / 2) - (current.top + current.height / 2);
      const before = axis === 'vertical' ? y < rect.top + rect.height / 2 : axis === 'both' && Math.abs(rowDifference) > 4 ? rowDifference < 0 : x < rect.left + rect.width / 2;
      list.insertBefore(item, before ? hit : hit.nextSibling);
    }
    const margin = 70;
    if (y < margin) window.scrollBy(0, -12); else if (y > innerHeight - margin) window.scrollBy(0, 12);
    if (list.scrollWidth > list.clientWidth) { const rect = list.getBoundingClientRect(); if (x < rect.left + 25) list.scrollLeft -= 9; else if (x > rect.right - 25) list.scrollLeft += 9; }
  };
  const end = event => {
    clearPending(); if (!active) return;
    if (event.cancelable) event.preventDefault();
    const { item, list, ghost, original } = active, order = items(list).map(node => node.dataset.sortItem);
    item.classList.remove('is-sorting'); ghost.remove(); active = null; document.body.classList.remove('resident-sorting'); suppressUntil = performance.now() + 450;
    if (order.some((key, index) => key !== original[index]?.dataset.sortItem)) persist(list, order, item.dataset.sortItem);
  };
  root.addEventListener('pointerdown', event => { if (event.pointerType !== 'touch' && event.button === 0) begin(event.target, event.clientX, event.clientY, 'pointer'); });
  root.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') move(event.clientX, event.clientY, event); }, { passive: false });
  root.addEventListener('pointerup', event => { if (event.pointerType !== 'touch') end(event); });
  root.addEventListener('pointercancel', event => { if (event.pointerType !== 'touch') cancel(); });
  root.addEventListener('touchstart', event => { if (event.touches.length === 1) { const point = event.touches[0]; begin(event.target, point.clientX, point.clientY, 'touch'); } else cancel(); }, { passive: true });
  root.addEventListener('touchmove', event => { if (event.touches.length === 1) { const point = event.touches[0]; move(point.clientX, point.clientY, event); } else cancel(); }, { passive: false });
  root.addEventListener('touchend', end, { passive: false }); root.addEventListener('touchcancel', cancel);
  root.addEventListener('click', event => { if (performance.now() < suppressUntil && event.target.closest('[data-sort-item]')) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  root.addEventListener('contextmenu', event => { if (event.target.closest('[data-sort-item]')) event.preventDefault(); });
  root.addEventListener('dragstart', event => { if (event.target.closest('[data-sort-item]')) event.preventDefault(); });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancel(); return; }
    if (!event.altKey || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) || document.querySelector('dialog[open]')) return;
    const item = event.target.closest('[data-sort-item]'), list = item?.parentElement; if (!list?.dataset.sortList) return;
    event.preventDefault(); const nodes = items(list), index = nodes.indexOf(item), next = index + (['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1);
    if (!nodes[next]) return; [nodes[index], nodes[next]] = [nodes[next], nodes[index]]; persist(list, nodes.map(node => node.dataset.sortItem), item.dataset.sortItem);
  });
  window.addEventListener('blur', cancel); return { cancel };
}
