import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export function useOverlayScrollbar({ hideDelayMs = 700, trackInsetPx = 8 } = {}) {
  const scrollRef = useRef(null);
  /** Нужен в зависимостях эффектов: область появляется после загрузки/фильтров, иначе scroll-слушатель не навесится. */
  const [scrollTarget, setScrollTarget] = useState(null);
  const hideTimerRef = useRef(null);
  const dragStateRef = useRef(null);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
      if (!dragStateRef.current) {
        setScrollbarVisible(false);
      }
      hideTimerRef.current = null;
    }, hideDelayMs);
  }, [clearHideTimer, hideDelayMs, syncScrollLayout]);

  const setScrollElement = useCallback(
    (node) => {
      const el = node instanceof HTMLElement ? node : null;
      scrollRef.current = el;
      setScrollTarget(el);
      syncScrollLayout();
    },
    [syncScrollLayout],
  );

  const getScrollMetrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return null;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (clientHeight < 1 || scrollHeight <= clientHeight + 1) return null;
    const trackHeight = clientHeight - 2 * trackInsetPx;
    if (trackHeight < 24) return null;
    const thumbHeight = Math.max(24, Math.round((clientHeight / scrollHeight) * trackHeight));
    const maxScroll = scrollHeight - clientHeight;
    const maxThumbTravel = Math.max(0, trackHeight - thumbHeight);
    return { el, scrollTop, scrollHeight, clientHeight, trackHeight, thumbHeight, maxScroll, maxThumbTravel };
  }, [trackInsetPx]);

  const applyScrollFromThumbTop = useCallback(
    (thumbTop) => {
      const metrics = getScrollMetrics();
      if (!metrics || metrics.maxScroll <= 0) return;
      const travel = metrics.maxThumbTravel;
      const ratio = travel > 0 ? Math.min(1, Math.max(0, thumbTop / travel)) : 0;
      metrics.el.scrollTop = ratio * metrics.maxScroll;
      syncScrollLayout();
    },
    [getScrollMetrics, syncScrollLayout],
  );

  const endDrag = useCallback(
    (target, pointerId) => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      setIsDragging(false);
      if (target?.releasePointerCapture) {
        try {
          target.releasePointerCapture(pointerId);
        } catch {
          /* already released */
        }
      }
      showScrollbarTemporarily();
    },
    [showScrollbarTemporarily],
  );

  const onThumbPointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;
      const metrics = getScrollMetrics();
      if (!metrics?.el) return;
      event.preventDefault();
      event.stopPropagation();
      dragStateRef.current = {
        startY: event.clientY,
        startScrollTop: metrics.el.scrollTop,
      };
      setIsDragging(true);
      setScrollbarVisible(true);
      clearHideTimer();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [clearHideTimer, getScrollMetrics],
  );

  const onTrackPointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;
      if (event.target !== event.currentTarget) return;
      const metrics = getScrollMetrics();
      if (!metrics?.el) return;
      event.preventDefault();
      const trackRect = event.currentTarget.getBoundingClientRect();
      const yInTrack = event.clientY - trackRect.top - trackInsetPx;
      const thumbTop = Math.min(
        metrics.maxThumbTravel,
        Math.max(0, yInTrack - metrics.thumbHeight / 2),
      );
      applyScrollFromThumbTop(thumbTop);
      dragStateRef.current = {
        startY: event.clientY,
        startScrollTop: metrics.el.scrollTop,
      };
      setIsDragging(true);
      setScrollbarVisible(true);
      clearHideTimer();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [applyScrollFromThumbTop, clearHideTimer, getScrollMetrics, trackInsetPx],
  );

  const onScrollbarPointerMove = useCallback(
    (event) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const metrics = getScrollMetrics();
      if (!metrics?.el) return;
      const deltaY = event.clientY - drag.startY;
      const scrollDelta =
        metrics.maxThumbTravel > 0 ? (deltaY / metrics.maxThumbTravel) * metrics.maxScroll : 0;
      metrics.el.scrollTop = Math.min(
        metrics.maxScroll,
        Math.max(0, drag.startScrollTop + scrollDelta),
      );
      syncScrollLayout();
      setScrollbarVisible(true);
      clearHideTimer();
    },
    [clearHideTimer, getScrollMetrics, syncScrollLayout],
  );

  const onScrollbarPointerUp = useCallback(
    (event) => {
      endDrag(event.currentTarget, event.pointerId);
    },
    [endDrag],
  );

  useLayoutEffect(() => {
    syncScrollLayout();
  }, [syncScrollLayout, scrollTarget]);

  useEffect(() => {
    if (!scrollTarget) return undefined;
    const onScroll = () => showScrollbarTemporarily();
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
      clearHideTimer();
    };
  }, [scrollTarget, clearHideTimer, showScrollbarTemporarily]);

  useEffect(() => {
    if (!scrollTarget || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => syncScrollLayout());
    ro.observe(scrollTarget);
    return () => ro.disconnect();
  }, [scrollTarget, syncScrollLayout]);

  useEffect(() => {
    if (!scrollTarget || typeof MutationObserver === 'undefined') return undefined;
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
    mo.observe(scrollTarget, { subtree: true, childList: true, attributes: true, characterData: true });
    return () => {
      if (timerId != null) {
        clearTimeout(timerId);
      }
      mo.disconnect();
    };
  }, [scrollTarget, syncScrollLayout]);

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
    isDragging,
    setScrollElement,
    syncScrollLayout,
    onTrackPointerDown,
    onThumbPointerDown,
    onScrollbarPointerMove,
    onScrollbarPointerUp,
    trackInsetPx,
  };
}
