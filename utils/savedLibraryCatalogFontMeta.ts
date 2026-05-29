import type {
  SavedLibraryCatalogLookup,
  SavedLibraryFontCatalogMeta,
  SavedLibraryFontEntry,
} from '../types/savedLibrary';
import type { SessionFontRecord } from '../types/editorFonts';

/**
 * VF / italic / subsets для записи библиотеки по кэшу Google и Fontsource.
 */
export function resolveSavedLibraryFontCatalogMeta(
  font: SavedLibraryFontEntry,
  lookup: SavedLibraryCatalogLookup | null | undefined,
): SavedLibraryFontCatalogMeta {
  const id = String(font?.id || '');
  const label = String(font?.label || '');
  const source = String(font?.source || 'editor');

  let subsets: string[] = [];
  let isVariable = font?.isVariable === true;
  let hasItalic = false;
  let category = '';
  let styleCount = 0;

  if (!lookup) {
    return { subsets, isVariable, hasItalic, category, styleCount, source, id, label };
  }

  if (source === 'google') {
    const family = id.startsWith('google:') ? id.slice('google:'.length) : label;
    const meta = lookup.googleByFamily.get(String(family || '').toLowerCase());
    subsets = Array.isArray(meta?.subsets) ? (meta.subsets as string[]) : [];
    category = String(meta?.category || '').trim();
    styleCount = Number(meta?.styleCount) || 0;
    isVariable = isVariable || meta?.isVariable === true || (Array.isArray(meta?.axes) && meta.axes.length > 0);
    hasItalic =
      meta?.hasItalic === true ||
      meta?.hasItalicStyles === true ||
      (typeof meta?.italicMode === 'string' && meta.italicMode && meta.italicMode !== 'none');
  } else if (source === 'fontsource') {
    const slug = id.startsWith('fontsource:') ? id.slice('fontsource:'.length) : '';
    const meta = lookup.fontsourceBySlug.get(slug);
    subsets = Array.isArray(meta?.subsets) ? (meta.subsets as string[]) : [];
    category = String(meta?.category || '').trim();
    styleCount = Number(meta?.styleCount) || 0;
    isVariable = isVariable || meta?.isVariable === true;
    hasItalic = meta?.hasItalic === true;
  }

  return { subsets, isVariable, hasItalic, category, styleCount, source, id, label };
}

export function applySessionFontMetaHints(
  { isVariable, hasItalic }: Pick<SavedLibraryFontCatalogMeta, 'isVariable' | 'hasItalic'>,
  sessionFont: SessionFontRecord | null | undefined,
): Pick<SavedLibraryFontCatalogMeta, 'isVariable' | 'hasItalic'> {
  let variable = isVariable;
  let italic = hasItalic;

  if (!variable && sessionFont) {
    const sf = sessionFont as SessionFontRecord & {
      isVariable?: boolean;
      variableAxes?: unknown;
      axes?: unknown[];
    };
    variable =
      sf.isVariable === true ||
      (Array.isArray(sf.variableAxes) && sf.variableAxes.length > 0) ||
      (Array.isArray(sf.axes) && sf.axes.length > 0);
  }

  if (!italic && sessionFont) {
    const sf = sessionFont as SessionFontRecord & {
      selectedStyle?: string;
      style?: string;
      activeStyle?: { name?: string };
    };
    const styleToken = [
      sf.selectedStyle,
      sf.style,
      sf.activeStyle?.name,
      sessionFont.originalName,
      sessionFont.name,
    ]
      .map((part) => String(part || ''))
      .join(' ');
    italic = /italic/i.test(styleToken);
  }

  return { isVariable: variable, hasItalic: italic };
}
