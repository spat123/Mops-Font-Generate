import React from 'react';
import { LibrarySharePage } from '../components/share/LibrarySharePage';
import { buildSharePageSeo, getSiteOrigin } from '../utils/siteSeo';
import { resolveShareFromQuery } from '../lib/share/resolveShareFromQuery';

export async function getServerSideProps({ req, query }) {
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
}

export default function SharePage({ seo, initialPayload }) {
  return <LibrarySharePage seo={seo} initialPayload={initialPayload} />;
}
