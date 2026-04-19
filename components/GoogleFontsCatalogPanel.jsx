import React, {
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useMemo,
  useLayoutEffect,
  useRef,
} from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
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
import { NativeSelect } from './ui/NativeSelect';
import {
  NATIVE_SELECT_FIELD_INTERACTIVE,
  nativeSelectFieldClass,
} from './ui/nativeSelectFieldClasses';
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

function findLoadedGoogleFont(fonts, family) {
  return fonts.find(
    (f) =>
      f.source === 'google' &&
      (f.originalName === `${family}.woff2` || f.name === family || f.displayName === family),
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
  if (viewportWidth >= 768) return 3;
  return 2;
}

const GRID_GAP_PX = 16;

const GoogleFontGridItem = forwardRef(function GoogleFontGridItem({ children, className, ...props }, ref) {
  return (
    <div ref={ref} {...props} className={[className, 'min-h-0 min-w-0'].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
});

export default function GoogleFontsCatalogPanel({ fonts, handleFontsUploaded, trailingToolbar = null }) {
  const [gridInnerWidth, setGridInnerWidth] = useState(null);
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
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

  useLayoutEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** Сетка каталога; ширина List совпадает с карточками (учёт скроллбара списка). */
  const gridComponents = useMemo(
    () => ({
      List: forwardRef(function GoogleFontGridList({ style, className, ...props }, ref) {
        const localRef = useRef(null);
        const setRefs = (node) => {
          localRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        };
        useLayoutEffect(() => {
          const el = localRef.current;
          if (!el) return;
          const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect?.width;
            if (w != null && w > 0) setGridInnerWidth(w);
          });
          ro.observe(el);
          return () => ro.disconnect();
        }, []);
        return (
          <div
            ref={setRefs}
            {...props}
            style={style}
            className={[
              className,
              'grid w-full grid-cols-2 gap-4 pb-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 [align-content:start]',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        );
      }),
      Item: GoogleFontGridItem,
    }),
    [],
  );

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
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (x) =>
          (x.family && x.family.toLowerCase().includes(q)) ||
          (x.category && String(x.category).toLowerCase().includes(q)) ||
          (x.stroke && String(x.stroke).toLowerCase().includes(q)) ||
          (x.subsets || []).some((s) => String(s).toLowerCase().includes(q)),
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
        out.sort((a, b) => a.family.localeCompare(b.family, 'ru', { sensitivity: 'base' }));
        break;
      case 'name-desc':
        out.sort((a, b) => b.family.localeCompare(a.family, 'ru', { sensitivity: 'base' }));
        break;
      case 'category':
        out.sort((a, b) => {
          const c = (a.category || '').localeCompare(b.category || '', 'ru', { sensitivity: 'base' });
          if (c !== 0) return c;
          return a.family.localeCompare(b.family, 'ru', { sensitivity: 'base' });
        });
        break;
      case 'stroke':
        out.sort((a, b) => {
          const s = (a.stroke || '').localeCompare(b.stroke || '', 'ru', { sensitivity: 'base' });
          if (s !== 0) return s;
          return a.family.localeCompare(b.family, 'ru', { sensitivity: 'base' });
        });
        break;
      case 'styles-desc':
        out.sort((a, b) =>
          (b.styleCount || 0) !== (a.styleCount || 0)
            ? (b.styleCount || 0) - (a.styleCount || 0)
            : a.family.localeCompare(b.family, 'ru', { sensitivity: 'base' }),
        );
        break;
      case 'styles-asc':
        out.sort((a, b) =>
          (a.styleCount || 0) !== (b.styleCount || 0)
            ? (a.styleCount || 0) - (b.styleCount || 0)
            : a.family.localeCompare(b.family, 'ru', { sensitivity: 'base' }),
        );
        break;
      case 'subsets-desc':
        out.sort((a, b) =>
          (b.subsets?.length || 0) !== (a.subsets?.length || 0)
            ? (b.subsets?.length || 0) - (a.subsets?.length || 0)
            : a.family.localeCompare(b.family, 'ru', { sensitivity: 'base' }),
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
    () => filteredSortedItems.filter((entry) => !findLoadedGoogleFont(fonts, entry.family)),
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
    const CACHE_KEY = 'mops-google-fonts-catalog-v6';
    (async () => {
      try {
        try {
          const raw = sessionStorage.getItem(CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            /** Старый кэш без `axes` ломает VF UI (в woff2 только wght); обязателем массив axes у записей. */
            const ok =
              Array.isArray(parsed) &&
              parsed.length > 0 &&
              parsed[0] &&
              Array.isArray(parsed[0].subsets) &&
              parsed.some((row) => row && Array.isArray(row.axes)) &&
              Object.prototype.hasOwnProperty.call(parsed[0], 'primaryScript');
            if (ok && !cancelled) {
              setItems(parsed);
              return;
            }
            try {
              sessionStorage.removeItem(CACHE_KEY);
            } catch {
              /* ignore */
            }
          }
        } catch {
          /* загружаем заново */
        }
        const res = await fetch('/api/google-fonts-catalog');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data.items) ? data.items : [];
        if (!cancelled) {
          setItems(list);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
          } catch {
            /* квота / приватный режим */
          }
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
      if (findLoadedGoogleFont(fonts, family)) {
        toast.info(`${family} уже в сессии`);
        return;
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
              googleFontRecommendedSample,
            },
          ]);
        }
        toast.success(`${family} добавлен`);
      } catch (e) {
        console.warn('[GoogleFontsCatalogPanel]', family, e);
        toast.error(e?.message ? `${family}: ${e.message}` : `Не удалось загрузить ${family}`);
      } finally {
        setAddingFamily(null);
      }
    },
    [fonts, handleFontsUploaded],
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

  const selectClass = (placeholderMuted) => nativeSelectFieldClass({ placeholderMuted });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden gap-4">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div
          className={
            'relative min-w-0 w-full ' +
            /* sm+: ширина одной карточки по измерению сетки списка */
            (oneCardWidthPx != null && viewportW >= 640 ? 'sm:w-auto' : '')
          }
          style={
            oneCardWidthPx != null && viewportW >= 640
              ? { width: oneCardWidthPx, maxWidth: '100%' }
              : undefined
          }
        >
          <input
            id="gf-catalog-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Имя, категория, группа, код набора…"
            className={`box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-24 text-sm leading-normal text-gray-900 placeholder:text-gray-900/40 ${fieldInteractive} focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 sm:pl-3 sm:pr-28`}
            autoComplete="off"
            spellCheck={false}
          />
          <span
            className="pointer-events-none absolute top-1/2 right-2 max-w-[45%] -translate-y-1/2 truncate text-right text-xs tabular-nums text-gray-500"
            title={`${catalogItemsNotInSession.length}${countSuffix}`}
          >
            {catalogItemsNotInSession.length}
            <span className="text-gray-400">{countSuffix}</span>
          </span>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="box-border h-10 shrink-0 whitespace-nowrap rounded-md border border-transparent bg-gray-50 px-2 text-xs text-gray-900 hover:bg-gray-100"
          >
            Сбросить фильтры
          </button>
        ) : null}
        <div className="min-w-0 flex-1 sm:max-w-[12rem]">
          <NativeSelect
            id="gf-filter-category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={selectClass(!filterCategory)}
            aria-label="Категория"
          >
            <option value="">Категория</option>
            {facetOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </div>
        {facetOptions.strokes.length > 0 ? (
          <div className="min-w-0 flex-1 sm:max-w-[12rem]">
            <NativeSelect
              id="gf-filter-stroke"
              value={filterStroke}
              onChange={(e) => setFilterStroke(e.target.value)}
              className={selectClass(!filterStroke)}
              aria-label="Группа"
            >
              <option value="">Группа</option>
              {facetOptions.strokes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
        <div className="min-w-0 flex-1 sm:max-w-[12rem]">
          <NativeSelect
            id="gf-filter-subset"
            value={filterSubset}
            onChange={(e) => setFilterSubset(e.target.value)}
            className={selectClass(!filterSubset)}
            aria-label="Язык / набор (subset)"
          >
            <option value="">Язык</option>
            {facetOptions.subsets.map((s) => (
              <option key={s} value={s}>
                {subsetOptionLabel(s)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="min-w-0 flex-1 sm:max-w-[10rem]">
          <NativeSelect
            id="gf-filter-var"
            value={filterVariable}
            onChange={(e) => setFilterVariable(e.target.value)}
            className={selectClass(filterVariable === 'all')}
            aria-label="Вариативность"
          >
            <option value="all">Вариативность</option>
            <option value="variable">Вариативные</option>
            <option value="static">Статические</option>
          </NativeSelect>
        </div>
        <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-transparent bg-gray-50 px-2 text-sm text-gray-900 sm:px-3">
          <input
            type="checkbox"
            checked={filterItalicOnly}
            onChange={(e) => setFilterItalicOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-400 bg-gray-50 text-accent focus:ring-accent/40"
          />
          <span className="whitespace-nowrap">Есть курсив</span>
        </label>
        <div className="ml-auto min-w-0 sm:max-w-[14rem]">
          <NativeSelect
            id="google-fonts-sort"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className={selectClass(sortMode === 'catalog')}
            aria-label="Сортировка"
          >
            <option value="catalog">Популярное</option>
            <option value="name-asc">Имя: А → Я</option>
            <option value="name-desc">Имя: Я → А</option>
            <option value="category">Категория → имя</option>
            <option value="stroke">Группа начертания → имя</option>
            <option value="styles-desc">Больше начертаний сначала</option>
            <option value="styles-asc">Меньше начертаний сначала</option>
            <option value="subsets-desc">Больше наборов символов</option>
          </NativeSelect>
        </div>
        {trailingToolbar ? (
          <div className="flex shrink-0 items-center pl-2 sm:pl-3">{trailingToolbar}</div>
        ) : null}
      </div>

      {filteredSortedItems.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm text-gray-500">
          Ничего не найдено — попробуйте другой запрос.
        </p>
      ) : catalogItemsNotInSession.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm text-gray-500">
          Все шрифты из этой выдачи уже в сессии. Переключайте их во вкладках над областью просмотра.
        </p>
      ) : (
        <VirtuosoGrid
          className="min-h-0 flex-1"
          style={{ height: '100%' }}
          totalCount={catalogItemsNotInSession.length}
          components={gridComponents}
          rangeChanged={(range) => {
            for (let i = range.startIndex; i <= range.endIndex; i++) {
              const e = catalogItemsNotInSession[i];
              if (e) ensureGoogleFontPreviewCss(e);
            }
          }}
          itemContent={(index) => {
            const entry = catalogItemsNotInSession[index];
            if (!entry) return null;
            const family = entry.family;
            const busy = addingFamily === family;

            return (
              <div className="flex min-h-[132px] flex-col rounded-lg bg-surface-card p-4 transition-all duration-200 hover:bg-gray-50">
                <div className="truncate text-sm font-medium text-gray-800">{family}</div>
                <div
                  className="mt-2 min-h-[1.75rem] flex-1 truncate text-xl leading-tight text-gray-800"
                  style={{ fontFamily: `'${family}', sans-serif` }}
                >
                  AaBbCcDdEe
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                    <span className="truncate text-xs text-gray-500">{entry.category || 'Google'}</span>
                    {entry.isVariable ? (
                      <span className="shrink-0 rounded bg-gray-100 px-1 py-0 text-[10px] font-medium uppercase text-gray-800 mb-0.5">
                        vf
                      </span>
                    ) : null}
                    {entry.hasItalic ? (
                      <span className="shrink-0 rounded bg-gray-100 px-1 py-0 text-[10px] font-medium uppercase text-gray-400 mb-0.5">
                        italic
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    className="shrink-0 rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => addGoogleToSession(entry)}
                  >
                    {busy ? '…' : 'В сессию'}
                  </button>
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
