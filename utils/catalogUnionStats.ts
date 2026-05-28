import { slugifyFontKey } from './fontSlug';
import type { UnifiedCatalogStats } from '../types/catalog';

type CatalogRow = Record<string, unknown>;

function rowDedupeKey(row: CatalogRow, source: 'google' | 'fontsource' | 'fontshare' | 'demo'): string | null {
  const raw =
    source === 'google'
      ? row?.family
      : row?.family || row?.id || row?.slug;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return slugifyFontKey(raw);
}

export function getUnifiedCatalogStats({
  googleItems,
  fontsourceItems,
  fontshareItems,
  trialItems,
}: {
  googleItems?: CatalogRow[];
  fontsourceItems?: CatalogRow[];
  fontshareItems?: CatalogRow[];
  trialItems?: CatalogRow[];
} = {}): UnifiedCatalogStats {
  const g = Array.isArray(googleItems) ? googleItems : [];
  const f = Array.isArray(fontsourceItems) ? fontsourceItems : [];
  const sh = Array.isArray(fontshareItems) ? fontshareItems : [];
  const t = Array.isArray(trialItems) ? trialItems : [];

  const googleKeys = new Set<string>();
  for (const row of g) {
    const k = rowDedupeKey(row, 'google');
    if (k) googleKeys.add(k);
  }

  const fontsourceKeys = new Set<string>();
  for (const row of f) {
    const k = rowDedupeKey(row, 'fontsource');
    if (k) fontsourceKeys.add(k);
  }

  const fontshareKeys = new Set<string>();
  for (const row of sh) {
    const k = rowDedupeKey(row, 'fontshare');
    if (k) fontshareKeys.add(k);
  }

  const trialKeys = new Set<string>();
  for (const row of t) {
    const k = rowDedupeKey(row, 'demo');
    if (k) trialKeys.add(k);
  }

  const keysAll = new Set([...googleKeys, ...fontsourceKeys, ...fontshareKeys, ...trialKeys]);

  return {
    googleTotal: g.length,
    fontsourceTotal: f.length,
    fontshareTotal: sh.length,
    trialTotal: t.length,

    googleUniqueFamilies: googleKeys.size,
    fontsourceUniqueFamilies: fontsourceKeys.size,
    fontshareUniqueFamilies: fontshareKeys.size,
    trialUniqueFamilies: trialKeys.size,

    uniqueFamiliesAll: keysAll.size,
  };
}

export function formatUnifiedCatalogAvailabilityShort(s: UnifiedCatalogStats | null | undefined): string {
  if (!s || s.uniqueFamiliesAll === 0) return 'Каталоги ещё не загружены';
  return `Доступно: ${s.uniqueFamiliesAll} шт.`;
}
