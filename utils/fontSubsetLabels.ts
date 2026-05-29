const SUBSET_LABELS_RU: Record<string, string> = {
  latin: 'Латиница',
  'latin-ext': 'Латиница расшир.',
  cyrillic: 'Кириллица',
  'cyrillic-ext': 'Кириллица расшир.',
  greek: 'Греческий',
  'greek-ext': 'Греческий расшир.',
  hebrew: 'Иврит',
  arabic: 'Арабский',
  vietnamese: 'Вьетнамский',
  devanagari: 'Деванагари',
  thai: 'Тайский',
  tamil: 'Тамильский',
  bengali: 'Бенгальский',
  gujarati: 'Гуджарати',
  gurmukhi: 'Гурмукхи',
  kannada: 'Каннада',
  malayalam: 'Малайялам',
  oriya: 'Ория',
  telugu: 'Телугу',
  sinhala: 'Сингальский',
  khmer: 'Кхмерский',
  lao: 'Лаосский',
  myanmar: 'Мьянма',
  tibetan: 'Тибетский',
  ethiopic: 'Эфиопский',
  georgian: 'Грузинский',
  armenian: 'Армянский',
  cherokee: 'Чероки',
  math: 'Математика',
  symbols: 'Символы',
  chakma: 'Чакма',
  javanese: 'Яванский',
  'ol-chiki': 'Ол-чики',
  'tai-tham': 'Тай Тхам',
  cjk: 'Китайский, японский, корейский',
  japanese: 'Японский',
  korean: 'Корейский',
  chinese: 'Китайский',
  'chinese-simplified': 'Китайский упрощенный',
  'chinese-traditional': 'Китайский традиционный',
  menu: 'Меню',
};

const POPULAR_FONT_SUBSET_KEYS = ['latin', 'cyrillic', 'greek'];
const SUBSET_TOKEN_LABELS_RU: Record<string, string> = {
  ext: 'расширенная',
  old: 'древний',
  north: 'северный',
  south: 'южный',
  traditional: 'традиционный',
  simplified: 'упрощенный',
  imperial: 'имперский',
  inscriptional: 'эпиграфический',
  linear: 'линейный',
  hieroglyphs: 'иероглифы',
  hieroglyph: 'иероглифы',
  canadian: 'канадский',
  aboriginal: 'аборигенный',
  new: 'новый',
  tai: 'тай',
  square: 'квадратный',
  braille: 'Брайль',
  arabian: 'аравийский',
  persian: 'персидский',
  aramaic: 'арамейский',
  pahlavi: 'пехлеви',
  parthian: 'парфянский',
  rohingya: 'рохинджа',
  hmong: 'хмонг',
  mongolian: 'монгольский',
  syriac: 'сирийский',
  coptic: 'коптский',
  cuneiform: 'клинопись',
  cypriot: 'кипрский',
  runic: 'рунический',
  phoenician: 'финикийский',
  samaritan: 'самаритянский',
  sundanese: 'сунданский',
  ugaritic: 'угаритский',
  georgian: 'грузинский',
  armenian: 'армянский',
  chinese: 'китайский',
  japanese: 'японский',
  korean: 'корейский',
};

const transliterateLatinWordCache = new Map<string, string>();
const getFontSubsetLabelRuCache = new Map<string, string>();
const createSubsetOptionCache = new Map<string, FontSubsetSelectOption>();

function normalizeSubsetKey(code: unknown): string {
  return String(code || '')
    .trim()
    .toLowerCase();
}

function titleCaseWords(text: unknown): string {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function transliterateLatinWordToRu(word: unknown): string {
  const normalized = String(word || '').toLowerCase();
  if (!normalized) return '';
  const cached = transliterateLatinWordCache.get(normalized);
  if (cached) return cached;

  const digraphs: Array<[string, string]> = [
    ['shch', 'щ'],
    ['sch', 'щ'],
    ['yo', 'ё'],
    ['yu', 'ю'],
    ['ya', 'я'],
    ['ye', 'е'],
    ['zh', 'ж'],
    ['kh', 'х'],
    ['ts', 'ц'],
    ['ch', 'ч'],
    ['sh', 'ш'],
    ['th', 'т'],
    ['ph', 'ф'],
    ['qu', 'кв'],
    ['ck', 'к'],
    ['ng', 'нг'],
  ];
  const letters: Record<string, string> = {
    a: 'а',
    b: 'б',
    c: 'к',
    d: 'д',
    e: 'е',
    f: 'ф',
    g: 'г',
    h: 'х',
    i: 'и',
    j: 'дж',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    q: 'к',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'у',
    v: 'в',
    w: 'в',
    x: 'кс',
    y: 'й',
    z: 'з',
  };

  let source = normalized;
  let result = '';
  while (source.length > 0) {
    const matchedDigraph = digraphs.find(([latin]) => source.startsWith(latin));
    if (matchedDigraph) {
      result += matchedDigraph[1];
      source = source.slice(matchedDigraph[0].length);
      continue;
    }
    const char = source[0];
    result += letters[char] || char;
    source = source.slice(1);
  }
  transliterateLatinWordCache.set(normalized, result);
  return result;
}

function formatFallbackSubsetLabel(normalized: string): string {
  const tokens = normalized.split('-').filter(Boolean);
  return titleCaseWords(
    tokens
      .map((token) => SUBSET_TOKEN_LABELS_RU[token] || transliterateLatinWordToRu(token))
      .join(' '),
  );
}

export function getFontSubsetLabelRu(code: unknown): string {
  const normalized = normalizeSubsetKey(code);
  if (!normalized) return '';
  const cached = getFontSubsetLabelRuCache.get(normalized);
  if (cached) return cached;
  const mapped = SUBSET_LABELS_RU[normalized];
  const resolved = mapped || formatFallbackSubsetLabel(normalized);
  getFontSubsetLabelRuCache.set(normalized, resolved);
  return resolved;
}

export function getFontSubsetOptionLabelRu(code: unknown): string {
  const normalized = normalizeSubsetKey(code);
  if (!normalized) return '';
  return getFontSubsetLabelRu(normalized);
}

function compareSubsetLabelsRu(a: string, b: string): number {
  return getFontSubsetLabelRu(a).localeCompare(getFontSubsetLabelRu(b), 'ru', {
    sensitivity: 'base',
  });
}

export type FontSubsetSelectOption = {
  value: string;
  label: string;
  triggerLabel: string;
  searchText: string;
  rightLabel?: string;
};

export type FontSubsetGroupedOption =
  | { kind: 'section'; key: string; label: string }
  | FontSubsetSelectOption;

function createSubsetOption(
  code: unknown,
  subsetCounts: Map<string, number> | null = null,
): FontSubsetSelectOption | null {
  const normalized = normalizeSubsetKey(code);
  if (!normalized) return null;
  const hasCounts = subsetCounts instanceof Map;
  if (!hasCounts) {
    const cached = createSubsetOptionCache.get(normalized);
    if (cached) return cached;
  }
  const label = getFontSubsetOptionLabelRu(normalized);
  const count = hasCounts ? subsetCounts.get(normalized) : null;
  const option: FontSubsetSelectOption = {
    value: normalized,
    label,
    triggerLabel: getFontSubsetLabelRu(normalized),
    searchText: `${normalized} ${label}`,
    ...(Number.isFinite(count) && count! > 0 ? { rightLabel: String(count) } : {}),
  };
  if (!hasCounts) {
    createSubsetOptionCache.set(normalized, option);
  }
  return option;
}

export type BuildGroupedFontSubsetOptionsParams = {
  includeSelectedSection?: boolean;
  subsetCounts?: Map<string, number>;
};

export function buildGroupedFontSubsetOptions(
  values: unknown[],
  selectedValues: unknown[] = [],
  opts: BuildGroupedFontSubsetOptionsParams = {},
): FontSubsetGroupedOption[] {
  const includeSelectedSection = opts?.includeSelectedSection !== false;
  const subsetCounts = opts?.subsetCounts instanceof Map ? opts.subsetCounts : null;
  const mapOption = (code: unknown) => createSubsetOption(code, subsetCounts);
  const normalizedValues = Array.from(
    new Set((Array.isArray(values) ? values : []).map(normalizeSubsetKey).filter(Boolean)),
  );
  const availableSet = new Set(normalizedValues);
  const selectedNormalized = Array.from(
    new Set((Array.isArray(selectedValues) ? selectedValues : []).map(normalizeSubsetKey).filter(Boolean)),
  ).filter((value) => availableSet.has(value));
  const selectedSet = new Set(selectedNormalized);

  const selectedOptions = selectedNormalized.map(mapOption).filter((o): o is FontSubsetSelectOption => o != null);
  const popularOptions = POPULAR_FONT_SUBSET_KEYS.filter(
    (value) => availableSet.has(value) && (includeSelectedSection ? !selectedSet.has(value) : true),
  )
    .map(mapOption)
    .filter((o): o is FontSubsetSelectOption => o != null);
  const otherOptions = normalizedValues
    .filter((value) =>
      includeSelectedSection
        ? !selectedSet.has(value) && !POPULAR_FONT_SUBSET_KEYS.includes(value)
        : !POPULAR_FONT_SUBSET_KEYS.includes(value),
    )
    .sort(compareSubsetLabelsRu)
    .map(mapOption)
    .filter((o): o is FontSubsetSelectOption => o != null);

  const grouped: FontSubsetGroupedOption[] = [];
  if (includeSelectedSection && selectedOptions.length > 0) {
    grouped.push({ kind: 'section', key: 'selected', label: 'Выбрано' }, ...selectedOptions);
  }
  if (popularOptions.length > 0) {
    grouped.push({ kind: 'section', key: 'popular', label: 'Популярные' }, ...popularOptions);
  }
  if (otherOptions.length > 0) {
    grouped.push({ kind: 'section', key: 'other', label: 'Остальные' }, ...otherOptions);
  }
  return grouped;
}
