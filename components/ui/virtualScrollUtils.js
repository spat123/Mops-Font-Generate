import { useSyncExternalStore } from 'react';

const EMPTY_UNSUBSCRIBE = () => {};
const ZERO_SNAPSHOT = () => 0;
const scrollStoreByElement = new WeakMap();
const widthStoreByElement = new WeakMap();

function getOrCreateScrollStore(el) {
  if (!el) return null;
  let store = scrollStoreByElement.get(el);
  if (store) return store;

  const listeners = new Set();
  let scrollTop = 0;

  const emitChange = () => {
    const next = el.scrollTop ?? 0;
    if (next === scrollTop) return;
    scrollTop = next;
    listeners.forEach((listener) => listener());
  };

  store = {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        el.addEventListener('scroll', emitChange, { passive: true });
      }
      emitChange();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          el.removeEventListener('scroll', emitChange);
        }
      };
    },
    getSnapshot() {
      return scrollTop;
    },
  };

  scrollStoreByElement.set(el, store);
  return store;
}

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
  const store = getOrCreateScrollStore(scrollEl);
  return useSyncExternalStore(
    store?.subscribe ?? EMPTY_UNSUBSCRIBE,
    store?.getSnapshot ?? ZERO_SNAPSHOT,
    ZERO_SNAPSHOT,
  );
}

export function subscribeResize(el, onChange) {
  if (!el || typeof ResizeObserver === 'undefined') return () => {};
  const ro = new ResizeObserver(() => onChange());
  ro.observe(el);
  return () => ro.disconnect();
}

function getOrCreateWidthStore(el) {
  if (!el) return null;
  let store = widthStoreByElement.get(el);
  if (store) return store;

  const listeners = new Set();
  let width = el?.clientWidth ?? 0;
  let ro = null;

  const emitChange = (next) => {
    const w = Number.isFinite(next) ? next : 0;
    if (w === width) return;
    width = w;
    listeners.forEach((listener) => listener());
  };

  store = {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        ro = new ResizeObserver((entries) => {
          const first = entries?.[0];
          // contentRect.width берётся из ResizeObserver без forced layout
          const next = first?.contentRect?.width ?? (el?.clientWidth ?? 0);
          emitChange(Math.round(next));
        });
        ro.observe(el);
      }
      // initial snapshot
      emitChange(Math.round(el?.clientWidth ?? 0));
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          ro?.disconnect();
          ro = null;
        }
      };
    },
    getSnapshot() {
      return width;
    },
  };

  widthStoreByElement.set(el, store);
  return store;
}

export function useClientWidth(el) {
  const store = getOrCreateWidthStore(el);
  return useSyncExternalStore(
    store?.subscribe ?? EMPTY_UNSUBSCRIBE,
    store?.getSnapshot ?? ZERO_SNAPSHOT,
    ZERO_SNAPSHOT,
  );
}
