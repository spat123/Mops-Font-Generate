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

function catalogFamilyMatchesSearch(family, queryNorm, queryCompact) {
  const fn = normalizeSearchText(family);
  const fc = compactSearchText(fn);
  if (!fn || !queryNorm) return false;
  if (fn === queryNorm || fc === queryCompact) return true;
  if (fn.startsWith(queryNorm)) return true;
  if (fc.startsWith(queryCompact)) return true;
  const words = fn.split(/\s+/).filter(Boolean);
  return words.some((w) => {
    const wc = compactSearchText(w);
    return w.startsWith(queryNorm) || wc.startsWith(queryCompact) || w === queryNorm;
  });
}

function matchesSearchLooseMetadata(text, queryNorm) {
  const n = normalizeSearchText(text);
  return Boolean(n && queryNorm && n.includes(queryNorm));
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
  const queryCompact = compactSearchText(queryNorm);

  if (catalogFamilyMatchesSearch(family, queryNorm, queryCompact)) return true;
  for (let i = 1; i < parts.length; i += 1) {
    if (matchesSearchLooseMetadata(parts[i], queryNorm)) return true;
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
  const queryCompact = compactSearchText(queryNorm);
  const fn = normalizeSearchText(family);
  const fc = compactSearchText(fn);

  let score = 0;
  if (fn === queryNorm || fc === queryCompact) score = Math.max(score, 1000);
  else if (fn.startsWith(queryNorm) || fc.startsWith(queryCompact)) score = Math.max(score, 900);
  else if (catalogFamilyMatchesSearch(family, queryNorm, queryCompact)) score = Math.max(score, 800);

  for (let i = 1; i < parts.length; i += 1) {
    if (matchesSearchLooseMetadata(parts[i], queryNorm)) score = Math.max(score, 200);
  }
  return score;
}
