// Утилиты генерации CSS-правил (@font-face, font-variation-settings и т.д.).
import { toast } from './appNotify';
import { debounce } from './debounce';
import { formatFontVariationSettings } from './fontVariationSettings';
import { getFormatFromExtension } from './fontUtilsCommon';

export { debounce };

// Проверка значимости изменений в осях
/**
 * Проверяет, являются ли изменения в настройках вариативных осей значительными.
 * Используется для оптимизации CSS-обновлений (например, во время перетаскивания слайдера).
 * @param {Object} prevSettings - Предыдущие настройки
 * @param {Object} currentSettings - Текущие настройки
 * @param {number} threshold - Порог значимости изменения для одной оси
 * @returns {boolean} true, если изменения значительны
 */
export const hasSignificantChanges = (prevSettings, currentSettings, threshold = 10) => {
  // Если предыдущих настроек нет, считаем изменения значительными
  if (!prevSettings) return true;
  
  // Получаем ключи (теги осей) из обоих объектов
  const prevKeys = Object.keys(prevSettings);
  const currentKeys = Object.keys(currentSettings);

  // Если количество осей изменилось, считаем изменения значительными
  if (prevKeys.length !== currentKeys.length) return true;

  // Проверяем каждую ось
  for (const key of currentKeys) {
    // Если ось новая или значение изменилось заметно — изменения значительные
    if (!(key in prevSettings) || 
        Math.abs(parseFloat(prevSettings[key]) - parseFloat(currentSettings[key])) >= threshold) {
      return true;
    }
  }

  // Иначе изменения считаем незначительными
  return false;
};

/**
 * Буфер для CSS-обновлений.
 * Помогает предотвращать мерцание шрифта при частом обновлении.
 */
const fontCssBuffer = {
  // Main (active) buffer.
  main: new Map(),
  // Shadow buffer for staged updates.
  shadow: new Map(),
  // Tracks active switch state.
  switching: false,
  // requestAnimationFrame id for cancellation.
  animationFrameId: null
};

/**
 * Обновляет CSS-правило с двойной буферизацией и requestAnimationFrame.
 * @param {string} fontId - ID шрифта
 * @param {string} cssRule - CSS-правило
 */
const updateBufferedFontCss = (fontId, cssRule) => {
  // Store rule in shadow buffer.
  fontCssBuffer.shadow.set(fontId, cssRule);

  // If rAF is already scheduled, skip creating another one.
  if (fontCssBuffer.animationFrameId) {
    return;
  }

  // Планируем переключение на следующий кадр анимации
  fontCssBuffer.animationFrameId = requestAnimationFrame(() => {
    // Ставим флаг переключения
    fontCssBuffer.switching = true;

    // Apply all pending CSS rules from shadow buffer.
    fontCssBuffer.shadow.forEach((rule, id) => {
      try {
        // Находим существующий style-элемент или создаём новый
        let styleElement = document.querySelector(`style[data-font-id="${id}"]`);

        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.setAttribute('data-font-id', id);
          document.head.appendChild(styleElement);
        }

        // Update style text only when content changed.
        if (styleElement.textContent !== rule) {
          styleElement.textContent = rule;
        }

        // Копируем правило в основной буфер
        fontCssBuffer.main.set(id, rule);

        // Удалено: принудительная перерисовка страницы
        // document.body.offsetHeight;
      } catch (error) {
        console.error(`Ошибка при обновлении CSS для шрифта ${id}:`, error);
      }
    });

    // Clear shadow buffer.
    fontCssBuffer.shadow.clear();

    // Reset switch flag and frame id.
    fontCssBuffer.switching = false;
    fontCssBuffer.animationFrameId = null;
  });
};

/**
 * Кэш для хранения загруженных объектов FontFace.
 * Key: `${fontFamily}_${url}`, value: Promise<FontFace>
 */
const fontFaceCache = new Map();

/**
 * Дескрипторы FontFace для variable fonts (диапазон веса/ширины).
 * @param {Record<string, { min?: number, max?: number }>|null|undefined} variableAxes
 * @param {FontFaceDescriptors} [extraDescriptors]
 * @returns {FontFaceDescriptors}
 */
export const buildVariableFontFaceDescriptors = (variableAxes, extraDescriptors = {}) => {
  const descriptors = {};
  if (!variableAxes || typeof variableAxes !== 'object') return descriptors;

  const wght = variableAxes.wght;
  if (wght && typeof wght === 'object') {
    const min = Number(wght.min);
    const max = Number(wght.max);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      if (max > min) descriptors.weight = `${Math.round(min)} ${Math.round(max)}`;
      else descriptors.weight = `${Math.round(min)}`;
    }
  }

  const wdth = variableAxes.wdth;
  if (wdth && typeof wdth === 'object') {
    const min = Number(wdth.min);
    const max = Number(wdth.max);
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      descriptors.stretch = `${min}% ${max}%`;
    }
  }

  return {
    ...descriptors,
    ...(extraDescriptors && typeof extraDescriptors === 'object' ? extraDescriptors : {}),
  };
};

/**
 * Загружает шрифт через FontFace API с кэшированием.
 * @param {string} fontFamily - Имя семейства шрифтов
 * @param {string|ArrayBuffer|ArrayBufferView} urlOrBuffer - blob/data URL или бинарные данные
 * @param {Object} settings - Настройки вариативных осей (опционально)
 * @param {string} [binaryCacheId] - Уникальный суффикс ключа кэша для бинарных данных
 * @param {FontFaceDescriptors} [faceDescriptors] - Дескрипторы FontFace
 * @returns {Promise<FontFace>} - Промис с объектом FontFace
 */
export const loadFontFaceIfNeeded = async (
  fontFamily,
  urlOrBuffer,
  settings = {},
  binaryCacheId = '',
  faceDescriptors = {}
) => {
  const isUrl = typeof urlOrBuffer === 'string';
  const descKey =
    faceDescriptors && typeof faceDescriptors === 'object' && Object.keys(faceDescriptors).length
      ? JSON.stringify(faceDescriptors)
      : '';
  const cacheKey = isUrl
    ? `${fontFamily}_${urlOrBuffer}_${descKey}`
    : `${fontFamily}_binary_${binaryCacheId || urlOrBuffer.byteLength || '0'}_${descKey}`;
  
  // Проверяем кэш
  if (fontFaceCache.has(cacheKey)) {
    try {
      const cachedPromise = fontFaceCache.get(cacheKey);
      const fontFace = await cachedPromise; // Wait for cached promise resolution.
      // Проверяем, что шрифт присутствует в document.fonts
      if (typeof document !== 'undefined' && document.fonts && !document.fonts.has(fontFace)) {
         document.fonts.add(fontFace);
      }
      return fontFace;
    } catch (error) {
      // Если промис в кэше был отклонён, удаляем его и повторяем загрузку
      console.warn(`Ошибка при использовании кэшированного FontFace для ${fontFamily}, повторная загрузка:`, error);
      fontFaceCache.delete(cacheKey);
    }
  }

  // Создаём промис загрузки (кэшируем именно промис)
  const loadPromise = (async () => {
    try {
      // Не устанавливаем variationSettings в опциях FontFace.
      // This enables dynamic axis updates via CSS font-variation-settings.
      const options =
        faceDescriptors && typeof faceDescriptors === 'object' && Object.keys(faceDescriptors).length
          ? { ...faceDescriptors }
          : {};

      const fontFace = isUrl
        ? new FontFace(fontFamily, `url(${urlOrBuffer})`, options)
        : new FontFace(fontFamily, urlOrBuffer, options);
      await fontFace.load();
      if (typeof document !== 'undefined' && document.fonts) {
          document.fonts.add(fontFace);
      }

      return fontFace;
    } catch (error) {
      console.error(`Ошибка при загрузке шрифта ${fontFamily} через FontFace API:`, error);
      fontFaceCache.delete(cacheKey); // Удаляем из кэша при ошибке загрузки
      throw error; // Rethrow for upstream handling.
    }
  })();

  // Кэшируем сам промис
  fontFaceCache.set(cacheKey, loadPromise);

  return loadPromise;
};

/**
 * Применяет изменения вариативных осей через CSS.
 * @param {Object} fontObj - Объект шрифта
 * @param {Object} currentSettings - Текущие настройки осей { tag: value, ... }
 * @param {Object} prevSettings - Предыдущие настройки (опционально)
 * @returns {Object} - Исходный fontObj
 */
export const updateVariableFontSettings = (fontObj, currentSettings, prevSettings = null) => {
    if (!fontObj || !fontObj.fontFamily || !fontObj.isVariableFont) {
        console.warn('updateVariableFontSettings: Невалидный fontObj или не вариативный шрифт.');
        return fontObj;
    }
    if (!currentSettings || typeof currentSettings !== 'object') {
        console.warn('updateVariableFontSettings: не переданы currentSettings.');
        return fontObj;
    }

    const fontFamilyName = fontObj.fontFamily;
    const fontId = fontObj.id || fontFamilyName; // Required for updateBufferedFontCss.

    // Optional significant-change check.
    // if (prevSettings && !hasSignificantChanges(prevSettings, currentSettings)) {
    //     return fontObj; // Нет значительных изменений
    // }

    // Формируем CSS-правило только для font-variation-settings
    let variationSettingsRule = '';
    const variationSettingsValue = formatFontVariationSettings(currentSettings, { fallback: '' });
    if (variationSettingsValue) {
        // Use data-attribute selector; preview element must include this attribute.
        variationSettingsRule = `[data-font-family="${fontFamilyName}"] { font-variation-settings: ${variationSettingsValue}; }`;
        // Alternative: CSS variables (requires component changes).
        // variationSettingsRule = `:root { ${settingsArray.map(([tag, value]) => `--${fontId}-${tag}: ${value};`).join('\n')} }`;
    }

    // Update CSS through buffer.
    if (variationSettingsRule) {
        updateBufferedFontCss(fontId + '-settings', variationSettingsRule); // Используем уникальный ID для style-правил
    } else {
        // Если настроек нет, при необходимости можно очистить предыдущее правило.
        // updateBufferedFontCss(fontId + '-settings', '');
    }

    return fontObj;
};

// Дебаунс-версия updateVariableFontSettings
export const debouncedUpdateVariableFontSettings = debounce(updateVariableFontSettings, 50);

