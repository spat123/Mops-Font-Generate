import { useCallback, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { toast } from '../utils/appNotify';
import {
  findCatalogFontInSession,
  findFontshareFontInSession,
  findFontsourceFontInSession,
  findGoogleFontInSession,
  focusSessionFontInEditor,
} from '../utils/fontLibraryUtils';
import { readFontshareCatalogCache } from '../utils/fontshareCatalogCache';
import { fetchFontshareEditorSliceBlob } from '../utils/catalogDownloadActions';
import {
  fetchGoogleStaticFontSlicesAll,
  fetchGoogleVariableFontSlicesAll,
} from '../utils/googleFontLoader';
import {
  buildGoogleFontGlyphSampleText,
  hasGoogleScriptGlyphSample,
} from '../utils/googleFontCatalogSampleText';
import { listGoogleCatalogDownloadStyles } from '../utils/googleFontDownloadStyles';
import { resolveDefaultCatalogSubset } from '../utils/catalogActiveSubset';
import { useEditorFontNav, type EditorFontUploadInput, type EditorFontUploadOptions } from './useEditorFontNav';
import type { SessionFontRecord } from '../types/editorFonts';

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

type UseCatalogOpenInEditorParams = {
  fonts: SessionFontRecord[];
  handleFontsUploaded: (
    items: EditorFontUploadInput[],
    options?: EditorFontUploadOptions,
  ) => Promise<SessionFontRecord | null | undefined>;
  selectOrAddFontsourceFont: (
    fontFamilyName: string,
    forceVariableFont?: boolean,
    options?: EditorFontUploadOptions,
  ) => Promise<SessionFontRecord | null | undefined>;
  safeSelectFont: (font: SessionFontRecord) => void;
  setClosedLibraryFontIds: Dispatch<SetStateAction<string[]>>;
  mainTab: string;
  setMainTab: Dispatch<SetStateAction<string>>;
  setEmptySlotIds: Dispatch<SetStateAction<string[]>>;
  setFontsLibraryTab: Dispatch<SetStateAction<string>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  setFileUploadTarget: (target: string) => void;
};

/**
 * Открытие шрифта из каталога / share-query в сессию редактора.
 */
export function useCatalogOpenInEditor({
  fonts,
  handleFontsUploaded,
  selectOrAddFontsourceFont,
  safeSelectFont,
  setClosedLibraryFontIds,
  mainTab,
  setMainTab,
  setEmptySlotIds,
  setFontsLibraryTab,
  fileInputRef,
  setFileUploadTarget,
}: UseCatalogOpenInEditorParams) {
  const focusExisting = useCallback(
    (font: SessionFontRecord) => {
      focusSessionFontInEditor(font, { setClosedLibraryFontIds, safeSelectFont, setMainTab });
    },
    [safeSelectFont, setClosedLibraryFontIds, setMainTab],
  );
  const { handleFontsUploadedWithNav, selectOrAddFontsourceFontWithNav } = useEditorFontNav({
    handleFontsUploaded,
    selectOrAddFontsourceFont,
    mainTab,
    setMainTab,
    setEmptySlotIds,
    setClosedLibraryFontIds,
    setFontsLibraryTab,
  });

  const openGoogleCatalogEntryInEditorTab = useCallback(
    async (catalogEntry: GoogleCatalogEntry) => {
      if (!catalogEntry?.family) return;
      const family = String(catalogEntry.family);
      const existing = findGoogleFontInSession(fonts, family) || findCatalogFontInSession(fonts, family);
      if (existing) {
        focusExisting(existing);
        return;
      }
      try {
        const subsetList = Array.isArray(catalogEntry.subsets) ? catalogEntry.subsets : [];
        const defaultSubset = resolveDefaultCatalogSubset(subsetList);
        const loadSubsets = subsetList.length > 0 ? [defaultSubset] : undefined;
        const googleFontRecommendedSample = hasGoogleScriptGlyphSample(catalogEntry)
          ? buildGoogleFontGlyphSampleText(catalogEntry)
          : undefined;
        const useVariable = catalogEntry.isVariable === true;
        const slices = useVariable
          ? await fetchGoogleVariableFontSlicesAll(family, {
              subsets: loadSubsets,
              ...(catalogEntry.wghtMin != null && catalogEntry.wghtMax != null
                ? { wghtMin: catalogEntry.wghtMin, wghtMax: catalogEntry.wghtMax }
                : {}),
            })
          : await fetchGoogleStaticFontSlicesAll(family, {
              weight: 400,
              italic: false,
              subsets: loadSubsets,
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
              catalogSubsets: subsetList,
              activeSubset: defaultSubset,
            },
          ],
          { silent: true },
        );
      } catch {
        toast.error(`Не удалось открыть ${family}`);
      }
    },
    [focusExisting, fonts, handleFontsUploadedWithNav],
  );

  const openFontsourceSlugInEditorTab = useCallback(
    async (slug: string, isVariable?: boolean) => {
      const key = String(slug || '').trim();
      if (!key) return null;
      const existing = findFontsourceFontInSession(fonts, key) || findCatalogFontInSession(fonts, key);
      if (existing) {
        focusExisting(existing);
        return existing;
      }
      // Предпочитаем VF, если он доступен у семейства.
      // Если у семейства нет variable-пакета, загрузчик корректно упадёт обратно в static.
      return selectOrAddFontsourceFontWithNav(key, true, { silent: true });
    },
    [focusExisting, fonts, selectOrAddFontsourceFontWithNav],
  );

  const openFontshareSlugInEditorTab = useCallback(
    async (slug: string) => {
      const key = String(slug || '').trim();
      if (!key) return;
      const existing = findFontshareFontInSession(fonts, key);
      if (existing) {
        focusExisting(existing);
        return;
      }
      const item =
        readFontshareCatalogCache().find(
          (row) => String(row?.slug || row?.id || '').trim().toLowerCase() === key.toLowerCase(),
        ) || null;
      if (!item) {
        toast.error('Шрифт не найден в каталоге Fontshare');
        return;
      }
      try {
        const slice = await fetchFontshareEditorSliceBlob(item);
        const blob = slice?.blob;
        if (!(blob instanceof Blob) || blob.size === 0) throw new Error('Пустой файл');
        await handleFontsUploadedWithNav(
          [
            {
              file: blob,
              name: slice.name,
              source: 'fontshare',
              fontshareSlug: key,
              fontshareLicenseType: item.licenseType,
            },
          ],
          { silent: true },
        );
      } catch {
        toast.error(`Не удалось открыть ${item.family || key}`);
      }
    },
    [focusExisting, fonts, handleFontsUploadedWithNav],
  );

  const openFontfabricTrialPage = useCallback((item: { trialUrl?: string }) => {
    const url = String(item?.trialUrl || '').trim();
    if (!url || typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const uploadFontfabricTrialRef = useRef<string | null>(null);
  const onUploadFontfabricTrial = useCallback(
    (item: { family?: string }) => {
      uploadFontfabricTrialRef.current = item?.family || null;
      setFileUploadTarget('editor');
      fileInputRef.current?.click();
    },
    [fileInputRef, setFileUploadTarget],
  );

  return {
    handleFontsUploadedWithNav,
    selectOrAddFontsourceFontWithNav,
    openGoogleCatalogEntryInEditorTab,
    openFontsourceSlugInEditorTab,
    openFontshareSlugInEditorTab,
    openFontfabricTrialPage,
    uploadFontfabricTrialRef,
    onUploadFontfabricTrial,
  };
}
