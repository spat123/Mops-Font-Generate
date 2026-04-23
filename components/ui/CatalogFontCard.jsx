import React, { useCallback, useRef, useState } from 'react';

export function CatalogFontCard({
  busy = false,
  actions = null,
  title,
  preview,
  footer = null,
  minHeightClass = '',
  className = '',
  selected = false,
  selectionOverlay = null,
  hoverOverlay = null,
  titleClassName = 'truncate text-sm font-medium text-gray-800',
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  draggable = false,
  onDragStart,
  onDragEnd,
}) {
  const [showHoverUi, setShowHoverUi] = useState(false);
  const rootRef = useRef(null);
  const rootClassName = [
    'group relative flex flex-col rounded-lg bg-surface-card p-4 select-none transition-colors duration-100 hover:bg-gray-50',
    minHeightClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const showInteractiveUi = busy || showHoverUi;
  const actionsClassName =
    'absolute right-2 top-2 z-30 max-w-[min(100%,12rem)] transition-opacity duration-75 ' +
    (showInteractiveUi ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0');

  const handlePointerEnter = useCallback(() => {
    setShowHoverUi(true);
  }, []);

  const handlePointerLeave = useCallback(
    (event) => {
      setShowHoverUi(false);
      onPointerLeave?.(event);
    },
    [onPointerLeave],
  );

  const handlePointerCancel = useCallback(
    (event) => {
      setShowHoverUi(false);
      onPointerCancel?.(event);
    },
    [onPointerCancel],
  );

  const handleFocusCapture = useCallback(() => {
    setShowHoverUi(true);
  }, []);

  const handleBlurCapture = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setShowHoverUi(false);
  }, []);

  const handleRequestCloseHoverUi = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const rootNode = rootRef.current;
      if (!rootNode) return;
      const focusInside =
        typeof document !== 'undefined' ? rootNode.contains(document.activeElement) : false;
      if (rootNode.matches(':hover') || focusInside) return;
      setShowHoverUi(false);
    });
  }, []);

  const resolvedHoverOverlay =
    hoverOverlay && React.isValidElement(hoverOverlay)
      ? React.cloneElement(hoverOverlay, {
          onRequestCloseHoverUi: handleRequestCloseHoverUi,
        })
      : hoverOverlay;

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {actions && (showInteractiveUi || selected) ? (
        <div className={actionsClassName}>{actions}</div>
      ) : null}
      {resolvedHoverOverlay && !selected && showHoverUi ? (
        <div className="pointer-events-none absolute -inset-1 z-20 opacity-100 transition-opacity duration-75">
          {resolvedHoverOverlay}
        </div>
      ) : null}
      {selected ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-red-500" />
          <div className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-red-500/12" />
          {selectionOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-20">{selectionOverlay}</div>
          ) : null}
        </>
      ) : null}
      <div className={titleClassName}>{title}</div>
      {preview}
      {footer}
    </div>
  );
}
