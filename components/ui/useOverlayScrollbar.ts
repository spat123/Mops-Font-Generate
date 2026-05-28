import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEventHandler } from 'react';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import type { OverlayThumbMetrics } from './OverlayScrollbar';

export type UseOverlayScrollbarOptions = {
  hideDelayMs?: number;
  trackInsetPx?: number;
};

type ScrollLayout = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

type DragState = {
  startY: number;
  startScrollTop: number;
};

type ScrollMetrics = {
  el: HTMLElement;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  trackHeight: number;
  thumbHeight: number;
  maxScroll: number;
  maxThumbTravel: number;
};

export function useOverlayScrollbar({ hideDelayMs = 700, trackInsetPx = 8 }: UseOverlayScrollbarOptions = {}) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const [scrollTarget, setScrollTarget] = useState<HTMLElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollLayout, setScrollLayout] = useState<ScrollLayout>({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
  });

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
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
    hideTimerRef.current = window.setTimeout(() => {
      if (!dragStateRef.current) {
        setScrollbarVisible(false);
      }
      hideTimerRef.current = null;
    }, hideDelayMs);
  }, [clearHideTimer, hideDelayMs, syncScrollLayout]);

  const setScrollElement = useCallback(
    (node: HTMLElement | null) => {
      const el = node instanceof HTMLElement ? node : null;
      scrollRef.current = el;
      setScrollTarget(el);
      syncScrollLayout();
    },
    [syncScrollLayout],
  );

  const getScrollMetrics = useCallback((): ScrollMetrics | null => {
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
    (thumbTop: number) => {
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
    (target: EventTarget | null, pointerId: number) => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      setIsDragging(false);
      if (target instanceof Element && target.releasePointerCapture) {
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

  const onThumbPointerDown: PointerEventHandler<HTMLDivElement> = useCallback(
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

  const onTrackPointerDown: PointerEventHandler<HTMLDivElement> = useCallback(
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

  const onScrollbarPointerMove: PointerEventHandler<HTMLDivElement> = useCallback(
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

  const onScrollbarPointerUp: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      endDrag(event.currentTarget, event.pointerId);
    },
    [endDrag],
  );

  useIsomorphicLayoutEffect(() => {
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
    let timerId: number | null = null;
    const mo = new MutationObserver(() => {
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => {
        timerId = null;
        syncScrollLayout();
      }, 64);
    });
    mo.observe(scrollTarget, { subtree: true, childList: true, attributes: true, characterData: true });
    return () => {
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
      mo.disconnect();
    };
  }, [scrollTarget, syncScrollLayout]);

  const overlayThumb = useMemo((): OverlayThumbMetrics | null => {
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
