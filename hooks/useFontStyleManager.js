import { useCallback } from 'react';
import { PRESET_STYLES } from '../utils/fontUtilsCommon';

/** Пресеты вес/курсив, VF-оси, догрузка стилей Fontsource. */
export function useFontStyleManager(
  selectedFont,
  setSelectedFont,
  setFonts,
  variableSettings,
  applyVariableSettings,
  loadFontsourceStyleVariant,
  onPresetApplied
) {

  const applyPresetStyle = useCallback(async (presetName, font = null) => {
    const fontToApply = font || selectedFont;
    if (!fontToApply) return;

    const presetInfo = PRESET_STYLES.find(p => p.name === presetName);
    if (!presetInfo) {
      console.warn(`Пресет "${presetName}" не найден.`);
      return;
    }
    const { weight, style } = presetInfo;

    // Внутренняя функция для обновления состояния selectedFont, если необходимо
    const updateSelectedFontStateIfNeeded = () => {
      // Обновляем selectedFont если:
      // 1. Применяем стиль к текущему выбранному шрифту
      // 2. selectedFont еще не установлен, но fontToApply есть (восстановление)
      // 3. fontToApply - это тот шрифт, который должен стать selectedFont (при переключении)
      if ((selectedFont && fontToApply.id === selectedFont.id) || 
          (!selectedFont && fontToApply) ||
          (font && fontToApply.id === font.id)) {
        setSelectedFont(prevSelected => {
          // Случай 1: prevSelected есть и это тот же шрифт - обновляем его
          if (prevSelected && prevSelected.id === fontToApply.id) {
             return { ...prevSelected, currentWeight: weight, currentStyle: style };
          }
          // Случай 2: prevSelected нет или это другой шрифт, но fontToApply есть - устанавливаем fontToApply как selectedFont
          else if (fontToApply) {
             return { ...fontToApply, currentWeight: weight, currentStyle: style };
          }
          return prevSelected; // Возвращаем старое состояние в остальных случаях
        });
      }
    };

    // Логика для невариативных Fontsource шрифтов
    if (fontToApply.source === 'fontsource' && !fontToApply.isVariableFont) {
      // Проверяем, был ли стиль загружен ранее
      const styleIsLoaded = fontToApply.loadedStyles?.some(s => s.weight === weight && s.style === style);
      if (!styleIsLoaded) {
        // Загружаем нужный стиль
        if (loadFontsourceStyleVariant) {
          try {
            loadFontsourceStyleVariant(fontToApply.name, weight, style, fontToApply);
          } catch (error) {
            console.error(`[applyPresetStyle] Ошибка загрузки стиля ${presetName}:`, error);
          }
        }
      }
    }
    // Логика для вариативных шрифтов
    else if (fontToApply.isVariableFont) {
      const currentAxes = fontToApply.variableAxes || {};
      // Используем актуальные настройки из variableSettings (переданные в хук)
      const currentFontSettings = variableSettings; 
      const newSettings = { ...currentFontSettings }; // Копируем текущие настройки
      let settingsChanged = false;

      // Обновляем 'wght', если ось существует
      if ('wght' in currentAxes) {
        const wAxis = currentAxes.wght;
        let w = weight;
        if (wAxis && typeof wAxis === 'object' && Number.isFinite(Number(wAxis.min)) && Number.isFinite(Number(wAxis.max))) {
          const a = Math.min(Number(wAxis.min), Number(wAxis.max));
          const b = Math.max(Number(wAxis.min), Number(wAxis.max));
          w = Math.min(b, Math.max(a, w));
        }
        if (newSettings.wght !== w) {
          newSettings.wght = w;
          settingsChanged = true;
        }
      }

      // Обновляем 'ital' или 'slnt' в зависимости от стиля пресета
      const targetItal = style === 'italic' ? 1 : 0;
      const slantAxis = typeof currentAxes.slnt === 'object' ? currentAxes.slnt : undefined;
      // Определяем целевое значение 'slnt'. Если стиль 'italic', используем min оси (или -15), иначе default (или 0)
      const targetSlnt = style === 'italic' ? (slantAxis?.min ?? -15) : (slantAxis?.default ?? 0);

      if ('ital' in currentAxes) { // Если есть ось 'ital'
        if (newSettings.ital !== targetItal) {
          newSettings.ital = targetItal;
          settingsChanged = true;
          // Если есть 'slnt', удаляем его, т.к. 'ital' имеет приоритет
          if ('slnt' in newSettings) delete newSettings.slnt; 
        }
      } else if ('slnt' in currentAxes) { // Иначе, если есть ось 'slnt'
        if (newSettings.slnt !== targetSlnt) {
          newSettings.slnt = targetSlnt;
          settingsChanged = true;
           // Если есть 'ital', удаляем его (хотя не должно быть по логике выше)
          if ('ital' in newSettings) delete newSettings.ital; 
        }
      }

      // Если настройки осей изменились, вызываем applyVariableSettings
      if (settingsChanged) {
        // Передаем isFinalUpdate = true, и сам объект шрифта fontToApply
        applyVariableSettings(newSettings, true, fontToApply);
      }
    }

    // ВАЖНО: Обновляем selectedFont для ВСЕХ типов шрифтов (только один раз в конце)
    updateSelectedFontStateIfNeeded();

    // Обновляем lastUsedPresetName в общем массиве шрифтов
    // Это нужно делать всегда, независимо от того, изменились ли оси
    setFonts(currentFonts => {
      if (!Array.isArray(currentFonts)) {
        console.warn('[applyPresetStyle] currentFonts не является массивом:', currentFonts);
        return currentFonts; // Возвращаем как есть, если не массив
      }
      return currentFonts.map(f => {
        if (f.id === fontToApply.id) {
          // Для вариативных шрифтов НЕ сбрасываем lastUsedVariableSettings,
          // так как пресет может изменить оси, и мы хотим сохранить эти изменения
          if (fontToApply.isVariableFont) {
            return { ...f, lastUsedPresetName: presetName };
          } else {
            // Для статических шрифтов сбрасываем variableSettings и сохраняем пресет
            return { ...f, lastUsedPresetName: presetName, lastUsedVariableSettings: null };
          }
        }
        return f;
      });
    });

    // Сохраняем настройки в IndexedDB через колбэк
    if (onPresetApplied) {
      const settingsToSave = {
        lastUsedPresetName: presetName,
        currentWeight: weight,
        currentStyle: style
      };
      
      // Для статических шрифтов очищаем lastUsedVariableSettings
      if (!fontToApply.isVariableFont) {
        settingsToSave.lastUsedVariableSettings = null;
      }

      onPresetApplied(fontToApply.id, settingsToSave);
    }

  }, [selectedFont, setSelectedFont, setFonts, variableSettings, applyVariableSettings, loadFontsourceStyleVariant, onPresetApplied]); // Зависимости useCallback

  return {
    applyPresetStyle,
  };
} 