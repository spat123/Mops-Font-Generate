import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { SessionFontRecord } from '../types/editorFonts';
import { toast } from '../utils/appNotify';
import {
  PRESET_STYLES,
  filterPresetStylesForVariableAxes,
  resolveDefaultStaticPresetName,
  resolveVariableFontAvailableStyles,
} from '../utils/fontUtilsCommon';
import { debouncedUpdateVariableFontSettings } from '../utils/cssGenerator';
import { deleteFontDB } from '../utils/db';
import { revokeObjectURL } from '../utils/localFontProcessor';
import { useFontPersistence } from './useFontPersistence';
import { useFontLoader } from './useFontLoader';
import { useVariableFontControls } from './useVariableFontControls';
import { useFontStyleManager } from './useFontStyleManager';
import { useFontCss } from './useFontCss';
import { useFontExport } from './useFontExport';
import {
  getFontsourceVariableSettings,
  setFontsourceVariableSettings,
  clearFontsourceVariableSettings,
} from '../utils/fontsourceVariableSettingsCache';
import { buildFontViewStateRestorePlan } from '../utils/fontViewStateRestore';
import { applyFontViewStateRestorePlan } from '../utils/applyFontViewStateRestorePlan';
import { resolveSelectedPresetDisplayName } from '../utils/resolveSelectedPresetDisplayName';
import {
  buildPersistedFontViewStatePatch,
} from '../utils/fontViewStateWriter';

/** Центральный хук: шрифты, VF, CSS, персистентность, экспорт. */
export function useFontManager() {
  const [fonts, setFonts] = useState<SessionFontRecord[]>([]);
  const [selectedFont, setSelectedFont] = useState<SessionFontRecord | null>(null);
  const [variableSettings, setVariableSettings] = useState<Record<string, number>>({});
  const [exportedFont, setExportedFont] = useState<SessionFontRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Создаём ref для safeSelectFont, чтобы использовать в колбэках
  const safeSelectFontRef = useRef(null);
  
  const { handleLocalFontsUpload, loadAndSelectFontsourceFont, loadFontsourceStyleVariant } = useFontLoader(
    setFonts,
    setIsLoading,
    useCallback((font) => safeSelectFontRef.current?.(font), []),
    fonts
  );
  
  // Создаём ref для saveFontSettings, чтобы использовать в колбэке до его объявления
  const saveFontSettingsRef = useRef(null);
  
  // Создаём ref для saveLastVariableSettings, чтобы использовать до его объявления
  const saveLastVariableSettingsRef = useRef(null);
  
  const {
      applyVariableSettings,
      getDefaultAxisValues,
      resetVariableSettings,
      getVariableAxesInfo,
  } = useVariableFontControls(
      selectedFont,
      variableSettings,
      setVariableSettings,
      setSelectedFont,
      setFonts,
      debouncedUpdateVariableFontSettings,
      useCallback((settings) => saveLastVariableSettingsRef.current?.(settings), []),
      useCallback((font, settings) => {
        const slug = font?.name;
        if (!slug) return;
        setFontsourceVariableSettings(slug, settings, font?.variableAxes);
      }, [])
  );

  // Колбэк для сохранения настроек пресета в IndexedDB
  const handlePresetApplied = useCallback((fontId, settings) => {
    if (saveFontSettingsRef.current) {
      saveFontSettingsRef.current(fontId, settings);
    }
  }, []);

  const { applyPresetStyle } = useFontStyleManager(
      selectedFont,
      setSelectedFont,
      setFonts,
      variableSettings,
      applyVariableSettings,
      loadFontsourceStyleVariant,
      handlePresetApplied
  );

  const {
    saveSelectedFontId,
    saveLastVariableSettings,
    saveLastPresetName,
    clearFontLocalStorage,
    resetPersistence,
    saveFontSettings
  } = useFontPersistence(
    setFonts,
    setIsLoading,
    setIsInitialLoadComplete,
    setSelectedFont,
    applyVariableSettings,
    applyPresetStyle,
    fonts,
    selectedFont
  );

  // Устанавливаем saveFontSettings в ref для использования в handlePresetApplied
  useEffect(() => {
    saveFontSettingsRef.current = saveFontSettings;
  }, [saveFontSettings]);

  // Устанавливаем saveLastVariableSettings в ref для использования в useVariableFontControls
  useEffect(() => {
    saveLastVariableSettingsRef.current = saveLastVariableSettings;
  }, [saveLastVariableSettings]);

  const isSelectedFontVariable = useMemo(() => selectedFont?.isVariableFont || false, [selectedFont]);

  const {
      getFontFamily,
      getVariationSettings,
      generateCSS,
      loadFontFace,
      updateVariableFontCss,
      debouncedUpdateVariableFontCss,
      exportToCSS: exportToCSSFromHook,
      fontCssProperties
  } = useFontCss(selectedFont, variableSettings, isSelectedFontVariable);

  const {
      downloadFile,
      exportToCSS: exportToCSSFromExportHook,
      createStaticFont: createStaticFontFromExportHook,
      generateStaticFontFile,
      downloadStaticFont
  } = useFontExport(exportToCSSFromHook);

  const safeSelectFont = useCallback((font) => {
    if (!font) {
      console.warn('[safeSelectFont] Попытка выбрать null/undefined шрифт');
      return;
    }

    // Устанавливаем выбранный шрифт
    setSelectedFont(font);
    
    const restorePlan = buildFontViewStateRestorePlan(font, {
      getFontsourceCachedSettings: (fontToRestore) =>
        fontToRestore?.source === 'fontsource'
          ? (getFontsourceVariableSettings(
              fontToRestore.name,
              fontToRestore.variableAxes,
            ) as Record<string, number> | null)
          : null,
      includeFontsourceCacheForVariable: true,
      resolveDefaultVariableSettings: (fontToRestore) =>
        (getDefaultAxisValues as ((font?: SessionFontRecord) => Record<string, number> | null) | undefined)?.(
          fontToRestore,
        ) || null,
      clearVariableSettingsForStatic: true,
    });

    applyFontViewStateRestorePlan({
      font,
      plan: restorePlan,
      setVariableSettings,
      applyVariableSettings,
      applyPresetStyle,
      deferSideEffects: true,
    });
  }, [
    setSelectedFont,
    setVariableSettings,
    getDefaultAxisValues,
    applyPresetStyle,
    applyVariableSettings,
  ]);
  
  // Сохраняем ссылку на функцию для использования в колбэках
  useEffect(() => {
    safeSelectFontRef.current = safeSelectFont;
  }, [safeSelectFont]);

  // Мемоизированное имя выбранного пресета (нужно определить до useEffect)
  const selectedPresetName = useMemo(
    () => resolveSelectedPresetDisplayName(selectedFont, variableSettings),
    [selectedFont, variableSettings],
  );

  const previousSelectedFontRef = useRef(null);
  const previousVariableSettingsRef = useRef({});
  const previousPresetNameRef = useRef('Regular');
  
  useEffect(() => {
    // Если есть предыдущий шрифт и он отличается от текущего
    if (previousSelectedFontRef.current && 
        previousSelectedFontRef.current.id !== selectedFont?.id) {
      
      const prevFont = previousSelectedFontRef.current;
      const prevVariableSettings = previousVariableSettingsRef.current;
      const prevPresetName = previousPresetNameRef.current;

      // Сохраняем настройки предыдущего шрифта в его объект (для сессии)
      const updatedFonts = fonts.map(font => {
        if (font.id === prevFont.id) {
          const dbUpdates = buildPersistedFontViewStatePatch(prevFont, {
            variableSettings: prevVariableSettings,
            presetName: prevPresetName,
          });
          const updatedFont = { ...font, ...dbUpdates };
          
          // Сохраняем в IndexedDB если есть что сохранять
          if (Object.keys(dbUpdates).length > 0) {
            saveFontSettings(prevFont.id, dbUpdates);
          }
          
          return updatedFont;
        }
        return font;
      });
      
      setFonts(updatedFonts);
      
      // Также сохраняем в localStorage (глобальные настройки)
      if (prevFont.isVariableFont && Object.keys(prevVariableSettings).length > 0) {
        saveLastVariableSettings(prevVariableSettings);
      } else if (prevPresetName && prevPresetName !== 'Regular') {
        saveLastPresetName(prevPresetName);
      }
    }
    
    // Обновляем ссылки на текущие настройки для следующего переключения
    previousSelectedFontRef.current = selectedFont;
    previousVariableSettingsRef.current = { ...variableSettings };
    previousPresetNameRef.current = selectedPresetName;
    
    // Сохраняем ID выбранного шрифта
    if (selectedFont?.id) {
      saveSelectedFontId(selectedFont.id);
    }
  }, [selectedFont, fonts, setFonts, saveSelectedFontId, saveLastVariableSettings, saveLastPresetName, saveFontSettings, variableSettings, selectedPresetName]);

  const availableStyles = useMemo(() => {
      if (!selectedFont) return [];

      // Вариативный: fvar instances или пресеты Thin…Black по диапазону wght (не статический weights[] Fontsource)
      if (selectedFont.isVariableFont) {
          const resolved = resolveVariableFontAvailableStyles(selectedFont);
          if (resolved.length > 0) return resolved;
          return filterPresetStylesForVariableAxes(selectedFont.variableAxes, undefined, {
            italicMode: selectedFont.italicMode,
          });
      // Если у шрифта есть поле availableStyles (из Fontsource или локального парсинга)
      } else if (selectedFont.availableStyles && Array.isArray(selectedFont.availableStyles) && selectedFont.availableStyles.length > 0) {
          const isValid = selectedFont.availableStyles.every(
            (s) => s && s.name != null && s.weight != null && s.style != null
          );
          if (isValid) {
            return selectedFont.availableStyles;
          }
          console.warn('Формат availableStyles отличается от ожидаемого, используем стандартные пресеты.');
          return [...PRESET_STYLES];
      // Нет своих стилей (или пустой массив — раньше [] давал пустой UI из-за Array.every на [])
      } else {
          return [...PRESET_STYLES];
      }
  }, [selectedFont]);

  // Мемоизированное имя шрифта
  const selectedFontName = useMemo(() => {
    return selectedFont ? selectedFont.name : '';
  }, [selectedFont]);
  
  // Мемоизированные оси шрифта
  const selectedFontAxes = useMemo(() => {
    return selectedFont && selectedFont.variableAxes ? selectedFont.variableAxes : {};
  }, [selectedFont]);

  const createStaticFont = useCallback(() => {
    return createStaticFontFromExportHook(selectedFont, selectedFontName, variableSettings, setExportedFont);
  }, [createStaticFontFromExportHook, selectedFont, selectedFontName, variableSettings, setExportedFont]);

  const handleFontsUploaded = useCallback(async (newFonts, options = {}) => {
    return await handleLocalFontsUpload(newFonts, options);
  }, [handleLocalFontsUpload]);

  const removeFont = useCallback((fontId) => {
    setFonts(prev => {
      const fontToRemove = prev.find(f => f.id === fontId);
      if (fontToRemove) {
        if (fontToRemove.url) {
          revokeObjectURL(fontToRemove.url);
        }
        deleteFontDB(fontId).catch((err) => {
          console.error(`[DB] Ошибка удаления шрифта ${fontId} из DB:`, err);
          toast.error('Ошибка удаления шрифта из базы данных.');
        });
      }
      
      const updatedFonts = prev.filter(f => f.id !== fontId);
      
      // Если удаляем текущий выбранный шрифт, выбираем следующий доступный
      if (selectedFont && selectedFont.id === fontId) {
        if (updatedFonts.length > 0) {
          // Сохраняем ссылку на новый шрифт для дальнейшего применения стиля
          const newFont = updatedFonts[0];
          // Устанавливаем новый шрифт
          setSelectedFont(newFont);
          
          // После установки нового шрифта, настраиваем его со стилем Regular
          setTimeout(() => {
            safeSelectFontRef.current?.(newFont);
          }, 0);
        } else {
          setSelectedFont(null);
        }
      }
      
      return updatedFonts;
    });
  }, [selectedFont, setFonts, setSelectedFont]);

  const removeFontsByIds = useCallback(
    (fontIds) => {
      const idSet = new Set((fontIds || []).map((id) => String(id)));
      if (idSet.size === 0) return;

      setFonts((prev) => {
        const toRemove = prev.filter((f) => idSet.has(String(f.id)));
        for (const fontToRemove of toRemove) {
          if (fontToRemove.url) {
            revokeObjectURL(fontToRemove.url);
          }
          deleteFontDB(String(fontToRemove.id)).catch((err) => {
            console.error(`[DB] Ошибка удаления шрифта ${fontToRemove.id} из DB:`, err);
            toast.error('Ошибка удаления шрифта из базы данных.');
          });
        }

        const updatedFonts = prev.filter((f) => !idSet.has(String(f.id)));

        if (selectedFont && idSet.has(String(selectedFont.id))) {
          if (updatedFonts.length > 0) {
            const newFont = updatedFonts[0];
            setSelectedFont(newFont);
            setTimeout(() => {
              safeSelectFontRef.current?.(newFont);
            }, 0);
          } else {
            setSelectedFont(null);
          }
        }

        return updatedFonts;
      });
    },
    [selectedFont, setFonts, setSelectedFont],
  );

  // Обертки для совместимости с предыдущим API
  const exportToCSS = useCallback((download = false) => {
    return exportToCSSFromExportHook(selectedFont, selectedFontName, download);
  }, [exportToCSSFromExportHook, selectedFont, selectedFontName]);

  const selectOrAddFontsourceFont = useCallback(async (
    fontFamilyName,
    forceVariableFont = false,
    options = {},
  ) => {
    return loadAndSelectFontsourceFont(fontFamilyName, forceVariableFont, options);
  }, [loadAndSelectFontsourceFont]);
  
  const resetApplicationState = useCallback(async () => {
    try {
      await resetPersistence();
      toast.info('Локальное хранилище данных очищено.');

      setFonts([]);
      setSelectedFont(null);
      setVariableSettings({});
      setExportedFont(null);
      setIsLoading(false);

      toast.success('Состояние приложения успешно сброшено!');

    } catch (error) {
      console.error('[Reset] Ошибка во время сброса состояния:', error);
      toast.error('Произошла ошибка при сбросе состояния.');
    }
  }, [setFonts, setSelectedFont, setVariableSettings, setExportedFont, setIsLoading, resetPersistence]);

  const resetSelectedFontState = useCallback(() => {
    if (!selectedFont) {
      toast.info('Шрифт не выбран');
      return;
    }

    const defaultSettings = getDefaultAxisValues();
    const resetViewStatePatch = {
      lastUsedVariableSettings: null,
      lastUsedPresetName: null,
    };

    setVariableSettings(defaultSettings);

    setFonts((prev) =>
      prev.map((font) =>
        font.id === selectedFont.id
          ? { ...font, ...resetViewStatePatch }
          : font
      )
    );

    setSelectedFont((prev) =>
      prev
        ? { ...prev, ...resetViewStatePatch }
        : null
    );

    if (selectedFont?.isVariableFont && applyVariableSettings) {
      applyVariableSettings(defaultSettings, true, selectedFont);
    } else if (!selectedFont?.isVariableFont && applyPresetStyle) {
      applyPresetStyle(resolveDefaultStaticPresetName(selectedFont), selectedFont);
    }
    if (selectedFont?.source === 'fontsource') {
      clearFontsourceVariableSettings(selectedFont.name);
    }

    toast.success(`Настройки шрифта "${selectedFont.name}" сброшены`);
  }, [
    selectedFont,
    getDefaultAxisValues,
    applyVariableSettings,
    applyPresetStyle,
    setFonts,
    setSelectedFont,
    setVariableSettings,
  ]);

  return {
    fonts,
    selectedFont,
    variableSettings,
    exportedFont,
    isSelectedFontVariable,
    selectedFontName,
    selectedFontAxes,
    availableStyles,
    selectedPresetName,
    isLoading,
    isInitialLoadComplete,
    setFonts,
    setSelectedFont,
    setVariableSettings,
    setExportedFont,
    handleLocalFontsUpload,
    handleFontsUploaded,
    loadAndSelectFontsourceFont,
    selectOrAddFontsourceFont,
    removeFont,
    removeFontsByIds,
    safeSelectFont,
    getVariableAxesInfo,
    getVariableAxes: getVariableAxesInfo,
    applyVariableSettings,
    handleVariableSettingsChange: applyVariableSettings,
    resetVariableSettings,
    getDefaultAxisValues,
    applyPresetStyle,
    getFontFamily,
    getVariationSettings,
    generateCSS,
    exportToCSS,
    fontCssProperties,
    downloadFile,
    generateStaticFontFile,
    downloadStaticFont,
    createStaticFont,
    resetApplicationState,
    saveFontSettings,
    resetSelectedFontState,
    getResetTargetPresetName: resolveDefaultStaticPresetName,
  };
} 
