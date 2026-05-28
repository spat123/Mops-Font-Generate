import { useSyncExternalStore } from 'react';

const EMPTY_UNSUBSCRIBE = () => () => {};
const ZERO_SNAPSHOT = () => 0;

type ElementStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
};

const scrollStoreByElement = new WeakMap<HTMLElement, ElementStore>();
const widthStoreByElement = new WeakMap<HTMLElement, ElementStore>();

function getOrCreateScrollStore(el: HTMLElement | null): ElementStore | null {
  if (!el) return null;
  let store = scrollStoreByElement.get(el);
  if (store) return store;

  const listeners = new Set<() => void>();
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
export function offsetTopToScrollAncestor(el: HTMLElement | null, scrollAncestor: HTMLElement | null) {
  if (!el || !scrollAncestor) return 0;
  let top = 0;
  let n: HTMLElement | null = el;
  while (n && n !== scrollAncestor) {
    top += n.offsetTop;
    n = n.offsetParent instanceof HTMLElement ? n.offsetParent : null;
  }
  if (n === scrollAncestor) return top;
  return 0;
}

export function subscribeScroll(el: HTMLElement, onChange: () => void) {
  el.addEventListener('scroll', onChange, { passive: true });
  return () => el.removeEventListener('scroll', onChange);
}

export function useScrollTop(scrollEl: HTMLElement | null) {
  const store = getOrCreateScrollStore(scrollEl);
  return useSyncExternalStore(
    store?.subscribe ?? EMPTY_UNSUBSCRIBE,
    store?.getSnapshot ?? ZERO_SNAPSHOT,
    ZERO_SNAPSHOT,
  );
}

export function subscribeResize(el: HTMLElement, onChange: () => void) {
  if (typeof ResizeObserver === 'undefined') return () => {};
  const ro = new ResizeObserver(() => onChange());
  ro.observe(el);
  return () => ro.disconnect();
}

function getOrCreateWidthStore(el: HTMLElement | null): ElementStore | null {
  if (!el) return null;
  let store = widthStoreByElement.get(el);
  if (store) return store;

  const listeners = new Set<() => void>();
  let width = el.clientWidth ?? 0;
  let ro: ResizeObserver | null = null;

  const emitChange = (next: number) => {
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
          const first = entries[0];
          const next = first?.contentRect?.width ?? el.clientWidth ?? 0;
          emitChange(Math.round(next));
        });
        ro.observe(el);
      }
      emitChange(Math.round(el.clientWidth ?? 0));
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

export function useClientWidth(el: HTMLElement | null) {
  const store = getOrCreateWidthStore(el);
  return useSyncExternalStore(
    store?.subscribe ?? EMPTY_UNSUBSCRIBE,
    store?.getSnapshot ?? ZERO_SNAPSHOT,
    ZERO_SNAPSHOT,
  );
}
