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
