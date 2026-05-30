import {
  SHARE_OG_BACKGROUND_PATH,
  SHARE_OG_LOGO_HEIGHT,
  SHARE_OG_LOGO_PATH,
  SHARE_OG_LOGO_WIDTH,
} from './shareOgPaths';

export { SHARE_OG_LOGO_PATH, SHARE_OG_BACKGROUND_PATH, SHARE_OG_LOGO_WIDTH, SHARE_OG_LOGO_HEIGHT };

export const LOGO_WIDTH = SHARE_OG_LOGO_WIDTH;
export const LOGO_HEIGHT = SHARE_OG_LOGO_HEIGHT;

function extensionFromPublicPath(publicPath: string): string {
  const base = publicPath.split('?')[0].split('#')[0];
  const lastDot = base.lastIndexOf('.');
  return lastDot === -1 ? '' : base.slice(lastDot);
}

function mimeFromExt(ext: string): string {
  const lower = ext.toLowerCase();
  if (lower === '.png') return 'image/png';
  if (lower === '.jpg' || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower === '.webp') return 'image/webp';
  if (lower === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Статика с origin (работает на Vercel; public/ через fs в serverless недоступен). */
async function fetchPublicAssetAsDataUrl(origin: string, publicPath: string): Promise<string | null> {
  const pathPart = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  const url = `${String(origin).replace(/\/$/, '')}${pathPart}`;
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) {
      console.error('[og] asset fetch failed', url, res.status);
      return null;
    }
    const mime = res.headers.get('content-type') || mimeFromExt(extensionFromPublicPath(pathPart));
    const base64 = arrayBufferToBase64(await res.arrayBuffer());
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.error('[og] asset fetch error', url, e);
    return null;
  }
}

export async function loadShareOgImageAssets(origin: string): Promise<{
  logoDataUrl: string | null;
  backgroundDataUrl: string | null;
}> {
  const [logoDataUrl, backgroundDataUrl] = await Promise.all([
    fetchPublicAssetAsDataUrl(origin, SHARE_OG_LOGO_PATH),
    fetchPublicAssetAsDataUrl(origin, SHARE_OG_BACKGROUND_PATH),
  ]);
  return { logoDataUrl, backgroundDataUrl };
}
