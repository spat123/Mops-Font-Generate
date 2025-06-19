// Функции для обработки локально загруженных шрифтов (кэширование, FontFace)
import { toast } from 'react-toastify';
import { parseFontBuffer, isVariableFont } from './fontParser';
import { findStyleInfoByWeightAndStyle, getFormatFromExtension } from './fontUtilsCommon';
import { loadFontFaceIfNeeded } from './cssGenerator';

/**
 * Кэш для хранения результатов анализа локальных шрифтов
 * Ключ - хеш содержимого шрифта.
 * Значение - объект metadata, полученный из воркера.
 * @type {Object.<string, Object>}
 */
const localFontCache = {};

/**
 * Освобождает URL, созданный через URL.createObjectURL()
 * @param {string} url - URL для освобождения
 */
export const revokeObjectURL = (url) => {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Failed to revoke Object URL:', error); // Используем warn вместо error
      // toast.error('Ошибка при освобождении URL'); // Не спамим пользователя
    }
  }
};

/**
 * Асинхронно вычисляет SHA-256 хеш для Blob файла.
 * @param {Blob} file - Файл (Blob).
 * @returns {Promise<string|null>} - Промис с HEX-строкой хеша или null в случае ошибки.
 */
const calculateFileHash = async (file) => {
  if (!(file instanceof Blob)) {
    console.error('Invalid input for hashing: expected Blob.');
    return null;
  }
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    // Преобразуем ArrayBuffer хеша в HEX-строку
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Error calculating file hash:', error);
    toast.error('Не удалось вычислить хеш файла для кэширования.');
    return null;
  }
};

/**
 * Полностью анализирует локальный шрифт (из файла), определяя его характеристики.
 * Включает парсинг, извлечение метаданных, кэширование и добавление @font-face.
 * @param {Object} fontInput - Объект шрифта с file (Blob) и name (string)
 * @returns {Promise<Object|null>} - Промис с обработанным объектом шрифта или null при критической ошибке.
 */
export const processLocalFont = async (fontInput) => {
  if (!fontInput || !(fontInput.file instanceof Blob) || !fontInput.name) {
    toast.error('Неверные входные данные для обработки локального шрифта.');
    return null;
  }

  const { file, name } = fontInput;
  const fontId = Math.random().toString(36).substring(2, 9); // Короткий ID для читаемости
  const cleanedName = name.replace(/\.[^/.]+$/, '');
  let objectUrl = null;
  let cacheKey = null; // Инициализируем cacheKey

  try {
    // 1. Вычисляем хеш файла для использования в качестве ключа кэша
    cacheKey = await calculateFileHash(file);
    if (!cacheKey) {
      // Если хеш не удалось получить, кэширование невозможно, но продолжаем обработку
      toast.warning('Не удалось создать ключ кэша для шрифта, кэширование будет пропущено.');
    }

    // 2. Проверка кэша (теперь по хешу)
    if (cacheKey && localFontCache[cacheKey]) {
      console.log(`Using cached metadata for ${name} (hash: ${cacheKey.substring(0, 8)}...)`); // Лог для отладки
      objectUrl = URL.createObjectURL(file); // Свежий URL нужен всегда
      const cachedMetadata = { ...localFontCache[cacheKey] }; // Получаем метаданные из кэша

      const fontFamilyName = `font-${fontId}`; // Генерируем уникальное имя

      // Создаем fontObj на основе кэшированных метаданных
      const fontObj = {
        id: fontId,
        name: cachedMetadata.preferredFamily || cachedMetadata.names?.fontFamily || cleanedName, // Используем имена из кэша
        originalName: name,
        source: 'local',
        currentWeight: 400, // Будет уточнено ниже
        currentStyle: 'normal', // Будет уточнено ниже
        isVariableFont: cachedMetadata.isVariable || false, // Используем флаг из кэша
        variableAxes: {},
        supportedAxes: [],
        variationSettings: '',
        availableStyles: [],
        file: file, // Оставляем файл для возможного повторного использования
        url: objectUrl, // Сохраняем blob URL для FontFace API
        fontFamily: fontFamilyName, // Сохраняем сгенерированное имя!
      };

      // Восстанавливаем оси и стили из кэшированных метаданных
      if (fontObj.isVariableFont && cachedMetadata.supportedAxes) {
         // Заполняем информацию об осях из кэша
         fontObj.variableAxes = Object.entries(cachedMetadata.supportedAxes).reduce((acc, [tag, axisInfo]) => {
                acc[tag] = { name: axisInfo.name || tag.toUpperCase(), min: axisInfo.min, max: axisInfo.max, default: axisInfo.default };
                return acc;
         }, {});
         fontObj.supportedAxes = Object.keys(cachedMetadata.supportedAxes);
         fontObj.variationSettings = Object.entries(fontObj.variableAxes)
            .map(([tag, value]) => `\"${tag}\" ${value.default || 400}`) // Запасное значение для веса
            .join(', ');
         // Определяем начальные стили для вариативных шрифтов из кэша (может быть пересмотрено)
         // Пока оставляем заглушку или определяем на основе дефолтных осей, если возможно
         // TODO: Уточнить логику availableStyles для вариативных из кэша
         fontObj.availableStyles = [{ name: 'Default', weight: 400, style: 'normal' }]; // Заглушка
      } else if (!fontObj.isVariableFont && cachedMetadata.names) {
         // Определяем стиль/вес для невариативных из кэша
         let weight = 400;
         let style = 'normal';
         const subfamily = cachedMetadata.preferredSubfamily || cachedMetadata.names?.fontSubfamily || 'Regular';
         const subfamilyLower = subfamily.toLowerCase();
         style = (subfamilyLower.includes('italic') || subfamilyLower.includes('oblique')) ? 'italic' : 'normal';
         // ... (логика определения веса из subfamily) ...
          if (subfamilyLower.includes('thin')) weight = 100;
          else if (subfamilyLower.includes('extralight') || subfamilyLower.includes('ultralight')) weight = 200;
          else if (subfamilyLower.includes('light')) weight = 300;
          else if (subfamilyLower.includes('medium')) weight = 500;
          else if (subfamilyLower.includes('semibold') || subfamilyLower.includes('demibold')) weight = 600;
          else if (subfamilyLower.includes('bold')) weight = 700;
          else if (subfamilyLower.includes('extrabold') || subfamilyLower.includes('ultrabold')) weight = 800;
          else if (subfamilyLower.includes('black') || subfamilyLower.includes('heavy')) weight = 900;

         fontObj.currentWeight = weight;
         fontObj.currentStyle = style;
         const styleInfo = findStyleInfoByWeightAndStyle(weight, style);
         fontObj.availableStyles = [{ name: styleInfo.name, weight, style }];
      } else {
          // Если стилей нет в кэше (например, старый кэш или ошибка парсинга при кэшировании)
          fontObj.availableStyles = [{ name: 'Regular', weight: 400, style: 'normal' }];
      }

      // Определяем начальные настройки для вариативных шрифтов из кэша
      let initialSettings = {};
      if (fontObj.isVariableFont && fontObj.variableAxes) {
        initialSettings = Object.entries(fontObj.variableAxes).reduce((acc, [tag, axis]) => {
          acc[tag] = axis.default;
          return acc;
        }, {});
      }

      // !!! Используем loadFontFaceIfNeeded напрямую !!!
      try {
        // Вызываем функцию через именованный импорт
        await loadFontFaceIfNeeded(fontFamilyName, objectUrl, initialSettings);
        console.log(`Font ${fontFamilyName} loaded successfully from cache using FontFace API.`);
        // Успешно загрузили, возвращаем fontObj
        revokeObjectURL(objectUrl); // Освобождаем blob URL после успешной загрузки
        return fontObj;
      } catch (error) {
        console.error(`Failed to load font ${fontFamilyName} from cache using FontFace API:`, error);
        toast.error(`Ошибка при загрузке шрифта ${fontObj.name} из кэша.`);
        revokeObjectURL(objectUrl); // Освобождаем blob URL при ошибке
        fontObj.error = 'Failed to load via FontFace API';
        return fontObj; // Возвращаем объект с ошибкой
    }
    // --- Конец обработки кэша ---
    }
    // --- Конец проверки кэша ---


    // 3. Создание URL (если не из кэша)
    if (!objectUrl) {
        objectUrl = URL.createObjectURL(file);
    }

    // 4. Парсинг файла -> получение полного объекта шрифта через parseFontBuffer
    // parseFontFile теперь возвращает объект metadata или null
    let parsedFontData = null;
    try {
       const buffer = await file.arrayBuffer();
       parsedFontData = await parseFontBuffer(buffer); // Используем parseFontBuffer
    } catch (e) {
        console.error(`Error reading or parsing font buffer for ${name}:`, e);
        toast.error(`Ошибка чтения или анализа файла шрифта ${name}.`);
        // Не возвращаем null сразу, т.к. addFontFace может работать с базовым fontObj
    }

    // Создаем базовый объект шрифта (как и раньше)
    const fontObj = {
      id: fontId,
      name: cleanedName, // Уточним из metadata
      originalName: name,
      source: 'local',
      currentWeight: 400,
      currentStyle: 'normal',
      isVariableFont: false, // Уточним из metadata
      variableAxes: {},
      supportedAxes: [],
      variationSettings: '',
      availableStyles: [],
      file: file,
      // url: objectUrl, // Устанавливаем ниже, после создания fontFamilyName
      fontFamily: null, // Установим ниже
    };

    // Установим fontObj.url и fontObj.fontFamily
    const fontFamilyName = `font-${fontId}`;
    fontObj.url = objectUrl;
    fontObj.fontFamily = fontFamilyName;

    // 5. Заполнение fontObj из данных парсинга, если парсинг успешен
    if (parsedFontData) { // Новая проверка
      // Используем данные из объекта parsedFontData (результат opentype.parse)
      // Получаем имена (предпочитаем английские)
      const names = parsedFontData.names || {};
      const preferredFamily = names.preferredFamily?.en || names.fontFamily?.en;
      const preferredSubfamily = names.preferredSubfamily?.en || names.fontSubfamily?.en || 'Regular';

      fontObj.name = preferredFamily || fontObj.name;
      fontObj.isVariableFont = isVariableFont(parsedFontData); // Используем isVariableFont

      if (fontObj.isVariableFont && parsedFontData.tables?.fvar?.axes) {
         // Заполняем информацию об осях из parsedFontData.tables.fvar.axes
         fontObj.variableAxes = parsedFontData.tables.fvar.axes.reduce((acc, axis) => {
                const tag = axis.tag;
                // Используем имя из axis.name?.en, если оно есть
                const axisName = axis.name?.en || tag.toUpperCase();
                 acc[tag] = { name: axisName, min: axis.minValue, max: axis.maxValue, default: axis.defaultValue };
                return acc;
         }, {});
         fontObj.supportedAxes = Object.keys(fontObj.variableAxes);
         fontObj.variationSettings = Object.entries(fontObj.variableAxes)
            .map(([tag, value]) => `\"${tag}\" ${value.default || 400}`) // Запасное значение для веса
            .join(', ');
         fontObj.availableStyles = [{ name: 'Default', weight: 400, style: 'normal' }]; // Заглушка
      } else if (fontObj.isVariableFont && !parsedFontData.tables?.fvar?.axes) {
         // Вариативный, но оси не извлеклись
         console.warn(`Variable font ${name} parsed without axes info.`);
         fontObj.isVariableFont = false; // Считаем невариативным
         fontObj.availableStyles = [{ name: 'Regular', weight: 400, style: 'normal' }];
      } else {
        // НЕвариативный шрифт - определяем стиль из имен
        let weight = 400;
        let style = 'normal';
        if (names) { // Новая проверка
           const subfamily = preferredSubfamily; // Используем извлеченное имя
           const subfamilyLower = subfamily.toLowerCase();
            style = (subfamilyLower.includes('italic') || subfamilyLower.includes('oblique')) ? 'italic' : 'normal';
            // ... (логика определения веса из subfamily - без изменений) ...
            if (subfamilyLower.includes('thin')) weight = 100;
            else if (subfamilyLower.includes('extralight') || subfamilyLower.includes('ultralight')) weight = 200;
            else if (subfamilyLower.includes('light')) weight = 300;
            else if (subfamilyLower.includes('medium')) weight = 500;
            else if (subfamilyLower.includes('semibold') || subfamilyLower.includes('demibold')) weight = 600;
            else if (subfamilyLower.includes('bold')) weight = 700;
            else if (subfamilyLower.includes('extrabold') || subfamilyLower.includes('ultrabold')) weight = 800;
            else if (subfamilyLower.includes('black') || subfamilyLower.includes('heavy')) weight = 900;
        }
         fontObj.currentWeight = weight;
         fontObj.currentStyle = style;
        const styleInfo = findStyleInfoByWeightAndStyle(weight, style);
        fontObj.availableStyles = [{ name: styleInfo.name, weight, style }];
      }

      // 6. Кэширование результата (метаданных - извлекаем из parsedFontData для совместимости кэша)
      if (cacheKey && parsedFontData) { // Добавили проверку parsedFontData
        // Кэшируем объект, похожий на старый metadata, для обратной совместимости?
        // Или кэшировать весь parsedFontData? Пока оставим как было, извлекая нужное
        const metadataToCache = {
            names: parsedFontData.names,
            preferredFamily: preferredFamily,
            preferredSubfamily: preferredSubfamily,
            isVariable: fontObj.isVariableFont,
            supportedAxes: fontObj.isVariableFont ? parsedFontData.tables.fvar.axes.reduce((acc, axis) => {
                 acc[axis.tag] = { name: axis.name?.en, min: axis.minValue, max: axis.maxValue, default: axis.defaultValue };
                 return acc;
                }, {}) : null, // Сохраняем null если не вариативный
            // Добавить другие нужные поля если необходимо
        };
        localFontCache[cacheKey] = metadataToCache;
        // console.log(`Metadata cached for ${name} (hash: ${cacheKey.substring(0, 8)}...)`); // Удаляем лог
      }

    } else {
      // Парсинг не удался (parsedFontData is null)
      toast.warning(`Не удалось проанализировать шрифт ${name}. Используются значения по умолчанию.`);
      fontObj.availableStyles = [{ name: 'Regular', weight: 400, style: 'normal' }];
    }

    // Определяем начальные настройки для вариативных шрифтов
    let initialSettings = {};
    if (fontObj.isVariableFont && fontObj.variableAxes) {
      initialSettings = Object.entries(fontObj.variableAxes).reduce((acc, [tag, axis]) => {
        acc[tag] = axis.default;
        return acc;
      }, {});
    }

    // !!! Используем loadFontFaceIfNeeded напрямую !!!
    try {
      // Вызываем функцию через именованный импорт
      await loadFontFaceIfNeeded(fontFamilyName, objectUrl, initialSettings);
      console.log(`Font ${fontFamilyName} loaded successfully using FontFace API.`);
      // Успешно загрузили, возвращаем fontObj
      revokeObjectURL(objectUrl); // Освобождаем blob URL после успешной загрузки
      return fontObj;
  } catch (error) {
      console.error(`Failed to load font ${fontFamilyName} using FontFace API:`, error);
      toast.error(`Ошибка при загрузке шрифта ${fontObj.name}.`);
      revokeObjectURL(objectUrl); // Освобождаем blob URL при ошибке
      fontObj.error = 'Failed to load via FontFace API';
      return fontObj; // Возвращаем объект с ошибкой
    }

  } catch (error) { // Глобальный try...catch для processLocalFont
    console.error(`Critical error processing font ${name}:`, error);
    toast.error(`Критическая ошибка при обработке шрифта ${name}.`);
    if (objectUrl) {
        revokeObjectURL(objectUrl); // Освобождаем URL при любой критической ошибке
    }
    return null; // Возвращаем null при критической ошибке
  }
}; 