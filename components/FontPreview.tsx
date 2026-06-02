import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useEffect,
  useState,
  lazy,
  Suspense,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
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
import { readFontshareCatalogCache } from '../utils/fontshareCatalogCache';
import { readFontfabricTrialCatalogCache } from '../utils/fontfabricTrialCatalogCache';
import { formatUnifiedCatalogAvailabilityShort, getUnifiedCatalogStats } from '../utils/catalogUnionStats';
import { ensureGoogleFontPreviewCss } from '../utils/googleFontPreviewCss';
import { matchesCatalogFontSearch, matchesSearch } from '../utils/searchMatching';
import { SearchClearButton } from './ui/SearchClearButton';
import { CatalogCardHoverOverlay } from './catalog/CatalogCardHoverOverlay';
import { CatalogFontCard } from './catalog/CatalogFontCard';
import { getFontCategoryLabelRu } from '../utils/fontCategoryLabels';
import { pluralRu } from '../utils/pluralRu';
import { NATIVE_SELECT_FIELD_INTERACTIVE } from './ui/nativeSelectFieldClasses';
import { SearchIcon } from './ui/CommonIcons';
import { IconCircleButton } from './ui/IconCircleButton';
import { AppButton } from './ui/AppButton';
import { FontLibraryStatusMenu } from './ui/FontLibraryStatusMenu';
import { CatalogLibraryActions } from './catalog/CatalogLibraryActions';
import { buildFontFeatureSettingsCss } from '../utils/openTypeFeatureSettings';
import { fontStyleDbg } from '../utils/fontStyleDebugLog';
import { buildCatalogDownloadButtonProps } from './catalog/buildCatalogDownloadButtonProps';
import { createCatalogLibraryEntry, getLibrarySourceLabel, normalizeLibraryText } from '../utils/fontLibraryUtils';
import { resolvePreferredLibraryPickerEntry } from '@/utils/libraryPickerCatalogSearch';
import type { SavedLibraryFontEntry } from '../types/savedLibrary';
import { resolveSessionFontDisplayLabel } from '../utils/fontSlug';
import { getFontSubsetLabelRu } from '../utils/fontSubsetLabels';
import { HexProgressLoader } from './ui/HexProgressLoader';
import { PreviewEditTextHint } from './ui/PreviewEditTextHint';
import { PreviewModeDock } from './ui/PreviewModeDock';
import { isInteractiveTarget } from '../utils/dom/isInteractiveTarget';
import { useLongPressMultiSelect } from './ui/useLongPressMultiSelect';
import { useSelectionActionsEffect } from './ui/useSelectionActionsEffect';
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
import { GLYPH_COUNT_UNAVAILABLE } from './GlyphsMode';
import { shouldApplyCssWeightStyleForFont } from '../utils/fontUtilsCommon';
import { EmptyStateAboutSection, EmptyStateAboutToggle } from './emptyState/EmptyStateAboutSection';

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

const EMPTY_STATE_CATALOG_WIDTH_CLASS = 'mx-auto w-full max-w-[min(100%,90rem)]';

function getEmptyStateSearchLayoutClasses(isActive) {
  return {
    viewportClassName: isActive ? 'items-center justify-start pt-6' : 'items-center justify-start',
    widthClassName: isActive ? 'w-full py-8' : 'max-w-md min-h-[calc(100vh-7rem)] py-8 flex flex-col justify-center',
    innerClassName: isActive ? 'text-left' : 'text-center',
    catalogWidthClassName: EMPTY_STATE_CATALOG_WIDTH_CLASS,
    stickyClassName: isActive ? 'sticky top-0 z-20 bg-white py-2' : '',
    barJustifyClassName: isActive ? 'w-full justify-start' : 'justify-center',
    searchWrapClassName: isActive ? 'min-w-0 flex-1 opacity-100' : 'max-w-0 opacity-0',
    toggleAriaLabel: isActive ? 'Закрыть поиск' : 'Открыть поиск',
  };
}

const MODE_LOADING_FALLBACK = (
  <div className="flex h-full min-h-full w-full items-center justify-center p-8">
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
  onSelectionActionsChange,
  selectionActionsActive = false,
  currentWaterfallBaseSize = null,
  openGoogleCatalogEntryInEditorTab = null,
}) {
  const { 
    text,
    fontSize, 
    lineHeight, 
    letterSpacing, 
    openTypeFeatureOverrides,
    textColor, 
    backgroundColor, 
    viewMode,
    setViewMode,
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
  const fullscreenScrollRef = useRef(null);
  const emptyStateScrollRef = useRef(null);
  const emptyStateSearchWrapRef = useRef(null);
  const emptyStateAboutRef = useRef(null);
  const closeEmptyStateSeoTimeoutRef = useRef(null);
  const emptyStateSeoAnimationFrameRef = useRef(null);

  const [glyphFooterCount, setGlyphFooterCount] = useState(null);
  const [presetSearchQuery, setPresetSearchQuery] = useState('');
  const [isEmptyStateSearchExpanded, setIsEmptyStateSearchExpanded] = useState(false);
  const [emptyStateSeoOpen, setEmptyStateSeoOpen] = useState(false);
  const [emptyStateSeoAnimating, setEmptyStateSeoAnimating] = useState(false);
  const [googleCatalogEntries, setGoogleCatalogEntries] = useState([]);
  const [hasEverMountedStylesMode, setHasEverMountedStylesMode] = useState(false);
  const [hasEverMountedGlyphsMode, setHasEverMountedGlyphsMode] = useState(false);
  const [hasEverMountedWaterfallMode, setHasEverMountedWaterfallMode] = useState(false);
  /** После входа в plain fullscreen крестик слегка гаснет; по hover/focus снова виден */
  const [plainFullscreenCloseDimmed, setPlainFullscreenCloseDimmed] = useState(false);
  const emptyStateSearchInputRef = useRef(null);

  useEffect(
    () => () => {
      if (closeEmptyStateSeoTimeoutRef.current !== null) {
        window.clearTimeout(closeEmptyStateSeoTimeoutRef.current);
      }
      if (emptyStateSeoAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(emptyStateSeoAnimationFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (viewMode !== 'glyphs') setGlyphFooterCount(null);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'glyphs' && selectedFont?.source === 'google') {
      setGlyphFooterCount(GLYPH_COUNT_UNAVAILABLE);
    }
  }, [viewMode, selectedFont?.source, selectedFont?.id]);

  useEffect(() => {
    if (viewMode === 'styles') setHasEverMountedStylesMode(true);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'glyphs') setHasEverMountedGlyphsMode(true);
    if (viewMode === 'waterfall') setHasEverMountedWaterfallMode(true);
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

    const out = {
      letterSpacingValue,
      lineHeightValue,
      fontStyleValue,
      fontWeightValue
    };
    fontStyleDbg('FontPreview styleValues', {
      fontId: selectedFont?.id,
      source: selectedFont?.source,
      isVariable: Boolean(selectedFont?.isVariableFont),
      currentWeight: selectedFont?.currentWeight,
      currentStyle: selectedFont?.currentStyle,
      fontCssProperties,
      out,
    });
    return out;
  }, [letterSpacing, lineHeight, fontCssProperties?.fontWeight, fontCssProperties?.fontStyle, fontCssProperties?.fontFamily, selectedFont?.id, selectedFont?.source, selectedFont?.isVariableFont, selectedFont?.currentWeight, selectedFont?.currentStyle]);
  
  const { letterSpacingValue, lineHeightValue, fontStyleValue, fontWeightValue } = styleValues;
  
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

  // Лог “эффективного” стиля превью (что реально применится в DOM).
  useEffect(() => {
    fontStyleDbg('FontPreview effective preview style', {
      fontId: selectedFont?.id,
      source: selectedFont?.source,
      displayName: selectedFont?.displayName,
      name: selectedFont?.name,
      isVariable: Boolean(selectedFont?.isVariableFont),
      currentWeight: selectedFont?.currentWeight,
      currentStyle: selectedFont?.currentStyle,
      activeSubset: (selectedFont as any)?.activeSubset,
      variableSettings,
      applied: {
        fontFamily: fontFamilyValue,
        fontWeight: fontWeightValue,
        fontStyle: fontStyleValue,
        fontVariationSettings: variationSettingsValue,
      },
    });
  }, [
    selectedFont?.id,
    selectedFont?.source,
    selectedFont?.displayName,
    selectedFont?.name,
    selectedFont?.isVariableFont,
    selectedFont?.currentWeight,
    selectedFont?.currentStyle,
    (selectedFont as any)?.activeSubset,
    fontFamilyValue,
    fontWeightValue,
    fontStyleValue,
    variationSettingsValue,
    variableSettings,
  ]);

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
          if (el instanceof HTMLElement) void el.offsetHeight;
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

  const baseTextStyle = useMemo((): CSSProperties => {
    const styles: CSSProperties = {
      fontFamily: fontFamilyValue,
      fontSize: `${fontSize}px`, 
      letterSpacing: letterSpacingValue,
      lineHeight: lineHeightValue,
      color: textColor,
      fontFeatureSettings: buildFontFeatureSettingsCss(openTypeFeatureOverrides),
      direction: textDirection as CSSProperties['direction'],
      textAlign: textAlignment as CSSProperties['textAlign'], 
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
      styles.fontWeight = fontWeightValue;
    } else if (shouldApplyCssWeightStyleForFont(selectedFont)) {
      styles.fontStyle = fontStyleValue;
      styles.fontWeight = fontWeightValue;
    }
    
    return styles as CSSProperties;
  }, [
    fontFamilyValue, fontSize, letterSpacingValue, fontStyleValue, fontWeightValue, 
    lineHeightValue, textColor, selectedFont,
    variationSettingsValue,
    openTypeFeatureOverrides,
    textDirection, textAlignment, textCase, textDecoration
  ]);
  
  const previewAreaBgStyle = useMemo(
    () => getPreviewAreaBackgroundStyle(backgroundColor, previewBackgroundImage),
    [backgroundColor, previewBackgroundImage],
  );

  const containerStyle = useMemo((): CSSProperties => {
    const base = {
      backgroundColor: previewBackgroundImage ? 'transparent' : backgroundColor,
    };
    if (textFill) {
      return {
        ...base,
        width: '100%',
        height: '100%',
      } as CSSProperties;
    }
    return {
      ...base,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      justifyContent: resolvePreviewJustifyContent(verticalAlignment),
      alignItems: 'stretch',
    } as CSSProperties;
  }, [backgroundColor, verticalAlignment, textFill, previewBackgroundImage]);
  
  const contentStyle = useMemo((): CSSProperties => {
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
    } as CSSProperties;
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
    } else if (shouldApplyCssWeightStyleForFont(selectedFont)) {
      return {
        fontStyle: fontStyleValue,
        fontWeight: fontWeightValue,
        color: textColor,
      };
    }
    return { color: textColor };
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
        matchesCatalogFontSearch(
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
  const {
    selectedKeys: selectedQuickSearchFamilies,
    setSelectedKeys: setSelectedQuickSearchFamilies,
    startLongPress: startQuickSearchLongPress,
    onCardClick: onQuickSearchCardClick,
    clearLongPressTimer: clearQuickSearchLongPressTimer,
    pruneSelection: pruneQuickSearchSelection,
  } = useLongPressMultiSelect({ longPressMs: 220, isInteractiveTarget });

  useEffect(() => {
    pruneQuickSearchSelection(
      new Set(
        filteredGoogleCatalogResults
          .map((entry) => String(entry?.family || '').trim())
          .filter(Boolean),
      ),
    );
  }, [filteredGoogleCatalogResults, pruneQuickSearchSelection]);

  const selectedQuickSearchEntries = useMemo(
    () =>
      filteredGoogleCatalogResults.filter((entry) =>
        selectedQuickSearchFamilies.has(String(entry?.family || '').trim()),
      ),
    [filteredGoogleCatalogResults, selectedQuickSearchFamilies],
  );

  const downloadSelectedQuickSearch = useCallback(async () => {
    const selected = selectedQuickSearchEntries.filter((entry) => String(entry?.family || '').trim());
    if (selected.length === 0) return false;
    if (selected.length > 1) {
      const files = await buildSelectionArchiveEntries(selected, (entry) =>
        buildGooglePackageArchiveEntry(entry),
      );
      if (files.length === 0) {
        toast.error('Не удалось собрать архив выделенных шрифтов');
        return false;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const archiveBlob = await buildArchiveBlobFromEntries(files);
      saveArchiveBlob(archiveBlob, `quick-search-selected-${stamp}.zip`);
      toast.success(
        files.length === 1
          ? 'Скачан 1 шрифт в архиве'
          : `Скачано ${files.length} шрифтов в одном архиве`,
      );
      setSelectedQuickSearchFamilies(new Set());
      return true;
    }
    const [entry] = selected;
    const ok = await downloadGooglePackageZip(entry, { silent: true });
    if (ok) {
      toast.success(`Скачан ${entry.family}`);
      setSelectedQuickSearchFamilies(new Set());
    }
    return ok;
  }, [selectedQuickSearchEntries, setSelectedQuickSearchFamilies]);

  const downloadSelectedQuickSearchAsFormat = useCallback(
    async (format) => {
      const selected = selectedQuickSearchEntries.filter((entry) => String(entry?.family || '').trim());
      if (selected.length === 0) return false;
      const targetFormat = String(format || 'woff2').toLowerCase();
      if (selected.length > 1) {
        const files = await buildSelectionArchiveEntries(selected, (entry) =>
          buildGoogleFormatArchiveEntry(entry, targetFormat),
        );
        if (files.length === 0) {
          toast.error(`Не удалось собрать архив ${targetFormat.toUpperCase()}`);
          return false;
        }
        const stamp = new Date().toISOString().slice(0, 10);
        const archiveBlob = await buildArchiveBlobFromEntries(files);
        saveArchiveBlob(archiveBlob, `quick-search-selected-${targetFormat}-${stamp}.zip`);
        toast.success(
          files.length === 1
            ? `Скачан 1 шрифт (${targetFormat.toUpperCase()}) в архиве`
            : `Скачано ${files.length} шрифтов (${targetFormat.toUpperCase()}) в одном архиве`,
        );
        setSelectedQuickSearchFamilies(new Set());
        return true;
      }
      const [entry] = selected;
      const ok = await downloadGoogleAsFormat(entry, targetFormat, { silent: true });
      if (ok) {
        toast.success(`Скачан ${entry.family} (${targetFormat.toUpperCase()})`);
        setSelectedQuickSearchFamilies(new Set());
      }
      return ok;
    },
    [selectedQuickSearchEntries, setSelectedQuickSearchFamilies],
  );

  const moveSelectedQuickSearch = useCallback(
    async (targetLibraryId) => {
      if (!targetLibraryId || typeof onMoveFontToLibrary !== 'function') return false;
      const selected = selectedQuickSearchEntries.filter((entry) => String(entry?.family || '').trim());
      if (selected.length === 0) return false;
      let movedCount = 0;
      for (const entry of selected) {
        const family = String(entry?.family || '').trim();
        if (!family) continue;
        const libraryEntry = createCatalogLibraryEntry({
          source: 'google',
          key: family,
          label: family,
        });
        if (!libraryEntry) continue;
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve(onMoveFontToLibrary(targetLibraryId, libraryEntry));
        movedCount += 1;
      }
      if (movedCount > 0) {
        setSelectedQuickSearchFamilies(new Set());
        return true;
      }
      return false;
    },
    [onMoveFontToLibrary, selectedQuickSearchEntries, setSelectedQuickSearchFamilies],
  );

  const createLibraryFromSelectedQuickSearch = useCallback(() => {
    if (typeof onRequestCreateLibrary !== 'function') return false;
    const entries = selectedQuickSearchEntries
      .map((entry) =>
        createCatalogLibraryEntry({
          source: 'google',
          key: entry?.family,
          label: entry?.family,
        }),
      )
      .filter(Boolean);
    if (entries.length === 0) return false;
    onRequestCreateLibrary(entries);
    return true;
  }, [onRequestCreateLibrary, selectedQuickSearchEntries]);

  useSelectionActionsEffect({
    isActive: Boolean(selectionActionsActive) && !selectedFont,
    onSelectionActionsChange,
    selectedCount: selectedQuickSearchFamilies.size,
    downloadSelected: downloadSelectedQuickSearch,
    downloadSelectedAsFormat: downloadSelectedQuickSearchAsFormat,
    moveSelected: moveSelectedQuickSearch,
    createLibraryFromSelection: createLibraryFromSelectedQuickSearch,
  });
  
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
        if (selectedFont?.source === 'google') {
          return 'Глифы недоступны для Google';
        }
        if (glyphFooterCount === GLYPH_COUNT_UNAVAILABLE) {
          return 'Глифы недоступны';
        }
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
    glyphFooterCount,
    stylesPreviewStats,
    selectedFont?.source,
  ]);

  const handleGlyphCountForFooter = useCallback((n) => {
    setGlyphFooterCount(n);
  }, []);

  const showPreviewEditTextHint =
    viewMode === 'plain' ||
    viewMode === 'waterfall' ||
    viewMode === 'styles' ||
    viewMode === 'text';

  const previewColumnRef = useRef(null);
  const [editHintFixedBox, setEditHintFixedBox] = useState(null);

  useLayoutEffect(() => {
    if (!showPreviewEditTextHint) {
      setEditHintFixedBox(null);
      return undefined;
    }
    const root = previewColumnRef.current;
    if (!root) return undefined;

    const statusBarHeightPx = 52;

    const update = () => {
      const rect = root.getBoundingClientRect();
      setEditHintFixedBox({
        left: rect.left,
        width: rect.width,
        bottom: statusBarHeightPx,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showPreviewEditTextHint]);

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

  useEffect(() => {
    if (!plainPreviewOpen) {
      setPlainFullscreenCloseDimmed(false);
      return undefined;
    }
    setPlainFullscreenCloseDimmed(false);
    const id = window.setTimeout(() => setPlainFullscreenCloseDimmed(true), 1600);
    return () => window.clearTimeout(id);
  }, [plainPreviewOpen]);

  const previewFontLabel = useMemo(() => {
    if (exportedFont) {
      return exportedFont.name.replace(/-static$/, '');
    }
    return resolveSessionFontDisplayLabel(selectedFont);
  }, [exportedFont, selectedFont]);

  const previewSourceLabel = useMemo(() => {
    const source = String(selectedFont?.source || '').trim();
    if (!source || source === 'fontsource') return '';
    if (source === 'local') return 'Локальный';
    if (source === 'google') return '';
    return getLibrarySourceLabel(source);
  }, [selectedFont?.source]);

  const previewSubsetLabel = useMemo(() => {
    const subset = String((selectedFont as any)?.activeSubset || '').trim();
    if (!subset) return '';
    return getFontSubsetLabelRu(subset);
  }, [selectedFont?.id, (selectedFont as any)?.activeSubset]);

  const previewWeightValue = useMemo(() => {
    if (!selectedFont) return null;
    if (selectedFont.isVariableFont) {
      const w = Number((variableSettings as any)?.wght);
      if (Number.isFinite(w)) return Math.round(w);
    }
    const weight = Number(selectedFont?.currentWeight);
    return Number.isFinite(weight) ? Math.round(weight) : null;
  }, [selectedFont?.id, selectedFont?.isVariableFont, selectedFont?.currentWeight, (variableSettings as any)?.wght]);

  const showVariableBadge = Boolean(selectedFont?.isVariableFont);
  const showItalicBadge = fontStyleValue === 'italic' || selectedFont?.currentStyle === 'italic';

  const statusLibraryEntry = useMemo(() => {
    if (!selectedFont) return null;
    const label = selectedFont.displayName || selectedFont.name || selectedFont.fontFamily || 'Шрифт';
    const candidateLabels = Array.from(
      new Set(
        [
          selectedFont.displayName,
          selectedFont.name,
          selectedFont.fontFamily,
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

    let baseEntry: SavedLibraryFontEntry | null = null;
    if (selectedFont.source === 'fontsource') {
      const key = String(selectedFont.name || selectedFont.displayName || selectedFont.id || '').trim();
      const familyLabel = normalizeLibraryText(
        selectedFont.displayName || selectedFont.name || selectedFont.fontFamily || '',
      )
        .replace(/\s+variable$/i, '')
        .trim();
      if (!key) return null;
      baseEntry = createCatalogLibraryEntry({
        source: 'fontsource',
        key,
        label: familyLabel || key,
        isVariable: selectedFont.isVariableFont === true,
      });
    } else if (selectedFont.source === 'google') {
      const family = normalizeLibraryText(
        selectedFont.displayName || selectedFont.name || selectedFont.fontFamily || '',
      )
        .replace(/\.woff2$/i, '')
        .replace(/\s+variable$/i, '')
        .trim();
      if (!family) return null;
      baseEntry = createCatalogLibraryEntry({ source: 'google', key: family, label: family });
    } else {
      const fallbackId = String(selectedFont.id || selectedFont.name || label).trim();
      if (!fallbackId) return null;
      baseEntry = {
        id: `session:${fallbackId}`,
        label,
        source: String(selectedFont.source || 'session'),
      };
    }
    if (!baseEntry) return null;

    const preferred = resolvePreferredLibraryPickerEntry(baseEntry) || baseEntry;
    const preferredIds = new Set<string>([
      preferred.id,
      `google:${label}`,
      `fontsource:${String(selectedFont.name || '')}`,
    ]);
    return {
      ...preferred,
      candidateIds: Array.from(
        new Set(
          [
            ...preferredIds,
            selectedFont.id,
            selectedFont.name,
            selectedFont.displayName,
          ]
            .map((value) => String(value || '').trim())
            .filter(Boolean),
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

  /** Только текст; режим поиска остаётся открытым (крестик внутри поля). */
  const clearEmptyStateSearchTextOnly = useCallback(() => {
    setPresetSearchQuery('');
  }, []);

  const openEmptyStateSearch = useCallback(() => {
    setIsEmptyStateSearchExpanded(true);
    requestAnimationFrame(() => {
      emptyStateSearchInputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (emptyStateSearchActive) {
      if (closeEmptyStateSeoTimeoutRef.current !== null) {
        window.clearTimeout(closeEmptyStateSeoTimeoutRef.current);
        closeEmptyStateSeoTimeoutRef.current = null;
      }
      if (emptyStateSeoAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(emptyStateSeoAnimationFrameRef.current);
        emptyStateSeoAnimationFrameRef.current = null;
      }
      setEmptyStateSeoAnimating(false);
      setEmptyStateSeoOpen(false);
      if (emptyStateScrollRef.current instanceof HTMLElement) {
        emptyStateScrollRef.current.scrollTop = 0;
      }
    }
  }, [emptyStateSearchActive]);

  const animateEmptyStateScrollTo = useCallback((targetTop: number, durationMs = 450) => {
    const container = emptyStateScrollRef.current;
    if (!(container instanceof HTMLElement)) return;

    if (emptyStateSeoAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(emptyStateSeoAnimationFrameRef.current);
      emptyStateSeoAnimationFrameRef.current = null;
    }

    const startTop = container.scrollTop;
    const distance = targetTop - startTop;
    const startTime = performance.now();
    const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      container.scrollTop = startTop + distance * easeOutCubic(progress);
      if (progress < 1) {
        emptyStateSeoAnimationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }
      container.scrollTop = targetTop;
      emptyStateSeoAnimationFrameRef.current = null;
    };

    emptyStateSeoAnimationFrameRef.current = window.requestAnimationFrame(step);
  }, []);

  const toggleEmptyStateSeo = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (closeEmptyStateSeoTimeoutRef.current !== null) {
      window.clearTimeout(closeEmptyStateSeoTimeoutRef.current);
      closeEmptyStateSeoTimeoutRef.current = null;
    }
    if (emptyStateSeoOpen) {
      setEmptyStateSeoAnimating(true);
      setEmptyStateSeoOpen(false);
      animateEmptyStateScrollTo(0);
      closeEmptyStateSeoTimeoutRef.current = window.setTimeout(() => {
        setEmptyStateSeoAnimating(false);
        closeEmptyStateSeoTimeoutRef.current = null;
      }, 450);
      return;
    }
    setEmptyStateSeoOpen(true);
    setEmptyStateSeoAnimating(true);
    requestAnimationFrame(() => {
      const container = emptyStateScrollRef.current;
      const about = emptyStateAboutRef.current;
      if (container instanceof HTMLElement && about instanceof HTMLElement) {
        animateEmptyStateScrollTo(about.offsetTop);
      }
      closeEmptyStateSeoTimeoutRef.current = window.setTimeout(() => {
        if (container instanceof HTMLElement && about instanceof HTMLElement) {
          container.scrollTop = about.offsetTop;
        }
        setEmptyStateSeoAnimating(false);
        closeEmptyStateSeoTimeoutRef.current = null;
      }, 520);
    });
  }, [animateEmptyStateScrollTo, emptyStateSeoOpen]);

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
    const catalogStats = getUnifiedCatalogStats({
      googleItems: googleListForStats,
      fontsourceItems: readFontsourceCatalogCache(),
      fontshareItems: readFontshareCatalogCache(),
      trialItems: readFontfabricTrialCatalogCache(),
    });
    const emptyLeading =
      emptyStateSearchQuery.trim().length > 0
        ? `Найдено: ${filteredGoogleCatalogResults.length}`
        : catalogStats.uniqueFamiliesAll > 0
          ? formatUnifiedCatalogAvailabilityShort(catalogStats)
          : 'Шрифт не выбран';

    return (
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col bg-white">
        <div
          ref={emptyStateScrollRef}
          className={`flex w-full min-h-0 flex-1 flex-col ${
            emptyStateSearchActive || emptyStateSeoAnimating ? 'overflow-y-auto' : 'overflow-y-hidden'
          } ${emptyStateSeoAnimating ? 'empty-state-programmatic-scroll' : ''} ${emptyStateLayout.viewportClassName}`}
        >
        <div
          className={`w-full px-6 ${emptyStateLayout.widthClassName}`}
        >
          <div
            className={
              emptyStateSearchActive
                ? emptyStateLayout.catalogWidthClassName
                : `mx-auto ${emptyStateLayout.innerClassName}`
            }
          >
            <div
              ref={emptyStateSearchWrapRef}
              className={`z-20 min-h-10 ${emptyStateLayout.stickyClassName} flex items-center ${
                emptyStateSearchActive ? 'gap-3' : 'gap-0'
              } ${emptyStateLayout.barJustifyClassName} ${
                emptyStateSearchActive ? 'relative pr-12' : ''
              }`}
            >
              <IconCircleButton
                variant="searchToggle"
                size="md"
                pressed={emptyStateSearchActive}
                className={
                  emptyStateSearchActive
                    ? 'absolute right-0 top-1/2 z-10 -translate-y-1/2 focus:outline-none'
                    : 'focus:outline-none'
                }
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
                  <SearchIcon className="h-4 w-4" />
                )}
              </IconCircleButton>
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${emptyStateLayout.searchWrapClassName}`}
              >
                <div className="relative min-w-0">
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
                      onClick={clearEmptyStateSearchTextOnly}
                      ariaLabel="Очистить текст поиска"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {emptyStateSearchActive ? (
              <div className="mt-4">
                {emptyStateSearchQuery ? (
                  filteredGoogleCatalogResults.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredGoogleCatalogResults.map((entry) => {
                        const family = String(entry?.family || '').trim();
                        if (!family) return null;
                        const isSelected = selectedQuickSearchFamilies.has(family);
                        const categoryLabel = getFontCategoryLabelRu(entry?.category) || null;
                        const isVariable = entry?.isVariable === true;
                        const hasItalic =
                          entry?.hasItalic === true || entry?.hasItalicStyles === true;
                        const languageCount = Array.isArray(entry?.subsets) ? entry.subsets.length : 0;
                        const styleCountNum = Number(entry?.styleCount) || 0;
                        const footerLeftBadges = [
                          categoryLabel,
                          isVariable ? 'vf' : null,
                          hasItalic ? 'italic' : null,
                        ].filter(Boolean) as string[];
                        const footerRightBadges = [
                          languageCount > 0
                            ? `${languageCount} ${pluralRu(languageCount, 'язык', 'языка', 'языков')}`
                            : null,
                          styleCountNum > 0
                            ? `${styleCountNum} ${pluralRu(styleCountNum, 'начертание', 'начертания', 'начертаний')}`
                            : null,
                        ].filter(Boolean) as string[];
                        const downloadButtonProps = buildCatalogDownloadButtonProps({
                          family,
                          item: entry,
                          catalogEntry: entry,
                          catalogSource: 'google',
                          onDownloadZip: downloadGooglePackageZip,
                          onDownloadAsFormat: (it, format) => downloadGoogleAsFormat(it, format),
                          onDownloadVariableVariant: downloadGoogleVariableVariant,
                          showVariable: entry?.isVariable === true,
                        });
                        const openInEditor = () => {
                          if (typeof openGoogleCatalogEntryInEditorTab === 'function') {
                            return openGoogleCatalogEntryInEditorTab(entry);
                          }
                          return loadPresetFont(family);
                        };
                        return (
                          <CatalogFontCard
                            key={family}
                            className="min-h-[148px]"
                            fadeFooterWithHoverUi
                            actions={
                              <CatalogLibraryActions
                                libraries={fontLibraries}
                                libraryEntry={createCatalogLibraryEntry({
                                  source: 'google',
                                  key: family,
                                  label: family,
                                })}
                                onAddFontToLibrary={onMoveFontToLibrary}
                                onRequestCreateLibrary={onRequestCreateLibrary}
                                stateKey={`empty-search:${family}`}
                              />
                            }
                            hoverOverlay={
                              <CatalogCardHoverOverlay
                                openButtonProps={{
                                  primaryLabel: 'Открыть',
                                  primaryAriaLabel: `Открыть ${family} в редакторе`,
                                  onPrimaryClick: openInEditor,
                                }}
                                downloadButtonProps={downloadButtonProps}
                              />
                            }
                            selected={isSelected}
                            onClick={(event) => {
                              if (isInteractiveTarget(event?.target)) return;
                              onQuickSearchCardClick(event, family);
                            }}
                            onPointerDown={(event) => startQuickSearchLongPress(event, family)}
                            onPointerUp={clearQuickSearchLongPressTimer}
                            onPointerLeave={clearQuickSearchLongPressTimer}
                            onPointerCancel={clearQuickSearchLongPressTimer}
                            title={family}
                            preview={
                              <div
                                className="mt-2 min-h-[1.75rem] flex-1 truncate text-[1.75rem] leading-tight text-gray-800"
                                style={{ fontFamily: `'${family}', sans-serif` }}
                              >
                                {family}
                              </div>
                            }
                            footer={
                              footerLeftBadges.length > 0 || footerRightBadges.length > 0 ? (
                                <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    {footerLeftBadges.map((part) => (
                                      <span
                                        key={`l-${part}`}
                                        className="truncate text-xs font-semibold uppercase text-gray-800"
                                      >
                                        {part}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 text-xs font-semibold uppercase tabular-nums text-gray-800">
                                    {footerRightBadges.map((part) => (
                                      <span key={`r-${part}`} className="whitespace-nowrap">
                                        {part}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null
                            }
                          />
                        );
                      })}
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
            ) : (
              <div className="relative mt-6">
                <h2 className="mb-4 text-2xl font-bold uppercase text-gray-900">Загрузите шрифт для начала работы</h2>
                <p className="mb-6 text-gray-600">Перетащите шрифт или нажмите на область</p>
                <div className="mb-8">
                  <FontUploader onFontsUploaded={handleFontsUploaded} />
                </div>
                {filteredPresetFonts.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {filteredPresetFonts.map((fontName) => (
                      <AppButton
                        key={fontName}
                        type="button"
                        variant="outline"
                        fullWidth
                        className="!normal-case px-4 py-3 font-sans font-medium"
                        onClick={() => loadPresetFont(fontName)}
                      >
                        {fontName}
                      </AppButton>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">Ничего не найдено. Попробуйте другой запрос.</p>
                )}
              </div>
            )}
          </div>
        </div>
        {!emptyStateSearchActive ? (
          <div ref={emptyStateAboutRef} id="dynamic-font-about" className="relative scroll-mt-8">
            <EmptyStateAboutSection showTopToggle={false} onClose={toggleEmptyStateSeo} />
          </div>
        ) : null}
        </div>
        {!emptyStateSearchActive ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-30 flex justify-center transition-[top] duration-[450ms] ease-[cubic-bezier(0.33,1,0.68,1)]"
            style={{ top: emptyStateSeoOpen ? 18 : 'calc(100% - 7rem)' }}
          >
            <div className="pointer-events-auto">
              <EmptyStateAboutToggle open={emptyStateSeoOpen} onToggle={toggleEmptyStateSeo} />
            </div>
          </div>
        ) : null}
        <EditorStatusBar
          leading={emptyLeading}
          center={<span className="truncate">Новая вкладка</span>}
        />
      </div>
    );
  }

  return (
    <>
      <div ref={previewColumnRef} className="relative flex h-full min-h-0 w-full flex-1 flex-col">
        <div
          ref={previewBodyScrollRef}
          data-preview-plain-export-wrap
          className={`relative min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto ${
            showPreviewEditTextHint ? 'pb-14' : 'pb-4'
          }`}
          style={previewAreaBgStyle}
        >
            <div className="relative flex h-full min-h-full min-h-0 min-w-0 w-full flex-col">
              {viewMode === 'plain' && (
                <Suspense fallback={MODE_LOADING_FALLBACK}>
                  <PlainTextMode
                    containerStyle={containerStyle}
                    contentStyle={contentStyle}
                    variant="default"
                  />
                </Suspense>
              )}

              {(viewMode === 'waterfall' || hasEverMountedWaterfallMode) && (
                <div
                  className={viewMode === 'waterfall' ? 'flex h-full min-h-0 min-w-0 flex-col' : 'hidden'}
                >
                  <Suspense fallback={MODE_LOADING_FALLBACK}>
                    <WaterfallMode
                      waterfallSizes={effectiveWaterfallSizes}
                      scrollParentRef={previewBodyScrollRef}
                      isVariableFontAnimating={viewMode === 'waterfall' ? isVariableFontAnimating : false}
                      isInteractingWithWaterfallSize={
                        viewMode === 'waterfall' &&
                        currentWaterfallBaseSize !== null &&
                        currentWaterfallBaseSize !== undefined
                      }
                    />
                  </Suspense>
                </div>
              )}

              {(viewMode === 'styles' || hasEverMountedStylesMode) && (
                <div className={viewMode === 'styles' ? 'flex h-full min-h-0 min-w-0 flex-1 flex-col' : 'hidden'}>
                  <Suspense fallback={MODE_LOADING_FALLBACK}>
                    <StylesMode selectedFont={selectedFont} fontFamilyValue={fontFamilyValue} />
                  </Suspense>
                </div>
              )}

              {(viewMode === 'glyphs' || hasEverMountedGlyphsMode) && (
                <div className={viewMode === 'glyphs' ? 'flex h-full min-h-0 min-w-0 flex-col' : 'hidden'}>
                  <Suspense fallback={MODE_LOADING_FALLBACK}>
                    <GlyphsMode
                      key={selectedFont?.id}
                      selectedFont={selectedFont}
                      fontFamily={fontFamilyValue}
                      glyphDisplayStyle={glyphDisplayStyle}
                      isActive={viewMode === 'glyphs'}
                      scrollParentRef={previewBodyScrollRef}
                      onDisplayableGlyphCountChange={handleGlyphCountForFooter}
                    />
                  </Suspense>
                </div>
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
          </div>

        <EditorStatusBar
          leading={bottomBarModeHint}
          center={
            selectedFont ? (
              <div className="flex items-center justify-center gap-2">
                <span className="truncate">{previewFontLabel}</span>
                {previewSourceLabel ? <span>{previewSourceLabel}</span> : null}
                {previewSubsetLabel ? (
                  <Tooltip content="Выбранный набор символов" className="pointer-events-auto">
                    <span>{previewSubsetLabel}</span>
                  </Tooltip>
                ) : null}
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

      {showPreviewEditTextHint &&
      editHintFixedBox &&
      typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pointer-events-none fixed z-20 isolate bg-transparent"
              style={{
                left: editHintFixedBox.left,
                width: editHintFixedBox.width,
                bottom: editHintFixedBox.bottom,
              }}
            >
              <PreviewEditTextHint overlay />
            </div>,
            document.body,
          )
        : null}

    {plainPreviewOpen && typeof onClosePlainPreview === 'function' && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Полноэкранное превью"
        className="fixed inset-0 z-[220] flex flex-col"
        style={previewAreaBgStyle}
      >
        <PreviewModeDock className="z-[222]" bottomOffsetPx={0} />
        <button
          type="button"
          onClick={onClosePlainPreview}
          aria-label="Закрыть полноэкранное превью"
          className={`plain-preview-fs-close-btn fixed right-0 top-0 z-[221] flex h-12 min-h-12 w-12 shrink-0 items-center justify-center border-b border-l border-gray-200 bg-white/95 px-2 text-gray-800 backdrop-blur-sm transition-opacity duration-500 ease-out hover:text-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 ${
            plainFullscreenCloseDimmed ? 'opacity-0 hover:opacity-100' : 'opacity-100'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div
          ref={fullscreenScrollRef}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-28"
          style={previewAreaBgStyle}
        >
          {viewMode === 'plain' && (
            <Suspense fallback={MODE_LOADING_FALLBACK}>
              <PlainTextMode
                containerStyle={containerStyle}
                contentStyle={contentStyle}
                variant="fullscreen"
              />
            </Suspense>
          )}

          {(viewMode === 'waterfall' || hasEverMountedWaterfallMode) && (
            <div
              className={viewMode === 'waterfall' ? 'flex h-full min-h-0 min-w-0 flex-col' : 'hidden'}
            >
              <Suspense fallback={MODE_LOADING_FALLBACK}>
                <WaterfallMode
                  waterfallSizes={effectiveWaterfallSizes}
                  scrollParentRef={fullscreenScrollRef}
                  isVariableFontAnimating={viewMode === 'waterfall' ? isVariableFontAnimating : false}
                  isInteractingWithWaterfallSize={
                    viewMode === 'waterfall' &&
                    currentWaterfallBaseSize !== null &&
                    currentWaterfallBaseSize !== undefined
                  }
                />
              </Suspense>
            </div>
          )}

          {(viewMode === 'styles' || hasEverMountedStylesMode) && (
            <div className={viewMode === 'styles' ? 'flex h-full min-h-0 min-w-0 flex-1 flex-col' : 'hidden'}>
              <Suspense fallback={MODE_LOADING_FALLBACK}>
                <StylesMode selectedFont={selectedFont} fontFamilyValue={fontFamilyValue} />
              </Suspense>
            </div>
          )}

          {(viewMode === 'glyphs' || hasEverMountedGlyphsMode) && (
            <div className={viewMode === 'glyphs' ? 'flex h-full min-h-0 min-w-0 flex-col' : 'hidden'}>
              <Suspense fallback={MODE_LOADING_FALLBACK}>
                <GlyphsMode
                  key={`fs-${selectedFont?.id}`}
                  selectedFont={selectedFont}
                  fontFamily={fontFamilyValue}
                  glyphDisplayStyle={glyphDisplayStyle}
                  isActive={viewMode === 'glyphs'}
                  scrollParentRef={fullscreenScrollRef}
                  onDisplayableGlyphCountChange={handleGlyphCountForFooter}
                />
              </Suspense>
            </div>
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
      </div>
    )}
    </>
  );
}
