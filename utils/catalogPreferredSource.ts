import {
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
} from './catalogDownloadActions';
import type { CatalogUnifiedItem } from '../types/catalog';
import { catalogOpenDbg } from './catalogOpenDebugLog';
import { slugifyFontKey } from './fontSlug';

type CatalogRaw = Record<string, unknown>;

type DownloadMenuItem = {
  key?: string;
  hidden?: boolean;
  onSelect?: (...args: unknown[]) => Promise<unknown> | unknown;
};

type DownloadProps = {
  onPrimaryClick?: (...args: unknown[]) => Promise<unknown> | unknown;
  menuItems?: DownloadMenuItem[];
  stylePicker?: {
    onDownload?: (...args: unknown[]) => Promise<unknown> | unknown;
    [key: string]: unknown;
  };
  sourceTabs?: unknown;
  [key: string]: unknown;
} | null;

function getSourceEntry(item: CatalogUnifiedItem | null | undefined, sourceId: string) {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  return sources.find((s) => s?.id === sourceId) || null;
}

export function getCatalogFontsourceRaw(item: CatalogUnifiedItem | null | undefined): CatalogRaw | null {
  return (getSourceEntry(item, 'fontsource')?.raw as CatalogRaw) || null;
}

export function getCatalogGoogleRaw(item: CatalogUnifiedItem | null | undefined): CatalogRaw | null {
  return (getSourceEntry(item, 'google')?.raw as CatalogRaw) || null;
}

async function tryFontsourceThenGoogle({
  fsRaw,
  googleRaw,
  runFontsource,
  runGoogle,
}: {
  fsRaw: CatalogRaw | null;
  googleRaw: CatalogRaw | null;
  runFontsource?: (raw: CatalogRaw) => Promise<unknown>;
  runGoogle?: (raw: CatalogRaw) => Promise<unknown>;
}): Promise<boolean> {
  if (fsRaw && typeof runFontsource === 'function') {
    try {
      const ok = await runFontsource(fsRaw);
      if (ok !== false) return true;
    } catch {
      /* fallback */
    }
  }
  if (googleRaw && typeof runGoogle === 'function') {
    try {
      const ok = await runGoogle(googleRaw);
      if (ok !== false) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export async function openCatalogItemInEditor(
  item: CatalogUnifiedItem,
  {
    onOpenFontsource,
    onOpenGoogle,
  }: {
    onOpenFontsource?: (slug: string, isVariable: boolean) => Promise<unknown>;
    onOpenGoogle?: (raw: CatalogRaw) => Promise<unknown>;
  } = {},
): Promise<boolean> {
  const fsRaw = getCatalogFontsourceRaw(item);
  const googleRaw = getCatalogGoogleRaw(item);

  if (fsRaw && typeof onOpenFontsource === 'function') {
    const slug = String(fsRaw.id || fsRaw.slug || '');
    catalogOpenDbg('try fontsource', {
      familyKey: (item as any)?.familyKey,
      displayName: (item as any)?.displayName,
      slug,
      isVariable: Boolean((fsRaw as any)?.isVariable),
      hasGoogleFallback: Boolean(googleRaw),
    });
    if (slug) {
      try {
        const opened = await onOpenFontsource(slug, Boolean((fsRaw as any).isVariable));
        // `onOpenFontsource` может вернуть:
        // - `void/undefined` (успешно, но без результата),
        // - объект (успешно),
        // - `null`/`false` (не удалось).
        const ok = opened !== false && opened !== null;
        catalogOpenDbg(ok ? 'fontsource opened' : 'fontsource open returned null/false', {
          slug,
          openedType: opened === null ? 'null' : typeof opened,
        });
        if (ok) return true;
      } catch (e) {
        catalogOpenDbg('fontsource open threw, fallback to google', {
          slug,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      catalogOpenDbg('fontsource raw present but slug empty, fallback to google', {
        familyKey: (item as any)?.familyKey,
        displayName: (item as any)?.displayName,
        fsRawKeys: fsRaw && typeof fsRaw === 'object' ? Object.keys(fsRaw as any).slice(0, 12) : null,
      });
    }
  }

  // Если карточка пришла как "google-only", всё равно пробуем открыть через Fontsource по slug из family.
  // Это нужно, когда Fontsource-каталог в DEV неполный/временно не загрузился, но сам Fontsource API доступен.
  if (!fsRaw && googleRaw && typeof onOpenFontsource === 'function') {
    const family =
      String((googleRaw as any)?.family || (item as any)?.family || (item as any)?.displayName || '')
        .trim();
    const derivedSlug = family ? slugifyFontKey(family) : '';
    if (derivedSlug) {
      catalogOpenDbg('no fontsource raw; try derived fontsource slug from google family', {
        familyKey: (item as any)?.familyKey,
        displayName: (item as any)?.displayName,
        family,
        derivedSlug,
      });
      try {
        const opened = await onOpenFontsource(derivedSlug, Boolean((googleRaw as any)?.isVariable));
        const ok = opened !== false && opened !== null;
        catalogOpenDbg(ok ? 'derived fontsource opened' : 'derived fontsource returned null/false', {
          derivedSlug,
          openedType: opened === null ? 'null' : typeof opened,
        });
        if (ok) return true;
      } catch (e) {
        catalogOpenDbg('derived fontsource threw; fallback to google', {
          derivedSlug,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  if (googleRaw && typeof onOpenGoogle === 'function') {
    catalogOpenDbg('open google fallback', {
      familyKey: (item as any)?.familyKey,
      displayName: (item as any)?.displayName,
      hasFontsourceRaw: Boolean(fsRaw),
    });
    await onOpenGoogle(googleRaw);
    return true;
  }

  catalogOpenDbg('no open handler succeeded', {
    familyKey: (item as any)?.familyKey,
    displayName: (item as any)?.displayName,
    hasFontsourceRaw: Boolean(fsRaw),
    hasGoogleRaw: Boolean(googleRaw),
  });
  return false;
}

export async function downloadCatalogItemPackage(
  item: CatalogUnifiedItem,
  options: Record<string, unknown> = {},
): Promise<boolean> {
  const fsRaw = getCatalogFontsourceRaw(item);
  const googleRaw = getCatalogGoogleRaw(item);
  return tryFontsourceThenGoogle({
    fsRaw,
    googleRaw,
    runFontsource: (raw) => downloadFontsourcePackageZip(raw, options),
    runGoogle: (raw) => downloadGooglePackageZip(raw, options),
  });
}

export async function downloadCatalogItemAsFormat(
  item: CatalogUnifiedItem,
  format: string,
  options: Record<string, unknown> = {},
): Promise<boolean> {
  const fsRaw = getCatalogFontsourceRaw(item);
  const googleRaw = getCatalogGoogleRaw(item);
  return tryFontsourceThenGoogle({
    fsRaw,
    googleRaw,
    runFontsource: (raw) => downloadFontsourceAsFormat(raw, format, options),
    runGoogle: (raw) => downloadGoogleAsFormat(raw, format, options),
  });
}

export async function downloadCatalogItemVariableVariant(
  item: CatalogUnifiedItem,
  options: Record<string, unknown> = {},
): Promise<boolean> {
  const fsRaw = getCatalogFontsourceRaw(item);
  const googleRaw = getCatalogGoogleRaw(item);
  return tryFontsourceThenGoogle({
    fsRaw,
    googleRaw,
    runFontsource: (raw) => downloadFontsourceVariableVariant(raw, options),
    runGoogle: (raw) => downloadGoogleVariableVariant(raw, options),
  });
}

function chainHandler(
  primaryFn?: (...args: unknown[]) => Promise<unknown> | unknown,
  fallbackFn?: (...args: unknown[]) => Promise<unknown> | unknown,
) {
  return async (...args: unknown[]) => {
    if (typeof primaryFn === 'function') {
      try {
        const ok = await primaryFn(...args);
        if (ok !== false) return ok;
      } catch {
        /* fallback */
      }
    }
    if (typeof fallbackFn === 'function') {
      return fallbackFn(...args);
    }
    return false;
  };
}

export function wrapDownloadPropsWithGoogleFallback(
  fontsourceProps: DownloadProps,
  googleProps: DownloadProps,
): DownloadProps {
  if (!fontsourceProps) return googleProps || null;
  if (!googleProps) return fontsourceProps;

  const fsZip = fontsourceProps.onPrimaryClick;
  const gZip = googleProps.onPrimaryClick;

  const nextMenuItems = (fontsourceProps.menuItems || []).map((item) => {
    const gItem = (googleProps.menuItems || []).find((row) => row.key === item.key);
    if (!gItem || item.hidden) return item;
    return {
      ...item,
      onSelect: chainHandler(item.onSelect, gItem.onSelect),
    };
  });

  const fsPicker = fontsourceProps.stylePicker;
  const gPicker = googleProps.stylePicker;
  let stylePicker = fsPicker;
  if (fsPicker && gPicker) {
    stylePicker = {
      ...fsPicker,
      onDownload: chainHandler(fsPicker.onDownload, gPicker.onDownload),
    };
  }

  return {
    ...fontsourceProps,
    onPrimaryClick: chainHandler(fsZip, gZip),
    menuItems: nextMenuItems,
    stylePicker,
    sourceTabs: null,
  };
}
