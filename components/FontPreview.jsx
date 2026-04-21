import React, { useCallback, useMemo, useRef, useEffect, memo, useState, lazy, Suspense } from 'react';

/** Совпадает с логикой подсчёта блоков в StylesMode */
function getStylesPreviewRowCount(selectedFont, weightVariations, italicVariations, axisRatios) {
  if (!selectedFont) return { n: 0, kind: 'none' };
  const hasStaticStyles = selectedFont.availableStyles && selectedFont.availableStyles.length > 1;
  const hasVariableAxes =
    selectedFont.isVariableFont &&
    selectedFont.variableAxes &&
    Object.keys(selectedFont.variableAxes).length > 0;
  const showStaticStyles = hasStaticStyles && (!selectedFont.isVariableFont || !hasVariableAxes);

  if (showStaticStyles) {
    return { n: selectedFont.availableStyles.length, kind: 'static' };
  }
  if (hasVariableAxes) {
    const axes = selectedFont.variableAxes;
    let n = 0;
    if (axes.wght !== undefined) n += weightVariations.length;
    if (axes.ital !== undefined || axes.slnt !== undefined) n += italicVariations.length;
    const otherKeys = Object.keys(axes).filter((a) => !['wght', 'ital', 'slnt'].includes(a));
    n += otherKeys.length * axisRatios.length;
    return { n, kind: 'variable' };
  }
  return { n: 0, kind: 'none' };
}
import FontUploader from './FontUploader';
import { EDITOR_PREVIEW_BOTTOM_BAR_CLASS } from './ui/editorChromeClasses';
import { toast } from 'react-toastify';
import { useSettings } from '../contexts/SettingsContext';
import { useFontContext } from '../contexts/FontContext';
import EditableText from './EditableText';
import dynamic from 'next/dynamic';
import { fetchGoogleVariableFontSlicesAll } from '../utils/googleFontLoader';
import { GOOGLE_PRESET_FONT_NAMES } from '../utils/googlePresetFonts';
import { getPreviewAreaBackgroundStyle } from '../utils/previewAreaBackgroundStyle';

// --- Ленивая загрузка компонентов режимов --- 
const PlainTextMode = lazy(() => import('./PlainTextMode'));
const WaterfallMode = dynamic(() => import('./WaterfallMode'), { suspense: true });
const StylesMode = lazy(() => import('./StylesMode'));
const GlyphsMode = lazy(() => import('./GlyphsMode'));
const TextMode = lazy(() => import('./TextMode'));
// --- Конец ленивой загрузки ---

// После импортов добавляем новую переменную для буферизации текста
// Функция для буферизации обновлений отображения шрифта
const createTextDisplayBuffer = () => {
  // Буфер отображения текста для предотвращения моргания
  const buffer = {
    // Основной и теневой элементы для двойной буферизации
    elements: {
      main: null,
      shadow: null,
    },
    // Контейнер, в котором находятся элементы
    container: null,
    // Таймер для переключения буферов
    switchTimer: null,
    // Флаг, указывающий, идет ли переключение
    switching: false,
    // Инициализирует буфер в контейнере
    init: (containerElement) => {
      if (!containerElement) return false;
      
      // Сохраняем контейнер
      buffer.container = containerElement;
      
      // Создаем основной элемент, если его еще нет
      if (!buffer.elements.main) {
        buffer.elements.main = document.createElement('div');
        buffer.elements.main.className = 'font-display-buffer main';
        buffer.elements.main.style.transition = 'opacity 0.1s ease-in-out';
        buffer.elements.main.style.position = 'absolute';
        buffer.elements.main.style.top = '0';
        buffer.elements.main.style.left = '0';
        buffer.elements.main.style.width = '100%';
        buffer.elements.main.style.height = '100%';
        buffer.elements.main.style.zIndex = '1';
        buffer.container.appendChild(buffer.elements.main);
      }
      
      // Создаем теневой элемент, если его еще нет
      if (!buffer.elements.shadow) {
        buffer.elements.shadow = document.createElement('div');
        buffer.elements.shadow.className = 'font-display-buffer shadow';
        buffer.elements.shadow.style.transition = 'opacity 0.1s ease-in-out';
        buffer.elements.shadow.style.position = 'absolute';
        buffer.elements.shadow.style.top = '0';
        buffer.elements.shadow.style.left = '0';
        buffer.elements.shadow.style.width = '100%';
        buffer.elements.shadow.style.height = '100%';
        buffer.elements.shadow.style.zIndex = '0';
        buffer.elements.shadow.style.opacity = '0';
        buffer.container.appendChild(buffer.elements.shadow);
      }
      
      // Обновляем стили контейнера
      buffer.container.style.position = 'relative';
      buffer.container.style.overflow = 'hidden';
      
      return true;
    },
    // Обновляет содержимое в теневом буфере и переключает буферы
    update: (content, style) => {
      if (!buffer.elements.shadow || !buffer.elements.main) return;
      
      // Если переключение уже запланировано, не создаем новый таймер
      if (buffer.switchTimer) {
        // Просто обновляем содержимое теневого элемента
        buffer.elements.shadow.innerHTML = content;
        Object.assign(buffer.elements.shadow.style, style || {});
        return;
      }
      
      // Обновляем содержимое теневого элемента
      buffer.elements.shadow.innerHTML = content;
      Object.assign(buffer.elements.shadow.style, style || {});
      
      // Планируем переключение с небольшой задержкой (16.7ms ≈ один кадр анимации)
      buffer.switchTimer = setTimeout(() => {
        // Устанавливаем флаг переключения
        buffer.switching = true;
        
        // Меняем z-index элементов
        buffer.elements.main.style.zIndex = '0';
        buffer.elements.shadow.style.zIndex = '1';
        
        // Меняем opacity элементов
        buffer.elements.main.style.opacity = '0';
        buffer.elements.shadow.style.opacity = '1';
        
        // Ожидаем завершения анимации
        setTimeout(() => {
          // Меняем содержимое основного элемента
          buffer.elements.main.innerHTML = buffer.elements.shadow.innerHTML;
          Object.assign(buffer.elements.main.style, buffer.elements.shadow.style);
          
          // Восстанавливаем z-index элементов
          buffer.elements.main.style.zIndex = '1';
          buffer.elements.shadow.style.zIndex = '0';
          
          // Восстанавливаем opacity элементов
          buffer.elements.main.style.opacity = '1';
          buffer.elements.shadow.style.opacity = '0';
          
          // Сбрасываем флаг переключения и таймер
          buffer.switching = false;
          buffer.switchTimer = null;
        }, 100);
      }, 16.7);
    },
    // Очищает буфер и удаляет элементы
    cleanup: () => {
      if (buffer.switchTimer) {
        clearTimeout(buffer.switchTimer);
        buffer.switchTimer = null;
      }
      
      if (buffer.elements.main && buffer.elements.main.parentNode) {
        buffer.elements.main.parentNode.removeChild(buffer.elements.main);
      }
      
      if (buffer.elements.shadow && buffer.elements.shadow.parentNode) {
        buffer.elements.shadow.parentNode.removeChild(buffer.elements.shadow);
      }
      
      buffer.elements.main = null;
      buffer.elements.shadow = null;
      buffer.container = null;
    }
  };
  
  return buffer;
};

// Инициализируем буфер
const textDisplayBuffer = createTextDisplayBuffer();

// Вспомогательная функция для генерации строки font-variation-settings (оставляем здесь, т.к. используется в нескольких местах)
const generateVariationSettings = (styleObj, supportedAxes) => {
  if (!styleObj || !supportedAxes) return '';
  
  const settings = [];
  
  // Добавляем поддерживаемые оси
  if (supportedAxes['wght'] !== undefined && styleObj.wght !== undefined) {
    settings.push(`"wght" ${styleObj.wght}`);
  }
  
  if (supportedAxes['ital'] !== undefined && styleObj.ital !== undefined) {
    settings.push(`"ital" ${styleObj.ital}`);
  }
  
  if (supportedAxes['slnt'] !== undefined && styleObj.slnt !== undefined) {
    settings.push(`"slnt" ${styleObj.slnt}`);
  }
  
  // Добавляем другие оси, если они есть в styleObj
  Object.entries(styleObj).forEach(([key, value]) => {
    if (!['wght', 'ital', 'slnt'].includes(key) && supportedAxes[key] !== undefined) {
      settings.push(`"${key}" ${value}`);
    }
  });
  
  return settings.join(', ');
};

export default function FontPreview({
  selectedFont,
  variableSettings, 
  exportedFont, 
  handleExport,
  handleFontsUploaded,
  /** Fallback: Fontsource, если Google недоступен */
  selectOrAddFontsourceFont,
  handleScreenshotClick,
  getFontFamily,
  getVariationSettings,
  fontCssProperties,
  /** Во время анимации осей VF в Waterfall не делаем N× forced reflow на каждый кадр */
  isVariableFontAnimating = false,
  /** Полноэкранный plain-превью (тулбар «Превью») */
  plainPreviewOpen = false,
  onClosePlainPreview,
}) {
  const { 
    text, setText, 
    fontSize, 
    lineHeight, 
    letterSpacing, 
    textColor, 
    backgroundColor, 
    viewMode, 
    setViewMode,
    textDirection, 
    textAlignment, 
    textCase,
    textDecoration,
    textColumns,
    textColumnGap,
    waterfallRows,
    waterfallBaseSize,
    waterfallScaleRatio,
    waterfallRoundPx,
    verticalAlignment,
    textFill,
    previewBackgroundImage,
  } = useSettings();

  /** Общий скролл области превью — режим Glyphs подписывается на этот узел для своей виртуализации */
  const previewBodyScrollRef = useRef(null);

  const [glyphFooterCount, setGlyphFooterCount] = useState(null);

  useEffect(() => {
    if (viewMode !== 'glyphs') setGlyphFooterCount(null);
  }, [viewMode]);

  const styleValues = useMemo(() => {
    const letterSpacingValue = `${(letterSpacing / 100) * 0.5}em`; 
    const lineHeightValue = lineHeight; 
    
    // Используем fontCssProperties для получения правильных значений weight и style
    const fontStyleValue = fontCssProperties?.fontStyle || 'normal';
    const fontWeightValue = fontCssProperties?.fontWeight || 400;

    return {
      letterSpacingValue,
      lineHeightValue,
      fontStyleValue,
      fontWeightValue
    };
  }, [letterSpacing, lineHeight, fontCssProperties?.fontWeight, fontCssProperties?.fontStyle, fontCssProperties?.fontFamily]);
  
  const { letterSpacingValue, lineHeightValue, fontStyleValue, fontWeightValue } = styleValues;
  
  // Без rvrn/rclt: на части шрифтов (VF, Google сабсеты) «required variation alternates» дают
  // рваную отрисовку — часть глифов уходит в fallback, пока выглядит как «два шрифта в одной строке».
  const featureSettingsValue = useMemo(() => {
    return '"calt", "liga", "rlig", "kern"';
  }, []);
  
  // Должно совпадать с useFontCss.fontCssProperties (fallback-стек, вариативные оси), иначе превью обходило хук
  const fontFamilyValue = useMemo(() => {
    if (selectedFont && fontCssProperties?.fontFamily) {
      return fontCssProperties.fontFamily;
    }
    return getFontFamily(selectedFont);
  }, [selectedFont, getFontFamily, fontCssProperties?.fontFamily]);
  
  const variationSettingsValue = useMemo(() => {
    return getVariationSettings(selectedFont, variableSettings);
  }, [selectedFont, variableSettings, getVariationSettings]);

  const displayText = useMemo(() => {
    return text || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  }, [text]);

  /** Первое семейство из стека (без fallback) — для document.fonts.load */
  const primaryFontFamilyForLoad = useMemo(() => {
    if (!fontFamilyValue || fontFamilyValue === 'inherit') return '';
    return fontFamilyValue.split(',')[0].trim();
  }, [fontFamilyValue]);

  // Дождаться реальной подгрузки глифов под текущий текст, иначе contenteditable часто рисует
  // смесь кастомного шрифта и ui-sans-serif до «ленивого» докрута FontFace.
  useEffect(() => {
    let cancelled = false;
    if (!selectedFont || !primaryFontFamilyForLoad || typeof document === 'undefined') return;
    if (!document.fonts || typeof document.fonts.load !== 'function') return;

    const sample = displayText.length > 500 ? displayText.slice(0, 500) : displayText;
    const spec = `${fontSize}px ${primaryFontFamilyForLoad}`;

    (async () => {
      try {
        await document.fonts.load(spec, sample);
      } catch {
        /* ignore */
      }
      if (cancelled) return;
      requestAnimationFrame(() => {
        document.querySelectorAll('.editable-sync-plain').forEach((el) => {
          void el.offsetHeight;
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedFont?.id,
    primaryFontFamilyForLoad,
    fontSize,
    displayText,
    variationSettingsValue,
  ]);

  const baseTextStyle = useMemo(() => {
    const styles = {
      fontFamily: fontFamilyValue,
      fontSize: `${fontSize}px`, 
      letterSpacing: letterSpacingValue,
      lineHeight: lineHeightValue,
      color: textColor, 
      fontFeatureSettings: featureSettingsValue,
      direction: textDirection, 
      textAlign: textAlignment, 
      textTransform: textCase, 
      textDecorationLine: textDecoration === 'none' ? 'none' : textDecoration,
    };
    
    if (selectedFont?.isVariableFont) {
      // Напрямую из variableSettings (через variationSettingsValue), а не только из fontCssProperties —
      // иначе при смене осей useMemo fontCssProperties мог отставать и превью «залипало».
      if (variationSettingsValue && variationSettingsValue !== 'normal') {
        styles.fontVariationSettings = variationSettingsValue;
      }
      if (fontStyleValue && fontStyleValue !== 'normal') {
        styles.fontStyle = fontStyleValue;
      }
    } else {
      // Для НЕвариативных шрифтов используем font-weight и font-style
      styles.fontStyle = fontStyleValue;
      styles.fontWeight = fontWeightValue;
    }
    
    return styles;
  }, [
    fontFamilyValue, fontSize, letterSpacingValue, fontStyleValue, fontWeightValue, 
    lineHeightValue, textColor, featureSettingsValue, selectedFont,
    variationSettingsValue,
    textDirection, textAlignment, textCase, textDecoration
  ]);
  
  const previewAreaBgStyle = useMemo(
    () => getPreviewAreaBackgroundStyle(backgroundColor, previewBackgroundImage),
    [backgroundColor, previewBackgroundImage],
  );

  const containerStyle = useMemo(() => {
    const base = {
      backgroundColor: previewBackgroundImage ? 'transparent' : backgroundColor,
    };
    if (textFill) {
      return {
        ...base,
        width: '100%',
        height: '100%',
      };
    }
    const v = verticalAlignment;
    const justifyContent = v === 'middle' ? 'center' : v === 'bottom' ? 'flex-end' : 'flex-start';
    return {
      ...base,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      justifyContent,
      alignItems: 'stretch',
    };
  }, [backgroundColor, verticalAlignment, textFill, previewBackgroundImage]);
  
  const contentStyle = useMemo(() => {
    const alignItemsForFill =
      textAlignment === 'center' ? 'center' : textAlignment === 'right' ? 'flex-end' : 'stretch';
    const justifyContentForFill =
      verticalAlignment === 'middle' ? 'center' : verticalAlignment === 'bottom' ? 'flex-end' : 'flex-start';
    return {
      ...baseTextStyle,
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      ...(textFill
        ? {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: justifyContentForFill,
            alignItems: alignItemsForFill,
          }
        : {
            maxWidth: '100%',
            ...(Number(textColumns) > 1
              ? {
                  columnCount: Number(textColumns),
                  columnGap: `${Number(textColumnGap) || 24}px`,
                }
              : {}),
          }),
    };
  }, [baseTextStyle, textFill, verticalAlignment, textAlignment, textColumns, textColumnGap]);

  const glyphDisplayStyle = useMemo(() => {
    if (selectedFont?.isVariableFont) {
      const fvs =
        variationSettingsValue && variationSettingsValue !== 'normal' ? variationSettingsValue : null;
      return {
        ...(fvs ? { fontVariationSettings: fvs } : {}),
        ...(fontStyleValue && fontStyleValue !== 'normal' ? { fontStyle: fontStyleValue } : {}),
        color: textColor,
      };
    } else {
      // Для НЕвариативных шрифтов используем font-weight и font-style
      return {
        fontStyle: fontStyleValue,
        fontWeight: fontWeightValue,
        color: textColor,
      };
    }
  }, [fontStyleValue, fontWeightValue, selectedFont, variationSettingsValue, textColor]);

  const loadPresetFont = useCallback(async (fontName) => {
    try {
      const slices = await fetchGoogleVariableFontSlicesAll(fontName);
      if (!slices?.[0]?.blob?.size) {
        throw new Error('Пустой файл шрифта');
      }
      await handleFontsUploaded([
        {
          file: slices[0].blob,
          name: `${fontName}.woff2`,
          source: 'google',
          googleFontSlices: slices,
        },
      ]);
    } catch (e) {
      console.warn('[FontPreview] Google Fonts, fallback Fontsource:', fontName, e);
      if (typeof selectOrAddFontsourceFont === 'function') {
        try {
          await selectOrAddFontsourceFont(fontName, false);
          toast.info(`Google недоступен, загружен Fontsource: ${fontName}`);
        } catch (e2) {
          console.error('[FontPreview] Fontsource:', fontName, e2);
          toast.error(`Не удалось загрузить ${fontName}`);
        }
      } else {
        toast.error(`Не удалось загрузить ${fontName} с Google Fonts`);
      }
    }
  }, [handleFontsUploaded, selectOrAddFontsourceFont]);
  
  const presetFonts = useMemo(() => [...GOOGLE_PRESET_FONT_NAMES], []);
  
  const effectiveWaterfallSizes = useMemo(() => {
    const n = Math.max(1, Math.min(40, Math.round(Number(waterfallRows) || 20)));
    const ratioRaw = Number(waterfallScaleRatio);
    const ratio = Number.isFinite(ratioRaw) ? ratioRaw : 1.25;
    const baseRaw = Number(waterfallBaseSize);
    const startPx = Number.isFinite(baseRaw) ? Math.max(1, Math.round(baseRaw)) : 160;
    const roundPx = waterfallRoundPx !== false;
    const roundTo3 = (x) => Math.round(x * 1000) / 1000;
    if (ratio <= 1.0001) {
      const fallback = [
        160, 144, 128, 112, 96, 80, 72, 64, 56, 48, 40, 36, 32, 28, 24, 20, 18, 16, 14, 12,
      ];
      return fallback.slice(0, n);
    }
    const out = [];
    let prev = Infinity;
    for (let i = 0; i < n; i++) {
      const pxFloat = startPx / Math.pow(ratio, i);
      let px = roundPx ? Math.round(pxFloat) : roundTo3(pxFloat);
      if (!Number.isFinite(px) || px < 0.001) px = roundPx ? 1 : 0.001;
      if (px >= prev) px = roundPx ? Math.max(1, prev - 1) : Math.max(0.001, prev - 0.001);
      out.push(px);
      prev = px;
      if (prev <= (roundPx ? 1 : 0.001)) break;
    }
    while (out.length < n) out.push(roundPx ? 1 : 0.001);
    return out;
  }, [waterfallRows, waterfallScaleRatio, waterfallBaseSize, waterfallRoundPx]);
  
  const weightVariations = useMemo(() => {
    return [
      { name: 'Thin', wght: 100 }, { name: 'ExtraLight', wght: 200 }, { name: 'Light', wght: 300 },
      { name: 'Regular', wght: 400 }, { name: 'Medium', wght: 500 }, { name: 'SemiBold', wght: 600 },
      { name: 'Bold', wght: 700 }, { name: 'ExtraBold', wght: 800 }, { name: 'Black', wght: 900 }
    ];
  }, []);
  const italicVariations = useMemo(() => {
    return [
      { name: 'Thin Italic', wght: 100, slnt: -10, ital: 1 }, { name: 'Light Italic', wght: 300, slnt: -10, ital: 1 },
      { name: 'Italic', wght: 400, slnt: -10, ital: 1 }, { name: 'Medium Italic', wght: 500, slnt: -10, ital: 1 },
      { name: 'Bold Italic', wght: 700, slnt: -10, ital: 1 }, { name: 'Black Italic', wght: 900, slnt: -10, ital: 1 }
    ];
  }, []);
  const axisRatios = useMemo(() => [0, 0.25, 0.5, 0.75, 1], []);

  const plainCharCount = useMemo(() => [...String(text ?? '')].length, [text]);

  const stylesPreviewStats = useMemo(
    () => getStylesPreviewRowCount(selectedFont, weightVariations, italicVariations, axisRatios),
    [selectedFont, weightVariations, italicVariations, axisRatios],
  );

  const bottomBarModeHint = useMemo(() => {
    switch (viewMode) {
      case 'plain':
      case 'text':
        return `символов: ${plainCharCount}`;
      case 'waterfall':
        return `Рядов: ${effectiveWaterfallSizes.length}`;
      case 'glyphs':
        if (selectedFont?.source === 'google') return 'Глифы недоступны (Google)';
        if (glyphFooterCount === null) return 'Глифы: загрузка…';
        return `Глифов: ${glyphFooterCount}`;
      case 'styles':
        if (stylesPreviewStats.kind === 'static' && stylesPreviewStats.n > 0) {
          return `Статических стилей: ${stylesPreviewStats.n}`;
        }
        if (stylesPreviewStats.kind === 'variable' && stylesPreviewStats.n > 0) {
          return `Вариативных превью: ${stylesPreviewStats.n}`;
        }
        return 'Стили: не определены';
      default:
        return null;
    }
  }, [
    viewMode,
    plainCharCount,
    effectiveWaterfallSizes.length,
    selectedFont?.source,
    glyphFooterCount,
    stylesPreviewStats,
  ]);

  const handleGlyphCountForFooter = useCallback((n) => {
    setGlyphFooterCount(n);
  }, []);

  useEffect(() => {
    if (!plainPreviewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [plainPreviewOpen]);

  useEffect(() => {
    if (!plainPreviewOpen || typeof onClosePlainPreview !== 'function') return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClosePlainPreview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plainPreviewOpen, onClosePlainPreview]);

  if (!selectedFont) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold uppercase text-gray-900 mb-4">Загрузите шрифт для начала работы</h2>
          <p className="text-gray-600 mb-6">Загрузите TTF, OTF, WOFF или WOFF2 файл шрифта</p>
          <div className="mb-8">
            <FontUploader onFontsUploaded={handleFontsUploaded} />
          </div>
          <div className="text-sm text-gray-500">
            Или выберите один из наших предустановленных шрифтов ниже:
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {presetFonts.map(fontName => (
              <button 
                key={fontName}
                onClick={() => loadPresetFont(fontName)}
                type="button"
                className="bg-white py-3 px-4 rounded-md border border-white text-gray-800 transition-all duration-200 hover:border-gray-400 font-sans font-medium"
              >
                {fontName}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col bg-white">
      <div
        ref={previewBodyScrollRef}
        className="relative min-h-0 w-full flex-1 overflow-y-auto pt-0 pb-4"
        style={previewAreaBgStyle}
      >
        {viewMode === 'plain' && (
          <Suspense fallback={<div className="p-8">Загрузка режима...</div>}>
            <PlainTextMode
              containerStyle={containerStyle}
              contentStyle={contentStyle}
              variant="default"
            />
          </Suspense>
        )}
        
        {viewMode === 'waterfall' && (
          <Suspense fallback={<div className="p-8">Загрузка режима...</div>}>
            <WaterfallMode
              waterfallSizes={effectiveWaterfallSizes}
              scrollParentRef={previewBodyScrollRef}
              isVariableFontAnimating={isVariableFontAnimating}
            />
          </Suspense>
        )}
        
        {viewMode === 'styles' && (
          <Suspense fallback={<div className="p-8">Загрузка режима...</div>}>
            <StylesMode
              selectedFont={selectedFont}
              fontFamilyValue={fontFamilyValue}
              weightVariations={weightVariations}
              italicVariations={italicVariations}
              axisRatios={axisRatios}
              generateVariationSettings={generateVariationSettings}
            />
          </Suspense>
        )}

        {viewMode === 'glyphs' && (
          <Suspense fallback={<div className="p-8 text-center text-gray-600">Загрузка режима глифов…</div>}>
            <GlyphsMode
              key={`${selectedFont?.id}-${viewMode === 'glyphs'}`}
              selectedFont={selectedFont}
              fontFamily={fontFamilyValue}
              glyphDisplayStyle={glyphDisplayStyle}
              isActive={viewMode === 'glyphs'}
              scrollParentRef={previewBodyScrollRef}
              onDisplayableGlyphCountChange={handleGlyphCountForFooter}
            />
          </Suspense>
        )}

        {viewMode === 'text' && (
          <Suspense fallback={<div className="p-8">Загрузка режима...</div>}>
            <TextMode
              contentStyle={contentStyle}
              textDisplayBuffer={textDisplayBuffer}
              fontFamily={fontFamilyValue}
              variationSettingsValue={variationSettingsValue}
            />
          </Suspense>
        )}
      </div>

      <div className={EDITOR_PREVIEW_BOTTOM_BAR_CLASS}>
        <div className="relative z-20 flex min-w-0 max-w-[42%] shrink-0 items-center bg-white py-0.5 pl-2 pr-2 sm:max-w-[38%]">
          {bottomBarModeHint ? (
            <span className="truncate text-left text-xs uppercase font-semibold tabular-nums text-gray-800">
              {bottomBarModeHint}
            </span>
          ) : (
            <span className="text-xs text-gray-400"> </span>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-8">
          {selectedFont && (
            <div className="pointer-events-none max-w-[min(520px,calc(100%-20rem))] text-center text-xs uppercase leading-snug font-semibold text-gray-700 sm:max-w-[min(560px,calc(100%-18rem))]">
              <span className="text-gray-800 mr-2">
                {exportedFont
                  ? exportedFont.name.replace(/-static$/, '')
                  : selectedFont.name ||
                    selectedFont.family ||
                    (selectedFont.fontFamily && selectedFont.source !== 'google'
                      ? selectedFont.fontFamily
                      : 'Шрифт')}
              </span>
              <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-gray-800">
                {selectedFont.source === 'google' ? 'Google Font' : 'Пользовательский'}
              </span>
              {(selectedFont.variationSettings || selectedFont.isVariableFont) && (
                <>
                  <span className="text-gray-400"> </span>
                  <span className="inline-block rounded-full bg-gray-900 px-2.5 py-1 text-white">
                    VF
                  </span>
                </>
              )}
              <span className="text-gray-400"> </span>
              <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-gray-800">
                {selectedFont.currentWeight}
              </span>
              {selectedFont.currentStyle === 'italic' && (
                <>
                  <span className="text-gray-400"> </span>
                  <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-gray-800">
                    Italic
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="relative z-20 ml-auto flex shrink-0 flex-wrap justify-end gap-1.5 bg-white py-0.5 pl-2 sm:gap-2">
          <button
            type="button"
            onClick={() => handleScreenshotClick?.()}
            className="flex items-center gap-1 rounded-sm bg-accent px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
              <path
                fillRule="evenodd"
                d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                clipRule="evenodd"
              />
            </svg>
            Скриншот
          </button>
        </div>
      </div>
    </div>

    {plainPreviewOpen && typeof onClosePlainPreview === 'function' && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Полноэкранное превью plain-текста"
        className="fixed inset-0 z-[220] flex flex-col"
        style={previewAreaBgStyle}
      >
        <div className="flex shrink-0 items-center justify-end bg-white/95 px-3 py-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={onClosePlainPreview}
            className="rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100"
          >
            Закрыть
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto" style={previewAreaBgStyle}>
          <Suspense fallback={<div className="p-8 text-gray-500">Загрузка…</div>}>
            <PlainTextMode
              containerStyle={containerStyle}
              contentStyle={contentStyle}
              variant="fullscreen"
            />
          </Suspense>
        </div>
      </div>
    )}
    </>
  );
} 
