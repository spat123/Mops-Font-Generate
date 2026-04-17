/**
 * Текст для &text= в CSS Google и образец в UI: латиница + короткие фразы по subset (иначе Google подрезает глифы).
 * Ключи — коды subset из metadata (нижний регистр).
 */
import { scriptUnicodeGlyphSample } from './scriptUnicodeSampleText';
import isoScriptToSubset from './googleIsoScriptToSubset.json';

export const LATIN_PREVIEW = 'AaBbCcDdEe';

/** Полная латиница + цифры для UI-образца (как пресет «Entire Font»), не для короткого text= Google. */
export const FULL_LATIN_ALPHANUM =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Есть ли в каталоге не-латинские наборы (нужен отдельный образец и subset в CSS). */
export function hasNonLatinGoogleSubsets(entry) {
  const subs = Array.isArray(entry?.subsets) ? entry.subsets : [];
  return subs.some((raw) => {
    const s = String(raw || '').toLowerCase();
    return s && s !== 'menu' && s !== 'latin' && s !== 'latin-ext';
  });
}

/**
 * Код subset Google по primaryScript (ISO 15924) и списку subsets в записи каталога.
 * Таблица {@link ./googleIsoScriptToSubset.json} собрана из metadata fonts.google.com.
 * @param {{ primaryScript?: string, subsets?: string[] }} entry
 */
function resolvePrimarySubsetKey(entry) {
  const ps = entry?.primaryScript;
  if (ps == null || String(ps).trim() === '') return null;
  const normalized = String(ps).trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized || normalized === 'latn') return null;
  const mapped =
    isoScriptToSubset[normalized] ||
    isoScriptToSubset[normalized.slice(0, 4)] ||
    null;
  if (!mapped) return null;
  const m = String(mapped).toLowerCase();
  const subs = Array.isArray(entry?.subsets)
    ? entry.subsets.map((s) => String(s || '').toLowerCase())
    : [];
  if (!subs.length || subs.includes(m)) return m;
  return null;
}

/**
 * Сабсеты «рядом с латинской типографикой»: префикс {@link FULL_LATIN_ALPHANUM} + короткий фрагмент (как у Roboto).
 * Остальные скрипты при primaryScript от Google — блок Unicode или короткий сниппет без латинского префикса.
 */
const LATIN_TYPOGRAPHY_EXTRAS = new Set(['cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese']);

/** Короткие характерные строки по сабсету (без latin / latin-ext / menu). */
const SUBSET_SNIPPETS = {
  limbu: 'ᤜᤧᤰᤁᤩᤠᤱ ᤁᤢᤶᤔᤠᤱᤔᤡᤒᤠᤸᤗᤧ ᤛᤧᤴᤗᤠᤵᤋᤢ ᤀᤠᤔᤠᤀᤧ ᤁᤴ ᤌᤣᤔᤠ ᤛᤢᤶᤒᤠᤰᤏᤧᤒᤧ.',
  cyrillic: 'АаБбВв',
  'cyrillic-ext': 'ЀёҐґ',
  greek: 'ΑαΒβΓγ',
  hebrew: 'אבגד',
  arabic: 'ابج',
  vietnamese: 'ĂăƠơ',
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

function nativeScriptGlyphBody(key) {
  const block = scriptUnicodeGlyphSample(key);
  if (block.length) return block;
  return SUBSET_SNIPPETS[key] || '';
}

/**
 * Строка для параметра text= в превью Google CSS и для поля googleFontRecommendedSample.
 * @param {{ subsets?: string[] }} entry
 */
export function buildGoogleFontPreviewText(entry) {
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

/** Есть ли смысл показывать кнопку «Образец языка» / короткий glyph-sample (не только латиница). */
export function hasGoogleScriptGlyphSample(entry) {
  if (hasNonLatinGoogleSubsets(entry)) return true;
  const k = resolvePrimarySubsetKey(entry);
  if (!k) return false;
  if (SUBSET_SNIPPETS[k]) return true;
  return scriptUnicodeGlyphSample(k).length > 0;
}

/**
 * Строка для UI и поля googleFontRecommendedSample.
 * — Латиницентричные семейства (Roboto и т.п.): {@link FULL_LATIN_ALPHANUM} + короткий фрагмент (кириллица, греческий…).
 * — Явный «другой» primaryScript (Limbu, Thai, …): блок Unicode этого скрипта (или сниппет), без латинского префикса.
 * Полная строка для &text= в CSS — {@link buildGoogleFontPreviewText}.
 */
export function buildGoogleFontGlyphSampleText(entry) {
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
