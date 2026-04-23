import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import CatalogSessionAddSpinner from './ui/CatalogSessionAddSpinner';
import { CatalogLibraryActions } from './ui/CatalogLibraryActions';
import { CatalogFontCard } from './ui/CatalogFontCard';
import { SearchClearButton } from './ui/SearchClearButton';
import { CustomSelect } from './ui/CustomSelect';
import {
  NATIVE_SELECT_FIELD_INTERACTIVE,
  customSelectTriggerClass,
} from './ui/nativeSelectFieldClasses';
import { Tooltip } from './ui/Tooltip';
import { CatalogTopToolbar } from './ui/CatalogTopToolbar';
import { matchesSearch } from '../utils/searchMatching';
import {
  createCatalogLibraryEntry,
  isFontsourceFontInSession,
} from '../utils/fontLibraryUtils';
import {
  readFontsourceCatalogCache,
  writeFontsourceCatalogCache,
} from '../utils/fontsourceCatalogCache';
import {
  getFontsourcePreviewFamily,
  hasFontsourcePreviewFamily,
  loadFontsourcePreviewFamily,
} from '../utils/fontsourcePreviewRuntimeCache';

const PREVIEW_TEXT = 'AaBbCcDdEe';
const PREVIEW_CONCURRENCY_LIMIT = 3;

function pluralRu(n, one, few, many) {
  const abs = Math.abs(Number(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

export default function FontsourceCatalogPanel({
  fonts,
  selectOrAddFontsourceFont,
  fontLibraries = [],
  onAddFontToLibrary,
  onRequestCreateLibrary,
  trailingToolbar = null,
  onTotalItemsChange,
}) {
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [addingSlug, setAddingSlug] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVariable, setFilterVariable] = useState('all');
  const [filterItalicOnly, setFilterItalicOnly] = useState(false);
  const [sortMode, setSortMode] = useState('name-asc');

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

  const searchQueryTrimmed = searchQuery.trim();

  useEffect(() => {
    const cached = readFontsourceCatalogCache();
    if (cached.length > 0) {
      setItems(cached);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/fontsource-catalog');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          const nextItems = Array.isArray(data.items) ? data.items : [];
          setItems(nextItems);
          if (nextItems.length > 0) writeFontsourceCatalogCache(nextItems);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || 'Ошибка сети');
          console.error('[FontsourceCatalogPanel]', e);
        }
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
    filterVariable,
    filterItalicOnly,
  ]);

  const filteredSortedItems = useMemo(() => {
    const rows = [...filteredItems];
    rows.sort((a, b) => {
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

  const hasActiveFilters =
    Boolean(searchQueryTrimmed) ||
    Boolean(filterCategory) ||
    filterVariable !== 'all' ||
    filterItalicOnly ||
    sortMode !== 'name-asc';

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterVariable('all');
    setFilterItalicOnly(false);
    setSortMode('name-asc');
  }, []);

  const countSuffix =
    filteredSortedItems.length !== catalogItemsNotInSession.length
      ? ` из ${catalogItemsNotInSession.length}`
      : ' шт.';

  const fieldInteractive = NATIVE_SELECT_FIELD_INTERACTIVE;
  const selectClass = (placeholderMuted) => customSelectTriggerClass({ placeholderMuted });

  if (loadError && items.length === 0) {
    return <p className="text-sm text-red-600 mt-2">Каталог Fontsource: {loadError}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 mt-2">
        Каталог Fontsource пока пуст.
      </p>
    );
  }

  if (catalogItemsNotInSession.length === 0) {
    return (
      <p className="text-sm text-gray-500 mt-2">
        Все пакеты Fontsource из списка уже в сессии. Переключайте шрифты во вкладках над областью просмотра.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <CatalogTopToolbar
        trailingToolbar={trailingToolbar ? <div className="flex shrink-0 items-center">{trailingToolbar}</div> : null}
        searchSlot={
          <Tooltip
          as="div"
          content={`${filteredSortedItems.length}${countSuffix}`}
          className="relative min-w-0 w-full sm:flex-1"
        >
          <input
            id="fontsource-catalog-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Имя, категория, наборы…"
            className={`box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-28 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 ${fieldInteractive} focus:border-black/[0.14] focus:outline-none sm:pl-3 sm:pr-32`}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="absolute right-2 top-1/2 flex max-w-[55%] -translate-y-1/2 items-center gap-1.5">
            {searchQuery ? <SearchClearButton onClick={() => setSearchQuery('')} /> : null}
            <span className="pointer-events-none truncate text-right text-sm tabular-nums uppercase font-semibold text-gray-500">
              {filteredSortedItems.length}
              <span className="text-gray-400">{countSuffix}</span>
            </span>
          </div>
          </Tooltip>
        }
        filtersSlot={
          <div className="min-w-0 w-full sm:w-auto sm:max-w-[28rem]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
        }
        italicSlot={
          <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-transparent bg-gray-50 uppercase font-semibold px-2 text-sm text-gray-900 sm:px-3">
          <input
            type="checkbox"
            checked={filterItalicOnly}
            onChange={(e) => setFilterItalicOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-400 bg-gray-50 text-accent"
          />
          <span className="whitespace-nowrap">Курсив</span>
          </label>
        }
        actionsSlot={
          <div className="flex w-full shrink-0 flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
            <div className="min-w-0 sm:max-w-[14rem]">
              <CustomSelect
                id="fontsource-sort"
                value={sortMode}
                onChange={setSortMode}
                className={selectClass(sortMode === 'name-asc')}
                aria-label="Сортировка"
                options={[
                  { value: 'name-asc', label: 'Имя: А → Я' },
                  { value: 'name-desc', label: 'Имя: Я → А' },
                  { value: 'category', label: 'Категория → имя' },
                  { value: 'styles-desc', label: 'Больше начертаний сначала' },
                  { value: 'styles-asc', label: 'Меньше начертаний сначала' },
                  { value: 'subsets-desc', label: 'Больше наборов символов' },
                ]}
              />
            </div>
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
              className="box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm font-semibold uppercase text-gray-900 disabled:cursor-default disabled:opacity-40"
            >
              Сбросить все
            </button>
          </div>
        }
      />

      {filteredSortedItems.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm uppercase text-gray-500">
          Ничего не найдено. Попробуйте другой запрос.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [align-content:start]">
          <div className="grid grid-cols-2 gap-4 max-w-full md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredSortedItems.map((item) => {
            const slug = item.id || item.slug;
            const family = item.family || item.label || slug;
            const styleCount = Number(item.styleCount) || 1;
            const subsetCount = (Array.isArray(item.subsets) ? item.subsets.length : 0) || 0;
            const isVariable = Boolean(item.isVariable);
            const hasItalic = Boolean(item.hasItalic);
            const previewFamily = previewFontFamilyBySlug[slug] || 'system-ui, sans-serif';
            const busy = addingSlug === slug;
            const libraryEntry = fontsourceLibraryEntry(item);
            return (
              <CatalogFontCard
                key={slug}
                busy={busy}
                minHeightClass="min-h-[148px] min-w-0"
                actions={
                  <CatalogLibraryActions
                    libraries={fontLibraries}
                    busy={busy}
                    busyIndicator={<CatalogSessionAddSpinner />}
                    onAddToSession={() => addFont(slug, family, isVariable)}
                    onAddFontToLibrary={onAddFontToLibrary}
                    onRequestCreateLibrary={onRequestCreateLibrary}
                    libraryEntry={libraryEntry}
                  />
                }
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
                      <span className="whitespace-nowrap">
                        {`${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}`}
                      </span>
                    </Tooltip>
                  </div>
                }
              />
            );
            })}
          </div>
        </div>
      )}
      {loadError ? (
        <p className="text-xs text-gray-500">Источник обновления недоступен: {loadError}</p>
      ) : null}
    </div>
  );
}
