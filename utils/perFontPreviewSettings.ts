import {
  ENTIRE_PRINTABLE_ASCII_SAMPLE,
  LEGACY_BASIC_ALNUM_PREVIEW_TEXT,
} from './previewSampleStrings';
import { previewTextDbg, previewTextSnippet } from './previewTextDebugLog';

export type PerFontPreviewSnapshot = Record<string, unknown>;

export type PerFontPreviewSetters = Record<string, ((value: unknown) => void) | undefined>;

/**
 * Снимок настроек превью / левой панели, хранимый на каждом шрифте (вкладка).
 */
export function collectPerFontPreviewSnapshot(s: PerFontPreviewSnapshot): PerFontPreviewSnapshot {
  return {
    text: s.text,
    fontSize: s.fontSize,
    glyphsFontSize: s.glyphsFontSize,
    stylesFontSize: s.stylesFontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    stylesLetterSpacing: s.stylesLetterSpacing,
    openTypeFeatureOverrides: s.openTypeFeatureOverrides,
    textColor: s.textColor,
    backgroundColor: s.backgroundColor,
    textDirection: s.textDirection,
    textAlignment: s.textAlignment,
    textCase: s.textCase,
    textDecoration: s.textDecoration,
    listStyle: s.listStyle,
    textColumns: s.textColumns,
    textColumnGap: s.textColumnGap,
    waterfallRows: s.waterfallRows,
    waterfallBaseSize: s.waterfallBaseSize,
    waterfallEditTarget: s.waterfallEditTarget,
    waterfallHeadingPresetName: s.waterfallHeadingPresetName,
    waterfallBodyPresetName: s.waterfallBodyPresetName,
    waterfallHeadingLineHeight: s.waterfallHeadingLineHeight,
    waterfallBodyLineHeight: s.waterfallBodyLineHeight,
    waterfallHeadingLetterSpacing: s.waterfallHeadingLetterSpacing,
    waterfallBodyLetterSpacing: s.waterfallBodyLetterSpacing,
    waterfallScaleRatio: s.waterfallScaleRatio,
    waterfallUnit: s.waterfallUnit,
    waterfallRoundPx: s.waterfallRoundPx,
    textCenter: s.verticalAlignment === 'middle',
    verticalAlignment: s.verticalAlignment,
    textFill: s.textFill,
  };
}

export function applyPerFontPreviewSnapshot(
  snapshot: PerFontPreviewSnapshot | null | undefined,
  setters: PerFontPreviewSetters,
): void {
  if (!snapshot || typeof snapshot !== 'object') return;
  const {
    setText,
    setFontSize,
    setGlyphsFontSize,
    setStylesFontSize,
    setLineHeight,
    setLetterSpacing,
    setStylesLetterSpacing,
    setOpenTypeFeatureOverrides,
    setTextColor,
    setBackgroundColor,
    setTextDirection,
    setTextAlignment,
    setTextCase,
    setTextDecoration,
    setListStyle,
    setTextColumns,
    setTextColumnGap,
    setWaterfallRows,
    setWaterfallBaseSize,
    setWaterfallEditTarget,
    setWaterfallHeadingPresetName,
    setWaterfallBodyPresetName,
    setWaterfallHeadingLineHeight,
    setWaterfallBodyLineHeight,
    setWaterfallHeadingLetterSpacing,
    setWaterfallBodyLetterSpacing,
    setWaterfallScaleRatio,
    setWaterfallUnit,
    setWaterfallRoundPx,
    setTextCenter,
    setVerticalAlignment,
    setTextFill,
  } = setters;

  if (snapshot.text !== undefined && setText) {
    const legacyMapped = snapshot.text === LEGACY_BASIC_ALNUM_PREVIEW_TEXT;
    const t = legacyMapped ? ENTIRE_PRINTABLE_ASCII_SAMPLE : snapshot.text;
    previewTextDbg('applyPerFontPreviewSnapshot: setText', {
      incomingLen: typeof snapshot.text === 'string' ? snapshot.text.length : -1,
      legacyMapped,
      resultLen: typeof t === 'string' ? t.length : -1,
      snippet: previewTextSnippet(t, 120),
    });
    setText(t);
  }
  if (snapshot.fontSize !== undefined && setFontSize) setFontSize(snapshot.fontSize);
  if (typeof setGlyphsFontSize === 'function' && snapshot.glyphsFontSize !== undefined) {
    setGlyphsFontSize(snapshot.glyphsFontSize);
  }
  if (typeof setStylesFontSize === 'function' && snapshot.stylesFontSize !== undefined) {
    setStylesFontSize(snapshot.stylesFontSize);
  }
  if (snapshot.lineHeight !== undefined && setLineHeight) setLineHeight(snapshot.lineHeight);
  if (snapshot.letterSpacing !== undefined && setLetterSpacing) setLetterSpacing(snapshot.letterSpacing);
  if (typeof setStylesLetterSpacing === 'function' && snapshot.stylesLetterSpacing !== undefined) {
    setStylesLetterSpacing(snapshot.stylesLetterSpacing);
  }
  if (typeof setOpenTypeFeatureOverrides === 'function') {
    const raw = (snapshot as any).openTypeFeatureOverrides;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const out: Record<string, 0 | 1> = {};
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const tag = String(k || '').trim().toLowerCase().slice(0, 4);
        if (!tag) continue;
        if (v === 0 || v === 1) out[tag] = v;
      }
      setOpenTypeFeatureOverrides(out);
    } else if (raw === null || raw === undefined) {
      setOpenTypeFeatureOverrides({});
    }
  }
  if (snapshot.textColor !== undefined && setTextColor) setTextColor(snapshot.textColor);
  if (snapshot.backgroundColor !== undefined && setBackgroundColor) setBackgroundColor(snapshot.backgroundColor);
  if (snapshot.textDirection !== undefined && setTextDirection) setTextDirection(snapshot.textDirection);
  if (snapshot.textAlignment !== undefined && setTextAlignment) setTextAlignment(snapshot.textAlignment);
  if (snapshot.textCase !== undefined && setTextCase) setTextCase(snapshot.textCase);
  if (typeof setTextDecoration === 'function' && snapshot.textDecoration !== undefined) {
    setTextDecoration(snapshot.textDecoration);
  }
  if (typeof setListStyle === 'function' && snapshot.listStyle !== undefined) {
    setListStyle(snapshot.listStyle);
  }
  if (typeof setTextColumns === 'function' && snapshot.textColumns !== undefined) {
    setTextColumns(snapshot.textColumns);
  }
  if (typeof setTextColumnGap === 'function' && snapshot.textColumnGap !== undefined) {
    setTextColumnGap(snapshot.textColumnGap);
  }
  if (typeof setWaterfallRows === 'function' && snapshot.waterfallRows !== undefined) {
    setWaterfallRows(snapshot.waterfallRows);
  }
  if (
    typeof setWaterfallBaseSize === 'function' &&
    snapshot.waterfallBaseSize !== undefined &&
    Number.isFinite(Number(snapshot.waterfallBaseSize))
  ) {
    setWaterfallBaseSize(Number(snapshot.waterfallBaseSize));
  }
  if (typeof setWaterfallEditTarget === 'function' && snapshot.waterfallEditTarget !== undefined) {
    const v = snapshot.waterfallEditTarget;
    if (v === 'heading' || v === 'body') setWaterfallEditTarget(v);
  }
  if (typeof setWaterfallHeadingPresetName === 'function' && snapshot.waterfallHeadingPresetName !== undefined) {
    setWaterfallHeadingPresetName(snapshot.waterfallHeadingPresetName || 'Regular');
  }
  if (typeof setWaterfallBodyPresetName === 'function' && snapshot.waterfallBodyPresetName !== undefined) {
    setWaterfallBodyPresetName(snapshot.waterfallBodyPresetName || 'Regular');
  }
  if (
    typeof setWaterfallHeadingLineHeight === 'function' &&
    snapshot.waterfallHeadingLineHeight !== undefined &&
    Number.isFinite(Number(snapshot.waterfallHeadingLineHeight))
  ) {
    setWaterfallHeadingLineHeight(Number(snapshot.waterfallHeadingLineHeight));
  }
  if (
    typeof setWaterfallBodyLineHeight === 'function' &&
    snapshot.waterfallBodyLineHeight !== undefined &&
    Number.isFinite(Number(snapshot.waterfallBodyLineHeight))
  ) {
    setWaterfallBodyLineHeight(Number(snapshot.waterfallBodyLineHeight));
  }
  if (
    typeof setWaterfallHeadingLetterSpacing === 'function' &&
    snapshot.waterfallHeadingLetterSpacing !== undefined &&
    Number.isFinite(Number(snapshot.waterfallHeadingLetterSpacing))
  ) {
    setWaterfallHeadingLetterSpacing(Number(snapshot.waterfallHeadingLetterSpacing));
  }
  if (
    typeof setWaterfallBodyLetterSpacing === 'function' &&
    snapshot.waterfallBodyLetterSpacing !== undefined &&
    Number.isFinite(Number(snapshot.waterfallBodyLetterSpacing))
  ) {
    setWaterfallBodyLetterSpacing(Number(snapshot.waterfallBodyLetterSpacing));
  }
  if (
    typeof setWaterfallScaleRatio === 'function' &&
    snapshot.waterfallScaleRatio !== undefined &&
    Number.isFinite(Number(snapshot.waterfallScaleRatio))
  ) {
    setWaterfallScaleRatio(Number(snapshot.waterfallScaleRatio));
  }
  if (typeof setWaterfallUnit === 'function' && snapshot.waterfallUnit !== undefined) {
    const u = snapshot.waterfallUnit;
    if (u === 'px' || u === 'rem' || u === 'pt') setWaterfallUnit(u);
  }
  if (typeof setWaterfallRoundPx === 'function' && snapshot.waterfallRoundPx !== undefined) {
    setWaterfallRoundPx(Boolean(snapshot.waterfallRoundPx));
  }
  if (typeof setTextCenter === 'function' && snapshot.textCenter !== undefined) {
    setTextCenter(snapshot.textCenter);
  }
  if (typeof setVerticalAlignment === 'function') {
    if (snapshot.verticalAlignment !== undefined) {
      const v = snapshot.verticalAlignment;
      if (v === 'top' || v === 'middle' || v === 'bottom') setVerticalAlignment(v);
    } else if (snapshot.textCenter === true) {
      setVerticalAlignment('middle');
    } else if (snapshot.textCenter === false) {
      setVerticalAlignment('top');
    }
  }
  if (snapshot.textFill !== undefined && setTextFill) setTextFill(snapshot.textFill);
}
