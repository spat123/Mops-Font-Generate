const RU_TO_LAT_MAP = {
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

function stripDiacritics(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeSearchText(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’'`"]/g, '')
    .replace(/[^a-z0-9а-я\s_-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function transliterateRuToLat(value) {
  return normalizeSearchText(value)
    .split('')
    .map((char) => RU_TO_LAT_MAP[char] ?? char)
    .join('');
}

function compactSearchText(value) {
  return String(value || '').replace(/[\s_-]+/g, '');
}

export function buildSearchVariants(value) {
  const normalized = normalizeSearchText(value);
  const transliterated = transliterateRuToLat(value);
  return [...new Set([
    normalized,
    compactSearchText(normalized),
    transliterated,
    compactSearchText(transliterated),
  ].filter(Boolean))];
}

export function matchesSearch(candidate, query) {
  const queryVariants = buildSearchVariants(query);
  if (queryVariants.length === 0) return true;

  const candidateValues = Array.isArray(candidate) ? candidate : [candidate];
  const candidateVariants = candidateValues.flatMap((value) => buildSearchVariants(value));

  return queryVariants.some((q) => candidateVariants.some((item) => item.includes(q)));
}

function familyVariantMatchesQueryVariant(fn, fc, queryNorm, queryCompact) {
  if (!fn || !queryNorm) return false;
  if (fn === queryNorm || fc === queryCompact) return true;
  if (fn.startsWith(queryNorm) || fc.startsWith(queryCompact)) return true;
  const words = fn.split(/\s+/).filter(Boolean);
  return words.some((w) => {
    const wc = compactSearchText(w);
    return w.startsWith(queryNorm) || wc.startsWith(queryCompact) || w === queryNorm;
  });
}

/** Имя семейства: по словам + транслит (робото → Roboto). */
function catalogFamilyMatchesSearch(family, query) {
  const queryVariants = buildSearchVariants(query);
  if (queryVariants.length === 0) return true;

  const familyVariants = buildSearchVariants(family);
  for (const qv of queryVariants) {
    const queryNorm = normalizeSearchText(qv);
    const queryCompact = compactSearchText(qv);
    for (const fv of familyVariants) {
      const fn = normalizeSearchText(fv);
      const fc = compactSearchText(fn);
      if (familyVariantMatchesQueryVariant(fn, fc, queryNorm, queryCompact)) return true;
    }
  }
  return false;
}

function matchesSearchLooseMetadata(text, query) {
  return matchesSearch(text, query);
}

/**
 * Поиск в каталоге: имя семейства — по словам (без ложных «agu» в Le**agu**e).
 * Остальные поля (категория, subsets) — обычный подстрочный поиск.
 * @param {string|string[]} candidate — getSearchTokens(): [family, ...meta]
 */
export function matchesCatalogFontSearch(candidate, query) {
  const parts = (Array.isArray(candidate) ? candidate : [candidate]).map((v) => String(v || ''));
  const family = parts[0] || '';
  const queryNorm = normalizeSearchText(query);
  if (!queryNorm) return true;

  if (catalogFamilyMatchesSearch(family, query)) return true;
  for (let i = 1; i < parts.length; i += 1) {
    if (matchesSearchLooseMetadata(parts[i], query)) return true;
  }
  return false;
}

/**
 * Релевантность для сортировки результатов поиска в каталоге (больше = выше).
 */
export function scoreCatalogFontSearch(candidate, query) {
  const parts = (Array.isArray(candidate) ? candidate : [candidate]).map((v) => String(v || ''));
  const family = parts[0] || '';
  const queryNorm = normalizeSearchText(query);
  if (!queryNorm) return 0;

  let score = 0;
  const queryVariants = buildSearchVariants(query);
  const familyVariants = buildSearchVariants(family);
  for (const qv of queryVariants) {
    const qn = normalizeSearchText(qv);
    const qc = compactSearchText(qv);
    for (const fv of familyVariants) {
      const fn = normalizeSearchText(fv);
      const fc = compactSearchText(fn);
      if (fn === qn || fc === qc) score = Math.max(score, 1000);
      else if (fn.startsWith(qn) || fc.startsWith(qc)) score = Math.max(score, 900);
      else if (familyVariantMatchesQueryVariant(fn, fc, qn, qc)) score = Math.max(score, 800);
    }
  }

  for (let i = 1; i < parts.length; i += 1) {
    if (matchesSearchLooseMetadata(parts[i], query)) score = Math.max(score, 200);
  }
  return score;
}
