/** Общие JSON-ответы для `pages/api` (Next.js). */

export function jsonMethodNotAllowed(res, allow) {
  if (allow) {
    res.setHeader('Allow', allow);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
