import fs from 'fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { findFontsourcePackagePath } from '../../../utils/serverUtils';
import { slugifyFontKey } from '../../../utils/fontSlug';
import { buildFontsourceHandlerMetadata } from '../../../utils/fontsourceApiNormalize';
import { applyFontsourceFontCacheHeaders, applyFontsourceMetadataCacheHeaders } from '../../../utils/fontsourceApiCache';
import { nodeBufferToBase64 } from '../../../utils/base64Utils';

function firstQueryString(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  return '';
}

async function fetchRemoteMetadata(slug: string) {
  const packageMetadataUrls = [
    `https://cdn.jsdelivr.net/npm/@fontsource-variable/${encodeURIComponent(slug)}/metadata.json`,
    `https://cdn.jsdelivr.net/npm/@fontsource/${encodeURIComponent(slug)}/metadata.json`,
  ];

  for (const url of packageMetadataUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const row = await response.json();
      if (!row || typeof row !== 'object') continue;

      // Сохраняем объект variable с осями — иначе VF-контролы в редакторе пустые.
      return row as Record<string, unknown>;
    } catch {
      // Пробуем следующий источник
    }
  }

  try {
    const response = await fetch(`https://api.fontsource.org/v1/fonts/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      return null;
    }

    const row = await response.json();
    if (!row || typeof row !== 'object') {
      return null;
    }

    return buildFontsourceHandlerMetadata(row as Record<string, unknown>, slug, 'fontsource-api', {
      coerceVariableToBoolean: true,
    });
  } catch {
    return null;
  }
}

async function fetchRemoteFontFileFromCdn(slug: string, subset: string, weight: string, style: string) {
  // Важно: НЕ подменяем weight (например 900 -> 400), иначе в UI "Black не Black".
  // Фоллбек допускаем только по subset (latin/cyrillic/greek) при том же weight/style.
  const candidates = [
    `${slug}-${subset}-${weight}-${style}.woff2`,
    ...(subset !== 'latin' ? [`${slug}-latin-${weight}-${style}.woff2`] : []),
    ...(subset !== 'cyrillic' ? [`${slug}-cyrillic-${weight}-${style}.woff2`] : []),
    ...(subset !== 'greek' ? [`${slug}-greek-${weight}-${style}.woff2`] : []),
  ];

  for (const fileName of candidates) {
    const url = `https://cdn.jsdelivr.net/npm/@fontsource/${encodeURIComponent(slug)}/files/${fileName}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }
      const arr = await response.arrayBuffer();
      return {
        fileName,
        fontBuffer: Buffer.from(arr),
      };
    } catch {
      // Продолжаем перебор кандидатов
    }
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const fontFamily = firstQueryString(req.query.fontFamily);
  const weight = firstQueryString(req.query.weight) || '400';
  const style = firstQueryString(req.query.style) || 'normal';
  const subset = firstQueryString(req.query.subset) || 'latin';
  const metaOnly = req.query.meta === 'true';
  const debug = req.query.debug === 'true';

  if (!fontFamily) {
    console.error(`[FontsourceAPI] Отсутствует fontFamily в запросе`);
    return res.status(400).json({ error: 'fontFamily обязателен' });
  }

  try {
    const slug = slugifyFontKey(fontFamily);
    const packagePath = await findFontsourcePackagePath(slug, { silent: true });

    let metadata: unknown = null;
    let fontFile: Buffer | null = null;
    let actualFileName: string | null = null;

    if (packagePath) {
      const metadataPath = path.join(packagePath, 'metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metadataContent);

      if (metaOnly) {
        applyFontsourceMetadataCacheHeaders(res);
        return res.status(200).json(metadata);
      }

      const filesDir = path.join(packagePath, 'files');
      await fs.access(filesDir);

      const requestedFileName = `${slug}-${subset}-${weight}-${style}.woff2`;
      const requestedFilePath = path.join(filesDir, requestedFileName);

      try {
        await fs.access(requestedFilePath);
        fontFile = await fs.readFile(requestedFilePath);
        actualFileName = requestedFileName;
      } catch {
        // Фоллбек только по subset (НЕ по weight).
        const searchPatterns = [
          ...(subset !== 'latin' ? [`${slug}-latin-${weight}-${style}.woff2`] : []),
          ...(subset !== 'cyrillic' ? [`${slug}-cyrillic-${weight}-${style}.woff2`] : []),
          ...(subset !== 'greek' ? [`${slug}-greek-${weight}-${style}.woff2`] : []),
        ];

        for (const pattern of searchPatterns) {
          const patternPath = path.join(filesDir, pattern);
          try {
            await fs.access(patternPath);
            fontFile = await fs.readFile(patternPath);
            actualFileName = pattern;
            break;
          } catch {
            // Продолжаем поиск
          }
        }
        // ВАЖНО: не подставляем “любой файл” как fallback — иначе UI выглядит как “Black не Black”.
      }
    } else {
      metadata = await fetchRemoteMetadata(slug);
      if (!metadata) {
        console.error(`[FontsourceAPI] Метаданные для ${slug} не найдены ни локально, ни в удалённом API`);
        return res.status(404).json({ error: `Метаданные для ${slug} не найдены` });
      }

      if (metaOnly) {
        applyFontsourceMetadataCacheHeaders(res);
        return res.status(200).json(metadata);
      }

      const remoteFont = await fetchRemoteFontFileFromCdn(slug, subset, weight, style);
      if (remoteFont) {
        fontFile = remoteFont.fontBuffer;
        actualFileName = remoteFont.fileName;
      }
    }

    if (!fontFile) {
      console.error(`[FontsourceAPI] ❌ Не найден ни один подходящий файл шрифта для ${slug}`);
      return res.status(404).json({ error: `Файл шрифта не найден для ${slug} ${weight} ${style} ${subset}` });
    }

    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[FontsourceAPI] font file', {
        slug,
        requested: { weight, style, subset },
        actualFileName,
        hasLocalPackage: Boolean(packagePath),
      });
    }

    const result = {
      metadata,
      fontData: nodeBufferToBase64(fontFile),
      actualFileName,
      requestedFileName: `${slug}-${subset}-${weight}-${style}.woff2`,
      requestedParams: { weight, style, subset },
    };

    applyFontsourceFontCacheHeaders(res);
    res.status(200).json(result);
  } catch (error) {
    console.error(`[FontsourceAPI] ❌ Критическая ошибка при обработке ${fontFamily}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', details: message });
  }
}
