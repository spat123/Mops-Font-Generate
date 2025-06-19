import { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { loadFontFaceIfNeeded, updateVariableFontSettings, debouncedUpdateVariableFontSettings } from '../utils/cssGenerator';

/**
 * Хук для управления CSS стилями шрифтов.
 * 
 * @param {Object} selectedFont - Текущий выбранный объект шрифта.
 * @param {Object} variableSettings - Текущие настройки вариативных осей.
 * @param {boolean} isSelectedFontVariable - Флаг, является ли выбранный шрифт вариативным.
 * @returns {Object} - Объект с CSS функциями и свойствами.
 */
export function useFontCss(selectedFont, variableSettings, isSelectedFontVariable) {

  /**
   * Возвращает строку font-family для текущего или указанного шрифта.
   * (Перенесено из useFontManager)
   * 
   * @param {Object|null} font - Шрифт для получения font-family (по умолчанию selectedFont).
   * @returns {string} - Строка font-family для CSS.
   */
  const getFontFamily = useCallback((font = null) => {
    const targetFont = font || selectedFont;
    if (!targetFont) return 'inherit';

    // Используем fontFamily из объекта шрифта, если он есть
    if (targetFont.fontFamily) {
      return `"${targetFont.fontFamily}"`;
    }

    // Для Fontsource шрифтов генерируем имя на основе name
    if (targetFont.source === 'fontsource' && targetFont.name) {
      return `"${targetFont.name}"`;
    }

    // Для локальных шрифтов используем name или filename
    if (targetFont.name) {
      return `"${targetFont.name}"`;
    }

    // Если есть filename (без расширения), используем его
    if (targetFont.filename) {
      const nameWithoutExt = targetFont.filename.replace(/\.[^/.]+$/, '');
      return `"${nameWithoutExt}"`;
    }

    // Если ничего не найдено, используем ID как fallback
    if (targetFont.id) {
      console.warn('getFontFamily: Возвращаем временное имя на основе ID, т.к. fontFamily еще не установлен.');
      return `"Font_${targetFont.id}"`;
    }

    return 'inherit';
  }, [selectedFont]);

  /**
   * Возвращает строку font-variation-settings для текущего или указанного шрифта.
   * (Перенесено из useFontManager)
   * 
   * @param {Object|null} font - Шрифт для получения настроек (по умолчанию selectedFont).
   * @param {Object|null} settings - Настройки осей (по умолчанию variableSettings).
   * @returns {string} - Строка font-variation-settings для CSS.
   */
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

  /**
   * Мемоизированные CSS свойства для текущего шрифта.
   * (Перенесено из useFontManager)
   */
  const fontCssProperties = useMemo(() => {
    if (!selectedFont) {
      return { fontFamily: 'inherit' };
    }

    const properties = {
      fontFamily: getFontFamily()
    };

    if (isSelectedFontVariable) {
      const variationSettings = getVariationSettings();
      if (variationSettings && variationSettings !== 'normal') {
        properties.fontVariationSettings = variationSettings;
      }
    } else {
      // Для статических шрифтов добавляем weight и style
      if (selectedFont.currentWeight) {
        properties.fontWeight = selectedFont.currentWeight;
      }
      if (selectedFont.currentStyle && selectedFont.currentStyle !== 'normal') {
        properties.fontStyle = selectedFont.currentStyle;
      }
    }

    console.log(`[fontCssProperties] Обновляем CSS для ${selectedFont.name}:`, properties);
    return properties;
  }, [selectedFont, selectedFont?.currentWeight, selectedFont?.currentStyle, isSelectedFontVariable, getFontFamily, getVariationSettings]);

  /**
   * Генерирует CSS свойства для применения к элементам.
   * (Перенесено из useFontManager)
   * 
   * @returns {Object} - Объект с CSS свойствами.
   */
  const generateCSS = useCallback(() => {
    return fontCssProperties;
  }, [fontCssProperties]);

  /**
   * Загружает шрифт с использованием FontFace API.
   * (Перенесено из useFontManager)
   * 
   * @param {Object} font - Объект шрифта для загрузки.
   * @param {Object} settings - Настройки вариативных осей (опционально).
   * @returns {Promise<FontFace|null>} - Промис с объектом FontFace или null.
   */
  const loadFontFace = useCallback(async (font, settings = {}) => {
    if (!font) return null;

    try {
      const fontFamily = getFontFamily(font);
      const url = font.url;

      if (!url) {
        console.warn('Нет URL для загрузки шрифта:', font);
        return null;
      }

      const fontFace = await loadFontFaceIfNeeded(
        fontFamily.replace(/"/g, ''), // Убираем кавычки
        url,
        settings
      );

      return fontFace;
    } catch (error) {
      console.error('Ошибка при загрузке FontFace:', error);
      toast.error(`Ошибка загрузки шрифта: ${error.message}`);
      return null;
    }
  }, [getFontFamily]);

  /**
   * Обновляет CSS для вариативного шрифта.
   * (Перенесено из useFontManager)
   * 
   * @param {Object} font - Объект шрифта.
   * @param {Object} currentSettings - Текущие настройки осей.
   * @param {Object} prevSettings - Предыдущие настройки осей.
   */
  const updateVariableFontCss = useCallback((font, currentSettings, prevSettings = null) => {
    if (!font || !font.isVariableFont) return;

    try {
      updateVariableFontSettings(font, currentSettings, prevSettings);
    } catch (error) {
      console.error('Ошибка при обновлении CSS вариативного шрифта:', error);
    }
  }, []);

  /**
   * Debounced версия обновления CSS для вариативного шрифта.
   * (Перенесено из useFontManager)
   */
  const debouncedUpdateVariableFontCss = useCallback((font, currentSettings, prevSettings = null) => {
    if (!font || !font.isVariableFont) return;

    try {
      debouncedUpdateVariableFontSettings(font, currentSettings, prevSettings);
    } catch (error) {
      console.error('Ошибка при debounced обновлении CSS вариативного шрифта:', error);
    }
  }, []);

  /**
   * Генерирует CSS строку для экспорта.
   * (Перенесено из useFontManager)
   * 
   * @param {Object} font - Объект шрифта (по умолчанию selectedFont).
   * @param {string} selectedFontName - Имя выбранного шрифта.
   * @returns {string} - CSS строка для экспорта.
   */
  const exportToCSS = useCallback((font = null, selectedFontName = '') => {
    const targetFont = font || selectedFont;
    const targetFontName = selectedFontName || targetFont?.name || 'Unknown Font';

    if (!targetFont) {
      return `/* Нет выбранного шрифта для экспорта */`;
    }

    const css = generateCSS(); // Получаем { fontFamily, fontVariationSettings?, fontWeight?, fontStyle? }
    
    let cssString = `/* CSS для шрифта: ${targetFontName} */\n`;
    cssString += `.font-${targetFontName.replace(/\s+/g, '-').toLowerCase()} {\n`;
    
    Object.entries(css).forEach(([property, value]) => {
      // Конвертируем camelCase в kebab-case
      const kebabProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      cssString += `  ${kebabProperty}: ${value};\n`;
    });
    
    cssString += `}\n`;
    
    return cssString;
  }, [selectedFont, generateCSS]);

  return {
    // CSS функции
    getFontFamily,
    getVariationSettings,
    generateCSS,
    
    // FontFace API
    loadFontFace,
    
    // Обновление CSS
    updateVariableFontCss,
    debouncedUpdateVariableFontCss,
    
    // Экспорт
    exportToCSS,
    
    // Мемоизированные свойства
    fontCssProperties,
  };
} 