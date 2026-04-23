import fs from 'fs/promises'; // Используем промисы для асинхронности
import path from 'path';
import { findFontsourcePackagePath } from '../../../utils/serverUtils'; // Нам понадобится утилита для поиска пакета
import { slugifyFontKey } from '../../../utils/fontSlug';
import { buildFontsourceHandlerMetadata } from '../../../utils/fontsourceApiNormalize';

// --- Вспомогательная функция для преобразования буфера в base64 --- 
// (На клиенте будем декодировать обратно в ArrayBuffer)
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

async function fetchRemoteMetadata(slug) {
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

      return buildFontsourceHandlerMetadata(row, slug, 'fontsource-package-metadata', {
        coerceVariableToBoolean: false,
      });
    } catch (error) {
      // Пробуем следующий источник
    }
  }

  // Последний fallback: короткий API Fontsource (может дать variable как boolean)
  try {
    const response = await fetch(`https://api.fontsource.org/v1/fonts/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      return null;
    }

    const row = await response.json();
    if (!row || typeof row !== 'object') {
      return null;
    }

    return buildFontsourceHandlerMetadata(row, slug, 'fontsource-api', {
      coerceVariableToBoolean: true,
    });
  } catch (error) {
    return null;
  }
}

async function fetchRemoteFontFileFromCdn(slug, subset, weight, style) {
  const candidates = [
    `${slug}-${subset}-${weight}-${style}.woff2`,
    `${slug}-latin-${weight}-${style}.woff2`,
    `${slug}-cyrillic-${weight}-${style}.woff2`,
    `${slug}-greek-${weight}-${style}.woff2`,
    `${slug}-${subset}-400-${style}.woff2`,
    `${slug}-${subset}-${weight}-normal.woff2`,
    `${slug}-latin-400-normal.woff2`,
    `${slug}-cyrillic-400-normal.woff2`,
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
    } catch (error) {
      // Продолжаем перебор кандидатов
    }
  }

  return null;
}

export default async function handler(req, res) {
  // Извлекаем основные параметры запроса
  const { fontFamily } = req.query;
  const weight = req.query.weight || '400'; // Используем 400 как значение по умолчанию
  const style = req.query.style || 'normal'; // Используем normal как значение по умолчанию
  const subset = req.query.subset || 'latin'; // Используем latin как значение по умолчанию
  const metaOnly = req.query.meta === 'true'; // Проверяем, нужны ли только метаданные

  if (!fontFamily) {
    console.error(`[FontsourceAPI] Отсутствует fontFamily в запросе`);
    return res.status(400).json({ error: 'fontFamily обязателен' });
  }

  try {
    const slug = slugifyFontKey(fontFamily);
    const packagePath = await findFontsourcePackagePath(slug, { silent: true });
    
    let metadata = null;
    let fontFile = null;
    let actualFileName = null;

    if (packagePath) {
      // Читаем метаданные локального пакета
      const metadataPath = path.join(packagePath, 'metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metadataContent);

      // Если запрошены только метаданные, возвращаем их
      if (metaOnly) {
        return res.status(200).json(metadata);
      }

      // Логика поиска файла шрифта в локальном пакете
      const filesDir = path.join(packagePath, 'files');
      await fs.access(filesDir);

      // Строим предполагаемое имя файла
      const expectedFileName = `${slug}-${subset}-${weight}-${style}.woff2`;
      const expectedFilePath = path.join(filesDir, expectedFileName);

      // Сначала пробуем точное совпадение
      try {
        await fs.access(expectedFilePath);
        fontFile = await fs.readFile(expectedFilePath);
        actualFileName = expectedFileName;
      } catch (error) {
        const allFiles = await fs.readdir(filesDir);

        // Пробуем разные комбинации параметров
        const searchPatterns = [
          `${slug}-latin-${weight}-${style}.woff2`,
          `${slug}-cyrillic-${weight}-${style}.woff2`,
          `${slug}-greek-${weight}-${style}.woff2`,
          `${slug}-${subset}-400-${style}.woff2`,
          `${slug}-${subset}-${weight}-normal.woff2`,
          `${slug}-latin-400-normal.woff2`,
          `${slug}-cyrillic-400-normal.woff2`,
        ];

        for (const pattern of searchPatterns) {
          const patternPath = path.join(filesDir, pattern);
          try {
            await fs.access(patternPath);
            fontFile = await fs.readFile(patternPath);
            actualFileName = pattern;
            break;
          } catch (patternError) {
            // Продолжаем поиск
          }
        }

        // Если ничего не нашли с точными паттернами, ищем любой подходящий файл
        if (!fontFile) {
          const fontNameRegex = new RegExp(`^${slug}-.*\\.woff2$`, 'i');
          const matchingFiles = allFiles.filter((file) => fontNameRegex.test(file));

          if (matchingFiles.length > 0) {
            const firstMatchingFile = matchingFiles[0];
            const firstMatchingPath = path.join(filesDir, firstMatchingFile);
            fontFile = await fs.readFile(firstMatchingPath);
            actualFileName = firstMatchingFile;
          }
        }
      }
    } else {
      // Если локальный пакет отсутствует, работаем через Fontsource API/CDN
      metadata = await fetchRemoteMetadata(slug);
      if (!metadata) {
        console.error(`[FontsourceAPI] Метаданные для ${slug} не найдены ни локально, ни в удалённом API`);
        return res.status(404).json({ error: `Метаданные для ${slug} не найдены` });
      }

      if (metaOnly) {
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

    // Возвращаем результат
    const result = {
      metadata,
      fontData: bufferToBase64(fontFile),
      actualFileName: actualFileName,
      requestedParams: { weight, style, subset }
    };

    res.status(200).json(result);

  } catch (error) {
    console.error(`[FontsourceAPI] ❌ Критическая ошибка при обработке ${fontFamily}:`, error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
  }
} 
