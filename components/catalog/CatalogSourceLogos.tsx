import type { ComponentType, ImgHTMLAttributes } from 'react';

type CatalogLogoImgProps = {
  src: string;
  alt: string;
  className?: string;
};

function CatalogLogoImg({ src, alt, className = 'h-5 w-auto max-h-5 select-none object-contain' }: CatalogLogoImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand marks in /public
    <img src={src} alt={alt} className={className} draggable={false} />
  );
}

type CatalogLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>;

export function GoogleCatalogLogo(props: CatalogLogoProps) {
  return <CatalogLogoImg src="/logo/catalog-google.svg" alt="Google Fonts" {...props} />;
}

export function FontsourceCatalogLogo(props: CatalogLogoProps) {
  return <CatalogLogoImg src="/logo/catalog-fontsource.svg" alt="Fontsource" {...props} />;
}

export function FontshareCatalogLogo(props: CatalogLogoProps) {
  return <CatalogLogoImg src="/logo/catalog-fontshare.svg" alt="Fontshare" {...props} />;
}

export function FontfabricTrialLogo(props: CatalogLogoProps) {
  return <CatalogLogoImg src="/logo/catalog-fontfabric.svg" alt="Fontfabric Trial" {...props} />;
}

export type CatalogSourceKey = 'google' | 'fontsource' | 'fontshare' | 'demo';

type CatalogSourceMeta = {
  Logo: ComponentType<CatalogLogoProps>;
  title: string;
  'aria-label': string;
};

const SOURCE_META: Record<CatalogSourceKey, CatalogSourceMeta> = {
  google: { Logo: GoogleCatalogLogo, title: 'Google Fonts', 'aria-label': 'Google Fonts' },
  fontsource: { Logo: FontsourceCatalogLogo, title: 'Fontsource', 'aria-label': 'Fontsource' },
  fontshare: { Logo: FontshareCatalogLogo, title: 'Fontshare', 'aria-label': 'Fontshare' },
  demo: { Logo: FontfabricTrialLogo, title: 'Fontfabric Trial', 'aria-label': 'Fontfabric — trial шрифты' },
};

export function getCatalogSourceMeta(source: string): CatalogSourceMeta | null {
  if (source in SOURCE_META) {
    return SOURCE_META[source as CatalogSourceKey];
  }
  return null;
}
