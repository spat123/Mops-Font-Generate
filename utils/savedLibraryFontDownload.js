import { toast } from './appNotify';
import { base64ToArrayBuffer } from './fontManagerUtils';
import {
  fetchGoogleStaticFontSlicesAll,
  fetchGoogleVariableFontSlicesAll,
} from './googleFontLoader';
import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import { createZipBlob } from './zipUtils';

function saveBlobAsFile(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function buildSafeFileBase(name, fallback = 'font') {
  return (
    String(name || fallback)
      .trim()
      .replace(/[^\p{L}\p{N}\-_.\s]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  );
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function getGoogleSlicesForDownload(entry) {
  const family = entry?.family;
  if (!family) return [];
  const subsetList = Array.isArray(entry.subsets) ? entry.subsets : [];
  const useVariable = entry.isVariable === true;
  const slices = useVariable
    ? await fetchGoogleVariableFontSlicesAll(family, {
        subsets: subsetList,
        ...(entry.wghtMin != null && entry.wghtMax != null
          ? { wghtMin: entry.wghtMin, wghtMax: entry.wghtMax }
          : {}),
      })
    : await fetchGoogleStaticFontSlicesAll(family, {
        weight: 400,
        italic: false,
        subsets: subsetList,
      });
  return Array.isArray(slices) ? slices.filter((slice) => slice?.blob?.size > 0) : [];
}

async function fetchGoogleVariableTtfBlob(family) {
  const response = await fetch(`/api/google-font-github-vf?family=${encodeURIComponent(family)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob || blob.size === 0) throw new Error('Пустой файл');
  return blob;
}

async function convertBlobToFormat(blob, format) {
  const targetFormat = String(format || 'woff2').toLowerCase();
  if (targetFormat === 'woff2') return blob;
  const sourceBuffer = await blob.arrayBuffer();
  const response = await fetch('/api/convert-font-format', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fontData: arrayBufferToBase64(sourceBuffer),
      targetFormat,
    }),
  });
  if (!response.ok) {
    let details = `HTTP ${response.status}`;
    try {
      const json = await response.json();
      details = json?.details || json?.error || details;
    } catch {
      // ignore
    }
    throw new Error(details);
  }
  const payload = await response.json();
  const outBase64 = payload?.data;
  if (!outBase64) throw new Error('Пустой ответ конвертера');
  const outBuffer = base64ToArrayBuffer(outBase64);
  const mimeType = `font/${
    targetFormat === 'otf' ? 'otf' : targetFormat === 'ttf' ? 'ttf' : targetFormat === 'woff' ? 'woff' : 'woff2'
  }`;
  return new Blob([outBuffer], { type: mimeType });
}

async function downloadGooglePackageZip(entry, { silent = false } = {}) {
  const family = entry?.family;
  if (!family) return false;
  try {
    const baseName = buildSafeFileBase(family, 'google-font');
    const slices = await getGoogleSlicesForDownload(entry);
    if (slices.length === 0) throw new Error('Нет файлов для упаковки');
    const files = slices.map((slice, index) => ({
      name: `${baseName}/web/${baseName}-${slice.style || 'normal'}-${slice.weight || 400}-${index + 1}.woff2`,
      data: slice.blob,
    }));
    if (entry?.isVariable === true) {
      try {
        const variableBlob = await fetchGoogleVariableTtfBlob(family);
        files.push({ name: `${baseName}/source/${baseName}-variable.ttf`, data: variableBlob });
      } catch {
        // optional source file
      }
    }
    const zipBlob = await createZipBlob(files);
    saveBlobAsFile(zipBlob, `${baseName}-package.zip`);
    if (!silent) toast.success(`Скачан пакет ${family}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось собрать пакет ${family}`);
    return false;
  }
}

async function downloadGoogleAsFormat(entry, format, { silent = false } = {}) {
  const family = entry?.family;
  if (!family) return false;
  const targetFormat = String(format || 'woff2').toLowerCase();
  try {
    const slices = await getGoogleSlicesForDownload(entry);
    const firstSlice = slices[0] || null;
    if (!firstSlice?.blob) throw new Error('Пустой файл');
    const converted = await convertBlobToFormat(firstSlice.blob, targetFormat);
    const baseName = buildSafeFileBase(family, 'google-font');
    saveBlobAsFile(converted, `${baseName}.${targetFormat}`);
    if (!silent) toast.success(`Скачан ${family} (${targetFormat.toUpperCase()})`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось конвертировать ${family} в ${targetFormat.toUpperCase()}`);
    return false;
  }
}

async function downloadGoogleVariableVariant(entry, { silent = false } = {}) {
  const family = entry?.family;
  if (!family || entry?.isVariable !== true) return false;
  try {
    const blob = await fetchGoogleVariableTtfBlob(family);
    const baseName = buildSafeFileBase(family, 'google-font');
    saveBlobAsFile(blob, `${baseName}-variable.ttf`);
    if (!silent) toast.success(`Скачан Variable ${family}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать Variable ${family}`);
    return false;
  }
}

async function downloadFontsourcePackageZip(item, { silent = false } = {}) {
  const slug = item?.id || item?.slug;
  if (!slug) return false;
  try {
    const files = [];
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    const staticResponse = await fetch(
      `/api/fontsource/${encodeURIComponent(slug)}?weight=400&style=normal&subset=latin`,
    );
    if (staticResponse.ok) {
      const payload = await staticResponse.json();
      const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
      const fileNameRaw = String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
      if (fontBufferBase64) {
        const ext = fileNameRaw.split('.').pop()?.toLowerCase() || 'woff2';
        const fileData = base64ToArrayBuffer(fontBufferBase64);
        files.push({
          name: `${baseName}/web/${buildSafeFileBase(fileNameRaw, `${baseName}.${ext}`)}`,
          data: fileData,
        });
      }
    }
    if (item?.isVariable) {
      try {
        const variableResponse = await fetch(
          `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`,
        );
        if (variableResponse.ok) {
          const payload = await variableResponse.json();
          const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
          const fileNameRaw = String(payload?.fileName || `${slug}-variable.woff2`);
          if (fontBufferBase64) {
            const fileData = base64ToArrayBuffer(fontBufferBase64);
            files.push({
              name: `${baseName}/source/${buildSafeFileBase(fileNameRaw, `${baseName}-variable.woff2`)}`,
              data: fileData,
            });
          }
        }
      } catch {
        // optional file
      }
    }
    if (files.length === 0) throw new Error('Нет файлов для упаковки');
    const zipBlob = await createZipBlob(files);
    saveBlobAsFile(zipBlob, `${baseName}-package.zip`);
    if (!silent) toast.success(`Скачан пакет ${item?.family || slug}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось собрать пакет ${item?.family || slug}`);
    return false;
  }
}

async function downloadFontsourceAsFormat(item, format, { silent = false } = {}) {
  const slug = item?.id || item?.slug;
  if (!slug) return false;
  const targetFormat = String(format || 'woff2').toLowerCase();
  try {
    const isVariable = Boolean(item?.isVariable);
    const apiUrl = isVariable
      ? `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`
      : `/api/fontsource/${encodeURIComponent(slug)}?weight=400&style=normal&subset=latin`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
    if (!fontBufferBase64) throw new Error('Пустой буфер');
    const sourceBuffer = base64ToArrayBuffer(fontBufferBase64);
    const sourceExt =
      String(payload?.fileName || payload?.actualFileName || '').split('.').pop()?.toLowerCase() || 'woff2';
    const sourceBlob = new Blob([sourceBuffer], {
      type: `font/${
        sourceExt === 'ttf' ? 'ttf' : sourceExt === 'otf' ? 'otf' : sourceExt === 'woff' ? 'woff' : 'woff2'
      }`,
    });
    const converted = await convertBlobToFormat(sourceBlob, targetFormat);
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    saveBlobAsFile(converted, `${baseName}.${targetFormat}`);
    if (!silent) toast.success(`Скачан ${item?.family || slug} (${targetFormat.toUpperCase()})`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось конвертировать ${item?.family || slug} в ${targetFormat.toUpperCase()}`);
    return false;
  }
}

async function downloadFontsourceVariableVariant(item, { silent = false } = {}) {
  const slug = item?.id || item?.slug;
  if (!slug || item?.isVariable !== true) return false;
  try {
    const apiUrl = `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
    if (!fontBufferBase64) throw new Error('Пустой буфер');
    const fontBuffer = base64ToArrayBuffer(fontBufferBase64);
    const fileNameRaw = String(payload?.fileName || `${slug}-variable.woff2`);
    const ext = fileNameRaw.split('.').pop()?.toLowerCase() || 'woff2';
    const mimeType = `font/${ext === 'ttf' ? 'ttf' : ext === 'otf' ? 'otf' : ext === 'woff' ? 'woff' : 'woff2'}`;
    const blob = new Blob([fontBuffer], { type: mimeType });
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    saveBlobAsFile(blob, `${baseName}-variable.${ext}`);
    if (!silent) toast.success(`Скачан Variable ${item?.family || slug}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать Variable ${item?.family || slug}`);
    return false;
  }
}

/**
 * Пропсы для {@link CatalogDownloadSplitButton} на карточке записи сохранённой библиотеки.
 * @returns {object | null} null — кнопку не показывать (локальный / сессия и т.п.)
 */
export function buildSavedLibraryDownloadSplitButtonProps(fontEntry) {
  if (!fontEntry || typeof fontEntry !== 'object') return null;
  const source = String(fontEntry.source || 'session').trim();
  const label = String(fontEntry.label || '').trim();
  const id = String(fontEntry.id || '').trim();

  if (source === 'google') {
    const family = label;
    const entry =
      readGoogleFontCatalogCache().find(
        (item) => String(item?.family || '').trim().toLowerCase() === family.toLowerCase(),
      ) || null;
    if (!entry?.family) {
      return {
        disabled: true,
        tone: 'light',
        className: '!w-auto max-w-[min(100%,12rem)]',
        primaryLabel: 'Скачать',
        primaryAriaLabel: `Скачать ${family}`,
        onPrimaryClick: () =>
          toast.info('Загрузите каталог Google Fonts, чтобы скачать этот шрифт из кэша'),
        menuItems: [],
      };
    }
    const name = entry.family;
    return {
      tone: 'light',
      className: '!w-auto max-w-[min(100%,12rem)]',
      primaryLabel: 'Скачать',
      primaryAriaLabel: `Скачать ${name}`,
      onPrimaryClick: () => void downloadGooglePackageZip(entry),
      menuItems: [
        { key: 'zip', label: 'ZIP (по умолчанию)', onSelect: () => void downloadGooglePackageZip(entry) },
        { key: 'ttf', label: 'TTF', onSelect: () => void downloadGoogleAsFormat(entry, 'ttf') },
        { key: 'otf', label: 'OTF', onSelect: () => void downloadGoogleAsFormat(entry, 'otf') },
        { key: 'woff', label: 'WOFF', onSelect: () => void downloadGoogleAsFormat(entry, 'woff') },
        { key: 'woff2', label: 'WOFF2', onSelect: () => void downloadGoogleAsFormat(entry, 'woff2') },
        {
          key: 'variable',
          label: 'Variable вариант',
          hidden: entry.isVariable !== true,
          onSelect: () => void downloadGoogleVariableVariant(entry),
        },
      ],
    };
  }

  if (source === 'fontsource') {
    const slug = id.startsWith('fontsource:') ? id.slice('fontsource:'.length) : '';
    if (!slug) return null;
    const list = readFontsourceCatalogCache();
    const item =
      (Array.isArray(list) ? list : []).find(
        (row) =>
          String(row?.id || row?.slug || '')
            .trim()
            .toLowerCase() === slug.toLowerCase(),
      ) || null;
    if (!item) {
      return {
        disabled: true,
        tone: 'light',
        className: '!w-auto max-w-[min(100%,12rem)]',
        primaryLabel: 'Скачать',
        primaryAriaLabel: `Скачать ${label || slug}`,
        onPrimaryClick: () =>
          toast.info('Загрузите каталог Fontsource, чтобы скачать этот шрифт из кэша'),
        menuItems: [],
      };
    }
    const display = item.family || label || slug;
    return {
      tone: 'light',
      className: '!w-auto max-w-[min(100%,12rem)]',
      primaryLabel: 'Скачать',
      primaryAriaLabel: `Скачать ${display}`,
      onPrimaryClick: () => void downloadFontsourcePackageZip(item),
      menuItems: [
        { key: 'zip', label: 'ZIP (по умолчанию)', onSelect: () => void downloadFontsourcePackageZip(item) },
        { key: 'ttf', label: 'TTF', onSelect: () => void downloadFontsourceAsFormat(item, 'ttf') },
        { key: 'otf', label: 'OTF', onSelect: () => void downloadFontsourceAsFormat(item, 'otf') },
        { key: 'woff', label: 'WOFF', onSelect: () => void downloadFontsourceAsFormat(item, 'woff') },
        { key: 'woff2', label: 'WOFF2', onSelect: () => void downloadFontsourceAsFormat(item, 'woff2') },
        {
          key: 'variable',
          label: 'Variable вариант',
          hidden: item.isVariable !== true,
          onSelect: () => void downloadFontsourceVariableVariant(item),
        },
      ],
    };
  }

  return null;
}
