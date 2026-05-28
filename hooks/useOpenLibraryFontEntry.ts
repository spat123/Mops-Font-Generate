import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { toast } from '../utils/appNotify';
import { readGoogleFontCatalogCache } from '../utils/googleFontCatalogCache';
import {
  fetchGoogleStaticFontSlicesAll,
  fetchGoogleVariableFontSlicesAll,
} from '../utils/googleFontLoader';
import {
  buildGoogleFontGlyphSampleText,
  hasGoogleScriptGlyphSample,
} from '../utils/googleFontCatalogSampleText';
import { listGoogleCatalogDownloadStyles } from '../utils/googleFontDownloadStyles';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';
import type { EditorFontUploadInput } from './useEditorFontNav';

type LibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

type GoogleCatalogEntry = Record<string, unknown> & {
  family?: string;
  subsets?: string[];
  isVariable?: boolean;
  wghtMin?: number;
  wghtMax?: number;
  axes?: unknown[];
  italicMode?: string;
  hasItalicStyles?: boolean;
};

type UseOpenLibraryFontEntryParams = {
  resolveSessionFontForLibraryEntry: (entry: LibraryFontEntry) => SessionFontRecord | null | undefined;
  setClosedLibraryFontIds: Dispatch<SetStateAction<string[]>>;
  safeSelectFont: (font: SessionFontRecord) => void;
  setMainTab: Dispatch<SetStateAction<string>>;
  selectOrAddFontsourceFontWithNav: (
    fontFamilyName: string,
    forceVariableFont?: boolean,
    options?: { silent?: boolean },
  ) => Promise<SessionFontRecord | null | undefined>;
  handleFontsUploadedWithNav: (
    items: EditorFontUploadInput[],
    options?: { silent?: boolean },
  ) => Promise<SessionFontRecord | null | undefined>;
};

/**
 * Открытие записи из сохранённой библиотеки в редактор.
 */
export function useOpenLibraryFontEntry({
  resolveSessionFontForLibraryEntry,
  setClosedLibraryFontIds,
  safeSelectFont,
  setMainTab,
  selectOrAddFontsourceFontWithNav,
  handleFontsUploadedWithNav,
}: UseOpenLibraryFontEntryParams) {
  return useCallback(
    async (fontEntry: LibraryFontEntry | null | undefined) => {
      if (!fontEntry) return;
      const entryId = String(fontEntry.id || '').trim();
      const entryLabel = String(fontEntry.label || '').trim();
      const entrySource = String(fontEntry.source || 'editor').trim();
      const sessionFont = resolveSessionFontForLibraryEntry(fontEntry);

      if (sessionFont) {
        setClosedLibraryFontIds((prev) => prev.filter((id) => id !== sessionFont.id));
        safeSelectFont(sessionFont);
        setMainTab(sessionFont.id);
        return;
      }

      if (entrySource === 'fontsource') {
        const slug = entryId.startsWith('fontsource:') ? entryId.slice('fontsource:'.length) : '';
        if (!slug) {
          toast.info(`Не удалось определить пакет Fontsource для ${entryLabel || 'шрифта'}`);
          return;
        }
        await selectOrAddFontsourceFontWithNav(
          slug,
          Boolean((fontEntry as { isVariable?: boolean }).isVariable),
          { silent: true },
        );
        return;
      }

      if (entrySource === 'google') {
        const family = entryLabel;
        const catalogEntry = readGoogleFontCatalogCache().find(
          (item) => String(item?.family || '').trim().toLowerCase() === family.toLowerCase(),
        ) as GoogleCatalogEntry | undefined;
        if (!catalogEntry) {
          toast.info(`Шрифт ${family} пока не найден в кэше Google Fonts`);
          return;
        }
        try {
          const subsetList = Array.isArray(catalogEntry.subsets) ? catalogEntry.subsets : [];
          const googleFontRecommendedSample = hasGoogleScriptGlyphSample(catalogEntry)
            ? buildGoogleFontGlyphSampleText(catalogEntry)
            : undefined;
          const useVariable = catalogEntry.isVariable === true;
          const slices = useVariable
            ? await fetchGoogleVariableFontSlicesAll(family, {
                subsets: subsetList,
                ...(catalogEntry.wghtMin != null && catalogEntry.wghtMax != null
                  ? { wghtMin: catalogEntry.wghtMin, wghtMax: catalogEntry.wghtMax }
                  : {}),
              })
            : await fetchGoogleStaticFontSlicesAll(family, {
                weight: 400,
                italic: false,
                subsets: subsetList,
              });
          const firstBlob = slices?.[0]?.blob;
          if (!(firstBlob instanceof Blob) || firstBlob.size === 0) throw new Error('Пустой файл');
          await handleFontsUploadedWithNav(
            [
              {
                file: firstBlob,
                name: `${family}.woff2`,
                source: 'google',
                googleFontSlices: slices,
                googleFontAxesFromCatalog:
                  Array.isArray(catalogEntry.axes) && catalogEntry.axes.length > 0 ? catalogEntry.axes : null,
                googleFontItalicMode:
                  typeof catalogEntry.italicMode === 'string' && catalogEntry.italicMode
                    ? catalogEntry.italicMode
                    : 'none',
                googleFontHasItalicStyles: catalogEntry.hasItalicStyles === true,
                googleFontInstanceStyles: listGoogleCatalogDownloadStyles(
                  catalogEntry as Parameters<typeof listGoogleCatalogDownloadStyles>[0],
                ),
                googleFontRecommendedSample,
              },
            ],
            { silent: true },
          );
        } catch {
          toast.error(`Не удалось открыть ${family}`);
        }
        return;
      }

      if (entrySource === 'local' || entrySource === 'editor') {
        toast.info(`Шрифт ${entryLabel || 'без названия'} сейчас не загружен в редактор`);
      }
    },
    [
      handleFontsUploadedWithNav,
      resolveSessionFontForLibraryEntry,
      safeSelectFont,
      selectOrAddFontsourceFontWithNav,
      setClosedLibraryFontIds,
      setMainTab,
    ],
  );
}
