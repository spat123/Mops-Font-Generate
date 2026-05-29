import { slugifyFontKey } from './fontSlug';

/**
 * Ключ для сопоставления названий семейств между каталогами (myskotom, Google, Fontsource, …).
 */
export function normalizeFontMatchKey(value: unknown): string {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(font|fonts|typeface|family|trial|free|demo)\b/gi, ' ')
    .replace(/\b\d+\s*(nachertanii|nachertaniya|styles?|weights?|начертаний|начертания)\b/gi, ' ')
    .replace(/[^a-z0-9\u0400-\u04ff\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return slugifyFontKey(raw);
}

/** Несколько вариантов ключа из одной подписи (полное имя, slug URL, без хвостов). */
export function fontMatchKeyCandidates(...values: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (v: unknown) => {
    const key = normalizeFontMatchKey(v);
    if (!key || key.length < 2 || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  for (const v of values) {
    if (v == null || v === '') continue;
    const s = String(v).trim();
    push(s);
    push(s.replace(/\s+sp\s*$/i, ''));
    push(s.replace(/\s+2\s*$/i, ''));
    const slugFromUrl = s.match(/tproduct\/\d+-[\d]+-(.+?)(?:\?|$)/i)?.[1];
    if (slugFromUrl) {
      push(slugFromUrl.replace(/-/g, ' '));
      push(slugFromUrl.replace(/-\d+$/, '').replace(/-/g, ' '));
    }
  }

  return out;
}
