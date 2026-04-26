import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from '../utils/appNotify';
import { HexProgressLoader } from './ui/HexProgressLoader';
import { FontsourceCatalogCard } from './ui/FontsourceCatalogCard';
import { useCatalogToolbarLayout } from './ui/useCatalogToolbarLayout';
import { isFontsourceFontInSession } from '../utils/fontLibraryUtils';
import { createCatalogLibraryEntry } from '../utils/fontLibraryUtils';
import {
  readFontsourceCatalogCache,
  writeFontsourceCatalogCache,
} from '../utils/fontsourceCatalogCache';
import { readGoogleFontCatalogCache } from '../utils/googleFontCatalogCache';
import {
  getFontsourcePreviewFamily,
  hasFontsourcePreviewFamily,
  loadFontsourcePreviewFamily,
} from '../utils/fontsourcePreviewRuntimeCache';
import {
  compareFontCategoryLabelsRu,
  getFontCategoryLabelRu,
} from '../utils/fontCategoryLabels';
import { getFontSubsetLabelRu } from '../utils/fontSubsetLabels';
import { writeLibraryFontDragData } from '../utils/libraryDragData';
import { isInteractiveTarget } from '../utils/dom/isInteractiveTarget';
import { useLongPressMultiSelect } from './ui/useLongPressMultiSelect';
import { useStickyTimedSet } from './ui/useStickyTimedSet';
import { CatalogPanelToolbar } from './ui/CatalogPanelToolbar';
import { useSelectionActionsEffect } from './ui/useSelectionActionsEffect';
import { filterCatalogItems, sortCatalogItems } from '../utils/catalogFilterSort';
import { useCatalogEngine } from './ui/useCatalogEngine';
import { useOverlayScrollbar } from './ui/useOverlayScrollbar';
import { addLibraryEntryToLibrary } from '../utils/libraryEntryActions';
import {
  buildArchiveBlobFromEntries,
  buildFontsourceFormatArchiveEntry,
  buildFontsourcePackageArchiveEntry,
  buildSelectionArchiveEntries,
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
  saveArchiveBlob,
} from '../utils/catalogDownloadActions';

const { startTransition } = React;

const PREVIEW_TEXT = 'AaBbCcDdEe';
const PREVIEW_CONCURRENCY_LIMIT = 3;
const CARD_LONG_PRESS_MS = 220;
const MIN_LOADER_VISIBLE_MS = 900;
const FONTSOURCE_ADD_CATALOG_STICKY_MS = MIN_LOADER_VISIBLE_MS + 1300;
const GRID_GAP_PX = 16;
const CHUNKED_RENDER_THRESHOLD = 80;
const CHUNKED_INITIAL_ROWS = 2;
const CHUNKED_ROWS_PER_TICK = 2;
// 16ms даёт слишком частые setState и может "вечнозалaгивать" (особенно в row с 1 колонкой).
// Делаем тики реже и дополняем requestIdleCallback ниже.
const CHUNKED_TICK_MS = 50;
const FONTSOURCE_MIN_FULL_CATALOG_SIZE = 100;

function fontsourceCatalogGridCols(viewportWidth) {
  if (viewportWidth <= 0) return 2;
  if (viewportWidth >= 1280) return 5;
  if (viewportWidth >= 1024) return 4;
  return 2;
}

function normalizeDirectFontsourceRow(row) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || '').trim();
  const family = String(row.family || '').trim();
  if (!id || !family) return null;
  const weights = Array.isArray(row.weights)
    ? row.weights
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x))
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
    category: String(row.category || ''),
    primaryScript: String(row.type || ''),
    subsets,
    weights,
    styles,
    isVariable: Boolean(row.variable),
    hasItalic: styles.includes('italic'),
    styleCount: Math.max(1, (weights.length || 1) * (styles.length || 1)),
    popularityScore: 0,
    source: 'fontsource',
  };
}

function FontsourceCatalogEmptyLoader() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-8">
      <HexProgressLoader size={64} className="shrink-0" />
    </div>
  );
}

export default function FontsourceCatalogPanel({
  fonts,
  fontLibraries = [],
  onAddFontToLibrary,
  onRequestCreateLibrary,
  onOpenFontsourceInEditorTab,
  trailingToolbar = null,
  isActive = true,
  onSelectionActionsChange,
  onTotalItemsChange,
}) {
  const {
    setCatalogScrollContainer,
    setTrailingToolbarContainer,
    viewportW,
    gridCols,
    oneCardWidthPx,
    toolbarAlignToGrid,
  } = useCatalogToolbarLayout({
    trailingToolbar,
    gridGapPx: GRID_GAP_PX,
    gridColsResolver: fontsourceCatalogGridCols,
    autoMeasureGridWidth: true,
    enabled: isActive,
  });
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [addingSlug, setAddingSlug] = useState(null);
  const { set: recentlyAddedSlugs, mark: markSlugRecentlyAdded } =
    useStickyTimedSet(MIN_LOADER_VISIBLE_MS);
  /** Режим ROW: один образец для всех строк (null — у каждой строки имя семейства). */
  const [fontsourceRowGlobalSample, setFontsourceRowGlobalSample] = useState(null);
  const {
    selectedKeys: selectedSlugs,
    setSelectedKeys: setSelectedSlugs,
    toggleSelectedKey: toggleSelectedSlug,
    startLongPress: startCardLongPress,
    onCardClick,
    clearLongPressTimer,
    pruneSelection,
  } = useLongPressMultiSelect({ longPressMs: CARD_LONG_PRESS_MS, isInteractiveTarget });
  const [isInitialCatalogLoading, setIsInitialCatalogLoading] = useState(true);
  const [areCardsVisible, setAreCardsVisible] = useState(false);
  const [visibleCardsCount, setVisibleCardsCount] = useState(0);
  const {
    overlayThumb,
    scrollbarVisible,
    setScrollElement,
    syncScrollLayout,
  } = useOverlayScrollbar();

  const handleDragStart = useCallback((event, item) => {
    if (isInteractiveTarget(event.target)) {
      event.preventDefault();
      return;
    }
    const libraryEntry = {
      id: `fontsource:${item?.id || item?.slug || ''}`,
      label: item?.family || item?.label || item?.id || item?.slug || '',
      source: 'fontsource',
    };
    const wrote = writeLibraryFontDragData(event.dataTransfer, libraryEntry);
    if (!wrote) {
      event.preventDefault();
    }
  }, []);

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

  // markSlugRecentlyAdded handled by useStickyTimedSet
  const [previewFontFamilyBySlug, setPreviewFontFamilyBySlug] = useState({});

  const previewObserverRef = React.useRef(null);
  const previewNodeBySlugRef = React.useRef(new Map());
  const previewSeenSlugsRef = React.useRef(new Set());
  const previewPendingFamiliesRef = React.useRef(new Map());
  const previewFlushRafRef = React.useRef(null);
  // timers handled inside useStickyTimedSet
  const previewLoadingRef = React.useRef(new Set());
  const previewQueuedRef = React.useRef(new Set());
  const previewQueueRef = React.useRef([]);
  const previewActiveLoadsRef = React.useRef(0);
  // long press refs handled inside useLongPressMultiSelect

  const sorters = useMemo(
    () => ({
      popular: (a, b) => {
        const byPopularity = (Number(b?.popularityScore) || 0) - (Number(a?.popularityScore) || 0);
        if (byPopularity !== 0) return byPopularity;
        // Доп. tie-breakers оставляем как было
        const byStyleCount = (Number(b?.styleCount) || 0) - (Number(a?.styleCount) || 0);
        if (byStyleCount !== 0) return byStyleCount;
        const bySubsets =
          (Array.isArray(b?.subsets) ? b.subsets.length : 0) -
          (Array.isArray(a?.subsets) ? a.subsets.length : 0);
        if (bySubsets !== 0) return bySubsets;
        return String(a.family || '').localeCompare(String(b.family || ''), 'ru', { sensitivity: 'base' });
      },
      'name-desc': (a, b) =>
        String(b.family || '').localeCompare(String(a.family || ''), 'ru', { sensitivity: 'base' }),
      'name-asc': (a, b) =>
        String(a.family || '').localeCompare(String(b.family || ''), 'ru', { sensitivity: 'base' }),
      category: (a, b) => {
        const byCategory = compareFontCategoryLabelsRu(a.category, b.category);
        if (byCategory !== 0) return byCategory;
        return String(a.family || '').localeCompare(String(b.family || ''), 'ru', { sensitivity: 'base' });
      },
      'styles-desc': (a, b) => (Number(b.styleCount) || 0) - (Number(a.styleCount) || 0),
      'styles-asc': (a, b) => (Number(a.styleCount) || 0) - (Number(b.styleCount) || 0),
      'subsets-desc': (a, b) =>
        (Array.isArray(b.subsets) ? b.subsets.length : 0) -
        (Array.isArray(a.subsets) ? a.subsets.length : 0),
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
      initialSortMode: 'popular',
      includeSearchInHasActiveFilters: true,
      clearSearchOnClearFilters: true,
    },
    rawItems: items,
    fonts,
    fontLibraries,
    sourcePrefix: 'fontsource',
    getKey: (item) => item?.id || item?.slug,
    isInSession: (fontsState, slug) => isFontsourceFontInSession(fontsState, slug),
    addingKey: addingSlug,
    recentlyAddedSet: recentlyAddedSlugs,
    exclusionOrder: 'beforeFilterSort',
    filterSortItems: (list, c) => {
      const filtered = filterCatalogItems(list, {
        searchQuery: c.searchQueryTrimmed,
        getSearchTokens: (item) => [
          item.family,
          item.label,
          item.category,
          getFontCategoryLabelRu(item.category),
          item.primaryScript,
          ...(Array.isArray(item.subsets) ? item.subsets : []),
          ...(Array.isArray(item.subsets) ? item.subsets : []).map((subset) => getFontSubsetLabelRu(subset)),
        ],
        filterCategory: c.filterCategory,
        getCategory: (item) => item?.category,
        filterSubset: c.filterSubset,
        getSubsets: (item) => item?.subsets,
        filterVariable: c.filterVariable,
        isVariable: (item) => item?.isVariable,
        filterItalicOnly: c.filterItalicOnly,
        hasItalic: (item) => item?.hasItalic,
      });
      return sortCatalogItems(filtered, c.sortMode, sorters, sorters['name-asc']);
    },
    toolbar: {
      trailingToolbar,
      trailingContainerRef: setTrailingToolbarContainer,
      viewportW,
      toolbarAlignToGrid,
      oneCardWidthPx,
      ids: {
        searchId: 'fontsource-catalog-search',
        categoryFilterId: 'fontsource-filter-category',
        variableFilterId: 'fontsource-filter-var',
        subsetFilterId: 'fontsource-filter-subset',
      },
      searchPlaceholder: 'Имя, категория, наборы…',
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
      facetItemsResolver: ({ itemsNotInSession }) => itemsNotInSession,
      getCategory: (item) => item?.category,
      getSubsets: (item) => item?.subsets,
      compareCategory: compareFontCategoryLabelsRu,
      compareSubset: (a, b) => String(a).localeCompare(String(b)),
      getCategoryLabel: (c) => getFontCategoryLabelRu(c),
      countsResolver: ({ filteredSortedItems: f, itemsNotInSession: v }) => ({
        count: f.length,
        countTotal: v.length,
      }),
    },
  });

  useEffect(() => {
    syncScrollLayout();
  }, [
    syncScrollLayout,
    controls.gridViewMode,
    filteredSortedItems.length,
    catalogItemsNotInSession.length,
    visibleCardsCount,
  ]);

  // gridCols может быть 0 на первом тике (до измерений) — это ломает чанковый рендер (chunkSize=0 => вечная загрузка)
  const activeGridCols = controls.gridViewMode === 'row' ? 1 : Math.max(1, Number(gridCols) || 0);
  const isRowMode = controls.gridViewMode === 'row';

  const flushPreviewFamilies = useCallback(() => {
    previewFlushRafRef.current = null;
    if (previewPendingFamiliesRef.current.size === 0) return;
    const pending = previewPendingFamiliesRef.current;
    previewPendingFamiliesRef.current = new Map();
    setPreviewFontFamilyBySlug((prev) => {
      let changed = false;
      const next = { ...prev };
      pending.forEach((family, slug) => {
        if (!slug || !family) return;
        if (next[slug] === family) return;
        next[slug] = family;
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

  const loadPreviewFont = useCallback(async (slug) => {
    const loadedFamily = await loadFontsourcePreviewFamily(slug, {
      weight: 400,
      style: 'normal',
      subset: 'latin',
    });
    if (!loadedFamily) return;
    previewPendingFamiliesRef.current.set(slug, loadedFamily);
    scheduleFlushPreviewFamilies();
  }, [scheduleFlushPreviewFamilies]);

  const drainPreviewQueue = useCallback(() => {
    while (
      previewActiveLoadsRef.current < PREVIEW_CONCURRENCY_LIMIT &&
      previewQueueRef.current.length > 0
    ) {
      const slug = previewQueueRef.current.shift();
      previewQueuedRef.current.delete(slug);
      if (!slug) continue;
      if (hasFontsourcePreviewFamily(slug) || previewLoadingRef.current.has(slug)) continue;

      previewLoadingRef.current.add(slug);
      previewActiveLoadsRef.current += 1;

      loadPreviewFont(slug)
        .catch((e) => {
          console.warn('[FontsourceCatalogPanel] preview load failed:', slug, e?.message || e);
        })
        .finally(() => {
          previewLoadingRef.current.delete(slug);
          previewActiveLoadsRef.current = Math.max(0, previewActiveLoadsRef.current - 1);
          drainPreviewQueue();
        });
    }
  }, [loadPreviewFont]);

  const enqueuePreviewLoad = useCallback((slug) => {
    if (!slug) return;
    if (hasFontsourcePreviewFamily(slug)) return;
    if (previewLoadingRef.current.has(slug)) return;
    if (previewQueuedRef.current.has(slug)) return;

    previewQueuedRef.current.add(slug);
    previewQueueRef.current.push(slug);
    drainPreviewQueue();
  }, [drainPreviewQueue]);

  useEffect(() => {
    if (!isActive) return;
    if (typeof window === 'undefined') return;
    if (!window.__CATALOG_DEBUG__) return;
    console.debug('[FontsourceCatalogPanel] state', {
      isInitialCatalogLoading,
      areCardsVisible,
      loadError,
      items: items.length,
      notInSession: catalogItemsNotInSession.length,
      filteredSorted: filteredSortedItems.length,
      visibleCardsCount,
      gridCols,
      activeGridCols,
      gridViewMode: controls.gridViewMode,
    });
  }, [
    isActive,
    isInitialCatalogLoading,
    areCardsVisible,
    loadError,
    items.length,
    catalogItemsNotInSession.length,
    filteredSortedItems.length,
    visibleCardsCount,
    gridCols,
    activeGridCols,
    controls.gridViewMode,
  ]);

  useEffect(() => {
    if (!isActive) return undefined;
    const cached = readFontsourceCatalogCache();
    const hasCachedItems = cached.length > 0;
    const loadingStartedAt = Date.now();
    if (cached.length > 0) {
      setItems(cached);
      setIsInitialCatalogLoading(false);
      setAreCardsVisible(true);
    }

    let cancelled = false;
    const finalizeInitialLoading = () => {
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

    (async () => {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutMs = 20000;
        const timeoutId = controller
          ? window.setTimeout(() => controller.abort('timeout'), timeoutMs)
          : null;

        if (typeof window !== 'undefined' && window.__CATALOG_DEBUG__) {
          console.debug('[FontsourceCatalogPanel] fetch /api/fontsource-catalog start');
        }

        const res = await fetch('/api/fontsource-catalog', controller ? { signal: controller.signal } : undefined);
        if (timeoutId) window.clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          let nextItems = Array.isArray(data.items) ? data.items : [];
          const isFallbackPayload = data?.source === 'fallback';
          const shouldTryDirectRemote =
            isFallbackPayload || nextItems.length < FONTSOURCE_MIN_FULL_CATALOG_SIZE;
          if (shouldTryDirectRemote) {
            try {
              const directRes = await fetch('https://api.fontsource.org/v1/fonts');
              if (directRes.ok) {
                const directRows = await directRes.json();
                const normalizedDirect = (Array.isArray(directRows) ? directRows : [])
                  .map(normalizeDirectFontsourceRow)
                  .filter(Boolean);
                if (normalizedDirect.length >= FONTSOURCE_MIN_FULL_CATALOG_SIZE) {
                  nextItems = normalizedDirect;
                }
              }
            } catch {
              // Тихий fallback: если direct недоступен, оставляем данные из /api/fontsource-catalog.
            }
          }
          const shouldKeepCached =
            isFallbackPayload && hasCachedItems && cached.length > nextItems.length;
          const effectiveItems = shouldKeepCached ? cached : nextItems;
          setItems(effectiveItems);
          // Не даём fallback-ответу (обычно короткий список из package.json)
          // перетереть уже полный каталог в session-кэше.
          if (effectiveItems.length > 0 && !shouldKeepCached) {
            writeFontsourceCatalogCache(effectiveItems);
          }
          setLoadError(null);

          if (typeof window !== 'undefined' && window.__CATALOG_DEBUG__) {
            console.debug('[FontsourceCatalogPanel] catalog loaded', {
              source: data?.source,
              items: effectiveItems.length,
              hasCachedItems,
              shouldKeepCached,
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          const message =
            e?.name === 'AbortError' || String(e?.message || '').toLowerCase().includes('timeout')
              ? 'Таймаут загрузки каталога'
              : e.message || 'Ошибка сети';
          setLoadError(message);
          console.error('[FontsourceCatalogPanel]', e);
        }
      } finally {
        if (!hasCachedItems) finalizeInitialLoading();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;
    if (typeof window === 'undefined') return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      // Без IntersectionObserver не пытаемся "пометить видимыми" все 2000+ строк — это будет тяжело.
      // Вместо этого подгружаем превью только для первых N, чтобы UI оставался отзывчивым.
      const N = 80;
      for (let i = 0; i < Math.min(items.length, N); i += 1) {
        const it = items[i];
        const slug = it?.id || it?.slug;
        if (!slug) continue;
        if (previewSeenSlugsRef.current.has(slug)) continue;
        previewSeenSlugsRef.current.add(slug);
        enqueuePreviewLoad(slug);
      }
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const slug = entry.target?.getAttribute('data-fontsource-slug');
          if (!slug) return;
          if (previewSeenSlugsRef.current.has(slug)) return;
          previewSeenSlugsRef.current.add(slug);
          enqueuePreviewLoad(slug);
        });
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      },
    );

    previewObserverRef.current = observer;
    previewNodeBySlugRef.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => {
      observer.disconnect();
      previewObserverRef.current = null;
    };
  }, [isActive, items]);

  const registerPreviewNode = useCallback((slug, node) => {
    const map = previewNodeBySlugRef.current;
    const prevNode = map.get(slug);
    const observer = previewObserverRef.current;

    if (prevNode && observer) {
      observer.unobserve(prevNode);
    }

    if (node) {
      map.set(slug, node);
      if (observer) observer.observe(node);
      return;
    }

    map.delete(slug);
  }, []);

  const addFontToLibrary = useCallback(
    async (libraryId, libraryEntry) => {
      const slug = String(libraryEntry?.id || '').replace(/^fontsource:/, '').trim();
      if (!slug) return false;
      const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      setAddingSlug(slug);
      try {
        const ok = await addLibraryEntryToLibrary({ libraryId, libraryEntry, onAddFontToLibrary });
        if (ok) {
          const elapsed = typeof performance !== 'undefined' ? performance.now() - t0 : MIN_LOADER_VISIBLE_MS;
          if (elapsed < MIN_LOADER_VISIBLE_MS) {
            await new Promise((resolve) => setTimeout(resolve, MIN_LOADER_VISIBLE_MS - elapsed));
          }
          markSlugRecentlyAdded(slug, FONTSOURCE_ADD_CATALOG_STICKY_MS);
        }
        return ok;
      } finally {
        setAddingSlug(null);
      }
    },
    [markSlugRecentlyAdded, onAddFontToLibrary],
  );

  // clearLongPressTimer cleanup handled inside useLongPressMultiSelect

  // filteredSortedItems/catalogItemsNotInSession приходят из useCatalogEngine

  useEffect(() => {
    if (!isActive) return undefined;
    const total = filteredSortedItems.length;
    if (total === 0) {
      if (typeof window !== 'undefined' && window.__CATALOG_DEBUG__) {
        console.debug('[FontsourceCatalogPanel] chunkRender total=0');
      }
      setVisibleCardsCount(0);
      return undefined;
    }

    if (total <= CHUNKED_RENDER_THRESHOLD) {
      if (typeof window !== 'undefined' && window.__CATALOG_DEBUG__) {
        console.debug('[FontsourceCatalogPanel] chunkRender renderAll', { total });
      }
      setVisibleCardsCount(total);
      return undefined;
    }

    const minRowInitial = 60;
    const minRowChunk = 60;
    const initialCount = Math.min(
      total,
      Math.max(isRowMode ? minRowInitial : activeGridCols * CHUNKED_INITIAL_ROWS, activeGridCols),
    );
    const chunkSize = Math.max(isRowMode ? minRowChunk : activeGridCols * CHUNKED_ROWS_PER_TICK, activeGridCols);
    if (typeof window !== 'undefined' && window.__CATALOG_DEBUG__) {
      console.debug('[FontsourceCatalogPanel] chunkRender start', {
        total,
        activeGridCols,
        initialCount,
        chunkSize,
      });
    }
    setVisibleCardsCount(initialCount);

    if (initialCount >= total) return undefined;

    let cancelled = false;
    let timerId = null;
    let idleId = null;
    let nextCount = initialCount;

    const pump = () => {
      if (cancelled) return;
      nextCount = Math.min(total, nextCount + chunkSize);
      if (typeof window !== 'undefined' && window.__CATALOG_DEBUG__) {
        console.debug('[FontsourceCatalogPanel] chunkRender pump', { nextCount, total });
      }
      setVisibleCardsCount(nextCount);
      if (nextCount < total) {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          idleId = window.requestIdleCallback(pump, { timeout: 250 });
        } else {
          timerId = window.setTimeout(pump, CHUNKED_TICK_MS);
        }
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(pump, { timeout: 250 });
    } else {
      timerId = window.setTimeout(pump, CHUNKED_TICK_MS);
    }
    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
      if (idleId && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [activeGridCols, filteredSortedItems.length, isActive, isRowMode]);

  const renderedItems = useMemo(
    () => filteredSortedItems.slice(0, visibleCardsCount),
    [filteredSortedItems, visibleCardsCount],
  );
  const isChunkRendering = renderedItems.length < filteredSortedItems.length;

  useEffect(() => {
    const visibleSlugs = new Set(filteredSortedItems.map((item) => item?.id || item?.slug).filter(Boolean));
    pruneSelection(visibleSlugs);
  }, [filteredSortedItems, pruneSelection]);

  const commitFontsourceRowGlobalSample = useCallback((text) => {
    const t = String(text ?? '').trim();
    setFontsourceRowGlobalSample(t === '' ? null : t);
  }, []);

  // startCardLongPress / onCardClick are provided by useLongPressMultiSelect

  const openFontsourceInEditor = useCallback(
    async (slug, isVariable) => {
      if (typeof onOpenFontsourceInEditorTab !== 'function') return;
      if (!slug) return;
      setAddingSlug(slug);
      try {
        await onOpenFontsourceInEditorTab(slug, isVariable);
      } catch {
        toast.error(`Не удалось открыть ${slug} в редакторе`);
      } finally {
        setAddingSlug(null);
      }
    },
    [onOpenFontsourceInEditorTab],
  );

  const downloadSelectedFontsource = useCallback(async () => {
    const selected = filteredSortedItems.filter((item) => selectedSlugs.has(item?.id || item?.slug));
    if (selected.length === 0) return;
    if (selected.length > 1) {
      const files = await buildSelectionArchiveEntries(selected, buildFontsourcePackageArchiveEntry);
      if (files.length > 0) {
        const archiveBlob = await buildArchiveBlobFromEntries(files);
        const stamp = new Date().toISOString().slice(0, 10);
        saveArchiveBlob(archiveBlob, `fontsource-selected-${stamp}.zip`);
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
    for (const item of selected) {
      // Последовательная загрузка уменьшает пиковую нагрузку.
      // eslint-disable-next-line no-await-in-loop
      const ok = await downloadFontsourcePackageZip(item, { silent: true });
      if (ok) okCount += 1;
    }
    if (okCount > 0) {
      toast.success(okCount === 1 ? 'Скачан 1 шрифт из выделенных' : `Скачано ${okCount} шрифтов из выделенных`);
    }
  }, [filteredSortedItems, selectedSlugs]);

  const downloadSelectedFontsourceAsFormat = useCallback(async (format) => {
    const selected = filteredSortedItems.filter((item) => selectedSlugs.has(item?.id || item?.slug));
    if (selected.length === 0) return;
    const targetFormat = String(format || 'woff2').toLowerCase();
    if (selected.length > 1) {
      const files = await buildSelectionArchiveEntries(
        selected,
        (item) => buildFontsourceFormatArchiveEntry(item, targetFormat),
      );
      if (files.length > 0) {
        const archiveBlob = await buildArchiveBlobFromEntries(files);
        const stamp = new Date().toISOString().slice(0, 10);
        saveArchiveBlob(archiveBlob, `fontsource-selected-${targetFormat}-${stamp}.zip`);
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
    for (const item of selected) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await downloadFontsourceAsFormat(item, targetFormat, { silent: true });
      if (ok) okCount += 1;
    }
    if (okCount > 0) {
      toast.success(
        okCount === 1
          ? `Скачан 1 шрифт (${targetFormat.toUpperCase()})`
          : `Скачано ${okCount} шрифтов (${targetFormat.toUpperCase()})`,
      );
    }
  }, [filteredSortedItems, selectedSlugs]);

  const selectedFontsourceLibraryEntries = useMemo(
    () =>
      filteredSortedItems
        .filter((item) => selectedSlugs.has(item?.id || item?.slug))
        .map((item) =>
          createCatalogLibraryEntry({
            source: 'fontsource',
            key: item?.id || item?.slug,
            label: item?.family || item?.label || item?.id || item?.slug,
            isVariable: Boolean(item?.isVariable),
          }),
        ),
    [filteredSortedItems, selectedSlugs],
  );

  const moveSelectedFontsourceToLibrary = useCallback(
    async (libraryId) => {
      if (!libraryId || selectedFontsourceLibraryEntries.length === 0) return false;
      let movedCount = 0;
      for (const libraryEntry of selectedFontsourceLibraryEntries) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await addLibraryEntryToLibrary({ libraryId, libraryEntry, onAddFontToLibrary });
        if (ok) movedCount += 1;
      }
      if (movedCount === 0) return false;
      setSelectedSlugs(new Set());
      toast.success(
        movedCount === 1
          ? 'Добавлен 1 шрифт в библиотеку'
          : `Добавлено ${movedCount} шрифтов в библиотеку`,
      );
      return true;
    },
    [onAddFontToLibrary, selectedFontsourceLibraryEntries, setSelectedSlugs],
  );

  const createLibraryFromSelectedFontsource = useCallback(() => {
    if (selectedFontsourceLibraryEntries.length === 0) return false;
    onRequestCreateLibrary?.(selectedFontsourceLibraryEntries);
    return true;
  }, [onRequestCreateLibrary, selectedFontsourceLibraryEntries]);

  useSelectionActionsEffect({
    isActive,
    onSelectionActionsChange,
    selectedCount: selectedSlugs.size,
    downloadSelected: downloadSelectedFontsource,
    downloadSelectedAsFormat: downloadSelectedFontsourceAsFormat,
    moveSelected: moveSelectedFontsourceToLibrary,
    createLibraryFromSelection: createLibraryFromSelectedFontsource,
  });

  useEffect(() => {
    setPreviewFontFamilyBySlug((prev) => {
      const next = { ...prev };
      let changed = false;
      items.forEach((item) => {
        const slug = item?.id || item?.slug;
        if (!slug) return;
        if (next[slug]) return;
        const family = getFontsourcePreviewFamily(slug);
        if (!family) return;
        next[slug] = family;
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [items]);

  useEffect(() => {
    // cleanup: cancel scheduled flush when panel unmounts
    return () => {
      if (typeof window === 'undefined') return;
      if (previewFlushRafRef.current != null) {
        window.cancelAnimationFrame(previewFlushRafRef.current);
        previewFlushRafRef.current = null;
      }
    };
  }, []);

  // enqueuePreviewLoad теперь вызывается прямо из IntersectionObserver

  // toolbarProps приходит из useCatalogEngine

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <CatalogPanelToolbar {...toolbarProps} />

      {loadError && items.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm text-red-600">Каталог Fontsource: {loadError}</p>
      ) : isInitialCatalogLoading && items.length === 0 ? (
        <FontsourceCatalogEmptyLoader />
      ) : items.length === 0 ? (
        <FontsourceCatalogEmptyLoader />
      ) : filteredSortedItems.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm uppercase text-gray-500">
          Ничего не найдено. Попробуйте другой запрос.
        </p>
      ) : catalogItemsNotInSession.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm uppercase text-gray-500">
          Все пакеты Fontsource из этой выдачи уже в сессии. Переключайте их во вкладках над областью просмотра.
        </p>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={setCatalogScrollRefs}
            className="catalog-scroll-area min-h-0 flex-1 overflow-x-hidden overflow-y-auto [align-content:start]"
          >
            <div
              className={`grid max-w-full transition-all duration-300 ease-out ${
                controls.gridViewMode === 'row'
                  ? 'grid-cols-1 gap-0'
                  : 'grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
              } ${
                areCardsVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
              }`}
            >
              {renderedItems.map((item) => {
                const slug = item.id || item.slug;
                return (
                  <FontsourceCatalogCard
                    key={slug}
                    item={item}
                    previewFamily={previewFontFamilyBySlug[slug] || 'system-ui, sans-serif'}
                    rowCatalogPreviewText={fontsourceRowGlobalSample == null ? undefined : fontsourceRowGlobalSample}
                    onRowGlobalSampleCommit={commitFontsourceRowGlobalSample}
                    busy={addingSlug === slug}
                    selected={selectedSlugs.has(slug)}
                    isRowMode={controls.gridViewMode === 'row'}
                    fontLibraries={fontLibraries}
                    onAddFontToLibrary={addFontToLibrary}
                    onRequestCreateLibrary={onRequestCreateLibrary}
                    onOpenInEditor={openFontsourceInEditor}
                    onDownloadPackageZip={downloadFontsourcePackageZip}
                    onDownloadAsFormat={downloadFontsourceAsFormat}
                    onDownloadVariableVariant={downloadFontsourceVariableVariant}
                    onCardClick={onCardClick}
                    onStartCardLongPress={startCardLongPress}
                    onPointerUp={clearLongPressTimer}
                    onPointerLeave={clearLongPressTimer}
                    onPointerCancel={clearLongPressTimer}
                    draggable
                    onDragStart={handleDragStart}
                    registerPreviewNode={registerPreviewNode}
                    previewText={PREVIEW_TEXT}
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
      {loadError ? (
        <p className="text-xs text-gray-500">Источник обновления недоступен: {loadError}</p>
      ) : null}
    </div>
  );
}
