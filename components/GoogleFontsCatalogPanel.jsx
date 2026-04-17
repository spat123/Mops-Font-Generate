import React, { useEffect, useState, useCallback, forwardRef, useMemo } from 'react';
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

/** Сетка как у «Загруженных»: те же breakpoints и gap */
const gridComponents = {
  List: forwardRef(function GoogleFontGridList({ style, className, ...props }, ref) {
    return (
      <div
        ref={ref}
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
  Item: forwardRef(function GoogleFontGridItem({ children, className, ...props }, ref) {
    return (
      <div ref={ref} {...props} className={[className, 'min-h-0 min-w-0'].filter(Boolean).join(' ')}>
        {children}
      </div>
    );
  }),
};

export default function GoogleFontsCatalogPanel({
  fonts,
  selectedFont,
  safeSelectFont,
  removeFont,
  handleFontsUploaded,
  setActiveTab,
}) {
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden gap-2">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск: имя, категория, группа, код набора…"
          className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 sm:max-w-md"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 hover:bg-gray-50"
            >
              Сбросить фильтры
            </button>
          ) : null}
          <span className="whitespace-nowrap text-xs text-gray-500">{filteredSortedItems.length} шт.</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[11rem]">
          <label htmlFor="gf-filter-category" className="text-xs font-medium text-gray-600">
            Категория
          </label>
          <select
            id="gf-filter-category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800"
          >
            <option value="">Все</option>
            {facetOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {facetOptions.strokes.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[11rem]">
            <label htmlFor="gf-filter-stroke" className="text-xs font-medium text-gray-600">
              Группа / тип начертания
            </label>
            <select
              id="gf-filter-stroke"
              value={filterStroke}
              onChange={(e) => setFilterStroke(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800"
            >
              <option value="">Все</option>
              {facetOptions.strokes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[14rem]">
          <label htmlFor="gf-filter-subset" className="text-xs font-medium text-gray-600">
            Язык / набор (subset)
          </label>
          <select
            id="gf-filter-subset"
            value={filterSubset}
            onChange={(e) => setFilterSubset(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800"
          >
            <option value="">Любой</option>
            {facetOptions.subsets.map((s) => (
              <option key={s} value={s}>
                {subsetOptionLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[10rem]">
          <label htmlFor="gf-filter-var" className="text-xs font-medium text-gray-600">
            Вариативность
          </label>
          <select
            id="gf-filter-var"
            value={filterVariable}
            onChange={(e) => setFilterVariable(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800"
          >
            <option value="all">Все</option>
            <option value="variable">Вариативные</option>
            <option value="static">Статические</option>
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-0.5 text-sm text-gray-800 sm:pb-1">
          <input
            type="checkbox"
            checked={filterItalicOnly}
            onChange={(e) => setFilterItalicOnly(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
          />
          <span className="whitespace-nowrap">Есть курсив</span>
        </label>
        <div className="ml-auto flex min-w-0 flex-col gap-1 sm:max-w-[14rem]">
          <label htmlFor="google-fonts-sort" className="text-xs font-medium text-gray-600">
            Сортировка
          </label>
          <select
            id="google-fonts-sort"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <option value="catalog">Популярность (каталог Google)</option>
            <option value="name-asc">Имя: А → Я</option>
            <option value="name-desc">Имя: Я → А</option>
            <option value="category">Категория → имя</option>
            <option value="stroke">Группа начертания → имя</option>
            <option value="styles-desc">Больше начертаний сначала</option>
            <option value="styles-asc">Меньше начертаний сначала</option>
            <option value="subsets-desc">Больше наборов символов</option>
          </select>
        </div>
      </div>

      {filteredSortedItems.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm text-gray-500">
          Ничего не найдено — попробуйте другой запрос.
        </p>
      ) : (
        <VirtuosoGrid
          className="min-h-0 flex-1"
          style={{ height: '100%' }}
          totalCount={filteredSortedItems.length}
          components={gridComponents}
          rangeChanged={(range) => {
            for (let i = range.startIndex; i <= range.endIndex; i++) {
              const e = filteredSortedItems[i];
              if (e) ensureGoogleFontPreviewCss(e);
            }
          }}
          itemContent={(index) => {
            const entry = filteredSortedItems[index];
            if (!entry) return null;
          const family = entry.family;
          const loaded = findLoadedGoogleFont(fonts, family);
          const isChosen = loaded && selectedFont === loaded;
          const busy = addingFamily === family;

          if (loaded) {
            return (
              <div
                className={`relative flex min-h-[132px] cursor-pointer flex-col rounded-lg border p-4 transition-all duration-200 ${
                  isChosen
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                }`}
                onClick={() => {
                  safeSelectFont(loaded);
                  setActiveTab('preview');
                }}
              >
                <div className="truncate text-sm font-medium">{loaded.displayName || family}</div>
                <div
                  className="mt-2 min-h-[1.75rem] truncate text-xl leading-tight"
                  style={{ fontFamily: `'${family}', sans-serif` }}
                >
                  AaBbCcDdEe
                </div>
                <div className="mt-auto pt-1 text-xs text-gray-500">Google Font · в сессии</div>
                <button
                  type="button"
                  className="absolute right-2 top-2 text-gray-400 transition-colors hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFont(loaded.id);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          }

          return (
            <div className="flex min-h-[132px] flex-col rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:border-blue-200">
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
                    <span className="shrink-0 rounded bg-blue-100 px-1 py-0 text-[10px] font-medium uppercase text-blue-800">
                      var
                    </span>
                  ) : null}
                  {entry.hasItalic ? (
                    <span className="shrink-0 rounded bg-gray-200 px-1 py-0 text-[10px] text-gray-700">italic</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="shrink-0 rounded border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
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
