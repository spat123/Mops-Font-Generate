export type SlimGoogleAxis = {
  tag: string;
  min: number;
  max: number;
  defaultValue: number;
};

type RawGoogleAxis = {
  tag?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
};

/** Оси из записи metadata Google (fonts.google.com/metadata/fonts) → компактный JSON для клиента. */
export function slimGoogleMetadataAxes(rawAxes: unknown): SlimGoogleAxis[] {
  const axes = Array.isArray(rawAxes) ? (rawAxes as RawGoogleAxis[]) : [];
  return axes
    .filter(
      (a) =>
        a &&
        typeof a.tag === 'string' &&
        typeof a.min === 'number' &&
        typeof a.max === 'number' &&
        Number.isFinite(a.min) &&
        Number.isFinite(a.max),
    )
    .map((a) => ({
      tag: a.tag as string,
      min: a.min as number,
      max: a.max as number,
      defaultValue:
        typeof a.defaultValue === 'number' && Number.isFinite(a.defaultValue) ? a.defaultValue : (a.min as number),
    }));
}

export function resolveGoogleMetadataItalicMode(
  rawAxes: unknown,
  rawFonts: unknown,
): 'axis-ital' | 'axis-slnt' | 'separate-style' | 'none' {
  const axes = slimGoogleMetadataAxes(rawAxes);
  if (axes.some((axis) => axis?.tag === 'ital')) return 'axis-ital';
  if (axes.some((axis) => axis?.tag === 'slnt')) return 'axis-slnt';
  const fontsObj = rawFonts && typeof rawFonts === 'object' && !Array.isArray(rawFonts) ? rawFonts : {};
  const hasItalicStyles = Object.keys(fontsObj as Record<string, unknown>).some((k) => /^\d+i$/.test(k));
  if (hasItalicStyles) return 'separate-style';
  return 'none';
}
