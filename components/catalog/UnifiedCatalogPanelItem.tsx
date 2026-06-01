import { memo, useCallback, useMemo, type DragEvent, type PointerEvent } from 'react';
import type { MergedCatalogItem } from '../../types/catalog';
import type { SavedLibraryRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';
import { UnifiedCatalogCard } from './UnifiedCatalogCard';
import { buildCatalogItemDownloadButtonProps, buildCatalogItemOpenButtonProps } from './buildCatalogSourceDownloadProps';
import { bestDownloadSourceId, bestPreviewSourceId, getCatalogSourceRef } from '../../utils/unifiedCatalogMerge';

export type UnifiedCatalogPanelItemProps = {
  item: MergedCatalogItem;
  previewFamily?: string;
  cardPreviewText?: string;
  previewFontSizePx?: number;
  gridPreviewMultiline?: boolean;
  rowCatalogPreviewText?: string;
  onRowGlobalSampleCommit?: (text: string) => void;
  busy?: boolean;
  selected?: boolean;
  isRowMode: boolean;
  fontLibraries?: SavedLibraryRecord[];
  onAddFontToLibrary?: (libraryId: string, entry: SavedLibraryFontEntry) => boolean | Promise<boolean>;
  onRequestCreateLibrary?: (entries: SavedLibraryFontEntry[]) => void;
  onOpenInEditor?: (item: MergedCatalogItem) => unknown;
  onShareCatalogItem?: (item: MergedCatalogItem) => unknown;
  onCardClick?: (event: PointerEvent<HTMLElement>, familyKey: string) => void;
  onStartCardLongPress?: (event: PointerEvent<HTMLElement>, familyKey: string) => void;
  onPointerUp?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLElement>) => void;
  onDragStart?: (event: DragEvent<HTMLElement>, payload: unknown) => void;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
  onOpenTrialPage?: (raw: Record<string, unknown>) => void;
  onUploadTrial?: unknown;
  registerPreviewNode?: (
    familyKey: string,
    node: HTMLElement | null,
    primarySource?: string,
    slug?: string,
    raw?: Record<string, unknown> | null,
  ) => void;
};

function UnifiedCatalogPanelItemComponent({
  item,
  previewFamily,
  cardPreviewText,
  previewFontSizePx,
  gridPreviewMultiline = false,
  rowCatalogPreviewText,
  onRowGlobalSampleCommit,
  busy,
  selected,
  isRowMode,
  fontLibraries,
  onAddFontToLibrary,
  onRequestCreateLibrary,
  onOpenInEditor,
  onShareCatalogItem,
  onCardClick,
  onStartCardLongPress,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onDragStart,
  onDragEnd,
  onOpenTrialPage,
  onUploadTrial,
  registerPreviewNode,
}: UnifiedCatalogPanelItemProps) {
  const familyKey = item.familyKey;
  const primarySource = item?.primarySource || bestDownloadSourceId(item);
  const primarySrc = getCatalogSourceRef(item, primarySource);
  const primaryRaw = primarySrc?.raw || null;

  const previewSource = bestPreviewSourceId(item);
  const previewSrc = getCatalogSourceRef(item, previewSource);
  const previewRaw = previewSrc?.raw || null;
  const previewSlug = String(previewRaw?.id || previewRaw?.slug || '');

  const downloadButtonProps = useMemo(
    () => buildCatalogItemDownloadButtonProps(item, { onOpenTrialPage, onUploadTrial }),
    [item, onOpenTrialPage, onUploadTrial],
  );

  const openButtonProps = useMemo(
    () => buildCatalogItemOpenButtonProps(item, onOpenInEditor, downloadButtonProps),
    [downloadButtonProps, onOpenInEditor, item],
  );

  const handleCardClick = useCallback(
    (e: PointerEvent<HTMLElement>) => onCardClick?.(e, familyKey),
    [familyKey, onCardClick],
  );
  const handleLongPress = useCallback(
    (e: PointerEvent<HTMLElement>) => onStartCardLongPress?.(e, familyKey),
    [familyKey, onStartCardLongPress],
  );
  const handlePreviewRef = useCallback(
    (node: HTMLElement | null) =>
      registerPreviewNode?.(familyKey, node, previewSource, previewSlug, previewRaw),
    [familyKey, previewRaw, previewSlug, previewSource, registerPreviewNode],
  );

  return (
    <UnifiedCatalogCard
      item={item}
      primarySource={primarySource}
      primaryRaw={primaryRaw}
      previewFamily={previewFamily}
      rowCatalogPreviewText={rowCatalogPreviewText}
      onRowGlobalSampleCommit={onRowGlobalSampleCommit}
      busy={busy}
      selected={selected}
      isRowMode={isRowMode}
      fontLibraries={fontLibraries}
      onAddFontToLibrary={onAddFontToLibrary}
      onRequestCreateLibrary={onRequestCreateLibrary}
      onOpenInEditor={undefined}
      onShareCatalogItem={onShareCatalogItem}
      openButtonProps={openButtonProps}
      onCardClick={handleCardClick}
      onStartCardLongPress={handleLongPress}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      previewText={cardPreviewText}
      previewFontSizePx={previewFontSizePx}
      gridPreviewMultiline={gridPreviewMultiline}
      downloadButtonProps={downloadButtonProps}
      registerPreviewNode={registerPreviewNode ? handlePreviewRef : undefined}
    />
  );
}

export const UnifiedCatalogPanelItem = memo(UnifiedCatalogPanelItemComponent);
