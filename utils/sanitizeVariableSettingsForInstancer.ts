/** Тег оси fvar: 1–4 латинских символа (wght, wdth, ital…). */
export function isValidVariationAxisTag(tag: unknown): boolean {
  const t = String(tag ?? '').trim();
  if (!t || t.length > 4) return false;
  return /^[A-Za-z0-9]{1,4}$/.test(t);
}

/**
 * Оставляет только валидные теги и числовые значения для instantiateVariableFont.
 */
export function sanitizeVariableSettingsForInstancer(
  settings: Record<string, unknown> | null | undefined,
  knownAxes: Record<string, unknown> | null = null,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const allowed =
    knownAxes && typeof knownAxes === 'object'
      ? new Set(Object.keys(knownAxes).filter(isValidVariationAxisTag))
      : null;

  for (const [axis, value] of Object.entries(settings || {})) {
    const tag = String(axis ?? '').trim();
    if (!isValidVariationAxisTag(tag)) continue;
    if (allowed && !allowed.has(tag)) continue;
    if (value === null || value === undefined) continue;
    if (value === 'drop' || value === 'DROP') {
      out[tag] = null;
      continue;
    }
    const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
    if (Number.isFinite(n)) {
      out[tag] = n;
    }
  }
  return out;
}
