/** Парсинг числа начертаний семейства Fontfabric — только из заголовков WP, без HTML-страницы. */

const HEADLINE_STYLE_PATTERNS = [
  /Typeface of (\d+)\s+Styles/i,
  /typeface of (\d+)\s+styles/i,
  /Font Family[^0-9]{0,120}(\d+)\s+Styles/i,
  /Sans Serif Typeface of (\d+)\s+Styles/i,
  /Serif Typeface of (\d+)\s+Styles/i,
  /(\d+)\s+Styles\s*\+\s*\d+\s+Variable/i,
  /family of (\d+)\s+styles/i,
];

const MAX_PLAUSIBLE_STYLE_COUNT = 48;

function parseFirstCount(text: string, patterns: RegExp[]): number {
  const source = String(text || '');
  for (const re of patterns) {
    const m = source.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= MAX_PLAUSIBLE_STYLE_COUNT) return n;
  }
  return 0;
}

function decodeHtmlEntities(text: string): string {
  return String(text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/gi, ' ');
}

function stripHtmlTags(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadingsPlainText(html: string): string {
  const parts: string[] = [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match = re.exec(html);
  while (match) {
    parts.push(stripHtmlTags(decodeHtmlEntities(match[1])));
    match = re.exec(html);
  }
  return parts.join(' | ');
}

export function parseFontfabricStyleCountFromWpContent(rendered: string | null | undefined): number {
  const fromHeadings = parseFirstCount(extractHeadingsPlainText(String(rendered || '')), HEADLINE_STYLE_PATTERNS);
  if (fromHeadings > 0) return fromHeadings;
  return 0;
}

export async function enrichFontfabricTrialStyleCounts<T>(items: T[]): Promise<T[]> {
  return Array.isArray(items) ? items : [];
}
