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
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    textColor: s.textColor,
    backgroundColor: s.backgroundColor,
    viewMode: s.viewMode,
    textDirection: s.textDirection,
    textAlignment: s.textAlignment,
    textCase: s.textCase,
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
    setLineHeight,
    setLetterSpacing,
    setTextColor,
    setBackgroundColor,
    setViewMode,
    setTextDirection,
    setTextAlignment,
    setTextCase,
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
  if (snapshot.lineHeight !== undefined) setLineHeight(snapshot.lineHeight);
  if (snapshot.letterSpacing !== undefined) setLetterSpacing(snapshot.letterSpacing);
  if (snapshot.textColor !== undefined) setTextColor(snapshot.textColor);
  if (snapshot.backgroundColor !== undefined) setBackgroundColor(snapshot.backgroundColor);
  if (snapshot.viewMode !== undefined) setViewMode(snapshot.viewMode);
  if (snapshot.textDirection !== undefined) setTextDirection(snapshot.textDirection);
  if (snapshot.textAlignment !== undefined) setTextAlignment(snapshot.textAlignment);
  if (snapshot.textCase !== undefined) setTextCase(snapshot.textCase);
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
