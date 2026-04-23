﻿ import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { VirtualizedGlyphGrid } from './ui/VirtualizedGlyphGrid';
import { toast } from '../utils/appNotify';
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
  clearGoogleFontCatalogCache,
  readGoogleFontCatalogCache,
  writeGoogleFontCatalogCache,
} from '../utils/googleFontCatalogCache';
import {
  createCatalogLibraryEntry,
  isGoogleFontInSession,
} from '../utils/fontLibraryUtils';
import { processLocalFont } from '../utils/localFontProcessor';
import { compareFontFamilyName } from '../utils/fontSort';
import { createZipBlob } from '../utils/zipUtils';
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
  malayalam: 'Малайялам',
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

function GoogleCatalogEmptyLoader() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-8">
      <HexProgressLoader size={64} className="shrink-0" />
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
const CARD_LONG_PRESS_MS = 220;

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

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function isInteractiveTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, label, [role="button"], [data-no-card-select="true"]',
    ),
  );
}

export default function GoogleFontsCatalogPanel({
  fonts,
  handleFontsUploaded,
  fontLibraries = [],
  onAddFontToLibrary,
  onRequestCreateLibrary,
  onOpenInEditor,
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
    gridCols,
    oneCardWidthPx,
    toolbarAlignToGrid,
  } = useCatalogToolbarLayout({
    trailingToolbar,
    gridGapPx: GRID_GAP_PX,
    gridColsResolver: googleFontCatalogGridCols,
    autoMeasureGridWidth: true,
  });
  const [items, setItems] = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [addingFamily, setAddingFamily] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  /** catalog — как в каталоге Google (defaultSort) */
  const [sortMode, setSortMode] = useState('catalog');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubset, setFilterSubset] = useState('');
  /** all | variable | static */
  const [filterVariable, setFilterVariable] = useState('all');
  const [filterItalicOnly, setFilterItalicOnly] = useState(false);
  const [gridViewMode, setGridViewMode] = useState('grid');
  const [selectedFamilies, setSelectedFamilies] = useState(() => new Set());
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    onTotalItemsChange?.(items.length);
  }, [items, onTotalItemsChange]);

  const facetOptions = useMemo(() => {
    const categories = new Set();
    const subsets = new Set();
    items.forEach((x) => {
      if (x.category) categories.add(x.category);
      (x.subsets || []).forEach((s) => subsets.add(s));
    });
    return {
      categories: [...categories].sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' })),
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
    filterSubset,
    filterVariable,
    filterItalicOnly,
  ]);

  const hasActiveFilters =
    !!filterCategory ||
    !!filterSubset ||
    filterVariable !== 'all' ||
    filterItalicOnly;

  /** В каталоге показываем только шрифты, которых ещё нет в сессии */
  const catalogItemsNotInSession = useMemo(
    () => filteredSortedItems.filter((entry) => !isGoogleFontInSession(fonts, entry.family)),
    [filteredSortedItems, fonts],
  );

  const showFontGrid = filteredSortedItems.length > 0 && catalogItemsNotInSession.length > 0;

  const clearFilters = useCallback(() => {
    setFilterCategory('');
    setFilterSubset('');
    setFilterVariable('all');
    setFilterItalicOnly(false);
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

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

  /** Фон: постепенно подключаем CSS-превью для текущего отфильтрованного списка. */
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

  useEffect(() => {
    const visibleFamilies = new Set(catalogItemsNotInSession.map((entry) => entry.family));
    setSelectedFamilies((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set();
      prev.forEach((family) => {
        if (visibleFamilies.has(family)) next.add(family);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [catalogItemsNotInSession]);

  const toggleSelectedFamily = useCallback((family) => {
    setSelectedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });
  }, []);

  const startCardLongPress = useCallback(
    (event, family) => {
      if (isInteractiveTarget(event.target)) return;
      clearLongPressTimer();
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        toggleSelectedFamily(family);
      }, CARD_LONG_PRESS_MS);
    },
    [clearLongPressTimer, toggleSelectedFamily],
  );

  const onCardClick = useCallback(
    (event, family) => {
      if (isInteractiveTarget(event.target)) return;
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        event.preventDefault();
        return;
      }
      if (selectedFamilies.size > 0) {
        event.preventDefault();
        toggleSelectedFamily(family);
      }
    },
    [selectedFamilies.size, toggleSelectedFamily],
  );

  const openGoogleInEditor = useCallback(
    async (entry) => {
      if (typeof onOpenInEditor !== 'function') return;
      const family = entry?.family;
      if (!family) return;
      setAddingFamily(family);
      try {
        const subsetList = Array.isArray(entry.subsets) ? entry.subsets : [];
        const useVariable = entry.isVariable === true;
        const slices = useVariable
          ? await fetchGoogleVariableFontSlicesAll(family, {
              subsets: subsetList,
              ...(entry.wghtMin != null && entry.wghtMax != null
                ? { wghtMin: entry.wghtMin, wghtMax: entry.wghtMax }
                : {}),
            })
          : await fetchGoogleStaticFontSlicesAll(family, {
              weight: 400,
              italic: false,
              subsets: subsetList,
            });
        const firstSlice = Array.isArray(slices) ? slices.find((slice) => slice?.blob?.size > 0) : null;
        if (!firstSlice?.blob) throw new Error('Пустой файл');
        const previewFont = await processLocalFont({
          file: firstSlice.blob,
          name: `${family}.woff2`,
          source: 'google',
          googleFontSlices: slices,
          googleFontAxesFromCatalog:
            Array.isArray(entry.axes) && entry.axes.length > 0 ? entry.axes : null,
          googleFontItalicMode:
            typeof entry.italicMode === 'string' && entry.italicMode ? entry.italicMode : 'none',
          googleFontHasItalicStyles: entry.hasItalicStyles === true,
        });
        if (!previewFont) throw new Error('Не удалось подготовить превью');
        await onOpenInEditor(previewFont);
      } catch (error) {
        toast.error(`Не удалось открыть ${family} в редакторе`);
      } finally {
        setAddingFamily(null);
      }
    },
    [onOpenInEditor],
  );

  const getGoogleSlicesForDownload = useCallback(async (entry) => {
    const family = entry?.family;
    if (!family) return [];
    const subsetList = Array.isArray(entry.subsets) ? entry.subsets : [];
    const useVariable = entry.isVariable === true;
    const slices = useVariable
      ? await fetchGoogleVariableFontSlicesAll(family, {
          subsets: subsetList,
          ...(entry.wghtMin != null && entry.wghtMax != null
            ? { wghtMin: entry.wghtMin, wghtMax: entry.wghtMax }
            : {}),
        })
      : await fetchGoogleStaticFontSlicesAll(family, {
          weight: 400,
          italic: false,
          subsets: subsetList,
        });
    return Array.isArray(slices) ? slices.filter((slice) => slice?.blob?.size > 0) : [];
  }, []);

  const fetchGoogleVariableTtfBlob = useCallback(async (family) => {
    const response = await fetch(`/api/google-font-github-vf?family=${encodeURIComponent(family)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob || blob.size === 0) throw new Error('Пустой файл');
    return blob;
  }, []);

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

  const downloadGoogleCurrentWoff2 = useCallback(async (entry, { silent = false } = {}) => {
    const family = entry?.family;
    if (!family) return false;
    try {
      const slices = await getGoogleSlicesForDownload(entry);
      const firstSlice = slices[0] || null;
      if (!firstSlice?.blob) throw new Error('Пустой файл');
      const baseName = buildSafeFileBase(family, 'google-font');
      const fileName = `${baseName}${entry?.isVariable ? '-variable' : ''}.woff2`;
      saveBlobAsFile(firstSlice.blob, fileName);
      if (!silent) toast.success(`Скачан ${family}`);
      return true;
    } catch (error) {
      toast.error(`Не удалось скачать ${family}`);
      return false;
    }
  }, [getGoogleSlicesForDownload]);

  const downloadGoogleAsFormat = useCallback(async (entry, format, { silent = false } = {}) => {
    const family = entry?.family;
    if (!family) return false;
    const targetFormat = String(format || 'woff2').toLowerCase();
    try {
      const slices = await getGoogleSlicesForDownload(entry);
      const firstSlice = slices[0] || null;
      if (!firstSlice?.blob) throw new Error('Пустой файл');
      const converted = await convertBlobToFormat(firstSlice.blob, targetFormat);
      const baseName = buildSafeFileBase(family, 'google-font');
      saveBlobAsFile(converted, `${baseName}.${targetFormat}`);
      if (!silent) toast.success(`Скачан ${family} (${targetFormat.toUpperCase()})`);
      return true;
    } catch (error) {
      if (!silent) toast.error(`Не удалось конвертировать ${family} в ${targetFormat.toUpperCase()}`);
      return false;
    }
  }, [convertBlobToFormat, getGoogleSlicesForDownload]);

  const downloadGoogleVariableVariant = useCallback(async (entry, { silent = false } = {}) => {
    const family = entry?.family;
    if (!family || entry?.isVariable !== true) return false;
    try {
      const blob = await fetchGoogleVariableTtfBlob(family);
      const baseName = buildSafeFileBase(family, 'google-font');
      saveBlobAsFile(blob, `${baseName}-variable.ttf`);
      if (!silent) toast.success(`Скачан Variable ${family}`);
      return true;
    } catch (error) {
      if (!silent) toast.error(`Не удалось скачать Variable ${family}`);
      return false;
    }
  }, [fetchGoogleVariableTtfBlob]);

  const downloadGooglePackageZip = useCallback(async (entry, { silent = false } = {}) => {
    const family = entry?.family;
    if (!family) return false;
    try {
      const baseName = buildSafeFileBase(family, 'google-font');
      const slices = await getGoogleSlicesForDownload(entry);
      if (slices.length === 0) throw new Error('Нет файлов для упаковки');
      const files = slices.map((slice, index) => ({
        name: `${baseName}/web/${baseName}-${slice.style || 'normal'}-${slice.weight || 400}-${index + 1}.woff2`,
        data: slice.blob,
      }));
      if (entry?.isVariable === true) {
        try {
          const variableBlob = await fetchGoogleVariableTtfBlob(family);
          files.push({ name: `${baseName}/source/${baseName}-variable.ttf`, data: variableBlob });
        } catch {
          // optional source file
        }
      }
      const zipBlob = await createZipBlob(files);
      saveBlobAsFile(zipBlob, `${baseName}-package.zip`);
      if (!silent) toast.success(`Скачан пакет ${family}`);
      return true;
    } catch (error) {
      if (!silent) toast.error(`Не удалось собрать пакет ${family}`);
      return false;
    }
  }, [fetchGoogleVariableTtfBlob, getGoogleSlicesForDownload]);

  const downloadSelectedGoogle = useCallback(async () => {
    const selected = catalogItemsNotInSession.filter((entry) => selectedFamilies.has(entry.family));
    if (selected.length === 0) return;
    if (selected.length > 1) {
      const files = [];
      const usedNames = new Set();
      for (const entry of selected) {
        const family = entry?.family;
        if (!family) continue;
        try {
          // eslint-disable-next-line no-await-in-loop
          const slices = await getGoogleSlicesForDownload(entry);
          const baseName = buildSafeFileBase(family, 'google-font');
          if (slices.length === 0) continue;
          const packageFiles = slices.map((slice, index) => ({
            name: `${baseName}/web/${baseName}-${slice.style || 'normal'}-${slice.weight || 400}-${index + 1}.woff2`,
            data: slice.blob,
          }));
          if (entry?.isVariable === true) {
            try {
              // eslint-disable-next-line no-await-in-loop
              const variableBlob = await fetchGoogleVariableTtfBlob(family);
              packageFiles.push({ name: `${baseName}/source/${baseName}-variable.ttf`, data: variableBlob });
            } catch {
              // optional source file
            }
          }
          // eslint-disable-next-line no-await-in-loop
          const packageZipBlob = await createZipBlob(packageFiles);
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
        saveBlobAsFile(archiveBlob, `google-selected-${stamp}.zip`);
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
  }, [catalogItemsNotInSession, downloadGooglePackageZip, selectedFamilies]);

  const downloadSelectedGoogleAsFormat = useCallback(async (format) => {
    const selected = catalogItemsNotInSession.filter((entry) => selectedFamilies.has(entry.family));
    if (selected.length === 0) return;
    const targetFormat = String(format || 'woff2').toLowerCase();
    if (selected.length > 1) {
      const files = [];
      const usedNames = new Set();
      for (const entry of selected) {
        const family = entry?.family;
        if (!family) continue;
        try {
          // eslint-disable-next-line no-await-in-loop
          const slices = await getGoogleSlicesForDownload(entry);
          const firstSlice = slices[0] || null;
          if (!firstSlice?.blob) continue;
          const outBlob =
            targetFormat === 'woff2'
              ? firstSlice.blob
              : // eslint-disable-next-line no-await-in-loop
                await convertBlobToFormat(firstSlice.blob, targetFormat);
          const baseName = buildSafeFileBase(family, 'google-font');
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
        saveBlobAsFile(archiveBlob, `google-selected-${targetFormat}-${stamp}.zip`);
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
  }, [catalogItemsNotInSession, convertBlobToFormat, createZipBlob, downloadGoogleAsFormat, getGoogleSlicesForDownload, selectedFamilies, fetchGoogleVariableTtfBlob]);

  useEffect(() => {
    if (typeof onSelectionActionsChange !== 'function') return;
    if (!isActive) return;
    onSelectionActionsChange({
      selectedCount: selectedFamilies.size,
      downloadSelected: downloadSelectedGoogle,
      downloadSelectedAsFormat: downloadSelectedGoogleAsFormat,
    });
    return () => onSelectionActionsChange(null);
  }, [downloadSelectedGoogle, downloadSelectedGoogleAsFormat, isActive, onSelectionActionsChange, selectedFamilies.size]);

  const googleLibraryEntry = useCallback(
    (entry) =>
      createCatalogLibraryEntry({
        source: 'google',
        key: entry.family,
        label: entry.family,
      }),
    [],
  );

  const countSuffix =
    filteredSortedItems.length !== catalogItemsNotInSession.length
      ? ` из ${filteredSortedItems.length}`
      : ' шт.';

  const fieldInteractive = NATIVE_SELECT_FIELD_INTERACTIVE;
  const halfCardWidthPx = toolbarAlignToGrid && oneCardWidthPx != null ? oneCardWidthPx / 2 : null;

  const selectClass = (placeholderMuted) => customSelectTriggerClass({ placeholderMuted });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden gap-4">
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
            id="gf-catalog-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Имя, категория, код набора…"
            count={catalogItemsNotInSession.length}
            countSuffix={countSuffix}
            inputInteractiveClassName={fieldInteractive}
            onFocusChange={setIsSearchFocused}
          />
        }
        primaryFiltersControl={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        }
        secondaryFiltersControl={
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
              { value: 'catalog', label: 'Популярное' },
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
              className="box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm uppercase font-semibold text-accent disabled:cursor-default disabled:opacity-40 disabled:text-gray-900"
            >
              Сбросить все
            </button>
            <CatalogGridModeToggle value={gridViewMode} onChange={setGridViewMode} />
          </div>
        }
      />

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
        <div
          ref={setCatalogScrollContainer}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [align-content:start]"
        >
          {catalogScrollEl ? (
            <VirtualizedGlyphGrid
              scrollParentEl={catalogScrollEl}
              totalCount={catalogItemsNotInSession.length}
              estimatedRowHeightPx={gridViewMode === 'row' ? 176 : 172}
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
                const libraryEntry = googleLibraryEntry(entry);
                const isRowMode = gridViewMode === 'row';
                const styleCount = Number(entry?.styleCount) || 0;
                const subsetCount = Array.isArray(entry?.subsets) ? entry.subsets.length : 0;
                const languageCount = subsetCount;

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
                    onOpen={() => void openGoogleInEditor(entry)}
                    openAriaLabel={`Открыть ${family} в редакторе`}
                    downloadButtonProps={{
                      primaryLabel: 'Скачать',
                      primaryAriaLabel: `Скачать пакет ${family}`,
                      onPrimaryClick: () => void downloadGooglePackageZip(entry),
                      menuItems: [
                        {
                          key: 'zip',
                          label: 'ZIP (по умолчанию)',
                          onSelect: () => void downloadGooglePackageZip(entry),
                        },
                        {
                          key: 'ttf',
                          label: 'TTF',
                          onSelect: () => void downloadGoogleAsFormat(entry, 'ttf'),
                        },
                        {
                          key: 'otf',
                          label: 'OTF',
                          onSelect: () => void downloadGoogleAsFormat(entry, 'otf'),
                        },
                        {
                          key: 'woff',
                          label: 'WOFF',
                          onSelect: () => void downloadGoogleAsFormat(entry, 'woff'),
                        },
                        {
                          key: 'current-woff2',
                          label: 'WOFF2',
                          onSelect: () => void downloadGoogleAsFormat(entry, 'woff2'),
                        },
                        {
                          key: 'variable',
                          label: 'Variable вариант',
                          hidden: entry.isVariable !== true,
                          onSelect: () => void downloadGoogleVariableVariant(entry),
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
                    onAddToSession={() => addGoogleToSession(entry)}
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
                        entry.category || 'Google',
                        entry.isVariable ? 'vf' : null,
                        entry.hasItalic ? 'italic' : null,
                        `${languageCount} ${pluralRu(languageCount, 'язык', 'языка', 'языков')}`,
                        subsetCount > 0
                          ? `${subsetCount} ${pluralRu(subsetCount, 'набор', 'набора', 'наборов')}`
                          : null,
                        `${styleCount} ${pluralRu(styleCount, 'начертание', 'начертания', 'начертаний')}`,
                      ]}
                      previewFamily={`'${family}', sans-serif`}
                      previewText={family}
                      selected={selectedFamilies.has(family)}
                      busy={busy}
                      actions={actions}
                      selectionOverlay={selectionOverlay}
                      hoverOverlay={hoverOverlay}
                      onClick={(event) => onCardClick(event, family)}
                      onPointerDown={(event) => startCardLongPress(event, family)}
                      onPointerUp={clearLongPressTimer}
                      onPointerLeave={clearLongPressTimer}
                      onPointerCancel={clearLongPressTimer}
                    />
                  ) : (
                    <CatalogFontCard
                    selected={selectedFamilies.has(family)}
                    onClick={(event) => onCardClick(event, family)}
                    onPointerDown={(event) => startCardLongPress(event, family)}
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
                    
                          {((entry.subsets && entry.subsets.length) || 0) > 0 ? (
                            <span className="whitespace-nowrap">
                              {(() => {
                                const n = (entry.subsets && entry.subsets.length) || 0;
                                return `${n} ${pluralRu(n, 'набор', 'набора', 'наборов')}`;
                              })()}
                            </span>
                          ) : null}
                        </Tooltip>
                      </div>
                    }
                  />
                  )
                );
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
