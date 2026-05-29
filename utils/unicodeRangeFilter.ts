export type UnicodeRange = { start: number; end: number };

/**
 * Парсит CSS `unicode-range`, например:
 * `U+0000-00FF, U+0131, U+0152-0153`
 */
export function parseUnicodeRangeList(unicodeRange: string | null | undefined): UnicodeRange[] {
  const raw = typeof unicodeRange === 'string' ? unicodeRange.trim() : '';
  if (!raw) return [];
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const ranges: UnicodeRange[] = [];

  for (const part of parts) {
    const token = part.toUpperCase();
    const idx = token.indexOf('U+');
    const body = idx >= 0 ? token.slice(idx + 2).trim() : token.trim();
    if (!body) continue;
    // Wildcards (U+4??) пока не используем в нашем subset map.
    if (body.includes('?')) continue;
    const [a, b] = body.split('-').map((x) => x.trim()).filter(Boolean);
    const start = Number.parseInt(a, 16);
    const end = b ? Number.parseInt(b, 16) : start;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    ranges.push({ start: lo, end: hi });
  }

  return ranges;
}

export function isCodePointInRanges(codePoint: number, ranges: UnicodeRange[]): boolean {
  for (const r of ranges) {
    if (codePoint >= r.start && codePoint <= r.end) return true;
  }
  return false;
}

/**
 * Фильтрует строку так, чтобы остались только символы, попадающие в `unicode-range`.
 * Пробелы/переводы строк сохраняем всегда.
 */
export function filterStringByUnicodeRanges(input: string, ranges: UnicodeRange[]): string {
  if (!input) return '';
  if (!Array.isArray(ranges) || ranges.length === 0) return input;
  let out = '';
  for (const ch of input) {
    if (ch === '\n' || ch === '\r' || ch === '\t' || ch === ' ') {
      out += ch;
      continue;
    }
    // Пунктуацию оставляем всегда: иначе при non-latin subset пропадают запятые/тире,
    // и превью становится нечитаемым. Цифры при этом НЕ сохраняем специально —
    // они будут проходить только если входят в unicode-range сабсета.
    if (isCommonPunctuationChar(ch)) {
      out += ch;
      continue;
    }
    const cp = ch.codePointAt(0) ?? 0;
    if (isCodePointInRanges(cp, ranges)) {
      out += ch;
    }
  }
  // Чуть нормализуем пустые строки.
  return out
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isCommonPunctuationChar(ch: string): boolean {
  if (!ch) return false;
  // ASCII punctuation (без цифр/букв)
  if (/^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]$/.test(ch)) return true;
  // Частые типографские символы (не все входят в subset unicode-range).
  if (
    ch === '—' || // em dash
    ch === '–' || // en dash
    ch === '…' ||
    ch === '«' ||
    ch === '»' ||
    ch === '„' ||
    ch === '“' ||
    ch === '”' ||
    ch === '’' ||
    ch === '‘' ||
    ch === '№'
  ) {
    return true;
  }
  return false;
}

