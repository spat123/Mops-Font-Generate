import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { PRESET_STYLES } from '../utils/fontUtilsCommon';
import { buildPresetViewStatePatch } from '../utils/fontViewStateWriter';
import { findFontInstanceStyleByName } from '../utils/fontInstanceStyles';
import { buildVariableSettingsForPresetApply } from '../utils/presetVariableSettings';
import { fontStyleDbg } from '../utils/fontStyleDebugLog';
import type { SessionFontRecord } from '../types/editorFonts';

/** Пресеты вес/курсив, VF-оси, догрузка стилей Fontsource. */
export function useFontStyleManager(
  selectedFont: SessionFontRecord | null,
  setSelectedFont: Dispatch<SetStateAction<SessionFontRecord | null>>,
  setFonts: Dispatch<SetStateAction<SessionFontRecord[]>>,
  variableSettings: Record<string, number>,
  applyVariableSettings: (
    settings: Record<string, number>,
    isFinal?: boolean,
    font?: SessionFontRecord | null,
  ) => void,
  loadFontsourceStyleVariant?: (
    name: string,
    weight: number,
    style: string,
    font: SessionFontRecord,
  ) => Promise<Blob | null | undefined>,
  onPresetApplied?: (fontId: string, patch: Record<string, unknown>) => void,
) {
  const applyPresetStyle = useCallback(async (presetName: string, font: SessionFontRecord | null = null) => {
    const fontToApply = font || selectedFont;
    if (!fontToApply) return;

    fontStyleDbg('applyPresetStyle start', {
      presetName,
      fontId: fontToApply.id,
      source: fontToApply.source,
      isVariable: Boolean(fontToApply.isVariableFont),
      before: { currentWeight: fontToApply.currentWeight, currentStyle: fontToApply.currentStyle },
    });

    const customStyle =
      Array.isArray(fontToApply.availableStyles) &&
      fontToApply.availableStyles.find((s) => String(s?.name || '').trim() === String(presetName || '').trim());

    const presetInfo = customStyle || PRESET_STYLES.find((p) => p.name === presetName);
    if (!presetInfo) {
      console.warn(`Стиль "${presetName}" не найден.`);
      fontStyleDbg('applyPresetStyle not found', { presetName, fontId: fontToApply.id });
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
            const loadedStyles = Array.isArray(fontToApply.loadedStyles)
              ? [...fontToApply.loadedStyles]
              : prevSelected.loadedStyles;
            return {
              ...prevSelected,
              currentWeight: weight,
              currentStyle: style,
              ...(loadedStyles ? { loadedStyles } : {}),
            };
          } else if (fontToApply) {
            return { ...fontToApply, currentWeight: weight, currentStyle: style };
          }
          return prevSelected; // Возвращаем старое состояние в остальных случаях
        });
      }
    };

    // Логика для невариативных Fontsource шрифтов
    if (fontToApply.source === 'fontsource' && !fontToApply.isVariableFont) {
      const styleIsLoaded = fontToApply.loadedStyles?.some(
        (s) => s.weight === weight && s.style === style,
      );
      if (!styleIsLoaded && loadFontsourceStyleVariant) {
        try {
          const res = await loadFontsourceStyleVariant(fontToApply.name, weight, style, fontToApply);
          if (res === null) {
            fontStyleDbg('applyPresetStyle fontsource load FAIL', {
              presetName,
              fontId: fontToApply.id,
              weight,
              style,
            });
            return;
          }
        } catch (error) {
          console.error(`[applyPresetStyle] Ошибка загрузки стиля ${presetName}:`, error);
          fontStyleDbg('applyPresetStyle fontsource load exception', {
            presetName,
            fontId: fontToApply.id,
            weight,
            style,
            err: error instanceof Error ? error.message : String(error),
          });
          return;
        }
      }
    }
    // Логика для вариативных шрифтов
    else if (fontToApply.isVariableFont) {
      const { settings: newSettings, changed: settingsChanged } = buildVariableSettingsForPresetApply({
        font: fontToApply,
        weight,
        style,
        instanceCoordinates,
        currentSettings: variableSettings,
      });
      fontStyleDbg('applyPresetStyle variable settings', {
        presetName,
        fontId: fontToApply.id,
        weight,
        style,
        settingsChanged,
      });
      if (settingsChanged) {
        applyVariableSettings(newSettings, true, fontToApply);
      }
    }

    // ВАЖНО: Обновляем selectedFont для ВСЕХ типов шрифтов (только один раз в конце)
    updateSelectedFontStateIfNeeded();
    fontStyleDbg('applyPresetStyle end', {
      presetName,
      fontId: fontToApply.id,
      after: { currentWeight: weight, currentStyle: style },
    });

    // Обновляем lastUsedPresetName в общем массиве шрифтов
    // Это нужно делать всегда, независимо от того, изменились ли оси
    setFonts(currentFonts => {
      if (!Array.isArray(currentFonts)) {
        console.warn('[applyPresetStyle] currentFonts не является массивом:', currentFonts);
        return currentFonts; // Возвращаем как есть, если не массив
      }
      return currentFonts.map(f => {
        if (f.id === fontToApply.id) {
          const loadedStyles = Array.isArray(fontToApply.loadedStyles)
            ? [...fontToApply.loadedStyles]
            : f.loadedStyles;
          return {
            ...f,
            ...buildPresetViewStatePatch(presetName, {
              clearVariableSettings: !fontToApply.isVariableFont,
              currentWeight: weight,
              currentStyle: style,
            }),
            ...(loadedStyles ? { loadedStyles } : {}),
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
