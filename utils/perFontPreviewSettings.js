/**
 * Снимок настроек превью / левой панели, хранимый на каждом шрифте (вкладка).
 * Не включает variable axes / пресет — они уже на объекте шрифта.
 */

import {
  ENTIRE_PRINTABLE_ASCII_SAMPLE,
  LEGACY_BASIC_ALNUM_PREVIEW_TEXT,
} from './previewSampleStrings';

export function collectPerFontPreviewSnapshot(s) {
  return {
    text: s.text,
    fontSize: s.fontSize,
    glyphsFontSize: s.glyphsFontSize,
    stylesFontSize: s.stylesFontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    stylesLetterSpacing: s.stylesLetterSpacing,
    textColor: s.textColor,
    backgroundColor: s.backgroundColor,
    viewMode: s.viewMode,
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
    /** Совместимость: true ≈ вертикаль «по центру» */
    textCenter: s.verticalAlignment === 'middle',
    verticalAlignment: s.verticalAlignment,
    textFill: s.textFill,
  };
}

/**
 * @param {Record<string, unknown>} snapshot
 * @param {Record<string, Function>} setters — setText, setFontSize, …
 */
export function applyPerFontPreviewSnapshot(snapshot, setters) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const {
    setText,
    setFontSize,
    setGlyphsFontSize,
    setStylesFontSize,
    setLineHeight,
    setLetterSpacing,
    setStylesLetterSpacing,
    setTextColor,
    setBackgroundColor,
    setViewMode,
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

  if (snapshot.text !== undefined) {
    const t =
      snapshot.text === LEGACY_BASIC_ALNUM_PREVIEW_TEXT
        ? ENTIRE_PRINTABLE_ASCII_SAMPLE
        : snapshot.text;
    setText(t);
  }
  if (snapshot.fontSize !== undefined) setFontSize(snapshot.fontSize);
  if (typeof setGlyphsFontSize === 'function' && snapshot.glyphsFontSize !== undefined) {
    setGlyphsFontSize(snapshot.glyphsFontSize);
  }
  if (typeof setStylesFontSize === 'function' && snapshot.stylesFontSize !== undefined) {
    setStylesFontSize(snapshot.stylesFontSize);
  }
  if (snapshot.lineHeight !== undefined) setLineHeight(snapshot.lineHeight);
  if (snapshot.letterSpacing !== undefined) setLetterSpacing(snapshot.letterSpacing);
  if (typeof setStylesLetterSpacing === 'function' && snapshot.stylesLetterSpacing !== undefined) {
    setStylesLetterSpacing(snapshot.stylesLetterSpacing);
  }
  if (snapshot.textColor !== undefined) setTextColor(snapshot.textColor);
  if (snapshot.backgroundColor !== undefined) setBackgroundColor(snapshot.backgroundColor);
  if (snapshot.viewMode !== undefined) setViewMode(snapshot.viewMode);
  if (snapshot.textDirection !== undefined) setTextDirection(snapshot.textDirection);
  if (snapshot.textAlignment !== undefined) setTextAlignment(snapshot.textAlignment);
  if (snapshot.textCase !== undefined) setTextCase(snapshot.textCase);
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
  if (snapshot.textFill !== undefined) setTextFill(snapshot.textFill);
}
