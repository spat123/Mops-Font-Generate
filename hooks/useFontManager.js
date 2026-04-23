import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { toast } from '../utils/appNotify';
import {
  findStyleInfoByWeightAndStyle,
  PRESET_STYLES,
  filterPresetStylesForVariableAxes,
  clampPresetNameForVariableAxes,
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

/** Центральный хук: шрифты, VF, CSS, персистентность, экспорт. */
export function useFontManager() {
  const [fonts, setFonts] = useState([]);
  const [selectedFont, setSelectedFont] = useState(null);
  const [variableSettings, setVariableSettings] = useState({});
  const [exportedFont, setExportedFont] = useState(null);
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
    
    // Проверяем, есть ли сохраненные настройки для этого шрифта
    let settingsApplied = false;
    
    // Приоритет 1: Сохранённые настройки осей для вариативного шрифта
    if (font.isVariableFont && font.lastUsedVariableSettings) {
      setVariableSettings(font.lastUsedVariableSettings);
      // Применяем настройки через setTimeout для корректной работы
      setTimeout(() => {
        if (applyVariableSettings) {
          applyVariableSettings(font.lastUsedVariableSettings, true, font);
        }
      }, 0);
      settingsApplied = true;
    }
    else if (font.isVariableFont && font.source === 'fontsource') {
      const cachedFontsourceAxes = getFontsourceVariableSettings(font.name, font.variableAxes);
      if (cachedFontsourceAxes && Object.keys(cachedFontsourceAxes).length > 0) {
        setVariableSettings(cachedFontsourceAxes);
        setTimeout(() => {
          if (applyVariableSettings) {
            applyVariableSettings(cachedFontsourceAxes, true, font);
          }
        }, 0);
        settingsApplied = true;
      }
    }
    // Приоритет 2: Сохранённый пресет
    else if (font.lastUsedPresetName && applyPresetStyle) {
      // Убираем setTimeout - выполняем синхронно, чтобы currentWeight/currentStyle обновились
      applyPresetStyle(font.lastUsedPresetName, font);
      settingsApplied = true;
    }
    
    // Если настройки не были восстановлены, применяем дефолтные
    if (!settingsApplied) {
      if (font.isVariableFont && font.variableAxes) {
        // Получаем дефолтные значения из хука
        const defaultAxes = getDefaultAxisValues?.(font) || {};
        setVariableSettings(defaultAxes);
      } else {
        // Для статических шрифтов очищаем настройки осей
        setVariableSettings({});
      }
      
      // Применяем базовый стиль Regular
      if (applyPresetStyle) {
        // Убираем setTimeout - выполняем синхронно
        applyPresetStyle('Regular', font);
      }
    }
  }, [setSelectedFont, setVariableSettings, getDefaultAxisValues, applyPresetStyle, applyVariableSettings]);
  
  // Сохраняем ссылку на функцию для использования в колбэках
  useEffect(() => {
    safeSelectFontRef.current = safeSelectFont;
  }, [safeSelectFont]);

  // Мемоизированное имя выбранного пресета (нужно определить до useEffect)
  const selectedPresetName = useMemo(() => {
      if (!selectedFont) return 'Regular'; // По умолчанию

      // Приоритет 1: Для статических шрифтов используем currentWeight/currentStyle
      if (!selectedFont.isVariableFont) {
        // Сначала пытаемся определить по текущему весу и стилю
        if (selectedFont.currentWeight !== undefined && selectedFont.currentStyle !== undefined) {
          const styleInfo = findStyleInfoByWeightAndStyle(
              selectedFont.currentWeight, 
              selectedFont.currentStyle
          );
          const presetName = styleInfo?.name || 'Regular';
          return presetName;
        }
        
        // Если currentWeight/currentStyle не установлены, используем сохранённый пресет
        if (selectedFont.lastUsedPresetName) {
          return selectedFont.lastUsedPresetName;
        }

        // По умолчанию
        return 'Regular';
      }
      
      // Вариативный: имя пресета по осям + приведение к допустимым для диапазона wght
      if (selectedFont.isVariableFont) {
        const liveAxes = variableSettings && Object.keys(variableSettings).length > 0 ? variableSettings : null;
        const storedAxes = selectedFont.lastUsedVariableSettings && typeof selectedFont.lastUsedVariableSettings === 'object' && Object.keys(selectedFont.lastUsedVariableSettings).length > 0
          ? selectedFont.lastUsedVariableSettings
          : null;
        const axisSource = liveAxes || storedAxes;
        let candidate = 'Regular';
        let hintW = 400;
        let hintStyle = 'normal';
        if (axisSource) {
          hintW = axisSource.wght != null ? Number(axisSource.wght) : 400;
          hintStyle = (axisSource.ital === 1 || (axisSource.slnt != null && Number(axisSource.slnt) < 0)) ? 'italic' : 'normal';
          if (selectedFont.italicMode === 'separate-style') {
            hintStyle = selectedFont.currentStyle === 'italic' ? 'italic' : 'normal';
          }
          const matchedPreset = findStyleInfoByWeightAndStyle(hintW, hintStyle);
          if (matchedPreset) candidate = matchedPreset.name;
        } else if (selectedFont.lastUsedPresetName) {
          candidate = selectedFont.lastUsedPresetName;
          hintW =
            selectedFont.currentWeight != null && Number.isFinite(Number(selectedFont.currentWeight))
              ? Number(selectedFont.currentWeight)
              : 400;
          hintStyle = selectedFont.currentStyle === 'italic' ? 'italic' : 'normal';
        }
        const clamped = clampPresetNameForVariableAxes(
          candidate,
          selectedFont.variableAxes,
          hintW,
          hintStyle,
          { italicMode: selectedFont.italicMode },
        );
        return clamped;
      }

      console.warn('[selectedPresetName] Неожиданное состояние шрифта, Regular');
      return 'Regular';
  }, [selectedFont, variableSettings]);

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
          const updatedFont = { ...font };
          let dbUpdates = {}; // Объект для обновления в IndexedDB
          
          // Сохраняем настройки в зависимости от типа ПРЕДЫДУЩЕГО шрифта
          if (prevFont.isVariableFont && Object.keys(prevVariableSettings).length > 0) {
            updatedFont.lastUsedVariableSettings = { ...prevVariableSettings };
            updatedFont.lastUsedPresetName = null; // Очищаем пресет, если есть оси
            dbUpdates.lastUsedVariableSettings = { ...prevVariableSettings };
            dbUpdates.lastUsedPresetName = null;
          } else if (prevPresetName && prevPresetName !== 'Regular') {
            updatedFont.lastUsedPresetName = prevPresetName;
            updatedFont.lastUsedVariableSettings = null; // Очищаем оси, если есть пресет
            dbUpdates.lastUsedPresetName = prevPresetName;
            dbUpdates.lastUsedVariableSettings = null;
          }
          
          // Сохраняем currentWeight и currentStyle если они есть
          if (prevFont.currentWeight !== undefined && prevFont.currentStyle !== undefined) {
            updatedFont.currentWeight = prevFont.currentWeight;
            updatedFont.currentStyle = prevFont.currentStyle;
            dbUpdates.currentWeight = prevFont.currentWeight;
            dbUpdates.currentStyle = prevFont.currentStyle;
          }
          
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

      // Вариативный: только пресеты, попадающие в диапазон wght (и курсив — если есть ital/slnt)
      if (selectedFont.isVariableFont) {
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

  const handleFontsUploaded = useCallback(async (newFonts) => {
    return await handleLocalFontsUpload(newFonts);
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
    
    toast.success('Шрифт удален');
  }, [selectedFont, setFonts, setSelectedFont]);

  // Обертки для совместимости с предыдущим API
  const exportToCSS = useCallback((download = false) => {
    return exportToCSSFromExportHook(selectedFont, selectedFontName, download);
  }, [exportToCSSFromExportHook, selectedFont, selectedFontName]);

  const selectOrAddFontsourceFont = useCallback(async (fontFamilyName, forceVariableFont = false) => {
    return loadAndSelectFontsourceFont(fontFamilyName, forceVariableFont);
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

    setVariableSettings(defaultSettings);

    setFonts((prev) =>
      prev.map((font) =>
        font.id === selectedFont.id
          ? {
              ...font,
              lastUsedVariableSettings: null,
              lastUsedPresetName: null,
              currentWeight: null,
              currentStyle: null,
            }
          : font
      )
    );

    setSelectedFont((prev) =>
      prev
        ? {
            ...prev,
            lastUsedVariableSettings: null,
            lastUsedPresetName: null,
            currentWeight: null,
            currentStyle: null,
          }
        : null
    );

    if (applyVariableSettings) {
      applyVariableSettings(defaultSettings, true, selectedFont);
    }
    if (selectedFont?.source === 'fontsource') {
      clearFontsourceVariableSettings(selectedFont.name);
    }

    toast.success(`Настройки шрифта "${selectedFont.name}" сброшены`);
  }, [selectedFont, getDefaultAxisValues, applyVariableSettings, setFonts, setSelectedFont, setVariableSettings]);

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
  };
} 

