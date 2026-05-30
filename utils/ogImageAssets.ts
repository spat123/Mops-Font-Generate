/** Пути к статике для /api/og/share (файлы в public/). */
export const SHARE_OG_LOGO_PATH = '/email-logo.png';
export const SHARE_OG_BACKGROUND_PATH = '/assets/Open%20Graph/Open%20One.jpg';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Загружает файл с origin и возвращает data: URL для Satori / ImageResponse. */
export async function fetchPublicAssetAsDataUrl(
  origin: string,
  publicPath: string,
): Promise<string | null> {
  const path = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  const url = `${String(origin).replace(/\/$/, '')}${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[og] asset fetch failed', url, res.status);
      return null;
    }
    const mime = res.headers.get('content-type') || guessMimeFromPath(path);
    const base64 = arrayBufferToBase64(await res.arrayBuffer());
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.error('[og] asset fetch error', url, e);
    return null;
  }
}

function guessMimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
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
