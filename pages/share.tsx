import type { GetServerSideProps } from 'next';
import { LibrarySharePage } from '../components/share/LibrarySharePage';
import { buildSharePageSeo, getSiteOrigin } from '../utils/siteSeo';
import type { SiteSeoMeta } from '../utils/siteSeo';
import { resolveShareFromQuery } from '../lib/share/resolveShareFromQuery';
import type { LibrarySharePayload } from '../utils/libraryShareLink';

type SharePageProps = {
  seo: SiteSeoMeta;
  initialPayload: LibrarySharePayload | null;
};

export const getServerSideProps: GetServerSideProps<SharePageProps> = async ({ req, query }) => {
  const origin = getSiteOrigin(req);
  const { payload, shortId, legacyShareParam } = await resolveShareFromQuery(query);
  const seo = buildSharePageSeo({
    origin,
    shortId,
    shareParam: legacyShareParam || '',
    payload,
  });

  return {
    props: {
      seo,
      initialPayload: payload,
    },
  };
};

export default function SharePage({ seo, initialPayload }: SharePageProps) {
  return <LibrarySharePage seo={seo} initialPayload={initialPayload} />;
}
