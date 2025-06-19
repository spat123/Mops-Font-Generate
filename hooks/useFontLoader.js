import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { findStyleInfoByWeightAndStyle, getFormatFromExtension, PRESET_STYLES } from '../utils/fontUtilsCommon';
import { processLocalFont } from '../utils/localFontProcessor';
import { saveFont } from '../utils/db';
import { base64ToArrayBuffer } from '../utils/fontManagerUtils';

// Кэш для хранения загруженных файлов шрифтов (статических Fontsource)
const fontFaceCache = new Map();

// Хеш-функция для создания уникальных ключей кэширования
const createCacheKey = (fontFamily, weight, style) => `fontsource_${fontFamily}_${weight}_${style}`;

/**
 * Хук для управления загрузкой шрифтов из различных источников.
 * @param {Function} setFonts - Функция для обновления состояния массива шрифтов.
 * @param {Function} setIsLoading - Функция для установки состояния загрузки.
 * @param {Function} safeSelectFont - Функция для безопасного выбора шрифта после загрузки.
 * @param {Array} currentFonts - Текущий массив шрифтов (для проверки дубликатов).
 */
export function useFontLoader(setFonts, setIsLoading, safeSelectFont, currentFonts) {

  // Вспомогательная функция для загрузки одного статического варианта стиля Fontsource
  // (Перенесена из useFontManager)
  const loadFontStyleVariant = useCallback(async (fontFamily, weight, style, fontObj, returnBlob = false) => {
    // НЕ загружаем статические стили, если шрифт определен как вариативный
    if (fontObj.isVariableFont) {
      return returnBlob ? null : undefined;
    }

    const cacheKey = createCacheKey(fontFamily, weight, style);

    if (!returnBlob && fontFaceCache.has(cacheKey)) {
      console.log(`[FontLoader] Используем кэшированные данные для ${fontFamily} ${weight} ${style}`);
      const cachedData = fontFaceCache.get(cacheKey);
      if (fontObj.loadedStyles && !fontObj.loadedStyles.some(s => s.weight === weight && s.style === style)) {
        fontObj.loadedStyles.push({ weight, style, cached: true });
      }
      return returnBlob ? null : undefined;
    }

    let blob = null;
    let fontDataUrl = null;

    try {
      const fontFamilyName = fontObj.fontFamily || fontFamily;
      const apiUrl = `/api/fontsource/${encodeURIComponent(fontFamily)}?weight=${weight}&style=${style}&subset=latin`;
      console.log(`[FontLoader] Запрос к API: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      
      // Проверяем, что ответ содержит JSON
      const contentType = response.headers.get('content-type');
      console.log(`[FontLoader] Content-Type ответа: ${contentType}`);
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Неожиданный тип ответа: ${contentType}`);
      }
      
      const responseText = await response.text();
      console.log(`[FontLoader] Ответ API (первые 100 символов): ${responseText.substring(0, 100)}`);
      if (!responseText || responseText === 'undefined') {
        throw new Error('API вернул пустой или undefined ответ');
      }
      
      const { fontBufferBase64, fileName } = JSON.parse(responseText);
      if (!fontBufferBase64) throw new Error("Пустой буфер шрифта");

      const fontBuffer = base64ToArrayBuffer(fontBufferBase64);
      const mimeType = `font/${getFormatFromExtension(fileName || '.woff2')}`;
      blob = new Blob([fontBuffer], { type: mimeType });
      fontDataUrl = URL.createObjectURL(blob);

      const fontFaceRule = `
        @font-face {
          font-family: '${fontFamilyName}';
          src: url('${fontDataUrl}') format('woff2');
          font-weight: ${weight};
          font-style: ${style};
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }
      `;
      const styleElement = document.createElement('style');
      styleElement.textContent = fontFaceRule;
      document.head.appendChild(styleElement);

      fontFaceCache.set(cacheKey, { url: fontDataUrl, styleElement, weight, style });

      const fontFace = new FontFace(fontFamilyName, `url(${fontDataUrl})`, { weight: String(weight), style });

      try {
        await fontFace.load();
        document.fonts.add(fontFace);
        if (fontObj.loadedStyles && !fontObj.loadedStyles.some(s => s.weight === weight && s.style === style)) {
          fontObj.loadedStyles.push({ weight, style, cached: false });
        }
        console.log(`[FontLoader] Загружен стиль ${fontFamily} ${weight} ${style}`);
        return returnBlob ? blob : undefined;
      } catch (loadError) {
        console.warn(`Не удалось загрузить FontFace для ${fontFamily} ${weight} ${style}:`, loadError);
        if (fontDataUrl) URL.revokeObjectURL(fontDataUrl);
        return returnBlob ? null : undefined;
      }
    } catch (error) {
      console.error(`Ошибка при загрузке стиля ${fontFamily} ${weight} ${style}:`, error);
      if (fontDataUrl) URL.revokeObjectURL(fontDataUrl);
      if (returnBlob) return null;
      else throw error;
    } finally {
      if (!returnBlob && fontDataUrl) {
        // URL.revokeObjectURL(fontDataUrl); // Пока не удаляем, чтобы стили не пропадали
        console.warn(`[FontLoader] Blob URL ${fontDataUrl} для ${fontFamily} ${weight} ${style} НЕ удален (для стабильности стилей).`)
      }
    }
  }, [base64ToArrayBuffer, getFormatFromExtension]); // Добавляем зависимости утилит

  // Загружает все стили/вариативный файл для шрифта Fontsource
  // (Перенесена из useFontManager)
  const loadAllFontsourceStyles = useCallback(async (fontFamily, forceVariableFont = false) => {
    try {
      const metaApiUrl = `/api/fontsource/${encodeURIComponent(fontFamily)}?meta=true`;
      console.log(`[FontLoader] Запрос метаданных к API: ${metaApiUrl}`);
      
      const metaResponse = await fetch(metaApiUrl);
      if (!metaResponse.ok) throw new Error(`Метаданные для ${fontFamily} не найдены (статус ${metaResponse.status})`);
      
      // Проверяем, что ответ содержит JSON
      const metaContentType = metaResponse.headers.get('content-type');
      console.log(`[FontLoader] Content-Type метаданных: ${metaContentType}`);
      if (!metaContentType || !metaContentType.includes('application/json')) {
        throw new Error(`Неожиданный тип ответа от API метаданных: ${metaContentType}`);
      }
      
      const metaResponseText = await metaResponse.text();
      console.log(`[FontLoader] Ответ API метаданных (первые 100 символов): ${metaResponseText.substring(0, 100)}`);
      if (!metaResponseText || metaResponseText === 'undefined') {
        throw new Error('API метаданных вернул пустой или undefined ответ');
      }
      
      const metadata = JSON.parse(metaResponseText);

      const actualIsVariableFont = metadata?.metadata?.variable && forceVariableFont;
      const displayName = actualIsVariableFont ? `${fontFamily} Variable` : fontFamily;
      const fontId = `fontsource-${fontFamily}-${actualIsVariableFont ? 'variable' : 'static'}`;

      const fontObj = {
        id: fontId,
        name: fontFamily,
        displayName: displayName,
        source: 'fontsource',
        fontFamily: `'${displayName}'`,
        variableAxes: actualIsVariableFont ? metadata?.metadata?.axes : {},
        isVariableFont: actualIsVariableFont,
        availableStyles: [],
        loadedStyles: [],
        file: null,
        url: null
      };

      if (actualIsVariableFont && metadata.variable && metadata.variable.url) {
        console.log(`[FontLoader] Загружаем вариативный шрифт ${displayName} по URL: ${metadata.variable.url}`);
        try {
          const fontFileResponse = await fetch(metadata.variable.url);
          if (!fontFileResponse.ok) throw new Error(`Не удалось загрузить файл вариативного шрифта (статус ${fontFileResponse.status})`);
          const fontBuffer = await fontFileResponse.arrayBuffer();
          const fileExtension = metadata.variable.url.split('.').pop()?.toLowerCase() || 'woff2';
          const mimeType = `font/${fileExtension === 'ttf' ? 'ttf' : fileExtension === 'otf' ? 'otf' : fileExtension === 'woff' ? 'woff' : 'woff2'}`;
          const blob = new Blob([fontBuffer], { type: mimeType });

          fontObj.file = blob;
          fontObj.url = URL.createObjectURL(blob);
          console.log(`[FontLoader] Вариативный шрифт ${displayName} загружен, Blob создан, URL: ${fontObj.url}`);

          // TODO: Перенести логику добавления @font-face в useFontCss
          const fontFaceRule = `
              @font-face {
                  font-family: ${fontObj.fontFamily};
                  src: url('${fontObj.url}') format('${fileExtension === 'ttf' ? 'truetype' : fileExtension === 'otf' ? 'opentype' : fileExtension}');
                  font-display: swap;
              }
            `;
          const styleElement = document.createElement('style');
          styleElement.textContent = fontFaceRule;
          document.head.appendChild(styleElement);
          console.log(`[FontLoader] Вариативный шрифт ${displayName} добавлен через <style> tag.`);

        } catch (loadError) {
          console.error(`[FontLoader] Ошибка при загрузке/обработке вариативного файла ${displayName}:`, loadError);
          toast.error(`Ошибка загрузки вариативного шрифта ${displayName}`);
        }
      }

      const weightsArray = Array.isArray(metadata?.metadata?.weights) ? metadata.metadata.weights : [];
      const stylesArray = Array.isArray(metadata?.metadata?.styles) ? metadata.metadata.styles : [];

      const availableStyles = weightsArray.flatMap(weight => {
        return stylesArray.map(style => {
          const weightNum = parseInt(weight, 10) || 400;
          const styleInfo = findStyleInfoByWeightAndStyle(weightNum, style);
          return { name: styleInfo ? styleInfo.name : `${weight} ${style}`, weight: weightNum, style: style };
        });
      });
      fontObj.availableStyles = availableStyles;

      if (!actualIsVariableFont) {
        const regularWeight = weightsArray.includes('400') ? '400' : (weightsArray[0] || '400');
        const regularStyle = stylesArray.includes('normal') ? 'normal' : (stylesArray[0] || 'normal');

        try {
          console.log(`[FontLoader] Загружаем основной статический стиль ${fontFamily} ${regularWeight} ${regularStyle}`);
          const mainStyleBlob = await loadFontStyleVariant(fontFamily, parseInt(regularWeight, 10), regularStyle, fontObj, true);
          if (mainStyleBlob instanceof Blob) {
            fontObj.file = mainStyleBlob;
            fontObj.url = URL.createObjectURL(mainStyleBlob);
            console.log(`[FontLoader] Основной статический стиль ${displayName} загружен, Blob сохранен, URL: ${fontObj.url}`);
          } else {
            console.warn(`[FontLoader] Не удалось получить Blob для основного стиля ${displayName}. Глифы могут быть недоступны.`);
          }
        } catch (mainStyleError) {
            console.error(`[FontLoader] Критическая ошибка при загрузке основного стиля ${displayName}:`, mainStyleError);
            toast.error(`Ошибка загрузки основного стиля ${displayName}. Глифы будут недоступны.`);
        }

        // Загружаем остальные стили в фоне
        setTimeout(async () => {
          const promises = [];
          for (const weight of weightsArray) {
            for (const style of stylesArray) {
              if (weight === regularWeight && style === regularStyle) continue;
              promises.push(loadFontStyleVariant(fontFamily, parseInt(weight, 10), style, fontObj, false)
                .catch(error => console.error(`Ошибка фоновой загрузки стиля ${fontFamily} ${weight} ${style}:`, error)));
            }
          }
          await Promise.allSettled(promises);
          console.log(`[FontLoader] Фоновая загрузка всех стилей для ${fontFamily} завершена.`);
          setFonts(currentFonts => currentFonts.map(f => f.id === fontId ? { ...f } : f));
        }, 100);
      }

      return fontObj;
    } catch (error) {
      console.error(`[FontLoader] Ошибка при загрузке всех стилей шрифта ${fontFamily}:`, error);
      toast.error(`Не удалось загрузить шрифт ${fontFamily}: ${error.message}`);
      throw error; // Пробрасываем ошибку для обработки в вызывающей функции
    }
  }, [setFonts, loadFontStyleVariant, findStyleInfoByWeightAndStyle]); // Добавляем зависимости

  // Обрабатывает загруженные локальные шрифты
  // (Переименована из handleFontsUploaded)
  const handleLocalFontsUpload = useCallback(async (newFonts) => {
    console.log('[handleLocalFontsUpload] Начало обработки:', newFonts);
    if (!Array.isArray(newFonts) || newFonts.length === 0) {
      console.log('[handleLocalFontsUpload] Ошибка: пустой массив или не массив');
      toast.error('Ошибка: Не указаны файлы шрифтов');
      return;
    }
    console.log('[handleLocalFontsUpload] Устанавливаем isLoading=true');
    setIsLoading(true); // Показываем индикатор загрузки
    try {
      const processedFonts = await Promise.all(newFonts.map(async (font) => {
        if (font.file instanceof Blob) {
          return await processLocalFont(font); // processLocalFont ожидает { file: Blob, name: string, ... }
        } else {
          console.warn('[FontLoader] Пропущен элемент в handleLocalFontsUpload, так как отсутствует Blob:', font);
          return null;
        }
      }));

      const validFonts = processedFonts.filter(font => font !== null);

      if (validFonts.length > 0) {
        // Определяем новые шрифты ДО вызова setFonts
        const currentIds = new Set(currentFonts.map(f => f.id).filter(Boolean));
        const trulyNewFonts = validFonts.filter(f => !f.id || !currentIds.has(f.id));
        
        console.log(`[handleLocalFontsUpload] Найдено новых шрифтов: ${trulyNewFonts.length} из ${validFonts.length}`);

        if (trulyNewFonts.length > 0) {
          // Обновляем состояние
          setFonts(prevFonts => [...prevFonts, ...trulyNewFonts]);

          // Сохраняем новые шрифты в IndexedDB
          await Promise.all(trulyNewFonts.map(fontToSave => saveFont(fontToSave)));
          console.log(`[FontLoader/DB] ${trulyNewFonts.length} локальных шрифтов сохранено.`);
          toast.success(`Успешно загружено и сохранено новых локальных шрифтов: ${trulyNewFonts.length}`);
          
          // Выбираем первый из *только что добавленных*
          if (typeof safeSelectFont === 'function') {
            safeSelectFont(trulyNewFonts[0]);
          }
        } else {
             toast.info("Загруженные локальные шрифты уже были добавлены ранее.");
        }
      } else {
        toast.warning('Не удалось обработать ни одного из загруженных локальных файлов.');
      }
    } catch (error) {
      toast.error(`Ошибка при загрузке локальных шрифтов: ${error.message}`);
      console.error('[FontLoader] Ошибка в handleLocalFontsUpload:', error);
    } finally {
      setIsLoading(false); // Убираем индикатор загрузки
    }
  }, [setFonts, setIsLoading, safeSelectFont, processLocalFont, saveFont, currentFonts]); // Добавляем зависимости

  // Выбирает или загружает шрифт Fontsource
  // (Переименована из selectOrAddFontsourceFont)
  const loadAndSelectFontsourceFont = useCallback(async (fontFamilyName, forceVariableFont = false) => {
    try {
      // Проверяем существующие шрифты (переданные как currentFonts)
      const existingFont = currentFonts.find(font => {
        const nameMatch = font.name === fontFamilyName;
        const variableMatch = font.isVariableFont === forceVariableFont;
        // Для вариативных также проверяем displayName, чтобы отличить от статической версии с тем же familyName
        const displayNameMatch = forceVariableFont ? font.displayName?.includes('Variable') : !font.displayName?.includes('Variable');
        return nameMatch && variableMatch && displayNameMatch;
      });

      if (existingFont) {
        if (typeof safeSelectFont === 'function') {
          safeSelectFont(existingFont);
          toast.info(`Шрифт ${existingFont.displayName} уже загружен.`);
        }
        return;
      }

      setIsLoading(true);
      const fontObj = await loadAllFontsourceStyles(fontFamilyName, forceVariableFont);

      if (fontObj) {
        await saveFont(fontObj); // Сохраняем в DB
        setFonts(prevFonts => [...prevFonts, fontObj]); // Добавляем в состояние
        if (typeof safeSelectFont === 'function') {
             safeSelectFont(fontObj); // Выбираем новый шрифт
        }
        toast.success(`Шрифт ${fontObj.displayName} успешно загружен и добавлен`);
      }
      // Ошибка уже обработана и показана в loadAllFontsourceStyles
    } catch (error) {
      // Ошибка уже залогирована и показана в loadAllFontsourceStyles
      // toast.error(`Не удалось загрузить шрифт ${fontFamilyName}`); // Можно добавить общее сообщение
    } finally {
      setIsLoading(false);
    }
  }, [currentFonts, setIsLoading, setFonts, safeSelectFont, loadAllFontsourceStyles, saveFont]); // Добавляем зависимости

  return {
    handleLocalFontsUpload,
    loadAndSelectFontsourceFont,
    loadFontsourceStyleVariant: loadFontStyleVariant, // Экспортируем для useFontStyleManager
    // loadAllFontsourceStyles // Не экспортируем, используется внутри loadAndSelectFontsourceFont
  };
} 