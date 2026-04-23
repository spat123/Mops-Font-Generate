import fs from 'fs/promises';
import path from 'path';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';
import { titleCaseFromKebabSlug } from '../../utils/fontSlug';
import { compareFontFamilyName } from '../../utils/fontSort';
import {
  parseFontsourceSubsetStrings,
  parseFontsourceStyleStrings,
  parseFontsourceWeightNumbers,
} from '../../utils/fontsourceApiNormalize';

const FONTSOURCE_API_URL = 'https://api.fontsource.org/v1/fonts';
const SERVER_CACHE_TTL_MS = 1000 * 60 * 60;

let serverCache = {
  updatedAt: 0,
  items: null,
};

function normalizeRemoteItem(row) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || '').trim();
  const family = String(row.family || '').trim();
  if (!id || !family) return null;

  const weights = parseFontsourceWeightNumbers(row);
  const styles = parseFontsourceStyleStrings(row);
  const subsets = parseFontsourceSubsetStrings(row);

  return {
    id,
    slug: id,
    family,
    label: family,
    category: String(row.category || ''),
    primaryScript: String(row.type || ''),
    subsets,
    weights,
    styles,
    isVariable: Boolean(row.variable),
    hasItalic: styles.includes('italic'),
    styleCount: Math.max(1, (weights.length || 1) * (styles.length || 1)),
    source: 'fontsource',
  };
}

function normalizeRemoteItems(rows) {
  const normalized = (Array.isArray(rows) ? rows : [])
    .map(normalizeRemoteItem)
    .filter(Boolean);
  normalized.sort(compareFontFamilyName);
  return normalized;
}

async function readInstalledFontsourcePackages() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const items = [];

  for (const name of Object.keys(deps)) {
    if (!name.startsWith('@fontsource/')) continue;
    const slug = name.slice('@fontsource/'.length).trim();
    if (!slug) continue;
    const label = titleCaseFromKebabSlug(slug);
    items.push({
      id: slug,
      slug,
      family: label,
      label,
      category: '',
      primaryScript: 'package',
      subsets: [],
      weights: [],
      styles: [],
      isVariable: false,
      hasItalic: false,
      styleCount: 1,
      source: 'fontsource',
    });
  }

  items.sort(compareFontFamilyName);
  return items;
}

async function fetchRemoteFontsourceCatalog() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(FONTSOURCE_API_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    return normalizeRemoteItems(rows);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Полный каталог Fontsource (через API) с fallback на локально установленные пакеты.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  try {
    const now = Date.now();
    if (
      Array.isArray(serverCache.items) &&
      serverCache.items.length > 0 &&
      now - serverCache.updatedAt < SERVER_CACHE_TTL_MS
    ) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json({ items: serverCache.items, cached: true });
    }

    let items = [];
    try {
      items = await fetchRemoteFontsourceCatalog();
    } catch (remoteErr) {
      console.warn('[fontsource-catalog] remote fallback to package.json:', remoteErr?.message || remoteErr);
      items = await readInstalledFontsourcePackages();
    }

    serverCache = {
      updatedAt: now,
      items,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ items });
  } catch (e) {
    console.error('[fontsource-catalog]', e);
    return res.status(500).json({ error: 'Internal error', details: e.message });
  }
}
