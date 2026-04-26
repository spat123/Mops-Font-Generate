import React, { useCallback, useMemo, useRef, useEffect, useState, lazy, Suspense } from 'react';
import FontUploader from './FontUploader';
import { EditorStatusBar } from './ui/EditorStatusBar';
import { Tooltip } from './ui/Tooltip';
import { toast } from '../utils/appNotify';
import { useSettings } from '../contexts/SettingsContext';
import dynamic from 'next/dynamic';
import { fetchGoogleVariableFontSlicesAll } from '../utils/googleFontLoader';
import { GOOGLE_PRESET_FONT_NAMES } from '../utils/googlePresetFonts';
import { getPreviewAreaBackgroundStyle } from '../utils/previewAreaBackgroundStyle';
import { getStylesPreviewStats } from '../utils/stylesPreviewModel';
import { readGoogleFontCatalogCache } from '../utils/googleFontCatalogCache';
import { readFontsourceCatalogCache } from '../utils/fontsourceCatalogCache';
import { formatCatalogUnionAvailabilityShort, getCatalogUnionStats } from '../utils/catalogUnionStats';
import { ensureGoogleFontPreviewCss } from '../utils/googleFontPreviewCss';
import { matchesSearch } from '../utils/searchMatching';
import { SearchClearButton } from './ui/SearchClearButton';
import { CatalogFontCard } from './ui/CatalogFontCard';
import { NATIVE_SELECT_FIELD_INTERACTIVE } from './ui/nativeSelectFieldClasses';
import { SearchIcon } from './ui/CommonIcons';
import { IconCircleButton } from './ui/IconCircleButton';
import { FontLibraryStatusMenu } from './ui/FontLibraryStatusMenu';
import { createCatalogLibraryEntry, getLibrarySourceLabel, normalizeLibraryText } from '../utils/fontLibraryUtils';
import { HexProgressLoader } from './ui/HexProgressLoader';
import { PreviewEditTextHint } from './ui/PreviewEditTextHint';

// --- Ленивая загрузка компонентов режимов ---
const PlainTextMode = lazy(() => import('./PlainTextMode'));
const WaterfallMode = dynamic(() => import('./WaterfallMode'), { suspense: true });
const StylesMode = lazy(() => import('./StylesMode'));
const GlyphsMode = lazy(() => import('./GlyphsMode'));
const TextMode = lazy(() => import('./TextMode'));
// --- Конец ленивой загрузки ---

const EMPTY_STATE_GOOGLE_RESULTS_LIMIT = 8;

function resolvePreviewJustifyContent(verticalAlignment) {
  return verticalAlignment === 'middle'
    ? 'center'
    : verticalAlignment === 'bottom'
      ? 'flex-end'
      : 'flex-start';
}

function resolvePreviewAlignItems(textAlignment) {
  return textAlignment === 'center'
    ? 'center'
    : textAlignment === 'right'
      ? 'flex-end'
      : 'stretch';
}

function getEmptyStateSearchLayoutClasses(isActive) {
  return {
    viewportClassName: isActive ? 'items-center justify-start pt-8' : 'items-center justify-center',
    widthClassName: isActive ? 'max-w-6xl py-8' : 'max-w-md py-8',
    innerClassName: isActive ? 'max-w-5xl text-left' : 'max-w-md text-center',
    stickyClassName: isActive ? 'sticky top-0 bg-white py-1' : '',
    barJustifyClassName: isActive ? 'w-full justify-start' : 'justify-center',
    searchWrapClassName: isActive ? 'min-w-0 flex-1 opacity-100' : 'max-w-0 opacity-0',
    toggleAriaLabel: isActive ? 'Закрыть поиск' : 'Открыть поиск',
  };
}

const MODE_LOADING_FALLBACK = (
  <div className="flex items-center justify-center p-8">
    <HexProgressLoader size={52} className="shrink-0" />
  </div>
);

export default function FontPreview({
  selectedFont,
  variableSettings, 
  exportedFont, 
  handleFontsUploaded,
  /** Fallback: Fontsource, если Google недоступен */
  selectOrAddFontsourceFont,
  handleScreenshotClick,
  getFontFamily,
  getVariationSettings,
  fontCssProperties,
  /** Во время анимации осей VF в Waterfall не делаем N x forced reflow на каждый кадр */
  isVariableFontAnimating = false,
  /** Полноэкранный plain-превью (тулбар «Превью») */
  plainPreviewOpen = false,
  onClosePlainPreview,
  fontLibraries = [],
  onMoveFontToLibrary,
  onRequestCreateLibrary,
  currentWaterfallBaseSize = null,
}) {
  const { 
    text,
    fontSize, 
    lineHeight, 
    letterSpacing, 
    textColor, 
    backgroundColor, 
    viewMode,
    textDirection, 
    textAlignment, 
    textCase,
    textDecoration,
    textColumns,
    textColumnGap,
    waterfallRows,
    waterfallBaseSize,
    waterfallScaleRatio,
    waterfallRoundPx,
    verticalAlignment,
    textFill,
    previewBackgroundImage,
  } = useSettings();

  /** Общий скролл области превью; Glyphs подписывается на этот узел для виртуализации */
  const previewBodyScrollRef = useRef(null);
  const emptyStateSearchWrapRef = useRef(null);

  const [glyphFooterCount, setGlyphFooterCount] = useState(null);
  const [presetSearchQuery, setPresetSearchQuery] = useState('');
  const [isEmptyStateSearchExpanded, setIsEmptyStateSearchExpanded] = useState(false);
  const [googleCatalogEntries, setGoogleCatalogEntries] = useState([]);
  const emptyStateSearchInputRef = useRef(null);

  useEffect(() => {
    if (viewMode !== 'glyphs') setGlyphFooterCount(null);
  }, [viewMode]);

  useEffect(() => {
    if (selectedFont || typeof window === 'undefined') return;
    setGoogleCatalogEntries(readGoogleFontCatalogCache());
  }, [selectedFont]);

  const styleValues = useMemo(() => {
    const letterSpacingValue = `${(letterSpacing / 100) * 0.5}em`; 
    const lineHeightValue = lineHeight; 
    
    // Используем fontCssProperties для корректных weight/style
    const fontStyleValue = fontCssProperties?.fontStyle || 'normal';
    const fontWeightValue = fontCssProperties?.fontWeight || 400;

    return {
      letterSpacingValue,
      lineHeightValue,
      fontStyleValue,
      fontWeightValue
    };
  }, [letterSpacing, lineHeight, fontCssProperties?.fontWeight, fontCssProperties?.fontStyle, fontCssProperties?.fontFamily]);
  
  const { letterSpacingValue, lineHeightValue, fontStyleValue, fontWeightValue } = styleValues;
  
  // Без rvrn/rclt часть VF/Google-сабсетов может рвано рендериться и уходить в fallback.
  const featureSettingsValue = useMemo(() => {
    return '"calt", "liga", "rlig", "kern"';
  }, []);
  
  // Должно совпадать с useFontCss.fontCssProperties, иначе превью обходило хук.
  const fontFamilyValue = useMemo(() => {
    if (selectedFont) {
      const family = getFontFamily(selectedFont);
      return family === 'inherit' ? 'inherit' : `${family}, ui-sans-serif, system-ui, sans-serif`;
    }
    return getFontFamily(selectedFont);
  }, [selectedFont, getFontFamily]);
  
  const variationSettingsValue = useMemo(() => {
    return getVariationSettings(selectedFont, variableSettings);
  }, [selectedFont, variableSettings, getVariationSettings]);

  const displayText = useMemo(() => {
    return text || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  }, [text]);

  /** Первое семейство из стека (без fallback) для document.fonts.load */
  const primaryFontFamilyForLoad = useMemo(() => {
    if (!fontFamilyValue || fontFamilyValue === 'inherit') return '';
    return fontFamilyValue.split(',')[0].trim();
  }, [fontFamilyValue]);

  // Ждём реальной подгрузки глифов под текущий текст, чтобы не было смеси с fallback.
  useEffect(() => {
    let cancelled = false;
    if (!selectedFont || !primaryFontFamilyForLoad || typeof document === 'undefined') return;
    if (!document.fonts || typeof document.fonts.load !== 'function') return;

    const sample = displayText.length > 500 ? displayText.slice(0, 500) : displayText;
    const spec = `${fontSize}px ${primaryFontFamilyForLoad}`;

    (async () => {
      try {
        await document.fonts.load(spec, sample);
      } catch {
        /* ignore */
      }
      if (cancelled) return;
      requestAnimationFrame(() => {
        document.querySelectorAll('.editable-sync-plain').forEach((el) => {
          void el.offsetHeight;
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedFont?.id,
    primaryFontFamilyForLoad,
    fontSize,
    displayText,
    variationSettingsValue,
  ]);

  const baseTextStyle = useMemo(() => {
    const styles = {
      fontFamily: fontFamilyValue,
      fontSize: `${fontSize}px`, 
      letterSpacing: letterSpacingValue,
      lineHeight: lineHeightValue,
      color: textColor, 
      fontFeatureSettings: featureSettingsValue,
      direction: textDirection, 
      textAlign: textAlignment, 
      textTransform: textCase, 
      textDecorationLine: textDecoration === 'none' ? 'none' : textDecoration,
    };
    
    if (selectedFont?.isVariableFont) {
      // Берём напрямую variableSettings, иначе при смене осей useMemo мог отставать.
      if (variationSettingsValue && variationSettingsValue !== 'normal') {
        styles.fontVariationSettings = variationSettingsValue;
      }
      if (fontStyleValue && fontStyleValue !== 'normal') {
        styles.fontStyle = fontStyleValue;
      }
    } else {
      // Для НЕвариативных шрифтов используем font-weight и font-style
      styles.fontStyle = fontStyleValue;
      styles.fontWeight = fontWeightValue;
    }
    
    return styles;
  }, [
    fontFamilyValue, fontSize, letterSpacingValue, fontStyleValue, fontWeightValue, 
    lineHeightValue, textColor, featureSettingsValue, selectedFont,
    variationSettingsValue,
    textDirection, textAlignment, textCase, textDecoration
  ]);
  
  const previewAreaBgStyle = useMemo(
    () => getPreviewAreaBackgroundStyle(backgroundColor, previewBackgroundImage),
    [backgroundColor, previewBackgroundImage],
  );

  const containerStyle = useMemo(() => {
    const base = {
      backgroundColor: previewBackgroundImage ? 'transparent' : backgroundColor,
    };
    if (textFill) {
      return {
        ...base,
        width: '100%',
        height: '100%',
      };
    }
    return {
      ...base,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      justifyContent: resolvePreviewJustifyContent(verticalAlignment),
      alignItems: 'stretch',
    };
  }, [backgroundColor, verticalAlignment, textFill, previewBackgroundImage]);
  
  const contentStyle = useMemo(() => {
    return {
      ...baseTextStyle,
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      ...(textFill
        ? {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: resolvePreviewJustifyContent(verticalAlignment),
            alignItems: resolvePreviewAlignItems(textAlignment),
          }
        : {
            maxWidth: '100%',
            ...(Number(textColumns) > 1
              ? {
                  columnCount: Number(textColumns),
                  columnGap: `${Number(textColumnGap) || 24}px`,
                }
              : {}),
          }),
    };
  }, [baseTextStyle, textFill, verticalAlignment, textAlignment, textColumns, textColumnGap]);

  const glyphDisplayStyle = useMemo(() => {
    if (selectedFont?.isVariableFont) {
      const fvs =
        variationSettingsValue && variationSettingsValue !== 'normal' ? variationSettingsValue : null;
      return {
        ...(fvs ? { fontVariationSettings: fvs } : {}),
        ...(fontStyleValue && fontStyleValue !== 'normal' ? { fontStyle: fontStyleValue } : {}),
        color: textColor,
      };
    } else {
      // Для НЕвариативных шрифтов используем font-weight и font-style
      return {
        fontStyle: fontStyleValue,
        fontWeight: fontWeightValue,
        color: textColor,
      };
    }
  }, [fontStyleValue, fontWeightValue, selectedFont, variationSettingsValue, textColor]);

  const loadPresetFont = useCallback(async (fontName) => {
    try {
      const slices = await fetchGoogleVariableFontSlicesAll(fontName);
      if (!slices?.[0]?.blob?.size) {
        throw new Error('Пустой файл шрифта');
      }
      await handleFontsUploaded([
        {
          file: slices[0].blob,
          name: `${fontName}.woff2`,
          source: 'google',
          googleFontSlices: slices,
        },
      ]);
    } catch (e) {
      console.warn('[FontPreview] Google Fonts, fallback Fontsource:', fontName, e);
      if (typeof selectOrAddFontsourceFont === 'function') {
        try {
          await selectOrAddFontsourceFont(fontName, false);
          toast.info(`Google недоступен, загружен Fontsource: ${fontName}`);
        } catch (e2) {
          console.error('[FontPreview] Fontsource:', fontName, e2);
          toast.error(`Не удалось загрузить ${fontName}`);
        }
      } else {
        toast.error(`Не удалось загрузить ${fontName} с Google Fonts`);
      }
    }
  }, [handleFontsUploaded, selectOrAddFontsourceFont]);
  
  const presetFonts = useMemo(() => [...GOOGLE_PRESET_FONT_NAMES], []);
  const filteredPresetFonts = useMemo(() => {
    if (!presetSearchQuery.trim()) return presetFonts;
    return presetFonts.filter((fontName) => matchesSearch([fontName], presetSearchQuery));
  }, [presetFonts, presetSearchQuery]);
  const emptyStateSearchQuery = presetSearchQuery.trim();
  const emptyStateSearchActive = isEmptyStateSearchExpanded || emptyStateSearchQuery.length > 0;
  const emptyStateLayout = useMemo(
    () => getEmptyStateSearchLayoutClasses(emptyStateSearchActive),
    [emptyStateSearchActive],
  );

  useEffect(() => {
    if (!emptyStateSearchActive || typeof window === 'undefined') return;

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setPresetSearchQuery('');
      setIsEmptyStateSearchExpanded(false);
      emptyStateSearchInputRef.current?.blur();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [emptyStateSearchActive]);

  const emptyStateSearchFieldClass = `box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-10 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 ${NATIVE_SELECT_FIELD_INTERACTIVE} focus:border-black/[0.14] focus:outline-none sm:pl-3`;
  const filteredGoogleCatalogResults = useMemo(() => {
    if (!emptyStateSearchQuery) return [];
    return googleCatalogEntries
      .filter((entry) => entry?.family && entry.isVariable)
      .filter((entry) =>
        matchesSearch(
          [
            entry.family,
            entry.category,
            entry.primaryScript,
            ...(Array.isArray(entry.subsets) ? entry.subsets : []),
          ],
          emptyStateSearchQuery,
        ),
      )
      .slice(0, EMPTY_STATE_GOOGLE_RESULTS_LIMIT);
  }, [googleCatalogEntries, emptyStateSearchQuery]);

  useEffect(() => {
    filteredGoogleCatalogResults.forEach((entry) => ensureGoogleFontPreviewCss(entry));
  }, [filteredGoogleCatalogResults]);
  
  const effectiveWaterfallSizes = useMemo(() => {
    const n = Math.max(1, Math.min(40, Math.round(Number(waterfallRows) || 20)));
    const ratioRaw = Number(waterfallScaleRatio);
    const ratio = Number.isFinite(ratioRaw) ? ratioRaw : 1.25;
    const hasLiveWaterfallBaseSize =
      currentWaterfallBaseSize !== null &&
      currentWaterfallBaseSize !== undefined &&
      Number.isFinite(Number(currentWaterfallBaseSize));
    const baseRaw = hasLiveWaterfallBaseSize
      ? Number(currentWaterfallBaseSize)
      : Number(waterfallBaseSize);
    const startPx = Number.isFinite(baseRaw) ? Math.max(1, Math.round(baseRaw)) : 160;
    const roundPx = waterfallRoundPx !== false;
    const roundTo3 = (x) => Math.round(x * 1000) / 1000;
    if (ratio <= 1.0001) {
      const fallback = [
        160, 144, 128, 112, 96, 80, 72, 64, 56, 48, 40, 36, 32, 28, 24, 20, 18, 16, 14, 12,
      ];
      return fallback.slice(0, n);
    }
    const out = [];
    let prev = Infinity;
    for (let i = 0; i < n; i++) {
      const pxFloat = startPx / Math.pow(ratio, i);
      let px = roundPx ? Math.round(pxFloat) : roundTo3(pxFloat);
      if (!Number.isFinite(px) || px < 0.001) px = roundPx ? 1 : 0.001;
      if (px >= prev) px = roundPx ? Math.max(1, prev - 1) : Math.max(0.001, prev - 0.001);
      out.push(px);
      prev = px;
      if (prev <= (roundPx ? 1 : 0.001)) break;
    }
    while (out.length < n) out.push(roundPx ? 1 : 0.001);
    return out;
  }, [currentWaterfallBaseSize, waterfallRows, waterfallScaleRatio, waterfallBaseSize, waterfallRoundPx]);
  
  const plainCharCount = useMemo(() => [...String(text ?? '')].length, [text]);

  const stylesPreviewStats = useMemo(
    () => getStylesPreviewStats(selectedFont),
    [selectedFont],
  );

  const bottomBarModeHint = useMemo(() => {
    switch (viewMode) {
      case 'plain':
      case 'text':
        return `символов: ${plainCharCount}`;
      case 'waterfall':
        return `Рядов: ${effectiveWaterfallSizes.length}`;
      case 'glyphs':
        if (selectedFont?.source === 'google') return 'Глифы недоступны (Google)';
        if (glyphFooterCount === null) return 'Глифы: загрузка…';
        return `Глифов: ${glyphFooterCount}`;
      case 'styles':
        if (stylesPreviewStats.kind === 'static' && stylesPreviewStats.n > 0) {
          return `Статических стилей: ${stylesPreviewStats.n}`;
        }
        if (stylesPreviewStats.kind === 'variable' && stylesPreviewStats.n > 0) {
          return `Вариативных превью: ${stylesPreviewStats.n}`;
        }
        return 'Стили: не определены';
      default:
        return null;
    }
  }, [
    viewMode,
    plainCharCount,
    effectiveWaterfallSizes.length,
    selectedFont?.source,
    glyphFooterCount,
    stylesPreviewStats,
  ]);

  const handleGlyphCountForFooter = useCallback((n) => {
    setGlyphFooterCount(n);
  }, []);

  useEffect(() => {
    if (!plainPreviewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [plainPreviewOpen]);

  useEffect(() => {
    if (!plainPreviewOpen || typeof onClosePlainPreview !== 'function') return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClosePlainPreview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plainPreviewOpen, onClosePlainPreview]);

  const previewFontLabel = useMemo(() => {
    return exportedFont
      ? exportedFont.name.replace(/-static$/, '')
      : selectedFont?.name ||
          selectedFont?.family ||
          (selectedFont?.fontFamily && selectedFont?.source !== 'google'
            ? selectedFont.fontFamily
            : 'Шрифт');
  }, [exportedFont, selectedFont]);

  const previewSourceLabel = useMemo(() => {
    const source = String(selectedFont?.source || '').trim();
    if (source === 'local') return 'Локальный';
    if (source === 'google') return 'Google';
    if (source === 'fontsource') return 'Fontsource';
    return getLibrarySourceLabel(source);
  }, [selectedFont?.source]);

  const previewWeightValue = useMemo(() => {
    const weight = Number(selectedFont?.currentWeight);
    return Number.isFinite(weight) ? Math.round(weight) : null;
  }, [selectedFont?.currentWeight]);

  const showVariableBadge = Boolean(selectedFont?.isVariableFont);
  const showItalicBadge = fontStyleValue === 'italic' || selectedFont?.currentStyle === 'italic';

  const statusLibraryEntry = useMemo(() => {
    if (!selectedFont) return null;
    const label = selectedFont.displayName || selectedFont.fontFamily || selectedFont.name || 'Шрифт';
    const candidateLabels = Array.from(
      new Set(
        [
          selectedFont.displayName,
          selectedFont.fontFamily,
          selectedFont.name,
          label,
        ]
          .map((value) =>
            normalizeLibraryText(String(value || ''))
              .replace(/\.woff2$/i, '')
              .replace(/\s+variable$/i, '')
              .trim(),
          )
          .filter(Boolean),
      ),
    );
    if (selectedFont.source === 'google') {
      const family = normalizeLibraryText(
        selectedFont.fontFamily || selectedFont.displayName || selectedFont.name || '',
      )
        .replace(/\.woff2$/i, '')
        .replace(/\s+variable$/i, '')
        .trim();
      if (!family) return null;
      const entry = createCatalogLibraryEntry({ source: 'google', key: family, label: family });
      if (!entry) return null;
      return {
        ...entry,
        candidateIds: [`google:${family}`],
        candidateLabels: Array.from(new Set([family, ...candidateLabels])),
      };
    }
    if (selectedFont.source === 'fontsource') {
      const key = String(selectedFont.name || selectedFont.displayName || selectedFont.id || '').trim();
      const familyLabel = normalizeLibraryText(
        selectedFont.displayName || selectedFont.fontFamily || selectedFont.name || '',
      )
        .replace(/\s+variable$/i, '')
        .trim();
      if (!key) return null;
      const entry = createCatalogLibraryEntry({
        source: 'fontsource',
        key,
        label: familyLabel || key,
        isVariable: selectedFont.isVariableFont === true,
      });
      if (!entry) return null;
      return {
        ...entry,
        candidateIds: [`fontsource:${key}`],
        candidateLabels: Array.from(new Set([familyLabel || key, ...candidateLabels])),
      };
    }
    const fallbackId = String(selectedFont.id || selectedFont.name || label).trim();
    if (!fallbackId) return null;
    return {
      id: `session:${fallbackId}`,
      label,
      source: String(selectedFont.source || 'session'),
      candidateIds: Array.from(
        new Set(
          [
            selectedFont.id,
            selectedFont.name,
            selectedFont.displayName,
            fallbackId,
          ]
            .map((value) => String(value || '').trim())
            .filter(Boolean)
            .map((value) => `session:${value}`),
        ),
      ),
      candidateLabels,
    };
  }, [selectedFont]);

  const clearEmptyStateSearch = useCallback(() => {
    setPresetSearchQuery('');
    setIsEmptyStateSearchExpanded(false);
    emptyStateSearchInputRef.current?.blur();
  }, []);

  const openEmptyStateSearch = useCallback(() => {
    setIsEmptyStateSearchExpanded(true);
    requestAnimationFrame(() => {
      emptyStateSearchInputRef.current?.focus();
    });
  }, []);

  const handleEmptyStateSearchBlur = useCallback(
    (event) => {
      const nextFocusedElement = event.relatedTarget;
      if (
        nextFocusedElement &&
        emptyStateSearchWrapRef.current instanceof HTMLElement &&
        emptyStateSearchWrapRef.current.contains(nextFocusedElement)
      ) {
        return;
      }
      if (!presetSearchQuery.trim()) {
        setIsEmptyStateSearchExpanded(false);
      }
    },
    [presetSearchQuery],
  );

  if (!selectedFont) {
    const googleListForStats =
      googleCatalogEntries.length > 0 ? googleCatalogEntries : readGoogleFontCatalogCache();
    const catalogStats = getCatalogUnionStats(googleListForStats, readFontsourceCatalogCache());
    const emptyLeading =
      emptyStateSearchQuery.trim().length > 0
        ? `Найдено: ${filteredGoogleCatalogResults.length}`
        : catalogStats.googleTotal + catalogStats.fontsourceTotal > 0
          ? formatCatalogUnionAvailabilityShort(catalogStats)
          : 'Шрифт не выбран';

    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-white">
        <div
          className={`flex w-full min-h-0 flex-1 flex-col overflow-y-auto ${
            /* flex-col: cross axis = горизонталь -> items-center по центру; main = вертикаль -> justify-start к верху как раньше */
            emptyStateLayout.viewportClassName
          }`}
        >
        <div
          className={`w-full px-6 ${emptyStateLayout.widthClassName}`}
        >
          <div
            className={`mx-auto ${emptyStateLayout.innerClassName}`}
          >
            <div
              ref={emptyStateSearchWrapRef}
              className={`z-20 min-h-10 ${emptyStateLayout.stickyClassName} flex items-center gap-3 ${emptyStateLayout.barJustifyClassName}`}
            >
              <IconCircleButton
                variant="searchToggle"
                size="md"
                pressed={emptyStateSearchActive}
                className="focus:outline-none"
                onClick={emptyStateSearchActive ? clearEmptyStateSearch : openEmptyStateSearch}
                aria-label={emptyStateLayout.toggleAriaLabel}
              >
                {emptyStateSearchActive ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <SearchIcon className="h-5 w-5" />
                )}
              </IconCircleButton>
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${emptyStateLayout.searchWrapClassName}`}
              >
                <div className="relative">
                  <input
                    ref={emptyStateSearchInputRef}
                    type="search"
                    value={presetSearchQuery}
                    onFocus={() => setIsEmptyStateSearchExpanded(true)}
                    onBlur={handleEmptyStateSearchBlur}
                    onChange={(e) => setPresetSearchQuery(e.target.value)}
                    placeholder="Поиск шрифта Google"
                    className={emptyStateSearchFieldClass}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {presetSearchQuery ? (
                    <SearchClearButton
                      onClick={clearEmptyStateSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative mt-6">
              <div
                className={`${
                  emptyStateSearchActive
                    ? 'pointer-events-none absolute inset-x-0 top-0 opacity-0'
                    : 'relative opacity-100'
                }`}
              >
                <h2 className="mb-4 text-2xl font-bold uppercase text-gray-900">Загрузите шрифт для начала работы</h2>
                <p className="mb-6 text-gray-600">Перетащите шрифт или нажмите на область</p>
                <div className="mb-8">
                  <FontUploader onFontsUploaded={handleFontsUploaded} />
                </div>
                {filteredPresetFonts.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {filteredPresetFonts.map((fontName) => (
                      <button
                        key={fontName}
                        onClick={() => loadPresetFont(fontName)}
                        type="button"
                        className="rounded-md border border-gray-200 bg-white px-4 py-3 font-sans font-medium text-gray-800 transition-all duration-200 hover:border-black/[0.9] hover:bg-black/[0.9] hover:text-white"
                      >
                        {fontName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">Ничего не найдено. Попробуйте другой запрос.</p>
                )}
              </div>
            </div>

            {emptyStateSearchActive ? (
              <div className="mt-4">
                {emptyStateSearchQuery ? (
                  filteredGoogleCatalogResults.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredGoogleCatalogResults.map((entry) => (
                        <button
                          key={entry.family}
                          type="button"
                          onClick={() => loadPresetFont(entry.family)}
                          className="w-full text-left"
                        >
                          <CatalogFontCard
                            className="min-h-[148px]"
                            title={entry.family}
                            preview={
                              <div
                                className="mt-2 min-h-[1.75rem] flex-1 truncate text-[1.75rem] leading-tight text-gray-800"
                                style={{ fontFamily: `'${entry.family}', sans-serif` }}
                              >
                                AaBbCcDdEe
                              </div>
                            }
                            footer={
                              <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                  <span className="truncate text-xs font-semibold uppercase text-gray-800">
                                    {entry.category || 'Google'}
                                  </span>
                                  {entry.isVariable ? (
                                    <span className="shrink-0 text-xs font-semibold uppercase text-gray-800">
                                      vf
                                    </span>
                                  ) : null}
                                  {entry.hasItalic ? (
                                    <span className="shrink-0 text-xs font-semibold uppercase text-gray-800">
                                      italic
                                    </span>
                                  ) : null}
                                </div>
                                <span className="text-xs font-semibold uppercase text-gray-800">
                                  Google
                                </span>
                              </div>
                            }
                          />
                        </button>
                      ))}
                    </div>
                  ) : googleCatalogEntries.length > 0 ? (
                    <p className="py-6 text-center text-sm uppercase text-gray-500">
                      Ничего не найдено. Попробуйте другой запрос.
                    </p>
                  ) : (
                    <p className="py-6 text-center text-sm uppercase text-gray-500">
                      Кэш каталога Google пока пуст. Откройте вкладку Google Fonts, и поиск здесь сразу начнет показывать карточки.
                    </p>
                  )
                ) : (
                  <p className="py-6 text-center text-sm uppercase text-gray-500">
                    Начните вводить название шрифта, и здесь появятся карточки из каталога Google.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
        </div>
        <EditorStatusBar
          leading={emptyLeading}
          center={<span className="truncate">Новая вкладка</span>}
        />
      </div>
    );
  }

  return (
    <>
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col bg-white">
      <div
        ref={previewBodyScrollRef}
        className="relative min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto pt-0 pb-4"
        style={previewAreaBgStyle}
      >
        <div className="grid min-h-full min-w-0 w-full grid-rows-[1fr_auto]">
          <div className="min-h-0 min-w-0">
          {viewMode === 'plain' && (
            <Suspense fallback={MODE_LOADING_FALLBACK}>
              <PlainTextMode
                containerStyle={containerStyle}
                contentStyle={contentStyle}
                variant="default"
              />
            </Suspense>
          )}
          
          {viewMode === 'waterfall' && (
            <Suspense fallback={MODE_LOADING_FALLBACK}>
              <WaterfallMode
                waterfallSizes={effectiveWaterfallSizes}
                scrollParentRef={previewBodyScrollRef}
                isVariableFontAnimating={isVariableFontAnimating}
                isInteractingWithWaterfallSize={
                  currentWaterfallBaseSize !== null && currentWaterfallBaseSize !== undefined
                }
              />
            </Suspense>
          )}
          
          {viewMode === 'styles' && (
            <Suspense fallback={MODE_LOADING_FALLBACK}>
              <StylesMode
                selectedFont={selectedFont}
                fontFamilyValue={fontFamilyValue}
              />
            </Suspense>
          )}

          {viewMode === 'glyphs' && (
            <Suspense fallback={MODE_LOADING_FALLBACK}>
              <GlyphsMode
                key={`${selectedFont?.id}-${viewMode === 'glyphs'}`}
                selectedFont={selectedFont}
                fontFamily={fontFamilyValue}
                glyphDisplayStyle={glyphDisplayStyle}
                isActive={viewMode === 'glyphs'}
                scrollParentRef={previewBodyScrollRef}
                onDisplayableGlyphCountChange={handleGlyphCountForFooter}
              />
            </Suspense>
          )}

          {viewMode === 'text' && (
            <Suspense fallback={MODE_LOADING_FALLBACK}>
              <TextMode
                contentStyle={contentStyle}
                fontFamily={fontFamilyValue}
                variationSettingsValue={variationSettingsValue}
              />
            </Suspense>
          )}
          </div>

          {viewMode === 'plain' ||
          viewMode === 'waterfall' ||
          viewMode === 'styles' ||
          viewMode === 'glyphs' ||
          viewMode === 'text' ? (
            <PreviewEditTextHint className="pb-3" />
          ) : null}
        </div>
      </div>

      <EditorStatusBar
        leading={bottomBarModeHint}
        center={
          selectedFont ? (
            <div className="flex items-center justify-center gap-2">
              <span className="truncate">{previewFontLabel}</span>
              <span>{previewSourceLabel}</span>
              {showVariableBadge ? (
                <Tooltip content="Variable Font" className="pointer-events-auto">
                  <span>VF</span>
                </Tooltip>
              ) : null}
              {previewWeightValue !== null ? (
                <Tooltip content="Font-weight" className="pointer-events-auto">
                  <span>{previewWeightValue}</span>
                </Tooltip>
              ) : null}
              {showItalicBadge ? <span>Italic</span> : null}
            </div>
          ) : null
        }
        beforeTrailing={
          <FontLibraryStatusMenu
            libraries={fontLibraries}
            libraryEntry={statusLibraryEntry}
            onMoveToLibrary={onMoveFontToLibrary}
            onCreateLibrary={onRequestCreateLibrary}
          />
        }
      />
    </div>

    {plainPreviewOpen && typeof onClosePlainPreview === 'function' && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Полноэкранное превью plain-текста"
        className="fixed inset-0 z-[220] flex flex-col"
        style={previewAreaBgStyle}
      >
        <div className="flex shrink-0 items-center justify-end bg-white/95 px-3 py-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={onClosePlainPreview}
            className="rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100"
          >
            Закрыть
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto" style={previewAreaBgStyle}>
          <Suspense fallback={MODE_LOADING_FALLBACK}>
            <PlainTextMode
              containerStyle={containerStyle}
              contentStyle={contentStyle}
              variant="fullscreen"
            />
          </Suspense>
        </div>
      </div>
    )}
    </>
  );
} 
