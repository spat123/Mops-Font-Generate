import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
// import opentype from 'opentype.js';
import { toast } from 'react-toastify';
import { findStyleInfoByWeightAndStyle, PRESET_STYLES } from '../utils/fontUtilsCommon';
import { debouncedUpdateVariableFontSettings } from '../utils/cssGenerator';
import { deleteFontDB } from '../utils/db';
import { revokeObjectURL } from '../utils/localFontProcessor'; // <<< Добавляем импорт revokeObjectURL
import { useFontPersistence } from './useFontPersistence'; // <<< Импортируем новый хук
import { useFontLoader } from './useFontLoader'; // <<< Импортируем useFontLoader
import { useVariableFontControls } from './useVariableFontControls';
import { useFontStyleManager } from './useFontStyleManager'; // <<< Импортируем useFontStyleManager
import { useFontCss } from './useFontCss'; // <<< Импортируем useFontCss
import { useFontExport } from './useFontExport'; // <<< Импортируем useFontExport

/**
 * Хук управления шрифтами в приложении
 * 
 * Этот хук централизует всю логику работы со шрифтами, включая:
 * - Загрузку и парсинг шрифтов (локальных и Google Fonts)
 * - Управление вариативными осями шрифтов
 * - Генерацию CSS для шрифтов
 * - Удаление шрифтов и очистку ресурсов
 * - Создание статических версий вариативных шрифтов
 * 
 * @example
 * // Использование хука в компоненте
 * const {
 *   fonts, 
 *   selectedFont, 
 *   handleFontsUploaded, 
 *   getFontFamily, 
 *   getVariationSettings 
 * } = useFontManager();
 * 
 * @returns {Object} Объект с состоянием и методами для работы со шрифтами
 */
export function useFontManager() {
  const [fonts, setFonts] = useState([]);
  const [selectedFont, setSelectedFont] = useState(null);
  const [variableSettings, setVariableSettings] = useState({});
  const [exportedFont, setExportedFont] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // Референс для отслеживания последнего проанализированного шрифта
  const loadedFontId = useRef(null);
  // <<< Флаг для отслеживания начальной загрузки >>>
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Создаем ref для safeSelectFont, чтобы использовать в колбэках
  const safeSelectFontRef = useRef(null);
  
  // <<< Вызов хука загрузки шрифтов (обновляем коллбэк) >>>
  const { handleLocalFontsUpload, loadAndSelectFontsourceFont, loadFontsourceStyleVariant } = useFontLoader(
    setFonts,
    setIsLoading,
    useCallback((font) => safeSelectFontRef.current?.(font), []),
    fonts
  );
  
  // Создаем ref для saveFontSettings, чтобы использовать в колбэке до его объявления
  const saveFontSettingsRef = useRef(null);
  
  // Создаем ref для saveLastVariableSettings, чтобы использовать до его объявления
  const saveLastVariableSettingsRef = useRef(null);
  
  // <<< Вызов хука управления вариативными шрифтами >>>
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
      debouncedUpdateVariableFontSettings, // Передаем функцию обновления CSS
      useCallback((settings) => {
        console.log('[FontManager] Callback вызван для сохранения настроек:', settings, 'ref доступен:', !!saveLastVariableSettingsRef.current);
        return saveLastVariableSettingsRef.current?.(settings);
      }, []) // Передаем ref через callback
  );

  // Колбэк для сохранения настроек пресета в IndexedDB
  const handlePresetApplied = useCallback((fontId, settings) => {
    if (saveFontSettingsRef.current) {
      saveFontSettingsRef.current(fontId, settings);
    }
  }, []);

  // <<< Вызов хука управления стилями >>>
  const {
      applyPresetStyle // Получаем функцию из нового хука
  } = useFontStyleManager(
      selectedFont,
      setSelectedFont,
      setFonts,
      variableSettings,
      applyVariableSettings, // Передаем функцию из useVariableFontControls
      loadFontsourceStyleVariant, // Передаем функцию из useFontLoader
      handlePresetApplied // Передаем колбэк для сохранения в IndexedDB
  );

  // <<< Вызов хука персистентности (ПОСЛЕ объявления applyVariableSettings и applyPresetStyle) >>>
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
    console.log('[FontManager] Обновляем saveLastVariableSettingsRef:', typeof saveLastVariableSettings);
    saveLastVariableSettingsRef.current = saveLastVariableSettings;
  }, [saveLastVariableSettings]);

  // <<< Производные состояния >>>
  const isSelectedFontVariable = useMemo(() => selectedFont?.isVariableFont || false, [selectedFont]);

  // <<< Вызов хука управления CSS >>>
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

  // <<< Вызов хука экспорта >>>
  const {
      downloadFile,
      exportToCSS: exportToCSSFromExportHook,
      createStaticFont: createStaticFontFromExportHook,
      generateStaticFontFile,
      downloadStaticFont
  } = useFontExport(exportToCSSFromHook);

  /**
   * Безопасно выбирает шрифт и применяет к нему базовые настройки
   * @param {Object} font - Объект шрифта для выбора
   */
  const safeSelectFont = useCallback((font) => {
    if (!font) {
      console.warn('[safeSelectFont] Попытка выбрать null/undefined шрифт');
      return;
    }
    
    console.log(`[safeSelectFont] Выбираем шрифт: ${font.name || font.displayName}`);
    
    // Устанавливаем выбранный шрифт
    setSelectedFont(font);
    
    // Проверяем, есть ли сохраненные настройки для этого шрифта
    let settingsApplied = false;
    
    // Приоритет 1: Сохраненные настройки осей для вариативного шрифта
    if (font.isVariableFont && font.lastUsedVariableSettings) {
      console.log('[safeSelectFont] Восстанавливаем сохраненные оси:', font.lastUsedVariableSettings);
      setVariableSettings(font.lastUsedVariableSettings);
      // Применяем настройки через setTimeout для корректной работы
      setTimeout(() => {
        if (applyVariableSettings) {
          applyVariableSettings(font.lastUsedVariableSettings, true, font);
        }
      }, 0);
      settingsApplied = true;
    }
    // Приоритет 2: Сохраненный пресет
    else if (font.lastUsedPresetName && applyPresetStyle) {
      console.log('[safeSelectFont] Восстанавливаем сохраненный пресет:', font.lastUsedPresetName);
      // Убираем setTimeout - выполняем синхронно, чтобы currentWeight/currentStyle обновились
      applyPresetStyle(font.lastUsedPresetName, font);
      settingsApplied = true;
    }
    
    // Если настройки не были восстановлены, применяем дефолтные
    if (!settingsApplied) {
      if (font.isVariableFont && font.variableAxes) {
        // Получаем дефолтные значения из хука
        const defaultAxes = getDefaultAxisValues?.(font) || {};
        console.log('[safeSelectFont] Применяем дефолтные оси для вариативного шрифта:', defaultAxes);
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
      
      console.log(`[selectedPresetName] Вычисляем для шрифта: ${selectedFont.name}`, {
        lastUsedPresetName: selectedFont.lastUsedPresetName,
        currentWeight: selectedFont.currentWeight,
        currentStyle: selectedFont.currentStyle,
        isVariableFont: selectedFont.isVariableFont,
        variableSettings: variableSettings
      });
      
      // Приоритет 1: Для статических шрифтов используем currentWeight/currentStyle
      if (!selectedFont.isVariableFont) {
        // Сначала пытаемся определить по текущему весу и стилю
        if (selectedFont.currentWeight !== undefined && selectedFont.currentStyle !== undefined) {
          const styleInfo = findStyleInfoByWeightAndStyle(
              selectedFont.currentWeight, 
              selectedFont.currentStyle
          );
          const presetName = styleInfo?.name || 'Regular';
          console.log(`[selectedPresetName] Статический шрифт по текущему весу/стилю: ${presetName} (${selectedFont.currentWeight}, ${selectedFont.currentStyle})`);
          return presetName;
        }
        
        // Если currentWeight/currentStyle не установлены, используем сохраненный пресет
        if (selectedFont.lastUsedPresetName) {
          console.log(`[selectedPresetName] Статический шрифт с сохраненным пресетом: ${selectedFont.lastUsedPresetName}`);
          return selectedFont.lastUsedPresetName;
        }
        
        // По умолчанию
        console.log(`[selectedPresetName] Статический шрифт по умолчанию: Regular`);
        return 'Regular';
      }
      
      // Приоритет 2: Для вариативных шрифтов с настройками осей, определяем пресет по осям
      if (selectedFont.isVariableFont && variableSettings && Object.keys(variableSettings).length > 0) {
        // Пытаемся найти пресет, который соответствует текущим настройкам осей
        const currentWeight = variableSettings.wght || 400;
        const currentStyle = (variableSettings.ital === 1 || (variableSettings.slnt && variableSettings.slnt < 0)) ? 'italic' : 'normal';
        
        const matchedPreset = findStyleInfoByWeightAndStyle(currentWeight, currentStyle);
        if (matchedPreset) {
          console.log(`[selectedPresetName] Вариативный шрифт по осям: ${matchedPreset.name}`);
          return matchedPreset.name;
        }
      }
      
      // Приоритет 3: Если есть сохраненный пресет, используем его
      if (selectedFont.lastUsedPresetName) {
        console.log(`[selectedPresetName] Сохраненный пресет: ${selectedFont.lastUsedPresetName}`);
        return selectedFont.lastUsedPresetName;
      }
      
      // Приоритет 4: По умолчанию Regular
      console.log(`[selectedPresetName] По умолчанию: Regular`);
      return 'Regular';
  }, [selectedFont, variableSettings]);

  // <<< Сохранение настроек при переключении шрифтов >>>
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
      
      console.log(`[FontSwitch] Сохраняем настройки для предыдущего шрифта: ${prevFont.name}`);
      
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
            console.log(`[FontSwitch] Сохранены оси для ${prevFont.name}:`, updatedFont.lastUsedVariableSettings);
          } else if (prevPresetName && prevPresetName !== 'Regular') {
            updatedFont.lastUsedPresetName = prevPresetName;
            updatedFont.lastUsedVariableSettings = null; // Очищаем оси, если есть пресет
            dbUpdates.lastUsedPresetName = prevPresetName;
            dbUpdates.lastUsedVariableSettings = null;
            console.log(`[FontSwitch] Сохранен пресет для ${prevFont.name}:`, updatedFont.lastUsedPresetName);
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

  // Убираем старый код loadInitialState, так как теперь useFontPersistence работает напрямую

  // Мемоизированные доступные стили и имя выбранного пресета
  const availableStyles = useMemo(() => {
      if (!selectedFont) return [];
      
      console.log('[useMemo availableStyles] selectedFont:', selectedFont?.name, 'selectedFont.availableStyles:', selectedFont?.availableStyles);
      
      // Удаляем специальную логику для Google Fonts
      /*
      if (selectedFont.source === 'google') {
        // Для Google шрифтов берем стили из карты или дефолтные
        const styles = GOOGLE_FONT_STYLES_MAP[selectedFont.name] || [
            PRESET_STYLES.find(p => p.name === 'Regular'),
            PRESET_STYLES.find(p => p.name === 'Bold')
        ].filter(Boolean);
        return styles;
      } else */ 
      
      // Если шрифт вариативный, возвращаем все пресеты (для UI выбора)
      if (selectedFont.isVariableFont) {
          return PRESET_STYLES;
      // Если у шрифта есть поле availableStyles (из Fontsource или локального парсинга)
      } else if (selectedFont.availableStyles && Array.isArray(selectedFont.availableStyles)) {
          // Убедимся, что стили имеют нужный формат {name, weight, style}
          // Если формат уже правильный, просто возвращаем
          if (selectedFont.availableStyles.every(s => s.name && s.weight && s.style)) {
          return selectedFont.availableStyles;
          }
          // Если формат другой (например, из Fontsource metadata), нужно будет его преобразовать
          // Пока просто возвращаем пустой массив или базовые, если преобразование не реализовано
          // TODO: Добавить преобразование из формата Fontsource metadata, если он отличается
          console.warn('Формат availableStyles отличается от ожидаемого, требуется преобразование.');
          return [
              PRESET_STYLES.find(p => p.name === 'Regular'),
              PRESET_STYLES.find(p => p.name === 'Bold')
          ].filter(Boolean);
      // Иначе возвращаем базовые стили
      } else {
          return [
              PRESET_STYLES.find(p => p.name === 'Regular'),
              PRESET_STYLES.find(p => p.name === 'Bold')
          ].filter(Boolean);
      }
  }, [selectedFont]);

  // Мемоизированный флаг вариативного шрифта (перенесено в useFontCss)
  
  // Мемоизированное имя шрифта
  const selectedFontName = useMemo(() => {
    return selectedFont ? selectedFont.name : '';
  }, [selectedFont]);
  
  // Мемоизированные оси шрифта
  const selectedFontAxes = useMemo(() => {
    return selectedFont && selectedFont.variableAxes ? selectedFont.variableAxes : {};
  }, [selectedFont]);
  
  /**
   * Создает статическую версию вариативного шрифта с текущими настройками осей
   * 
   * @example
   * // Создание статической версии текущего шрифта
   * const staticFont = createStaticFont();
   * console.log(staticFont.name); // Имя статического шрифта
   * 
   * @returns {Object|undefined} Объект статического шрифта или undefined, если нет выбранного шрифта
   */
  const createStaticFont = useCallback(() => {
    return createStaticFontFromExportHook(selectedFont, selectedFontName, variableSettings, setExportedFont);
  }, [createStaticFontFromExportHook, selectedFont, selectedFontName, variableSettings, setExportedFont]);
  
  /**
   * Обрабатывает загруженные шрифты: анализирует файлы, определяет характеристики и
   * добавляет шрифты в состояние приложения
   * 
   * @example
   * // Обработка шрифтов из input[type="file"]
   * const handleFileUpload = (e) => {
   *   const files = Array.from(e.target.files).map(file => ({
   *     file,
   *     name: file.name,
   *     url: URL.createObjectURL(file)
   *   }));
   *   handleFontsUploaded(files);
   * };
   * 
   * @param {Array} newFonts - Массив объектов с информацией о новых шрифтах
   * @returns {Promise<void>}
   */
  const handleFontsUploaded = useCallback(async (newFonts) => {
    console.log('[handleFontsUploaded] Получены шрифты:', newFonts);
    // Используем функцию из useFontLoader
    const result = await handleLocalFontsUpload(newFonts);
    console.log('[handleFontsUploaded] handleLocalFontsUpload завершен');
    return result;
  }, [handleLocalFontsUpload]);
  
  /**
   * Удаляет шрифт и освобождает ресурсы
   * Если удаляется текущий выбранный шрифт, выбирает следующий доступный
   * 
   * @example
   * // Кнопка удаления шрифта
   * <button onClick={() => removeFont(font.id)}>
   *   Удалить
   * </button>
   * 
   * @param {string} fontId - ID шрифта для удаления
   */
  const removeFont = useCallback((fontId) => {
    let removedFontFamily = null; 

    setFonts(prev => {
      const fontToRemove = prev.find(f => f.id === fontId);
      if (fontToRemove) {
         removedFontFamily = fontToRemove.fontFamily; // Сохраняем имя для очистки
         if (fontToRemove.url) {
        // Освобождаем URL для предотвращения утечек памяти
             revokeObjectURL(fontToRemove.url);
         }
         // <<< Удаляем из IndexedDB >>>
         deleteFontDB(fontId).catch(err => {
            console.error(`[DB] Ошибка удаления шрифта ${fontId} из DB:`, err);
            toast.error('Ошибка удаления шрифта из базы данных.');
            // Что делать в этом случае? Возможно, ничего, шрифт останется в DB.
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
            // Устанавливаем стиль Regular для нового шрифта
            const presetName = 'Regular';
            safeSelectFontRef.current?.(newFont);

          }, 0);
        } else {
          setSelectedFont(null);
        }
      }
      
      return updatedFonts;
    });
    
    toast.success('Шрифт удален');

    // Очистка FontFace из document.fonts (необязательно, но хорошо для гигиены)
    // if (removedFontFamily && document.fonts) {
    //    document.fonts.delete(removedFontFamily);
    // }
  }, [selectedFont, deleteFontDB, setFonts, setSelectedFont]);

  // Обертки для совместимости с предыдущим API
  const exportToCSS = useCallback((download = false) => {
    return exportToCSSFromExportHook(selectedFont, selectedFontName, download);
  }, [exportToCSSFromExportHook, selectedFont, selectedFontName]);
  
  /**
   * Выбирает (или загружает, если ещё не загружен) шрифт Fontsource
   * @param {string} fontFamilyName - Название семейства шрифтов
   * @param {boolean} forceVariableFont - Загружать вариативный шрифт (если доступен)
   */
  const selectOrAddFontsourceFont = useCallback(async (fontFamilyName, forceVariableFont = false) => {
    // Просто перенаправляем на функцию из useFontLoader
    return loadAndSelectFontsourceFont(fontFamilyName, forceVariableFont);
  }, [loadAndSelectFontsourceFont]);
  
  // <<< Функция полного сброса >>>
  const resetApplicationState = useCallback(async () => {
    console.log("[Reset] Запуск полного сброса состояния приложения...");
    try {
      // 1. Очищаем хранилища (IndexedDB и localStorage) через новый хук
      await resetPersistence(); // <<< Вызываем сброс персистентности
      toast.info("Локальное хранилище данных очищено."); // Обновляем сообщение

      // 2. Очищаем состояния хука (остается как было)
      setFonts([]);
      setSelectedFont(null);
      setVariableSettings({});
      setExportedFont(null);
      setIsLoading(false); // Сбрасываем флаг загрузки
      // isInitialLoadComplete останется true, т.к. начальная загрузка была
      console.log("[Reset] Состояния useFontManager сброшены.");


      // 4. Вызываем сброс других контекстов (пока только SettingsContext)
      // resetSettings(); // Вызов будет в компоненте кнопки

      toast.success("Состояние приложения успешно сброшено!");

    } catch (error) {
      console.error("[Reset] Ошибка во время сброса состояния:", error);
      toast.error("Произошла ошибка при сбросе состояния.");
    }
  }, [setFonts, setSelectedFont, setVariableSettings, setExportedFont, setIsLoading, resetPersistence]); // Добавляем зависимости сеттеров

  // Убираем старые useEffect, связанные с loadInitialState

  return {
    // Состояния
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
    
    // Методы управления состоянием
    setFonts,
    setSelectedFont,
    setVariableSettings,
    setExportedFont,
    
    // Методы загрузки (из useFontLoader)
    handleLocalFontsUpload, 
    handleFontsUploaded, // Правильная функция-обертка
    loadAndSelectFontsourceFont,
    selectOrAddFontsourceFont, // Добавляем также этот алиас
    
    // Методы управления шрифтами 
    removeFont,
    safeSelectFont,
    
    // <<< Методы работы с вариативными осями из useVariableFontControls >>>
    getVariableAxesInfo,
    getVariableAxes: getVariableAxesInfo, // Алиас для обратной совместимости
    applyVariableSettings,
    handleVariableSettingsChange: applyVariableSettings, // Алиас для обратной совместимости
    resetVariableSettings,
    getDefaultAxisValues,
    
    // Методы для стилей шрифта
    applyPresetStyle,
    
    // Методы для CSS
    getFontFamily,
    getVariationSettings,
    generateCSS,
    exportToCSS,
    fontCssProperties,
    
    // Методы экспорта и скачивания (из useFontExport)
    downloadFile,
    generateStaticFontFile,
    downloadStaticFont,
    
    // Прочие методы
    createStaticFont,
    resetApplicationState,
    
    // Методы персистентности
    saveFontSettings,
  };
} 