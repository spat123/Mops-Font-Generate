import { toast } from './appNotify';
import { parseFontBuffer, isVariableFont, mergeFvarAxesFromFontInputs, normalizeFvarAxisTag } from './fontParser';
import { filterPresetStylesForVariableAxes, findStyleInfoByWeightAndStyle } from './fontUtilsCommon';
import { applyGoogleFontInstanceStylesToFont } from './googleFontInstanceStyles';
import { applyFontInstanceStylesToFont, extractFvarInstanceStyles, type FontInstanceStyle } from './fontInstanceStyles';
import { buildVariationSettingsCssString } from './fontVariationSettings';
import { loadFontFaceIfNeeded, buildVariableFontFaceDescriptors } from './cssGenerator';
import type { SessionFontRecord } from '../types/editorFonts';
import { resolveDefaultCatalogSubset } from './catalogActiveSubset';
import type { FvarAxisMeta } from './fontParser';
import { extractFontNameTableFromParsedFont, type FontNameTable } from './fontNameTable';

export type GoogleFontSlice = {
  blob?: Blob;
  unicodeRange?: string | null;
  weight?: number;
  style?: string;
};

export type LocalFontProcessorInput = SessionFontRecord & {
  file: Blob;
  name: string;
  googleFontAxesFromCatalog?: unknown[] | null;
  googleFontSlices?: GoogleFontSlice[];
  googleFontItalicFile?: Blob | null;
  googleFontItalicMode?: string;
  googleFontHasItalicStyles?: boolean;
  googleFontInstanceStyles?: FontInstanceStyle[];
  googleFontRecommendedSample?: string;
  catalogSubsets?: string[];
  activeSubset?: string;
};

type CachedAxisInfo = {
  name?: string;
  min?: number;
  max?: number;
  default?: number;
};

type LocalFontCacheEntry = {
  preferredFamily?: string;
  preferredSubfamily?: string;
  names?: { fontFamily?: string; fontSubfamily?: string };
  isVariable?: boolean;
  supportedAxes?: Record<string, CachedAxisInfo>;
  instanceStyles?: FontInstanceStyle[];
  os2WeightClass?: number | null;
  nameTable?: FontNameTable | null;
};

const localFontCache: Record<string, LocalFontCacheEntry> = {};

function axisNameFromOpentype(nameField: unknown, tag: string): string {
  if (nameField && typeof nameField === 'object' && nameField !== null && 'en' in nameField) {
    return String((nameField as { en?: string }).en || tag.toUpperCase());
  }
  return tag.toUpperCase();
}

/**
 * Освобождает URL, созданный через URL.createObjectURL().
 * @param {string} url - URL для освобождения
 */
export const revokeObjectURL = (url: string | null | undefined): void => {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Failed to revoke Object URL:', error);
    }
  }
};

/** Дескрипторы FontFace для одного статического Google subset (unicode-range + вес). */
export const buildGoogleStaticSliceFaceDescriptors = (
  slice: GoogleFontSlice | null | undefined,
): FontFaceDescriptors => {
  const w = Number(slice?.weight);
  const weight = Number.isFinite(w) ? Math.round(w) : 400;
  const desc: FontFaceDescriptors = {
    weight: String(weight),
    style: slice?.style === 'italic' ? 'italic' : 'normal',
  };
  const ur = slice?.unicodeRange != null ? String(slice.unicodeRange).trim() : '';
  if (ur) desc.unicodeRange = ur;
  return desc;
};

/**
 * VF-subset Google (woff2 на unicode-range): диапазон веса из fvar + unicode-range из CSS.
 * Без unicode-range браузер может не сопоставить нужные глифы с нужным файлом.
 */
export const buildGoogleVariableSliceFaceDescriptors = (
  sliceMeta: GoogleFontSlice | null | undefined,
  variableAxes: Record<string, FvarAxisMeta> | null | undefined,
): FontFaceDescriptors => {
  const base = buildVariableFontFaceDescriptors(variableAxes || {});
  const ur =
    sliceMeta && sliceMeta.unicodeRange != null ? String(sliceMeta.unicodeRange).trim() : '';
  if (!ur) return base;
  return { ...base, unicodeRange: ur };
};

async function registerGoogleFontSlices(
  fontFamilyName: string,
  slices: GoogleFontSlice[],
  fontObj: SessionFontRecord,
  initialSettings: Record<string, number>,
): Promise<void> {
  await Promise.all(
    slices.map(async (sl) => {
      if (!sl?.blob) return;
      const sliceUrl = URL.createObjectURL(sl.blob);
      try {
        const faceDesc = fontObj.isVariableFont
          ? buildGoogleVariableSliceFaceDescriptors(
              sl,
              fontObj.variableAxes as Record<string, FvarAxisMeta> | undefined,
            )
          : buildGoogleStaticSliceFaceDescriptors(sl);
        await loadFontFaceIfNeeded(fontFamilyName, sliceUrl, initialSettings, '', faceDesc);
      } finally {
        revokeObjectURL(sliceUrl);
      }
    }),
  );
}

async function registerItalicVariableFace(
  fontFamilyName: string,
  italicFile: Blob,
  fontObj: SessionFontRecord,
  cacheId = '',
): Promise<void> {
  if (!(italicFile instanceof Blob) || !fontObj?.isVariableFont) return;
  const italicBuffer = await italicFile.arrayBuffer();
  const faceDescriptors = buildVariableFontFaceDescriptors(
    fontObj.variableAxes as Record<string, FvarAxisMeta>,
    { style: 'italic' },
  );
  await loadFontFaceIfNeeded(fontFamilyName, italicBuffer, {}, cacheId, faceDescriptors);
}

function resolveFontItalicMode(
  variableAxes: SessionFontRecord['variableAxes'],
  hasItalicStyles = false,
): string {
  const axes = variableAxes && typeof variableAxes === 'object' ? variableAxes : {};
  if (axes.ital && typeof axes.ital === 'object') return 'axis-ital';
  if (axes.slnt && typeof axes.slnt === 'object') return 'axis-slnt';
  if (hasItalicStyles) return 'separate-style';
  return 'none';
}

function applyVariableFontPresetStyles(
  fontObj: SessionFontRecord,
  parsedFontData: unknown,
  externalInstanceStyles: FontInstanceStyle[] | null | undefined,
): void {
  if (Array.isArray(externalInstanceStyles) && externalInstanceStyles.length > 0) {
    applyGoogleFontInstanceStylesToFont(fontObj, externalInstanceStyles);
    return;
  }

  const fvarInstances = parsedFontData ? extractFvarInstanceStyles(parsedFontData) : [];
  if (fvarInstances.length > 0) {
    applyFontInstanceStylesToFont(fontObj, fvarInstances);
    return;
  }

  fontObj.availableStyles = filterPresetStylesForVariableAxes(fontObj.variableAxes, undefined, {
    italicMode: fontObj.italicMode,
  });
}

/**
 * Асинхронно вычисляет SHA-256 хэш для Blob-файла.
 * @param {Blob} file - Файл (Blob)
 * @returns {Promise<string|null>} HEX-строка хэша или null при ошибке
 */
const calculateFileHash = async (file: Blob): Promise<string | null> => {
  if (!(file instanceof Blob)) {
    console.error('Invalid input for hashing: expected Blob.');
    return null;
  }
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    // Преобразуем ArrayBuffer хэша в HEX-строку
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
 * @returns {Promise<Object|null>} Обработанный объект шрифта или null при критической ошибке
 */
export const processLocalFont = async (
  incomingFontInput: SessionFontRecord & { file?: Blob; name?: string },
): Promise<SessionFontRecord | null> => {
  if (!incomingFontInput || !(incomingFontInput.file instanceof Blob) || !incomingFontInput.name) {
    toast.error('Неверные входные данные для обработки локального шрифта.');
    return null;
  }

  let fontInput = incomingFontInput as LocalFontProcessorInput;
  const cleanedName = fontInput.name.replace(/\.[^/.]+$/, '');
  const source = fontInput.source === 'google' ? 'google' : 'local';

  /** gstatic-сабсеты: в fvar обычно только wght; полный variable TTF берём из google/fonts на GitHub. */
  if (
    source === 'google' &&
    Array.isArray(fontInput.googleFontAxesFromCatalog) &&
    fontInput.googleFontAxesFromCatalog.length >= 2 &&
    Array.isArray(fontInput.googleFontSlices) &&
    fontInput.googleFontSlices.length > 0
  ) {
    try {
      const res = await fetch(`/api/google-font-github-vf?family=${encodeURIComponent(cleanedName)}`);
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('font') || ct.includes('ttf') || ct.includes('octet')) {
          const blob = await res.blob();
          if (blob instanceof Blob && blob.size > 10_000) {
            let italicBlob = fontInput.googleFontItalicFile instanceof Blob ? fontInput.googleFontItalicFile : null;
            const shouldLoadItalicVf =
              fontInput.googleFontItalicMode === 'separate-style' &&
              fontInput.googleFontHasItalicStyles === true;
            if (!italicBlob && shouldLoadItalicVf) {
              try {
                const italicRes = await fetch(
                  `/api/google-font-github-vf?family=${encodeURIComponent(cleanedName)}&italic=1`,
                );
                if (italicRes.ok) {
                  const italicCt = italicRes.headers.get('content-type') || '';
                  if (italicCt.includes('font') || italicCt.includes('ttf') || italicCt.includes('octet')) {
                    const loadedItalicBlob = await italicRes.blob();
                    if (loadedItalicBlob instanceof Blob && loadedItalicBlob.size > 10_000) {
                      italicBlob = loadedItalicBlob;
                    }
                  }
                }
              } catch (italicError) {
                console.warn('[localFontProcessor] Italic VF с GitHub:', cleanedName, italicError);
              }
            }
            fontInput = {
              ...fontInput,
              file: blob,
              name: `${cleanedName}.ttf`,
              googleFontItalicFile: italicBlob,
              googleFontSlices: undefined,
              googleFontAxesFromCatalog: null,
            };
          }
        }
      }
    } catch (e) {
      console.warn('[localFontProcessor] Полный VF с GitHub:', cleanedName, e);
    }
  }

  const { file, name } = fontInput;
  const fontId = Math.random().toString(36).substring(2, 9); // Короткий ID для читаемости
  let objectUrl = null;
  let cacheKey = null; // Инициализируем cacheKey

  try {
    // 1. Вычисляем хэш файла для ключа кэша
    cacheKey = await calculateFileHash(file);
    if (!cacheKey) {
      // If hash is unavailable, skip cache but continue processing.
      toast.warning('Не удалось создать ключ кэша для шрифта, кэширование будет пропущено.');
    }

    // 2. Проверка кэша (по хэшу). Google multi-subset здесь не кэшируем.
    if (
      cacheKey &&
      localFontCache[cacheKey] &&
      !(Array.isArray(fontInput.googleFontSlices) && fontInput.googleFontSlices.length > 0)
    ) {
      objectUrl = URL.createObjectURL(file); // Always need a fresh object URL.
      const cachedMetadata: LocalFontCacheEntry = { ...localFontCache[cacheKey] };

      const fontFamilyName = `font-${fontId}`; // Генерируем уникальное имя

      // Build fontObj from cached metadata.
      const fontObj: SessionFontRecord = {
        id: fontId,
        name: String(cachedMetadata.preferredFamily || (cachedMetadata.names as { fontFamily?: string })?.fontFamily || cleanedName),
        originalName: name,
        source,
        originKey: source === 'google' ? `google:${cleanedName}` : `local:${fontId}`,
        currentWeight: 400, // Refined below.
        currentStyle: 'normal', // Refined below.
        isVariableFont: cachedMetadata.isVariable || false, // Use cache flag.
        variableAxes: {},
        supportedAxes: [],
        variationSettings: '',
        availableStyles: [],
        file: file, // Оставляем файл для возможного повторного использования
        url: objectUrl, // Keep blob URL for FontFace API.
        fontFamily: fontFamilyName, // Keep generated family name.
        nameTable: cachedMetadata.nameTable || null,
      };

      // Восстанавливаем оси и стили из кэшированных метаданных
      if (fontObj.isVariableFont && cachedMetadata.supportedAxes) {
         // Fill axis info from cached metadata.
         fontObj.variableAxes = Object.entries(cachedMetadata.supportedAxes).reduce<
           Record<string, FvarAxisMeta>
         >((acc, [tag, axisInfo]) => {
                acc[tag] = {
                  name: axisInfo.name || tag.toUpperCase(),
                  min: axisInfo.min ?? 0,
                  max: axisInfo.max ?? 0,
                  default: axisInfo.default ?? 0,
                };
                return acc;
         }, {});
         fontObj.supportedAxes = Object.keys(cachedMetadata.supportedAxes);
         fontObj.variationSettings = buildVariationSettingsCssString(fontObj.variableAxes);
         fontObj.italicMode = resolveFontItalicMode(fontObj.variableAxes, fontObj.hasItalicStyles);
         if (Array.isArray(cachedMetadata.instanceStyles) && cachedMetadata.instanceStyles.length > 0) {
           applyFontInstanceStylesToFont(fontObj, cachedMetadata.instanceStyles);
         } else {
           try {
             const buffer = await file.arrayBuffer();
             const reparsed = await parseFontBuffer(buffer, cleanedName);
             const fvarInstances = extractFvarInstanceStyles(reparsed);
             if (fvarInstances.length > 0) {
               applyFontInstanceStylesToFont(fontObj, fvarInstances);
               if (cacheKey) {
                 localFontCache[cacheKey] = { ...cachedMetadata, instanceStyles: fvarInstances };
               }
             } else {
               fontObj.availableStyles = filterPresetStylesForVariableAxes(fontObj.variableAxes, undefined, {
                 italicMode: fontObj.italicMode,
               });
             }
           } catch (cacheInstanceError) {
             console.warn('[localFontProcessor] fvar instances from cache miss:', cleanedName, cacheInstanceError);
             fontObj.availableStyles = filterPresetStylesForVariableAxes(fontObj.variableAxes, undefined, {
               italicMode: fontObj.italicMode,
             });
           }
         }
      } else if (!fontObj.isVariableFont && cachedMetadata.names) {
         // Определяем стиль/вес для невариативных шрифтов из кэша
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

         const os2Weight = cachedMetadata.os2WeightClass;
         if (Number.isFinite(Number(os2Weight))) {
           weight = Number(os2Weight);
         }

         fontObj.currentWeight = weight;
         fontObj.currentStyle = style;
         const styleInfo = findStyleInfoByWeightAndStyle(weight, style);
         const displayStyleName = String(subfamily || '').trim() || styleInfo.name;
         fontObj.availableStyles = [{ name: displayStyleName, weight, style }];
      } else {
          // Если стилей нет в кэше (например, старый кэш или ошибка парсинга при кэшировании)
          fontObj.availableStyles = [{ name: 'Regular', weight: 400, style: 'normal' }];
      }

      // Определяем начальные настройки для вариативных шрифтов из кэша
      let initialSettings = {};
      if (fontObj.isVariableFont && fontObj.variableAxes) {
        initialSettings = Object.entries(fontObj.variableAxes).reduce<Record<string, number>>(
          (acc, [tag, axis]) => {
          acc[tag] = (axis as FvarAxisMeta).default;
          return acc;
        },
          {},
        );
      }

      // Используем loadFontFaceIfNeeded напрямую.
      try {
        const faceDescriptors = fontObj.isVariableFont
          ? buildVariableFontFaceDescriptors(fontObj.variableAxes as Record<string, FvarAxisMeta>)
          : {};
        // Вызываем функцию через именованный импорт
        await loadFontFaceIfNeeded(fontFamilyName, objectUrl, initialSettings, '', faceDescriptors);
        revokeObjectURL(objectUrl);
        // Новый blob URL: старый отозван, иначе fontObj.url был бы невалидным (NetworkError)
        fontObj.url = URL.createObjectURL(file);
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

    // 4. Парсинг файла и получение полного объекта шрифта через parseFontBuffer
    // parseFontFile теперь возвращает metadata-объект или null
    let parsedFontData = null;
    try {
       const buffer = await file.arrayBuffer();
       parsedFontData = await parseFontBuffer(buffer); // Используем parseFontBuffer
    } catch (e) {
        console.error(`Error reading or parsing font buffer for ${name}:`, e);
        toast.error(`Ошибка чтения или анализа файла шрифта ${name}.`);
        // Ниже всё равно собираем fontObj из метаданных, даже если parse не удался
    }

    // Создаём базовый объект шрифта
    const fontObj: SessionFontRecord = {
      id: fontId,
      name: cleanedName,
      originalName: name,
      source,
      originKey: source === 'google' ? `google:${cleanedName}` : `local:${fontId}`,
      currentWeight: 400,
      currentStyle: 'normal',
      isVariableFont: false, // Уточним из metadata
      variableAxes: {},
      supportedAxes: [],
      variationSettings: '',
      availableStyles: [],
      file: file,
      hasItalicStyles: fontInput.googleFontHasItalicStyles === true,
      googleFontItalicFile: fontInput.googleFontItalicFile instanceof Blob ? fontInput.googleFontItalicFile : null,
      italicMode:
        typeof fontInput.googleFontItalicMode === 'string' && fontInput.googleFontItalicMode
          ? fontInput.googleFontItalicMode
          : 'none',
      fontFamily: undefined,
    };

    // Устанавливаем fontObj.url и fontObj.fontFamily
    const fontFamilyName = `font-${fontId}`;
    fontObj.url = objectUrl;
    fontObj.fontFamily = fontFamilyName;
    if (fontInput.googleFontRecommendedSample && typeof fontInput.googleFontRecommendedSample === 'string') {
      fontObj.googleFontRecommendedSample = fontInput.googleFontRecommendedSample.trim();
    }
    if (Array.isArray(fontInput.catalogSubsets) && fontInput.catalogSubsets.length > 0) {
      fontObj.catalogSubsets = fontInput.catalogSubsets;
      fontObj.activeSubset =
        String(fontInput.activeSubset || '').trim() ||
        resolveDefaultCatalogSubset(fontInput.catalogSubsets);
    }

    // 5. Заполняем fontObj данными парсинга, если он успешен
    if (parsedFontData) {
      // Используем данные из parsedFontData (результат opentype.parse)
      // Получаем имена (предпочтительно английские)
      const names = parsedFontData.names || {};
      const nameTable = extractFontNameTableFromParsedFont(parsedFontData);
      const preferredFamily = names.preferredFamily?.en || names.fontFamily?.en;
      const preferredSubfamily = names.preferredSubfamily?.en || names.fontSubfamily?.en || 'Regular';

      fontObj.name = preferredFamily || fontObj.name;
      fontObj.isVariableFont = isVariableFont(parsedFontData); // Используем isVariableFont
      fontObj.nameTable = nameTable;

      const fvarAxes = parsedFontData.tables?.fvar?.axes;
      if (fontObj.isVariableFont && Array.isArray(fvarAxes)) {
         fontObj.variableAxes = fvarAxes.reduce<Record<string, FvarAxisMeta>>(
           (acc, axis) => {
                const tag = normalizeFvarAxisTag(axis.tag);
                if (!tag) return acc;
                const axisName = axisNameFromOpentype(axis.name, tag);
                 acc[tag] = {
                   name: axisName,
                   min: axis.minValue ?? 0,
                   max: axis.maxValue ?? 0,
                   default: axis.defaultValue ?? 0,
                 };
                return acc;
         },
           {},
         );
         fontObj.supportedAxes = Object.keys(fontObj.variableAxes);
         fontObj.variationSettings = buildVariationSettingsCssString(fontObj.variableAxes);
         fontObj.italicMode = resolveFontItalicMode(fontObj.variableAxes, fontObj.hasItalicStyles);
         applyVariableFontPresetStyles(fontObj, parsedFontData, fontInput.googleFontInstanceStyles);

        const gfSlices = fontInput.googleFontSlices;
        if (Array.isArray(gfSlices) && gfSlices.length > 1) {
          try {
            const extraBlobs = gfSlices.slice(1).map((s) => s.blob).filter((b) => b instanceof Blob);
            const mergedAxes = await mergeFvarAxesFromFontInputs([parsedFontData, ...extraBlobs]);
            if (mergedAxes && Object.keys(mergedAxes).length > 0) {
              fontObj.variableAxes = mergedAxes;
              fontObj.supportedAxes = Object.keys(mergedAxes);
              fontObj.italicMode = resolveFontItalicMode(mergedAxes, fontObj.hasItalicStyles);
              fontObj.variationSettings = Object.entries(mergedAxes)
                .map(([tag, v]) => {
                  const d = v?.default;
                  const num = typeof d === 'number' && Number.isFinite(d) ? d : 0;
                  return `\"${tag}\" ${num}`;
                })
                .join(', ');
              const existingInstances = fontObj.fontInstanceStyles;
              if (!(Array.isArray(existingInstances) && existingInstances.length > 0)) {
                applyVariableFontPresetStyles(fontObj, parsedFontData, fontInput.googleFontInstanceStyles);
              }
            }
          } catch (e) {
            console.warn('[localFontProcessor] Объединение fvar по слайсам Google:', e);
          }
        }

      } else if (fontObj.isVariableFont && !parsedFontData.tables?.fvar?.axes) {
         // Вариативный, но оси не извлеклись
         console.warn(`Variable font ${name} parsed without axes info.`);
         fontObj.isVariableFont = false; // Считаем невариативным
         fontObj.availableStyles = [{ name: 'Regular', weight: 400, style: 'normal' }];
      } else if (Array.isArray(fontInput.googleFontInstanceStyles) && fontInput.googleFontInstanceStyles.length > 0) {
        applyGoogleFontInstanceStylesToFont(fontObj, fontInput.googleFontInstanceStyles);
        const regular =
          fontObj.availableStyles.find((s) => s?.name === 'Regular') || fontObj.availableStyles[0];
        if (regular) {
          fontObj.currentWeight = regular.weight;
          fontObj.currentStyle = regular.style;
        }
      } else {
        // НЕвариативный шрифт: определяем стиль по именам
        let weight = 400;
        let style = 'normal';
        if (names) {
           const subfamily = preferredSubfamily; // Используем извлечённое имя
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
        }
        const os2Weight = parsedFontData?.tables?.os2?.usWeightClass;
        if (Number.isFinite(Number(os2Weight))) {
          weight = Number(os2Weight);
        }
         fontObj.currentWeight = weight;
         fontObj.currentStyle = style;
        fontObj.hasItalicStyles = fontObj.hasItalicStyles || style === 'italic';
        fontObj.italicMode = resolveFontItalicMode(fontObj.variableAxes, fontObj.hasItalicStyles);
        const styleInfo = findStyleInfoByWeightAndStyle(weight, style);
        const displayStyleName = String(preferredSubfamily || '').trim() || styleInfo.name;
        fontObj.availableStyles = [{ name: displayStyleName, weight, style }];
      }

      // 6. Кэшируем результат (метаданные)
      if (
        cacheKey &&
        parsedFontData &&
        !(Array.isArray(fontInput.googleFontSlices) && fontInput.googleFontSlices.length > 0)
      ) {
        // Кэшируем объект, совместимый с предыдущим форматом metadata.
        const metadataToCache = {
            names: parsedFontData.names,
            preferredFamily: preferredFamily,
            preferredSubfamily: preferredSubfamily,
            isVariable: fontObj.isVariableFont,
            os2WeightClass: Number.isFinite(Number(parsedFontData?.tables?.os2?.usWeightClass))
              ? Number(parsedFontData.tables.os2.usWeightClass)
              : null,
            supportedAxes:
              fontObj.isVariableFont && Array.isArray(fvarAxes)
              ? fvarAxes.reduce<Record<string, CachedAxisInfo>>((acc, axis) => {
                 const tag = normalizeFvarAxisTag(axis.tag);
                 if (!tag) return acc;
                 acc[tag] = {
                   name: axisNameFromOpentype(axis.name, tag),
                   min: axis.minValue,
                   max: axis.maxValue,
                   default: axis.defaultValue,
                 };
                 return acc;
                }, {})
              : null,
            instanceStyles: (() => {
              const inst = fontObj.fontInstanceStyles;
              return Array.isArray(inst) && inst.length > 0 ? inst : null;
            })(),
            nameTable,
        };
        localFontCache[cacheKey] = metadataToCache;
      }

    } else {
      // Парсинг не удался (parsedFontData is null)
      toast.warning(`Не удалось проанализировать шрифт ${name}. Используются значения по умолчанию.`);
      fontObj.availableStyles = [{ name: 'Regular', weight: 400, style: 'normal' }];
    }

    // Определяем начальные настройки для вариативных шрифтов
    let initialSettings: Record<string, number> = {};
    if (fontObj.isVariableFont && fontObj.variableAxes) {
      initialSettings = Object.entries(fontObj.variableAxes).reduce<Record<string, number>>(
        (acc, [tag, axis]) => {
        acc[tag] = (axis as FvarAxisMeta).default;
        return acc;
      },
        {},
      );
    }

    // Используем loadFontFaceIfNeeded напрямую (или несколько Google static сабсетов).
    try {
      const googleSlices =
        Array.isArray(fontInput.googleFontSlices) && fontInput.googleFontSlices.length > 0
          ? fontInput.googleFontSlices
          : null;

      if (googleSlices) {
        await registerGoogleFontSlices(fontFamilyName, googleSlices, fontObj, initialSettings);
        fontObj.googleFontFirstSliceMeta = {
          unicodeRange: googleSlices[0].unicodeRange || null,
          weight: googleSlices[0].weight ?? 400,
          style: googleSlices[0].style === 'italic' ? 'italic' : 'normal',
        };
        if (googleSlices.length > 1) {
          fontObj.googleFontExtraSliceBlobs = googleSlices.slice(1).map((s) => s.blob);
          fontObj.googleFontExtraSliceMeta = googleSlices.slice(1).map((s) => ({
            unicodeRange: s.unicodeRange || null,
            weight: s.weight ?? 400,
            style: s.style === 'italic' ? 'italic' : 'normal',
          }));
        }
      } else {
        const faceDescriptors = fontObj.isVariableFont
          ? buildVariableFontFaceDescriptors(fontObj.variableAxes as Record<string, FvarAxisMeta>)
          : {};
        await loadFontFaceIfNeeded(fontFamilyName, objectUrl, initialSettings, '', faceDescriptors);
      }
      const italicVfFile = fontObj.googleFontItalicFile;
      if (
        fontObj.isVariableFont &&
        fontObj.italicMode === 'separate-style' &&
        italicVfFile instanceof Blob
      ) {
        await registerItalicVariableFace(
          fontFamilyName,
          italicVfFile,
          fontObj,
          `${fontObj.id}-italic`,
        );
      }
      revokeObjectURL(objectUrl);
      fontObj.url = URL.createObjectURL(file);
      return fontObj;
  } catch (error) {
      console.error(`Failed to load font ${fontFamilyName} using FontFace API:`, error);
      toast.error(`Ошибка при загрузке шрифта ${fontObj.name}.`);
      revokeObjectURL(objectUrl); // Release blob URL on error.
      fontObj.error = 'Failed to load via FontFace API';
      return fontObj; // Return object with error marker.
    }

  } catch (error) { // Global try...catch for processLocalFont.
    console.error(`Critical error processing font ${name}:`, error);
    toast.error(`Критическая ошибка при обработке шрифта ${name}.`);
    if (objectUrl) {
        revokeObjectURL(objectUrl); // Release URL on any critical error.
    }
    return null; // Return null on critical failure.
  }
}; 

