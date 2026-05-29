import type { CatalogFamilyIndex, CatalogFamilyHit } from './catalogFamilyIndex';
import { lookupCatalogFamily, buildCatalogFamilyIndex } from './catalogFamilyIndex';
import { fetchAllMyskotomCatalogProducts, type MyskotomCatalogProduct } from './myskotomCatalogFetch';

export type MyskotomGapEntry = {
  uid: string;
  title: string;
  url: string;
  slug: string;
};

export type MyskotomMatchedEntry = MyskotomGapEntry & {
  matchedSource: CatalogFamilyHit['source'];
  matchedFamily: string;
  matchedKey: string;
};

export type MyskotomGapReport = {
  generatedAt: string;
  myskotomTotal: number;
  matchedTotal: number;
  gapTotal: number;
  matchedBySource: Record<string, number>;
  ourCatalogTotals: Record<string, number>;
  gap: MyskotomGapEntry[];
  matchedSample: MyskotomMatchedEntry[];
};

function toGapEntry(p: MyskotomCatalogProduct): MyskotomGapEntry {
  return { uid: p.uid, title: p.title, url: p.url, slug: p.slug };
}

export async function buildMyskotomCatalogGapReport({
  index,
  myskotomProducts,
  matchedSampleLimit = 40,
}: {
  index?: CatalogFamilyIndex;
  myskotomProducts?: MyskotomCatalogProduct[];
  matchedSampleLimit?: number;
}): Promise<MyskotomGapReport> {
  const [catalogIndex, products] = await Promise.all([
    index ? Promise.resolve(index) : buildCatalogFamilyIndex(),
    myskotomProducts ? Promise.resolve(myskotomProducts) : fetchAllMyskotomCatalogProducts(),
  ]);

  const gap: MyskotomGapEntry[] = [];
  const matched: MyskotomMatchedEntry[] = [];
  const matchedBySource: Record<string, number> = {};

  for (const product of products) {
    const hit = lookupCatalogFamily(catalogIndex, product.matchKeys);
    const entry = toGapEntry(product);
    if (!hit) {
      gap.push(entry);
      continue;
    }
    matchedBySource[hit.source] = (matchedBySource[hit.source] || 0) + 1;
    matched.push({
      ...entry,
      matchedSource: hit.source,
      matchedFamily: hit.family,
      matchedKey: hit.key,
    });
  }

  gap.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  matched.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  return {
    generatedAt: new Date().toISOString(),
    myskotomTotal: products.length,
    matchedTotal: matched.length,
    gapTotal: gap.length,
    matchedBySource,
    ourCatalogTotals: catalogIndex.totals,
    gap,
    matchedSample: matched.slice(0, matchedSampleLimit),
  };
}
