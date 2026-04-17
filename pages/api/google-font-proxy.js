/**
 * Прокси woff2 с fonts.gstatic.com (если у клиента нет CORS на прямой fetch).
 */
import { CHROME_UA } from '../../utils/googleFontsCssShared';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = typeof req.query.url === 'string' ? req.query.url : '';
  let u;
  try {
    u = new URL(decodeURIComponent(raw));
  } catch {
    try {
      u = new URL(raw);
    } catch {
      return res.status(400).json({ error: 'Invalid url' });
    }
  }

  if (u.protocol !== 'https:' || u.hostname !== 'fonts.gstatic.com') {
    return res.status(400).json({ error: 'Only https://fonts.gstatic.com/ URLs are allowed' });
  }

  try {
    const fontRes = await fetch(String(u), { headers: { 'User-Agent': CHROME_UA } });
    if (!fontRes.ok) {
      const st = fontRes.status >= 400 && fontRes.status < 600 ? fontRes.status : 502;
      return res.status(st).json({ error: 'Failed to fetch font file', status: fontRes.status });
    }
    const buf = Buffer.from(await fontRes.arrayBuffer());
    if (!buf.length) {
      return res.status(502).json({ error: 'Empty font response' });
    }
    res.setHeader('Content-Type', 'font/woff2');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buf);
  } catch (e) {
    console.error('[google-font-proxy]', e);
    return res.status(500).json({ error: 'Internal error', details: e.message });
  }
}
