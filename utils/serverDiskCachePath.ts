import os from 'os';
import path from 'path';

/**
 * Каталог для серверного disk-cache (каталоги API).
 * В Docker/standalone `process.cwd()` часто read-only (`/app/.next/standalone`).
 */
export function resolveServerDiskCacheDir(): string {
  const fromEnv = String(process.env.FONT_CATALOG_CACHE_DIR || process.env.CACHE_DIR || '').trim();
  if (fromEnv) return fromEnv;

  const cwd = process.cwd();
  const inStandalone =
    cwd.includes(`${path.sep}.next${path.sep}standalone`) ||
    cwd.replace(/\\/g, '/').endsWith('/.next/standalone');

  if (inStandalone || process.env.NODE_ENV === 'production') {
    return path.join(os.tmpdir(), 'dinamic-font-cache');
  }

  return path.join(cwd, '.cache');
}

export function resolveServerDiskCacheFile(filename: string): string {
  return path.join(resolveServerDiskCacheDir(), filename);
}
