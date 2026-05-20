import React from 'react';
import { LibrarySharePage } from '../components/share/LibrarySharePage';
import { buildSharePageSeo, getSiteOrigin } from '../utils/siteSeo';
import { decodeLibrarySharePayloadFromQueryParam } from '../utils/libraryShareLinkServer';

export async function getServerSideProps({ req, query }) {
  const origin = getSiteOrigin(req);
  const shareParam = typeof query.share === 'string' ? query.share : '';
  const payload = shareParam ? decodeLibrarySharePayloadFromQueryParam(shareParam) : null;
  const seo = buildSharePageSeo({ origin, shareParam, payload });

  return {
    props: {
      seo,
    },
  };
}

export default function SharePage({ seo }) {
  return <LibrarySharePage seo={seo} />;
}
