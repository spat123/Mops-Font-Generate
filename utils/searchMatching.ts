const RU_TO_LAT_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function stripDiacritics(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeSearchText(value: unknown): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’'`"]/g, '')
    .replace(/[^a-z0-9а-я\s_-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function transliterateRuToLat(value: unknown): string {
  return normalizeSearchText(value)
    .split('')
    .map((char) => RU_TO_LAT_MAP[char] ?? char)
    .join('');
}

function compactSearchText(value: unknown): string {
  return String(value || '').replace(/[\s_-]+/g, '');
}

export function buildSearchVariants(value: unknown): string[] {
  const normalized = normalizeSearchText(value);
  const transliterated = transliterateRuToLat(value);
  return [
    ...new Set(
      [normalized, compactSearchText(normalized), transliterated, compactSearchText(transliterated)].filter(
        Boolean,
      ),
    ),
  ];
}

export type PreparedCatalogSearchQuery = {
  empty: boolean;
  queryNorm: string;
  queryVariants?: string[];
  preparedVariants: Array<{ norm: string; compact: string }>;
  looseNeedles: string[];
};

/** Предрасчёт вариантов запроса — один раз на фильтрацию / keystroke (debounced). */
export function prepareCatalogSearchQuery(query: unknown): PreparedCatalogSearchQuery {
  const queryNorm = normalizeSearchText(query);
  if (!queryNorm) {
    return { empty: true, queryNorm: '', preparedVariants: [], looseNeedles: [] };
  }
  const queryVariants = buildSearchVariants(query);
  const preparedVariants = queryVariants.map((qv) => ({
    norm: normalizeSearchText(qv),
    compact: compactSearchText(qv),
  }));
  const looseNeedles = [
    ...new Set(preparedVariants.flatMap(({ norm, compact }) => [norm, compact].filter(Boolean))),
  ];
  return { empty: false, queryNorm, queryVariants, preparedVariants, looseNeedles };
}

export function matchesSearch(candidate: unknown, query: unknown): boolean {
  const prepared = prepareCatalogSearchQuery(query);
  if (prepared.empty) return true;

  const candidateValues = Array.isArray(candidate) ? candidate : [candidate];
  const candidateVariants = candidateValues.flatMap((value) => buildSearchVariants(value));

  return prepared.looseNeedles.some((q) => candidateVariants.some((item) => item.includes(q)));
}

function familyVariantMatchesQueryVariant(
  fn: string,
  fc: string,
  queryNorm: string,
  queryCompact: string,
): boolean {
  if (!fn || !queryNorm) return false;
  if (fn === queryNorm || fc === queryCompact) return true;
  if (fn.startsWith(queryNorm) || fc.startsWith(queryCompact)) return true;
  const words = fn.split(/\s+/).filter(Boolean);
  return words.some((w) => {
    const wc = compactSearchText(w);
    return w.startsWith(queryNorm) || wc.startsWith(queryCompact) || w === queryNorm;
  });
}

function catalogFamilyMatchesSearchPrepared(
  family: string,
  prepared: PreparedCatalogSearchQuery,
  familyVariants: string[] | null = null,
): boolean {
  if (prepared.empty) return true;

  const variants = familyVariants ?? buildSearchVariants(family);
  for (const qv of prepared.preparedVariants) {
    for (const fv of variants) {
      const fn = normalizeSearchText(fv);
      const fc = compactSearchText(fn);
      if (familyVariantMatchesQueryVariant(fn, fc, qv.norm, qv.compact)) return true;
    }
  }
  return false;
}

function metadataMatchesLoose(text: unknown, looseNeedles: string[]): boolean {
  if (!text || !Array.isArray(looseNeedles) || looseNeedles.length === 0) return false;
  const normalized = normalizeSearchText(text);
  const compact = compactSearchText(normalized);
  const latin = compactSearchText(transliterateRuToLat(text));
  for (const needle of looseNeedles) {
    if (!needle) continue;
    if (normalized.includes(needle) || compact.includes(needle) || latin.includes(needle)) {
      return true;
    }
  }
  return false;
}

/**
 * Поиск в каталоге: имя семейства — по словам (без ложных «agu» в Le**agu**e).
 * Остальные поля (категория, subsets) — обычный подстрочный поиск.
 */
export function matchesCatalogFontSearch(
  candidate: unknown,
  query: unknown,
  prepared: PreparedCatalogSearchQuery | null = null,
  familyVariants: string[] | null = null,
): boolean {
  const parts = (Array.isArray(candidate) ? candidate : [candidate]).map((v) => String(v || ''));
  const family = parts[0] || '';
  const prep = prepared ?? prepareCatalogSearchQuery(query);
  if (prep.empty) return true;

  if (catalogFamilyMatchesSearchPrepared(family, prep, familyVariants)) return true;
  for (let i = 1; i < parts.length; i += 1) {
    if (metadataMatchesLoose(parts[i], prep.looseNeedles)) return true;
  }
  return false;
}

/**
 * Релевантность для сортировки результатов поиска в каталоге (больше = выше).
 */
export function scoreCatalogFontSearch(
  candidate: unknown,
  query: unknown,
  prepared: PreparedCatalogSearchQuery | null = null,
  familyVariants: string[] | null = null,
): number {
  const parts = (Array.isArray(candidate) ? candidate : [candidate]).map((v) => String(v || ''));
  const family = parts[0] || '';
  const prep = prepared ?? prepareCatalogSearchQuery(query);
  if (prep.empty) return 0;

  let score = 0;
  const variants = familyVariants ?? buildSearchVariants(family);
  for (const qv of prep.preparedVariants) {
    for (const fv of variants) {
      const fn = normalizeSearchText(fv);
      const fc = compactSearchText(fn);
      if (fn === qv.norm || fc === qv.compact) score = Math.max(score, 1000);
      else if (fn.startsWith(qv.norm) || fc.startsWith(qv.compact)) score = Math.max(score, 900);
      else if (familyVariantMatchesQueryVariant(fn, fc, qv.norm, qv.compact)) score = Math.max(score, 800);
    }
  }

  for (let i = 1; i < parts.length; i += 1) {
    if (metadataMatchesLoose(parts[i], prep.looseNeedles)) score = Math.max(score, 200);
  }
  return score;
}
