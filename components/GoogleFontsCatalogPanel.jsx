 import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { VirtualizedGlyphGrid } from './ui/VirtualizedGlyphGrid';
import { toast } from '../utils/appNotify';
import { ensureGoogleFontPreviewCss, removeAllGoogleFontPreviewCss } from '../utils/googleFontPreviewCss';
import { HexProgressLoader } from './ui/HexProgressLoader';
import { CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX } from './ui/CatalogRowModeCard';
import { GoogleFontsCatalogCard } from './ui/GoogleFontsCatalogCard';
import { useCatalogToolbarLayout } from './ui/useCatalogToolbarLayout';
import { addLibraryEntryToLibrary } from '../utils/libraryEntryActions';
import {
  clearGoogleFontCatalogCache,
  readGoogleFontCatalogCache,
  writeGoogleFontCatalogCache,
} from '../utils/googleFontCatalogCache';
import {
  createCatalogLibraryEntry,
  isGoogleFontInSession,
} from '../utils/fontLibraryUtils';
import { writeLibraryFontDragData } from '../utils/libraryDragData';
import {
  compareFontCategoryLabelsRu,
  getFontCategoryLabelRu,
} from '../utils/fontCategoryLabels';
import { getFontSubsetLabelRu } from '../utils/fontSubsetLabels';
import { compareFontFamilyName } from '../utils/fontSort';
import { isInteractiveTarget } from '../utils/dom/isInteractiveTarget';
import { useLongPressMultiSelect } from './ui/useLongPressMultiSelect';
import { useStickyTimedSet } from './ui/useStickyTimedSet';
import { CatalogPanelToolbar } from './ui/CatalogPanelToolbar';
import { filterSortCatalogItems } from '../utils/catalogFilterSort';
import { useSelectionActionsEffect } from './ui/useSelectionActionsEffect';
import { useCatalogEngine } from './ui/useCatalogEngine';
import { useOverlayScrollbar } from './ui/useOverlayScrollbar';
import {
  buildArchiveBlobFromEntries,
  buildGoogleFormatArchiveEntry,
  buildGooglePackageArchiveEntry,
  buildSelectionArchiveEntries,
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
  saveArchiveBlob,
} from '../utils/catalogDownloadActions';

function GoogleCatalogEmptyLoader() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-8">
      <HexProgressLoader size={64} className="shrink-0" />
    </div>
  );
}

function scheduleIdle(fn) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: 1500 });
    return () => cancelIdleCallback(id);
  }
  const t = setTimeout(fn, 40);
  return () => clearTimeout(t);
}

/** Те же колонки, что в классах grid-cols-2 md:3 lg:4 xl:5 */
function googleFontCatalogGridCols(viewportWidth) {
  if (viewportWidth <= 0) return 2;
  if (viewportWidth >= 1280) return 5;
  if (viewportWidth >= 1024) return 4;
  return 2;
}

const GRID_GAP_PX = 16;
const CARD_LONG_PRESS_MS = 220;
const RECENT_ADD_VISIBLE_MS = 900;
/** Карточка остаётся в сетке дольше, чем горит галочка в меню «+», иначе виртуализатор снимает строку. */
const RECENT_ADD_CATALOG_STICKY_MS = RECENT_ADD_VISIBLE_MS + 1300;

export default function GoogleFontsCatalogPanel({
  fonts,
  fontLibraries = [],
  onAddFontToLibrary,
  onRequestCreateLibrary,
  onOpenGoogleEntryInEditorTab,
  trailingToolbar = null,
  isActive = true,
  onSelectionActionsChange,
  /** Сообщить родителю актуальное число семейств в каталоге (для нижней полосы). */
  onTotalItemsChange,
}) {
  const {
    catalogScrollEl,
    setCatalogScrollContainer,
    setTrailingToolbarContainer,
    setGridInnerWidth,
    viewportW,
    gridCols,
    oneCardWidthPx,
    toolbarAlignToGrid,
  } = useCatalogToolbarLayout({
    trailingToolbar,
    gridGapPx: GRID_GAP_PX,
    gridColsResolver: googleFontCatalogGridCols,
    autoMeasureGridWidth: true,
    enabled: isActive,
  });
  const [items, setItems] = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [addingFamily, setAddingFamily] = useState(null);
  const {
    overlayThumb,
    scrollbarVisible,
    setScrollElement,
    syncScrollLayout,
  } = useOverlayScrollbar();
  const { set: recentlyAddedFamilies, mark: markFamilyRecentlyAdded } =
    useStickyTimedSet(RECENT_ADD_VISIBLE_MS);
  const sorters = useMemo(
    () => ({
      'name-asc': compareFontFamilyName,
      'name-desc': (a, b) => compareFontFamilyName(b, a),
      category: (a, b) => {
        const c = compareFontCategoryLabelsRu(a.category, b.category);
        if (c !== 0) return c;
        return compareFontFamilyName(a, b);
      },
      stroke: (a, b) => {
        const s = (a.stroke || '').localeCompare(b.stroke || '', 'ru', { sensitivity: 'base' });
        if (s !== 0) return s;
        return compareFontFamilyName(a, b);
      },
      'styles-desc': (a, b) =>
        (b.styleCount || 0) !== (a.styleCount || 0)
          ? (b.styleCount || 0) - (a.styleCount || 0)
          : compareFontFamilyName(a, b),
      'styles-asc': (a, b) =>
        (a.styleCount || 0) !== (b.styleCount || 0)
          ? (a.styleCount || 0) - (b.styleCount || 0)
          : compareFontFamilyName(a, b),
      'subsets-desc': (a, b) =>
        (b.subsets?.length || 0) !== (a.subsets?.length || 0)
          ? (b.subsets?.length || 0) - (a.subsets?.length || 0)
          : compareFontFamilyName(a, b),
      catalog: (a, b) => (a.defaultSort ?? 0) - (b.defaultSort ?? 0),
    }),
    [],
  );

  const {
    controls,
    filteredSortedItems,
    itemsNotInSession: catalogItemsNotInSession,
    toolbarProps,
  } = useCatalogEngine({
    controlsConfig: {
      initialSortMode: 'catalog',
      includeSearchInHasActiveFilters: false,
      clearSearchOnClearFilters: false,
    },
    rawItems: items,
    fonts,
    fontLibraries,
    sourcePrefix: 'google',
    getKey: (entry) => entry?.family,
    isInSession: (fontsState, family) => isGoogleFontInSession(fontsState, family),
    addingKey: addingFamily,
    recentlyAddedSet: recentlyAddedFamilies,
    exclusionOrder: 'afterFilterSort',
    filterSortItems: (list, c) =>
      filterSortCatalogItems(
        list,
        {
          searchQuery: c.searchQuery,
          getSearchTokens: (x) => [
            x.family,
            x.category,
            getFontCategoryLabelRu(x.category),
            x.stroke,
            ...(x.subsets || []),
            ...(x.subsets || []).map((subset) => getFontSubsetLabelRu(subset)),
          ],
          filterCategory: c.filterCategory,
          getCategory: (x) => x?.category,
          filterSubset: c.filterSubset,
          getSubsets: (x) => x?.subsets,
          filterVariable: c.filterVariable,
          isVariable: (x) => x?.isVariable,
          filterItalicOnly: c.filterItalicOnly,
          hasItalic: (x) => x?.hasItalic,
        },
        c.sortMode,
        sorters,
        sorters.catalog,
      ),
    toolbar: {
      trailingToolbar,
      trailingContainerRef: setTrailingToolbarContainer,
      viewportW,
      toolbarAlignToGrid,
      oneCardWidthPx,
      ids: {
        searchId: 'gf-catalog-search',
        categoryFilterId: 'gf-filter-category',
        variableFilterId: 'gf-filter-var',
        subsetFilterId: 'gf-filter-subset',
      },
      searchPlaceholder: 'Имя, категория, код набора…',
      sortOptions: [
        { value: 'catalog', label: 'Популярное' },
        { value: 'name-asc', label: 'А -> Я' },
        { value: 'name-desc', label: 'Я -> А' },
        { value: 'category', label: 'Категория -> имя' },
        { value: 'styles-desc', label: 'Больше начертаний' },
        { value: 'styles-asc', label: 'Меньше начертаний' },
        { value: 'subsets-desc', label: 'Больше символов' },
      ],
      clearFiltersButtonClassName:
        'box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm uppercase font-semibold text-accent disabled:cursor-default disabled:opacity-40 disabled:text-gray-900',
      facetItemsResolver: ({ rawItems }) => rawItems,
      getCategory: (x) => x?.category,
      getSubsets: (x) => x?.subsets,
      compareCategory: compareFontCategoryLabelsRu,
      compareSubset: (a, b) => String(a).localeCompare(String(b)),
      getCategoryLabel: (c) => getFontCategoryLabelRu(c),
      countsResolver: ({ filteredSortedItems: f, itemsNotInSession: v }) => ({
        count: v.length,
        countTotal: f.length,
      }),
    },
  });
  /** Режим ROW: один образец для всех строк (null — у каждой строки имя семейства). */
  const [googleRowGlobalSample, setGoogleRowGlobalSample] = useState(null);
  const {
    selectedKeys: selectedFamilies,
    setSelectedKeys: setSelectedFamilies,
    toggleSelectedKey: toggleSelectedFamily,
    startLongPress: startCardLongPress,
    onCardClick,
    clearLongPressTimer,
    pruneSelection,
  } = useLongPressMultiSelect({ longPressMs: CARD_LONG_PRESS_MS, isInteractiveTarget });

  useEffect(() => {
    onTotalItemsChange?.(items.length);
  }, [items, onTotalItemsChange]);

  const setCatalogScrollRefs = useCallback(
    (node) => {
      setCatalogScrollContainer(node);
      setScrollElement(node);
    },
    [setCatalogScrollContainer, setScrollElement],
  );

  // markFamilyRecentlyAdded handled by useStickyTimedSet

  const { gridViewMode } = controls;
  const showFontGrid = filteredSortedItems.length > 0 && catalogItemsNotInSession.length > 0;

  useEffect(() => {
    syncScrollLayout();
  }, [syncScrollLayout, gridViewMode, filteredSortedItems.length, catalogItemsNotInSession.length, gridCols]);

  // clearLongPressTimer cleanup handled inside useLongPressMultiSelect

  useEffect(() => {
    if (!isActive) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const cachedItems = readGoogleFontCatalogCache();
        if (cachedItems.length > 0 && !cancelled) {
          setItems(cachedItems);
          return;
        }

        clearGoogleFontCatalogCache();
        const res = await fetch('/api/google-fonts-catalog');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data.items) ? data.items : [];
        if (!cancelled) {
          setItems(list);
          writeGoogleFontCatalogCache(list);
        }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(e.message || 'Ошибка');
          console.error('[GoogleFontsCatalogPanel] catalog', e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive]);

  useEffect(() => {
    return () => {
      removeAllGoogleFontPreviewCss();
    };
  }, []);

  /** Фон: постепенно подключаем CSS-превью для текущего отфильтрованного списка. */
  useEffect(() => {
    if (!isActive) return undefined;
    if (!filteredSortedItems.length) return;
    let cursor = 0;
    let cancelled = false;
    let cancelIdle = null;
    const CHUNK = 10;
    const arr = filteredSortedItems;

    const step = () => {
      if (cancelled) return;
      const end = Math.min(cursor + CHUNK, arr.length);
      for (let i = cursor; i < end; i++) {
        ensureGoogleFontPreviewCss(arr[i]);
      }
      cursor = end;
      if (cursor >= arr.length) return;
      if (cancelled) return;
      cancelIdle = scheduleIdle(step);
    };

    cancelIdle = scheduleIdle(step);
    return () => {
      cancelled = true;
      if (cancelIdle) cancelIdle();
    };
  }, [filteredSortedItems, isActive]);

  useEffect(() => {
    const visibleFamilies = new Set(catalogItemsNotInSession.map((entry) => entry.family));
    pruneSelection(visibleFamilies);
  }, [catalogItemsNotInSession, pruneSelection]);

  const commitGoogleRowGlobalSample = useCallback((text) => {
    const t = String(text ?? '').trim();
    setGoogleRowGlobalSample(t === '' ? null : t);
  }, []);

  // startCardLongPress / onCardClick are provided by useLongPressMultiSelect

  const openGoogleInEditor = useCallback(
    async (entry) => {
      if (typeof onOpenGoogleEntryInEditorTab !== 'function') return;
      const family = entry?.family;
      if (!family) return;
      setAddingFamily(family);
      try {
        await onOpenGoogleEntryInEditorTab(entry);
      } finally {
        setAddingFamily(null);
      }
    },
    [onOpenGoogleEntryInEditorTab],
  );

  const downloadSelectedGoogle = useCallback(async () => {
    const selected = catalogItemsNotInSession.filter((entry) => selectedFamilies.has(entry.family));
    if (selected.length === 0) return;
    if (selected.length > 1) {
      const files = await buildSelectionArchiveEntries(selected, buildGooglePackageArchiveEntry);
      if (files.length > 0) {
        const archiveBlob = await buildArchiveBlobFromEntries(files);
        const stamp = new Date().toISOString().slice(0, 10);
        saveArchiveBlob(archiveBlob, `google-selected-${stamp}.zip`);
        toast.success(
          files.length === 1
            ? 'Скачан 1 шрифт в архиве'
            : `Скачано ${files.length} шрифтов в одном архиве`,
        );
      } else {
        toast.error('Не удалось собрать архив выделенных шрифтов');
      }
      return;
    }
    let okCount = 0;
    for (const entry of selected) {
      // Последовательная загрузка снижает шанс упереться в лимиты.
      // eslint-disable-next-line no-await-in-loop
      const ok = await downloadGooglePackageZip(entry, { silent: true });
      if (ok) okCount += 1;
    }
    if (okCount > 0) {
      toast.success(
        okCount === 1 ? 'Скачан 1 шрифт из выделенных' : `Скачано ${okCount} шрифтов из выделенных`,
      );
    }
  }, [catalogItemsNotInSession, selectedFamilies]);

  const downloadSelectedGoogleAsFormat = useCallback(async (format) => {
    const selected = catalogItemsNotInSession.filter((entry) => selectedFamilies.has(entry.family));
    if (selected.length === 0) return;
    const targetFormat = String(format || 'woff2').toLowerCase();
    if (selected.length > 1) {
      const files = await buildSelectionArchiveEntries(
        selected,
        (entry) => buildGoogleFormatArchiveEntry(entry, targetFormat),
      );
      if (files.length > 0) {
        const archiveBlob = await buildArchiveBlobFromEntries(files);
        const stamp = new Date().toISOString().slice(0, 10);
        saveArchiveBlob(archiveBlob, `google-selected-${targetFormat}-${stamp}.zip`);
        toast.success(
          files.length === 1
            ? `Скачан 1 шрифт (${targetFormat.toUpperCase()}) в архиве`
            : `Скачано ${files.length} шрифтов (${targetFormat.toUpperCase()}) в одном архиве`,
        );
      } else {
        toast.error(`Не удалось собрать архив ${targetFormat.toUpperCase()}`);
      }
      return;
    }
    let okCount = 0;
    for (const entry of selected) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await downloadGoogleAsFormat(entry, targetFormat, { silent: true });
      if (ok) okCount += 1;
    }
    if (okCount > 0) {
      toast.success(
        okCount === 1
          ? `Скачан 1 шрифт (${targetFormat.toUpperCase()})`
          : `Скачано ${okCount} шрифтов (${targetFormat.toUpperCase()})`,
      );
    }
  }, [catalogItemsNotInSession, selectedFamilies]);

  const selectedGoogleLibraryEntries = useMemo(
    () =>
      catalogItemsNotInSession
        .filter((entry) => selectedFamilies.has(entry.family))
        .map((entry) =>
          createCatalogLibraryEntry({
            source: 'google',
            key: entry.family,
            label: entry.family,
          }),
        ),
    [catalogItemsNotInSession, selectedFamilies],
  );

  const moveSelectedGoogleToLibrary = useCallback(
    async (libraryId) => {
      if (!libraryId || selectedGoogleLibraryEntries.length === 0) return false;
      let movedCount = 0;
      for (const libraryEntry of selectedGoogleLibraryEntries) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await addLibraryEntryToLibrary({ libraryId, libraryEntry, onAddFontToLibrary });
        if (ok) movedCount += 1;
      }
      if (movedCount === 0) return false;
      setSelectedFamilies(new Set());
      toast.success(
        movedCount === 1
          ? 'Добавлен 1 шрифт в библиотеку'
          : `Добавлено ${movedCount} шрифтов в библиотеку`,
      );
      return true;
    },
    [onAddFontToLibrary, selectedGoogleLibraryEntries, setSelectedFamilies],
  );

  const createLibraryFromSelectedGoogle = useCallback(() => {
    if (selectedGoogleLibraryEntries.length === 0) return false;
    onRequestCreateLibrary?.(selectedGoogleLibraryEntries);
    return true;
  }, [onRequestCreateLibrary, selectedGoogleLibraryEntries]);

  useSelectionActionsEffect({
    isActive,
    onSelectionActionsChange,
    selectedCount: selectedFamilies.size,
    downloadSelected: downloadSelectedGoogle,
    downloadSelectedAsFormat: downloadSelectedGoogleAsFormat,
    moveSelected: moveSelectedGoogleToLibrary,
    createLibraryFromSelection: createLibraryFromSelectedGoogle,
  });

  const addGoogleToLibrary = useCallback(
    async (libraryId, libraryEntry) => {
      const family = libraryEntry?.label || '';
      if (!family) return false;
      const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      setAddingFamily(family);
      try {
        const ok = await addLibraryEntryToLibrary({ libraryId, libraryEntry, onAddFontToLibrary });
        if (ok) {
          const elapsed = typeof performance !== 'undefined' ? performance.now() - t0 : RECENT_ADD_VISIBLE_MS;
          if (elapsed < RECENT_ADD_VISIBLE_MS) {
            await new Promise((resolve) => setTimeout(resolve, RECENT_ADD_VISIBLE_MS - elapsed));
          }
          // После спиннера: иначе таймер «недавно добавлен» снимает карточку с сетки в тот же кадр, что и галочка.
          markFamilyRecentlyAdded(family, RECENT_ADD_CATALOG_STICKY_MS);
        }
        return ok;
      } finally {
        setAddingFamily(null);
      }
    },
    [markFamilyRecentlyAdded, onAddFontToLibrary],
  );

  const handleDragStart = useCallback((event, libraryEntry) => {
    if (isInteractiveTarget(event.target)) {
      event.preventDefault();
      return;
    }
    const wrote = writeLibraryFontDragData(event.dataTransfer, libraryEntry);
    if (!wrote) {
      event.preventDefault();
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden gap-4">
      <CatalogPanelToolbar {...toolbarProps} />

      {catalogError && items.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm text-red-600">Каталог Google: {catalogError}</p>
      ) : items.length === 0 ? (
        <GoogleCatalogEmptyLoader />
      ) : filteredSortedItems.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm uppercase text-gray-500">
          Ничего не найдено — попробуйте другой запрос
        </p>
      ) : catalogItemsNotInSession.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm uppercase text-gray-500">
          Все шрифты из этой выдачи уже в сессии. Переключайте их во вкладках над областью просмотра
        </p>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={setCatalogScrollRefs}
            className="catalog-scroll-area min-h-0 flex-1 overflow-x-hidden overflow-y-auto [align-content:start]"
          >
            {catalogScrollEl ? (
              <VirtualizedGlyphGrid
                scrollParentEl={catalogScrollEl}
                totalCount={catalogItemsNotInSession.length}
                estimatedRowHeightPx={
                  gridViewMode === 'row' ? CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX : 172
                }
                columnCount={gridViewMode === 'row' ? 1 : gridCols}
                rowGapPx={gridViewMode === 'row' ? 0 : GRID_GAP_PX}
                overscanRows={2}
                onInnerWidth={setGridInnerWidth}
                onVisibleIndexRangeChange={({ startIndex, endIndex }) => {
                  for (let i = startIndex; i <= endIndex; i++) {
                    const e = catalogItemsNotInSession[i];
                    if (e) ensureGoogleFontPreviewCss(e);
                  }
                }}
                renderItem={(index) => {
                  const entry = catalogItemsNotInSession[index];
                  if (!entry) return null;
                  const family = entry.family;
                  const busy = addingFamily === family;
                  const isRowMode = gridViewMode === 'row';

                  return (
                    <GoogleFontsCatalogCard
                      entry={entry}
                      busy={busy}
                      selected={selectedFamilies.has(family)}
                      isRowMode={isRowMode}
                      fontLibraries={fontLibraries}
                      onAddFontToLibrary={addGoogleToLibrary}
                      onRequestCreateLibrary={onRequestCreateLibrary}
                      onOpenInEditor={openGoogleInEditor}
                      onDownloadPackageZip={downloadGooglePackageZip}
                      onDownloadAsFormat={downloadGoogleAsFormat}
                      onDownloadVariableVariant={downloadGoogleVariableVariant}
                      onCardClick={onCardClick}
                      onStartCardLongPress={startCardLongPress}
                      onPointerUp={clearLongPressTimer}
                      onPointerLeave={clearLongPressTimer}
                      onPointerCancel={clearLongPressTimer}
                      draggable
                      onDragStart={handleDragStart}
                      rowCatalogPreviewText={googleRowGlobalSample == null ? undefined : googleRowGlobalSample}
                      onRowGlobalSampleCommit={commitGoogleRowGlobalSample}
                      previewText="AaBbCcDdEe"
                      footerRightTooltipContent="По метаданным Google Fonts: статические начертания и поднаборы символов (subsets)"
                    />
                  );
                }}
              />
            ) : null}
          </div>
          {overlayThumb ? (
            <div className="pointer-events-none absolute right-0 top-2 bottom-2 z-20 w-2" aria-hidden>
              <div
                className={`absolute right-1 w-1.5 rounded-full bg-gray-400 transition-opacity duration-200 ${
                  scrollbarVisible ? 'opacity-90' : 'opacity-0'
                }`}
                style={{
                  top: `${overlayThumb.top}px`,
                  height: `${overlayThumb.thumbHeight}px`,
                }}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
