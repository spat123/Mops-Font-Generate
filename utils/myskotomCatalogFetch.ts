/**
 * Загрузка каталога Шрифтотеки (myskotom.ru) через публичный API Tilda Store.
 */

import { fontMatchKeyCandidates } from './catalogFamilyMatchKey';

export const MYSKOTOM_TILDA_REC_ID = '504619321';
export const MYSKOTOM_TILDA_STORE_PART_UID = '610736424061';
export const MYSKOTOM_TILDA_API_BASE = 'https://store.tildaapi.com/api/getproductslist/';

export type MyskotomCatalogProduct = {
  uid: string;
  title: string;
  url: string;
  slug: string;
  matchKeys: string[];
};

type TildaProductRow = {
  uid?: number | string;
  title?: string;
  url?: string;
};

type TildaProductsResponse = {
  total?: number;
  products?: TildaProductRow[];
};

function slugFromMyskotomUrl(url: string): string {
  const m = String(url || '').match(/tproduct\/\d+-[\d]+-([^/?#]+)/i);
  return m?.[1] ? m[1].trim() : '';
}

function normalizeMyskotomProduct(row: TildaProductRow): MyskotomCatalogProduct | null {
  const title = String(row?.title || '').trim();
  const url = String(row?.url || '').trim();
  const uid = String(row?.uid || '').trim();
  if (!title || !uid) return null;

  const slug = slugFromMyskotomUrl(url);
  const matchKeys = fontMatchKeyCandidates(title, slug, url);

  return {
    uid,
    title,
    url: url || `https://myskotom.ru/tproduct/${MYSKOTOM_TILDA_REC_ID}-${uid}-${slug || 'font'}`,
    slug,
    matchKeys,
  };
}

export async function fetchMyskotomCatalogPage({
  slice,
  size = 500,
}: {
  slice: number;
  size?: number;
}): Promise<TildaProductsResponse> {
  const params = new URLSearchParams({
    recid: MYSKOTOM_TILDA_REC_ID,
    storepartuid: MYSKOTOM_TILDA_STORE_PART_UID,
    size: String(size),
    slice: String(slice),
  });
  const r = await fetch(`${MYSKOTOM_TILDA_API_BASE}?${params.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; DinamicFont/1.0)' },
  });
  const text = await r.text();
  if (!r.ok || text.startsWith('ERROR')) {
    throw new Error(`Myskotom Tilda API failed (${r.status}): ${text.slice(0, 120)}`);
  }
  return JSON.parse(text) as TildaProductsResponse;
}

/** Все товары каталога (~1700+). */
export async function fetchAllMyskotomCatalogProducts(): Promise<MyskotomCatalogProduct[]> {
  const first = await fetchMyskotomCatalogPage({ slice: 1, size: 500 });
  const total = Number(first.total) || 0;
  const pageSize = 500;
  const sliceCount = Math.max(1, Math.ceil(total / pageSize));

  const rows: TildaProductRow[] = [...(Array.isArray(first.products) ? first.products : [])];

  for (let slice = 2; slice <= sliceCount; slice += 1) {
    const page = await fetchMyskotomCatalogPage({ slice, size: pageSize });
    if (Array.isArray(page.products)) rows.push(...page.products);
  }

  const byUid = new Map<string, MyskotomCatalogProduct>();
  for (const row of rows) {
    const item = normalizeMyskotomProduct(row);
    if (!item) continue;
    byUid.set(item.uid, item);
  }

  return [...byUid.values()].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
}
