/**
 * API-маршрут для загрузки вариативных шрифтов из пакетов Fontsource
 * Проверяет наличие вариативного файла и возвращает его
 */

import fs from 'fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { slugifyFontKey } from '../../../../utils/fontSlug';
import { findFontsourcePackagePath } from '../../../../utils/serverUtils';
import { applyFontsourceFontCacheHeaders } from '../../../../utils/fontsourceApiCache';
import { nodeBufferToBase64 } from '../../../../utils/base64Utils';

type JsdelivrFileNode = {
  name?: string;
  type?: string;
  files?: JsdelivrFileNode[];
};

const REMOTE_FONT_FETCH_TIMEOUT_MS = 25_000;
const REMOTE_LISTING_FETCH_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function collectJsdelivrFilePaths(files: JsdelivrFileNode[] | unknown, basePath = ''): string[] {
  if (!Array.isArray(files)) return [];
  const result = [];
  for (const node of files) {
    if (!node || typeof node !== 'object') continue;
    const nodePath = `${basePath}/${String(node.name || '').trim()}`.replace(/\/+/g, '/');
    if (node.type === 'file') {
      result.push(nodePath);
      continue;
    }
    if (Array.isArray(node.files)) {
      result.push(...collectJsdelivrFilePaths(node.files, nodePath));
    }
  }
  return result;
}

function pickVariableCandidate(filePaths: string[], slug: string, subset: string, style = 'normal') {
  const woff2 = filePaths.filter((p) => p.startsWith('/files/') && p.toLowerCase().endsWith('.woff2'));
  if (woff2.length === 0) return null;
  const targetStyle = style === 'italic' ? 'italic' : 'normal';
  const fallbackStyle = targetStyle === 'italic' ? 'normal' : 'italic';

  const preferred = [
    // Сначала многоосевые файлы (full/standard/variable), чтобы работали wdth/opsz/... а не только wght
    new RegExp(`^/files/${slug}-${subset}-(?:full|standard|variable)-${targetStyle}\\.woff2$`, 'i'),
    new RegExp(`^/files/${slug}-latin-(?:full|standard|variable)-${targetStyle}\\.woff2$`, 'i'),
    new RegExp(`^/files/${slug}-${subset}-wght-${targetStyle}\\.woff2$`, 'i'),
    new RegExp(`^/files/${slug}-latin-wght-${targetStyle}\\.woff2$`, 'i'),
    new RegExp(`^/files/${slug}-${subset}-(?:[a-z]{4}-)*wght-${targetStyle}\\.woff2$`, 'i'),
    new RegExp(`^/files/${slug}-latin-(?:[a-z]{4}-)*wght-${targetStyle}\\.woff2$`, 'i'),
    // fallback на opposite-style, чтобы не падать при отсутствии требуемого файла
    new RegExp(`^/files/${slug}-${subset}-(?:full|standard|variable)-${fallbackStyle}\\.woff2$`, 'i'),
    new RegExp(`^/files/${slug}-latin-(?:full|standard|variable)-${fallbackStyle}\\.woff2$`, 'i'),
    new RegExp(`^/files/${slug}-${subset}-wght-${fallbackStyle}\\.woff2$`, 'i'),
    new RegExp(`^/files/${slug}-latin-wght-${fallbackStyle}\\.woff2$`, 'i'),
  ];

  for (const re of preferred) {
    const exact = woff2.find((p) => re.test(p));
    if (exact) return exact;
  }

  const bySubset = woff2.find((p) => p.includes(`/${slug}-${subset}-`) && /full|standard|wght|variable|vf/i.test(p));
  if (bySubset) return bySubset;

  const byLatin = woff2.find((p) => p.includes(`/${slug}-latin-`) && /full|standard|wght|variable|vf/i.test(p));
  if (byLatin) return byLatin;

  const anyVariableLike = woff2.find((p) => /full|standard|wght|variable|vf/i.test(p));
  if (anyVariableLike) return anyVariableLike;

  return woff2[0] || null;
}

function isVariableLikeFontFileName(fileName: string): boolean {
  const s = String(fileName || '').toLowerCase();
  if (!s.endsWith('.woff2')) return false;
  // Вариативные файлы в Fontsource почти всегда содержат один из маркеров:
  // full/standard/variable/vf или wght (ось веса).
  return /\b(full|standard|variable|vf)\b/.test(s) || /-wght-/.test(s);
}

async function fetchRemoteVariableFile(
  packageName: string,
  slug: string,
  subset: string,
  style = 'normal',
): Promise<{ fileName: string; buffer: Buffer } | null> {
  const targetStyle = style === 'italic' ? 'italic' : 'normal';
  const fallbackStyle = targetStyle === 'italic' ? 'normal' : 'italic';
  const directCandidates = [
    `${slug}-${subset}-full-${targetStyle}.woff2`,
    `${slug}-latin-full-${targetStyle}.woff2`,
    `${slug}-${subset}-standard-${targetStyle}.woff2`,
    `${slug}-latin-standard-${targetStyle}.woff2`,
    `${slug}-${subset}-variable.woff2`,
    `${slug}-latin-variable.woff2`,
    `${slug}-${subset}-wght-${targetStyle}.woff2`,
    `${slug}-latin-wght-${targetStyle}.woff2`,
    `${slug}-${subset}-wght-${fallbackStyle}.woff2`,
    `${slug}-latin-wght-${fallbackStyle}.woff2`,
  ];

  for (const fileName of directCandidates) {
    const cdnUrls = [
      `https://cdn.jsdelivr.net/npm/${packageName}/files/${fileName}`,
      `https://unpkg.com/${packageName}/files/${fileName}`,
    ];
    for (const directUrl of cdnUrls) {
      try {
        const directRes = await fetchWithTimeout(directUrl, REMOTE_FONT_FETCH_TIMEOUT_MS);
        if (!directRes.ok) continue;
        const arr = await directRes.arrayBuffer();
        return {
          fileName,
          buffer: Buffer.from(arr),
        };
      } catch (error) {
        // Продолжаем перебор кандидатов/зеркал
      }
    }
  }

  const packageMetaUrl = `https://data.jsdelivr.com/v1/package/npm/${encodeURIComponent(packageName)}`;
  const packageMetaRes = await fetchWithTimeout(packageMetaUrl, REMOTE_LISTING_FETCH_TIMEOUT_MS);
  if (!packageMetaRes.ok) return null;

  const packageMeta = (await packageMetaRes.json()) as { tags?: { latest?: string } };
  const latestVersion = String(packageMeta?.tags?.latest || '').trim();
  if (!latestVersion) return null;

  const listingUrl = `https://data.jsdelivr.com/v1/package/npm/${encodeURIComponent(`${packageName}@${latestVersion}`)}`;
  const listingRes = await fetchWithTimeout(listingUrl, REMOTE_LISTING_FETCH_TIMEOUT_MS);
  if (!listingRes.ok) return null;
  const listing = (await listingRes.json()) as { files?: JsdelivrFileNode[] };
  const allPaths = collectJsdelivrFilePaths(listing?.files || []);
  const selectedPath = pickVariableCandidate(allPaths, slug, subset, targetStyle);
  if (!selectedPath) return null;

  const fontUrls = [
    `https://cdn.jsdelivr.net/npm/${packageName}${selectedPath}`,
    `https://unpkg.com/${packageName}${selectedPath.replace(/^\/files\//, '/files/')}`,
  ];
  let fontRes: Response | null = null;
  for (const u of fontUrls) {
    try {
      const res = await fetchWithTimeout(u, REMOTE_FONT_FETCH_TIMEOUT_MS);
      if (!res.ok) continue;
      fontRes = res;
      break;
    } catch {
      // try next mirror
    }
  }
  if (!fontRes) return null;

  const arr = await fontRes.arrayBuffer();
  return {
    fileName: selectedPath.split('/').pop() || `${slug}-${subset}-wght-normal.woff2`,
    buffer: Buffer.from(arr),
  };
}

function firstQueryString(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  return '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const fontFamily = firstQueryString(req.query.fontFamily);
    const subset = firstQueryString(req.query.subset) || 'latin';
    const style = req.query.style === 'italic' ? 'italic' : 'normal';
    // Проверяем, запрашивается ли явно вариативный шрифт
    const forceVariableRequest = req.query.forceVariable === 'true';
    const debug = req.query.debug === 'true';
    const pick = firstQueryString(req.query.pick);
    
    if (!fontFamily) {
      return res.status(400).json({ 
        error: 'Не указано или неверно указано имя шрифта'
      });
    }
    
    // Нормализуем имя шрифта для поиска пакета
    const packageName = slugifyFontKey(fontFamily);

    // Шаг 1: Пробуем найти пакет в зависимости от параметра forceVariableRequest
    let packagePath;
    let variableFontFile = null;
    let fontBuffer = null;
    let pickedFrom: 'local' | 'remote' | null = null;
    let pickedReason: string | null = null;
    let remotePackageUsed: string | null = null;
    const remoteErrors: Array<{ npmPackage: string; error: string }> = [];
    if (forceVariableRequest) {
      // Если явно запрошен вариативный шрифт, ищем только @fontsource-variable пакет
      packagePath = await findFontsourcePackagePath(`variable/${packageName}`, { silent: true });
      if (!packagePath) {
        console.warn(`[API Variable] Вариативный пакет @fontsource-variable/${packageName} не найден локально, пробуем CDN fallback.`);
      }
    } else {
      // Сначала проверяем вариативный пакет
      packagePath = await findFontsourcePackagePath(`variable/${packageName}`, { silent: true });
      
      // Если вариативный не найден, проверяем обычный
      if (!packagePath) {
        packagePath = await findFontsourcePackagePath(packageName, { silent: true });
        
        if (!packagePath) {
          console.error(`[API Variable] Пакеты @fontsource-variable/${packageName} и @fontsource/${packageName} не найдены.`);
          return res.status(404).json({ error: `Пакеты для ${packageName} не найдены.` });
        }
      }
    }
    
    if (packagePath) {
      const filesDirPath = path.join(packagePath, 'files');
      let files;
      try {
        files = await fs.readdir(filesDirPath);
      } catch (e) {
        console.error(`[API Variable] Ошибка чтения директории ${filesDirPath}:`, e);
        files = [];
      }

      // Ищем ТОЛЬКО variadic/VF-файлы. Раньше тут был баг: условие `-${style}.` матчило любой static
      // (`montserrat-latin-100-normal.woff2`), и UI становился "Montserrat Thin".
      const woff2 = (Array.isArray(files) ? files : []).filter((f) => String(f).toLowerCase().endsWith('.woff2'));
      const bySubsetStyle = woff2.filter((file) => {
        const f = String(file);
        if (!f.includes(`${packageName}-${subset}`)) return false;
        if (!isVariableLikeFontFileName(f)) return false;
        return true;
      });
      variableFontFile =
        bySubsetStyle.find((f) => /-full-|-(standard|variable)-/i.test(f)) ||
        bySubsetStyle.find((f) => /-wght-/i.test(f)) ||
        bySubsetStyle[0] ||
        null;
      if (variableFontFile) {
        pickedFrom = 'local';
        pickedReason = 'subset-match';
      }

      if (!variableFontFile) {
        const byLatin = woff2.filter((file) => {
          const f = String(file);
          if (!f.includes(`${packageName}-latin`)) return false;
          if (!isVariableLikeFontFileName(f)) return false;
          return true;
        });
        variableFontFile =
          byLatin.find((f) => /-full-|-(standard|variable)-/i.test(f)) ||
          byLatin.find((f) => /-wght-/i.test(f)) ||
          byLatin[0] ||
          null;
        if (variableFontFile) {
          pickedFrom = 'local';
          pickedReason = 'latin-fallback';
        }
      }

      if (!variableFontFile) {
        variableFontFile = woff2.find((file) => isVariableLikeFontFileName(file)) || null;
        if (variableFontFile) {
          pickedFrom = 'local';
          pickedReason = 'any-variable-like';
        }
      }

      if (variableFontFile) {
        try {
          fontBuffer = await fs.readFile(path.join(filesDirPath, variableFontFile));
        } catch (e) {
          console.error(`[API Variable] Ошибка чтения локального файла шрифта:`, e);
          fontBuffer = null;
        }
      }
    }

    // Fallback к jsDelivr для случаев, когда пакет не установлен локально
    if (!fontBuffer) {
      const remotePackages = forceVariableRequest
        ? [`@fontsource-variable/${packageName}`]
        : [`@fontsource-variable/${packageName}`, `@fontsource/${packageName}`];

      for (const npmPackage of remotePackages) {
        try {
          const remote = await fetchRemoteVariableFile(npmPackage, packageName, subset, style);
          if (remote) {
            if (forceVariableRequest && !isVariableLikeFontFileName(remote.fileName)) {
              continue;
            }
            variableFontFile = remote.fileName;
            fontBuffer = remote.buffer;
            pickedFrom = 'remote';
            pickedReason = 'jsdelivr';
            remotePackageUsed = npmPackage;
            break;
          }
        } catch (remoteErr) {
          const message = remoteErr instanceof Error ? remoteErr.message : String(remoteErr);
          const causeCode = remoteErr && typeof remoteErr === 'object' ? (remoteErr as any)?.cause?.code : null;
          const detail = causeCode ? `${message} (${String(causeCode)})` : message;
          remoteErrors.push({ npmPackage, error: detail });
          console.warn(`[API Variable] Ошибка remote fallback ${npmPackage}:`, detail);
        }
      }
    }

    if (!fontBuffer || !variableFontFile) {
      const hadNetworkError = remoteErrors.some((e) =>
        /fetch failed|ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|network/i.test(String(e.error || '')),
      );
      if (hadNetworkError) {
        console.error(`[API Variable] Ошибка сети/CDN для ${packageName} (VF):`, remoteErrors);
        return res.status(503).json({
          error: `Не удалось скачать вариативный файл (ошибка сети/доступа к CDN).`,
          ...(debug ? { debug: { remoteErrors } } : {}),
        });
      }
      console.error(`[API Variable] Вариативный файл шрифта для ${packageName} не найден ни локально, ни через CDN.`);
      return res.status(404).json({ error: `Вариативный файл шрифта для ${packageName} не найден.` });
    }

    if (forceVariableRequest && !isVariableLikeFontFileName(variableFontFile)) {
      console.error(
        `[API Variable] Подобран не-VF файл при forceVariable=true: ${packageName} -> ${variableFontFile}`,
      );
      return res.status(404).json({ error: `Вариативный файл шрифта для ${packageName} не найден.` });
    }
    
    if (debug) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('CDN-Cache-Control', 'no-store');
    } else {
      applyFontsourceFontCacheHeaders(res);
    }
    const payload = {
      fontBufferBase64: nodeBufferToBase64(fontBuffer),
      fileName: variableFontFile,
      subset: subset,
      style,
      isVariable: true,
      ...(debug
        ? {
            debug: {
              pick: pick ? String(pick) : null,
              forceVariableRequest,
              pickedFrom,
              pickedReason,
              remotePackageUsed,
              isVariableLike: isVariableLikeFontFileName(variableFontFile),
            },
          }
        : {}),
    };
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[API Variable debug]', {
        fontFamily,
        packageName,
        subset,
        style,
        forceVariableRequest,
        pick: pick ? String(pick) : null,
        pickedFrom,
        pickedReason,
        remotePackageUsed,
        fileName: variableFontFile,
        isVariableLike: isVariableLikeFontFileName(variableFontFile),
        bufferBytes: typeof (fontBuffer as any)?.length === 'number' ? (fontBuffer as any).length : null,
      });
    }
    res.status(200).json(payload);
    
  } catch (error) {
    console.error('[API Variable] Непредвиденная ошибка:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при получении вариативного шрифта'
    });
  }
} 
