/**
 * API-маршрут для загрузки вариативных шрифтов из пакетов Fontsource
 * Проверяет наличие вариативного файла и возвращает его
 */

import fs from 'fs/promises';
import path from 'path';
import { slugifyFontKey } from '../../../../utils/fontSlug';
import { findFontsourcePackagePath } from '../../../../utils/serverUtils';

// Вспомогательная функция для преобразования буфера в base64
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

function collectJsdelivrFilePaths(files, basePath = '') {
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

function pickVariableCandidate(filePaths, slug, subset, style = 'normal') {
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

async function fetchRemoteVariableFile(packageName, slug, subset, style = 'normal') {
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
    const directUrl = `https://cdn.jsdelivr.net/npm/${packageName}/files/${fileName}`;
    try {
      const directRes = await fetch(directUrl);
      if (!directRes.ok) continue;
      const arr = await directRes.arrayBuffer();
      return {
        fileName,
        buffer: Buffer.from(arr),
      };
    } catch (error) {
      // Продолжаем перебор кандидатов
    }
  }

  const packageMetaUrl = `https://data.jsdelivr.com/v1/package/npm/${encodeURIComponent(packageName)}`;
  const packageMetaRes = await fetch(packageMetaUrl);
  if (!packageMetaRes.ok) return null;

  const packageMeta = await packageMetaRes.json();
  const latestVersion = String(packageMeta?.tags?.latest || '').trim();
  if (!latestVersion) return null;

  const listingUrl = `https://data.jsdelivr.com/v1/package/npm/${encodeURIComponent(`${packageName}@${latestVersion}`)}`;
  const listingRes = await fetch(listingUrl);
  if (!listingRes.ok) return null;
  const listing = await listingRes.json();
  const allPaths = collectJsdelivrFilePaths(listing?.files || []);
  const selectedPath = pickVariableCandidate(allPaths, slug, subset, targetStyle);
  if (!selectedPath) return null;

  const fontUrl = `https://cdn.jsdelivr.net/npm/${packageName}${selectedPath}`;
  const fontRes = await fetch(fontUrl);
  if (!fontRes.ok) return null;

  const arr = await fontRes.arrayBuffer();
  return {
    fileName: selectedPath.split('/').pop() || `${slug}-${subset}-wght-normal.woff2`,
    buffer: Buffer.from(arr),
  };
}

export default async function handler(req, res) {
  try {
    // Получаем имя шрифта из URL
    const { fontFamily } = req.query;
    const subset = req.query.subset || 'latin'; // По умолчанию используем latin
    const style = req.query.style === 'italic' ? 'italic' : 'normal';
    // Проверяем, запрашивается ли явно вариативный шрифт
    const forceVariableRequest = req.query.forceVariable === 'true';
    
    if (!fontFamily || typeof fontFamily !== 'string') {
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

      // Ищем вариативный файл среди локальных файлов пакета
      variableFontFile = files.find(file =>
        file.includes(`${packageName}-${subset}`) &&
        (file.includes(`-${style}.`) || file.includes('variable') || file.endsWith('.variable.woff2') ||
         file.includes('-full-') || file.includes('-standard-') ||
         file.includes('-wght-') || file.includes('-VF.') || file.includes('VF-'))
      );

      if (!variableFontFile) {
        variableFontFile = files.find(file =>
          file.includes(`${packageName}-${subset}`) &&
          (file.includes(`-wght-${style}.`) || file.includes('-wght.'))
        );
      }

      if (!variableFontFile) {
        variableFontFile = files.find((file) => /full|standard|wght|variable|vf/i.test(file));
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
      const remotePackages = [
        `@fontsource-variable/${packageName}`,
        `@fontsource/${packageName}`,
      ];

      for (const npmPackage of remotePackages) {
        try {
          const remote = await fetchRemoteVariableFile(npmPackage, packageName, subset, style);
          if (remote) {
            variableFontFile = remote.fileName;
            fontBuffer = remote.buffer;
            break;
          }
        } catch (remoteErr) {
          console.warn(`[API Variable] Ошибка remote fallback ${npmPackage}:`, remoteErr?.message || remoteErr);
        }
      }
    }

    if (!fontBuffer || !variableFontFile) {
      console.error(`[API Variable] Вариативный файл шрифта для ${packageName} не найден ни локально, ни через CDN.`);
      return res.status(404).json({ error: `Вариативный файл шрифта для ${packageName} не найден.` });
    }
    
    // Отправляем ответ с данными шрифта
    res.status(200).json({
      fontBufferBase64: bufferToBase64(fontBuffer),
      fileName: variableFontFile,
      subset: subset,
      style,
      isVariable: true
    });
    
  } catch (error) {
    console.error('[API Variable] Непредвиденная ошибка:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при получении вариативного шрифта'
    });
  }
} 
