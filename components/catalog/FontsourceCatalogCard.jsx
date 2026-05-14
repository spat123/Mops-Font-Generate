import React, { memo, useCallback, useMemo } from 'react';
import { CatalogSourceCard } from './CatalogSourceCard';
import { buildCatalogDownloadButtonProps } from './buildCatalogDownloadButtonProps';
import { createCatalogLibraryEntry } from '../../utils/fontLibraryUtils';
import { getFontCategoryLabelRu } from '../../utils/fontCategoryLabels';
import { pluralRu } from '../../utils/pluralRu';

function FontsourceCatalogCardComponent({
  item,
  previewFamily,
  busy,
  selected,
  isRowMode,
  fontLibraries,
  onAddFontToLibrary,
  onRequestCreateLibrary,
  onOpenInEditor,
  onDownloadPackageZip,
  onDownloadAsFormat,
  onDownloadVariableVariant,
  onCardClick,
  onStartCardLongPress,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  registerPreviewNode,
  previewText = 'AaBbCcDdEe',
  /** ROW: глобальный образец (одна строка на весь список); undefined — показывать имя семейства */
  rowCatalogPreviewText,
  onRowGlobalSampleCommit,
  rowPreviewFallback,
  rowPreviewAlign = 'end',
  rowSampleTooltip,
  rowPreviewEditorAriaLabel,
  pinPreviewColumnClassName = '',
  draggable = false,
  onDragStart,
  onDragEnd,
  shareSurface = false,
}) {
  const slug = item?.id || item?.slug;
  const family = item?.family || item?.label || slug;
  const styleCountRaw = item?.styleCount;
  const styleCountNum = styleCountRaw == null || styleCountRaw === '' ? NaN : Number(styleCountRaw);
  const hasStyleCount = Number.isFinite(styleCountNum) && styleCountNum > 0;
  const styleCount = hasStyleCount ? styleCountNum : null;
  const subsetCount = Array.isArray(item?.subsets) ? item.subsets.length : 0;
  const isVariable = Boolean(item?.isVariable);
  const hasItalic = Boolean(item?.hasItalic);
  const libraryEntry = createCatalogLibraryEntry({
    source: 'fontsource',
    key: item?.id || item?.slug,
    label: family,
    isVariable,
  });

  const handlePreviewRef = useCallback((node) => {
    registerPreviewNode?.(slug, node);
  }, [registerPreviewNode, slug]);

  const openAriaLabel = useMemo(() => `Открыть ${family} в редакторе`, [family]);

  const downloadButtonProps = useMemo(
    () =>
      buildCatalogDownloadButtonProps({
        family,
        item,
        onDownloadZip: onDownloadPackageZip,
        onDownloadAsFormat,
        onDownloadVariableVariant,
        showVariable: isVariable,
      }),
    [family, isVariable, item, onDownloadAsFormat, onDownloadPackageZip, onDownloadVariableVariant],
  );

  const metaItems = useMemo(() => ([
    getFontCategoryLabelRu(item?.category) || 'Fontsource',
    isVariable ? 'vf' : null,
    hasItalic ? 'italic' : null,
    subsetCount > 0 ? `${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}` : null,
    hasStyleCount ? `${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}` : null,
  ]), [hasItalic, hasStyleCount, isVariable, item?.category, styleCount, subsetCount]);

  const footerLeftBadges = useMemo(() => ([
    getFontCategoryLabelRu(item?.category) || 'Fontsource',
    isVariable ? 'vf' : null,
    hasItalic ? 'italic' : null,
  ]), [hasItalic, isVariable, item?.category]);

  const footerRightBadges = useMemo(() => ([
    hasStyleCount ? `${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}` : null,
    subsetCount > 0 ? `${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}` : null,
  ]), [hasStyleCount, styleCount, subsetCount]);

  return (
    <CatalogSourceCard
      itemKey={slug}
      family={family}
      isRowMode={isRowMode}
      metaItems={metaItems}
      previewFamily={previewFamily}
      previewText={previewText}
      rowPreviewText={rowCatalogPreviewText ?? rowPreviewFallback ?? family}
      defaultPreviewText={rowPreviewFallback ?? family}
      rowPreviewAlign={rowPreviewAlign}
      rowSampleTooltip={rowSampleTooltip}
      rowPreviewEditorAriaLabel={rowPreviewEditorAriaLabel}
      pinPreviewColumnClassName={pinPreviewColumnClassName}
      onGlobalRowSampleCommit={onRowGlobalSampleCommit}
      previewProps={{
        ref: handlePreviewRef,
        'data-fontsource-slug': slug,
      }}
      footerLeftBadges={footerLeftBadges}
      footerRightBadges={footerRightBadges}
      onOpen={shareSurface ? undefined : () => onOpenInEditor?.(slug, isVariable)}
      openAriaLabel={openAriaLabel}
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
      dragPayload={item}
      onDragEnd={onDragEnd}
      shareSurface={shareSurface}
    />
  );
}

export const FontsourceCatalogCard = memo(FontsourceCatalogCardComponent);
