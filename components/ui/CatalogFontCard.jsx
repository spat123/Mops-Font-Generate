import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  /** Плитка: при наведении (оверлей «Открыть»/«Скачать») скрывать строку метаданных внизу карточки */
  fadeFooterWithHoverUi = false,
  /** Превью внизу оставшейся высоты карточки (режим ROW) */
  pinPreviewToBottom = false,
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
    `group relative flex flex-col rounded-lg bg-surface-card p-4 select-none transition-colors duration-100 ${
      selected ? '' : 'hover:bg-gray-50'
    }`,
    minHeightClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (selected) {
      setShowHoverUi(false);
    }
  }, [selected]);

  const showInteractiveUi = !selected && (busy || showHoverUi);
  const actionsClassName =
    'absolute right-2 top-2 z-30 max-w-[min(100%,12rem)] transition-opacity duration-75 ' +
    (showInteractiveUi ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0');

  const handlePointerEnter = useCallback(() => {
    if (selected) return;
    setShowHoverUi(true);
  }, [selected]);

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
    if (selected) return;
    setShowHoverUi(true);
  }, [selected]);

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

  const resolvedHoverOverlay = useMemo(() => {
    if (!hoverOverlay) return null;
    if (!React.isValidElement(hoverOverlay)) return hoverOverlay;
    return React.cloneElement(hoverOverlay, {
      onRequestCloseHoverUi: handleRequestCloseHoverUi,
    });
  }, [hoverOverlay, handleRequestCloseHoverUi]);

  const showHoverOverlay = Boolean(resolvedHoverOverlay) && !selected && showHoverUi;
  // ВАЖНО: `will-change` и постоянные transforms на тысячах карточек могут разгонять Layerize/память/GC.
  // Для массового списка оставляем только opacity-переход.
  const hoverOverlayClassName =
    'pointer-events-none absolute -inset-1 z-20 transition-opacity duration-75 ' +
    (showHoverOverlay ? 'opacity-100' : 'opacity-0');

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
      {actions ? <div className={actionsClassName}>{actions}</div> : null}
      {resolvedHoverOverlay ? (
        <div className={hoverOverlayClassName} aria-hidden={!showHoverOverlay}>
          {resolvedHoverOverlay}
        </div>
      ) : null}
      {selected ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-accent" />
          <div className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-accent/12" />
          {selectionOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-20">{selectionOverlay}</div>
          ) : null}
        </>
      ) : null}
      <div className={titleClassName}>{title}</div>
      {pinPreviewToBottom ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-end">{preview}</div>
      ) : (
        preview
      )}
      {footer != null ? (
        fadeFooterWithHoverUi ? (
          <div
            className={
              !selected && showHoverUi && resolvedHoverOverlay
                ? 'transition-opacity duration-100 opacity-0'
                : 'transition-opacity duration-100'
            }
          >
            {footer}
          </div>
        ) : (
          footer
        )
      ) : null}
    </div>
  );
}
