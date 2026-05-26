import { useCallback } from 'react';
import { PRESET_STYLES } from '../utils/fontUtilsCommon';
import { buildPresetViewStatePatch } from '../utils/fontViewStateWriter';
import { findFontInstanceStyleByName } from '../utils/fontInstanceStyles';

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

    const customStyle =
      Array.isArray(fontToApply.availableStyles) &&
      fontToApply.availableStyles.find((s) => String(s?.name || '').trim() === String(presetName || '').trim());

    const presetInfo = customStyle || PRESET_STYLES.find((p) => p.name === presetName);
    if (!presetInfo) {
      console.warn(`Стиль "${presetName}" не найден.`);
      return;
    }
    const { weight, style } = presetInfo;
    const instanceStyle = findFontInstanceStyleByName(fontToApply, presetName);
    const instanceCoordinates =
      customStyle?.coordinates && typeof customStyle.coordinates === 'object'
        ? customStyle.coordinates
        : instanceStyle?.coordinates && typeof instanceStyle.coordinates === 'object'
          ? instanceStyle.coordinates
          : null;

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
      const italicMode = typeof fontToApply.italicMode === 'string' ? fontToApply.italicMode : 'none';
      const currentFontSettings = variableSettings;
      const newSettings = { ...currentFontSettings };
      let settingsChanged = false;

      if (instanceCoordinates && Object.keys(instanceCoordinates).length > 0) {
        for (const [tag, rawValue] of Object.entries(instanceCoordinates)) {
          if (!(tag in currentAxes)) continue;
          const axis = currentAxes[tag];
          let value = Number(rawValue);
          if (!Number.isFinite(value)) continue;
          if (axis && typeof axis === 'object' && Number.isFinite(Number(axis.min)) && Number.isFinite(Number(axis.max))) {
            const a = Math.min(Number(axis.min), Number(axis.max));
            const b = Math.max(Number(axis.min), Number(axis.max));
            value = Math.min(b, Math.max(a, value));
          }
          if (newSettings[tag] !== value) {
            newSettings[tag] = value;
            settingsChanged = true;
          }
        }
      } else {
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

        const targetItal = style === 'italic' ? 1 : 0;
        const slantAxis = typeof currentAxes.slnt === 'object' ? currentAxes.slnt : undefined;
        const targetSlnt = style === 'italic' ? (slantAxis?.min ?? -15) : (slantAxis?.default ?? 0);

        if (italicMode === 'axis-ital' && 'ital' in currentAxes) {
          if (newSettings.ital !== targetItal) {
            newSettings.ital = targetItal;
            settingsChanged = true;
            if ('slnt' in newSettings) delete newSettings.slnt;
          }
        } else if (italicMode === 'axis-slnt' && 'slnt' in currentAxes) {
          if (newSettings.slnt !== targetSlnt) {
            newSettings.slnt = targetSlnt;
            settingsChanged = true;
            if ('ital' in newSettings) delete newSettings.ital;
          }
        }
      }

      if (settingsChanged) {
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
          // Вес/стиль должны жить и в массиве fonts: иначе эффект в pages/index.jsx
          // подменяет selectedFont объектом из fonts без currentWeight — внизу всегда 400.
          return {
            ...f,
            ...buildPresetViewStatePatch(presetName, {
              clearVariableSettings: !fontToApply.isVariableFont,
              currentWeight: weight,
              currentStyle: style,
            }),
          };
        }
        return f;
      });
    });

    // Сохраняем настройки в IndexedDB через колбэк
    if (onPresetApplied) {
      onPresetApplied(
        fontToApply.id,
        buildPresetViewStatePatch(presetName, {
          clearVariableSettings: !fontToApply.isVariableFont,
          currentWeight: weight,
          currentStyle: style,
        }),
      );
    }

  }, [selectedFont, setSelectedFont, setFonts, variableSettings, applyVariableSettings, loadFontsourceStyleVariant, onPresetApplied]); // Зависимости useCallback

  return {
    applyPresetStyle,
  };
} 
