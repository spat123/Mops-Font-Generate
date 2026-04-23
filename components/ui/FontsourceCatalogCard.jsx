import React, { memo, useCallback } from 'react';
import CatalogSessionAddSpinner from './CatalogSessionAddSpinner';
import { CatalogLibraryActions } from './CatalogLibraryActions';
import { CatalogFontCard } from './CatalogFontCard';
import { CatalogRowModeCard } from './CatalogRowModeCard';
import { CatalogCardHoverOverlay } from './CatalogCardHoverOverlay';
import { createCatalogLibraryEntry } from '../../utils/fontLibraryUtils';
import { getFontCategoryLabelRu } from '../../utils/fontCategoryLabels';

function SelectionOverlay() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-sm">
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

function pluralRu(n, one, few, many) {
  const abs = Math.abs(Number(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

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
  draggable = false,
  onDragStart,
  onDragEnd,
}) {
  const slug = item?.id || item?.slug;
  const family = item?.family || item?.label || slug;
  const styleCount = Number(item?.styleCount) || 1;
  const subsetCount = Array.isArray(item?.subsets) ? item.subsets.length : 0;
  const isVariable = Boolean(item?.isVariable);
  const hasItalic = Boolean(item?.hasItalic);
  const libraryEntry = createCatalogLibraryEntry({
    source: 'fontsource',
    key: item?.id || item?.slug,
    label: family,
  });

  const handlePreviewRef = useCallback(
    (node) => {
      registerPreviewNode?.(slug, node);
    },
    [registerPreviewNode, slug],
  );

  const handleOpen = useCallback(() => {
    onOpenInEditor?.(slug, isVariable);
  }, [isVariable, onOpenInEditor, slug]);

  const handleCardClick = useCallback(
    (event) => {
      onCardClick?.(event, slug);
    },
    [onCardClick, slug],
  );

  const handlePointerDown = useCallback(
    (event) => {
      onStartCardLongPress?.(event, slug);
    },
    [onStartCardLongPress, slug],
  );

  const selectionOverlay = <SelectionOverlay />;
  const hoverOverlay = (
    <CatalogCardHoverOverlay
      centered={isRowMode}
      onOpen={handleOpen}
      openAriaLabel={`Открыть ${family} в редакторе`}
      downloadButtonProps={{
        primaryLabel: 'Скачать',
        primaryAriaLabel: `Скачать пакет ${family}`,
        onPrimaryClick: () => void onDownloadPackageZip?.(item),
        menuItems: [
          {
            key: 'zip',
            label: 'ZIP (по умолчанию)',
            onSelect: () => void onDownloadPackageZip?.(item),
          },
          {
            key: 'ttf',
            label: 'TTF',
            onSelect: () => void onDownloadAsFormat?.(item, 'ttf'),
          },
          {
            key: 'otf',
            label: 'OTF',
            onSelect: () => void onDownloadAsFormat?.(item, 'otf'),
          },
          {
            key: 'woff',
            label: 'WOFF',
            onSelect: () => void onDownloadAsFormat?.(item, 'woff'),
          },
          {
            key: 'current-file',
            label: 'WOFF2',
            onSelect: () => void onDownloadAsFormat?.(item, 'woff2'),
          },
          {
            key: 'variable',
            label: 'Variable вариант',
            hidden: !isVariable,
            onSelect: () => void onDownloadVariableVariant?.(item),
          },
        ],
      }}
    />
  );

  const actions = (
    <CatalogLibraryActions
      libraries={fontLibraries}
      busy={busy}
      busyIndicator={<CatalogSessionAddSpinner />}
      appearance={isRowMode ? 'row' : 'default'}
      stateKey={libraryEntry?.id || slug}
      onAddFontToLibrary={onAddFontToLibrary}
      onRequestCreateLibrary={onRequestCreateLibrary}
      libraryEntry={libraryEntry}
    />
  );

  if (isRowMode) {
    return (
      <CatalogRowModeCard
        family={family}
        metaItems={[
          getFontCategoryLabelRu(item?.category) || 'Fontsource',
          isVariable ? 'vf' : null,
          hasItalic ? 'italic' : null,
          subsetCount > 0 ? `${subsetCount} ${pluralRu(subsetCount, 'язык', 'языка', 'языков')}` : null,
          subsetCount > 0 ? `${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}` : null,
          `${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}`,
        ]}
        previewFamily={previewFamily}
        previewText={family}
        previewProps={{
          ref: handlePreviewRef,
          'data-fontsource-slug': slug,
        }}
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
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );
  }

  return (
    <CatalogFontCard
      selected={selected}
      onClick={handleCardClick}
      onPointerDown={handlePointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      busy={busy}
      minHeightClass="min-h-[148px] min-w-0"
      selectionOverlay={selectionOverlay}
      hoverOverlay={hoverOverlay}
      actions={actions}
      title={family}
      preview={
        <div
          ref={handlePreviewRef}
          data-fontsource-slug={slug}
          className="mt-2 min-h-[1.75rem] flex-1 truncate text-[1.75rem] leading-tight text-gray-800"
          style={{ fontFamily: previewFamily }}
        >
          {previewText}
        </div>
      }
      footer={
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate text-xs uppercase font-semibold text-gray-800">
              {getFontCategoryLabelRu(item?.category) || 'Fontsource'}
            </span>
            {isVariable ? (
              <span className="text-xs uppercase font-semibold text-gray-800">
                vf
              </span>
            ) : null}
            {hasItalic ? (
              <span className="text-xs uppercase font-semibold text-gray-800">
                italic
              </span>
            ) : null}
          </div>
          <div className="shrink-0 flex items-center justify-end gap-1.5 text-right text-xs uppercase font-semibold tabular-nums leading-snug text-gray-800">
            <span className="whitespace-nowrap">
              {`${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}`}
            </span>
            {subsetCount > 0 ? (
              <span className="whitespace-nowrap">
                {`${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}`}
              </span>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

export const FontsourceCatalogCard = memo(FontsourceCatalogCardComponent);
