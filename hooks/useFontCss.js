import { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  loadFontFaceIfNeeded,
  updateVariableFontSettings,
  debouncedUpdateVariableFontSettings,
  buildVariableFontFaceDescriptors,
} from '../utils/cssGenerator';
import { slugifyFontKey } from '../utils/fontSlug';

/** CSS для превью: font-family, variation-settings, FontFace, экспорт строки. */
export function useFontCss(selectedFont, variableSettings, isSelectedFontVariable) {

  const getFontFamily = useCallback((font = null) => {
    const targetFont = font || selectedFont;
    if (!targetFont) return 'inherit';

    const q = (s) => String(s).replace(/"/g, '\\"');

    // Используем fontFamily из объекта шрифта, если он есть (реальное имя FontFace: font-xxxxx и т.д.)
    if (targetFont.fontFamily) {
      return `"${q(targetFont.fontFamily)}"`;
    }

    // Для Fontsource шрифтов генерируем имя на основе name
    if (targetFont.source === 'fontsource' && targetFont.name) {
      return `"${q(targetFont.name)}"`;
    }

    // Для локальных / Google после парсинга — display name
    if (targetFont.name) {
      return `"${q(targetFont.name)}"`;
    }

    // Если есть filename (без расширения), используем его
    if (targetFont.filename) {
      const nameWithoutExt = targetFont.filename.replace(/\.[^/.]+$/, '');
      return `"${q(nameWithoutExt)}"`;
    }

    // Если ничего не найдено, используем ID как fallback
    if (targetFont.id) {
      console.warn('getFontFamily: Возвращаем временное имя на основе ID, т.к. fontFamily еще не установлен.');
      return `"Font_${targetFont.id}"`;
    }

    return 'inherit';
  }, [selectedFont]);

  const getVariationSettings = useCallback((font = null, settings = null) => {
    const targetFont = font || selectedFont;
    const targetSettings = settings || variableSettings;

    if (!targetFont || !targetFont.isVariableFont || !targetSettings) {
      return 'normal';
    }

    // Проверяем, что targetSettings - это объект с настройками
    if (typeof targetSettings !== 'object' || Object.keys(targetSettings).length === 0) {
      return 'normal';
    }

    // Генерируем строку font-variation-settings
    const variationString = Object.entries(targetSettings)
      .map(([tag, value]) => `"${tag}" ${value}`)
      .join(', ');

    return variationString || 'normal';
  }, [selectedFont, variableSettings]);

  const fontCssProperties = useMemo(() => {
    if (!selectedFont) {
      return { fontFamily: 'inherit' };
    }

    const primaryFamily = getFontFamily();
    // Запасной sans-serif: иначе при несовпадении имени с FontFace браузер берёт serif (Times)
    const properties = {
      fontFamily: primaryFamily === 'inherit'
        ? 'inherit'
        : `${primaryFamily}, ui-sans-serif, system-ui, sans-serif`
    };

    if (isSelectedFontVariable) {
      const variationSettings = getVariationSettings();
      if (variationSettings && variationSettings !== 'normal') {
        properties.fontVariationSettings = variationSettings;
      }
      const italValueFromSettings = Number(
        variableSettings?.ital ??
        selectedFont?.variableAxes?.ital?.currentValue ??
        selectedFont?.variableAxes?.ital?.default ??
        0
      );
      const isAxisItalActive = selectedFont?.italicMode === 'axis-ital' && Number.isFinite(italValueFromSettings) && italValueFromSettings >= 1;
      const wantsItalicStyle = selectedFont?.currentStyle === 'italic' || isAxisItalActive;
      properties.fontStyle = wantsItalicStyle ? 'italic' : 'normal';
    } else {
      // Для статических шрифтов добавляем weight и style
      if (selectedFont.currentWeight) {
        properties.fontWeight = selectedFont.currentWeight;
      }
      if (selectedFont.currentStyle && selectedFont.currentStyle !== 'normal') {
        properties.fontStyle = selectedFont.currentStyle;
      }
    }

    return properties;
  }, [
    selectedFont,
    selectedFont?.currentWeight,
    selectedFont?.currentStyle,
    isSelectedFontVariable,
    getFontFamily,
    getVariationSettings,
    variableSettings,
  ]);

  const generateCSS = useCallback(() => {
    return fontCssProperties;
  }, [fontCssProperties]);

  const loadFontFace = useCallback(async (font, settings = {}) => {
    if (!font) return null;

    try {
      const fontFamily = getFontFamily(font);
      const url = font.url;

      if (!url) {
        console.warn('Нет URL для загрузки шрифта:', font);
        return null;
      }

      // Только имя семейства для FontFace (без fallback-стека из CSS)
      const familyForFace = fontFamily.replace(/"/g, '').split(',')[0].trim();

      const faceDescriptors =
        font.isVariableFont && font.variableAxes
          ? buildVariableFontFaceDescriptors(font.variableAxes)
          : {};

      const fontFace = await loadFontFaceIfNeeded(
        familyForFace,
        url,
        settings,
        font.id || '',
        faceDescriptors
      );

      return fontFace;
    } catch (error) {
      console.error('Ошибка при загрузке FontFace:', error);
      toast.error(`Ошибка загрузки шрифта: ${error.message}`);
      return null;
    }
  }, [getFontFamily]);

  const updateVariableFontCss = useCallback((font, currentSettings, prevSettings = null) => {
    if (!font || !font.isVariableFont) return;

    try {
      updateVariableFontSettings(font, currentSettings, prevSettings);
    } catch (error) {
      console.error('Ошибка при обновлении CSS вариативного шрифта:', error);
    }
  }, []);

  const debouncedUpdateVariableFontCss = useCallback((font, currentSettings, prevSettings = null) => {
    if (!font || !font.isVariableFont) return;

    try {
      debouncedUpdateVariableFontSettings(font, currentSettings, prevSettings);
    } catch (error) {
      console.error('Ошибка при debounced обновлении CSS вариативного шрифта:', error);
    }
  }, []);

  const exportToCSS = useCallback((font = null, selectedFontName = '') => {
    const targetFont = font || selectedFont;
    const targetFontName = selectedFontName || targetFont?.name || 'Unknown Font';

    if (!targetFont) {
      return `/* Нет выбранного шрифта для экспорта */`;
    }

    const css = generateCSS(); // Получаем { fontFamily, fontVariationSettings?, fontWeight?, fontStyle? }
    
    let cssString = `/* CSS для шрифта: ${targetFontName} */\n`;
    cssString += `.font-${slugifyFontKey(targetFontName)} {\n`;
    
    Object.entries(css).forEach(([property, value]) => {
      // Конвертируем camelCase в kebab-case
      const kebabProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      cssString += `  ${kebabProperty}: ${value};\n`;
    });
    
    cssString += `}\n`;
    
    return cssString;
  }, [selectedFont, generateCSS]);

  return {
    getFontFamily,
    getVariationSettings,
    generateCSS,
    loadFontFace,
    updateVariableFontCss,
    debouncedUpdateVariableFontCss,
    exportToCSS,
    fontCssProperties,
  };
} 
