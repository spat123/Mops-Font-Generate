import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
import { VirtualizedGlyphGrid } from './ui/VirtualizedGlyphGrid';
import { toast } from 'react-toastify';
import {
  fetchGoogleStaticFontSlicesAll,
  fetchGoogleVariableFontSlicesAll,
} from '../utils/googleFontLoader';
import { ensureGoogleFontPreviewCss, removeAllGoogleFontPreviewCss } from '../utils/googleFontPreviewCss';
import {
  buildGoogleFontGlyphSampleText,
  hasGoogleScriptGlyphSample,
} from '../utils/googleFontCatalogSampleText';
import { CustomSelect } from './ui/CustomSelect';
import {
  NATIVE_SELECT_FIELD_INTERACTIVE,
  customSelectTriggerClass,
} from './ui/nativeSelectFieldClasses';
import CatalogSessionAddSpinner from './ui/CatalogSessionAddSpinner';
import { CatalogLibraryActions } from './ui/CatalogLibraryActions';
import { CatalogFontCard } from './ui/CatalogFontCard';
import { SearchClearButton } from './ui/SearchClearButton';
import { Tooltip } from './ui/Tooltip';
import { CatalogTopToolbar } from './ui/CatalogTopToolbar';
import { matchesSearch } from '../utils/searchMatching';
import {
  clearGoogleFontCatalogCache,
  readGoogleFontCatalogCache,
  writeGoogleFontCatalogCache,
} from '../utils/googleFontCatalogCache';
import {
  createCatalogLibraryEntry,
  isGoogleFontInSession,
} from '../utils/fontLibraryUtils';
import { compareFontFamilyName } from '../utils/fontSort';
/** Подписи к кодам наборов Google Fonts (subsets) */
const SUBSET_LABEL_RU = {
  latin: 'Латиница',
  'latin-ext': 'Латиница расш.',
  cyrillic: 'Кириллица',
  'cyrillic-ext': 'Кириллица расш.',
  greek: 'Греческий',
  hebrew: 'Иврит',
  arabic: 'Арабский',
  vietnamese: 'Вьетнамский',
  devanagari: 'Деванагари',
  thai: 'Тайский',
  tamil: 'Тамильский',
  bengali: 'Бенгальский',
  gujarati: 'Гуджарати',
  gurmukhi: 'Гурмукхи',
  kannada: 'Каннада',
  malayalam: 'Малаялам',
  oriya: 'Ория',
  telugu: 'Телугу',
  sinhala: 'Сингальский',
  khmer: 'Кхмерский',
  lao: 'Лаосский',
  myanmar: 'Мьянма',
  tibetan: 'Тибетский',
  ethiopic: 'Эфиопский',
  cherokee: 'Чероки',
  math: 'Математика',
  symbols: 'Символы',
  chakma: 'Чакма',
  javanese: 'Яванский',
  'ol-chiki': 'Ол-чики',
  'tai-tham': 'Тай Тхам',
};

function subsetOptionLabel(code) {
  if (!code) return '';
  const ru = SUBSET_LABEL_RU[code];
  return ru ? `${ru} (${code})` : code;
}

function pluralRu(n, one, few, many) {
  const abs = Math.abs(Number(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
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
  if (viewportWidth >= 768) return 3;
  return 2;
}

const GRID_GAP_PX = 16;

export default function GoogleFontsCatalogPanel({
  fonts,
  handleFontsUploaded,
  fontLibraries = [],
  onAddFontToLibrary,
  onRequestCreateLibrary,
  trailingToolbar = null,
  /** Сообщить родителю актуальное число семейств в каталоге (для нижней полосы). */
  onTotalItemsChange,
}) {
  const [gridInnerWidth, setGridInnerWidth] = useState(null);
  const [catalogScrollEl, setCatalogScrollEl] = useState(null);
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
  const [trailingToolbarEl, setTrailingToolbarEl] = useState(null);
  const [trailingToolbarW, setTrailingToolbarW] = useState(0);
  const [items, setItems] = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [addingFamily, setAddingFamily] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  /** catalog — как в каталоге Google (defaultSort) */
  const [sortMode, setSortMode] = useState('catalog');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStroke, setFilterStroke] = useState('');
  const [filterSubset, setFilterSubset] = useState('');
  /** all | variable | static */
  const [filterVariable, setFilterVariable] = useState('all');
  const [filterItalicOnly, setFilterItalicOnly] = useState(false);

  useEffect(() => {
    onTotalItemsChange?.(items.length);
  }, [items, onTotalItemsChange]);

  useLayoutEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setCatalogScrollContainer = useCallback((node) => {
    setCatalogScrollEl(node instanceof HTMLElement ? node : null);
  }, []);

  const setTrailingToolbarContainer = useCallback((node) => {
    setTrailingToolbarEl(node instanceof HTMLElement ? node : null);
  }, []);

  useLayoutEffect(() => {
    if (!trailingToolbarEl) {
      setTrailingToolbarW(0);
      return;
    }

    const measure = () => {
      const w = trailingToolbarEl.getBoundingClientRect().width;
      setTrailingToolbarW(Number.isFinite(w) ? w : 0);
    };

    measure();

    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(trailingToolbarEl);
    return () => ro.disconnect();
  }, [trailingToolbarEl]);

  const gridCols = googleFontCatalogGridCols(viewportW);
  const oneCardWidthPx =
    gridInnerWidth != null && gridInnerWidth > 0
      ? (gridInnerWidth - (gridCols - 1) * GRID_GAP_PX) / gridCols
      : null;

  const facetOptions = useMemo(() => {
    const categories = new Set();
    const strokes = new Set();
    const subsets = new Set();
    items.forEach((x) => {
      if (x.category) categories.add(x.category);
      if (x.stroke) strokes.add(x.stroke);
      (x.subsets || []).forEach((s) => subsets.add(s));
    });
    return {
      categories: [...categories].sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
      strokes: [...strokes].sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
      subsets: [...subsets].sort((a, b) => a.localeCompare(b)),
    };
  }, [items]);

  const filteredSortedItems = useMemo(() => {
    let list = items;
    if (searchQuery.trim()) {
      list = list.filter(
        (x) =>
          matchesSearch(
            [
              x.family,
              x.category,
              x.stroke,
              ...(x.subsets || []),
            ],
            searchQuery,
          ),
      );
    }
    if (filterCategory) list = list.filter((x) => x.category === filterCategory);
    if (filterStroke) list = list.filter((x) => x.stroke === filterStroke);
    if (filterSubset) list = list.filter((x) => (x.subsets || []).includes(filterSubset));
    if (filterVariable === 'variable') list = list.filter((x) => x.isVariable);
    if (filterVariable === 'static') list = list.filter((x) => !x.isVariable);
    if (filterItalicOnly) list = list.filter((x) => x.hasItalic);

    const out = [...list];
    switch (sortMode) {
      case 'name-asc':
        out.sort(compareFontFamilyName);
        break;
      case 'name-desc':
        out.sort((a, b) => compareFontFamilyName(b, a));
        break;
      case 'category':
        out.sort((a, b) => {
          const c = (a.category || '').localeCompare(b.category || '', 'ru', { sensitivity: 'base' });
          if (c !== 0) return c;
          return compareFontFamilyName(a, b);
        });
        break;
      case 'stroke':
        out.sort((a, b) => {
          const s = (a.stroke || '').localeCompare(b.stroke || '', 'ru', { sensitivity: 'base' });
          if (s !== 0) return s;
          return compareFontFamilyName(a, b);
        });
        break;
      case 'styles-desc':
        out.sort((a, b) =>
          (b.styleCount || 0) !== (a.styleCount || 0)
            ? (b.styleCount || 0) - (a.styleCount || 0)
            : compareFontFamilyName(a, b),
        );
        break;
      case 'styles-asc':
        out.sort((a, b) =>
          (a.styleCount || 0) !== (b.styleCount || 0)
            ? (a.styleCount || 0) - (b.styleCount || 0)
            : compareFontFamilyName(a, b),
        );
        break;
      case 'subsets-desc':
        out.sort((a, b) =>
          (b.subsets?.length || 0) !== (a.subsets?.length || 0)
            ? (b.subsets?.length || 0) - (a.subsets?.length || 0)
            : compareFontFamilyName(a, b),
        );
        break;
      case 'catalog':
      default:
        out.sort((a, b) => (a.defaultSort ?? 0) - (b.defaultSort ?? 0));
        break;
    }
    return out;
  }, [
    items,
    searchQuery,
    sortMode,
    filterCategory,
    filterStroke,
    filterSubset,
    filterVariable,
    filterItalicOnly,
  ]);

  const hasActiveFilters =
    !!filterCategory ||
    !!filterStroke ||
    !!filterSubset ||
    filterVariable !== 'all' ||
    filterItalicOnly;

  /** В каталоге показываем только шрифты, которых ещё нет в сессии */
  const catalogItemsNotInSession = useMemo(
    () => filteredSortedItems.filter((entry) => !isGoogleFontInSession(fonts, entry.family)),
    [filteredSortedItems, fonts],
  );

  const showFontGrid = filteredSortedItems.length > 0 && catalogItemsNotInSession.length > 0;

  useEffect(() => {
    if (!showFontGrid) setGridInnerWidth(null);
  }, [showFontGrid]);

  const clearFilters = useCallback(() => {
    setFilterCategory('');
    setFilterStroke('');
    setFilterSubset('');
    setFilterVariable('all');
    setFilterItalicOnly(false);
  }, []);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    return () => {
      removeAllGoogleFontPreviewCss();
    };
  }, []);

  /** Фон: по чуть-чуть подключаем CSS-превью для текущего отфильтрованного списка. */
  useEffect(() => {
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
  }, [filteredSortedItems]);

  const addGoogleToSession = useCallback(
    async (entry) => {
      const family = entry.family;
      if (isGoogleFontInSession(fonts, family)) {
        toast.info(`${family} уже в сессии`);
        return true;
      }
      setAddingFamily(family);
      try {
        const subsetList = Array.isArray(entry.subsets) ? entry.subsets : [];
        const googleFontRecommendedSample = hasGoogleScriptGlyphSample(entry)
          ? buildGoogleFontGlyphSampleText(entry)
          : undefined;
        const useVariable = entry.isVariable === true;
        if (useVariable) {
          const slices = await fetchGoogleVariableFontSlicesAll(family, {
            subsets: subsetList,
            ...(entry.wghtMin != null && entry.wghtMax != null
              ? { wghtMin: entry.wghtMin, wghtMax: entry.wghtMax }
              : {}),
          });
          if (!slices?.[0]?.blob?.size) throw new Error('Пустой файл');
          await handleFontsUploaded([
            {
              file: slices[0].blob,
              name: `${family}.woff2`,
              source: 'google',
              googleFontSlices: slices,
              googleFontAxesFromCatalog:
                Array.isArray(entry.axes) && entry.axes.length > 0 ? entry.axes : null,
              googleFontItalicMode:
                typeof entry.italicMode === 'string' && entry.italicMode ? entry.italicMode : 'none',
              googleFontHasItalicStyles: entry.hasItalicStyles === true,
              googleFontRecommendedSample,
            },
          ]);
        } else {
          const slices = await fetchGoogleStaticFontSlicesAll(family, {
            weight: 400,
            italic: false,
            subsets: subsetList,
          });
          if (!slices?.[0]?.blob?.size) throw new Error('Пустой файл');
          await handleFontsUploaded([
            {
              file: slices[0].blob,
              name: `${family}.woff2`,
              source: 'google',
              googleFontSlices: slices,
              googleFontItalicMode:
                typeof entry.italicMode === 'string' && entry.italicMode ? entry.italicMode : 'none',
              googleFontHasItalicStyles: entry.hasItalicStyles === true,
              googleFontRecommendedSample,
            },
          ]);
        }
        toast.success(`${family} добавлен`);
        return true;
      } catch (e) {
        console.warn('[GoogleFontsCatalogPanel]', family, e);
        toast.error(e?.message ? `${family}: ${e.message}` : `Не удалось загрузить ${family}`);
        return false;
      } finally {
        setAddingFamily(null);
      }
    },
    [fonts, handleFontsUploaded],
  );

  const googleLibraryEntry = useCallback(
    (entry) =>
      createCatalogLibraryEntry({
        source: 'google',
        key: entry.family,
        label: entry.family,
      }),
    [],
  );

  if (catalogError) {
    return <p className="text-sm text-red-600 mt-2">Каталог Google: {catalogError}</p>;
  }

  if (items.length === 0 && !catalogError) {
    return <p className="text-sm text-gray-500 mt-2">Загрузка каталога…</p>;
  }

  const countSuffix =
    filteredSortedItems.length !== catalogItemsNotInSession.length
      ? ` из ${filteredSortedItems.length}`
      : ' шт.';

  const fieldInteractive = NATIVE_SELECT_FIELD_INTERACTIVE;

  const selectClass = (placeholderMuted) => customSelectTriggerClass({ placeholderMuted });

  const toolbarAlignToGrid = oneCardWidthPx != null && viewportW >= 640;
  const twoCardWidthPx = toolbarAlignToGrid ? oneCardWidthPx * 2 + GRID_GAP_PX : null;
  const searchWidthPx =
    toolbarAlignToGrid && twoCardWidthPx != null
      ? Math.max(
          0,
          twoCardWidthPx - (trailingToolbar ? trailingToolbarW + GRID_GAP_PX : 0),
        )
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden gap-4">
      <CatalogTopToolbar
        trailingToolbar={
          trailingToolbar ? (
            <div ref={setTrailingToolbarContainer} className="flex shrink-0 items-center">
              {trailingToolbar}
            </div>
          ) : null
        }
        searchSlot={
          <Tooltip
          as="div"
          content={`${catalogItemsNotInSession.length}${countSuffix}`}
          className={
            'relative min-w-0 w-full ' +
            (toolbarAlignToGrid ? 'sm:w-auto sm:flex-none' : 'sm:flex-1')
          }
          style={
            toolbarAlignToGrid && searchWidthPx != null ? { width: searchWidthPx, maxWidth: '100%' } : undefined
          }
        >
          <input
            id="gf-catalog-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Имя, категория, группа, код набора…"
            className={`box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-32 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 ${fieldInteractive} focus:border-black/[0.14] focus:outline-none sm:pl-3 sm:pr-36`}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="absolute right-2 top-1/2 flex max-w-[55%] -translate-y-1/2 items-center gap-1.5">
            {searchQuery ? <SearchClearButton onClick={() => setSearchQuery('')} /> : null}
            <span className="pointer-events-none truncate text-right text-sm tabular-nums uppercase font-semibold text-gray-500">
              {catalogItemsNotInSession.length}
              <span className="text-gray-400">{countSuffix}</span>
            </span>
          </div>
          </Tooltip>
        }
        filtersSlot={
          <>
            <div
          className="min-w-0 w-full sm:w-auto"
          style={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
        >
          <div
            className={
              'grid grid-cols-1 gap-3 ' + (facetOptions.strokes.length > 0 ? 'sm:grid-cols-2' : '')
            }
          >
            <CustomSelect
              id="gf-filter-category"
              value={filterCategory}
              onChange={setFilterCategory}
              className={selectClass(!filterCategory)}
              aria-label="Категория"
              placeholder="Категория"
              emptyValue=""
              options={facetOptions.categories.map((c) => ({ value: c, label: c }))}
            />
            {facetOptions.strokes.length > 0 ? (
              <CustomSelect
                id="gf-filter-stroke"
                value={filterStroke}
                onChange={setFilterStroke}
                className={selectClass(!filterStroke)}
                aria-label="Группа"
                placeholder="Группа"
                emptyValue=""
                options={facetOptions.strokes.map((s) => ({ value: s, label: s }))}
              />
            ) : null}
          </div>
        </div>
            <div
          className="min-w-0 w-full sm:w-auto"
          style={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CustomSelect
              id="gf-filter-subset"
              value={filterSubset}
              onChange={setFilterSubset}
              className={selectClass(!filterSubset)}
              aria-label="Язык / набор (subset)"
              placeholder="Язык"
              emptyValue=""
              options={facetOptions.subsets.map((s) => ({
                value: s,
                label: subsetOptionLabel(s),
              }))}
            />
            <CustomSelect
              id="gf-filter-var"
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
          </>
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
              id="google-fonts-sort"
              value={sortMode}
              onChange={setSortMode}
              className={selectClass(sortMode === 'catalog')}
              aria-label="Сортировка"
              options={[
                { value: 'catalog', label: 'Популярное' },
                { value: 'name-asc', label: 'Имя: А → Я' },
                { value: 'name-desc', label: 'Имя: Я → А' },
                { value: 'category', label: 'Категория → имя' },
                { value: 'stroke', label: 'Группа начертания → имя' },
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
            className="box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm uppercase font-semibold text-gray-900 disabled:cursor-default disabled:opacity-40"
          >
            Сбросить все
          </button>
        </div>
        }
      />

      {filteredSortedItems.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm uppercase text-gray-500">
          Ничего не найдено — попробуйте другой запрос
        </p>
      ) : catalogItemsNotInSession.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm uppercase text-gray-500">
          Все шрифты из этой выдачи уже в сессии. Переключайте их во вкладках над областью просмотра
        </p>
      ) : (
        <div
          ref={setCatalogScrollContainer}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [align-content:start]"
        >
          {catalogScrollEl ? (
            <VirtualizedGlyphGrid
              scrollParentEl={catalogScrollEl}
              totalCount={catalogItemsNotInSession.length}
              estimatedRowHeightPx={172}
              columnCount={gridCols}
              rowGapPx={GRID_GAP_PX}
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
                const libraryEntry = googleLibraryEntry(entry);

                return (
                  <CatalogFontCard
                    busy={busy}
                    minHeightClass="min-h-[148px] min-w-0"
                    actions={
                      <CatalogLibraryActions
                        libraries={fontLibraries}
                        busy={busy}
                        busyIndicator={<CatalogSessionAddSpinner />}
                        onAddToSession={() => addGoogleToSession(entry)}
                        onAddFontToLibrary={onAddFontToLibrary}
                        onRequestCreateLibrary={onRequestCreateLibrary}
                        libraryEntry={libraryEntry}
                      />
                    }
                    title={family}
                    preview={
                      <div
                        className="mt-2 min-h-[1.75rem] flex-1 truncate text-[1.75rem] leading-tight text-gray-800"
                        style={{ fontFamily: `'${family}', sans-serif` }}
                      >
                        AaBbCcDdEe
                      </div>
                    }
                    footer={
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-1">
                          <span className="truncate text-[11px] uppercase font-semibold text-gray-500">{entry.category || 'Google'}</span>
                          {entry.isVariable ? (
                            <span className="shrink-0 rounded bg-gray-100 px-1 py-0 text-[10px] uppercase font-semibold text-gray-800">
                              vf
                            </span>
                          ) : null}
                          {entry.hasItalic ? (
                            <span className="shrink-0 rounded bg-gray-100 px-1 py-0 text-[10px] uppercase font-semibold text-gray-800">
                              italic
                            </span>
                          ) : null}
                        </div>
                        <Tooltip
                          as="div"
                          content="По метаданным Google Fonts: статические начертания и поднаборы символов (subsets)"
                          className="shrink-0 flex items-center justify-end gap-1.5 text-right text-[11px] uppercase font-semibold tabular-nums leading-snug text-gray-500"
                        >
                          <span className="whitespace-nowrap">
                            {entry.styleCount != null
                              ? `${entry.styleCount} ${pluralRu(entry.styleCount, 'начертание', 'начертания', 'начертаний')}`
                              : '—'}
                          </span>
                    
                          <span className="whitespace-nowrap">
                            {(() => {
                              const n = (entry.subsets && entry.subsets.length) || 0;
                              return `${n} ${pluralRu(n, 'набор', 'набора', 'наборов')}`;
                            })()}
                          </span>
                        </Tooltip>
                      </div>
                    }
                  />
                );
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
