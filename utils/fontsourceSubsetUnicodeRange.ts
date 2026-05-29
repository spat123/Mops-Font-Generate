/**
 * Значения unicode-range для @font-face / FontFace при раздельных файлах сабсетов Fontsource.
 * Латиница — как в классическом «latin» у Google Fonts.
 * Кириллица — cyrillic + типичные блоки cyrillic-ext (белорусский/украинский и т.д.).
 */
export const FONTSOURCE_UNICODE_RANGE_LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

export const FONTSOURCE_UNICODE_RANGE_CYRILLIC =
  'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+0460-052F, U+1C80-1C88, U+20B4, U+2116, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F';

const SUBSET_UNICODE_RANGE_MAP: Record<string, string> = {
  latin: FONTSOURCE_UNICODE_RANGE_LATIN,
  'latin-ext':
    'U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF',
  cyrillic: FONTSOURCE_UNICODE_RANGE_CYRILLIC,
  'cyrillic-ext':
    'U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F',
  greek: 'U+0370-03FF',
  'greek-ext': 'U+1F00-1FFF',
  vietnamese:
    'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB',
};

/** Для одного активного subset; `null` — файл без unicode-range (весь набор глифов файла). */
export function getFontsourceSubsetUnicodeRange(subset: string): string | null {
  const key = String(subset || '').trim().toLowerCase();
  if (!key) return null;
  return SUBSET_UNICODE_RANGE_MAP[key] || null;
}
