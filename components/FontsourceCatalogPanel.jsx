import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from '../utils/appNotify';
import CatalogSessionAddSpinner from './ui/CatalogSessionAddSpinner';
import { CatalogLibraryActions } from './ui/CatalogLibraryActions';
import { CatalogFontCard } from './ui/CatalogFontCard';
import { CustomSelect } from './ui/CustomSelect';
import {
  NATIVE_SELECT_FIELD_INTERACTIVE,
  customSelectTriggerClass,
} from './ui/nativeSelectFieldClasses';
import { Tooltip } from './ui/Tooltip';
import { CatalogTopToolbar } from './ui/CatalogTopToolbar';
import { CatalogDownloadSplitButton } from './ui/CatalogDownloadSplitButton';
import { HexProgressLoader } from './ui/HexProgressLoader';
import { CatalogSearchField } from './ui/CatalogSearchField';
import { CatalogSearchButton } from './ui/CatalogSearchButton';
import { CatalogTextSortControls } from './ui/CatalogTextSortControls';
import { CatalogGridModeToggle } from './ui/CatalogGridModeToggle';
import { CatalogRowModeCard } from './ui/CatalogRowModeCard';
import { CatalogCardHoverOverlay } from './ui/CatalogCardHoverOverlay';
import { useCatalogToolbarLayout } from './ui/useCatalogToolbarLayout';
import { matchesSearch } from '../utils/searchMatching';
import {
  createCatalogLibraryEntry,
  isFontsourceFontInSession,
} from '../utils/fontLibraryUtils';
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
import { base64ToArrayBuffer } from '../utils/fontManagerUtils';
import { processLocalFont } from '../utils/localFontProcessor';
import { createZipBlob } from '../utils/zipUtils';

const { startTransition } = React;

const PREVIEW_TEXT = 'AaBbCcDdEe';
const PREVIEW_CONCURRENCY_LIMIT = 3;
const CARD_LONG_PRESS_MS = 220;
const MIN_LOADER_VISIBLE_MS = 900;
const GRID_GAP_PX = 16;
const CHUNKED_RENDER_THRESHOLD = 80;
const CHUNKED_INITIAL_ROWS = 2;
const CHUNKED_ROWS_PER_TICK = 2;
const CHUNKED_TICK_MS = 16;
const FONTSOURCE_MIN_FULL_CATALOG_SIZE = 100;

function fontsourceCatalogGridCols(viewportWidth) {
  if (viewportWidth <= 0) return 2;
  if (viewportWidth >= 1280) return 5;
  if (viewportWidth >= 1024) return 4;
  if (viewportWidth >= 768) return 3;
  return 2;
}

function saveBlobAsFile(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function buildSafeFileBase(name, fallback = 'font') {
  return String(name || fallback)
    .trim()
    .replace(/[^\p{L}\p{N}\-_.\s]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function isInteractiveTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, label, [role="button"], [data-no-card-select="true"]',
    ),
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
  selectOrAddFontsourceFont,
  fontLibraries = [],
  onAddFontToLibrary,
  onRequestCreateLibrary,
  onOpenInEditor,
  trailingToolbar = null,
  isActive = true,
  onSelectionActionsChange,
  onTotalItemsChange,
}) {
  const {
    setCatalogScrollContainer,
    setTrailingToolbarContainer,
    gridCols,
    oneCardWidthPx,
    toolbarAlignToGrid,
  } = useCatalogToolbarLayout({
    trailingToolbar,
    gridGapPx: GRID_GAP_PX,
    gridColsResolver: fontsourceCatalogGridCols,
    autoMeasureGridWidth: true,
  });
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [addingSlug, setAddingSlug] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubset, setFilterSubset] = useState('');
  const [filterVariable, setFilterVariable] = useState('all');
  const [filterItalicOnly, setFilterItalicOnly] = useState(false);
  const [gridViewMode, setGridViewMode] = useState('grid');
  const [sortMode, setSortMode] = useState('popular');
  const activeGridCols = gridViewMode === 'row' ? 1 : gridCols;
  const [selectedSlugs, setSelectedSlugs] = useState(() => new Set());
  const [isInitialCatalogLoading, setIsInitialCatalogLoading] = useState(true);
  const [areCardsVisible, setAreCardsVisible] = useState(false);
  const [visibleCardsCount, setVisibleCardsCount] = useState(0);

  useEffect(() => {
    onTotalItemsChange?.(items.length);
  }, [items, onTotalItemsChange]);

  const [visiblePreviewMap, setVisiblePreviewMap] = useState({});
  const [previewFontFamilyBySlug, setPreviewFontFamilyBySlug] = useState({});

  const previewObserverRef = React.useRef(null);
  const previewNodeBySlugRef = React.useRef(new Map());
  const previewLoadingRef = React.useRef(new Set());
  const previewQueuedRef = React.useRef(new Set());
  const previewQueueRef = React.useRef([]);
  const previewActiveLoadsRef = React.useRef(0);
  const longPressTimerRef = React.useRef(null);
  const longPressTriggeredRef = React.useRef(false);

  const searchQueryTrimmed = searchQuery.trim();

  useEffect(() => {
    const cached = readFontsourceCatalogCache();
    const hasCachedItems = cached.length > 0;
    const loadingStartedAt = Date.now();
    if (cached.length > 0) {
      startTransition(() => {
        setItems(cached);
      });
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
        const res = await fetch('/api/fontsource-catalog');
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
          startTransition(() => {
            setItems(effectiveItems);
          });
          // Не даём fallback-ответу (обычно короткий список из package.json)
          // перетереть уже полный каталог в session-кэше.
          if (effectiveItems.length > 0 && !shouldKeepCached) {
            writeFontsourceCatalogCache(effectiveItems);
          }
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || 'Ошибка сети');
          console.error('[FontsourceCatalogPanel]', e);
        }
      } finally {
        if (!hasCachedItems) finalizeInitialLoading();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setVisiblePreviewMap((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          const slug = item?.id || item?.slug;
          if (slug) next[slug] = true;
        });
        return next;
      });
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePreviewMap((prev) => {
          let changed = false;
          const next = { ...prev };
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const slug = entry.target?.getAttribute('data-fontsource-slug');
            if (!slug || next[slug]) return;
            next[slug] = true;
            changed = true;
          });
          return changed ? next : prev;
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
  }, [items]);

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

  const loadPreviewFont = useCallback(async (slug) => {
    const loadedFamily = await loadFontsourcePreviewFamily(slug, {
      weight: 400,
      style: 'normal',
      subset: 'latin',
    });
    if (!loadedFamily) return;
    setPreviewFontFamilyBySlug((prev) => ({
      ...prev,
      [slug]: loadedFamily,
    }));
  }, []);

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

  const addFont = useCallback(
    async (slug, label, preferVariable = false) => {
      if (isFontsourceFontInSession(fonts, slug)) {
        return true;
      }
      setAddingSlug(slug);
      try {
        await selectOrAddFontsourceFont(slug, Boolean(preferVariable));
        return true;
      } catch (e) {
        console.error('[FontsourceCatalogPanel] add', slug, e);
        toast.error(`Не удалось добавить ${label}`);
        return false;
      } finally {
        setAddingSlug(null);
      }
    },
    [fonts, selectOrAddFontsourceFont],
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

  const fontsourceLibraryEntry = useCallback(
    ({ id, slug, family, label }) =>
      createCatalogLibraryEntry({
        source: 'fontsource',
        key: id || slug,
        label: family || label || slug || id,
      }),
    [],
  );

  /** До любых return — иначе «Rendered more hooks than during the previous render» */
  const catalogItemsNotInSession = useMemo(() => {
    return items.filter((item) => {
      const slug = item?.id || item?.slug;
      return slug ? !isFontsourceFontInSession(fonts, slug) : false;
    });
  }, [items, fonts]);

  const filteredItems = useMemo(() => {
    return catalogItemsNotInSession.filter((item) => {
      if (filterCategory && (item.category || '') !== filterCategory) return false;
      if (filterSubset) {
        const subsets = Array.isArray(item.subsets) ? item.subsets : [];
        if (!subsets.includes(filterSubset)) return false;
      }
      if (filterVariable === 'variable' && !item.isVariable) return false;
      if (filterVariable === 'static' && item.isVariable) return false;
      if (filterItalicOnly && !item.hasItalic) return false;
      if (!searchQueryTrimmed) return true;
      return matchesSearch(
        [
          item.family,
          item.label,
          item.category,
          item.primaryScript,
          ...(Array.isArray(item.subsets) ? item.subsets : []),
        ],
        searchQueryTrimmed,
      );
    });
  }, [
    catalogItemsNotInSession,
    searchQueryTrimmed,
    filterCategory,
    filterSubset,
    filterVariable,
    filterItalicOnly,
  ]);

  const filteredSortedItems = useMemo(() => {
    const googlePopularityByFamily = new Map();
    const googleCached = readGoogleFontCatalogCache();
    (Array.isArray(googleCached) ? googleCached : []).forEach((row) => {
      const family = String(row?.family || '').trim().toLowerCase();
      const rank = Number(row?.defaultSort);
      if (!family || !Number.isFinite(rank)) return;
      if (!googlePopularityByFamily.has(family) || rank < googlePopularityByFamily.get(family)) {
        googlePopularityByFamily.set(family, rank);
      }
    });

    const rows = [...filteredItems];
    rows.sort((a, b) => {
      if (sortMode === 'popular') {
        const byPopularity = (Number(b?.popularityScore) || 0) - (Number(a?.popularityScore) || 0);
        if (byPopularity !== 0) return byPopularity;
        const aGoogleRank = googlePopularityByFamily.get(String(a?.family || '').trim().toLowerCase());
        const bGoogleRank = googlePopularityByFamily.get(String(b?.family || '').trim().toLowerCase());
        const aHasGoogleRank = Number.isFinite(aGoogleRank);
        const bHasGoogleRank = Number.isFinite(bGoogleRank);
        if (aHasGoogleRank && bHasGoogleRank) {
          if (aGoogleRank !== bGoogleRank) return aGoogleRank - bGoogleRank;
        } else if (aHasGoogleRank !== bHasGoogleRank) {
          return aHasGoogleRank ? -1 : 1;
        }
        const byStyleCount = (Number(b?.styleCount) || 0) - (Number(a?.styleCount) || 0);
        if (byStyleCount !== 0) return byStyleCount;
        const bySubsets =
          (Array.isArray(b?.subsets) ? b.subsets.length : 0) -
          (Array.isArray(a?.subsets) ? a.subsets.length : 0);
        if (bySubsets !== 0) return bySubsets;
        return String(a.family || '').localeCompare(String(b.family || ''), 'ru', { sensitivity: 'base' });
      }
      if (sortMode === 'name-desc') {
        return String(b.family || '').localeCompare(String(a.family || ''), 'ru', { sensitivity: 'base' });
      }
      if (sortMode === 'category') {
        const byCategory = String(a.category || '').localeCompare(String(b.category || ''), 'ru', {
          sensitivity: 'base',
        });
        if (byCategory !== 0) return byCategory;
        return String(a.family || '').localeCompare(String(b.family || ''), 'ru', { sensitivity: 'base' });
      }
      if (sortMode === 'styles-desc') {
        return (Number(b.styleCount) || 0) - (Number(a.styleCount) || 0);
      }
      if (sortMode === 'styles-asc') {
        return (Number(a.styleCount) || 0) - (Number(b.styleCount) || 0);
      }
      if (sortMode === 'subsets-desc') {
        return (Array.isArray(b.subsets) ? b.subsets.length : 0) - (Array.isArray(a.subsets) ? a.subsets.length : 0);
      }
      return String(a.family || '').localeCompare(String(b.family || ''), 'ru', { sensitivity: 'base' });
    });
    return rows;
  }, [filteredItems, sortMode]);

  useEffect(() => {
    const total = filteredSortedItems.length;
    if (total === 0) {
      setVisibleCardsCount(0);
      return undefined;
    }

    if (total <= CHUNKED_RENDER_THRESHOLD) {
      setVisibleCardsCount(total);
      return undefined;
    }

    const initialCount = Math.min(total, Math.max(activeGridCols * CHUNKED_INITIAL_ROWS, activeGridCols));
    const chunkSize = Math.max(activeGridCols * CHUNKED_ROWS_PER_TICK, activeGridCols);
    setVisibleCardsCount(initialCount);

    if (initialCount >= total) return undefined;

    let cancelled = false;
    let timerId = null;
    let nextCount = initialCount;

    const pump = () => {
      if (cancelled) return;
      nextCount = Math.min(total, nextCount + chunkSize);
      setVisibleCardsCount(nextCount);
      if (nextCount < total) {
        timerId = window.setTimeout(pump, CHUNKED_TICK_MS);
      }
    };

    timerId = window.setTimeout(pump, CHUNKED_TICK_MS);
    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [activeGridCols, filteredSortedItems]);

  const renderedItems = useMemo(
    () => filteredSortedItems.slice(0, visibleCardsCount),
    [filteredSortedItems, visibleCardsCount],
  );
  const isChunkRendering = renderedItems.length < filteredSortedItems.length;

  useEffect(() => {
    const visibleSlugs = new Set(filteredSortedItems.map((item) => item?.id || item?.slug).filter(Boolean));
    setSelectedSlugs((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set();
      prev.forEach((slug) => {
        if (visibleSlugs.has(slug)) next.add(slug);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [filteredSortedItems]);

  const toggleSelectedSlug = useCallback((slug) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const startCardLongPress = useCallback(
    (event, slug) => {
      if (isInteractiveTarget(event.target)) return;
      clearLongPressTimer();
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        toggleSelectedSlug(slug);
      }, CARD_LONG_PRESS_MS);
    },
    [clearLongPressTimer, toggleSelectedSlug],
  );

  const onCardClick = useCallback(
    (event, slug) => {
      if (isInteractiveTarget(event.target)) return;
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        event.preventDefault();
        return;
      }
      if (selectedSlugs.size > 0) {
        event.preventDefault();
        toggleSelectedSlug(slug);
      }
    },
    [selectedSlugs.size, toggleSelectedSlug],
  );

  const openFontsourceInEditor = useCallback(
    async (slug, isVariable) => {
      if (typeof onOpenInEditor !== 'function') return;
      if (!slug) return;
      setAddingSlug(slug);
      try {
        const apiUrl = isVariable
          ? `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`
          : `/api/fontsource/${encodeURIComponent(slug)}?weight=400&style=normal&subset=latin`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
        if (!fontBufferBase64) throw new Error('Пустой буфер');
        const fileNameRaw = String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
        const fontBuffer = base64ToArrayBuffer(fontBufferBase64);
        const ext = fileNameRaw.split('.').pop()?.toLowerCase() || 'woff2';
        const mimeType = `font/${
          ext === 'ttf' ? 'ttf' : ext === 'otf' ? 'otf' : ext === 'woff' ? 'woff' : 'woff2'
        }`;
        const blob = new Blob([fontBuffer], { type: mimeType });
        const previewFont = await processLocalFont({
          file: blob,
          name: fileNameRaw || `${slug}.woff2`,
        });
        if (!previewFont) throw new Error('Не удалось подготовить превью');
        previewFont.source = 'fontsource';
        await onOpenInEditor(previewFont);
      } catch (error) {
        toast.error(`Не удалось открыть ${slug} в редакторе`);
      } finally {
        setAddingSlug(null);
      }
    },
    [onOpenInEditor],
  );

  const convertBlobToFormat = useCallback(async (blob, format) => {
    const targetFormat = String(format || 'woff2').toLowerCase();
    if (targetFormat === 'woff2') return blob;
    const sourceBuffer = await blob.arrayBuffer();
    const response = await fetch('/api/convert-font-format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fontData: arrayBufferToBase64(sourceBuffer),
        targetFormat,
      }),
    });
    if (!response.ok) {
      let details = `HTTP ${response.status}`;
      try {
        const json = await response.json();
        details = json?.details || json?.error || details;
      } catch {
        // ignore
      }
      throw new Error(details);
    }
    const payload = await response.json();
    const outBase64 = payload?.data;
    if (!outBase64) throw new Error('Пустой ответ конвертера');
    const outBuffer = base64ToArrayBuffer(outBase64);
    const mimeType = `font/${targetFormat === 'otf' ? 'otf' : targetFormat === 'ttf' ? 'ttf' : targetFormat === 'woff' ? 'woff' : 'woff2'}`;
    return new Blob([outBuffer], { type: mimeType });
  }, []);

  const downloadFontsourceCurrentFile = useCallback(async (item, { silent = false } = {}) => {
    const slug = item?.id || item?.slug;
    if (!slug) return false;
    try {
      const isVariable = Boolean(item?.isVariable);
      const apiUrl = isVariable
        ? `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`
        : `/api/fontsource/${encodeURIComponent(slug)}?weight=400&style=normal&subset=latin`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
      if (!fontBufferBase64) throw new Error('Пустой буфер');
      const fileNameRaw = String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
      const fontBuffer = base64ToArrayBuffer(fontBufferBase64);
      const ext = fileNameRaw.split('.').pop()?.toLowerCase() || 'woff2';
      const mimeType = `font/${
        ext === 'ttf' ? 'ttf' : ext === 'otf' ? 'otf' : ext === 'woff' ? 'woff' : 'woff2'
      }`;
      const blob = new Blob([fontBuffer], { type: mimeType });
      const fallbackName = `${slug}${isVariable ? '-variable' : ''}.${ext || 'woff2'}`;
      saveBlobAsFile(blob, fileNameRaw || fallbackName);
      if (!silent) toast.success(`Скачан ${item?.family || slug}`);
      return true;
    } catch (error) {
      if (!silent) toast.error(`Не удалось скачать ${item?.family || slug}`);
      return false;
    }
  }, []);

  const downloadFontsourceAsFormat = useCallback(async (item, format, { silent = false } = {}) => {
    const slug = item?.id || item?.slug;
    if (!slug) return false;
    const targetFormat = String(format || 'woff2').toLowerCase();
    try {
      const isVariable = Boolean(item?.isVariable);
      const apiUrl = isVariable
        ? `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`
        : `/api/fontsource/${encodeURIComponent(slug)}?weight=400&style=normal&subset=latin`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
      if (!fontBufferBase64) throw new Error('Пустой буфер');
      const sourceBuffer = base64ToArrayBuffer(fontBufferBase64);
      const sourceExt = String(payload?.fileName || payload?.actualFileName || '').split('.').pop()?.toLowerCase() || 'woff2';
      const sourceBlob = new Blob([sourceBuffer], {
        type: `font/${sourceExt === 'ttf' ? 'ttf' : sourceExt === 'otf' ? 'otf' : sourceExt === 'woff' ? 'woff' : 'woff2'}`,
      });
      const converted = await convertBlobToFormat(sourceBlob, targetFormat);
      const baseName = buildSafeFileBase(item?.family || slug, slug);
      saveBlobAsFile(converted, `${baseName}.${targetFormat}`);
      if (!silent) toast.success(`Скачан ${item?.family || slug} (${targetFormat.toUpperCase()})`);
      return true;
    } catch (error) {
      if (!silent) toast.error(`Не удалось конвертировать ${item?.family || slug} в ${targetFormat.toUpperCase()}`);
      return false;
    }
  }, [convertBlobToFormat]);

  const downloadFontsourceVariableVariant = useCallback(async (item, { silent = false } = {}) => {
    const slug = item?.id || item?.slug;
    if (!slug || item?.isVariable !== true) return false;
    try {
      const apiUrl = `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
      if (!fontBufferBase64) throw new Error('Пустой буфер');
      const fontBuffer = base64ToArrayBuffer(fontBufferBase64);
      const fileNameRaw = String(payload?.fileName || `${slug}-variable.woff2`);
      const ext = fileNameRaw.split('.').pop()?.toLowerCase() || 'woff2';
      const mimeType = `font/${
        ext === 'ttf' ? 'ttf' : ext === 'otf' ? 'otf' : ext === 'woff' ? 'woff' : 'woff2'
      }`;
      const blob = new Blob([fontBuffer], { type: mimeType });
      const baseName = buildSafeFileBase(item?.family || slug, slug);
      saveBlobAsFile(blob, `${baseName}-variable.${ext}`);
      if (!silent) toast.success(`Скачан Variable ${item?.family || slug}`);
      return true;
    } catch (error) {
      if (!silent) toast.error(`Не удалось скачать Variable ${item?.family || slug}`);
      return false;
    }
  }, []);

  const downloadFontsourcePackageZip = useCallback(async (item, { silent = false } = {}) => {
    const slug = item?.id || item?.slug;
    if (!slug) return false;
    try {
      const files = [];
      const baseName = buildSafeFileBase(item?.family || slug, slug);
      const staticResponse = await fetch(
        `/api/fontsource/${encodeURIComponent(slug)}?weight=400&style=normal&subset=latin`,
      );
      if (staticResponse.ok) {
        const payload = await staticResponse.json();
        const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
        const fileNameRaw = String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
        if (fontBufferBase64) {
          const ext = fileNameRaw.split('.').pop()?.toLowerCase() || 'woff2';
          const fileData = base64ToArrayBuffer(fontBufferBase64);
          files.push({
            name: `${baseName}/web/${buildSafeFileBase(fileNameRaw, `${baseName}.${ext}`)}`,
            data: fileData,
          });
        }
      }
      if (item?.isVariable) {
        try {
          const variableResponse = await fetch(
            `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`,
          );
          if (variableResponse.ok) {
            const payload = await variableResponse.json();
            const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
            const fileNameRaw = String(payload?.fileName || `${slug}-variable.woff2`);
            if (fontBufferBase64) {
              const fileData = base64ToArrayBuffer(fontBufferBase64);
              files.push({
                name: `${baseName}/source/${buildSafeFileBase(fileNameRaw, `${baseName}-variable.woff2`)}`,
                data: fileData,
              });
            }
          }
        } catch {
          // optional file
        }
      }
      if (files.length === 0) throw new Error('Нет файлов для упаковки');
      const zipBlob = await createZipBlob(files);
      saveBlobAsFile(zipBlob, `${baseName}-package.zip`);
      if (!silent) toast.success(`Скачан пакет ${item?.family || slug}`);
      return true;
    } catch (error) {
      if (!silent) toast.error(`Не удалось собрать пакет ${item?.family || slug}`);
      return false;
    }
  }, []);

  const downloadSelectedFontsource = useCallback(async () => {
    const selected = filteredSortedItems.filter((item) => selectedSlugs.has(item?.id || item?.slug));
    if (selected.length === 0) return;
    if (selected.length > 1) {
      const files = [];
      const usedNames = new Set();
      for (const item of selected) {
        const slug = item?.id || item?.slug;
        if (!slug) continue;
        try {
          const packageFiles = [];
          const isVariable = Boolean(item?.isVariable);
          const staticResponse = await fetch(
            `/api/fontsource/${encodeURIComponent(slug)}?weight=400&style=normal&subset=latin`,
          );
          if (staticResponse.ok) {
            const staticPayload = await staticResponse.json();
            const staticBase64 = staticPayload?.fontBufferBase64 ?? staticPayload?.fontData;
            if (staticBase64) {
              const staticFileName = String(staticPayload?.fileName || staticPayload?.actualFileName || `${slug}.woff2`);
              const staticExt = staticFileName.split('.').pop()?.toLowerCase() || 'woff2';
              packageFiles.push({
                name: `web/${buildSafeFileBase(staticFileName, `${slug}.${staticExt}`)}`,
                data: base64ToArrayBuffer(staticBase64),
              });
            }
          }
          if (isVariable) {
            try {
              const variableResponse = await fetch(
                `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`,
              );
              if (variableResponse.ok) {
                const variablePayload = await variableResponse.json();
                const variableBase64 = variablePayload?.fontBufferBase64 ?? variablePayload?.fontData;
                if (variableBase64) {
                  const variableFileName = String(variablePayload?.fileName || `${slug}-variable.woff2`);
                  packageFiles.push({
                    name: `source/${buildSafeFileBase(variableFileName, `${slug}-variable.woff2`)}`,
                    data: base64ToArrayBuffer(variableBase64),
                  });
                }
              }
            } catch {
              // optional file
            }
          }
          if (packageFiles.length === 0) continue;
          const baseName = buildSafeFileBase(item?.family || slug, slug);
          // eslint-disable-next-line no-await-in-loop
          const packageZipBlob = await createZipBlob(
            packageFiles.map((file) => ({ name: `${baseName}/${file.name}`, data: file.data })),
          );
          let fileName = `${baseName}-package.zip`;
          let suffix = 2;
          while (usedNames.has(fileName)) {
            fileName = `${baseName}-package-${suffix}.zip`;
            suffix += 1;
          }
          usedNames.add(fileName);
          files.push({ name: fileName, data: packageZipBlob });
        } catch {
          // skip failed item
        }
      }
      if (files.length > 0) {
        const archiveBlob = await createZipBlob(files);
        const stamp = new Date().toISOString().slice(0, 10);
        saveBlobAsFile(archiveBlob, `fontsource-selected-${stamp}.zip`);
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
  }, [downloadFontsourcePackageZip, filteredSortedItems, selectedSlugs]);

  const downloadSelectedFontsourceAsFormat = useCallback(async (format) => {
    const selected = filteredSortedItems.filter((item) => selectedSlugs.has(item?.id || item?.slug));
    if (selected.length === 0) return;
    const targetFormat = String(format || 'woff2').toLowerCase();
    if (selected.length > 1) {
      const files = [];
      const usedNames = new Set();
      for (const item of selected) {
        const slug = item?.id || item?.slug;
        if (!slug) continue;
        try {
          const isVariable = Boolean(item?.isVariable);
          const apiUrl = isVariable
            ? `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`
            : `/api/fontsource/${encodeURIComponent(slug)}?weight=400&style=normal&subset=latin`;
          // eslint-disable-next-line no-await-in-loop
          const response = await fetch(apiUrl);
          if (!response.ok) continue;
          // eslint-disable-next-line no-await-in-loop
          const payload = await response.json();
          const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
          if (!fontBufferBase64) continue;
          const sourceBuffer = base64ToArrayBuffer(fontBufferBase64);
          const sourceExt = String(payload?.fileName || payload?.actualFileName || '').split('.').pop()?.toLowerCase() || 'woff2';
          const sourceBlob = new Blob([sourceBuffer], {
            type: `font/${sourceExt === 'ttf' ? 'ttf' : sourceExt === 'otf' ? 'otf' : sourceExt === 'woff' ? 'woff' : 'woff2'}`,
          });
          const outBlob =
            targetFormat === 'woff2'
              ? sourceBlob
              : // eslint-disable-next-line no-await-in-loop
                await convertBlobToFormat(sourceBlob, targetFormat);
          const baseName = buildSafeFileBase(item?.family || slug, slug);
          let fileName = `${baseName}.${targetFormat}`;
          let suffix = 2;
          while (usedNames.has(fileName)) {
            fileName = `${baseName}-${suffix}.${targetFormat}`;
            suffix += 1;
          }
          usedNames.add(fileName);
          files.push({ name: fileName, data: outBlob });
        } catch {
          // skip failed item
        }
      }
      if (files.length > 0) {
        const archiveBlob = await createZipBlob(files);
        const stamp = new Date().toISOString().slice(0, 10);
        saveBlobAsFile(archiveBlob, `fontsource-selected-${targetFormat}-${stamp}.zip`);
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
  }, [downloadFontsourceAsFormat, filteredSortedItems, selectedSlugs]);

  useEffect(() => {
    if (typeof onSelectionActionsChange !== 'function') return;
    if (!isActive) return;
    onSelectionActionsChange({
      selectedCount: selectedSlugs.size,
      downloadSelected: downloadSelectedFontsource,
      downloadSelectedAsFormat: downloadSelectedFontsourceAsFormat,
    });
    return () => onSelectionActionsChange(null);
  }, [downloadSelectedFontsource, downloadSelectedFontsourceAsFormat, isActive, onSelectionActionsChange, selectedSlugs.size]);

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
    filteredSortedItems.forEach((item) => {
      const slug = item?.id || item?.slug;
      if (!slug) return;
      if (!visiblePreviewMap[slug]) return;
      enqueuePreviewLoad(slug);
    });
  }, [filteredSortedItems, visiblePreviewMap, enqueuePreviewLoad]);

  const facetCategories = useMemo(() => {
    const set = new Set();
    catalogItemsNotInSession.forEach((item) => {
      if (item?.category) set.add(item.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }));
  }, [catalogItemsNotInSession]);

  const facetSubsets = useMemo(() => {
    const set = new Set();
    catalogItemsNotInSession.forEach((item) => {
      (Array.isArray(item?.subsets) ? item.subsets : []).forEach((subset) => {
        if (subset) set.add(subset);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [catalogItemsNotInSession]);

  const hasActiveFilters =
    Boolean(searchQueryTrimmed) ||
    Boolean(filterCategory) ||
    Boolean(filterSubset) ||
    filterVariable !== 'all' ||
    filterItalicOnly ||
    sortMode !== 'popular';

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterSubset('');
    setFilterVariable('all');
    setFilterItalicOnly(false);
    setSortMode('popular');
  }, []);

  const countSuffix =
    filteredSortedItems.length !== catalogItemsNotInSession.length
      ? ` из ${catalogItemsNotInSession.length}`
      : ' шт.';

  const fieldInteractive = NATIVE_SELECT_FIELD_INTERACTIVE;
  const halfCardWidthPx = toolbarAlignToGrid && oneCardWidthPx != null ? oneCardWidthPx / 2 : null;
  const selectClass = (placeholderMuted) => customSelectTriggerClass({ placeholderMuted });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <CatalogTopToolbar
        trailingToolbar={trailingToolbar}
        trailingContainerRef={setTrailingToolbarContainer}
        trailingContainerClassName="min-w-0 w-full sm:w-auto"
        trailingContainerStyle={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
        searchContainerClassName="relative min-w-0 w-full sm:flex-1"
        searchActionContainerClassName="min-w-0 w-full sm:w-auto flex shrink-0 items-center"
        searchActionContainerStyle={halfCardWidthPx != null ? { width: halfCardWidthPx, maxWidth: '100%' } : undefined}
        searchActionControl={<CatalogSearchButton disabled={!isSearchFocused} />}
        primaryFiltersContainerClassName="min-w-0 w-full sm:w-auto sm:min-w-[18rem]"
        primaryFiltersContainerStyle={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
        secondaryFiltersContainerClassName="min-w-0 w-full sm:w-auto sm:min-w-[14rem]"
        secondaryFiltersContainerStyle={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
        searchControl={
          <CatalogSearchField
            id="fontsource-catalog-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Имя, категория, наборы…"
            count={filteredSortedItems.length}
            countSuffix={countSuffix}
            inputInteractiveClassName={fieldInteractive}
            onFocusChange={setIsSearchFocused}
          />
        }
        primaryFiltersControl={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CustomSelect
              id="fontsource-filter-category"
              value={filterCategory}
              onChange={setFilterCategory}
              className={selectClass(!filterCategory)}
              aria-label="Категория"
              placeholder="Категория"
              emptyValue=""
              options={facetCategories.map((c) => ({ value: c, label: c }))}
            />
            <CustomSelect
              id="fontsource-filter-var"
              value={filterVariable}
              onChange={setFilterVariable}
              className={selectClass(filterVariable === 'all')}
              aria-label="Вариативность"
              placeholder="Вариативность"
              emptyValue="all"
              options={[
                { value: 'variable', label: 'Вариативные' },
                { value: 'static', label: 'Статические' },
              ]}
            />
          </div>
        }
        secondaryFiltersControl={
          <CustomSelect
            id="fontsource-filter-subset"
            value={filterSubset}
            onChange={setFilterSubset}
            className={selectClass(!filterSubset)}
            aria-label="Язык / набор (subset)"
            placeholder="Язык"
            emptyValue=""
            options={facetSubsets.map((s) => ({ value: s, label: s }))}
          />
        }
        italicControl={
          <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-transparent bg-gray-50 px-2 text-sm uppercase font-semibold text-gray-900 sm:px-3">
            <input
              type="checkbox"
              checked={filterItalicOnly}
              onChange={(event) => setFilterItalicOnly(event.target.checked)}
              className="h-4 w-4 rounded border-gray-400 bg-gray-50 text-accent"
            />
            <span className="whitespace-nowrap">Курсив</span>
          </label>
        }
        actionsControl={
          <CatalogTextSortControls
            sortValue={sortMode}
            onSortChange={setSortMode}
            sortOptions={[
                  { value: 'popular', label: 'Популярное' },
                  { value: 'name-asc', label: 'А -> Я' },
                  { value: 'name-desc', label: 'Я -> А' },
                  { value: 'category', label: 'Категория -> имя' },
                  { value: 'styles-desc', label: 'Больше начертаний' },
                  { value: 'styles-asc', label: 'Меньше начертаний' },
                  { value: 'subsets-desc', label: 'Больше символов' },
            ]}
            showResetButton={false}
          />
        }
        afterActionsControl={
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
              className="box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm font-semibold uppercase text-gray-900 hover:text-accent disabled:cursor-default disabled:opacity-40 disabled:hover:text-gray-900"
            >
              Сбросить все
            </button>
            <CatalogGridModeToggle value={gridViewMode} onChange={setGridViewMode} />
          </div>
        }
      />

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
        <div
          ref={setCatalogScrollContainer}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [align-content:start]"
        >
          <div
            className={`grid max-w-full transition-all duration-300 ease-out ${
              gridViewMode === 'row'
                ? 'grid-cols-1 gap-0'
                : 'grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            } ${
              areCardsVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
            }`}
          >
            {renderedItems.map((item) => {
            const slug = item.id || item.slug;
            const family = item.family || item.label || slug;
            const styleCount = Number(item.styleCount) || 1;
            const subsetCount = (Array.isArray(item.subsets) ? item.subsets.length : 0) || 0;
            const isVariable = Boolean(item.isVariable);
            const hasItalic = Boolean(item.hasItalic);
            const previewFamily = previewFontFamilyBySlug[slug] || 'system-ui, sans-serif';
            const busy = addingSlug === slug;
            const libraryEntry = fontsourceLibraryEntry(item);
            const isRowMode = gridViewMode === 'row';
            const selectionOverlay = (
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

            const hoverOverlay = (
              <CatalogCardHoverOverlay
                centered={isRowMode}
                onOpen={() => void openFontsourceInEditor(slug, isVariable)}
                openAriaLabel={`Открыть ${family} в редакторе`}
                downloadButtonProps={{
                  primaryLabel: 'Скачать',
                  primaryAriaLabel: `Скачать пакет ${family}`,
                  onPrimaryClick: () => void downloadFontsourcePackageZip(item),
                  menuItems: [
                    {
                      key: 'zip',
                      label: 'ZIP (по умолчанию)',
                      onSelect: () => void downloadFontsourcePackageZip(item),
                    },
                    {
                      key: 'ttf',
                      label: 'TTF',
                      onSelect: () => void downloadFontsourceAsFormat(item, 'ttf'),
                    },
                    {
                      key: 'otf',
                      label: 'OTF',
                      onSelect: () => void downloadFontsourceAsFormat(item, 'otf'),
                    },
                    {
                      key: 'woff',
                      label: 'WOFF',
                      onSelect: () => void downloadFontsourceAsFormat(item, 'woff'),
                    },
                    {
                      key: 'current-file',
                      label: 'WOFF2',
                      onSelect: () => void downloadFontsourceAsFormat(item, 'woff2'),
                    },
                    {
                      key: 'variable',
                      label: 'Variable вариант',
                      hidden: !isVariable,
                      onSelect: () => void downloadFontsourceVariableVariant(item),
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
                onAddToSession={() => addFont(slug, family, isVariable)}
                onAddFontToLibrary={onAddFontToLibrary}
                onRequestCreateLibrary={onRequestCreateLibrary}
                libraryEntry={libraryEntry}
              />
            );

            return (
              isRowMode ? (
                <CatalogRowModeCard
                  family={family}
                  metaItems={[
                    item.category || 'Fontsource',
                    isVariable ? 'vf' : null,
                    hasItalic ? 'italic' : null,
                    `${subsetCount} ${pluralRu(subsetCount, 'язык', 'языка', 'языков')}`,
                    subsetCount > 0
                      ? `${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}`
                      : null,
                    `${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}`,
                  ]}
                  previewFamily={previewFamily}
                  previewText={family}
                  previewProps={{
                    ref: (node) => registerPreviewNode(slug, node),
                    'data-fontsource-slug': slug,
                  }}
                  selected={selectedSlugs.has(slug)}
                  busy={busy}
                  actions={actions}
                  selectionOverlay={selectionOverlay}
                  hoverOverlay={hoverOverlay}
                  onClick={(event) => onCardClick(event, slug)}
                  onPointerDown={(event) => startCardLongPress(event, slug)}
                  onPointerUp={clearLongPressTimer}
                  onPointerLeave={clearLongPressTimer}
                  onPointerCancel={clearLongPressTimer}
                />
              ) : (
                <CatalogFontCard
                key={slug}
                selected={selectedSlugs.has(slug)}
                onClick={(event) => onCardClick(event, slug)}
                onPointerDown={(event) => startCardLongPress(event, slug)}
                onPointerUp={clearLongPressTimer}
                onPointerLeave={clearLongPressTimer}
                onPointerCancel={clearLongPressTimer}
                busy={busy}
                minHeightClass="min-h-[148px] min-w-0"
                selectionOverlay={selectionOverlay}
                hoverOverlay={hoverOverlay}
                actions={actions}
                title={family}
                preview={
                  <div
                    ref={(node) => registerPreviewNode(slug, node)}
                    data-fontsource-slug={slug}
                    className="mt-2 min-h-[1.75rem] flex-1 truncate text-[1.75rem] leading-tight text-gray-800"
                    style={{ fontFamily: previewFamily }}
                  >
                    {PREVIEW_TEXT}
                  </div>
                }
                footer={
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1">
                      <span className="truncate text-[11px] uppercase font-semibold text-gray-500">
                        {item.category || 'Fontsource'}
                      </span>
                      {isVariable ? (
                        <span className="shrink-0 rounded bg-gray-100 px-1 py-0 text-[10px] uppercase font-semibold text-gray-800">
                          vf
                        </span>
                      ) : null}
                      {hasItalic ? (
                        <span className="shrink-0 rounded bg-gray-100 px-1 py-0 text-[10px] uppercase font-semibold text-gray-800">
                          italic
                        </span>
                      ) : null}
                    </div>
                    <Tooltip
                      as="div"
                      content="По метаданным Fontsource: начертания и поднаборы символов (subsets)"
                      className="shrink-0 flex items-center justify-end gap-1.5 text-right text-[11px] uppercase font-semibold tabular-nums leading-snug text-gray-500"
                    >
                      <span className="whitespace-nowrap">
                        {`${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}`}
                      </span>
                      {subsetCount > 0 ? (
                        <span className="whitespace-nowrap">
                          {`${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}`}
                        </span>
                      ) : null}
                    </Tooltip>
                  </div>
                }
              />
              )
            );
            })}
          </div>
          {isChunkRendering ? (
            <div className="flex justify-center py-3">
              <HexProgressLoader size={40} className="shrink-0" />
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
