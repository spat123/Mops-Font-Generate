import { useSyncExternalStore } from 'react';

/** Сумма offsetTop по цепочке offsetParent до scroll-контейнера */
export function offsetTopToScrollAncestor(el, scrollAncestor) {
  if (!el || !scrollAncestor) return 0;
  let top = 0;
  let n = el;
  while (n && n !== scrollAncestor) {
    top += n.offsetTop;
    n = n.offsetParent;
  }
  if (n === scrollAncestor) return top;
  return 0;
}

export function subscribeScroll(el, onChange) {
  if (!el) return () => {};
  el.addEventListener('scroll', onChange, { passive: true });
  return () => el.removeEventListener('scroll', onChange);
}

export function useScrollTop(scrollEl) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeScroll(scrollEl, onStoreChange),
    () => scrollEl?.scrollTop ?? 0,
    () => 0,
  );
}

export function subscribeResize(el, onChange) {
  if (!el || typeof ResizeObserver === 'undefined') return () => {};
  const ro = new ResizeObserver(() => onChange());
  ro.observe(el);
  return () => ro.disconnect();
}

export function useClientWidth(el) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeResize(el, onStoreChange),
    () => el?.clientWidth ?? 0,
    () => 0,
  );
}
