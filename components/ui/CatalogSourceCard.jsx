import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CatalogSessionAddSpinner from './CatalogSessionAddSpinner';
import { CatalogLibraryActions } from './CatalogLibraryActions';
import { CatalogFontCard } from './CatalogFontCard';
import { CatalogRowModeCard } from './CatalogRowModeCard';
import { CatalogCardHoverOverlay } from './CatalogCardHoverOverlay';
import { Tooltip } from './Tooltip';

function DefaultSelectionOverlay() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="none"
          className="h-5 w-5"
          aria-hidden
        >
          <path
            d="M4.5 10.5L8.25 14.25L15.5 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function CatalogSourceCardComponent({
  // identity / content
  itemKey,
  family,
  metaItems = [],
  previewFamily,
  previewText = 'AaBbCcDdEe',
  rowPreviewText,
  defaultPreviewText,
  onGlobalRowSampleCommit,
  previewProps,

  // rendering
  isRowMode,
  footerLeftBadges = [],
  footerRightBadges = [],
  footerRightTooltipContent,

  // actions / overlays
  onOpen,
  openAriaLabel,
  openLabel,
  downloadButtonProps,

  // library actions
  fontLibraries,
  busy,
  onAddFontToLibrary,
  onRequestCreateLibrary,
  libraryEntry,

  // selection + interactions
  selected,
  onCardClick,
  onStartCardLongPress,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,

  // drag
  draggable = false,
  onDragStart,
  dragPayload,
  onDragEnd,
}) {
  const footerLayoutRef = useRef(null);
  const [stackFooterBadges, setStackFooterBadges] = useState(false);
  const handleCardClick = useCallback(
    (event) => {
      onCardClick?.(event, itemKey);
    },
    [itemKey, onCardClick],
  );

  const handlePointerDown = useCallback(
    (event) => {
      onStartCardLongPress?.(event, itemKey);
    },
    [itemKey, onStartCardLongPress],
  );

  const handleDragStart = useCallback(
    (event) => {
      onDragStart?.(event, dragPayload);
    },
    [dragPayload, onDragStart],
  );

  const selectionOverlay = useMemo(
    () => <DefaultSelectionOverlay />,
    [],
  );

  const hoverOverlay = useMemo(
    () => (
      <CatalogCardHoverOverlay
        centered={Boolean(isRowMode)}
        onOpen={onOpen}
        openAriaLabel={openAriaLabel}
        openLabel={openLabel}
        downloadButtonProps={downloadButtonProps}
      />
    ),
    [downloadButtonProps, isRowMode, onOpen, openAriaLabel, openLabel],
  );

  const actions = useMemo(
    () => (
      <CatalogLibraryActions
        libraries={fontLibraries}
        busy={busy}
        busyIndicator={<CatalogSessionAddSpinner />}
        appearance={isRowMode ? 'row' : 'default'}
        stateKey={libraryEntry?.id || itemKey}
        onAddFontToLibrary={onAddFontToLibrary}
        onRequestCreateLibrary={onRequestCreateLibrary}
        libraryEntry={libraryEntry}
      />
    ),
    [
      busy,
      fontLibraries,
      isRowMode,
      itemKey,
      libraryEntry,
      onAddFontToLibrary,
      onRequestCreateLibrary,
    ],
  );

  useEffect(() => {
    if (isRowMode) {
      setStackFooterBadges(false);
      return undefined;
    }
    const footerEl = footerLayoutRef.current;
    if (!footerEl || typeof ResizeObserver === 'undefined') return undefined;
    const updateLayout = (width) => {
      const nextStack = Number(width) > 0 && Number(width) < 230;
      setStackFooterBadges((prev) => (prev === nextStack ? prev : nextStack));
    };
    updateLayout(footerEl.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const width = entries?.[0]?.contentRect?.width ?? footerEl.getBoundingClientRect().width;
      updateLayout(width);
    });
    ro.observe(footerEl);
    return () => ro.disconnect();
  }, [isRowMode, footerLeftBadges, footerRightBadges]);

  const footer = useMemo(() => {
    if (!footerLeftBadges?.length && !footerRightBadges?.length) return null;

    const left = (
      <div
        className={`flex min-w-0 flex-wrap items-center gap-1.5 ${
          stackFooterBadges ? 'w-full' : ''
        }`}
      >
        {footerLeftBadges.filter(Boolean).map((b) => (
          <span key={String(b)} className="truncate text-xs uppercase font-semibold text-gray-800">
            {b}
          </span>
        ))}
      </div>
    );

    const rightInner = (
      <div
        className={`flex items-center gap-1.5 text-xs uppercase font-semibold tabular-nums leading-snug text-gray-800 ${
          stackFooterBadges
            ? 'min-w-0 w-full flex-wrap justify-start text-left'
            : 'shrink-0 justify-end text-right'
        }`}
      >
        {footerRightBadges.filter(Boolean).map((b) => (
          <span key={String(b)} className="whitespace-nowrap">
            {b}
          </span>
        ))}
      </div>
    );

    const right =
      footerRightTooltipContent ? (
        <Tooltip
          as="div"
          content={footerRightTooltipContent}
          className={`flex items-center gap-1.5 text-xs uppercase font-semibold tabular-nums leading-snug text-gray-800 ${
            stackFooterBadges
              ? 'min-w-0 w-full flex-wrap justify-start text-left'
              : 'shrink-0 justify-end text-right'
          }`}
        >
          {footerRightBadges.filter(Boolean).map((b) => (
            <span key={String(b)} className="whitespace-nowrap">
              {b}
            </span>
          ))}
        </Tooltip>
      ) : (
        rightInner
      );

    return (
      <div
        ref={footerLayoutRef}
        className={`mt-auto pt-1 ${
          stackFooterBadges
            ? 'flex flex-col items-start gap-1.5'
            : 'flex flex-wrap items-end justify-between gap-x-2 gap-y-1'
        }`}
      >
        {left}
        {right}
      </div>
    );
  }, [footerLeftBadges, footerRightBadges, footerRightTooltipContent, stackFooterBadges]);

  if (isRowMode) {
    return (
      <CatalogRowModeCard
        family={family}
        metaItems={metaItems}
        previewFamily={previewFamily}
        previewText={rowPreviewText ?? previewText}
        defaultPreviewText={defaultPreviewText}
        onGlobalRowSampleCommit={onGlobalRowSampleCommit}
        previewProps={previewProps}
        selected={selected}
        busy={busy}
        actions={actions}
        selectionOverlay={selectionOverlay}
        hoverOverlay={hoverOverlay}
        onClick={handleCardClick}
        onPointerDown={handlePointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
      />
    );
  }

  return (
    <CatalogFontCard
      fadeFooterWithHoverUi
      selected={selected}
      onClick={handleCardClick}
      onPointerDown={handlePointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      busy={busy}
      minHeightClass="min-h-32 h-[10.5rem] min-w-0"
      selectionOverlay={selectionOverlay}
      hoverOverlay={hoverOverlay}
      actions={actions}
      title={family}
      preview={
        <div
          {...(previewProps || {})}
          className="mt-2 min-h-[1.75rem] flex-1 truncate text-[1.75rem] leading-tight text-gray-800"
          style={{ fontFamily: previewFamily }}
        >
          {previewText}
        </div>
      }
      footer={footer}
    />
  );
}

export const CatalogSourceCard = memo(CatalogSourceCardComponent);

