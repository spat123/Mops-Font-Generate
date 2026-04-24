import { useCallback, useRef } from 'react';
import { formatFontVariationSettings } from '../utils/fontVariationSettings';
import { buildVariableSettingsViewStatePatch } from '../utils/fontViewStateWriter';

const fontMetadataCache = new Map();

/** Оси VF: применение, сброс, список осей для UI. */
export function useVariableFontControls(
  selectedFont,
  variableSettings,
  setVariableSettings,
  setSelectedFont,
  setFonts,
  debouncedUpdateCssSettings,
  saveLastVariableSettings,
  saveFontsourceVariableSettings = null
) {

  const applyVariableSettingsRef = useRef(null);

  const applyVariableSettings = useCallback((newSettings, isFinalUpdate = false, font = null, opts = {}) => {
    const skipSideEffects = opts.skipSideEffects === true;
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

    if (!skipSideEffects) {
      // Обновляем объект selectedFont асинхронно
      setSelectedFont(prevFont => {
        if (!prevFont || prevFont.id !== fontToApply.id) return prevFont;

        const variationSettingsStr = formatFontVariationSettings(updatedSettings, { fallback: 'normal' });

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

      // Обновляем lastUsedVariableSettings в общем массиве шрифтов
      setFonts(currentFonts => currentFonts.map(f => {
        if (f.id === fontToApply.id) {
          return { ...f, ...buildVariableSettingsViewStatePatch(updatedSettings) };
        }
        return f;
      }));
    }

    // Обновляем CSS (если финальное изменение)
    if (isFinalUpdate && typeof debouncedUpdateCssSettings === 'function') {
       // Передаем сам объект шрифта, актуальные и предыдущие настройки
      debouncedUpdateCssSettings(fontToApply, updatedSettings, prevSettings);
    }

    // Сохраняем настройки в localStorage при финальном обновлении
    if (isFinalUpdate && typeof saveLastVariableSettings === 'function') {
      saveLastVariableSettings(updatedSettings);
    }
    if (
      isFinalUpdate &&
      typeof saveFontsourceVariableSettings === 'function' &&
      fontToApply?.source === 'fontsource' &&
      fontToApply?.isVariableFont
    ) {
      saveFontsourceVariableSettings(fontToApply, updatedSettings);
    }

  }, [selectedFont, variableSettings, setVariableSettings, setSelectedFont, setFonts, debouncedUpdateCssSettings, saveLastVariableSettings, saveFontsourceVariableSettings]);

  applyVariableSettingsRef.current = applyVariableSettings;

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

  const resetVariableSettings = useCallback(() => {
    const defaultSettings = getDefaultAxisValues();
    if (Object.keys(defaultSettings).length > 0) {
      applyVariableSettingsRef.current?.(defaultSettings, true);
    }
    return defaultSettings;
  }, [getDefaultAxisValues]);

  /** Оси из объекта шрифта / кэша; парсинг файла не реализован. */
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

    if (fontId && fontMetadataCache.has(fontId)) {
      return fontMetadataCache.get(fontId);
    }

    console.warn(`[VarControls] Не удалось получить оси для ${targetFont.name}. Нет данных в объекте или кэше, парсинг файла не реализован.`);
    return [];
  }, [selectedFont]);

  return {
    applyVariableSettings,
    getDefaultAxisValues,
    resetVariableSettings,
    getVariableAxesInfo,
  };
}
 
