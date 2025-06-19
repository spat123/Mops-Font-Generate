import { useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
// import opentype from 'opentype.js'; // opentype нужен для getVariableAxes, если парсим файл

// Кэш для хранения метаданных шрифтов (перенесен из useFontManager)
const fontMetadataCache = new Map();

/**
 * Хук для управления настройками вариативных шрифтов.
 * @param {Object} selectedFont - Текущий выбранный объект шрифта.
 * @param {Object} variableSettings - Текущие настройки вариативных осей.
 * @param {Function} setVariableSettings - Функция для обновления состояния настроек осей.
 * @param {Function} setSelectedFont - Функция для обновления состояния выбранного шрифта.
 * @param {Function} setFonts - Функция для обновления всего массива шрифтов (для сохранения lastUsedVariableSettings).
 * @param {Function} debouncedUpdateCssSettings - Debounced функция для обновления CSS (переименована из debouncedUpdateVariableFontSettings).
 * @param {Function} saveLastVariableSettings - Функция для сохранения настроек в localStorage.
 */
export function useVariableFontControls(
  selectedFont,
  variableSettings,
  setVariableSettings,
  setSelectedFont,
  setFonts,
  debouncedUpdateCssSettings,
  saveLastVariableSettings
) {

  // Реф для applyVariableSettings, если он будет вызываться из других функций этого хука
  const applyVariableSettingsRef = useRef(null);

  /**
   * Применяет новые настройки к вариативному шрифту.
   * (Перенесено из useFontManager, переименовано из handleVariableSettingsChange)
   * @param {Object} newSettings - Новые значения осей.
   * @param {boolean} isFinalUpdate - Флаг финального обновления (для CSS).
   * @param {Object|null} font - Шрифт для применения (по умолчанию selectedFont).
   */
  const applyVariableSettings = useCallback((newSettings, isFinalUpdate = false, font = null) => {
    const fontToApply = font || selectedFont;
    if (!fontToApply || !fontToApply.isVariableFont) return;

    const prevSettings = { ...variableSettings }; // Сохраняем предыдущие для CSS

    let hasChanges = false;
    Object.keys(newSettings).forEach(tag => {
      if (variableSettings[tag] !== newSettings[tag]) hasChanges = true;
    });
    if (!hasChanges && !isFinalUpdate) return; // Выходим если нет изменений И это не финальный апдейт (финальный может быть без изменений)

    setVariableSettings(currentPrevSettings => ({ ...currentPrevSettings, ...newSettings }));

    const updatedSettings = { ...variableSettings, ...newSettings };

    // Обновляем объект selectedFont асинхронно
    setSelectedFont(prevFont => {
      if (!prevFont || prevFont.id !== fontToApply.id) return prevFont;

      const variationSettingsStr = Object.entries(updatedSettings)
        .map(([tag, value]) => `\"${tag}\" ${value}`)
        .join(', ');

      const updatedAxes = { ...fontToApply.variableAxes };
      Object.entries(updatedSettings).forEach(([tag, value]) => {
        if (updatedAxes[tag]) {
          if (typeof updatedAxes[tag] === 'object') {
            updatedAxes[tag] = { ...updatedAxes[tag], currentValue: value };
          } else {
            updatedAxes[tag] = { min: value * 0.5, max: value * 1.5, default: value, currentValue: value, name: tag.charAt(0).toUpperCase() + tag.slice(1) };
          }
        }
      });

      return { ...prevFont, variableAxes: updatedAxes, variationSettings: variationSettingsStr };
    });

    // Обновляем CSS (если финальное изменение)
    if (isFinalUpdate && typeof debouncedUpdateCssSettings === 'function') {
       // Передаем сам объект шрифта, актуальные и предыдущие настройки
      debouncedUpdateCssSettings(fontToApply, updatedSettings, prevSettings);
    }

    // Сохраняем настройки в localStorage при финальном обновлении
    if (isFinalUpdate && typeof saveLastVariableSettings === 'function') {
      console.log(`[VarControls] Сохраняем настройки в localStorage:`, updatedSettings);
      saveLastVariableSettings(updatedSettings);
    }

    // Обновляем lastUsedVariableSettings в общем массиве шрифтов
    setFonts(currentFonts => currentFonts.map(f => {
      if (f.id === fontToApply.id) {
        console.log(`[VarControls] Обновляем lastUsedVariableSettings для ${f.name}:`, updatedSettings);
        return { ...f, lastUsedVariableSettings: updatedSettings, lastUsedPresetName: null };
      }
      return f;
    }));

  }, [selectedFont, variableSettings, setVariableSettings, setSelectedFont, setFonts, debouncedUpdateCssSettings, saveLastVariableSettings]);

  // Обновляем реф при каждом изменении функции
  applyVariableSettingsRef.current = applyVariableSettings;

  /**
   * Получает дефолтные значения осей для текущего шрифта.
   * (Перенесено из useFontManager)
   */
  const getDefaultAxisValues = useCallback(() => {
    if (!selectedFont || !selectedFont.variableAxes) return {};
    
    const defaultSettings = {};
    Object.entries(selectedFont.variableAxes).forEach(([tag, axisData]) => {
      if (typeof axisData === 'object' && axisData.default !== undefined) {
        defaultSettings[tag] = axisData.default;
      } else if (typeof axisData === 'number') {
        defaultSettings[tag] = axisData; // Если вдруг ось - просто число
      }
    });
    return defaultSettings;
  }, [selectedFont]);

  /**
   * Сбрасывает настройки осей к дефолтным значениям.
   * (Перенесено из useFontManager)
   */
  const resetVariableSettings = useCallback(() => {
    const defaultSettings = getDefaultAxisValues();
    if (Object.keys(defaultSettings).length > 0) {
      // Используем applyVariableSettings через реф
      applyVariableSettingsRef.current?.(defaultSettings, true); // isFinalUpdate = true для обновления CSS
    }
    return defaultSettings; // Возвращаем на всякий случай
  }, [getDefaultAxisValues]);

  /**
   * Извлекает информацию о вариативных осях шрифта.
   * (Перенесено из useFontManager)
   * TODO: Рассмотреть возможность использования opentype.js здесь или вынести в утилиты.
   */
  const getVariableAxesInfo = useCallback(async (font) => {
    const targetFont = font || selectedFont;
    if (!targetFont) return [];

    const fontId = targetFont.id || null;

    if (targetFont.isVariableFont === false) return [];

    // 1. Используем существующие данные, если есть
    if (targetFont.variableAxes && Object.keys(targetFont.variableAxes).length > 0) {
      const fontAxes = Object.entries(targetFont.variableAxes).map(([tag, axisData]) => ({
        tag,
        name: axisData.name || tag,
        min: axisData.min,
        max: axisData.max,
        default: axisData.default,
        // Добавляем текущее значение для UI
        current: typeof axisData.currentValue !== 'undefined' ? axisData.currentValue : axisData.default
      }));
      // Фильтрация по supportedAxes (если есть)
      let filteredAxes = fontAxes;
      if (targetFont.supportedAxes?.length > 0) {
          filteredAxes = fontAxes.filter(axis => targetFont.supportedAxes.includes(axis.tag));
          if (filteredAxes.length === 0) filteredAxes = fontAxes; // Показать все, если фильтр ничего не дал
      }
      return filteredAxes;
    }

    // 2. Используем кэш
    if (fontId && fontMetadataCache.has(fontId)) {
      return fontMetadataCache.get(fontId);
    }

    // 3. Парсим файл (если есть и если opentype.js доступен)
    // TODO: Добавить проверку на opentype.js и реализовать парсинг, если нужно
    /*
    if (targetFont.file instanceof Blob && typeof opentype !== 'undefined') {
      try {
        const fontData = await parseFontFile(targetFont.file); // Нужна функция parseFontFile
        if (fontData?.tables?.fvar) {
          const axes = fontData.tables.fvar.axes.map(axis => ({ ... }));
          if (fontId) fontMetadataCache.set(fontId, axes);
          return axes;
        } else {
          if (fontId) fontMetadataCache.set(fontId, []);
          return [];
        }
      } catch (error) {
        toast.error(`Ошибка парсинга шрифта: ${error.message}`);
        return [];
      }
    }
    */

    console.warn(`[VarControls] Не удалось получить оси для ${targetFont.name}. Нет данных в объекте или кэше, парсинг файла не реализован.`);
    return []; // Возвращаем пустой массив, если оси не найдены/не спарсены
  }, [selectedFont]); // Зависит только от selectedFont (для дефолта) и кэша

  return {
    applyVariableSettings,
    getDefaultAxisValues,
    resetVariableSettings,
    getVariableAxesInfo, // Переименовано из getVariableAxes
  };
} 