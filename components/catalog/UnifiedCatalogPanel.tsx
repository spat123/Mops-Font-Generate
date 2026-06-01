import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MergedCatalogItem } from '../../types/catalog';
import type { GoogleFontCatalogRow } from '../../utils/googleFontCatalogCache';
import type { FontsourceCatalogRow } from '../../utils/fontsourceCatalogCache';
import type { SlugFamilyCatalogRow } from '../../utils/createSlugFamilyCatalogCache';
import type { SavedLibraryRecord, SessionFontRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';
import type { SelectionToolbarActions } from '../../types/savedLibrary';
import { toast } from '../../utils/appNotify';
import { HexProgressLoader } from '../ui/HexProgressLoader';
import { useCatalogToolbarLayout } from './useCatalogToolbarLayout';
import { useCatalogEngine } from './useCatalogEngine';
import { CatalogPanelToolbar } from './CatalogPanelToolbar';
import { OverlayScrollbar } from '../ui/OverlayScrollbar';
import { useOverlayScrollbar } from '../ui/useOverlayScrollbar';
import {
  getCatalogItemLicenseKeys,
  CATALOG_LICENSE_LABELS_RU,
  compareCatalogLicenseLabels,
  buildCatalogLicenseInheritIndex,
  setCatalogLicenseInheritIndex,
} from '../../utils/catalogLicenseFilter';
import { getCatalogItemFeelingKeys, getCatalogFeelingLabelRu } from '../../utils/catalogFeelingFilter';
import { getCatalogItemShapeKeys, getCatalogShapeLabelRu } from '../../utils/catalogShapeFilter';
import { getCatalogItemCalligraphyKeys } from '../../utils/catalogCalligraphyFilter';
import { filterCatalogItems, sortCatalogItems } from '../../utils/catalogFilterSort';
import { attachUnifiedCatalogSearchIndex } from '../../utils/catalogSearchTokens';
import { prepareCatalogSearchQuery } from '../../utils/searchMatching';
import { compareFontCategoryLabelsRu, getFontCategoryLabelRu, resolveCatalogCategory } from '../../utils/fontCategoryLabels';
import { getFontSubsetLabelRu } from '../../utils/fontSubsetLabels';
import { useLongPressMultiSelect } from '../ui/useLongPressMultiSelect';
import { useStickyTimedSet } from '../ui/useStickyTimedSet';
import { isInteractiveTarget } from '../../utils/dom/isInteractiveTarget';
import { useSelectionActionsEffect } from '../ui/useSelectionActionsEffect';
import { addLibraryEntryToLibrary } from '../../utils/libraryEntryActions';
import { writeLibraryFontDragData } from '../../utils/libraryDragData';
import {
  buildArchiveBlobFromEntries,
  buildFontsharePackageArchiveEntry,
  buildFontsourcePackageArchiveEntry,
  buildGooglePackageArchiveEntry,
  buildSelectionArchiveEntries,
  downloadFontshareAsFormat,
  downloadFontsharePackageZip,
  downloadFontshareVariableVariant,
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
  saveArchiveBlob,
} from '../../utils/catalogDownloadActions';
import { ensureGoogleFontPreviewCss, removeAllGoogleFontPreviewCss } from '../../utils/googleFontPreviewCss';
import {
  getFontsourcePreviewFamily,
  hasFontsourcePreviewFamily,
  loadFontsourcePreviewFamily,
  resetFontsourcePreviewCache,
} from '../../utils/fontsourcePreviewRuntimeCache';
import {
  getFontsharePreviewFamily,
  hasFontsharePreviewFamily,
  loadFontsharePreviewFamily,
} from '../../utils/fontsharePreviewRuntimeCache';
import { normalizeFontshareCatalogItems } from '../../utils/fontshareCatalogNormalize';
import {
  mergeCatalogSources,
  bestDownloadSourceId,
  bestPreviewSourceId,
  buildUnifiedLibraryEntry,
  compareUnifiedCatalogByPopular,
  isUnifiedCatalogItemFullyInSession,
} from '../../utils/unifiedCatalogMerge';
import {
  openCatalogItemInEditor,
  downloadCatalogItemPackage,
  downloadCatalogItemAsFormat,
} from '../../utils/catalogPreferredSource';
import { catalogOpenDbg } from '../../utils/catalogOpenDebugLog';
import { catalogFetchDbg } from '../../utils/catalogFetchDebugLog';
import {
  clearGoogleFontCatalogCache,
  readGoogleFontCatalogCache,
  writeGoogleFontCatalogCache,
} from '../../utils/googleFontCatalogCache';
import {
  enrichGoogleCatalogRows,
  fetchGoogleFamilyTagsMaps,
  googleCatalogHasCalligraphyMetadata,
  googleCatalogHasTagMetadata,
} from '../../utils/googleFontFamilyTags';
import {
  readFontsourceCatalogCache,
  writeFontsourceCatalogCache,
  readFontsourceCatalogCacheAsync,
  pickBetterFontsourceCatalogLists,
  FONTSOURCE_MIN_FULL_CATALOG_SIZE,
  isFontsourceCatalogComplete,
  isWeakFontsourceCatalogPayload,
  fetchFontsourceCatalogFromFontlist,
} from '../../utils/fontsourceCatalogCache';
import { readFontshareCatalogCache, writeFontshareCatalogCache } from '../../utils/fontshareCatalogCache';
import { copyCatalogItemShareLink } from '../../utils/catalogShareLink';
import { readFontfabricTrialCatalogCache, writeFontfabricTrialCatalogCache } from '../../utils/fontfabricTrialCatalogCache';
import { UnifiedCatalogPanelItem } from './UnifiedCatalogPanelItem';
import {
  isCatalogGridPreviewMultiline,
  pickFontsourcePreviewSubsetsForCardText,
  resolveCatalogCardPreviewText,
  resolveCatalogGlobalPreviewText,
} from '../../utils/catalogPreviewSample';
const GRID_GAP_PX = 16;
const CARD_LONG_PRESS_MS = 220;
const MIN_LOADER_VISIBLE_MS = 900;
const RECENT_ADD_STICKY_MS = MIN_LOADER_VISIBLE_MS + 1300;
const CHUNKED_RENDER_THRESHOLD = 80;
const PREVIEW_CONCURRENCY_LIMIT = 6;
const PREVIEW_VIEWPORT_ROOT_MARGIN = '480px 0px';
const SCROLL_RENDER_NEAR_BOTTOM_PX = 520;
const ROW_MODE_HEIGHT_PX = 240;
const GRID_CARD_HEIGHT_PX = 168;
const FONTSHARE_MIN_FULL_CATALOG_SIZE = 80;

// Сессионная защёлка: не перезапрашивать каталоги при каждом ремоунте/возврате.
let hasFetchedUnifiedCatalogNetworkThisSession = false;

type CatalogCachesSnapshot = {
  google: GoogleFontCatalogRow[];
  fontsource: FontsourceCatalogRow[];
  fontshare: SlugFamilyCatalogRow[];
  trial: SlugFamilyCatalogRow[];
  hasCached: boolean;
};

function unifiedCatalogGridCols(viewportWidth) {
  if (viewportWidth <= 0) return 2;
  if (viewportWidth >= 1280) return 5;
  if (viewportWidth >= 1024) return 4;
  return 2;
}

function UnifiedCatalogEmptyLoader() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-8">
      <HexProgressLoader size={64} className="shrink-0" />
    </div>
  );
}

function normalizeDirectFontsourceRow(row) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || '').trim();
  const family = String(row.family || '').trim();
  if (!id || !family) return null;
  const weights = Array.isArray(row.weights)
    ? row.weights.map((x) => Number(x)).filter((x) => Number.isFinite(x))
    : [];
  const styles = Array.isArray(row.styles)
    ? row.styles.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  const subsets = Array.isArray(row.subsets)
    ? row.subsets.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  return {
    id,
    slug: id,
    family,
    label: family,
    category: resolveCatalogCategory({ category: row.category, family, id, slug: id }) || '',
    primaryScript: String(row.primaryScript || ''),
    weights,
    styles,
    subsets,
    isVariable: Boolean(row.variable),
    hasItalic: styles.includes('italic'),
    styleCount: Math.max(1, weights.length * Math.max(1, styles.length)),
    popularityScore: Number(row.popularityScore) || 0,
    source: 'fontsource',
  };
}

async function buildUnifiedPackageArchiveEntry(item) {
  const sourceId = bestDownloadSourceId(item);
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const src = sources.find((s) => s?.id === sourceId) || null;
  const raw = src?.raw || null;
  if (!raw) return null;

  if (sourceId === 'google') return buildGooglePackageArchiveEntry(raw);
  if (sourceId === 'fontsource') return buildFontsourcePackageArchiveEntry(raw);
  if (sourceId === 'fontshare') return buildFontsharePackageArchiveEntry(raw);
  return null;
}

export type UnifiedCatalogPanelProps = {
  fonts: SessionFontRecord[];
  fontLibraries?: SavedLibraryRecord[];
  onAddFontToLibrary?: (libraryId: string, entry: SavedLibraryFontEntry) => boolean | Promise<boolean>;
  onRequestCreateLibrary?: (entries: SavedLibraryFontEntry[]) => void;
  onOpenGoogleEntryInEditorTab?: (entry: Record<string, unknown>) => void | Promise<unknown>;
  onOpenFontsourceInEditorTab?: (slug: string, isVariable: boolean) => void | Promise<unknown>;
  onOpenFontshareInEditorTab?: (slug: string) => void | Promise<unknown>;
  onOpenTrialPage?: (raw: Record<string, unknown>) => void;
  onUploadTrial?: unknown;
  isActive?: boolean;
  onSelectionActionsChange?: (actions: SelectionToolbarActions) => void;
};

export default function UnifiedCatalogPanel({
  fonts,
  fontLibraries = [],
  onAddFontToLibrary,
  onRequestCreateLibrary,
  onOpenGoogleEntryInEditorTab,
  onOpenFontsourceInEditorTab,
  onOpenFontshareInEditorTab,
  onOpenTrialPage,
  onUploadTrial,
  isActive = true,
  onSelectionActionsChange,
}: UnifiedCatalogPanelProps) {
  const {
    catalogScrollEl,
    setCatalogScrollContainer,
    setGridWidthMeasureContainer,
    setTrailingToolbarContainer,
    viewportW,
    gridCols,
    oneCardWidthPx,
    toolbarAlignToGrid,
  } = useCatalogToolbarLayout({
    trailingToolbar: true,
    gridGapPx: GRID_GAP_PX,
    gridColsResolver: unifiedCatalogGridCols,
    autoMeasureGridWidth: true,
    enabled: isActive,
  });

  const {
    overlayThumb,
    scrollbarVisible,
    isDragging,
    onTrackPointerDown,
    onThumbPointerDown,
    onScrollbarPointerMove,
    onScrollbarPointerUp,
    setScrollElement,
    syncScrollLayout,
  } = useOverlayScrollbar();

  const setCatalogScrollRefs = useCallback(
    (node) => {
      setCatalogScrollContainer(node);
      setScrollElement(node);
    },
    [setCatalogScrollContainer, setScrollElement],
  );

  const setPanelRootRef = useCallback(
    (node: HTMLElement | null) => {
      setGridWidthMeasureContainer(node);
    },
    [setGridWidthMeasureContainer],
  );

  const readCaches = (): CatalogCachesSnapshot => {
    if (typeof window === 'undefined') {
      return {
        google: [],
        fontsource: [],
        fontshare: [],
        trial: [],
        hasCached: false,
      };
    }
    const cachedGoogle = readGoogleFontCatalogCache();
    const cachedFontsource = readFontsourceCatalogCache();
    const cachedFontshare = readFontshareCatalogCache();
    const cachedTrial = readFontfabricTrialCatalogCache();
    const hasCached =
      cachedGoogle.length > 0 || cachedFontsource.length > 0 || cachedFontshare.length > 0 || cachedTrial.length > 0;
    return {
      google: cachedGoogle,
      fontsource: cachedFontsource,
      fontshare: cachedFontshare,
      trial: cachedTrial,
      hasCached,
    };
  };

  const initialCaches = readCaches();

  const [googleItems, setGoogleItems] = useState<GoogleFontCatalogRow[]>(initialCaches.google);
  const [fontsourceItems, setFontsourceItems] = useState<FontsourceCatalogRow[]>(initialCaches.fontsource);
  const [fontshareItems, setFontshareItems] = useState<SlugFamilyCatalogRow[]>(initialCaches.fontshare);
  const [trialItems, setTrialItems] = useState<SlugFamilyCatalogRow[]>(initialCaches.trial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInitialCatalogLoading, setIsInitialCatalogLoading] = useState(!initialCaches.hasCached);
  const [areCardsVisible, setAreCardsVisible] = useState(initialCaches.hasCached);
  const [addingFamilyKey, setAddingFamilyKey] = useState(null);
  const [visibleCardsCount, setVisibleCardsCount] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  const { set: recentlyAddedKeys, mark: markKeyRecentlyAdded } = useStickyTimedSet(MIN_LOADER_VISIBLE_MS);

  const {
    selectedKeys: selectedFamilyKeys,
    setSelectedKeys: setSelectedFamilyKeys,
    startLongPress: startCardLongPress,
    onCardClick,
    clearLongPressTimer,
    pruneSelection,
  } = useLongPressMultiSelect({ longPressMs: CARD_LONG_PRESS_MS, isInteractiveTarget });

  const mergedAllItems = useMemo(
    () =>
      mergeCatalogSources({
        googleItems,
        fontsourceItems,
        fontshareItems,
        trialItems,
      }).map(attachUnifiedCatalogSearchIndex),
    [fontshareItems, fontsourceItems, googleItems, trialItems],
  );

  const mergedByKey = useMemo(() => new Map(mergedAllItems.map((it) => [it.familyKey, it])), [mergedAllItems]);
  const mergedByKeyRef = useRef(new Map());
  mergedByKeyRef.current = mergedByKey;

  const catalogItems = mergedAllItems;

  useEffect(() => {
    setCatalogLicenseInheritIndex(buildCatalogLicenseInheritIndex(mergedAllItems));
    return () => setCatalogLicenseInheritIndex(null);
  }, [mergedAllItems]);

  const sorters = useMemo(
    () => ({
      popular: compareUnifiedCatalogByPopular,
      'name-asc': (a, b) =>
        String(a.displayName || '').localeCompare(String(b.displayName || ''), 'ru', { sensitivity: 'base' }),
      'name-desc': (a, b) =>
        String(b.displayName || '').localeCompare(String(a.displayName || ''), 'ru', { sensitivity: 'base' }),
      category: (a, b) => {
        const byCategory = compareFontCategoryLabelsRu(a.category, b.category);
        if (byCategory !== 0) return byCategory;
        return String(a.displayName || '').localeCompare(String(b.displayName || ''), 'ru', { sensitivity: 'base' });
      },
      'styles-desc': (a, b) => (Number(b.styleCount) || 0) - (Number(a.styleCount) || 0),
      'styles-asc': (a, b) => (Number(a.styleCount) || 0) - (Number(b.styleCount) || 0),
      'subsets-desc': (a, b) =>
        (Array.isArray(b.subsets) ? b.subsets.length : 0) - (Array.isArray(a.subsets) ? a.subsets.length : 0),
    }),
    [],
  );

  const baseCountTotal = catalogItems.length;

  // Важно: facetCountConfig передаётся в useCatalogToolbarProps и участвует в deps useMemo.
  // Если создавать объект на каждый ререндер (например, из-за скролла/оверлей-скроллбара),
  // то buildCatalogFacetCountMaps будет пересчитываться на каждое движение колеса/hover.
  const facetCountConfig = useMemo(
    () => ({
      getSearchTokens: (item) => item.searchTokens,
      getCategory: (item) => item?.category,
      getSubsets: (item) => item?.subsets,
      isVariable: (item) => item?.isVariable,
      hasItalic: (item) => item?.hasItalic,
      getLicenseKeys: getCatalogItemLicenseKeys,
      getFeelingKeys: getCatalogItemFeelingKeys,
      getShapeKeys: getCatalogItemShapeKeys,
      getCalligraphyKeys: getCatalogItemCalligraphyKeys,
      getPreserveKey: (item) => item?.familyKey,
    }),
    [],
  );

  const isItemInSession = useCallback((fontsState, familyKey) => {
    const it = mergedByKeyRef.current.get(familyKey);
    if (!it) return false;
    return isUnifiedCatalogItemFullyInSession(fontsState, it);
  }, []);

  const {
    controls,
    filteredSortedItems,
    itemsNotInSession: catalogItemsNotInSession,
    toolbarProps,
  } = useCatalogEngine({
    controlsConfig: {
      initialSortMode: 'popular',
      includeSearchInHasActiveFilters: true,
      clearSearchOnClearFilters: true,
    },
    rawItems: catalogItems,
    fonts,
    fontLibraries,
    sourcePrefix: 'unified',
    getKey: (item) => item?.familyKey,
    isInSession: isItemInSession,
    addingKey: addingFamilyKey,
    recentlyAddedSet: recentlyAddedKeys,
    exclusionOrder: 'beforeFilterSort',
    filterPreserveKeys: selectedFamilyKeys,
    filterSortItems: (list, c) => {
      const searchQuery = c.searchQueryDebouncedTrimmed;
      const searchPrepared = searchQuery ? prepareCatalogSearchQuery(searchQuery) : null;
      const filterOpts = {
        searchQuery,
        searchPrepared,
        getSearchTokens: (item) => item.searchTokens,
        filterCategory: c.filterCategory,
        getCategory: (item) => item?.category,
        filterSubset: c.filterSubset,
        getSubsets: (item) => item?.subsets,
        filterVariable: c.filterVariable,
        isVariable: (item) => item?.isVariable,
        filterItalicOnly: c.filterItalicOnly,
        hasItalic: (item) => item?.hasItalic,
        filterLicense: c.filterLicense,
        getLicenseKeys: getCatalogItemLicenseKeys,
        filterFeeling: c.filterFeeling,
        getFeelingKeys: getCatalogItemFeelingKeys,
        filterShape: c.filterShape,
        getShapeKeys: getCatalogItemShapeKeys,
        filterCalligraphy: c.filterCalligraphy,
        getCalligraphyKeys: getCatalogItemCalligraphyKeys,
        filterRole: c.filterRole,
        preserveKeys: selectedFamilyKeys,
        getPreserveKey: (item) => item?.familyKey,
      };
      const filtered = filterCatalogItems(list, filterOpts);
      return sortCatalogItems(filtered, c.sortMode, sorters, sorters['name-asc']);
    },
    toolbar: {
      trailingToolbar: null,
      trailingContainerRef: setTrailingToolbarContainer,
      viewportW,
      toolbarAlignToGrid,
      oneCardWidthPx,
      ids: {
        searchId: 'unified-catalog-search',
        categoryFilterId: 'unified-filter-category',
        licenseFilterId: 'unified-filter-license',
        feelingFilterId: 'unified-filter-feeling',
        shapeFilterId: 'unified-filter-shape',
        calligraphyFilterId: 'unified-filter-calligraphy',
        variableFilterId: 'unified-filter-var',
        subsetFilterId: 'unified-filter-subset',
        previewPresetFilterId: 'unified-preview-preset',
        previewCustomTextId: 'unified-preview-custom-text',
        roleFilterId: 'unified-filter-role',
      },
      searchPlaceholder: 'Имя, категория…',
      sortOptions: [
        { value: 'popular', label: 'Популярное' },
        { value: 'name-asc', label: 'А -> Я' },
        { value: 'name-desc', label: 'Я -> А' },
        { value: 'category', label: 'Категория -> имя' },
        { value: 'styles-desc', label: 'Больше начертаний' },
        { value: 'styles-asc', label: 'Меньше начертаний' },
        { value: 'subsets-desc', label: 'Больше символов' },
      ],
      clearFiltersButtonClassName:
        'box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm font-semibold uppercase text-accent hover:text-accent disabled:cursor-default disabled:opacity-40 disabled:text-gray-900',
      facetItemsResolver: ({ rawItems }) => rawItems,
      facetCountItemsResolver: ({ filterBase }) => filterBase,
      facetCountConfig,
      getCategory: (item) => item?.category,
      getSubsets: (item) => item?.subsets,
      compareCategory: compareFontCategoryLabelsRu,
      compareSubset: (a, b) => String(a).localeCompare(String(b)),
      getCategoryLabel: (c) => getFontCategoryLabelRu(c),
      countsResolver: ({ filteredSortedItems: f }) => ({
        count: f.length,
        countTotal: baseCountTotal,
      }),
    },
  });

  // gridCols может быть 0 на первом тике (до измерений) — это ломает чанковый рендер.
  const activeGridCols = controls.gridViewMode === 'row' ? 1 : Math.max(1, Number(gridCols) || 0);
  const isRowMode = controls.gridViewMode === 'row';

  useEffect(() => {
    syncScrollLayout();
  }, [syncScrollLayout, controls.gridViewMode, filteredSortedItems.length, catalogItemsNotInSession.length, visibleCardsCount]);

  useEffect(() => {
    const visibleKeys = new Set(filteredSortedItems.map((item) => item?.familyKey).filter(Boolean));
    pruneSelection(visibleKeys);
  }, [filteredSortedItems, pruneSelection]);

  const selectedUnifiedLibraryEntries = useMemo(
    () =>
      catalogItemsNotInSession
        .filter((it) => selectedFamilyKeys.has(it.familyKey))
        .map(buildUnifiedLibraryEntry),
    [catalogItemsNotInSession, selectedFamilyKeys],
  );

  const moveSelectedToLibrary = useCallback(
    async (libraryId) => {
      if (!libraryId || selectedUnifiedLibraryEntries.length === 0) return false;
      let movedCount = 0;
      for (const libraryEntry of selectedUnifiedLibraryEntries) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await addLibraryEntryToLibrary({ libraryId, libraryEntry, onAddFontToLibrary });
        if (ok) movedCount += 1;
      }
      if (movedCount === 0) return false;
      setSelectedFamilyKeys(new Set());
      toast.success(
        movedCount === 1
          ? 'Добавлен 1 шрифт в библиотеку'
          : `Добавлено ${movedCount} шрифтов в библиотеку`,
      );
      return true;
    },
    [onAddFontToLibrary, selectedUnifiedLibraryEntries, setSelectedFamilyKeys],
  );

  const createLibraryFromSelection = useCallback(() => {
    if (selectedUnifiedLibraryEntries.length === 0) return false;
    onRequestCreateLibrary?.(selectedUnifiedLibraryEntries);
    return true;
  }, [onRequestCreateLibrary, selectedUnifiedLibraryEntries]);

  const downloadSelected = useCallback(async () => {
    const selected = catalogItemsNotInSession.filter((it) => selectedFamilyKeys.has(it.familyKey));
    if (selected.length === 0) return;
    if (selected.length === 1) {
      const it = selected[0];
      const src = bestDownloadSourceId(it);
      const sources = Array.isArray(it?.sources) ? it.sources : [];
      const raw = sources.find((s) => s?.id === src)?.raw || null;
      if (!raw) return;
      if (src === 'fontsource' || src === 'google') {
        await downloadCatalogItemPackage(it);
        return;
      }
      if (src === 'fontshare') {
        await downloadFontsharePackageZip(raw as Parameters<typeof downloadFontsharePackageZip>[0]);
      }
      else if (src === 'demo') onOpenTrialPage?.(raw);
      return;
    }
    const files = await buildSelectionArchiveEntries(selected, buildUnifiedPackageArchiveEntry);
    if (files.length > 0) {
      const blob = await buildArchiveBlobFromEntries(files);
      saveArchiveBlob(blob, 'catalog-selection.zip');
      toast.success(`Скачано ${files.length} шрифтов`);
    }
  }, [catalogItemsNotInSession, onOpenTrialPage, selectedFamilyKeys]);

  const downloadSelectedAsFormat = useCallback(
    async (format) => {
      const targetFormat = String(format || 'woff2').toLowerCase();
      const selected = catalogItemsNotInSession.filter((it) => selectedFamilyKeys.has(it.familyKey));
      if (selected.length === 0) return;
      let okCount = 0;
      for (const it of selected) {
        const src = bestDownloadSourceId(it);
        const sources = Array.isArray(it?.sources) ? it.sources : [];
        const raw = sources.find((s) => s?.id === src)?.raw || null;
        if (!raw) continue;
        // eslint-disable-next-line no-await-in-loop
        const ok =
          src === 'fontsource' || src === 'google'
            ? await downloadCatalogItemAsFormat(it, targetFormat, { silent: true })
            : src === 'fontshare'
              ? await downloadFontshareAsFormat(
                  raw as Parameters<typeof downloadFontshareAsFormat>[0],
                  targetFormat,
                  { silent: true },
                )
              : false;
        if (ok) okCount += 1;
      }
      if (okCount > 0) {
        toast.success(
          okCount === 1
            ? `Скачан 1 шрифт (${targetFormat.toUpperCase()})`
            : `Скачано ${okCount} шрифтов (${targetFormat.toUpperCase()})`,
        );
      }
    },
    [catalogItemsNotInSession, selectedFamilyKeys],
  );

  useSelectionActionsEffect({
    isActive,
    onSelectionActionsChange,
    selectedCount: selectedFamilyKeys.size,
    downloadSelected,
    downloadSelectedAsFormat,
    moveSelected: moveSelectedToLibrary,
    createLibraryFromSelection,
  });

  const addToLibrary = useCallback(
    async (libraryId, libraryEntry) => {
      const key = String(libraryEntry?.key || libraryEntry?.label || '').trim();
      if (!key) return false;
      const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      const familyKey = String(libraryEntry?.familyKey || libraryEntry?.key || libraryEntry?.label || '').trim();
      setAddingFamilyKey(familyKey || key);
      try {
        const ok = await addLibraryEntryToLibrary({ libraryId, libraryEntry, onAddFontToLibrary });
        if (ok) {
          const elapsed = typeof performance !== 'undefined' ? performance.now() - t0 : MIN_LOADER_VISIBLE_MS;
          if (elapsed < MIN_LOADER_VISIBLE_MS) {
            await new Promise((resolve) => setTimeout(resolve, MIN_LOADER_VISIBLE_MS - elapsed));
          }
          markKeyRecentlyAdded(familyKey || key, RECENT_ADD_STICKY_MS);
        }
        return ok;
      } finally {
        setAddingFamilyKey(null);
      }
    },
    [markKeyRecentlyAdded, onAddFontToLibrary],
  );

  const shareCatalogItem = useCallback(async (item: MergedCatalogItem) => {
    try {
      const url = await copyCatalogItemShareLink(item, { openInEditor: true });
      if (url) {
        toast.success('Ссылка скопирована');
        return true;
      }
      toast.info('Не удалось создать ссылку');
      return false;
    } catch {
      toast.error('Не удалось скопировать ссылку');
      return false;
    }
  }, []);

  const openInEditor = useCallback(
    async (item) => {
      const key = item?.familyKey || '';
      if (!key) return;
      setAddingFamilyKey(key);
      try {
        catalogOpenDbg('open click', {
          familyKey: item?.familyKey,
          displayName: item?.displayName,
          sources: Array.isArray(item?.sources)
            ? item.sources.map((s) => ({ id: s?.id, hasRaw: Boolean(s?.raw) }))
            : [],
        });
        await openCatalogItemInEditor(item, {
          onOpenFontsource: (slug, isVariable) =>
            Promise.resolve(onOpenFontsourceInEditorTab?.(slug, isVariable)),
          onOpenGoogle: (rawEntry) =>
            Promise.resolve(onOpenGoogleEntryInEditorTab?.(rawEntry as Record<string, unknown>)),
        });
      } finally {
        setAddingFamilyKey(null);
      }
    },
    [onOpenFontsourceInEditorTab, onOpenGoogleEntryInEditorTab],
  );

  const commitRowGlobalSample = useCallback(
    (text) => {
      controls.setPreviewCustomText(String(text ?? '').trim());
    },
    [controls.setPreviewCustomText],
  );

  const rowCatalogPreviewText = useMemo(
    () => resolveCatalogGlobalPreviewText(controls.previewSamplePreset, controls.previewCustomText),
    [controls.previewCustomText, controls.previewSamplePreset],
  );
  const gridPreviewMultiline = useMemo(
    () =>
      isCatalogGridPreviewMultiline({
        preset: controls.previewSamplePreset,
        customText: controls.previewCustomText,
      }),
    [controls.previewCustomText, controls.previewSamplePreset],
  );

  /** Текст для &text= / глифов в ленивом превью (null — режим «Имя», текст = family на карточке). */
  const catalogUiPreviewText = useMemo(
    () => resolveCatalogGlobalPreviewText(controls.previewSamplePreset, controls.previewCustomText),
    [controls.previewCustomText, controls.previewSamplePreset],
  );
  const catalogUiPreviewTextRef = useRef(catalogUiPreviewText);
  catalogUiPreviewTextRef.current = catalogUiPreviewText;

  const handleDragStart = useCallback((event, libraryEntry) => {
    writeLibraryFontDragData(event, libraryEntry);
  }, []);

  // --- Preview runtime cache wiring (Fontsource/Fontshare) ---
  const [previewFamilyByKey, setPreviewFamilyByKey] = useState({});
  const previewNodeByKeyRef = useRef(new Map()); // key -> { node, primarySource, slug, raw }
  const previewNodeTasksRef = useRef(new WeakMap());
  const previewObserverRef = useRef(null);
  const catalogScrollElRef = useRef(null);
  const previewPendingFamiliesRef = useRef(new Map());
  const previewFlushRafRef = useRef(null);
  const previewLoadingRef = useRef(new Set()); // dedupe by key
  const previewQueuedRef = useRef(new Set()); // dedupe by key
  const previewQueueRef = useRef([]);
  const previewActiveLoadsRef = useRef(0);

  const flushPreviewFamilies = useCallback(() => {
    previewFlushRafRef.current = null;
    if (previewPendingFamiliesRef.current.size === 0) return;
    const pending = previewPendingFamiliesRef.current;
    previewPendingFamiliesRef.current = new Map();
    setPreviewFamilyByKey((prev) => {
      let changed = false;
      const next = { ...prev };
      pending.forEach((family, key) => {
        if (!key || !family) return;
        if (next[key] === family) return;
        next[key] = family;
        changed = true;
      });
      return changed ? next : prev;
    });
  }, []);

  const scheduleFlushPreviewFamilies = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (previewFlushRafRef.current != null) return;
    previewFlushRafRef.current = window.requestAnimationFrame(flushPreviewFamilies);
  }, [flushPreviewFamilies]);

  const pumpPreviewQueue = useCallback(() => {
    if (typeof window === 'undefined') return;
    while (
      previewActiveLoadsRef.current < PREVIEW_CONCURRENCY_LIMIT &&
      previewQueueRef.current.length > 0
    ) {
      const task = previewQueueRef.current.shift();
      if (!task) break;
      const { familyKey, primarySource, slug, raw } = task;
      if (!familyKey) continue;
      if (previewLoadingRef.current.has(familyKey)) continue;
      previewLoadingRef.current.add(familyKey);
      previewActiveLoadsRef.current += 1;

      (async () => {
        try {
          const globalPreviewText = catalogUiPreviewTextRef.current;
          const cardLabelText = String(raw?.family || raw?.label || '').trim();
          const isNamePreviewMode = globalPreviewText === null;

          if (primarySource === 'fontsource') {
            const subsets = isNamePreviewMode
              ? pickFontsourcePreviewSubsetsForCardText(cardLabelText)
              : ['latin', 'cyrillic'];
            if (slug && !hasFontsourcePreviewFamily(slug)) {
              await loadFontsourcePreviewFamily(slug, { subsets });
            }
            const fam = slug ? getFontsourcePreviewFamily(slug) : null;
            if (fam) {
              previewPendingFamiliesRef.current.set(familyKey, fam);
              scheduleFlushPreviewFamilies();
            }
          } else if (primarySource === 'fontshare') {
            if (slug && !hasFontsharePreviewFamily(slug)) {
              await loadFontsharePreviewFamily(slug, raw);
            }
            const fam = slug ? getFontsharePreviewFamily(slug) : null;
            if (fam) {
              previewPendingFamiliesRef.current.set(familyKey, `${fam}, system-ui, sans-serif`);
              scheduleFlushPreviewFamilies();
            }
          } else if (primarySource === 'google') {
            ensureGoogleFontPreviewCss(raw, { previewText: globalPreviewText });
          }
        } catch {
          // preview optional
        } finally {
          previewActiveLoadsRef.current = Math.max(0, previewActiveLoadsRef.current - 1);
          previewLoadingRef.current.delete(familyKey);
          previewQueuedRef.current.delete(familyKey);
          pumpPreviewQueue();
        }
      })();
    }
  }, [scheduleFlushPreviewFamilies]);

  const queuePreviewTask = useCallback(
    (task) => {
      const familyKey = task?.familyKey;
      if (!familyKey) return;
      if (previewQueuedRef.current.has(familyKey)) return;
      previewQueuedRef.current.add(familyKey);
      previewQueueRef.current.push(task);
      pumpPreviewQueue();
    },
    [pumpPreviewQueue],
  );

  const ensurePreviewObserver = useCallback(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return null;
    if (previewObserverRef.current) return previewObserverRef.current;
    previewObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const hit = previewNodeTasksRef.current.get(entry.target);
          if (!hit) return;
          previewObserverRef.current?.unobserve(entry.target);
          queuePreviewTask(hit);
        });
      },
      {
        root: catalogScrollElRef.current || null,
        rootMargin: PREVIEW_VIEWPORT_ROOT_MARGIN,
        threshold: 0,
      },
    );
    return previewObserverRef.current;
  }, [queuePreviewTask]);

  const registerPreviewNode = useCallback(
    (familyKey, node, primarySource, slug, raw) => {
      if (!familyKey) return;

      const prev = previewNodeByKeyRef.current.get(familyKey);
      if (prev?.node && previewObserverRef.current) {
        previewObserverRef.current.unobserve(prev.node);
        previewNodeTasksRef.current.delete(prev.node);
      }

      if (!(node instanceof HTMLElement)) {
        previewNodeByKeyRef.current.delete(familyKey);
        return;
      }

      const task = { familyKey, primarySource, slug, raw };
      previewNodeByKeyRef.current.set(familyKey, { node, ...task });

      if (!isActive) return;

      previewNodeTasksRef.current.set(node, task);

      if (typeof IntersectionObserver === 'undefined') {
        queuePreviewTask(task);
        return;
      }

      ensurePreviewObserver()?.observe(node);
    },
    [ensurePreviewObserver, isActive, queuePreviewTask],
  );

  useEffect(() => {
    catalogScrollElRef.current = catalogScrollEl;
  }, [catalogScrollEl]);

  useEffect(() => {
    if (!isActive) {
      previewObserverRef.current?.disconnect();
      previewObserverRef.current = null;
      return undefined;
    }

    previewObserverRef.current?.disconnect();
    previewObserverRef.current = null;

    if (typeof IntersectionObserver === 'undefined') return undefined;

    previewNodeByKeyRef.current.forEach(({ node, familyKey, primarySource, slug, raw }) => {
      if (!node) return;
      const task = { familyKey, primarySource, slug, raw };
      previewNodeTasksRef.current.set(node, task);
      ensurePreviewObserver()?.observe(node);
    });

    return () => {
      previewObserverRef.current?.disconnect();
      previewObserverRef.current = null;
    };
  }, [catalogScrollEl, ensurePreviewObserver, isActive]);

  /** При смене текста превью — сброс Fontsource-кэша и догрузка для видимых карточек. */
  useEffect(() => {
    if (!isActive) return;
    resetFontsourcePreviewCache();
    setPreviewFamilyByKey({});
    previewNodeByKeyRef.current.forEach(({ familyKey, primarySource, slug, raw }) => {
      if (!familyKey) return;
      previewLoadingRef.current.delete(familyKey);
      previewQueuedRef.current.delete(familyKey);
      queuePreviewTask({ familyKey, primarySource, slug, raw });
    });
  }, [catalogUiPreviewText, isActive, queuePreviewTask]);

  useEffect(() => {
    return () => {
      removeAllGoogleFontPreviewCss();
      previewObserverRef.current?.disconnect();
      previewObserverRef.current = null;
      if (previewFlushRafRef.current != null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(previewFlushRafRef.current);
      }
    };
  }, []);

  // --- Data loading ---
  useEffect(() => {
    if (!isActive) return undefined;
    let cancelled = false;
    const loadingStartedAt = Date.now();
    let didFinalizeInitialLoading = false;

    const caches = readCaches();
    let cachedFontsource = caches.fontsource;
    const cachedFontshare = caches.fontshare;
    const cachedTrial = caches.trial;
    const hasCached = caches.hasCached;

    if (caches.google.length > 0) setGoogleItems(caches.google);
    if (caches.fontsource.length > 0) setFontsourceItems(caches.fontsource);
    if (caches.fontshare.length > 0) setFontshareItems(caches.fontshare);
    if (caches.trial.length > 0) setTrialItems(caches.trial);

    void readFontsourceCatalogCacheAsync().then((idbList) => {
      if (cancelled) return;
      const effective = pickBetterFontsourceCatalogLists(cachedFontsource, idbList);
      if (effective.length > cachedFontsource.length) {
        cachedFontsource = effective;
        setFontsourceItems(effective);
        writeFontsourceCatalogCache(effective);
      }
    });

    if (hasCached) {
      setIsInitialCatalogLoading(false);
      setAreCardsVisible(true);
    }

    const finalizeInitialLoading = () => {
      if (didFinalizeInitialLoading) return;
      didFinalizeInitialLoading = true;
      const elapsed = Date.now() - loadingStartedAt;
      const delay = Math.max(0, MIN_LOADER_VISIBLE_MS - elapsed);
      window.setTimeout(() => {
        if (cancelled) return;
        setIsInitialCatalogLoading(false);
        window.requestAnimationFrame(() => {
          if (!cancelled) setAreCardsVisible(true);
        });
      }, delay);
    };

    const safeErrorMessage = (e: unknown, fallback: string) => {
      if (!e) return fallback;
      if (typeof e === 'string') return e;
      if (e instanceof Error) {
        const msg = String(e.message || '').trim();
        if (msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('abort')) return 'Таймаут запроса';
        return msg || fallback;
      }
      return fallback;
    };

    const fetchWithTimeout = async (url: string, init?: RequestInit & { timeoutMs?: number }) => {
      const timeoutMs = typeof init?.timeoutMs === 'number' ? init.timeoutMs : 25_000;
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const { timeoutMs: _ignored, signal: _signalIgnored, ...rest } = init || {};
        return await fetch(url, { ...rest, signal: controller.signal });
      } finally {
        window.clearTimeout(t);
      }
    };

    const fetchGoogle = async () => {
      try {
        let list = readGoogleFontCatalogCache();

        const needsClientTagEnrich = (rows: typeof list) =>
          Array.isArray(rows) &&
          rows.length > 0 &&
          (!googleCatalogHasTagMetadata(rows) || !googleCatalogHasCalligraphyMetadata(rows));

        if (googleCatalogHasTagMetadata(list) && googleCatalogHasCalligraphyMetadata(list)) {
          if (!cancelled) {
            setGoogleItems(list);
            if (!hasCached && list.length > 0) finalizeInitialLoading();
          }
          return;
        }

        // Если кэш уже есть — показываем сразу, а enrich делаем в фоне (не блокируем каталог).
        if (list.length > 0) {
          if (!cancelled) {
            setGoogleItems(list);
            if (!hasCached) finalizeInitialLoading();
          }
          if (needsClientTagEnrich(list)) {
            void (async () => {
              try {
                const tagsMaps = await fetchGoogleFamilyTagsMaps();
                const enriched = enrichGoogleCatalogRows(list, tagsMaps);
                if (!cancelled && enriched.length > 0) {
                  setGoogleItems(enriched);
                  writeGoogleFontCatalogCache(enriched);
                }
              } catch (enrichErr) {
                console.warn('[UnifiedCatalogPanel] Google tags enrich failed:', (enrichErr as any)?.message || enrichErr);
              }
            })();
          }
          return;
        }

        if (list.length > 0 && !googleCatalogHasCalligraphyMetadata(list)) {
          clearGoogleFontCatalogCache();
        }

        const res = await fetchWithTimeout('/api/google-fonts-catalog', { timeoutMs: 60_000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        list = Array.isArray(data.items) ? data.items : [];

        if (!cancelled && list.length > 0) {
          setGoogleItems(list);
          writeGoogleFontCatalogCache(list);
          if (!hasCached) finalizeInitialLoading();
        }
        // enrich — отдельным шагом, не блокирует первичный показ.
        if (list.length > 0 && needsClientTagEnrich(list)) {
          void (async () => {
            try {
              const tagsMaps = await fetchGoogleFamilyTagsMaps();
              const enriched = enrichGoogleCatalogRows(list, tagsMaps);
              if (!cancelled && enriched.length > 0) {
                setGoogleItems(enriched);
                writeGoogleFontCatalogCache(enriched);
              }
            } catch (enrichErr) {
              console.warn('[UnifiedCatalogPanel] Google tags enrich failed:', (enrichErr as any)?.message || enrichErr);
            }
          })();
        }
      } catch (e) {
        if (!cancelled) {
          const fallback = readGoogleFontCatalogCache();
          if (fallback.length > 0) {
            setGoogleItems(fallback);
            catalogFetchDbg('google fetch failed, kept cache', { count: fallback.length });
            return;
          }
          setLoadError((prev) => prev || safeErrorMessage(e, 'Ошибка Google'));
        }
      }
    };

    const fetchFontsource = async () => {
      const cachedFsBefore = readFontsourceCatalogCache();
      try {
        const res = await fetchWithTimeout('/api/fontsource-catalog', { timeoutMs: 90_000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        let nextItems = Array.isArray(data.items) ? data.items : [];
        const apiSource = typeof data?.source === 'string' ? data.source : '';
        catalogFetchDbg('fontsource /api payload', {
          source: apiSource,
          count: nextItems.length,
        });
        const cachedFs = readFontsourceCatalogCache();
        if (isWeakFontsourceCatalogPayload(nextItems, apiSource)) {
          catalogFetchDbg('fontsource weak api payload', {
            source: apiSource,
            count: nextItems.length,
            cacheCount: cachedFs.length,
          });
          if (cachedFs.length >= FONTSOURCE_MIN_FULL_CATALOG_SIZE) {
            nextItems = [];
          } else {
            try {
              const fromFontlist = await fetchFontsourceCatalogFromFontlist();
              if (fromFontlist.length > nextItems.length) {
                nextItems = fromFontlist;
                catalogFetchDbg('fontsource fontlist fallback', { count: fromFontlist.length });
              }
            } catch (fontlistErr) {
              catalogFetchDbg('fontsource fontlist fallback failed', {
                error: fontlistErr instanceof Error ? fontlistErr.message : String(fontlistErr),
              });
            }
          }
        }
        const effective = pickBetterFontsourceCatalogLists(cachedFs, nextItems);
        if (!cancelled) {
          setFontsourceItems(effective);
          if (effective.length > 0 && effective.length >= cachedFs.length) {
            writeFontsourceCatalogCache(effective);
          }
          if (!hasCached && effective.length > 0) finalizeInitialLoading();
        }
      } catch (e) {
        if (!cancelled) {
          if (cachedFsBefore.length > 0) {
            setFontsourceItems(cachedFsBefore);
            catalogFetchDbg('fontsource fetch failed, kept cache', { count: cachedFsBefore.length });
            return;
          }
          setLoadError((prev) => prev || safeErrorMessage(e, 'Ошибка Fontsource'));
        }
      }
    };

    const fetchFontshare = async () => {
      try {
        const res = await fetchWithTimeout('/api/fontshare-catalog', { timeoutMs: 60_000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        let nextItems = Array.isArray(data.items) ? data.items : [];
        const shouldTryDirectRemote = nextItems.length < FONTSHARE_MIN_FULL_CATALOG_SIZE;
        if (shouldTryDirectRemote) {
          try {
            const directRes = await fetchWithTimeout('https://api.fontshare.com/v2/fonts', { timeoutMs: 20_000 });
            if (directRes.ok) {
              const directData = await directRes.json();
              const directRows = Array.isArray(directData?.fonts) ? directData.fonts : [];
              const normalizedDirect = normalizeFontshareCatalogItems(directRows);
              if (normalizedDirect.length >= FONTSHARE_MIN_FULL_CATALOG_SIZE) {
                nextItems = normalizedDirect;
              }
            }
          } catch {
            // keep /api payload
          }
        }
        const effective = cachedFontshare.length > nextItems.length ? cachedFontshare : nextItems;
        if (!cancelled) {
          setFontshareItems(effective);
          if (effective.length > 0 && effective !== cachedFontshare) writeFontshareCatalogCache(effective);
          if (!hasCached && effective.length > 0) finalizeInitialLoading();
        }
      } catch (e) {
        if (!cancelled) {
          if (cachedFontshare.length > 0) {
            setFontshareItems(cachedFontshare);
            return;
          }
          setLoadError((prev) => prev || safeErrorMessage(e, 'Ошибка Fontshare'));
        }
      }
    };

    const fetchTrial = async () => {
      try {
        const res = await fetchWithTimeout('/api/fontfabric-trial-catalog', { timeoutMs: 60_000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const nextItems = Array.isArray(data.items) ? data.items : [];
        const effective = nextItems.length > 0 ? nextItems : cachedTrial;
        if (!cancelled) {
          setTrialItems(effective);
          if (nextItems.length > 0) writeFontfabricTrialCatalogCache(nextItems);
          if (!hasCached && effective.length > 0) finalizeInitialLoading();
        }
      } catch (e) {
        if (!cancelled) {
          if (cachedTrial.length > 0) {
            setTrialItems(cachedTrial);
            return;
          }
          setLoadError((prev) => prev || safeErrorMessage(e, 'Ошибка Trial'));
        }
      }
    };

    const fontsourceCacheComplete = () => isFontsourceCatalogComplete(readFontsourceCatalogCache());

    (async () => {
      // Сеть запрашиваем только один раз за сессию, но кэш-гидратацию делаем всегда.
      // Важно: защёлка не должна блокировать загрузку, если кэша нет.
      // Иначе при SPA-навигации можно получить пустой каталог до F5.
      if (hasFetchedUnifiedCatalogNetworkThisSession && hasCached) {
        if (!cancelled) setIsInitialCatalogLoading(false);
        if (fontsourceCacheComplete()) return;
        await fetchFontsource();
        return;
      }
      hasFetchedUnifiedCatalogNetworkThisSession = true;
      await Promise.allSettled([fetchGoogle(), fetchFontsource(), fetchFontshare(), fetchTrial()]);
      if (!hasCached) finalizeInitialLoading();
      else if (!cancelled) setIsInitialCatalogLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isActive, reloadNonce]);

  // --- Viewport window: рендерим близко к видимой области, догружаем при скролле ---
  useEffect(() => {
    if (!isActive) return undefined;
    const total = filteredSortedItems.length;
    if (total === 0) {
      setVisibleCardsCount(0);
      return undefined;
    }
    if (total <= CHUNKED_RENDER_THRESHOLD) {
      setVisibleCardsCount(total);
      return undefined;
    }

    const estimateInitialCount = () => {
      const el = catalogScrollEl;
      if (!el) {
        return Math.min(total, isRowMode ? 48 : activeGridCols * 4);
      }
      if (isRowMode) {
        const visibleRows = Math.max(1, Math.ceil(el.clientHeight / ROW_MODE_HEIGHT_PX));
        return Math.min(total, visibleRows + 8);
      }
      const visibleRows = Math.max(
        1,
        Math.ceil(el.clientHeight / (GRID_CARD_HEIGHT_PX + GRID_GAP_PX)),
      );
      return Math.min(total, (visibleRows + 2) * activeGridCols);
    };

    const chunkSize = Math.max(isRowMode ? 40 : activeGridCols * 2, activeGridCols);
    setVisibleCardsCount(estimateInitialCount());

    const el = catalogScrollEl;
    if (!el) return undefined;

    let rafId = null;
    const onScroll = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const nearBottom =
          el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_RENDER_NEAR_BOTTOM_PX;
        if (!nearBottom) return;
        setVisibleCardsCount((prev) => {
          if (prev >= total) return prev;
          return Math.min(total, prev + chunkSize);
        });
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [activeGridCols, catalogScrollEl, filteredSortedItems.length, isActive, isRowMode]);

  const renderedItems = useMemo(
    () => filteredSortedItems.slice(0, visibleCardsCount),
    [filteredSortedItems, visibleCardsCount],
  );
  const isChunkRendering = renderedItems.length < filteredSortedItems.length;

  return (
    <div ref={setPanelRootRef} className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <CatalogPanelToolbar {...toolbarProps} />
      </div>

      {mergedAllItems.length === 0 ? (
        isInitialCatalogLoading ? (
          <UnifiedCatalogEmptyLoader />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-8">
            <p className="text-center text-sm text-gray-700">
              Каталог не загрузился{loadError ? `: ${loadError}` : '.'}
            </p>
            <button
              type="button"
              className="h-10 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent/90"
              onClick={() => {
                setLoadError(null);
                setIsInitialCatalogLoading(true);
                setAreCardsVisible(false);
                hasFetchedUnifiedCatalogNetworkThisSession = false;
                setReloadNonce((x) => x + 1);
              }}
            >
              Повторить
            </button>
          </div>
        )
      ) : filteredSortedItems.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm uppercase text-gray-500">
          Ничего не найдено. Попробуйте другой запрос.
        </p>
      ) : catalogItemsNotInSession.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm uppercase text-gray-500">
          Все шрифты из этой выдачи уже в сессии. Переключайте их во вкладках над областью просмотра.
        </p>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={setCatalogScrollRefs}
            className="catalog-scroll-area min-h-0 flex-1 overflow-x-hidden overflow-y-auto [align-content:start]"
          >
            <div
              className={`grid max-w-full items-start transition-all duration-300 ease-out ${
                controls.gridViewMode === 'row'
                  ? 'grid-cols-1 gap-0'
                  : 'grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5'
              } ${areCardsVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
            >
              {renderedItems.map((item) => {
                const familyKey = item.familyKey;
                const previewSource = bestPreviewSourceId(item);
                const previewFamily =
                  previewSource === 'google'
                    ? `'${item.displayName}', sans-serif`
                    : previewFamilyByKey[familyKey] || 'system-ui, sans-serif';
                const cardPreviewText = resolveCatalogCardPreviewText({
                  family: item.displayName || familyKey,
                  preset: controls.previewSamplePreset,
                  customText: controls.previewCustomText,
                });

                return (
                  <UnifiedCatalogPanelItem
                    key={familyKey}
                    item={item as MergedCatalogItem}
                    previewFamily={previewFamily}
                    cardPreviewText={cardPreviewText}
                    gridPreviewMultiline={gridPreviewMultiline}
                    previewFontSizePx={controls.previewFontSizePx}
                    rowCatalogPreviewText={rowCatalogPreviewText}
                    onRowGlobalSampleCommit={commitRowGlobalSample}
                    busy={addingFamilyKey === familyKey}
                    selected={selectedFamilyKeys.has(familyKey)}
                    isRowMode={controls.gridViewMode === 'row'}
                    fontLibraries={fontLibraries}
                    onAddFontToLibrary={addToLibrary}
                    onRequestCreateLibrary={onRequestCreateLibrary}
                    onOpenInEditor={openInEditor}
                    onShareCatalogItem={shareCatalogItem}
                    onCardClick={onCardClick}
                    onStartCardLongPress={startCardLongPress}
                    onPointerUp={clearLongPressTimer}
                    onPointerLeave={clearLongPressTimer}
                    onPointerCancel={clearLongPressTimer}
                    onDragStart={handleDragStart}
                    onOpenTrialPage={onOpenTrialPage}
                    onUploadTrial={onUploadTrial}
                    registerPreviewNode={registerPreviewNode}
                  />
                );
              })}
            </div>
            {isChunkRendering ? (
              <div className="flex justify-center py-3">
                <HexProgressLoader size={40} className="shrink-0" />
              </div>
            ) : null}
          </div>
          <OverlayScrollbar
            overlayThumb={overlayThumb}
            scrollbarVisible={scrollbarVisible}
            isDragging={isDragging}
            onTrackPointerDown={onTrackPointerDown}
            onThumbPointerDown={onThumbPointerDown}
            onScrollbarPointerMove={onScrollbarPointerMove}
            onScrollbarPointerUp={onScrollbarPointerUp}
          />
        </div>
      )}

      {loadError && mergedAllItems.length === 0 ? (
        <p className="text-xs text-gray-500">Источник обновления недоступен: {loadError}</p>
      ) : null}
    </div>
  );
}

