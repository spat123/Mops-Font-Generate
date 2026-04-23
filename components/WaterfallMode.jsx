import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useFontContext } from '../contexts/FontContext';
import EditableText from './EditableText';
import { VirtualizedVariableList } from './ui/VirtualizedVariableList';
import { FloatingTooltip } from './ui/Tooltip';
import { PreviewEditTextHint } from './ui/PreviewEditTextHint';
import { PRESET_STYLES, clampPresetNameForVariableAxes } from '../utils/fontUtilsCommon';

// Fallback, если родитель не передал массив (должен совпадать с FontPreview.waterfallSizes)
const DEFAULT_WATERFALL_SIZES = [180, 120, 96, 72, 60, 48, 36, 30, 24, 18, 14, 12, 10, 8];

function estimateWaterfallRowHeight(sizePx, lineHeight) {
  const pad = 32;
  const lh = Number.isFinite(Number(lineHeight)) ? Number(lineHeight) : 1.0;
  return pad + Math.ceil(sizePx * lh) + 1;
}

function roundTo3(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

function formatNumTrim(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  const s = v.toFixed(3);
  return s.replace(/\.?0+$/, '');
}

function formatWaterfallSizeLabel(sizePx, unit, remBasePx) {
  const px = Number(sizePx) || 0;
  if (unit === 'rem') {
    const base = Number(remBasePx) || 16;
    return `${formatNumTrim(roundTo3(px / base))}rem`;
  }
  if (unit === 'pt') {
    return `${formatNumTrim(roundTo3(px * 0.75))}pt`;
  }
  return `${formatNumTrim(roundTo3(px))}px`;
}

function formatWaterfallTypeLabel(index) {
  const n = Number(index);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 6) return `H${n + 1}`;
  if (n === 6) return 'P';
  if (n === 7) return 'Small';
  return '';
}

function parseFontVariationSettings(input) {
  const s = String(input ?? '').trim();
  if (!s || s === 'normal') return [];
  const out = [];
  const re = /"([^"]+)"\s*([-+]?\d*\.?\d+)/g;
  let m;
  while ((m = re.exec(s))) {
    const tag = String(m[1] ?? '').trim();
    const v = Number(m[2]);
    if (!tag) continue;
    if (!Number.isFinite(v)) continue;
    out.push({ tag, value: v });
  }
  return out;
}

function upsertFvs(entries, tag, value) {
  const t = String(tag);
  const v = Number(value);
  if (!t || !Number.isFinite(v)) return entries;
  const idx = entries.findIndex((e) => e.tag === t);
  if (idx >= 0) {
    const next = entries.slice();
    next[idx] = { tag: t, value: v };
    return next;
  }
  return [...entries, { tag: t, value: v }];
}

function stringifyFontVariationSettings(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return 'normal';
  return entries.map((e) => `"${e.tag}" ${e.value}`).join(', ');
}

/**
 * @param {object} props
 * @param {number[]=} props.waterfallSizes
 * @param {React.RefObject<HTMLElement|null>=} props.scrollParentRef — общий скролл области превью
 */
const WaterfallMode = ({
  waterfallSizes: sizesProp,
  scrollParentRef,
  /** Не дергать offsetHeight в каждой строке на каждом кадре анимации VF */
  isVariableFontAnimating = false,
} = {}) => {
  const waterfallSizes =
    Array.isArray(sizesProp) && sizesProp.length > 0 ? sizesProp : DEFAULT_WATERFALL_SIZES;

  const {
    backgroundColor,
    previewBackgroundImage,
    textAlignment,
    textCase,
    textColor,
    textDecoration,
    waterfallUnit,
    waterfallRoundPx,
    waterfallHeadingPresetName,
    waterfallBodyPresetName,
    waterfallHeadingLineHeight,
    waterfallBodyLineHeight,
    waterfallHeadingLetterSpacing,
    waterfallBodyLetterSpacing,
  } = useSettings();

  const { selectedFont, getFontFamily, fontCssProperties } = useFontContext();

  const [scrollParentEl, setScrollParentEl] = useState(null);

  useLayoutEffect(() => {
    const el = scrollParentRef?.current;
    setScrollParentEl(el instanceof HTMLElement ? el : null);
  }, [scrollParentRef]);

  const baseTextStyle = useMemo(() => {
    const fromHook =
      fontCssProperties && typeof fontCssProperties === 'object' && fontCssProperties.fontFamily
        ? { ...fontCssProperties }
        : { fontFamily: getFontFamily() };
    return {
      ...fromHook,
      textAlign: textAlignment,
      textTransform: textCase === 'none' ? 'none' : textCase,
      color: textColor,
      textDecorationLine: textDecoration === 'none' ? 'none' : textDecoration,
    };
  }, [
    fontCssProperties,
    getFontFamily,
    textAlignment,
    textCase,
    textColor,
    textDecoration,
  ]);

  const resolvedWaterfallPresetNames = useMemo(() => {
    const variableAxes = selectedFont?.variableAxes;
    const resolve = (presetName) => {
      const raw = typeof presetName === 'string' && presetName.trim() ? presetName.trim() : 'Regular';
      if (selectedFont?.isVariableFont) {
        return clampPresetNameForVariableAxes(
          raw,
          variableAxes,
          400,
          raw.includes('Italic') ? 'italic' : 'normal',
          { italicMode: selectedFont?.italicMode },
        );
      }
      return raw;
    };
    return {
      heading: resolve(waterfallHeadingPresetName),
      body: resolve(waterfallBodyPresetName),
    };
  }, [selectedFont?.isVariableFont, selectedFont?.variableAxes, waterfallHeadingPresetName, waterfallBodyPresetName]);

  const waterfallPresetInfo = useMemo(() => {
    const getPreset = (name) => PRESET_STYLES.find((p) => p.name === name) || PRESET_STYLES.find((p) => p.name === 'Regular');
    return {
      heading: getPreset(resolvedWaterfallPresetNames.heading),
      body: getPreset(resolvedWaterfallPresetNames.body),
    };
  }, [resolvedWaterfallPresetNames]);

  const computeRowLineHeight = useCallback(
    (index, sizePx) => {
      const isHeading = index >= 0 && index <= 5;
      const raw = isHeading ? waterfallHeadingLineHeight : waterfallBodyLineHeight;
      const v = Number(raw);
      return Number.isFinite(v) ? v : 1.0;
    },
    [waterfallHeadingLineHeight, waterfallBodyLineHeight],
  );

  const computeRowLetterSpacingEm = useCallback(
    (index) => {
      const isHeading = index >= 0 && index <= 5;
      const raw = isHeading ? waterfallHeadingLetterSpacing : waterfallBodyLetterSpacing;
      const v = Number(raw) || 0;
      return `${(v / 100) * 0.5}em`;
    },
    [waterfallHeadingLetterSpacing, waterfallBodyLetterSpacing],
  );

  const itemHeights = useMemo(
    () =>
      waterfallSizes.map((size, index) =>
        estimateWaterfallRowHeight(size, computeRowLineHeight(index, size)),
      ),
    [waterfallSizes, computeRowLineHeight],
  );

  const remBasePx = useMemo(() => {
    if (typeof window === 'undefined') return 16;
    const v = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    return Number.isFinite(v) && v > 0 ? v : 16;
  }, []);

  const copyToastTimerRef = useRef(null);
  const [copyToast, setCopyToast] = useState(null);
  const [copiedSizeLabel, setCopiedSizeLabel] = useState(null);

  const renderItem = useCallback(
    (index) => {
      const size = waterfallSizes[index];
      const sizeLabel = formatWaterfallSizeLabel(size, waterfallUnit, remBasePx);
      const typeLabel = formatWaterfallTypeLabel(index);
      const isBody = index >= 6;
      const presetInfo = isBody ? waterfallPresetInfo.body : waterfallPresetInfo.heading;
      const itemStyle = {
        ...baseTextStyle,
        fontSize: `${waterfallRoundPx === false ? roundTo3(size) : Math.round(size)}px`,
        lineHeight: computeRowLineHeight(index, size),
        letterSpacing: computeRowLetterSpacingEm(index),
        whiteSpace: 'nowrap',
        overflow: 'visible',
        width: '100%',
        textAlign: textAlignment,
      };

      if (isBody && selectedFont?.isVariableFont) {
        const axes = selectedFont?.variableAxes && typeof selectedFont.variableAxes === 'object' ? selectedFont.variableAxes : {};
        let fvs = parseFontVariationSettings(baseTextStyle?.fontVariationSettings);
        if (axes.wght !== undefined) fvs = upsertFvs(fvs, 'wght', presetInfo?.weight ?? 400);
        if (axes.ital !== undefined) fvs = upsertFvs(fvs, 'ital', presetInfo?.style === 'italic' ? 1 : 0);
        if (axes.slnt !== undefined) fvs = upsertFvs(fvs, 'slnt', presetInfo?.style === 'italic' ? (axes.slnt?.min ?? -15) : (axes.slnt?.default ?? 0));
        itemStyle.fontVariationSettings = stringifyFontVariationSettings(fvs);
      } else if (selectedFont?.isVariableFont) {
        const axes = selectedFont?.variableAxes && typeof selectedFont.variableAxes === 'object' ? selectedFont.variableAxes : {};
        let fvs = parseFontVariationSettings(baseTextStyle?.fontVariationSettings);
        if (axes.wght !== undefined) fvs = upsertFvs(fvs, 'wght', presetInfo?.weight ?? 400);
        if (axes.ital !== undefined) fvs = upsertFvs(fvs, 'ital', presetInfo?.style === 'italic' ? 1 : 0);
        if (axes.slnt !== undefined) fvs = upsertFvs(fvs, 'slnt', presetInfo?.style === 'italic' ? (axes.slnt?.min ?? -15) : (axes.slnt?.default ?? 0));
        itemStyle.fontVariationSettings = stringifyFontVariationSettings(fvs);
      } else {
        itemStyle.fontWeight = presetInfo?.weight ?? 400;
        itemStyle.fontStyle = presetInfo?.style ?? 'normal';
      }

      return (
        <div
          className={`${index > 0 ? 'border-t border-gray-200 overflow-hidden' : ''} pb-4 pt-4`}
          style={{ contain: 'layout style' }}
        >
          <div className="flex items-center">
            <div className="shrink-0 pl-5">
              <div className="flex items-center gap-2">
                {typeLabel ? (
                  <span
                    className={`inline-flex h-6 w-12 items-center justify-center text-[10px] font-semibold ${
                      typeLabel === 'Small'
                        ? 'rounded-full bg-gray-100 text-gray-800'
                        : 'rounded-full bg-gray-100 text-gray-800'
                    }`.trim()}
                  >
                    {typeLabel}
                  </span>
                ) : (
                  <span className="inline-flex h-6 w-12" aria-hidden />
                )}
                <button
                  type="button"
                  className="group inline-flex w-10 items-center text-right text-xs font-medium tabular-nums text-gray-500"
                  aria-label={`Скопировать размер: ${sizeLabel}`}
                  data-waterfall-size-copy={sizeLabel}
                >
                  <span className="underline-offset-4 group-hover:text-gray-900 group-hover:underline group-hover:decoration-dotted group-hover:decoration-gray-400">
                    <span className={copiedSizeLabel === sizeLabel ? 'text-accent' : ''}>
                      {sizeLabel}
                    </span>
                  </span>
                </button>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <EditableText
                style={itemStyle}
                isStyles={false}
                syncId={`waterfall-${index}-${size}-${waterfallUnit}`}
                viewMode="waterfall"
                isWaterfall={true}
                skipMetricReflowWhileVfAnimating={isVariableFontAnimating}
              />
            </div>
          </div>
        </div>
      );
    },
    [
      baseTextStyle,
      textAlignment,
      waterfallSizes,
      isVariableFontAnimating,
      waterfallUnit,
      remBasePx,
      computeRowLineHeight,
      computeRowLetterSpacingEm,
      copiedSizeLabel,
      waterfallPresetInfo,
      selectedFont?.id,
      waterfallRoundPx,
    ],
  );

  useEffect(() => {
    const el = scrollParentEl;
    if (!el) return;

    const onClick = async (e) => {
      const t = e.target instanceof Element ? e.target : null;
      const btn = t?.closest?.('[data-waterfall-size-copy]');
      if (!(btn instanceof HTMLElement)) return;
      const value = btn.getAttribute('data-waterfall-size-copy') || '';
      if (!value) return;

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const ta = document.createElement('textarea');
          ta.value = value;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
      } catch {
        return;
      }

      const r = btn.getBoundingClientRect();
      setCopyToast({ anchorRect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height } });
      setCopiedSizeLabel(value);
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      copyToastTimerRef.current = setTimeout(() => {
        copyToastTimerRef.current = null;
        setCopyToast(null);
        setCopiedSizeLabel(null);
      }, 900);
    };

    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('click', onClick);
      if (copyToastTimerRef.current) {
        clearTimeout(copyToastTimerRef.current);
        copyToastTimerRef.current = null;
      }
    };
  }, [scrollParentEl]);

  if (!selectedFont) {
    return (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center text-gray-500">
        Выберите или загрузите шрифт для просмотра в режиме Waterfall.
      </div>
    );
  }

  if (!scrollParentEl) {
    return <div className="h-0 w-full shrink-0" aria-hidden />;
  }

  return (
    <>
      {copyToast?.anchorRect ? (
        <FloatingTooltip content="Скопировано" anchorRect={copyToast.anchorRect} side="top" />
      ) : null}
      <div
        className="relative min-h-full w-full min-w-0 pb-8 pr-8 pt-0"
        style={{
          backgroundColor: previewBackgroundImage ? 'transparent' : (backgroundColor ?? undefined),
        }}
      >
        <VirtualizedVariableList
          scrollParentEl={scrollParentEl}
          itemHeights={itemHeights}
          renderItem={renderItem}
          overscanPx={96}
        />
        <PreviewEditTextHint />
      </div>
    </>
  );
};

export default WaterfallMode;
