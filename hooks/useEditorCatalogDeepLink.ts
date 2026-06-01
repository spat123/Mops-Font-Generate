import { useLayoutEffect } from 'react';
import type { NextRouter } from 'next/router';
import { readGoogleFontCatalogCache } from '../utils/googleFontCatalogCache';

const editorDeepLinkTasks = new Map<string, Promise<void>>();

type UseEditorCatalogDeepLinkParams = {
  router: NextRouter;
  openGoogleCatalogEntryInEditorTab: (entry: Record<string, unknown>) => Promise<void>;
  openFontsourceSlugInEditorTab: (slug: string, isVariable?: boolean) => Promise<unknown>;
};

/**
 * Открытие Google / Fontsource из query (`openGoogle`, `openFontsource`) после перехода с share/внешних ссылок.
 */
export function useEditorCatalogDeepLink({
  router,
  openGoogleCatalogEntryInEditorTab,
  openFontsourceSlugInEditorTab,
}: UseEditorCatalogDeepLinkParams): void {
  useLayoutEffect(() => {
    if (!router.isReady) return;
    const rawG = router.query.openGoogle;
    const rawFs = router.query.openFontsource;
    const family = typeof rawG === 'string' ? rawG.trim() : '';
    const slug = typeof rawFs === 'string' ? rawFs.trim() : '';
    const googleVarRaw = router.query.openGoogleVar;
    const googleVar =
      googleVarRaw === '1' ||
      googleVarRaw === 'true' ||
      (Array.isArray(googleVarRaw) && googleVarRaw.includes('true'));
    const fsVarRaw = router.query.fontsourceVar;
    const fsVar =
      fsVarRaw === '1' ||
      fsVarRaw === 'true' ||
      (Array.isArray(fsVarRaw) && fsVarRaw.includes('true'));

    if (!family && !slug) return;

    const linkKey = family ? `google:${family}:${googleVar ? '1' : '0'}` : `fontsource:${slug}:${fsVar ? '1' : '0'}`;
    const existingTask = editorDeepLinkTasks.get(linkKey);
    if (existingTask) return;

    const stripOpenQuery = async () => {
      const nextQuery = { ...router.query };
      delete nextQuery.openGoogle;
      delete nextQuery.openGoogleVar;
      delete nextQuery.openFontsource;
      delete nextQuery.fontsourceVar;
      const clean: Record<string, string | string[]> = {};
      Object.keys(nextQuery).forEach((k) => {
        const v = nextQuery[k];
        if (v === undefined || v === null) return;
        clean[k] = v;
      });
      await router.replace(
        { pathname: '/', query: Object.keys(clean).length ? clean : {} },
        undefined,
        { shallow: true },
      );
    };

    const task = (async () => {
      try {
        if (family) {
          const list = readGoogleFontCatalogCache();
          const cached = Array.isArray(list)
            ? list.find(
                (item) =>
                  String((item as { family?: string })?.family || '')
                    .trim()
                    .toLowerCase() === family.toLowerCase(),
              )
            : null;
          const entry = cached
            ? {
                ...(cached as Record<string, unknown>),
                isVariable:
                  googleVar && (cached as { isVariable?: boolean }).isVariable === true
                    ? true
                    : (cached as { isVariable?: boolean }).isVariable,
              }
            : { family, subsets: [], isVariable: Boolean(googleVar), styleCount: 0 };
          await openGoogleCatalogEntryInEditorTab(entry);
        } else if (slug) {
          await openFontsourceSlugInEditorTab(slug, fsVar);
        }
      } finally {
        await stripOpenQuery();
      }
    })();

    editorDeepLinkTasks.set(linkKey, task);
    void task.finally(() => {
      if (editorDeepLinkTasks.get(linkKey) === task) {
        editorDeepLinkTasks.delete(linkKey);
      }
    });
  }, [
    router,
    router.isReady,
    router.query.openGoogle,
    router.query.openGoogleVar,
    router.query.openFontsource,
    router.query.fontsourceVar,
    openGoogleCatalogEntryInEditorTab,
    openFontsourceSlugInEditorTab,
  ]);
}
