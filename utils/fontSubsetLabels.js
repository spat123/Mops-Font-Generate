const SUBSET_LABELS_RU = {
  latin: 'Латиница',
  'latin-ext': 'Латиница расширенная',
  cyrillic: 'Кириллица',
  'cyrillic-ext': 'Кириллица расширенная',
  greek: 'Греческий',
  'greek-ext': 'Греческий расширенный',
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
const SUBSET_TOKEN_LABELS_RU = {
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

function normalizeSubsetKey(code) {
  return String(code || '')
    .trim()
    .toLowerCase();
}

function titleCaseWords(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function transliterateLatinWordToRu(word) {
  const normalized = String(word || '').toLowerCase();
  if (!normalized) return '';
  if (!transliterateLatinWordToRu._cache) transliterateLatinWordToRu._cache = new Map();
  const cached = transliterateLatinWordToRu._cache.get(normalized);
  if (cached) return cached;

  const digraphs = [
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
  const letters = {
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
  transliterateLatinWordToRu._cache.set(normalized, result);
  return result;
}

function formatFallbackSubsetLabel(normalized) {
  const tokens = normalized.split('-').filter(Boolean);
  return titleCaseWords(
    tokens
      .map((token) => SUBSET_TOKEN_LABELS_RU[token] || transliterateLatinWordToRu(token))
      .join(' '),
  );
}

export function getFontSubsetLabelRu(code) {
  const normalized = normalizeSubsetKey(code);
  if (!normalized) return '';
  if (!getFontSubsetLabelRu._cache) getFontSubsetLabelRu._cache = new Map();
  const cached = getFontSubsetLabelRu._cache.get(normalized);
  if (cached) return cached;
  const mapped = SUBSET_LABELS_RU[normalized];
  const resolved = mapped || formatFallbackSubsetLabel(normalized);
  getFontSubsetLabelRu._cache.set(normalized, resolved);
  return resolved;
}

export function getFontSubsetOptionLabelRu(code) {
  const normalized = normalizeSubsetKey(code);
  if (!normalized) return '';
  return getFontSubsetLabelRu(normalized);
}

function compareSubsetLabelsRu(a, b) {
  return getFontSubsetLabelRu(a).localeCompare(getFontSubsetLabelRu(b), 'ru', {
    sensitivity: 'base',
  });
}

function createSubsetOption(code) {
  const normalized = normalizeSubsetKey(code);
  if (!normalized) return null;
  if (!createSubsetOption._cache) createSubsetOption._cache = new Map();
  const cached = createSubsetOption._cache.get(normalized);
  if (cached) return cached;
  const label = getFontSubsetOptionLabelRu(normalized);
  const option = {
    value: normalized,
    label,
    triggerLabel: getFontSubsetLabelRu(normalized),
    searchText: `${normalized} ${label}`,
  };
  createSubsetOption._cache.set(normalized, option);
  return option;
}

export function buildGroupedFontSubsetOptions(values, selectedValues = [], opts = {}) {
  const includeSelectedSection = opts?.includeSelectedSection !== false;
  const normalizedValues = Array.from(
    new Set((Array.isArray(values) ? values : []).map(normalizeSubsetKey).filter(Boolean)),
  );
  const availableSet = new Set(normalizedValues);
  const selectedNormalized = Array.from(
    new Set((Array.isArray(selectedValues) ? selectedValues : []).map(normalizeSubsetKey).filter(Boolean)),
  ).filter((value) => availableSet.has(value));
  const selectedSet = new Set(selectedNormalized);

  const selectedOptions = selectedNormalized.map(createSubsetOption).filter(Boolean);
  const popularOptions = POPULAR_FONT_SUBSET_KEYS
    .filter((value) => availableSet.has(value) && (includeSelectedSection ? !selectedSet.has(value) : true))
    .map(createSubsetOption)
    .filter(Boolean);
  const otherOptions = normalizedValues
    .filter((value) =>
      includeSelectedSection
        ? !selectedSet.has(value) && !POPULAR_FONT_SUBSET_KEYS.includes(value)
        : !POPULAR_FONT_SUBSET_KEYS.includes(value),
    )
    .sort(compareSubsetLabelsRu)
    .map(createSubsetOption)
    .filter(Boolean);

  const grouped = [];
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
