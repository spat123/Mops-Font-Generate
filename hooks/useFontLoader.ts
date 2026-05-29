import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { SessionFontRecord } from '../types/editorFonts';
import { toast } from '../utils/appNotify';
import {
  findStyleInfoByWeightAndStyle,
  getFormatFromExtension,
  resolveVariableFontAvailableStyles,
} from '../utils/fontUtilsCommon';
import { processLocalFont } from '../utils/localFontProcessor';
import { saveFont } from '../utils/db';
import { base64ToArrayBuffer } from '../utils/fontManagerUtils';
import { getFontsourceSubsetUnicodeRange } from '../utils/fontsourceSubsetUnicodeRange';
import {
  normalizeCatalogSubsets,
  parseCatalogSubsetsFromMetadata,
  resolveDefaultCatalogSubset,
} from '../utils/catalogActiveSubset';
import {
  fetchFontsourceVariablePackageMetadata,
  getFontsourceMetadataPayload,
  parseFontsourceVariableAxesFromMeta,
  resolveFontsourceItalicMode,
} from '../utils/fontsourceApiNormalize';
import { humanizeFontsourceFamilyLabel } from '../utils/fontSlug';
import { fontStyleDbg, isFontStyleDebugEnabled } from '../utils/fontStyleDebugLog';
import { formatFontVariationSettings } from '../utils/fontVariationSettings';

// Кэш для хранения загруженных файлов шрифтов (статических Fontsource)
const fontFaceCache = new Map<string, unknown>();
const FONTSOURCE_VF_PICK_VERSION = 'v2';
// Кэш VF-слайсов (subset/style -> blobUrl). Нужен, чтобы:
// - при переключении subset не перекачивать одно и то же;
// - не “ломать” глифы/начертания из‑за сетевых флапов;
// - сделать переключение языков мгновенным после первого скачивания.
const fontsourceVfSliceCache = new Map<
  string,
  { blob: Blob; fileExtension: string; blobUrl: string; fileName: string }
>();

const createCacheKey = (fontFamily: string, subset: string, weight: number, style: string) =>
  `fontsource_${fontFamily}_${subset}_${weight}_${style}`;

// Сабсеты “надстройки” над латиницей: файл сабсета часто НЕ содержит базовые ASCII-символы.
// Для них подгружаем latin + сабсет, чтобы ABC/123 не уходили в fallback.
// Для `cyrillic`/`greek` тоже добавляем latin, иначе UI-строки (Thin/Black/Italic) рисуются системным шрифтом.
const ADDITIVE_LATIN_SUBSETS = new Set(['latin-ext', 'vietnamese', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext']);

function buildFontsourceSubsetLoadPlan(
  requestedSubset: string,
  catalogSubsets: unknown,
): string[] {
  const req = String(requestedSubset || '').trim().toLowerCase() || 'latin';
  const allowed = normalizeCatalogSubsets(catalogSubsets as string[] | undefined);
  if (!allowed.length) return [req];
  if (!allowed.includes(req)) return [resolveDefaultCatalogSubset(allowed)];
  if (req !== 'latin' && ADDITIVE_LATIN_SUBSETS.has(req) && allowed.includes('latin')) {
    return ['latin', req];
  }
  return [req];
}

function removeFontsourceInjectedStyles(slug: string) {
  if (typeof document === 'undefined') return;
  const token = String(slug || '').trim();
  if (!token) return;
  document.querySelectorAll(`style[data-mops-fontsource="${CSS.escape(token)}"]`).forEach((el) => {
    el.remove();
  });
}

function clearFontsourceStyleCache(slug: string) {
  const prefix = `fontsource_${String(slug || '').trim()}_`;
  for (const key of [...fontFaceCache.keys()]) {
    if (key.startsWith(prefix)) fontFaceCache.delete(key);
  }
}

type FontsourceFaceCacheEntry = {
  blobUrls?: string[];
  styleElement?: HTMLStyleElement;
  weight?: number;
  style?: string;
};

function isFontsourceCacheEntryLive(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const el = (entry as FontsourceFaceCacheEntry).styleElement;
  return el instanceof HTMLStyleElement && el.isConnected;
}

function resolveFontsourceActiveSubset(fontObj: SessionFontRecord): string {
  const fromFont = String(fontObj?.activeSubset || '').trim().toLowerCase();
  if (fromFont) return fromFont;
  const catalog = Array.isArray(fontObj?.catalogSubsets) ? fontObj.catalogSubsets : [];
  return resolveDefaultCatalogSubset(catalog as string[]);
}

/** Локальные файлы и Fontsource: парсинг, стили, выбор после загрузки. */
export function useFontLoader(
  setFonts: Dispatch<SetStateAction<SessionFontRecord[]>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  safeSelectFont: (font: SessionFontRecord) => void,
  currentFonts: SessionFontRecord[],
) {

  const loadFontStyleVariant = useCallback(async (fontFamily, weight, style, fontObj, returnBlob = false) => {
    // НЕ загружаем статические стили, если шрифт определен как вариативный
    if (fontObj.isVariableFont) {
      return returnBlob ? null : undefined;
    }

    const requestedSubset = resolveFontsourceActiveSubset(fontObj);
    const subsetPlan = buildFontsourceSubsetLoadPlan(requestedSubset, fontObj?.catalogSubsets);
    const cacheKey = createCacheKey(fontFamily, subsetPlan.join('+'), weight, style);

    if (!returnBlob && fontFaceCache.has(cacheKey)) {
      const cachedData = fontFaceCache.get(cacheKey) as FontsourceFaceCacheEntry | undefined;
      if (isFontsourceCacheEntryLive(cachedData)) {
        fontStyleDbg('Fontsource style cache hit', {
          cacheKey,
          fontFamily,
          fontId: fontObj?.id,
          requestedSubset,
          subsetPlan,
          weight,
          style,
        });
        if (fontObj.loadedStyles && !fontObj.loadedStyles.some((s) => s.weight === weight && s.style === style)) {
          fontObj.loadedStyles.push({ weight, style, cached: true });
        }
        return returnBlob ? null : undefined;
      }
      fontFaceCache.delete(cacheKey);
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
      const debug = isFontStyleDebugEnabled() ? '&debug=true' : '';
      const apiUrl = `/api/fontsource/${encodeURIComponent(fontFamily)}?weight=${weight}&style=${style}&subset=${encodeURIComponent(subset)}${debug}`;
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
      fontStyleDbg('Fontsource subset payload', {
        apiUrl,
        requestedSubset,
        subset,
        fileName,
        responseLen: typeof responseText === 'string' ? responseText.length : -1,
      });
      return { fontBufferBase64, fileName: String(fileName || '') };
    };

    try {
      const fontFamilyName = fontObj.fontFamily || fontFamily;
      fontStyleDbg('Fontsource load style start', {
        fontFamily,
        fontFamilyName,
        fontId: fontObj?.id,
        requestedSubset,
        subsetPlan,
        weight,
        style,
        returnBlob,
      });

      const rows: Array<{ subset: string; row: { fontBufferBase64: string; fileName: string } }> = [];
      for (const s of subsetPlan) {
        // eslint-disable-next-line no-await-in-loop
        const row = await fetchFontsourceSubset(s);
        if (!row) {
          throw new Error(`Ошибка HTTP или пустой ответ для subset=${s}`);
        }
        rows.push({ subset: s, row });
      }

      const makeBlobUrl = (row: { fontBufferBase64: string; fileName: string }) => {
        const fontBuffer = base64ToArrayBuffer(row.fontBufferBase64);
        const mimeType = `font/${getFormatFromExtension(row.fileName || '.woff2')}`;
        const b = new Blob([fontBuffer], { type: mimeType });
        const u = URL.createObjectURL(b);
        blobUrls.push(u);
        return { url: u, fileName: row.fileName, fmt: formatCssFromFileName(row.fileName) };
      };

      const ffName = JSON.stringify(fontFamilyName);
      const rules: string[] = [];
      let primaryRow = rows.find((r) => r.subset === requestedSubset)?.row || rows[rows.length - 1]?.row || null;
      if (!primaryRow) primaryRow = rows[0]?.row || null;
      if (primaryRow) {
        blob = new Blob([base64ToArrayBuffer(primaryRow.fontBufferBase64)], {
          type: `font/${getFormatFromExtension(primaryRow.fileName || '.woff2')}`,
        });
      }

      for (const { subset: s, row } of rows) {
        const slice = makeBlobUrl(row);
        const unicodeRange = getFontsourceSubsetUnicodeRange(s);
        const unicodeLine = unicodeRange ? `\n          unicode-range: ${unicodeRange};` : '';
        rules.push(
          `@font-face {
          font-family: ${ffName};
          src: url('${slice.url}') format('${slice.fmt}');
          font-weight: ${weight};
          font-style: ${style};${unicodeLine}
        }`,
        );
      }

      const styleElement = document.createElement('style');
      styleElement.setAttribute('data-mops-fontsource', String(fontFamily));
      styleElement.textContent = rules.join('\n');
      document.head.appendChild(styleElement);

      fontFaceCache.set(cacheKey, { blobUrls, styleElement, weight, style });

      const fontStyleToken = style === 'italic' ? 'italic' : 'normal';
      const loadSpec = `${fontStyleToken} ${weight} 16px ${ffName}`;
      try {
        await document.fonts.load(loadSpec);
        fontStyleDbg('Fontsource document.fonts.load OK', {
          loadSpec,
          fontFamilyName,
          weight,
          style,
          requestedSubset,
        });
        if (fontObj.loadedStyles && !fontObj.loadedStyles.some((s) => s.weight === weight && s.style === style)) {
          fontObj.loadedStyles.push({ weight, style, cached: false });
        }
        return returnBlob ? blob : undefined;
      } catch (loadError) {
        console.warn(`Не удалось дождаться загрузки шрифта для ${fontFamily} ${weight} ${style}:`, loadError);
        fontStyleDbg('Fontsource document.fonts.load FAIL', {
          loadSpec,
          fontFamilyName,
          weight,
          style,
          requestedSubset,
          err: String(loadError),
        });
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
        return null;
      }
    } catch (error) {
      console.error(`Ошибка при загрузке стиля ${fontFamily} ${weight} ${style}:`, error);
      fontStyleDbg('Fontsource load style exception', {
        fontFamily,
        weight,
        style,
        requestedSubset,
        err: error instanceof Error ? error.message : String(error),
      });
      for (const u of blobUrls) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // noop
        }
      }
      return null;
    }
  }, []);

  const loadAllFontsourceStyles = useCallback(async (
    fontFamily,
    forceVariableFont = false,
    options: { silent?: boolean } = {},
  ) => {
    const silent = options?.silent === true;
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
      let metadataPayload = getFontsourceMetadataPayload(metadata);

      let variableMeta = metadataPayload?.variable;
      const hasVariableSupport = Boolean(variableMeta);
      let actualIsVariableFont = hasVariableSupport && forceVariableFont;

      if (forceVariableFont && (!variableMeta || typeof variableMeta !== 'object')) {
        const variablePackageMeta = await fetchFontsourceVariablePackageMetadata(fontFamily);
        if (variablePackageMeta) {
          metadataPayload = { ...metadataPayload, ...variablePackageMeta };
          variableMeta = metadataPayload.variable;
          actualIsVariableFont = Boolean(variableMeta);
        }
      }

      const familyLabel = humanizeFontsourceFamilyLabel(
        metadataPayload?.family || metadata?.family || fontFamily,
      );
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
      const parsedVariableAxes = actualIsVariableFont
        ? parseFontsourceVariableAxesFromMeta(variableMeta)
        : {};
      const italicMode = actualIsVariableFont
        ? resolveFontsourceItalicMode(parsedVariableAxes, hasItalicStyles)
        : 'none';

      const catalogSubsets = parseCatalogSubsetsFromMetadata(metadataPayload);
      const activeSubset = resolveDefaultCatalogSubset(catalogSubsets);

      const fontObj: SessionFontRecord = {
        id: fontId,
        name: fontFamily,
        displayName: displayName,
        source: 'fontsource',
        originKey: `fontsource:${fontFamily}`,
        fontFamily: displayName,
        variableAxes: parsedVariableAxes,
        isVariableFont: actualIsVariableFont,
        italicMode,
        hasItalicStyles,
        availableStyles: [],
        loadedStyles: [],
        catalogSubsets,
        activeSubset,
        file: undefined,
        url: undefined,
      };

      if (actualIsVariableFont) {
        try {
          const cssFmt = (ext) => (ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext);

          const loadVariableStylePayload = async (targetStyle = 'normal', subset = activeSubset, softFail = false) => {
            const debug = isFontStyleDebugEnabled() ? '&debug=true' : '';
            // `pick=v2` — cache-buster и версия алгоритма подбора VF-файла на сервере.
            const variableApiUrl = `/api/fontsource/${encodeURIComponent(fontFamily)}/variable?subset=${encodeURIComponent(subset)}&style=${encodeURIComponent(targetStyle)}&forceVariable=true&pick=v2${debug}`;
            const cacheKey = `vf:${String(fontFamily)}:${String(targetStyle)}:${String(subset)}`;
            const cached = fontsourceVfSliceCache.get(cacheKey);
            if (cached?.blobUrl) {
              fontStyleDbg('Fontsource VF slice cache hit', {
                fontFamily,
                subset,
                style: targetStyle,
                fileName: cached.fileName,
              });
              return cached;
            }
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
            fontStyleDbg('Fontsource VF slice payload', {
              fontFamily,
              subset,
              style: targetStyle,
              fileName,
              blobSize: blob.size,
            });
            const out = { blob, fileExtension, blobUrl, fileName };
            fontsourceVfSliceCache.set(cacheKey, out);
            return out;
          };

          const subsetPlan = buildFontsourceSubsetLoadPlan(activeSubset, catalogSubsets);
          // Важно: при повторных загрузках/сменах алгоритма подбора VF-файла удаляем старые @font-face,
          // иначе браузер может продолжать использовать первый (ошибочно подобранный) face.
          removeFontsourceInjectedStyles(fontFamily);
          const normalPayloads: Array<{
            subset: string;
            payload: { blob: Blob; fileExtension: string; blobUrl: string; fileName: string };
          }> = [];
          for (const s of subsetPlan) {
            // eslint-disable-next-line no-await-in-loop
            const p = await loadVariableStylePayload('normal', s, false);
            if (!p) throw new Error(`Не удалось загрузить VF subset=${s}`);
            normalPayloads.push({ subset: s, payload: p });
          }
          const primaryNormal =
            normalPayloads.find((p) => p.subset === activeSubset)?.payload ||
            normalPayloads[normalPayloads.length - 1]?.payload;

          fontObj.file = primaryNormal?.blob;
          fontObj.url = primaryNormal?.blobUrl;
          fontObj.fontsourceSubsetBlobUrls = normalPayloads.map((p) => p.payload.blobUrl);
          fontObj.fontsourceVfFiles = normalPayloads.map((p) => ({ subset: p.subset, fileName: p.payload.fileName }));
          fontObj.fontsourceVfPickVersion = FONTSOURCE_VF_PICK_VERSION;

          // Стартовое состояние VF (чтобы превью не мигало "Thin" до restore-plan).
          const defaultAxisSettings = Object.entries(parsedVariableAxes || {}).reduce<Record<string, number>>(
            (acc, [tag, axis]) => {
              const def = Number((axis as any)?.default);
              if (Number.isFinite(def)) acc[tag] = def;
              return acc;
            },
            {},
          );
          if (Object.keys(defaultAxisSettings).length > 0) {
            fontObj.lastUsedVariableSettings = defaultAxisSettings;
            fontObj.variationSettings = formatFontVariationSettings(defaultAxisSettings, { fallback: 'normal' });
            const w = Number(defaultAxisSettings.wght);
            if (Number.isFinite(w)) fontObj.currentWeight = Math.round(w);
            if (fontObj.currentStyle == null) fontObj.currentStyle = 'normal';
          }

          const wghtAxis = parsedVariableAxes?.wght;
          const wMin = wghtAxis && Number.isFinite(Number(wghtAxis.min)) ? Number(wghtAxis.min) : 100;
          const wMax = wghtAxis && Number.isFinite(Number(wghtAxis.max)) ? Number(wghtAxis.max) : 900;
          const wLo = Math.min(wMin, wMax);
          const wHi = Math.max(wMin, wMax);

          const ff = JSON.stringify(displayName);
          const normalRules: string[] = [];
          for (const { subset: s, payload } of normalPayloads) {
            const unicode = getFontsourceSubsetUnicodeRange(s);
            const unicodeLine = unicode ? `\n                  unicode-range: ${unicode};` : '';
            normalRules.push(`@font-face {
                  font-family: ${ff};
                  src: url('${payload.blobUrl}') format('${cssFmt(payload.fileExtension)}');
                  font-weight: ${wLo} ${wHi};
                  font-style: normal;
                  font-display: swap;${unicodeLine}
              }`);
          }

          const styleElement = document.createElement('style');
          styleElement.setAttribute('data-mops-fontsource', String(fontFamily));
          styleElement.setAttribute('data-mops-fontsource-kind', 'vf-normal');
          styleElement.textContent = normalRules.join('\n');
          document.head.appendChild(styleElement);

          if (italicMode === 'separate-style' && hasItalicStyles) {
            try {
              const italicPayloads: Array<{
                subset: string;
                payload: { blob: Blob; fileExtension: string; blobUrl: string; fileName: string };
              }> = [];
              for (const s of subsetPlan) {
                // eslint-disable-next-line no-await-in-loop
                const p = await loadVariableStylePayload('italic', s, false);
                if (!p) throw new Error(`Не удалось загрузить italic VF subset=${s}`);
                italicPayloads.push({ subset: s, payload: p });
              }
              const italicRules: string[] = [];
              for (const { subset: s, payload } of italicPayloads) {
                const unicode = getFontsourceSubsetUnicodeRange(s);
                const unicodeLine = unicode ? `\n                    unicode-range: ${unicode};` : '';
                italicRules.push(`@font-face {
                    font-family: ${ff};
                    src: url('${payload.blobUrl}') format('${cssFmt(payload.fileExtension)}');
                    font-weight: ${wLo} ${wHi};
                    font-style: italic;
                    font-display: swap;${unicodeLine}
                }`);
              }
              const italicStyleElement = document.createElement('style');
              italicStyleElement.setAttribute('data-mops-fontsource', String(fontFamily));
              italicStyleElement.setAttribute('data-mops-fontsource-kind', 'vf-italic');
              italicStyleElement.textContent = italicRules.join('\n');
              document.head.appendChild(italicStyleElement);
              // Сохраняем один blob (для совместимости с остальным кодом).
              fontObj.fontsourceItalicLatinFile = italicPayloads[0]?.payload?.blob;
              fontObj.fontsourceVfItalicFiles = italicPayloads.map((p) => ({ subset: p.subset, fileName: p.payload.fileName }));
            } catch (italicLoadError) {
              console.warn(`[FontLoader] Не удалось догрузить italic-face для ${displayName}:`, italicLoadError);
            }
          }

          // Prefetch остальных subset-ов в фоне: чтобы “переключение языка” не дёргало сеть бесконечно.
          const allAllowed = normalizeCatalogSubsets(catalogSubsets as string[] | undefined);
          const remaining = allAllowed.filter((s) => !subsetPlan.includes(s));
          if (remaining.length > 0) {
            fontStyleDbg('Fontsource VF subset prefetch scheduled', {
              fontFamily,
              activeSubset,
              subsetPlan,
              remainingCount: remaining.length,
              remaining: remaining.slice(0, 20),
            });
            setTimeout(() => {
              void (async () => {
                for (const s of remaining) {
                  // eslint-disable-next-line no-await-in-loop
                  const p = await loadVariableStylePayload('normal', s, true);
                  if (!p || !styleElement.isConnected) continue;
                  const unicode = getFontsourceSubsetUnicodeRange(s);
                  const unicodeLine = unicode ? `\n                  unicode-range: ${unicode};` : '';
                  styleElement.textContent += `\n@font-face {
                  font-family: ${ff};
                  src: url('${p.blobUrl}') format('${cssFmt(p.fileExtension)}');
                  font-weight: ${wLo} ${wHi};
                  font-style: normal;
                  font-display: swap;${unicodeLine}
              }`;
                }
              })();
            }, 0);
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

      const staticAvailableStyles = weightsForStyles.flatMap((weight) =>
        stylesForStyles.map((style) => {
          const weightNum = parseInt(String(weight), 10) || 400;
          const styleInfo = findStyleInfoByWeightAndStyle(weightNum, style);
          return {
            name: styleInfo ? styleInfo.name : `${weightNum} ${style}`,
            weight: weightNum,
            style,
          };
        }),
      );
      fontObj.availableStyles = actualIsVariableFont
        ? resolveVariableFontAvailableStyles(fontObj)
        : staticAvailableStyles;
      if (actualIsVariableFont && fontObj.availableStyles.length === 0) {
        fontObj.availableStyles = staticAvailableStyles;
      }

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
            if (!silent) {
              toast.error(`Ошибка загрузки основного стиля ${displayName}. Глифы будут недоступны.`);
            }
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
      if (!silent) {
        toast.error(`Не удалось загрузить шрифт ${fontFamily}: ${error.message}`);
      }
      throw error; // Пробрасываем ошибку для обработки в вызывающей функции
    }
  }, [setFonts, loadFontStyleVariant, findStyleInfoByWeightAndStyle]);

  const handleLocalFontsUpload = useCallback(async (
    newFonts: SessionFontRecord[],
    options: { silent?: boolean; noSelect?: boolean } = {},
  ) => {
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
    fontFamilyName: string,
    forceVariableFont = false,
    options: { silent?: boolean; noSelect?: boolean } = {},
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
        // Если ранее VF был подобран неверно (например, вместо VF подсунули Thin static),
        // принудительно перезагружаем при запросе VF.
        const existingPick = (existingFont as any)?.fontsourceVfPickVersion;
        const shouldReloadVf =
          forceVariableFont === true &&
          existingFont?.source === 'fontsource' &&
          existingFont?.isVariableFont === true &&
          existingPick !== FONTSOURCE_VF_PICK_VERSION;
        if (shouldReloadVf) {
          setIsLoading(true);
          const reloaded = await loadAllFontsourceStyles(fontFamilyName, forceVariableFont, options);
          if (reloaded) {
            await saveFont(reloaded);
            setFonts((prev) => prev.map((f) => (f.id === existingFont.id ? reloaded : f)));
            if (!noSelect && typeof safeSelectFont === 'function') {
              safeSelectFont(reloaded);
            }
            return reloaded;
          }
        }
        if (!noSelect && typeof safeSelectFont === 'function') {
          safeSelectFont(existingFont);
          if (!silent) {
            toast.info(`Шрифт ${existingFont.displayName} уже загружен.`);
          }
        }
        return existingFont;
      }

      setIsLoading(true);
      const fontObj = await loadAllFontsourceStyles(fontFamilyName, forceVariableFont, options);

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

  const applyFontsourceActiveSubset = useCallback(
    async (font: SessionFontRecord, subset: string) => {
      if (!font || font.source !== 'fontsource') return font;
      const slug = String(font.name || '').trim();
      const nextSubset = String(subset || '').trim().toLowerCase();
      if (!slug || !nextSubset) return font;
      const allowed = normalizeCatalogSubsets(font.catalogSubsets as string[] | undefined);
      if (allowed.length > 0 && !allowed.includes(nextSubset)) return font;
      if (font.activeSubset === nextSubset) return font;

      removeFontsourceInjectedStyles(slug);
      clearFontsourceStyleCache(slug);

      const working: SessionFontRecord = {
        ...font,
        activeSubset: nextSubset,
        loadedStyles: [],
      };

      try {
        if (font.isVariableFont) {
          const subsetPlan = buildFontsourceSubsetLoadPlan(nextSubset, font.catalogSubsets);
          const cssFmt = (ext: string) => (ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext);
          const displayName = font.displayName || font.fontFamily || slug;
          const wghtAxis = font?.variableAxes && typeof font.variableAxes === 'object' ? (font.variableAxes as any).wght : null;
          const wMin = wghtAxis && Number.isFinite(Number(wghtAxis.min)) ? Number(wghtAxis.min) : 100;
          const wMax = wghtAxis && Number.isFinite(Number(wghtAxis.max)) ? Number(wghtAxis.max) : 900;
          const wLo = Math.min(wMin, wMax);
          const wHi = Math.max(wMin, wMax);
          const loadVariableStylePayload = async (
            targetStyle = 'normal',
            subsetKey: string = nextSubset,
            softFail = false,
          ) => {
            const debug = isFontStyleDebugEnabled() ? '&debug=true' : '';
            const variableApiUrl = `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=${encodeURIComponent(subsetKey)}&style=${encodeURIComponent(targetStyle)}&forceVariable=true&pick=${encodeURIComponent(FONTSOURCE_VF_PICK_VERSION)}${debug}`;
            const cacheKey = `vf:${String(slug)}:${String(targetStyle)}:${String(subsetKey)}`;
            const cached = fontsourceVfSliceCache.get(cacheKey);
            if (cached?.blobUrl) {
              fontStyleDbg('Fontsource VF slice cache hit (subset switch)', {
                fontFamily: slug,
                subset: subsetKey,
                style: targetStyle,
                fileName: cached.fileName,
              });
              return cached;
            }
            const fontFileResponse = await fetch(variableApiUrl);
            if (!fontFileResponse.ok) {
              if (softFail) return null;
              throw new Error(`Не удалось загрузить VF (статус ${fontFileResponse.status})`);
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
            fontStyleDbg('Fontsource VF subset switch slice payload', {
              fontFamily: slug,
              subset: subsetKey,
              style: targetStyle,
              fileName,
              blobSize: blob.size,
            });
            const out = { blob, fileExtension, blobUrl, fileName };
            fontsourceVfSliceCache.set(cacheKey, out);
            return out;
          };

          const ff = JSON.stringify(displayName);

          const normalPayloads: Array<{
            subset: string;
            payload: { blob: Blob; fileExtension: string; blobUrl: string; fileName: string };
          }> = [];
          for (const s of subsetPlan) {
            // eslint-disable-next-line no-await-in-loop
            const p = await loadVariableStylePayload('normal', s, false);
            normalPayloads.push({ subset: s, payload: p });
          }
          const primaryNormal =
            normalPayloads.find((p) => p.subset === nextSubset)?.payload || normalPayloads[normalPayloads.length - 1]?.payload;

          working.file = primaryNormal?.blob;
          working.url = primaryNormal?.blobUrl;
          working.fontsourceSubsetBlobUrls = normalPayloads.map((p) => p.payload.blobUrl);
          (working as any).fontsourceVfFiles = normalPayloads.map((p) => ({ subset: p.subset, fileName: p.payload.fileName }));
          (working as any).fontsourceVfPickVersion = FONTSOURCE_VF_PICK_VERSION;

          const normalRules: string[] = [];
          for (const { subset: s, payload } of normalPayloads) {
            const unicode = getFontsourceSubsetUnicodeRange(s);
            const unicodeLine = unicode ? `\n                  unicode-range: ${unicode};` : '';
            normalRules.push(`@font-face {
                  font-family: ${ff};
                  src: url('${payload.blobUrl}') format('${cssFmt(payload.fileExtension)}');
                  font-weight: ${wLo} ${wHi};
                  font-style: normal;
                  font-display: swap;${unicodeLine}
              }`);
          }
          const styleElement = document.createElement('style');
          styleElement.setAttribute('data-mops-fontsource', slug);
          styleElement.setAttribute('data-mops-fontsource-kind', 'vf-normal');
          styleElement.textContent = normalRules.join('\n');
          document.head.appendChild(styleElement);
          fontStyleDbg('Fontsource VF subset switch injected faces', {
            fontFamily: slug,
            displayName,
            subsetPlan,
            normalFiles: normalPayloads.map((p) => ({ subset: p.subset, fileName: p.payload.fileName })),
            normalRuleChars: styleElement.textContent?.length ?? -1,
          });

          if (font.italicMode === 'separate-style' && font.hasItalicStyles) {
            const italicPayloads: Array<{
              subset: string;
              payload: { blob: Blob; fileExtension: string; blobUrl: string; fileName: string };
            }> = [];
            for (const s of subsetPlan) {
              // eslint-disable-next-line no-await-in-loop
              const p = await loadVariableStylePayload('italic', s, false);
              italicPayloads.push({ subset: s, payload: p });
            }
            const italicRules: string[] = [];
            for (const { subset: s, payload } of italicPayloads) {
              const unicode = getFontsourceSubsetUnicodeRange(s);
              const unicodeLine = unicode ? `\n                  unicode-range: ${unicode};` : '';
              italicRules.push(`@font-face {
                  font-family: ${ff};
                  src: url('${payload.blobUrl}') format('${cssFmt(payload.fileExtension)}');
                  font-weight: ${wLo} ${wHi};
                  font-style: italic;
                  font-display: swap;${unicodeLine}
              }`);
            }
            const italicStyleElement = document.createElement('style');
            italicStyleElement.setAttribute('data-mops-fontsource', slug);
            italicStyleElement.setAttribute('data-mops-fontsource-kind', 'vf-italic');
            italicStyleElement.textContent = italicRules.join('\n');
            document.head.appendChild(italicStyleElement);
            (working as any).fontsourceVfItalicBlobUrls = italicPayloads.map((p) => p.payload.blobUrl);
            (working as any).fontsourceVfItalicFiles = italicPayloads.map((p) => ({ subset: p.subset, fileName: p.payload.fileName }));
            working.fontsourceItalicLatinFile = italicPayloads[0]?.payload?.blob;
            fontStyleDbg('Fontsource VF subset switch injected italic faces', {
              fontFamily: slug,
              subsetPlan,
              italicFiles: italicPayloads.map((p) => ({ subset: p.subset, fileName: p.payload.fileName })),
              italicRuleChars: italicStyleElement.textContent?.length ?? -1,
            });
          }

          // Важно: при смене subset сначала инжектим новые @font-face и ждём, пока браузер их подхватит,
          // и НЕ ревокаем VF blob URL (они кэшируются, чтобы не перекачивать и не “ломаться” при флапах сети).
          try {
            const loadStyle = String(working.currentStyle || 'normal') === 'italic' ? 'italic' : 'normal';
            const loadWeight = Number(working.currentWeight) || 400;
            const loadSpec = `${loadStyle} ${loadWeight} 16px ${ff}`;
            await document.fonts.load(loadSpec);
            fontStyleDbg('Fontsource VF subset switch document.fonts.load OK', {
              fontFamily: slug,
              displayName,
              loadSpec,
              loadWeight,
              loadStyle,
            });
          } catch (e) {
            fontStyleDbg('Fontsource VF subset switch document.fonts.load FAIL', {
              fontFamily: slug,
              displayName,
              err: e instanceof Error ? e.message : String(e),
            });
          }
        } else {
          const weight = Number(font.currentWeight) || 400;
          const style = String(font.currentStyle || 'normal');
          const blob = await loadFontStyleVariant(slug, weight, style, working, true);
          if (blob instanceof Blob) {
            if (working.url) {
              try {
                URL.revokeObjectURL(String(working.url));
              } catch {
                // noop
              }
            }
            working.file = blob;
            working.url = URL.createObjectURL(blob);
          }
        }

        const loadedStyles = Array.isArray(working.loadedStyles) ? [...working.loadedStyles] : [];
        const synced = { ...working, loadedStyles };
        setFonts((prev) => prev.map((f) => (f.id === font.id ? synced : f)));
        await saveFont(synced);
        return synced;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`Не удалось переключить набор символов: ${message}`);
        return font;
      }
    },
    [loadFontStyleVariant, saveFont, setFonts],
  );

  return {
    handleLocalFontsUpload,
    loadAndSelectFontsourceFont,
    loadFontsourceStyleVariant: loadFontStyleVariant,
    applyFontsourceActiveSubset,
  };
}
