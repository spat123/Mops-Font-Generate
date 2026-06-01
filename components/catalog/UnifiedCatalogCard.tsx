import { memo, useMemo, type ReactNode } from 'react';
import type { CatalogDownloadButtonProps, MergedCatalogItem } from '../../types/catalog';
import type { CatalogOpenSplitButtonProps } from './CatalogOpenSplitButton';
import type { SavedLibraryRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';
import { CatalogSourceCard } from './CatalogSourceCard';
import { catalogItemCanOpenInEditor } from './buildCatalogSourceDownloadProps';
import { buildUnifiedLibraryEntry } from '../../utils/unifiedCatalogMerge';
import { getFontCategoryLabelRu } from '../../utils/fontCategoryLabels';
import { pluralRu } from '../../utils/pluralRu';

export type UnifiedCatalogCardProps = {
  item: MergedCatalogItem;
  primarySource: string;
  primaryRaw: Record<string, unknown> | null;
  previewFamily?: string;
  downloadButtonProps?: CatalogDownloadButtonProps | null;
  registerPreviewNode?: (node: HTMLElement | null) => void;
  busy?: boolean;
  selected?: boolean;
  isRowMode: boolean;
  fontLibraries?: SavedLibraryRecord[];
  onAddFontToLibrary?: (libraryId: string, entry: SavedLibraryFontEntry) => boolean | Promise<boolean>;
  onRequestCreateLibrary?: (entries: SavedLibraryFontEntry[]) => void;
  onOpenInEditor?: (item: MergedCatalogItem) => unknown;
  onShareCatalogItem?: (item: MergedCatalogItem) => unknown;
  openButtonProps?: CatalogOpenSplitButtonProps | null;
  onCardClick?: (event: React.MouseEvent, familyKey: string) => void;
  onStartCardLongPress?: (event: React.PointerEvent, familyKey: string) => void;
  onPointerUp?: (event: React.PointerEvent) => void;
  onPointerLeave?: (event: React.PointerEvent) => void;
  onPointerCancel?: (event: React.PointerEvent) => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent, payload: unknown) => void;
  dragPayload?: unknown;
  onDragEnd?: (event: React.DragEvent) => void;
  previewText?: string;
  previewFontSizePx?: number;
  gridPreviewMultiline?: boolean;
  rowCatalogPreviewText?: string;
  onRowGlobalSampleCommit?: (text: string) => void;
  rowPreviewFallback?: string;
  rowPreviewAlign?: 'end' | 'start';
  rowSampleTooltip?: ReactNode;
  rowPreviewEditorAriaLabel?: string;
  pinPreviewColumnClassName?: string;
  shareSurface?: boolean;
  footerRightTooltipContent?: ReactNode;
};

function UnifiedCatalogCardComponent({
  item,
  primarySource,
  primaryRaw,
  previewFamily,
  downloadButtonProps,
  registerPreviewNode,

  busy,
  selected,
  isRowMode,
  fontLibraries,
  onAddFontToLibrary,
  onRequestCreateLibrary,
  onOpenInEditor,
  onShareCatalogItem,
  openButtonProps = null,
  onCardClick,
  onStartCardLongPress,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  draggable = false,
  onDragStart,
  dragPayload,
  onDragEnd,
  previewText = 'AaBbCcDdEe',
  previewFontSizePx,
  gridPreviewMultiline = false,
  rowCatalogPreviewText,
  onRowGlobalSampleCommit,
  rowPreviewFallback,
  rowPreviewAlign = 'end',
  rowSampleTooltip,
  rowPreviewEditorAriaLabel,
  pinPreviewColumnClassName = '',
  /** Страница «Поделиться»: без «Открыть», библиотек и выделения */
  shareSurface = false,
  footerRightTooltipContent,
}: UnifiedCatalogCardProps) {
  const familyKey = item?.familyKey;
  const family = item?.displayName || familyKey;
  if (!familyKey || !family) return null;

  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const hasGoogleOrFontsource = sources.some((s) => s?.id === 'google' || s?.id === 'fontsource');
  const hasTrial = sources.some((s) => s?.id === 'demo') && !hasGoogleOrFontsource;
  const styleCountNum = Number(item?.styleCount) || 0;
  const hasStyleCount = Number.isFinite(styleCountNum) && styleCountNum > 0;
  const languageCount = Array.isArray(item?.subsets) ? item.subsets.length : 0;
  const isVariable = Boolean(item?.isVariable);
  const hasItalic = Boolean(item?.hasItalic);

  const libraryEntry = useMemo(() => buildUnifiedLibraryEntry(item), [item]);

  const titleNode = family;

  const categoryLabel = getFontCategoryLabelRu(item?.category) || null;

  const metaItems = useMemo(
    () =>
      [
        categoryLabel,
        isVariable ? 'vf' : null,
        hasItalic ? 'italic' : null,
        languageCount > 0 ? `${languageCount} ${pluralRu(languageCount, 'язык', 'языка', 'языков')}` : null,
        hasStyleCount
          ? `${styleCountNum} ${pluralRu(styleCountNum, 'начертание', 'начертания', 'начертаний')}`
          : null,
        hasTrial ? 'trial' : null,
      ].filter(Boolean),
    [categoryLabel, hasItalic, hasStyleCount, hasTrial, isVariable, languageCount, styleCountNum],
  );

  const footerLeftBadges = useMemo(
    () => [categoryLabel, isVariable ? 'vf' : null, hasItalic ? 'italic' : null].filter(Boolean),
    [categoryLabel, hasItalic, isVariable],
  );

  const footerRightBadges = useMemo(
    () =>
      [
        languageCount > 0
          ? `${languageCount} ${pluralRu(languageCount, 'язык', 'языка', 'языков')}`
          : null,
        hasStyleCount
          ? `${styleCountNum} ${pluralRu(styleCountNum, 'начертание', 'начертания', 'начертаний')}`
          : null,
        hasTrial ? 'trial' : null,
      ].filter(Boolean),
    [hasStyleCount, hasTrial, languageCount, styleCountNum],
  );

  const showOpenInEditor = useMemo(
    () =>
      !shareSurface &&
      (Boolean(openButtonProps) ||
        (typeof onOpenInEditor === 'function' && catalogItemCanOpenInEditor(item, downloadButtonProps))),
    [downloadButtonProps, item, onOpenInEditor, openButtonProps, shareSurface],
  );

  return (
    <CatalogSourceCard
      itemKey={familyKey}
      family={family}
      titleNode={titleNode}
      isRowMode={isRowMode}
      metaItems={metaItems}
      previewFamily={previewFamily}
      previewText={previewText}
      previewFontSizePx={previewFontSizePx}
      gridPreviewMultiline={gridPreviewMultiline}
      rowPreviewText={rowCatalogPreviewText ?? rowPreviewFallback ?? family}
      defaultPreviewText={rowPreviewFallback ?? family}
      rowPreviewAlign={rowPreviewAlign}
      rowSampleTooltip={rowSampleTooltip}
      rowPreviewEditorAriaLabel={rowPreviewEditorAriaLabel}
      pinPreviewColumnClassName={pinPreviewColumnClassName}
      onGlobalRowSampleCommit={onRowGlobalSampleCommit}
      previewProps={registerPreviewNode ? { ref: registerPreviewNode } : undefined}
      footerLeftBadges={footerLeftBadges}
      footerRightBadges={footerRightBadges}
      footerRightTooltipContent={footerRightTooltipContent}
      onOpen={
        showOpenInEditor && !openButtonProps
          ? () => {
              onOpenInEditor?.(item);
            }
          : undefined
      }
      openButtonProps={shareSurface || !showOpenInEditor ? null : openButtonProps}
      openAriaLabel={family ? `Открыть ${family} в редакторе` : 'Открыть в редакторе'}
      onShare={
        shareSurface || typeof onShareCatalogItem !== 'function'
          ? undefined
          : () => {
              onShareCatalogItem(item);
            }
      }
      shareAriaLabel={family ? `Поделиться: ${family}` : 'Поделиться'}
      downloadButtonProps={downloadButtonProps}
      fontLibraries={fontLibraries}
      busy={busy}
      onAddFontToLibrary={onAddFontToLibrary}
      onRequestCreateLibrary={onRequestCreateLibrary}
      libraryEntry={libraryEntry}
      showLibraryActions={!shareSurface}
      showSelectionChrome={!shareSurface}
      selected={shareSurface ? false : selected}
      onCardClick={shareSurface ? undefined : onCardClick}
      onStartCardLongPress={shareSurface ? undefined : onStartCardLongPress}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      draggable={draggable}
      onDragStart={onDragStart}
      dragPayload={dragPayload || libraryEntry}
      onDragEnd={onDragEnd}
      shareSurface={shareSurface}
    />
  );
}

export const UnifiedCatalogCard = memo(UnifiedCatalogCardComponent);

