import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { CatalogDownloadButtonProps } from '../../types/catalog';
import type { CatalogOpenSplitButtonProps } from './CatalogOpenSplitButton';
import type { SavedLibraryRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';
import CatalogSessionAddSpinner from '../ui/CatalogSessionAddSpinner';
import { CatalogLibraryActions } from './CatalogLibraryActions';
import { CatalogFontCard } from './CatalogFontCard';
import { CatalogRowModeCard } from './CatalogRowModeCard';
import { CatalogCardHoverOverlay } from './CatalogCardHoverOverlay';
import { Tooltip } from '../ui/Tooltip';
import { resolveCatalogGridCardMinHeightPx } from '../../utils/catalogPreviewSample';

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

export type CatalogSourceCardProps = {
  itemKey: string;
  family: string;
  titleNode?: ReactNode;
  metaItems?: string[];
  previewFamily?: string;
  previewText?: string;
  previewFontSizePx?: number;
  gridPreviewMultiline?: boolean;
  rowPreviewText?: string;
  defaultPreviewText?: string;
  onGlobalRowSampleCommit?: (text: string) => void;
  previewProps?: Record<string, unknown>;
  isRowMode: boolean;
  footerLeftBadges?: ReactNode[];
  footerRightBadges?: ReactNode[];
  footerRightTooltipContent?: ReactNode;
  rowPreviewAlign?: 'end' | 'start';
  rowSampleTooltip?: ReactNode;
  rowPreviewEditorAriaLabel?: string;
  pinPreviewColumnClassName?: string;
  onOpen?: () => unknown;
  openButtonProps?: CatalogOpenSplitButtonProps | null;
  openAriaLabel?: string;
  openLabel?: string;
  onShare?: () => unknown;
  shareAriaLabel?: string;
  downloadButtonProps?: CatalogDownloadButtonProps | null;
  fontLibraries?: SavedLibraryRecord[];
  busy?: boolean;
  onAddFontToLibrary?: (libraryId: string, entry: SavedLibraryFontEntry) => boolean | Promise<boolean>;
  onRequestCreateLibrary?: (entries: SavedLibraryFontEntry[]) => void;
  libraryEntry?: SavedLibraryFontEntry | null;
  showLibraryActions?: boolean;
  showSelectionChrome?: boolean;
  selected?: boolean;
  onCardClick?: (event: PointerEvent<HTMLElement>, itemKey: string) => void;
  onStartCardLongPress?: (event: PointerEvent<HTMLElement>, itemKey: string) => void;
  onPointerUp?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLElement>) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>, payload: unknown) => void;
  dragPayload?: unknown;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
  shareSurface?: boolean;
};

function CatalogSourceCardComponent({
  // identity / content
  itemKey,
  family,
  titleNode = null,
  metaItems = [],
  previewFamily,
  previewText = 'AaBbCcDdEe',
  previewFontSizePx,
  /** Плитка: превью в 2 строки (свой текст в тулбаре). */
  gridPreviewMultiline = false,
  rowPreviewText,
  defaultPreviewText,
  onGlobalRowSampleCommit,
  previewProps,

  // rendering
  isRowMode,
  footerLeftBadges = [],
  footerRightBadges = [],
  footerRightTooltipContent,

  /** ROW: выравнивание крупного образца (`end` по умолчанию — как в каталоге) */
  rowPreviewAlign = 'end',
  rowSampleTooltip,
  rowPreviewEditorAriaLabel,
  pinPreviewColumnClassName = '',

  // actions / overlays
  onOpen,
  openButtonProps = null,
  openAriaLabel,
  openLabel,
  onShare,
  shareAriaLabel,
  downloadButtonProps,

  // library actions
  fontLibraries,
  busy,
  onAddFontToLibrary,
  onRequestCreateLibrary,
  libraryEntry,
  /** Показывать блок «в библиотеку» / плюс (в режиме share — скрыть) */
  showLibraryActions = true,
  /** Оверлей выделения при multi-select (в режиме share — скрыть) */
  showSelectionChrome = true,

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
  /** Страница «Поделиться»: стили строки/плитки */
  shareSurface = false,
}: CatalogSourceCardProps) {
  const footerLayoutRef = useRef<HTMLDivElement>(null);
  const [stackFooterBadges, setStackFooterBadges] = useState(false);
  const handleCardClick = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onCardClick?.(event, itemKey);
    },
    [itemKey, onCardClick],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onStartCardLongPress?.(event, itemKey);
    },
    [itemKey, onStartCardLongPress],
  );

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      onDragStart?.(event, dragPayload);
    },
    [dragPayload, onDragStart],
  );

  const selectionOverlayResolved = useMemo(
    () => (showSelectionChrome ? <DefaultSelectionOverlay /> : null),
    [showSelectionChrome],
  );

  const hoverOverlay = useMemo(
    () => (
      <CatalogCardHoverOverlay
        centered={Boolean(isRowMode)}
        onOpen={openButtonProps ? undefined : onOpen}
        openButtonProps={openButtonProps}
        openAriaLabel={openAriaLabel}
        openLabel={openLabel}
        onShare={shareSurface ? undefined : onShare}
        shareAriaLabel={shareAriaLabel}
        downloadButtonProps={downloadButtonProps}
      />
    ),
    [downloadButtonProps, isRowMode, onOpen, onShare, openAriaLabel, openButtonProps, openLabel, shareAriaLabel, shareSurface],
  );

  const actions = useMemo(() => {
    if (!showLibraryActions) return null;
    return (
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
    );
  }, [
    busy,
    fontLibraries,
    isRowMode,
    itemKey,
    libraryEntry,
    onAddFontToLibrary,
    onRequestCreateLibrary,
    showLibraryActions,
  ]);

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
    const ro = new ResizeObserver((entries) => {
      const width =
        entries?.[0]?.contentRect?.width ??
        entries?.[0]?.borderBoxSize?.[0]?.inlineSize ??
        footerEl.offsetWidth;
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

  const gridCardMinHeightPx = useMemo(
    () =>
      resolveCatalogGridCardMinHeightPx({
        fontSizePx: previewFontSizePx,
        multiline: gridPreviewMultiline,
      }),
    [gridPreviewMultiline, previewFontSizePx],
  );

  if (isRowMode) {
    return (
      <CatalogRowModeCard
        family={family}
        familyNode={titleNode}
        metaItems={metaItems}
        previewFamily={previewFamily}
        previewText={rowPreviewText ?? previewText}
        defaultPreviewText={defaultPreviewText}
        onGlobalRowSampleCommit={onGlobalRowSampleCommit}
        previewAlign={rowPreviewAlign}
        rowSampleTooltip={rowSampleTooltip}
        rowPreviewEditorAriaLabel={rowPreviewEditorAriaLabel}
        pinPreviewColumnClassName={pinPreviewColumnClassName}
        previewProps={previewProps}
        selected={selected}
        busy={busy}
        actions={actions}
        selectionOverlay={selectionOverlayResolved}
        hoverOverlay={hoverOverlay}
        onClick={handleCardClick}
        onPointerDown={handlePointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        shareSurface={shareSurface}
      />
    );
  }

  return (
    <CatalogFontCard
      fadeFooterWithHoverUi
      pinActionsVisible={showLibraryActions && !(fontLibraries?.length)}
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
      minHeightClass="h-auto min-w-0"
      rootStyle={{ minHeight: `${gridCardMinHeightPx}px` }}
      containIntrinsicHeightPx={gridCardMinHeightPx}
      selectionOverlay={selectionOverlayResolved}
      hoverOverlay={hoverOverlay}
      actions={actions}
      title={titleNode || family}
      preview={
        <div
          {...(previewProps || {})}
          className={
            gridPreviewMultiline
              ? 'mt-2 mb-4 min-w-0 break-words leading-tight text-gray-800 [overflow-wrap:anywhere]'
              : 'mt-2 min-w-0 truncate leading-tight text-gray-800'
          }
          style={{
            fontFamily: previewFamily,
            fontSize: Number.isFinite(Number(previewFontSizePx)) ? `${Number(previewFontSizePx)}px` : '2rem',
          }}
        >
          {previewText ?? family}
        </div>
      }
      footer={footer}
    />
  );
}

export const CatalogSourceCard = memo(CatalogSourceCardComponent);

