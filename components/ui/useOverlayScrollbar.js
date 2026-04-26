import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export function useOverlayScrollbar({ hideDelayMs = 700, trackInsetPx = 8 } = {}) {
  const scrollRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const [scrollLayout, setScrollLayout] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
  });

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const syncScrollLayout = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollLayout({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    });
  }, []);

  const showScrollbarTemporarily = useCallback(() => {
    syncScrollLayout();
    setScrollbarVisible(true);
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setScrollbarVisible(false);
      hideTimerRef.current = null;
    }, hideDelayMs);
  }, [clearHideTimer, hideDelayMs, syncScrollLayout]);

  const setScrollElement = useCallback(
    (node) => {
      scrollRef.current = node instanceof HTMLElement ? node : null;
      syncScrollLayout();
    },
    [syncScrollLayout],
  );

  useLayoutEffect(() => {
    syncScrollLayout();
  }, [syncScrollLayout]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => showScrollbarTemporarily();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      clearHideTimer();
    };
  }, [clearHideTimer, showScrollbarTemporarily]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => syncScrollLayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncScrollLayout]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof MutationObserver === 'undefined') return undefined;
    let timerId = null;
    const mo = new MutationObserver(() => {
      if (timerId != null) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        timerId = null;
        syncScrollLayout();
      }, 64);
    });
    mo.observe(el, { subtree: true, childList: true, attributes: true, characterData: true });
    return () => {
      if (timerId != null) {
        clearTimeout(timerId);
      }
      mo.disconnect();
    };
  }, [syncScrollLayout]);

  const overlayThumb = useMemo(() => {
    const { scrollTop, scrollHeight, clientHeight } = scrollLayout;
    if (clientHeight < 1 || scrollHeight <= clientHeight + 1) return null;
    const trackHeight = clientHeight - 2 * trackInsetPx;
    if (trackHeight < 24) return null;
    const thumbHeight = Math.max(24, Math.round((clientHeight / scrollHeight) * trackHeight));
    const maxScroll = scrollHeight - clientHeight;
    const top = maxScroll > 0 ? (scrollTop / maxScroll) * (trackHeight - thumbHeight) : 0;
    return { top, thumbHeight };
  }, [scrollLayout, trackInsetPx]);

  return {
    overlayThumb,
    scrollbarVisible,
    setScrollElement,
    syncScrollLayout,
  };
}
