/**
 * Оси из записи metadata Google (fonts.google.com/metadata/fonts) → компактный JSON для клиента.
 * @param {unknown} rawAxes — x.axes из familyMetadataList
 */
export function slimGoogleMetadataAxes(rawAxes) {
  const axes = Array.isArray(rawAxes) ? rawAxes : [];
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
      tag: a.tag,
      min: a.min,
      max: a.max,
      defaultValue:
        typeof a.defaultValue === 'number' && Number.isFinite(a.defaultValue) ? a.defaultValue : a.min,
    }));
}

export function resolveGoogleMetadataItalicMode(rawAxes, rawFonts) {
  const axes = slimGoogleMetadataAxes(rawAxes);
  if (axes.some((axis) => axis?.tag === 'ital')) return 'axis-ital';
  if (axes.some((axis) => axis?.tag === 'slnt')) return 'axis-slnt';
  const fontsObj = rawFonts && typeof rawFonts === 'object' && !Array.isArray(rawFonts) ? rawFonts : {};
  const hasItalicStyles = Object.keys(fontsObj).some((k) => /^\d+i$/.test(k));
  if (hasItalicStyles) return 'separate-style';
  return 'none';
}
