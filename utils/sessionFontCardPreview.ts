import { sessionFontCardPreviewStyle } from './fontUtilsCommon';
import type { SessionFontRecord } from '../types/editorFonts';
import type { CSSProperties } from 'react';

/** Стили превью карточки session / library entry. */
export function getSessionFontCardPreviewStyle(font: SessionFontRecord | null | undefined): CSSProperties | undefined {
  if (!font) return undefined;
  if (font.source === 'google') {
    const family = font.displayName || font.name;
    return { fontFamily: `'${family}', sans-serif`, fontSize: '20px' };
  }
  return sessionFontCardPreviewStyle(font);
}
