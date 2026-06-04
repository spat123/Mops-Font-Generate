import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { LibraryAuthProvider } from '../../contexts/LibraryAuthContext';
import { PlansDialog } from '../../components/ui/PlansDialog';
import { EditorHomeLayout } from '../../components/editor/EditorHomeLayout';
import { OpenGraphHead } from '../../components/seo/OpenGraphHead';
import { useEditorHomePage } from '../../hooks/useEditorHomePage';
import { getDefaultOgImageUrl, getSiteOrigin, type SiteSeoMeta } from '../../utils/siteSeo';

type FontsCatalogPageProps = {
  seo: SiteSeoMeta;
};

export const getServerSideProps: GetServerSideProps<FontsCatalogPageProps> = async ({ req }) => {
  const origin = getSiteOrigin(req);
  const canonicalUrl = `${origin}/fonts`;

  return {
    props: {
      seo: {
        title: 'Каталог шрифтов онлайн | DINAMIC FONT',
        description:
          'Каталог шрифтов DINAMIC FONT: откройте Google Fonts, Fontsource и другие семейства, проверьте текст, glyphs и Type Scale онлайн.',
        canonicalUrl,
        imageUrl: getDefaultOgImageUrl(origin),
        imageAlt: 'Каталог шрифтов DINAMIC FONT',
        siteName: 'DINAMIC FONT',
        type: 'website',
      },
    },
  };
};

export default function FontsCatalogPage({ seo }: FontsCatalogPageProps) {
  const router = useRouter();
  const { libraryAuthValue, isPlansOpen, setIsPlansOpen, layout } = useEditorHomePage(router, {
    routeInitialMainTab: 'library',
    routeInitialFontsLibraryTab: 'catalog',
  });

  return (
    <>
      <OpenGraphHead {...seo} />
      <LibraryAuthProvider value={libraryAuthValue}>
        <PlansDialog
          open={isPlansOpen}
          onClose={() => setIsPlansOpen(false)}
          currentPlan={libraryAuthValue.planName || (libraryAuthValue.isPro ? 'Pro' : 'Free')}
        />
        <EditorHomeLayout {...layout} />
      </LibraryAuthProvider>
    </>
  );
}
