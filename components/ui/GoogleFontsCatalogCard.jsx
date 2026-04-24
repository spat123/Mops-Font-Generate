import React, { memo, useMemo } from 'react';
import { CatalogSourceCard } from './CatalogSourceCard';
import { buildCatalogDownloadButtonProps } from './buildCatalogDownloadButtonProps';
import { createCatalogLibraryEntry } from '../../utils/fontLibraryUtils';
import { getFontCategoryLabelRu } from '../../utils/fontCategoryLabels';
import { pluralRu } from '../../utils/pluralRu';

function GoogleFontsCatalogCardComponent({
  entry,
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
  draggable = false,
  onDragStart,
  onDragEnd,
  /** ROW: глобальный образец (одна строка на весь список); undefined — показывать имя семейства */
  rowCatalogPreviewText,
  onRowGlobalSampleCommit,
  previewText = 'AaBbCcDdEe',
  footerRightTooltipContent,
}) {
  const family = entry?.family;
  const styleCount = Number(entry?.styleCount) || 0;
  const subsetCount = Array.isArray(entry?.subsets) ? entry.subsets.length : 0;
  const languageCount = subsetCount;
  const isVariable = entry?.isVariable === true;
  const hasItalic = Boolean(entry?.hasItalic);

  const libraryEntry = useMemo(
    () =>
      createCatalogLibraryEntry({
        source: 'google',
        key: family,
        label: family,
      }),
    [family],
  );

  const openAriaLabel = useMemo(() => `Открыть ${family} в редакторе`, [family]);

  const downloadButtonProps = useMemo(
    () =>
      buildCatalogDownloadButtonProps({
        family,
        item: entry,
        onDownloadZip: onDownloadPackageZip,
        onDownloadAsFormat,
        onDownloadVariableVariant,
        showVariable: isVariable,
      }),
    [entry, family, isVariable, onDownloadAsFormat, onDownloadPackageZip, onDownloadVariableVariant],
  );

  const metaItems = useMemo(
    () => [
      getFontCategoryLabelRu(entry?.category) || 'Google',
      isVariable ? 'vf' : null,
      hasItalic ? 'italic' : null,
      languageCount > 0 ? `${languageCount} ${pluralRu(languageCount, 'язык', 'языка', 'языков')}` : null,
      subsetCount > 0 ? `${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}` : null,
      `${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}`,
    ],
    [entry?.category, hasItalic, isVariable, languageCount, styleCount, subsetCount],
  );

  const footerLeftBadges = useMemo(
    () => [
      getFontCategoryLabelRu(entry?.category) || 'Google',
      isVariable ? 'vf' : null,
      hasItalic ? 'italic' : null,
    ],
    [entry?.category, hasItalic, isVariable],
  );

  const footerRightBadges = useMemo(
    () => [
      entry?.styleCount != null
        ? `${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}`
        : '—',
      subsetCount > 0 ? `${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}` : null,
    ],
    [entry?.styleCount, styleCount, subsetCount],
  );

  if (!family) return null;

  return (
    <CatalogSourceCard
      itemKey={family}
      family={family}
      isRowMode={isRowMode}
      metaItems={metaItems}
      previewFamily={`'${family}', sans-serif`}
      previewText={previewText}
      rowPreviewText={rowCatalogPreviewText ?? family}
      defaultPreviewText={family}
      onGlobalRowSampleCommit={onRowGlobalSampleCommit}
      footerLeftBadges={footerLeftBadges}
      footerRightBadges={footerRightBadges}
      footerRightTooltipContent={footerRightTooltipContent}
      onOpen={() => onOpenInEditor?.(entry)}
      openAriaLabel={openAriaLabel}
      downloadButtonProps={downloadButtonProps}
      fontLibraries={fontLibraries}
      busy={busy}
      onAddFontToLibrary={onAddFontToLibrary}
      onRequestCreateLibrary={onRequestCreateLibrary}
      libraryEntry={libraryEntry}
      selected={selected}
      onCardClick={onCardClick}
      onStartCardLongPress={onStartCardLongPress}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      draggable={draggable}
      onDragStart={onDragStart}
      dragPayload={libraryEntry}
      onDragEnd={onDragEnd}
    />
  );
}

export const GoogleFontsCatalogCard = memo(GoogleFontsCatalogCardComponent);

