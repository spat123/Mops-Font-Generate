import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

export type CatalogFontCardHoverSurface = 'neutral' | 'accent';

export type CatalogFontCardProps = {
  busy?: boolean;
  actions?: ReactNode;
  title?: ReactNode;
  preview?: ReactNode;
  footer?: ReactNode;
  minHeightClass?: string;
  rootStyle?: CSSProperties | null;
  containIntrinsicHeightPx?: number | null;
  className?: string;
  selected?: boolean;
  selectionOverlay?: ReactNode;
  hoverOverlay?: ReactNode;
  /** Фон при наведении / touch-активации: `accent` — как ROW-режим. */
  hoverSurface?: CatalogFontCardHoverSurface;
  fadeFooterWithHoverUi?: boolean;
  pinPreviewToBottom?: boolean;
  pinPreviewColumnClassName?: string;
  titleClassName?: string;
  onClick?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLDivElement>) => void;
};

export function CatalogFontCard({
  busy = false,
  actions = null,
  title,
  preview,
  footer = null,
  minHeightClass = '',
  rootStyle = null,
  containIntrinsicHeightPx = null,
  className = '',
  selected = false,
  selectionOverlay = null,
  hoverOverlay = null,
  hoverSurface = 'neutral',
  /** Плитка: при наведении (оверлей «Открыть»/«Скачать») скрывать строку метаданных внизу карточки */
  fadeFooterWithHoverUi = false,
  /** Превью внизу оставшейся высоты карточки (режим ROW) */
  pinPreviewToBottom = false,
  /** Доп. классы для колонки превью при `pinPreviewToBottom` (например `items-start` для выравнивания влево) */
  pinPreviewColumnClassName = '',
  titleClassName = 'truncate text-sm font-medium text-gray-800',
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  draggable = false,
  onDragStart,
  onDragEnd,
}: CatalogFontCardProps) {
  const [showHoverUi, setShowHoverUi] = useState(false);
  const [touchUiPinned, setTouchUiPinned] = useState(false);
  const [downloadUiPinned, setDownloadUiPinned] = useState(false);
  const [openUiPinned, setOpenUiPinned] = useState(false);
  const [prefersCoarsePointer, setPrefersCoarsePointer] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setPrefersCoarsePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const hoverUiActive = showHoverUi || downloadUiPinned || openUiPinned;
  const accentSurface = hoverSurface === 'accent';
  const accentSurfaceLive = accentSurface && !selected && hoverUiActive;

  const rootClassName = [
    'group relative flex flex-col rounded-lg bg-surface-card p-4 select-none transition-colors duration-100',
    selected
      ? ''
      : accentSurface
        ? 'border border-transparent hover:!bg-accent hover:border-accent'
        : 'hover:bg-gray-50',
    accentSurfaceLive ? '!bg-accent !border-accent' : '',
    minHeightClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentVisibilityStyle: CSSProperties | undefined =
    selected || typeof window === 'undefined'
      ? undefined
      : {
          contentVisibility: 'auto',
          containIntrinsicSize:
            containIntrinsicHeightPx != null
              ? `auto ${Math.round(containIntrinsicHeightPx)}px`
              : pinPreviewToBottom
                ? 'auto 240px'
                : 'auto 10.5rem',
        };

  useEffect(() => {
    if (selected) {
      setShowHoverUi(false);
      setTouchUiPinned(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!touchUiPinned || downloadUiPinned || openUiPinned) return undefined;
    const onDocumentPointerDown = (event: globalThis.PointerEvent) => {
      const rootNode = rootRef.current;
      if (!rootNode) return;
      if (rootNode.contains(event.target as Node)) return;
      setShowHoverUi(false);
      setTouchUiPinned(false);
    };
    document.addEventListener('pointerdown', onDocumentPointerDown, true);
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  }, [touchUiPinned, downloadUiPinned, openUiPinned]);

  const showInteractiveUi = !selected && (busy || hoverUiActive);
  const actionsClassName =
    'absolute right-2 top-2 z-30 max-w-[min(100%,12rem)] transition-opacity duration-75 ' +
    (showInteractiveUi ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0');

  const handlePointerEnter = useCallback(() => {
    if (selected) return;
    setShowHoverUi(true);
  }, [selected]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        !selected &&
        (prefersCoarsePointer || event.pointerType === 'touch') &&
        event.button === 0
      ) {
        setShowHoverUi(true);
        setTouchUiPinned(true);
      }
      onPointerDown?.(event);
    },
    [onPointerDown, prefersCoarsePointer, selected],
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!touchUiPinned) {
        setShowHoverUi(false);
      }
      onPointerLeave?.(event);
    },
    [onPointerLeave, touchUiPinned],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      setShowHoverUi(false);
      setTouchUiPinned(false);
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
    if (downloadUiPinned || openUiPinned) return;
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const rootNode = rootRef.current;
      if (!rootNode) return;
      const focusInside =
        typeof document !== 'undefined' ? rootNode.contains(document.activeElement) : false;
      if (rootNode.matches(':hover') || focusInside) return;
      setShowHoverUi(false);
      setTouchUiPinned(false);
    });
  }, [downloadUiPinned, openUiPinned]);

  const resolvedHoverOverlay = useMemo(() => {
    if (!hoverOverlay) return null;
    if (!isValidElement(hoverOverlay)) return hoverOverlay;
    return cloneElement(
      hoverOverlay as ReactElement<{
        onRequestCloseHoverUi?: () => void;
        onDownloadUiOpenChange?: (open: boolean) => void;
        onOpenUiOpenChange?: (open: boolean) => void;
      }>,
      {
        onRequestCloseHoverUi: handleRequestCloseHoverUi,
        onDownloadUiOpenChange: setDownloadUiPinned,
        onOpenUiOpenChange: setOpenUiPinned,
      },
    );
  }, [hoverOverlay, handleRequestCloseHoverUi]);

  const showHoverOverlay = Boolean(resolvedHoverOverlay) && !selected && hoverUiActive;
  // ВАЖНО: `will-change` и постоянные transforms на тысячах карточек могут разгонять Layerize/память/GC.
  // Для массового списка оставляем только opacity-переход.
  const hoverOverlayClassName =
    'absolute -inset-1 z-20 transition-opacity duration-75 ' +
    (showHoverOverlay ? 'pointer-events-none opacity-100' : 'pointer-events-none opacity-0');

  const rootMergedStyle = useMemo((): CSSProperties | undefined => {
    const merged = {
      ...(contentVisibilityStyle || {}),
      ...(rootStyle || {}),
    };
    return Object.keys(merged).length > 0 ? merged : undefined;
  }, [contentVisibilityStyle, rootStyle]);

  const titleResolvedClassName = [
    titleClassName,
    accentSurface && !selected
      ? 'group-hover:!text-white group-data-[catalog-hover-ui=true]:!text-white'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      style={rootMergedStyle}
      data-catalog-hover-ui={hoverUiActive && !selected ? 'true' : undefined}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerDown={handlePointerDown}
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
      {resolvedHoverOverlay && showHoverOverlay ? (
        <div className={hoverOverlayClassName} aria-hidden={false}>
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
      <div className={titleResolvedClassName}>{title}</div>
      {pinPreviewToBottom ? (
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col justify-end ${pinPreviewColumnClassName}`.trim()}
        >
          {preview}
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{preview}</div>
      )}
      {footer != null ? (
        fadeFooterWithHoverUi ? (
          <div
            className={`mt-auto w-full min-w-0 shrink-0 ${
              !selected && hoverUiActive && resolvedHoverOverlay
                ? 'transition-opacity duration-100 opacity-0'
                : 'transition-opacity duration-100'
            }`}
          >
            {footer}
          </div>
        ) : (
          <div className="mt-auto w-full min-w-0 shrink-0">{footer}</div>
        )
      ) : null}
    </div>
  );
}
