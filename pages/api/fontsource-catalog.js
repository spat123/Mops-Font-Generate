import fs from 'fs/promises';
import path from 'path';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';

function slugToLabel(slug) {
  return slug
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Установленные пакеты @fontsource/* из package.json (корень проекта).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const raw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const items = [];
    for (const name of Object.keys(deps)) {
      if (!name.startsWith('@fontsource/')) continue;
      const slug = name.slice('@fontsource/'.length);
      if (!slug) continue;
      items.push({ slug, label: slugToLabel(slug) });
    }
    items.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ items });
  } catch (e) {
    console.error('[fontsource-catalog]', e);
    return res.status(500).json({ error: 'Internal error', details: e.message });
  }
}
