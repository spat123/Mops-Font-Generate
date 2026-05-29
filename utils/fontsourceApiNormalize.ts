import { titleCaseFromKebabSlug } from './fontSlug';

export function parseFontsourceWeightNumbers(row: Record<string, unknown> | null | undefined): number[] {
  if (!row || typeof row !== 'object') return [];
  return Array.isArray(row.weights)
    ? row.weights.map((v) => Number(v)).filter((v) => Number.isFinite(v))
    : [];
}

export function parseFontsourceStyleStrings(row: Record<string, unknown> | null | undefined): string[] {
  if (!row || typeof row !== 'object') return [];
  return Array.isArray(row.styles)
    ? row.styles.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean)
    : [];
}

export function parseFontsourceSubsetStrings(row: Record<string, unknown> | null | undefined): string[] {
  if (!row || typeof row !== 'object') return [];
  return Array.isArray(row.subsets)
    ? row.subsets.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
}

export type FontsourceVariableAxisMeta = {
  min: number;
  max: number;
  default: number;
  step: number;
};

export type FontsourceHandlerMetadata = {
  id: string;
  family: string;
  category: string;
  subsets: string[];
  weights: string[];
  styles: string[];
  variable: boolean;
  source: string;
};

export function getFontsourceMetadataPayload(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') return {};
  const row = metadata as Record<string, unknown>;
  if (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)) {
    return row.metadata as Record<string, unknown>;
  }
  return row;
}

export function parseFontsourceVariableAxesFromMeta(
  variableMeta: unknown,
): Record<string, FontsourceVariableAxisMeta> {
  if (!variableMeta || typeof variableMeta !== 'object' || Array.isArray(variableMeta)) {
    return {};
  }
  const pickNumber = (row: Record<string, unknown>, keys: string[]): number => {
    for (const k of keys) {
      const n = Number(row[k]);
      if (Number.isFinite(n)) return n;
    }
    return NaN;
  };
  return Object.entries(variableMeta as Record<string, unknown>).reduce<
    Record<string, FontsourceVariableAxisMeta>
  >((acc, [axisTag, axisValue]) => {
    if (!axisValue || typeof axisValue !== 'object' || Array.isArray(axisValue)) return acc;
    const axisRow = axisValue as Record<string, unknown>;
    const min = pickNumber(axisRow, ['min', 'minimum']);
    const max = pickNumber(axisRow, ['max', 'maximum']);
    const def = pickNumber(axisRow, ['default', 'defaultValue', 'default_value', 'default-value']);
    const step = pickNumber(axisRow, ['step', 'increment']);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return acc;
    const guessedDefault =
      axisTag === 'wght' && min <= 400 && max >= 400
        ? 400
        : axisTag === 'ital'
          ? 0
          : axisTag === 'slnt' && min <= 0 && max >= 0
            ? 0
            : min;
    acc[axisTag] = {
      min,
      max,
      default: Number.isFinite(def) ? def : guessedDefault,
      step: Number.isFinite(step) ? step : 1,
    };
    return acc;
  }, {});
}

const FONTSOURCE_VARIABLE_METADATA_CDN_URL = (slug: string) =>
  `https://cdn.jsdelivr.net/npm/@fontsource-variable/${encodeURIComponent(slug)}/metadata.json`;

/** Полные оси VF из CDN (@fontsource-variable), если API/meta отдали только `variable: true`. */
export async function fetchFontsourceVariablePackageMetadata(
  slug: string,
): Promise<Record<string, unknown> | null> {
  const key = String(slug || '').trim();
  if (!key) return null;
  try {
    const response = await fetch(FONTSOURCE_VARIABLE_METADATA_CDN_URL(key));
    if (!response.ok) return null;
    const row = await response.json();
    if (!row || typeof row !== 'object') return null;
    const variable = (row as Record<string, unknown>).variable;
    if (!variable || typeof variable !== 'object' || Array.isArray(variable)) return null;
    return row as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function resolveFontsourceItalicMode(
  parsedVariableAxes: Record<string, FontsourceVariableAxisMeta>,
  hasItalicStyles: boolean,
): 'axis-ital' | 'axis-slnt' | 'separate-style' | 'none' {
  if (parsedVariableAxes.ital) return 'axis-ital';
  if (parsedVariableAxes.slnt) return 'axis-slnt';
  if (hasItalicStyles) return 'separate-style';
  return 'none';
}

export function buildFontsourceHandlerMetadata(
  row: Record<string, unknown>,
  slug: string,
  source: string,
  options: { coerceVariableToBoolean?: boolean } = {},
): FontsourceHandlerMetadata {
  const normalizedWeights = parseFontsourceWeightNumbers(row).map((n) => String(n));
  const normalizedStyles = parseFontsourceStyleStrings(row);
  const normalizedSubsets = parseFontsourceSubsetStrings(row);
  const stylesOut = normalizedStyles.length > 0 ? normalizedStyles : ['normal'];
  const variable = options.coerceVariableToBoolean ? Boolean(row.variable) : Boolean(row.variable ?? false);

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
