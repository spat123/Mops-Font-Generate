import { pickFontsharePreviewStyle, type FontshareCatalogItem } from './fontshareCatalogNormalize';
import { createPreviewFamilyLoader } from './createPreviewFamilyLoader';

const previewLoader = createPreviewFamilyLoader();
const injectedStyleIds = new Set<string>();

function ensurePreviewStylesheet(): HTMLStyleElement | null {
  if (typeof document === 'undefined') return null;
  const id = 'fontshare-preview-styles';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}

export function getFontsharePreviewFamily(slug: string): string | null {
  return previewLoader.getPreviewFamily(slug);
}

export function hasFontsharePreviewFamily(slug: string): boolean {
  return previewLoader.hasPreviewFamily(slug);
}

export async function loadFontsharePreviewFamily(
  slug: string,
  item: FontshareCatalogItem | Record<string, unknown> | null = null,
): Promise<string | null> {
  return previewLoader.loadPreviewFamily(slug, async () => {
    if (typeof document === 'undefined') return null;

    const styleRow = pickFontsharePreviewStyle(item as { styleRows?: FontshareCatalogItem['styleRows'] });
    if (!styleRow?.file) return null;

    const familyName = `fontshare-preview-${slug}`;
    const styleId = `fontshare-preview-face-${slug}-${styleRow.id || styleRow.weight}`;

    if (!injectedStyleIds.has(styleId)) {
      const sheet = ensurePreviewStylesheet();
      if (sheet) {
        const rule = `@font-face{font-family:${JSON.stringify(familyName)};src:url(${JSON.stringify(styleRow.file)}) format('woff2');font-weight:${styleRow.weight};font-style:${styleRow.isItalic ? 'italic' : 'normal'};font-display:swap;}`;
        sheet.appendChild(document.createTextNode(rule));
        injectedStyleIds.add(styleId);
      }
    }

    if (typeof FontFace !== 'undefined') {
      try {
        const ff = new FontFace(familyName, `url(${JSON.stringify(styleRow.file)})`, {
          weight: String(styleRow.weight),
          style: styleRow.isItalic ? 'italic' : 'normal',
        });
        await ff.load();
        document.fonts.add(ff);
      } catch {
        // CSS @font-face достаточно для превью в большинстве браузеров
      }
    }

    return familyName;
  });
}
