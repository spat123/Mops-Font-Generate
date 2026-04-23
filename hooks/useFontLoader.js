import { useCallback } from 'react';
import { toast } from '../utils/appNotify';
import { findStyleInfoByWeightAndStyle, getFormatFromExtension, PRESET_STYLES } from '../utils/fontUtilsCommon';
import { processLocalFont } from '../utils/localFontProcessor';
import { saveFont } from '../utils/db';
import { base64ToArrayBuffer } from '../utils/fontManagerUtils';

// Кэш для хранения загруженных файлов шрифтов (статических Fontsource)
const fontFaceCache = new Map();

// Хеш-функция для создания уникальных ключей кэширования
const createCacheKey = (fontFamily, weight, style) => `fontsource_${fontFamily}_${weight}_${style}`;

/** Локальные файлы и Fontsource: парсинг, стили, выбор после загрузки. */
export function useFontLoader(setFonts, setIsLoading, safeSelectFont, currentFonts) {

  const loadFontStyleVariant = useCallback(async (fontFamily, weight, style, fontObj, returnBlob = false) => {
    // НЕ загружаем статические стили, если шрифт определен как вариативный
    if (fontObj.isVariableFont) {
      return returnBlob ? null : undefined;
    }

    const cacheKey = createCacheKey(fontFamily, weight, style);

    if (!returnBlob && fontFaceCache.has(cacheKey)) {
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

      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      
      // Проверяем, что ответ содержит JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Неожиданный тип ответа: ${contentType}`);
      }
      
      const responseText = await response.text();
      if (!responseText || responseText === 'undefined') {
        throw new Error('API вернул пустой или undefined ответ');
      }
      
      const parsed = JSON.parse(responseText);
      // Статический API ([fontFamily].js) отдаёт fontData / actualFileName; variable — fontBufferBase64 / fileName
      const fontBufferBase64 = parsed.fontBufferBase64 ?? parsed.fontData;
      const fileName = parsed.fileName ?? parsed.actualFileName;
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
    }
  }, []);

  const loadAllFontsourceStyles = useCallback(async (fontFamily, forceVariableFont = false) => {
    try {
      const metaApiUrl = `/api/fontsource/${encodeURIComponent(fontFamily)}?meta=true`;

      const metaResponse = await fetch(metaApiUrl);
      if (!metaResponse.ok) throw new Error(`Метаданные для ${fontFamily} не найдены (статус ${metaResponse.status})`);
      
      // Проверяем, что ответ содержит JSON
      const metaContentType = metaResponse.headers.get('content-type');
      if (!metaContentType || !metaContentType.includes('application/json')) {
        throw new Error(`Неожиданный тип ответа от API метаданных: ${metaContentType}`);
      }
      
      const metaResponseText = await metaResponse.text();
      if (!metaResponseText || metaResponseText === 'undefined') {
        throw new Error('API метаданных вернул пустой или undefined ответ');
      }
      
      const metadata = JSON.parse(metaResponseText);
      const metadataPayload =
        metadata && typeof metadata === 'object' && metadata.metadata && typeof metadata.metadata === 'object'
          ? metadata.metadata
          : metadata;

      const variableMeta = metadataPayload?.variable;
      const hasVariableSupport = Boolean(variableMeta);
      const actualIsVariableFont = hasVariableSupport && forceVariableFont;
      const familyLabel =
        metadataPayload?.family || metadata?.family || fontFamily;
      const displayName = actualIsVariableFont
        ? `${familyLabel} Variable`
        : familyLabel;
      const fontId = `fontsource-${fontFamily}-${actualIsVariableFont ? 'variable' : 'static'}`;
      const weightsArrayRaw = Array.isArray(metadataPayload?.weights) ? metadataPayload.weights : [];
      const stylesArrayRaw = Array.isArray(metadataPayload?.styles) ? metadataPayload.styles : [];
      const stylesArray = stylesArrayRaw
        .map((style) => String(style || '').trim().toLowerCase())
        .filter(Boolean);
      const hasItalicStyles = stylesArray.includes('italic');
      const parsedVariableAxes =
        actualIsVariableFont && variableMeta && typeof variableMeta === 'object'
          ? Object.entries(variableMeta).reduce((acc, [axisTag, axisValue]) => {
              if (!axisValue || typeof axisValue !== 'object') return acc;
              const min = Number(axisValue.min);
              const max = Number(axisValue.max);
              const def = Number(axisValue.default);
              const step = Number(axisValue.step);
              if (!Number.isFinite(min) || !Number.isFinite(max)) return acc;
              acc[axisTag] = {
                min,
                max,
                default: Number.isFinite(def) ? def : min,
                step: Number.isFinite(step) ? step : 1,
              };
              return acc;
            }, {})
          : {};
      const italicMode = actualIsVariableFont
        ? (parsedVariableAxes.ital
          ? 'axis-ital'
          : parsedVariableAxes.slnt
            ? 'axis-slnt'
            : hasItalicStyles
              ? 'separate-style'
              : 'none')
        : 'none';

      const fontObj = {
        id: fontId,
        name: fontFamily,
        displayName: displayName,
        source: 'fontsource',
        // Имя для FontFace/CSS без лишних кавычек; кавычки добавляет useFontCss.getFontFamily
        fontFamily: displayName,
        variableAxes: parsedVariableAxes,
        isVariableFont: actualIsVariableFont,
        italicMode,
        hasItalicStyles,
        availableStyles: [],
        loadedStyles: [],
        file: null,
        url: null
      };

      if (actualIsVariableFont) {
        try {
          const loadVariableStylePayload = async (targetStyle = 'normal') => {
            const variableApiUrl = `/api/fontsource/${encodeURIComponent(fontFamily)}/variable?subset=latin&style=${encodeURIComponent(targetStyle)}&forceVariable=true`;
            const fontFileResponse = await fetch(variableApiUrl);
            if (!fontFileResponse.ok) throw new Error(`Не удалось загрузить файл вариативного шрифта (статус ${fontFileResponse.status})`);
            const variablePayload = await fontFileResponse.json();
            const fontBufferBase64 = variablePayload?.fontBufferBase64;
            const fileName = String(variablePayload?.fileName || '');
            if (!fontBufferBase64) throw new Error('Пустой буфер вариативного шрифта');
            const fontBuffer = base64ToArrayBuffer(fontBufferBase64);
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'woff2';
            const mimeType = `font/${fileExtension === 'ttf' ? 'ttf' : fileExtension === 'otf' ? 'otf' : fileExtension === 'woff' ? 'woff' : 'woff2'}`;
            const blob = new Blob([fontBuffer], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            return { blob, fileExtension, blobUrl };
          };

          const normalFace = await loadVariableStylePayload('normal');
          fontObj.file = normalFace.blob;
          fontObj.url = normalFace.blobUrl;

          const fontFaceRule = `
              @font-face {
                  font-family: ${JSON.stringify(displayName)};
                  src: url('${normalFace.blobUrl}') format('${normalFace.fileExtension === 'ttf' ? 'truetype' : normalFace.fileExtension === 'otf' ? 'opentype' : normalFace.fileExtension}');
                  font-style: normal;
                  font-display: swap;
              }
            `;
          const styleElement = document.createElement('style');
          styleElement.textContent = fontFaceRule;
          document.head.appendChild(styleElement);

          if (italicMode === 'separate-style' && hasItalicStyles) {
            try {
              const italicFace = await loadVariableStylePayload('italic');
              const italicRule = `
                @font-face {
                    font-family: ${JSON.stringify(displayName)};
                    src: url('${italicFace.blobUrl}') format('${italicFace.fileExtension === 'ttf' ? 'truetype' : italicFace.fileExtension === 'otf' ? 'opentype' : italicFace.fileExtension}');
                    font-style: italic;
                    font-display: swap;
                }
              `;
              const italicStyleElement = document.createElement('style');
              italicStyleElement.textContent = italicRule;
              document.head.appendChild(italicStyleElement);
            } catch (italicLoadError) {
              console.warn(`[FontLoader] Не удалось догрузить italic-face для ${displayName}:`, italicLoadError);
            }
          }

        } catch (loadError) {
          console.error(`[FontLoader] Ошибка при загрузке/обработке вариативного файла ${displayName}:`, loadError);
          throw loadError;
        }
      }

      const weightsArray = weightsArrayRaw
        .map((weight) => parseInt(weight, 10))
        .filter((weight) => Number.isFinite(weight));
      const weightsForStyles = weightsArray.length > 0 ? weightsArray : [400];
      const stylesForStyles = stylesArray.length > 0 ? stylesArray : ['normal'];

      const availableStyles = weightsForStyles.flatMap(weight => {
        return stylesForStyles.map(style => {
          const weightNum = parseInt(weight, 10) || 400;
          const styleInfo = findStyleInfoByWeightAndStyle(weightNum, style);
          return { name: styleInfo ? styleInfo.name : `${weightNum} ${style}`, weight: weightNum, style: style };
        });
      });
      fontObj.availableStyles = availableStyles;

      if (!actualIsVariableFont) {
        const regularWeight = weightsForStyles.includes(400) ? 400 : (weightsForStyles[0] || 400);
        const regularStyle = stylesForStyles.includes('normal') ? 'normal' : (stylesForStyles[0] || 'normal');

        try {
          const mainStyleBlob = await loadFontStyleVariant(fontFamily, regularWeight, regularStyle, fontObj, true);
          if (mainStyleBlob instanceof Blob) {
            fontObj.file = mainStyleBlob;
            fontObj.url = URL.createObjectURL(mainStyleBlob);
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
          for (const weight of weightsForStyles) {
            for (const style of stylesForStyles) {
              if (weight === regularWeight && style === regularStyle) continue;
              promises.push(loadFontStyleVariant(fontFamily, weight, style, fontObj, false)
                .catch(error => console.error(`Ошибка фоновой загрузки стиля ${fontFamily} ${weight} ${style}:`, error)));
            }
          }
          await Promise.allSettled(promises);
          setFonts(currentFonts => currentFonts.map(f => f.id === fontId ? { ...f } : f));
        }, 100);
      }

      return fontObj;
    } catch (error) {
      console.error(`[FontLoader] Ошибка при загрузке всех стилей шрифта ${fontFamily}:`, error);
      toast.error(`Не удалось загрузить шрифт ${fontFamily}: ${error.message}`);
      throw error; // Пробрасываем ошибку для обработки в вызывающей функции
    }
  }, [setFonts, loadFontStyleVariant, findStyleInfoByWeightAndStyle]);

  const handleLocalFontsUpload = useCallback(async (newFonts) => {
    if (!Array.isArray(newFonts) || newFonts.length === 0) {
      toast.error('Ошибка: Не указаны файлы шрифтов');
      return null;
    }
    setIsLoading(true); // Показываем индикатор загрузки
    try {
      const processedFonts = await Promise.all(newFonts.map(async (font) => {
        if (font.file instanceof Blob && font.file.size > 0) {
          return await processLocalFont(font); // processLocalFont ожидает { file: Blob, name: string, ... }
        } else {
          console.warn('[FontLoader] Пропущен элемент в handleLocalFontsUpload (нет Blob или размер 0):', font);
          return null;
        }
      }));

      const validFonts = processedFonts.filter(font => font !== null);

      if (validFonts.length > 0) {
        // Определяем новые шрифты ДО вызова setFonts
        const currentIds = new Set(currentFonts.map(f => f.id).filter(Boolean));
        const trulyNewFonts = validFonts.filter(f => !f.id || !currentIds.has(f.id));

        if (trulyNewFonts.length > 0) {
          // Обновляем состояние
          setFonts(prevFonts => [...prevFonts, ...trulyNewFonts]);

          // Сохраняем новые шрифты в IndexedDB
          await Promise.all(trulyNewFonts.map(fontToSave => saveFont(fontToSave)));
          toast.success(`Успешно загружено и сохранено новых локальных шрифтов: ${trulyNewFonts.length}`);
          
          // Выбираем первый из *только что добавленных*
          if (typeof safeSelectFont === 'function') {
            safeSelectFont(trulyNewFonts[0]);
          }
          return trulyNewFonts[0];
        }
        toast.info("Загруженные локальные шрифты уже были добавлены ранее.");
        return null;
      }
      toast.warning('Не удалось обработать ни одного из загруженных локальных файлов.');
      return null;
    } catch (error) {
      toast.error(`Ошибка при загрузке локальных шрифтов: ${error.message}`);
      console.error('[FontLoader] Ошибка в handleLocalFontsUpload:', error);
      return null;
    } finally {
      setIsLoading(false); // Убираем индикатор загрузки
    }
  }, [setFonts, setIsLoading, safeSelectFont, processLocalFont, saveFont, currentFonts]);

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
        return existingFont;
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
        return fontObj;
      }
      // Ошибка уже обработана и показана в loadAllFontsourceStyles
      return null;
    } catch (error) {
      // Ошибка уже залогирована и показана в loadAllFontsourceStyles
      // toast.error(`Не удалось загрузить шрифт ${fontFamilyName}`); // Можно добавить общее сообщение
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentFonts, setIsLoading, setFonts, safeSelectFont, loadAllFontsourceStyles, saveFont]);

  return {
    handleLocalFontsUpload,
    loadAndSelectFontsourceFont,
    loadFontsourceStyleVariant: loadFontStyleVariant,
  };
}

