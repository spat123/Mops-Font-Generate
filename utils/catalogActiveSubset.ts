import { getFontSubsetLabelRu } from './fontSubsetLabels';
import { parseFontsourceSubsetStrings } from './fontsourceApiNormalize';

function isRussianUiLocale(): boolean {
  if (typeof navigator === 'undefined') return false;
  const langs =
    Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
  return langs.some((lang) => String(lang || '').toLowerCase().startsWith('ru'));
}

/** Subset по умолчанию для превью (как на fontsource.com). */
export function resolveDefaultCatalogSubset(subsets: string[] | null | undefined): string {
  const list = (Array.isArray(subsets) ? subsets : [])
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(Boolean);
  // В редакторе дефолт должен быть латиница (если доступна), иначе UI/превью “прыгают”
  // между subset-ами и создаётся ощущение, что шрифт “тонкий/ломается”.
  if (list.includes('latin')) return 'latin';
  if (list.includes('cyrillic')) return 'cyrillic';
  return list[0] || 'latin';
}

export function normalizeCatalogSubsets(subsets: string[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(subsets) ? subsets : []) {
    const key = String(raw || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function buildCatalogSubsetSelectOptions(subsets: string[] | null | undefined) {
  return normalizeCatalogSubsets(subsets).map((value) => ({
    value,
    label: getFontSubsetLabelRu(value),
  }));
}

export function readCatalogSubsetsFromFont(
  font: { catalogSubsets?: unknown; subsets?: unknown; [key: string]: unknown } | null | undefined,
): string[] {
  if (!font) return [];
  const fromCatalog = normalizeCatalogSubsets(font.catalogSubsets as string[] | undefined);
  if (fromCatalog.length > 0) return fromCatalog;
  return normalizeCatalogSubsets(font.subsets as string[] | undefined);
}

export function parseCatalogSubsetsFromMetadata(
  row: Record<string, unknown> | null | undefined,
): string[] {
  const parsed = parseFontsourceSubsetStrings(row);
  return parsed.length > 0 ? parsed : ['latin'];
}
