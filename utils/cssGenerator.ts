import { debounce } from './debounce';
import { formatFontVariationSettings } from './fontVariationSettings';
import type { SessionFontRecord } from '../types/editorFonts';

export { debounce };

export const hasSignificantChanges = (
  prevSettings: Record<string, number> | null | undefined,
  currentSettings: Record<string, number>,
  threshold = 10,
): boolean => {
  if (!prevSettings) return true;

  const prevKeys = Object.keys(prevSettings);
  const currentKeys = Object.keys(currentSettings);

  if (prevKeys.length !== currentKeys.length) return true;

  for (const key of currentKeys) {
    if (
      !(key in prevSettings) ||
      Math.abs(parseFloat(String(prevSettings[key])) - parseFloat(String(currentSettings[key]))) >= threshold
    ) {
      return true;
    }
  }

  return false;
};

const fontCssBuffer = {
  main: new Map<string, string>(),
  shadow: new Map<string, string>(),
  switching: false,
  animationFrameId: null as number | null,
};

const updateBufferedFontCss = (fontId: string, cssRule: string): void => {
  fontCssBuffer.shadow.set(fontId, cssRule);

  if (fontCssBuffer.animationFrameId) {
    return;
  }

  fontCssBuffer.animationFrameId = requestAnimationFrame(() => {
    fontCssBuffer.switching = true;

    fontCssBuffer.shadow.forEach((rule, id) => {
      try {
        let styleElement = document.querySelector(`style[data-font-id="${id}"]`) as HTMLStyleElement | null;

        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.setAttribute('data-font-id', id);
          document.head.appendChild(styleElement);
        }

        if (styleElement.textContent !== rule) {
          styleElement.textContent = rule;
        }

        fontCssBuffer.main.set(id, rule);
      } catch (error) {
        console.error(`Ошибка при обновлении CSS для шрифта ${id}:`, error);
      }
    });

    fontCssBuffer.shadow.clear();
    fontCssBuffer.switching = false;
    fontCssBuffer.animationFrameId = null;
  });
};

const fontFaceCache = new Map<string, Promise<FontFace>>();

export const buildVariableFontFaceDescriptors = (
  variableAxes: Record<string, { min?: number; max?: number }> | null | undefined,
  extraDescriptors: FontFaceDescriptors = {},
): FontFaceDescriptors => {
  const descriptors: FontFaceDescriptors = {};
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

export const loadFontFaceIfNeeded = async (
  fontFamily: string,
  urlOrBuffer: string | ArrayBuffer | ArrayBufferView,
  settings: Record<string, number> = {},
  binaryCacheId = '',
  faceDescriptors: FontFaceDescriptors = {},
): Promise<FontFace> => {
  const isUrl = typeof urlOrBuffer === 'string';
  const descKey =
    faceDescriptors && typeof faceDescriptors === 'object' && Object.keys(faceDescriptors).length
      ? JSON.stringify(faceDescriptors)
      : '';
  const bufferLength =
    typeof urlOrBuffer === 'object' && 'byteLength' in urlOrBuffer ? urlOrBuffer.byteLength : 0;
  const cacheKey = isUrl
    ? `${fontFamily}_${urlOrBuffer}_${descKey}`
    : `${fontFamily}_binary_${binaryCacheId || bufferLength || '0'}_${descKey}`;

  if (fontFaceCache.has(cacheKey)) {
    try {
      const cachedPromise = fontFaceCache.get(cacheKey)!;
      const fontFace = await cachedPromise;
      if (typeof document !== 'undefined' && document.fonts && !document.fonts.has(fontFace)) {
        document.fonts.add(fontFace);
      }
      return fontFace;
    } catch (error) {
      console.warn(
        `Ошибка при использовании кэшированного FontFace для ${fontFamily}, повторная загрузка:`,
        error,
      );
      fontFaceCache.delete(cacheKey);
    }
  }

  const loadPromise = (async () => {
    try {
      const options =
        faceDescriptors && typeof faceDescriptors === 'object' && Object.keys(faceDescriptors).length
          ? { ...faceDescriptors }
          : {};

      const fontFace = isUrl
        ? new FontFace(fontFamily, `url(${urlOrBuffer})`, options)
        : new FontFace(fontFamily, urlOrBuffer as BufferSource, options);
      await fontFace.load();
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.add(fontFace);
      }

      return fontFace;
    } catch (error) {
      console.error(`Ошибка при загрузке шрифта ${fontFamily} через FontFace API:`, error);
      fontFaceCache.delete(cacheKey);
      throw error;
    }
  })();

  fontFaceCache.set(cacheKey, loadPromise);

  return loadPromise;
};

export const updateVariableFontSettings = (
  fontObj: SessionFontRecord,
  currentSettings: Record<string, number>,
  _prevSettings: Record<string, number> | null = null,
): SessionFontRecord => {
  if (!fontObj || !fontObj.fontFamily || !fontObj.isVariableFont) {
    console.warn('updateVariableFontSettings: Невалидный fontObj или не вариативный шрифт.');
    return fontObj;
  }
  if (!currentSettings || typeof currentSettings !== 'object') {
    console.warn('updateVariableFontSettings: не переданы currentSettings.');
    return fontObj;
  }

  const fontFamilyName = fontObj.fontFamily;
  const fontId = fontObj.id || fontFamilyName;

  let variationSettingsRule = '';
  const variationSettingsValue = formatFontVariationSettings(currentSettings, { fallback: '' });
  if (variationSettingsValue) {
    variationSettingsRule = `[data-font-family="${fontFamilyName}"] { font-variation-settings: ${variationSettingsValue}; }`;
  }

  if (variationSettingsRule) {
    updateBufferedFontCss(`${fontId}-settings`, variationSettingsRule);
  }

  return fontObj;
};

export const debouncedUpdateVariableFontSettings = debounce(
  (
    fontObj: SessionFontRecord,
    currentSettings: Record<string, number>,
    prevSettings: Record<string, number> | null = null,
  ) => {
    updateVariableFontSettings(fontObj, currentSettings, prevSettings);
  },
  50,
);
