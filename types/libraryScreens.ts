import type { LibrarySharePayload } from '../utils/libraryShareLink';
import type { SiteSeoMeta } from '../utils/siteSeo';

/** Пропсы экрана «Все шрифты» (собираются в `useEditorHomePage` / `buildEditorHomeLayoutProps`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FontsLibraryHomeScreenProps = any;

export type LibrarySharePageProps = {
  seo: SiteSeoMeta;
  initialPayload?: LibrarySharePayload | null;
};
