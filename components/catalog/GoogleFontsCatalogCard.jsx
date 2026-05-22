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
  /** Страница «Поделиться»: без «Открыть», без библиотек и без выделения */
  shareSurface = false,
  /** ROW: глобальный образец (одна строка на весь список); undefined — показывать имя семейства */
  rowCatalogPreviewText,
  onRowGlobalSampleCommit,
  /** ROW: если задан и нет `rowCatalogPreviewText`, показывать этот текст вместо имени семейства (страница «Поделиться») */
  rowPreviewFallback,
  /** ROW: выравнивание крупного образца; по умолчанию как в каталоге */
  rowPreviewAlign = 'end',
  rowSampleTooltip,
  rowPreviewEditorAriaLabel,
  pinPreviewColumnClassName = '',
  previewText = 'AaBbCcDdEe',
  footerRightTooltipContent,
}) {
  const family = entry?.family;
  const styleCount = Number(entry?.styleCount);
  const hasStyleCount = Number.isFinite(styleCount) && styleCount > 0;
  const languageCount = Array.isArray(entry?.subsets) ? entry.subsets.length : 0;
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
      hasStyleCount ? `${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}` : null,
    ],
    [entry?.category, hasItalic, isVariable, languageCount, hasStyleCount, styleCount],
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
      hasStyleCount ? `${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}` : null,
    ],
    [hasStyleCount, styleCount],
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
      rowPreviewText={rowCatalogPreviewText ?? rowPreviewFallback ?? family}
      defaultPreviewText={rowPreviewFallback ?? family}
      rowPreviewAlign={rowPreviewAlign}
      rowSampleTooltip={rowSampleTooltip}
      rowPreviewEditorAriaLabel={rowPreviewEditorAriaLabel}
      pinPreviewColumnClassName={pinPreviewColumnClassName}
      onGlobalRowSampleCommit={onRowGlobalSampleCommit}
      footerLeftBadges={footerLeftBadges}
      footerRightBadges={footerRightBadges}
      footerRightTooltipContent={footerRightTooltipContent}
      onOpen={shareSurface ? undefined : () => onOpenInEditor?.(entry)}
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
      dragPayload={libraryEntry}
      onDragEnd={onDragEnd}
      shareSurface={shareSurface}
    />
  );
}

export const GoogleFontsCatalogCard = memo(GoogleFontsCatalogCardComponent);

