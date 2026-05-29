/**
 * Текст для &text= в CSS Google и образец в UI: латиница + короткие фразы по subset (иначе Google подрезает глифы).
 * Ключи — коды subset из metadata (нижний регистр).
 */
import { CATALOG_PREVIEW_PANGRAM_RU } from './catalogPreviewSample';
import { scriptUnicodeGlyphSample } from './scriptUnicodeSampleText';
import isoScriptToSubset from './googleIsoScriptToSubset.json';
import subsetPreviewSamplesRaw from '../data/subsetPreviewSamples.json';
import { getFontsourceSubsetUnicodeRange } from './fontsourceSubsetUnicodeRange';
import { filterStringByUnicodeRanges, parseUnicodeRangeList } from './unicodeRangeFilter';

export const LATIN_PREVIEW = 'AaBbCcDdEe';

/** Полная латиница + цифры для UI-образца (как пресет «Entire Font»), не для короткого text= Google. */
export const FULL_LATIN_ALPHANUM =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export type GoogleCatalogSampleEntry = {
  family?: string;
  subsets?: string[];
  primaryScript?: string;
};

const isoScriptMap = isoScriptToSubset as Record<string, string>;

/** Есть ли в каталоге не-латинские наборы (нужен отдельный образец и subset в CSS). */
export function hasNonLatinGoogleSubsets(entry: GoogleCatalogSampleEntry | null | undefined): boolean {
  const subs = Array.isArray(entry?.subsets) ? entry.subsets : [];
  return subs.some((raw) => {
    const s = String(raw || '').toLowerCase();
    return s && s !== 'menu' && s !== 'latin' && s !== 'latin-ext';
  });
}

function resolvePrimarySubsetKey(entry: GoogleCatalogSampleEntry | null | undefined): string | null {
  const ps = entry?.primaryScript;
  if (ps == null || String(ps).trim() === '') return null;
  const normalized = String(ps).trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized || normalized === 'latn') return null;
  const mapped = isoScriptMap[normalized] || isoScriptMap[normalized.slice(0, 4)] || null;
  if (!mapped) return null;
  const m = String(mapped).toLowerCase();
  const subs = Array.isArray(entry?.subsets)
    ? entry.subsets.map((s) => String(s || '').toLowerCase())
    : [];
  if (!subs.length || subs.includes(m)) return m;
  return null;
}

// Для некоторых сабсетов хотим показывать базовую латиницу + “надстройку”.
// Важно: для `cyrillic`/`greek` НЕ добавляем латиницу, иначе в Plain получается смешение алфавитов.
const LATIN_TYPOGRAPHY_EXTRAS = new Set(['latin-ext']);

const VIETNAMESE_ALPHABET_SAMPLE =
  'A Ă Â B C D Đ E Ê G H I K L M N O Ô Ơ P Q R S T U Ư V X Y\n' +
  'a ă â b c d đ e ê g h i k l m n o ô ơ p q r s t u ư v x y';

const SUBSET_SNIPPETS: Record<string, string> = {
  limbu: 'ᤜᤧᤰᤁᤩᤠᤱ ᤁᤢᤶᤔᤠᤱᤔᤡᤒᤠᤸᤗᤧ ᤛᤧᤴᤗᤠᤵᤋᤢ ᤀᤠᤔᤠᤀᤧ ᤁᤴ ᤌᤣᤔᤠ ᤛᤢᤶᤒᤠᤰᤏᤧᤒᤧ.',
  cyrillic:
    'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя',
  'cyrillic-ext': 'ЀЁЃѓҐґЇїЎў ѢѣѪѫ Ѳѳ Ѵѵ Ӂӂ Ӑӑ',
  greek: 'ΑαΒβΓγ',
  hebrew: 'אבגד',
  arabic: 'ابج',
  // Vietnamese: короткая фраза (без алфавита/цифр).
  vietnamese: VIETNAMESE_ALPHABET_SAMPLE,
  // CJK: чтобы при выборе сабсета не падать обратно в FULL_LATIN_ALPHANUM.
  japanese: 'あいうえお かきくけこ サシスセソ 漢字',
  korean: '가나다라마바사 아자차카타파하',
  chinese: '汉字 漢字 你好 世界',
  cjk: '汉字 漢字 あいうえお 가나다',
  thai: 'กขค',
  bengali: 'অআই',
  devanagari: 'अआइ',
  gujarati: 'અઆઇ',
  gurmukhi: 'ਅਆਇ',
  kannada: 'ಅಆಇ',
  malayalam: 'അആഇ',
  oriya: 'ଅଆଇ',
  telugu: 'అఆఇ',
  tamil: 'அஆஇ',
  sinhala: 'අආඇ',
  khmer: 'កខគ',
  lao: 'ກຂຄ',
  myanmar: 'ကခဂ',
  ethiopic: 'ሀሁሂ',
  georgian: 'აბგ',
  armenian: 'ԱԲԳ',
  cherokee: 'ᎠᎡᎢ',
  tibetan: 'ཀཁག',
  chakma:
    '𑄡𑄨𑄠𑄚𑄧𑄖𑄳𑄠𑄬 𑄟𑄚𑄬𑄭 𑄉𑄨𑄢𑄨𑄢𑄴 𑄝𑄬𑄇𑄴𑄅𑄚𑄧𑄖𑄳𑄠𑄴 𑄥𑄧𑄁 𑄃𑄮 𑄑𑄚𑄑𑄚𑄳𑄠𑄴 𑄝𑄚𑄝𑄚𑄳𑄠𑄴 𑄃𑄇𑄴𑄇𑄥𑄁𑄃𑄚𑄩',
  math: '∑∫√',
  symbols: '♠♣♥♦',
};

type SubsetPreviewBlock = { title?: string; text?: string };
type SubsetPreviewSamplesJson = Record<string, { blocks?: SubsetPreviewBlock[] }>;

const subsetPreviewSamples = subsetPreviewSamplesRaw as unknown as SubsetPreviewSamplesJson;

const SUBSET_COMMON_EXTRAS_ALLOWLIST = new Set(['latin', 'latin-ext']);

export type EditorSidebarSampleKey = 'title' | 'paragraph' | 'wikipedia' | 'pangram';
export type EditorSidebarGlyphKey = 'macos' | 'windows1252' | 'latin_extended' | 'latin_supplement';

const SAMPLE_KEY_TO_BLOCK_TITLE: Record<EditorSidebarSampleKey, string> = {
  title: 'Заголовок',
  paragraph: 'Параграф',
  wikipedia: 'Вики',
  pangram: 'Панграмма',
};

const GLYPH_KEY_TO_BLOCK_TITLE: Record<EditorSidebarGlyphKey, string> = {
  macos: 'Mac OS',
  windows1252: 'Windows',
  latin_extended: 'Latin Ext. A',
  latin_supplement: 'Latin-1 Supplement',
};

function findSubsetBlockText(
  subset: string,
  blockTitle: string,
  options: { includeCommon?: boolean } = {},
): string | null {
  const key = String(subset || '').trim().toLowerCase();
  const title = String(blockTitle || '').trim();
  if (!key || !title) return null;
  const blocksList: Array<unknown> = [];
  const ownBlocks = subsetPreviewSamples?.[key]?.blocks;
  if (Array.isArray(ownBlocks)) blocksList.push(...ownBlocks);
  if (options.includeCommon) {
    const commonBlocks = subsetPreviewSamples?._common?.blocks;
    if (Array.isArray(commonBlocks)) blocksList.push(...commonBlocks);
  }
  for (const b of blocksList) {
    if (!b || typeof b !== 'object') continue;
    const t = typeof (b as { title?: unknown }).title === 'string' ? String((b as any).title).trim() : '';
    if (t.toLowerCase() !== title.toLowerCase()) continue;
    const text = typeof (b as { text?: unknown }).text === 'string' ? String((b as any).text).trim() : '';
    return text || null;
  }
  return null;
}

function filterToFontsourceSubset(text: string, subset: string): string {
  // `vietnamese` в Fontsource часто хранит "надстройку" над латиницей.
  // Если фильтровать только по unicode-range vietnamese, базовые латинские буквы исчезают,
  // и остаются одни диакритики (выглядит как "ế ệ ...").
  // В редакторе мы всё равно грузим latin + vietnamese, поэтому возвращаем текст целиком.
  if (String(subset || '').trim().toLowerCase() === 'vietnamese') {
    return String(text || '');
  }
  const ur = getFontsourceSubsetUnicodeRange(subset);
  const ranges = parseUnicodeRangeList(ur);
  const filtered = filterStringByUnicodeRanges(text, ranges);
  return filtered || '';
}

/** Текст для быстрых пресетов слева: только текст, без “Заголовок\n…”. */
export function resolveEditorSidebarSampleText(subset: string, key: EditorSidebarSampleKey): string | null {
  const blockTitle = SAMPLE_KEY_TO_BLOCK_TITLE[key];
  const text = findSubsetBlockText(subset, blockTitle);
  if (text) {
    const filtered = filterToFontsourceSubset(text, subset);
    if (filtered) return filtered;
  }
  // Если нет подходящего образца или после фильтрации всё пусто — покажем глифы сабсета.
  return buildEditorSubsetGlyphPreviewText(subset);
}

/** Текст для быстрых “наборов символов” (Mac/Windows/Latin Ext/Latin-1). */
export function resolveEditorSidebarGlyphText(subset: string, key: EditorSidebarGlyphKey): string | null {
  const blockTitle = GLYPH_KEY_TO_BLOCK_TITLE[key];
  const text = findSubsetBlockText(subset, blockTitle, { includeCommon: true });
  if (text) {
    const filtered = filterToFontsourceSubset(text, subset);
    if (filtered) return filtered;
  }
  // Если, например, в `cyrillic` нет символов из Windows-1252 — покажем глифовый набор сабсета.
  return buildEditorSubsetGlyphPreviewText(subset);
}

/** Глифовый дефолт для сабсета (когда исходный текст был ASCII). */
export function buildEditorSubsetGlyphPreviewText(subset: string): string {
  const key = String(subset || '').trim().toLowerCase();
  if (!key) return FULL_LATIN_ALPHANUM;
  if (key === 'vietnamese') return VIETNAMESE_ALPHABET_SAMPLE;
  const jsonGlyphs =
    findSubsetBlockText(key, 'Glyphs') ||
    findSubsetBlockText(key, 'Набор букв') ||
    findSubsetBlockText(key, '常用字样本');
  const body = jsonGlyphs || nativeScriptGlyphBody(key);
  if (!body) return FULL_LATIN_ALPHANUM;
  const filtered = filterToFontsourceSubset(body, key);
  const out = filtered || body;
  // Для “надстроечных” сабсетов (latin-ext/vietnamese/кириллица/греческий)
  // хотим видеть базовую латиницу + спецсимволы сабсета.
  if (LATIN_TYPOGRAPHY_EXTRAS.has(key)) {
    const tail = String(out || '').trim();
    return tail ? `${FULL_LATIN_ALPHANUM} ${tail}` : FULL_LATIN_ALPHANUM;
  }
  return out;
}

function formatSubsetPreviewBlocks(blocks: SubsetPreviewBlock[]): string {
  const out: string[] = [];
  for (const block of blocks || []) {
    if (!block) continue;
    const title = typeof block.title === 'string' ? block.title.trim() : '';
    const text = typeof block.text === 'string' ? block.text.trim() : '';
    if (!text) continue;
    out.push(title ? `${title}\n${text}` : text);
  }
  return out.join('\n\n');
}

function buildSubsetPreviewFromJson(key: string): string | null {
  const commonBlocks = SUBSET_COMMON_EXTRAS_ALLOWLIST.has(key) ? subsetPreviewSamples?._common?.blocks : null;
  const entryBlocks = subsetPreviewSamples?.[key]?.blocks;
  const blocks = [
    ...(Array.isArray(entryBlocks) ? entryBlocks : []),
    ...(Array.isArray(commonBlocks) ? commonBlocks : []),
  ];
  const formatted = formatSubsetPreviewBlocks(blocks);
  return formatted.trim() ? formatted : null;
}

function nativeScriptGlyphBody(key: string): string {
  const block = scriptUnicodeGlyphSample(key);
  if (block.length) return block;
  return SUBSET_SNIPPETS[key] || '';
}

/** Строка для параметра text= в превью Google CSS и для поля googleFontRecommendedSample. */
export function buildGoogleFontPreviewText(entry: GoogleCatalogSampleEntry | null | undefined): string {
  const subs = Array.isArray(entry?.subsets) ? entry.subsets : [];
  const parts = [LATIN_PREVIEW];
  const seen = new Set(parts);
  for (const raw of subs) {
    const key = String(raw || '').toLowerCase();
    if (!key || key === 'menu' || key === 'latin' || key === 'latin-ext') continue;
    const snip = SUBSET_SNIPPETS[key] || scriptUnicodeGlyphSample(key);
    if (snip && !seen.has(snip)) {
      parts.push(snip);
      seen.add(snip);
    }
  }
  return parts.join('');
}

export function hasGoogleScriptGlyphSample(entry: GoogleCatalogSampleEntry | null | undefined): boolean {
  if (hasNonLatinGoogleSubsets(entry)) return true;
  const k = resolvePrimarySubsetKey(entry);
  if (!k) return false;
  if (SUBSET_SNIPPETS[k]) return true;
  return scriptUnicodeGlyphSample(k).length > 0;
}

const EDITOR_SUBSET_SAMPLE_MAX_LEN = 280;

/** Образец для превью редактора при смене subset в сайдбаре (Fontsource). */
export function buildEditorSubsetPreviewSampleText(subset: string): string {
  // Back-compat: раньше это было “несколько блоков с заголовками”.
  // Теперь это “глифовый дефолт” без заголовков.
  const key = String(subset || '').trim().toLowerCase();
  if (key === 'vietnamese') {
    const paragraph = findSubsetBlockText(key, 'Параграф') || findSubsetBlockText(key, 'Paragraph');
    // Дефолт при переключении subset — алфавит (а “Панграмма” отдельным пресетом).
    const text = paragraph ? String(paragraph).trim() : VIETNAMESE_ALPHABET_SAMPLE;
    if (!text) return VIETNAMESE_ALPHABET_SAMPLE;
    if (text.length > EDITOR_SUBSET_SAMPLE_MAX_LEN) return text.slice(0, EDITOR_SUBSET_SAMPLE_MAX_LEN);
    return text;
  }
  const out = buildEditorSubsetGlyphPreviewText(subset);
  if (out.length > EDITOR_SUBSET_SAMPLE_MAX_LEN) return out.slice(0, EDITOR_SUBSET_SAMPLE_MAX_LEN);
  return out;
}

export function buildGoogleFontGlyphSampleText(entry: GoogleCatalogSampleEntry | null | undefined): string {
  const subs = Array.isArray(entry?.subsets)
    ? entry.subsets.map((s) => String(s || '').toLowerCase())
    : [];
  const primaryKey = resolvePrimarySubsetKey(entry);
  const primaryBody = primaryKey ? nativeScriptGlyphBody(primaryKey) : '';
  if (primaryKey && primaryBody) {
    const inSubs = subs.length === 0 || subs.includes(primaryKey);
    if (inSubs) {
      if (LATIN_TYPOGRAPHY_EXTRAS.has(primaryKey)) {
        return FULL_LATIN_ALPHANUM + primaryBody;
      }
      return primaryBody;
    }
  }
  for (const key of subs) {
    if (!key || key === 'menu' || key === 'latin' || key === 'latin-ext' || key === 'math' || key === 'symbols')
      continue;
    const snip = SUBSET_SNIPPETS[key] || scriptUnicodeGlyphSample(key);
    if (snip) return FULL_LATIN_ALPHANUM + snip;
  }
  for (const key of subs) {
    if (!key || key === 'menu' || key === 'latin' || key === 'latin-ext') continue;
    const snip = SUBSET_SNIPPETS[key] || scriptUnicodeGlyphSample(key);
    if (snip) return FULL_LATIN_ALPHANUM + snip;
  }
  return FULL_LATIN_ALPHANUM;
}
