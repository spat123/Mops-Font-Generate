import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function FloatingTooltip({
  content,
  anchorRect,
  side: sideProp = 'top',
  className = '',
  maxWidthClass = 'max-w-[18rem]',
  zIndexClass = 'z-[600]',
}) {
  const bubbleRef = useRef(null);
  const [pos, setPos] = useState(() => ({
    ready: false,
    side: 'top',
    top: 0,
    left: 0,
    arrowLeft: 0,
  }));

  useLayoutEffect(() => {
    if (!content) return;
    const bEl = bubbleRef.current;
    if (!(bEl instanceof HTMLElement)) return;
    if (!anchorRect) return;

    const r = anchorRect;
    const b = bEl.getBoundingClientRect();

    const viewportW = window.innerWidth || 0;
    const viewportH = window.innerHeight || 0;
    const pad = 8;
    const gap = 10;

    const canTop = r.top >= b.height + gap + pad;
    const canBottom = viewportH - r.bottom >= b.height + gap + pad;

    let side = sideProp;
    if (sideProp === 'top' && !canTop && canBottom) side = 'bottom';
    else if (sideProp === 'bottom' && !canBottom && canTop) side = 'top';

    const centerX = r.left + r.width / 2;
    const leftUnclamped = centerX - b.width / 2;
    const left = Math.max(pad, Math.min(leftUnclamped, Math.max(pad, viewportW - pad - b.width)));
    const top = side === 'top' ? r.top - b.height - gap : r.bottom + gap;

    const arrowPad = 10;
    const arrowLeft = Math.max(arrowPad, Math.min(centerX - left, Math.max(arrowPad, b.width - arrowPad)));

    setPos({ ready: true, side, top, left, arrowLeft });
  }, [content, anchorRect, sideProp, maxWidthClass]);

  if (content == null || content === '' || !anchorRect) return null;

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={bubbleRef}
          className={`pointer-events-none fixed ${zIndexClass} rounded bg-gray-900 px-2 py-1 text-xs font-normal leading-snug text-white shadow-sm ${maxWidthClass} ${className}`.trim()}
          style={{
            top: pos.top,
            left: pos.left,
            opacity: pos.ready ? 1 : 0,
            transition: 'opacity 120ms ease-out',
          }}
          role="status"
          aria-live="polite"
        >
          {content}
          <div
            className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900"
            style={{
              left: pos.arrowLeft,
              top: pos.side === 'bottom' ? -4 : undefined,
              bottom: pos.side === 'top' ? -4 : undefined,
            }}
            aria-hidden
          />
        </div>,
        document.body,
      )
    : null;
}

export function Tooltip({
  content,
  children,
  className = '',
  maxWidthClass = 'max-w-[18rem]',
  as = 'span',
  side: sideProp = 'auto',
  openDelayMs = 500,
  closeDelayMs = 80,
  ...rest
}) {
  if (content == null || content === '') return children;

  const Tag = as;
  const triggerRef = useRef(null);
  const bubbleRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => ({
    ready: false,
    side: 'top',
    top: 0,
    left: 0,
    arrowLeft: 0,
  }));

  const updatePos = useCallback(() => {
    const triggerEl = triggerRef.current;
    const bubbleEl = bubbleRef.current;
    if (!(triggerEl instanceof HTMLElement) || !(bubbleEl instanceof HTMLElement)) return;

    const r = triggerEl.getBoundingClientRect();
    const b = bubbleEl.getBoundingClientRect();

    const viewportW = window.innerWidth || 0;
    const viewportH = window.innerHeight || 0;
    const pad = 8;
    const gap = 10;

    const canTop = r.top >= b.height + gap + pad;
    const canBottom = viewportH - r.bottom >= b.height + gap + pad;

    let side = sideProp === 'auto' ? 'top' : sideProp;
    if (sideProp === 'auto') {
      if (!canTop && canBottom) side = 'bottom';
      else if (canTop) side = 'top';
      else side = 'bottom';
    } else if (sideProp === 'top' && !canTop && canBottom) {
      side = 'bottom';
    } else if (sideProp === 'bottom' && !canBottom && canTop) {
      side = 'top';
    }

    const centerX = r.left + r.width / 2;
    const leftUnclamped = centerX - b.width / 2;
    const left = Math.max(pad, Math.min(leftUnclamped, Math.max(pad, viewportW - pad - b.width)));
    const top = side === 'top' ? r.top - b.height - gap : r.bottom + gap;

    const arrowPad = 10;
    const arrowLeft = Math.max(arrowPad, Math.min(centerX - left, Math.max(arrowPad, b.width - arrowPad)));

    setPos({ ready: true, side, top, left, arrowLeft });
  }, [sideProp]);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current != null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const onOpen = useCallback(() => {
    clearTimers();
    const delay = Math.max(0, Number(openDelayMs) || 0);
    if (delay === 0) {
      setOpen(true);
      return;
    }
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      setOpen(true);
    }, delay);
  }, [clearTimers, openDelayMs]);

  const onClose = useCallback(() => {
    clearTimers();
    const delay = Math.max(0, Number(closeDelayMs) || 0);
    if (delay === 0) {
      setOpen(false);
      setPos((p) => ({ ...p, ready: false }));
      return;
    }
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
      setPos((p) => ({ ...p, ready: false }));
    }, delay);
  }, [clearTimers, closeDelayMs]);

  useLayoutEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => updatePos());
    return () => cancelAnimationFrame(id);
  }, [open, updatePos, content, maxWidthClass]);

  useEffect(() => {
    if (!open) return;

    const onWin = () => updatePos();
    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);

    const triggerEl = triggerRef.current;
    const bubbleEl = bubbleRef.current;

    let ro = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(() => updatePos());
      if (triggerEl instanceof HTMLElement) ro.observe(triggerEl);
      if (bubbleEl instanceof HTMLElement) ro.observe(bubbleEl);
    }

    return () => {
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
      if (ro) ro.disconnect();
    };
  }, [open, updatePos]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const {
    onMouseEnter: restOnMouseEnter,
    onMouseLeave: restOnMouseLeave,
    onFocus: restOnFocus,
    onBlur: restOnBlur,
    ...restProps
  } = rest;

  const triggerProps = useMemo(
    () => ({
      ...restProps,
      ref: triggerRef,
      onMouseEnter: (e) => {
        restOnMouseEnter?.(e);
        onOpen();
      },
      onMouseLeave: (e) => {
        restOnMouseLeave?.(e);
        onClose();
      },
      onFocus: (e) => {
        restOnFocus?.(e);
        onOpen();
      },
      onBlur: (e) => {
        restOnBlur?.(e);
        onClose();
      },
    }),
    [restProps, restOnMouseEnter, restOnMouseLeave, restOnFocus, restOnBlur, onOpen, onClose],
  );

  return (
    <>
      <Tag className={`inline-flex min-w-0 ${className}`.trim()} {...triggerProps}>
      {children}
      </Tag>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={bubbleRef}
              className={`pointer-events-none fixed z-[500] rounded bg-gray-900 px-2 py-1 text-xs font-normal leading-snug text-white shadow-sm ${maxWidthClass}`}
              style={{
                top: pos.top,
                left: pos.left,
                opacity: pos.ready ? 1 : 0,
                transition: 'opacity 120ms ease-out',
              }}
              role="tooltip"
              aria-hidden={!open}
            >
              {content}
              <div
                className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900"
                style={{
                  left: pos.arrowLeft,
                  top: pos.side === 'bottom' ? -4 : undefined,
                  bottom: pos.side === 'top' ? -4 : undefined,
                }}
                aria-hidden
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
