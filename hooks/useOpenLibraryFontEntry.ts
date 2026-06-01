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
import { openFontshareExternalDownload } from '../utils/fontshareDownloadActions';
import {
  parseFontfabricTrialEntrySlug,
  parseFontshareEntrySlug,
  parseFontsourceEntrySlug,
  parseGoogleEntryFamily,
  resolveFontfabricTrialCatalogItem,
  resolveFontshareCatalogItem,
} from '../utils/catalogCacheLookup';
import {
  buildSessionFontDuplicateUploadInput,
  findFontsourceFontInSession,
  findGoogleFontInSession,
  focusSessionFontInEditor,
} from '../utils/fontLibraryUtils';
import { resolvePreferredLibraryPickerEntry } from '../utils/libraryPickerCatalogSearch';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';
import type { EditorFontUploadInput, EditorFontUploadOptions } from './useEditorFontNav';

type LibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

export type OpenLibraryFontEntryOptions = {
  forceDuplicate?: boolean;
};

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
  fonts: SessionFontRecord[];
  resolveSessionFontForLibraryEntry: (entry: LibraryFontEntry) => SessionFontRecord | null | undefined;
  setClosedLibraryFontIds: Dispatch<SetStateAction<string[]>>;
  safeSelectFont: (font: SessionFontRecord) => void;
  setMainTab: Dispatch<SetStateAction<string>>;
  selectOrAddFontsourceFontWithNav: (
    fontFamilyName: string,
    forceVariableFont?: boolean,
    options?: EditorFontUploadOptions,
  ) => Promise<SessionFontRecord | null | undefined>;
  handleFontsUploadedWithNav: (
    items: EditorFontUploadInput[],
    options?: EditorFontUploadOptions,
  ) => Promise<SessionFontRecord | null | undefined>;
};

/**
 * Открытие записи из сохранённой библиотеки в редактор.
 */
export function useOpenLibraryFontEntry({
  fonts,
  resolveSessionFontForLibraryEntry,
  setClosedLibraryFontIds,
  safeSelectFont,
  setMainTab,
  selectOrAddFontsourceFontWithNav,
  handleFontsUploadedWithNav,
}: UseOpenLibraryFontEntryParams) {
  const focusExisting = useCallback(
    (font: SessionFontRecord) => {
      focusSessionFontInEditor(font, { setClosedLibraryFontIds, safeSelectFont, setMainTab });
    },
    [safeSelectFont, setClosedLibraryFontIds, setMainTab],
  );

  return useCallback(
    async (
      fontEntry: LibraryFontEntry | null | undefined,
      options: OpenLibraryFontEntryOptions = {},
    ) => {
      if (!fontEntry) return;
      const forceDuplicate = options.forceDuplicate === true;
      const preferredEntry = resolvePreferredLibraryPickerEntry(fontEntry as LibraryFontEntry) || fontEntry;
      const entryId = String(preferredEntry.id || '').trim();
      const entryLabel = String(preferredEntry.label || '').trim();
      const entrySource = String(preferredEntry.source || 'editor').trim();
      const sessionFont =
        resolveSessionFontForLibraryEntry(fontEntry) ||
        (preferredEntry !== fontEntry ? resolveSessionFontForLibraryEntry(preferredEntry) : null);

      if (sessionFont && !forceDuplicate) {
        focusExisting(sessionFont);
        return;
      }

      if (forceDuplicate && sessionFont) {
        const duplicatePayload = buildSessionFontDuplicateUploadInput(sessionFont);
        if (duplicatePayload) {
          await handleFontsUploadedWithNav([duplicatePayload as EditorFontUploadInput], {
            silent: true,
          });
          return;
        }
      }

      if (entrySource === 'fontsource') {
        const slug = parseFontsourceEntrySlug(entryId);
        if (!slug) {
          toast.info(`Не удалось определить пакет Fontsource для ${entryLabel || 'шрифта'}`);
          return;
        }
        const existingInSession = findFontsourceFontInSession(fonts, slug);
        if (!forceDuplicate && existingInSession) {
          focusExisting(existingInSession);
          return;
        }
        if (forceDuplicate && existingInSession) {
          const duplicatePayload = buildSessionFontDuplicateUploadInput(existingInSession);
          if (duplicatePayload) {
            await handleFontsUploadedWithNav([duplicatePayload as EditorFontUploadInput], {
              silent: true,
            });
            return;
          }
        }
        await selectOrAddFontsourceFontWithNav(
          slug,
          Boolean((fontEntry as { isVariable?: boolean }).isVariable),
          { silent: true, forceDuplicate },
        );
        return;
      }

      if (entrySource === 'google') {
        const family =
          parseGoogleEntryFamily(entryId) ||
          entryLabel.replace(/\s+\d+$/i, '').trim();
        const existingInSession = findGoogleFontInSession(fonts, family);
        if (!forceDuplicate && existingInSession) {
          focusExisting(existingInSession);
          return;
        }
        if (forceDuplicate && existingInSession) {
          const duplicatePayload = buildSessionFontDuplicateUploadInput(existingInSession);
          if (duplicatePayload) {
            await handleFontsUploadedWithNav([duplicatePayload as EditorFontUploadInput], {
              silent: true,
            });
            return;
          }
        }
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

      if (entrySource === 'fontshare') {
        const slug = parseFontshareEntrySlug(entryId);
        const item =
          resolveFontshareCatalogItem(slug) ||
          (slug
            ? {
                slug,
                family: entryLabel || slug,
                pageUrl: `https://www.fontshare.com/fonts/${encodeURIComponent(slug)}`,
              }
            : null);
        if (!item) {
          toast.info(`Не удалось открыть Fontshare: ${entryLabel || slug || 'шрифт'}`);
          return;
        }
        openFontshareExternalDownload(
          item as Parameters<typeof openFontshareExternalDownload>[0],
        );
        return;
      }

      if (entrySource === 'fontfabric-trial') {
        const slug = parseFontfabricTrialEntrySlug(entryId);
        const raw = slug ? resolveFontfabricTrialCatalogItem(slug) : null;
        const url = String(raw?.trialUrl || raw?.link || '').trim();
        if (!url || typeof window === 'undefined') {
          toast.info(`Trial недоступен: ${entryLabel || slug || 'шрифт'}`);
          return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (entrySource === 'local' || entrySource === 'editor') {
        toast.info(`Шрифт ${entryLabel || 'без названия'} сейчас не загружен в редактор`);
      }
    },
    [
      focusExisting,
      fonts,
      handleFontsUploadedWithNav,
      resolveSessionFontForLibraryEntry,
      selectOrAddFontsourceFontWithNav,
    ],
  );
}
