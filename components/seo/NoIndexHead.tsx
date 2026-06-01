import Head from 'next/head';

export function NoIndexHead() {
  return (
    <Head>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="googlebot" content="noindex, nofollow, noarchive" />
    </Head>
  );
}
