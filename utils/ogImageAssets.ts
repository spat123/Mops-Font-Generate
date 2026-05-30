import { readFile } from 'fs/promises';
import path from 'path';
import {
  SHARE_OG_BACKGROUND_PATH,
  SHARE_OG_LOGO_HEIGHT,
  SHARE_OG_LOGO_PATH,
  SHARE_OG_LOGO_WIDTH,
} from './shareOgPaths';

export { SHARE_OG_LOGO_PATH, SHARE_OG_BACKGROUND_PATH, SHARE_OG_LOGO_WIDTH, SHARE_OG_LOGO_HEIGHT };

const SHARE_OG_LOGO_PARTS = ['logo', 'Logo Dinamic.svg'] as const;
const SHARE_OG_BACKGROUND_PARTS = ['assets', 'Open Graph', 'Open One.jpg'] as const;

export const LOGO_WIDTH = SHARE_OG_LOGO_WIDTH;
export const LOGO_HEIGHT = SHARE_OG_LOGO_HEIGHT;

function mimeFromExt(ext: string): string {
  const lower = ext.toLowerCase();
  if (lower === '.png') return 'image/png';
  if (lower === '.jpg' || lower === '.jpeg') return 'image/jpeg';
  if (lower === '.webp') return 'image/webp';
  if (lower === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function bufferToDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return bufferToDataUrl(Buffer.from(buffer), 'application/octet-stream');
}

async function readPublicFileAsDataUrl(parts: readonly string[]): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', ...parts);
    const buf = await readFile(filePath);
    return bufferToDataUrl(buf, mimeFromExt(path.extname(filePath)));
  } catch (e) {
    console.error('[og] read file failed', parts.join('/'), e);
    return null;
  }
}

async function fetchPublicAssetAsDataUrl(origin: string, publicPath: string): Promise<string | null> {
  const pathPart = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  const url = `${String(origin).replace(/\/$/, '')}${pathPart}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[og] asset fetch failed', url, res.status);
      return null;
    }
    const mime = res.headers.get('content-type') || mimeFromExt(path.extname(pathPart));
    const base64 = arrayBufferToBase64(await res.arrayBuffer());
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.error('[og] asset fetch error', url, e);
    return null;
  }
}

/** Логотип и фон OG: с диска (nodejs), при ошибке — fetch с origin. */
export async function loadShareOgImageAssets(origin: string): Promise<{
  logoDataUrl: string | null;
  backgroundDataUrl: string | null;
}> {
  let [logoDataUrl, backgroundDataUrl] = await Promise.all([
    readPublicFileAsDataUrl(SHARE_OG_LOGO_PARTS),
    readPublicFileAsDataUrl(SHARE_OG_BACKGROUND_PARTS),
  ]);

  if (!logoDataUrl) {
    logoDataUrl = await fetchPublicAssetAsDataUrl(origin, SHARE_OG_LOGO_PATH);
  }
  if (!backgroundDataUrl) {
    backgroundDataUrl = await fetchPublicAssetAsDataUrl(origin, SHARE_OG_BACKGROUND_PATH);
  }

  return { logoDataUrl, backgroundDataUrl };
}
