import { readGoogleFontCatalogCache, writeGoogleFontCatalogCache } from './googleFontCatalogCache';
import {
  isFontsourceCatalogComplete,
  readFontsourceCatalogCache,
  writeFontsourceCatalogCache,
} from './fontsourceCatalogCache';
import { readFontshareCatalogCache, writeFontshareCatalogCache } from './fontshareCatalogCache';
import {
  readFontfabricTrialCatalogCache,
  writeFontfabricTrialCatalogCache,
} from './fontfabricTrialCatalogCache';

export type EnsureCatalogCachesOptions = {
  needsGoogle?: boolean;
  needsFontsource?: boolean;
  needsFontshare?: boolean;
  needsFontfabricTrial?: boolean;
  /** Для поиска/пикера: не считать урезанный fallback-каталог достаточным. */
  preferCompleteFontsource?: boolean;
};

type LibraryFontRef = { source?: string; id?: string };

export function libraryNeedsGoogleCatalog(fonts: LibraryFontRef[]): boolean {
  return fonts.some((font) => {
    const source = String(font?.source || '').toLowerCase();
    const id = String(font?.id || '').trim();
    return source === 'google' || id.startsWith('google:');
  });
}

export function libraryNeedsFontsourceCatalog(fonts: LibraryFontRef[]): boolean {
  return fonts.some((font) => {
    const source = String(font?.source || '').toLowerCase();
    const id = String(font?.id || '').trim();
    return source === 'fontsource' || id.startsWith('fontsource:');
  });
}

export function libraryNeedsFontshareCatalog(fonts: LibraryFontRef[]): boolean {
  return fonts.some((font) => {
    const source = String(font?.source || '').toLowerCase();
    const id = String(font?.id || '').trim();
    return source === 'fontshare' || id.startsWith('fontshare:');
  });
}

export function libraryNeedsFontfabricTrialCatalog(fonts: LibraryFontRef[]): boolean {
  return fonts.some((font) => {
    const source = String(font?.source || '').toLowerCase();
    const id = String(font?.id || '').trim();
    return source === 'fontfabric-trial' || id.startsWith('fontfabric-trial:');
  });
}

/** Подгружает каталоги в session-кэш, если их ещё нет (для библиотеки без открытия вкладки «Каталог»). */
export async function ensureCatalogCachesLoaded(
  options: EnsureCatalogCachesOptions = {},
): Promise<boolean> {
  const needsGoogle = options.needsGoogle === true;
  const needsFontsource = options.needsFontsource === true;
  const needsFontshare = options.needsFontshare === true;
  const needsFontfabricTrial = options.needsFontfabricTrial === true;
  const preferCompleteFontsource = options.preferCompleteFontsource === true;
  let wrote = false;

  if (needsGoogle && readGoogleFontCatalogCache().length === 0) {
    try {
      const res = await fetch('/api/google-fonts-catalog');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.items) ? data.items : [];
        if (list.length > 0) {
          writeGoogleFontCatalogCache(list);
          wrote = true;
        }
      }
    } catch {
      /* ignore */
    }
  }

  const currentFontsource = readFontsourceCatalogCache();
  const shouldLoadFontsource =
    needsFontsource &&
    (currentFontsource.length === 0 ||
      (preferCompleteFontsource && !isFontsourceCatalogComplete(currentFontsource)));

  if (shouldLoadFontsource) {
    try {
      const res = await fetch('/api/fontsource-catalog');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.items) ? data.items : [];
        if (list.length > 0) {
          writeFontsourceCatalogCache(list);
          wrote = true;
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (needsFontshare && readFontshareCatalogCache().length === 0) {
    try {
      const res = await fetch('/api/fontshare-catalog');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.items) ? data.items : [];
        if (list.length > 0) {
          writeFontshareCatalogCache(list);
          wrote = true;
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (needsFontfabricTrial && readFontfabricTrialCatalogCache().length === 0) {
    try {
      const res = await fetch('/api/fontfabric-trial-catalog');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.items) ? data.items : [];
        if (list.length > 0) {
          writeFontfabricTrialCatalogCache(list);
          wrote = true;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return wrote;
}
