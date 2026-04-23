import { titleCaseFromKebabSlug } from './fontSlug';

export function parseFontsourceWeightNumbers(row) {
  if (!row || typeof row !== 'object') return [];
  return Array.isArray(row.weights)
    ? row.weights.map((v) => Number(v)).filter((v) => Number.isFinite(v))
    : [];
}

export function parseFontsourceStyleStrings(row) {
  if (!row || typeof row !== 'object') return [];
  return Array.isArray(row.styles)
    ? row.styles.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean)
    : [];
}

export function parseFontsourceSubsetStrings(row) {
  if (!row || typeof row !== 'object') return [];
  return Array.isArray(row.subsets)
    ? row.subsets.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
}

/**
 * @param {object} row — сырой объект metadata.json или API Fontsource
 * @param {string} slug
 * @param {string} source — метка `source` в ответе
 * @param {{ coerceVariableToBoolean?: boolean }} [options] — для REST API: только boolean
 */
export function buildFontsourceHandlerMetadata(row, slug, source, options = {}) {
  const normalizedWeights = parseFontsourceWeightNumbers(row).map((n) => String(n));
  const normalizedStyles = parseFontsourceStyleStrings(row);
  const normalizedSubsets = parseFontsourceSubsetStrings(row);
  const stylesOut = normalizedStyles.length > 0 ? normalizedStyles : ['normal'];
  const variable = options.coerceVariableToBoolean
    ? Boolean(row.variable)
    : row.variable ?? false;

  return {
    id: String(row.id || slug),
    family: String(row.family || titleCaseFromKebabSlug(slug)),
    category: String(row.category || ''),
    subsets: normalizedSubsets,
    weights: normalizedWeights,
    styles: stylesOut,
    variable,
    source,
  };
}
