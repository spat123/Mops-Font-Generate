// Функции для генерации CSS правил (@font-face, font-variation-settings и т.д.) 
import { toast } from 'react-toastify';
import { getFormatFromExtension } from './fontUtilsCommon';

// Восстанавливаем функцию hasSignificantChanges
/**
 * Проверяет, являются ли изменения в настройках вариативных осей "значительными"
 * Используется для оптимизации обновлений CSS (например, при перетаскивании слайдера)
 * @param {Object} prevSettings - Предыдущие настройки
 * @param {Object} currentSettings - Текущие настройки
 * @param {number} threshold - Порог "значительности" изменения для одной оси
 * @returns {boolean} true, если изменения значительны
 */
export const hasSignificantChanges = (prevSettings, currentSettings, threshold = 10) => {
  // Если предыдущих настроек нет, считаем изменение значительным
  if (!prevSettings) return true;
  
  // Получаем ключи (теги осей) из обоих объектов
  const prevKeys = Object.keys(prevSettings);
  const currentKeys = Object.keys(currentSettings);

  // Если количество осей изменилось, считаем изменение значительным
  if (prevKeys.length !== currentKeys.length) return true;

  // Проверяем каждую ось
  for (const key of currentKeys) {
    // Если ось новая или значение изменилось значительно, считаем изменение значительным
    if (!(key in prevSettings) || 
        Math.abs(parseFloat(prevSettings[key]) - parseFloat(currentSettings[key])) >= threshold) {
      return true;
    }
  }

  // Если ни одно из условий выше не сработало, изменения незначительны
  return false;
};

/**
 * Буфер для CSS обновлений
 * Помогает предотвратить моргание шрифта при частом обновлении
 */
const fontCssBuffer = {
  // Основной буфер (активный)
  main: new Map(),
  // Вторичный буфер (для подготовки)
  shadow: new Map(),
  // Флаг отслеживания активного переключения
  switching: false,
  // ID кадра анимации для отмены
  animationFrameId: null
};

/**
 * Обновляет CSS правило с использованием двойной буферизации и requestAnimationFrame
 * @param {string} fontId - ID шрифта
 * @param {string} cssRule - CSS правило
 */
const updateBufferedFontCss = (fontId, cssRule) => {
  // Сохраняем правило в теневом буфере
  fontCssBuffer.shadow.set(fontId, cssRule);

  // Если кадр анимации уже запланирован, не создаем новый
  if (fontCssBuffer.animationFrameId) {
    return;
  }

  // Планируем переключение на следующий кадр анимации
  fontCssBuffer.animationFrameId = requestAnimationFrame(() => {
    // Устанавливаем флаг переключения
    fontCssBuffer.switching = true;

    // Применяем все CSS правила из теневого буфера
    fontCssBuffer.shadow.forEach((rule, id) => {
      try {
        // Находим существующий элемент style или создаем новый
        let styleElement = document.querySelector(`style[data-font-id="${id}"]`);

        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.setAttribute('data-font-id', id);
          document.head.appendChild(styleElement);
        }

        // Обновляем содержимое, только если оно изменилось
        if (styleElement.textContent !== rule) {
          styleElement.textContent = rule;
        }

        // Копируем правило в основной буфер
        fontCssBuffer.main.set(id, rule);

        // УДАЛЕНО: Принудительная перерисовка страницы
        // document.body.offsetHeight;
      } catch (error) {
        console.error(`Ошибка при обновлении CSS для шрифта ${id}:`, error);
      }
    });

    // Очищаем теневой буфер
    fontCssBuffer.shadow.clear();

    // Сбрасываем флаг переключения и ID кадра анимации
    fontCssBuffer.switching = false;
    fontCssBuffer.animationFrameId = null;
  });
};

/**
 * Кэш для хранения загруженных объектов FontFace
 * Ключ: `${fontFamily}_${url}`, Значение: Promise<FontFace>
 */
const fontFaceCache = new Map();

/**
 * Загружает шрифт с использованием FontFace API и кэширования
 * @param {string} fontFamily - Имя семейства шрифтов
 * @param {string} url - URL шрифта
 * @param {Object} settings - Настройки вариативных осей (опционально)
 * @returns {Promise<FontFace>} - Промис с объектом FontFace
 */
export const loadFontFaceIfNeeded = async (fontFamily, url, settings = {}) => {
  const cacheKey = `${fontFamily}_${url}`;
  
  // Проверяем кэш
  if (fontFaceCache.has(cacheKey)) {
    try {
      const cachedPromise = fontFaceCache.get(cacheKey);
      const fontFace = await cachedPromise; // Дожидаемся разрешения промиса из кэша
      // Проверяем, добавлен ли шрифт в document.fonts (на случай, если он был удален)
      if (typeof document !== 'undefined' && document.fonts && !document.fonts.has(fontFace)) {
         document.fonts.add(fontFace);
      }
      return fontFace;
    } catch (error) {
      // Если промис в кэше был отклонен, удаляем его и продолжаем загрузку
      console.warn(`Ошибка при использовании кэшированного FontFace для ${fontFamily}, повторная загрузка:`, error);
      fontFaceCache.delete(cacheKey);
    }
  }

  // Создаем промис для загрузки (чтобы закэшировать сам промис)
  const loadPromise = (async () => {
    try {
      // ИСПРАВЛЕНИЕ: НЕ устанавливаем variationSettings в FontFace опциях!
      // Это позволит динамически изменять оси через CSS font-variation-settings
      const options = {};
      // УДАЛЕНО: if (Object.keys(settings).length > 0) { ... }
      
      console.log(`[loadFontFaceIfNeeded] Создаем FontFace для ${fontFamily} БЕЗ фиксированных variationSettings`);
      
      const fontFace = new FontFace(fontFamily, `url(${url})`, options);
      await fontFace.load();
      if (typeof document !== 'undefined' && document.fonts) {
          document.fonts.add(fontFace);
      }
      
      console.log(`[loadFontFaceIfNeeded] FontFace успешно загружен и добавлен: ${fontFamily}`);
      return fontFace;
    } catch (error) {
      console.error(`Ошибка при загрузке шрифта ${fontFamily} через FontFace API:`, error);
      fontFaceCache.delete(cacheKey); // Удаляем из кэша при ошибке загрузки
      throw error; // Пробрасываем ошибку дальше
    }
  })();

  // Кэшируем сам промис
  fontFaceCache.set(cacheKey, loadPromise);

  return loadPromise;
};

/**
 * @deprecated Эта функция больше не добавляет @font-face. Используйте loadFontFaceIfNeeded.
 *             Она может быть использована только для обновления настроек, но лучше использовать updateVariableFontSettings.
 */
export const addFontFace = (fontObj, prevSettings = null) => {
  // Проверяем, что у нас есть допустимый объект шрифта
  if (!fontObj) {
    console.error('fontObj не предоставлен');
    return null;
  }

  // Проверяем, что у нас есть файл или URL (уже не нужно для этой функции)
  /*
  if (!fontObj.url && (!fontObj.file || !(fontObj.file instanceof Blob))) {
    console.error('Нет URL или файла для шрифта');
    return fontObj;
  }
  */

  // Убедимся, что у шрифта есть ID
  if (!fontObj.id) {
    fontObj.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Убедимся, что есть fontFamily (он должен быть установлен в processLocalFont или взят из источника)
  const fontFamilyName = fontObj.fontFamily;
  if (!fontFamilyName) {
    console.error('fontObj не имеет fontFamily, не могу обновить CSS.', fontObj);
    return fontObj; // Возвращаем без изменений
  }

  // --- УДАЛЕНА ГЕНЕРАЦИЯ @font-face --- 
  // Вся логика, связанная с `src: url(...)` и `format()` удалена.

  // --- ЛОГИКА ОБНОВЛЕНИЯ VARIATION SETTINGS (оставлена для обратной совместимости, но лучше использовать updateVariableFontSettings) ---
  // ... (код извлечения currentSettings и генерации variationSettingsRule остается, как в предыдущем анализе)
  const currentSettings = {};
  if (fontObj.isVariableFont && fontObj.variableAxes) {
    Object.entries(fontObj.variableAxes).forEach(([tag, axisData]) => {
         const value = axisData?.currentValue ?? axisData?.default;
         if (value !== undefined) {
             currentSettings[tag] = value;
      }
    });
  }
  
  // Подготавливаем строку font-variation-settings
  let variationSettingsRule = '';
  if (fontObj.isVariableFont) {
      const settingsToApply = Object.entries(currentSettings);
      if (settingsToApply.length > 0) {
          const settingsArray = settingsToApply.map(([tag, value]) => `\"${tag}\" ${value}`);
          // Используем data-атрибут как селектор (пример)
          variationSettingsRule = `[data-font-family="${fontFamilyName}"] { font-variation-settings: ${settingsArray.join(', ')}; }`;
      }
  }

  const cssRule = variationSettingsRule;

  // Обновляем CSS с помощью буферизации, если есть что обновлять
  if (cssRule) {
      // Используем ID + '-settings', чтобы не конфликтовать с возможным старым @font-face стилем
      updateBufferedFontCss(fontObj.id + '-settings', cssRule);
  }

    return fontObj;
};

/**
 * Создает дебаунсированную версию функции для предотвращения частых вызовов
 * @param {Function} func - Функция для дебаунсинга
 * @param {number} wait - Время ожидания в миллисекундах
 * @returns {Function} - Дебаунсированная функция
 */
export const debounce = (func, wait = 50) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

/**
 * Дебаунсированная версия addFontFace для безопасного вызова при изменении осей
 */
export const debouncedAddFontFace = debounce(addFontFace, 50);

/**
 * Переименовываем updateFontFaceIfNeeded в updateVariableFontSettings
 * @param {Object} fontObj - Объект шрифта
 * @param {Object} currentSettings - Объект с текущими настройками осей { tag: value, ... }
 * @param {Object} prevSettings - Предыдущие настройки (опционально, для hasSignificantChanges)
 * @returns {Object} - Исходный fontObj
 */
export const updateVariableFontSettings = (fontObj, currentSettings, prevSettings = null) => {
    if (!fontObj || !fontObj.fontFamily || !fontObj.isVariableFont) {
        console.warn('updateVariableFontSettings: Невалидный fontObj или не вариативный шрифт.');
        return fontObj;
    }
    if (!currentSettings || typeof currentSettings !== 'object') {
        console.warn('updateVariableFontSettings: Не предоставлены currentSettings.');
        return fontObj;
    }

    const fontFamilyName = fontObj.fontFamily;
    const fontId = fontObj.id || fontFamilyName; // Нужен ID для updateBufferedFontCss

    // Опциональная проверка на значительные изменения
    // if (prevSettings && !hasSignificantChanges(prevSettings, currentSettings)) {
    //     return fontObj; // Нет значительных изменений
    // }

    // Формируем CSS правило ТОЛЬКО для font-variation-settings
    let variationSettingsRule = '';
    const settingsToApply = Object.entries(currentSettings);
    if (settingsToApply.length > 0) {
        const settingsArray = settingsToApply.map(([tag, value]) => `\"${tag}\" ${value}`);
        // Используем data-атрибут как селектор. Убедись, что элемент превью имеет этот атрибут!
        variationSettingsRule = `[data-font-family="${fontFamilyName}"] { font-variation-settings: ${settingsArray.join(', ')}; }`;
        // Альтернатива: CSS переменные (требует изменений в компоненте)
        // variationSettingsRule = `:root { ${settingsArray.map(([tag, value]) => `--${fontId}-${tag}: ${value};`).join('\n')} }`;
    }

    // Обновляем CSS через буфер
    if (variationSettingsRule) {
        updateBufferedFontCss(fontId + '-settings', variationSettingsRule); // Используем уникальный ID для стилей настроек
    } else {
        // Если настроек нет, возможно, нужно удалить предыдущее правило?
        // updateBufferedFontCss(fontId + '-settings', ''); // Очистить стиль
    }

    return fontObj;
};

// Дебаунсированная версия updateVariableFontSettings (остается)
export const debouncedUpdateVariableFontSettings = debounce(updateVariableFontSettings, 50);

/**
 * Счетчик для отслеживания количества загрузок шрифтов для отладки
 */
let fontLoadCounter = 0;

