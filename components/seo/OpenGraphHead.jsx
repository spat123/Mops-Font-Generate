import Head from 'next/head';

/**
 * Open Graph + Twitter Card для превью ссылок в мессенджерах и соцсетях.
 * URL картинки и canonical должны быть абсолютными (https://...).
 */
export function OpenGraphHead({
  title,
  description,
  canonicalUrl,
  imageUrl,
  imageWidth,
  imageHeight,
  imageType = 'image/png',
  imageAlt = 'DINAMIC FONT',
  siteName = 'DINAMIC FONT',
  type = 'website',
  locale = 'ru_RU',
  noIndex = false,
}) {
  const safeTitle = String(title || siteName).trim();
  const safeDescription = String(description || '').trim();

  return (
    <Head>
      <title>{safeTitle}</title>
      {safeDescription ? <meta name="description" content={safeDescription} /> : null}
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}

      <meta property="og:locale" content={locale} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={safeTitle} />
      {safeDescription ? <meta property="og:description" content={safeDescription} /> : null}
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
      {imageUrl ? <meta property="og:image:secure_url" content={imageUrl} /> : null}
      {imageUrl && imageWidth ? <meta property="og:image:width" content={String(imageWidth)} /> : null}
      {imageUrl && imageHeight ? <meta property="og:image:height" content={String(imageHeight)} /> : null}
      {imageUrl && imageType ? <meta property="og:image:type" content={imageType} /> : null}
      {imageUrl ? <meta property="og:image:alt" content={imageAlt} /> : null}

      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={safeTitle} />
      {safeDescription ? <meta name="twitter:description" content={safeDescription} /> : null}
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}
    </Head>
  );
}
