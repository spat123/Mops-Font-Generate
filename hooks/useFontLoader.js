import { useCallback } from 'react';
import { toast } from '../utils/appNotify';
import { findStyleInfoByWeightAndStyle, getFormatFromExtension, PRESET_STYLES } from '../utils/fontUtilsCommon';
import { processLocalFont } from '../utils/localFontProcessor';
import { saveFont } from '../utils/db';
import { base64ToArrayBuffer } from '../utils/fontManagerUtils';
import {
  FONTSOURCE_UNICODE_RANGE_CYRILLIC,
  FONTSOURCE_UNICODE_RANGE_LATIN,
} from '../utils/fontsourceSubsetUnicodeRange';

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
    const blobUrls = [];

    const formatCssFromFileName = (fn) => {
      const ext = String(fn || '.woff2').split('.').pop()?.toLowerCase() || 'woff2';
      if (ext === 'woff2') return 'woff2';
      if (ext === 'woff') return 'woff';
      if (ext === 'ttf') return 'truetype';
      if (ext === 'otf') return 'opentype';
      return 'woff2';
    };

    const fetchFontsourceSubset = async (subset) => {
      const apiUrl = `/api/fontsource/${encodeURIComponent(fontFamily)}?weight=${weight}&style=${style}&subset=${encodeURIComponent(subset)}`;
      const response = await fetch(apiUrl);
      if (!response.ok) return null;
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return null;
      }
      const responseText = await response.text();
      if (!responseText || responseText === 'undefined') {
        return null;
      }
      const parsed = JSON.parse(responseText);
      const fontBufferBase64 = parsed.fontBufferBase64 ?? parsed.fontData;
      const fileName = parsed.fileName ?? parsed.actualFileName;
      if (!fontBufferBase64) return null;
      return { fontBufferBase64, fileName: String(fileName || '') };
    };

    try {
      const fontFamilyName = fontObj.fontFamily || fontFamily;

      const latinRow = await fetchFontsourceSubset('latin');
      if (!latinRow) {
        throw new Error('Ошибка HTTP или пустой ответ для subset=latin');
      }

      const cyrillicRow = await fetchFontsourceSubset('cyrillic');

      const makeBlobUrl = (row) => {
        const fontBuffer = base64ToArrayBuffer(row.fontBufferBase64);
        const mimeType = `font/${getFormatFromExtension(row.fileName || '.woff2')}`;
        const b = new Blob([fontBuffer], { type: mimeType });
        const u = URL.createObjectURL(b);
        blobUrls.push(u);
        return { url: u, fileName: row.fileName, fmt: formatCssFromFileName(row.fileName) };
      };

      const latin = makeBlobUrl(latinRow);
      let cyrillic = null;
      if (cyrillicRow) {
        try {
          cyrillic = makeBlobUrl(cyrillicRow);
        } catch (e) {
          console.warn(`[FontLoader] Cyrillic subset пропущен для ${fontFamily} ${weight} ${style}:`, e?.message || e);
        }
      }

      blob = new Blob([base64ToArrayBuffer(latinRow.fontBufferBase64)], {
        type: `font/${getFormatFromExtension(latinRow.fileName || '.woff2')}`,
      });

      if (fontObj && cyrillicRow && !(fontObj.fontsourceCyrillicFile instanceof Blob)) {
        try {
          fontObj.fontsourceCyrillicFile = new Blob([base64ToArrayBuffer(cyrillicRow.fontBufferBase64)], {
            type: `font/${getFormatFromExtension(cyrillicRow.fileName || '.woff2')}`,
          });
        } catch (persistCyErr) {
          console.warn(`[FontLoader] Не удалось сохранить cyrillic blob для ${fontFamily}:`, persistCyErr?.message || persistCyErr);
        }
      }

      const ffName = JSON.stringify(fontFamilyName);
      const rules = [
        `@font-face {
          font-family: ${ffName};
          src: url('${latin.url}') format('${latin.fmt}');
          font-weight: ${weight};
          font-style: ${style};
          unicode-range: ${FONTSOURCE_UNICODE_RANGE_LATIN};
        }`,
      ];
      if (cyrillic) {
        rules.push(`@font-face {
          font-family: ${ffName};
          src: url('${cyrillic.url}') format('${cyrillic.fmt}');
          font-weight: ${weight};
          font-style: ${style};
          unicode-range: ${FONTSOURCE_UNICODE_RANGE_CYRILLIC};
        }`);
      }

      const styleElement = document.createElement('style');
      styleElement.textContent = rules.join('\n');
      document.head.appendChild(styleElement);

      fontFaceCache.set(cacheKey, { blobUrls, styleElement, weight, style });

      const fontStyleToken = style === 'italic' ? 'italic' : 'normal';
      const loadSpec = `${fontStyleToken} ${weight} 16px ${ffName}`;
      try {
        await document.fonts.load(loadSpec);
        if (fontObj.loadedStyles && !fontObj.loadedStyles.some((s) => s.weight === weight && s.style === style)) {
          fontObj.loadedStyles.push({ weight, style, cached: false });
        }
        return returnBlob ? blob : undefined;
      } catch (loadError) {
        console.warn(`Не удалось дождаться загрузки шрифта для ${fontFamily} ${weight} ${style}:`, loadError);
        for (const u of blobUrls) {
          try {
            URL.revokeObjectURL(u);
          } catch {
            // noop
          }
        }
        try {
          styleElement.remove();
        } catch {
          // noop
        }
        fontFaceCache.delete(cacheKey);
        return returnBlob ? null : undefined;
      }
    } catch (error) {
      console.error(`Ошибка при загрузке стиля ${fontFamily} ${weight} ${style}:`, error);
      for (const u of blobUrls) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // noop
        }
      }
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
        originKey: `fontsource:${fontFamily}`,
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
          const cssFmt = (ext) => (ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext);

          const loadVariableStylePayload = async (targetStyle = 'normal', subset = 'latin', softFail = false) => {
            const variableApiUrl = `/api/fontsource/${encodeURIComponent(fontFamily)}/variable?subset=${encodeURIComponent(subset)}&style=${encodeURIComponent(targetStyle)}&forceVariable=true`;
            const fontFileResponse = await fetch(variableApiUrl);
            if (!fontFileResponse.ok) {
              if (softFail) return null;
              throw new Error(`Не удалось загрузить файл вариативного шрифта (статус ${fontFileResponse.status})`);
            }
            const variablePayload = await fontFileResponse.json();
            const fontBufferBase64 = variablePayload?.fontBufferBase64;
            const fileName = String(variablePayload?.fileName || '');
            if (!fontBufferBase64) {
              if (softFail) return null;
              throw new Error('Пустой буфер вариативного шрифта');
            }
            const fontBuffer = base64ToArrayBuffer(fontBufferBase64);
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'woff2';
            const mimeType = `font/${fileExtension === 'ttf' ? 'ttf' : fileExtension === 'otf' ? 'otf' : fileExtension === 'woff' ? 'woff' : 'woff2'}`;
            const blob = new Blob([fontBuffer], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            return { blob, fileExtension, blobUrl };
          };

          const normalLatin = await loadVariableStylePayload('normal', 'latin', false);
          const normalCyrillic = await loadVariableStylePayload('normal', 'cyrillic', true);

          fontObj.file = normalLatin.blob;
          fontObj.url = normalLatin.blobUrl;
          if (normalCyrillic) {
            fontObj.fontsourceCyrillicFile = normalCyrillic.blob;
          }

          const ff = JSON.stringify(displayName);
          const normalRules = [
            `@font-face {
                  font-family: ${ff};
                  src: url('${normalLatin.blobUrl}') format('${cssFmt(normalLatin.fileExtension)}');
                  font-style: normal;
                  font-display: swap;
                  unicode-range: ${FONTSOURCE_UNICODE_RANGE_LATIN};
              }`,
          ];
          if (normalCyrillic) {
            normalRules.push(`@font-face {
                  font-family: ${ff};
                  src: url('${normalCyrillic.blobUrl}') format('${cssFmt(normalCyrillic.fileExtension)}');
                  font-style: normal;
                  font-display: swap;
                  unicode-range: ${FONTSOURCE_UNICODE_RANGE_CYRILLIC};
              }`);
          }

          const styleElement = document.createElement('style');
          styleElement.textContent = normalRules.join('\n');
          document.head.appendChild(styleElement);

          if (italicMode === 'separate-style' && hasItalicStyles) {
            try {
              const italicLatin = await loadVariableStylePayload('italic', 'latin', false);
              const italicCyrillic = await loadVariableStylePayload('italic', 'cyrillic', true);
              const italicRules = [
                `@font-face {
                    font-family: ${ff};
                    src: url('${italicLatin.blobUrl}') format('${cssFmt(italicLatin.fileExtension)}');
                    font-style: italic;
                    font-display: swap;
                    unicode-range: ${FONTSOURCE_UNICODE_RANGE_LATIN};
                }`,
              ];
              if (italicCyrillic) {
                italicRules.push(`@font-face {
                    font-family: ${ff};
                    src: url('${italicCyrillic.blobUrl}') format('${cssFmt(italicCyrillic.fileExtension)}');
                    font-style: italic;
                    font-display: swap;
                    unicode-range: ${FONTSOURCE_UNICODE_RANGE_CYRILLIC};
                }`);
              }
              const italicStyleElement = document.createElement('style');
              italicStyleElement.textContent = italicRules.join('\n');
              document.head.appendChild(italicStyleElement);
              fontObj.fontsourceItalicLatinFile = italicLatin.blob;
              if (italicCyrillic) {
                fontObj.fontsourceItalicCyrillicFile = italicCyrillic.blob;
              }
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

  const handleLocalFontsUpload = useCallback(async (newFonts, options = {}) => {
    const { silent = false, noSelect = false } = options;
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
          if (!silent) {
            toast.success(`Успешно загружено и сохранено новых локальных шрифтов: ${trulyNewFonts.length}`);
          }
          
          // Выбираем первый из *только что добавленных*
          if (!noSelect && typeof safeSelectFont === 'function') {
            safeSelectFont(trulyNewFonts[0]);
          }
          return trulyNewFonts[0];
        }
        if (!silent) {
          toast.info("Загруженные локальные шрифты уже были добавлены ранее.");
        }
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

  const loadAndSelectFontsourceFont = useCallback(async (
    fontFamilyName,
    forceVariableFont = false,
    options = {},
  ) => {
    const { silent = false, noSelect = false } = options;
    try {
      // Проверяем существующие шрифты (переданные как currentFonts)
      const existingFont = currentFonts.find(font => {
        const sourceMatch = font?.source === 'fontsource';
        const nameMatch = font.name === fontFamilyName;
        const variableMatch = font.isVariableFont === forceVariableFont;
        // Для вариативных также проверяем displayName, чтобы отличить от статической версии с тем же familyName
        const displayNameMatch = forceVariableFont ? font.displayName?.includes('Variable') : !font.displayName?.includes('Variable');
        return sourceMatch && nameMatch && variableMatch && displayNameMatch;
      });

      if (existingFont) {
        if (!noSelect && typeof safeSelectFont === 'function') {
          safeSelectFont(existingFont);
          if (!silent) {
            toast.info(`Шрифт ${existingFont.displayName} уже загружен.`);
          }
        }
        return existingFont;
      }

      setIsLoading(true);
      const fontObj = await loadAllFontsourceStyles(fontFamilyName, forceVariableFont);

      if (fontObj) {
        await saveFont(fontObj); // Сохраняем в DB
        setFonts(prevFonts => [...prevFonts, fontObj]); // Добавляем в состояние
        if (!noSelect && typeof safeSelectFont === 'function') {
             safeSelectFont(fontObj); // Выбираем новый шрифт
        }
        if (!silent) {
          toast.success(`Шрифт ${fontObj.displayName} успешно загружен и добавлен`);
        }
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
