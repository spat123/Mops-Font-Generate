/** Общие JSON-ответы для `pages/api` (Next.js). */

type JsonResponse = {
  status(code: number): { json(body: unknown): unknown };
  setHeader(name: string, value: string): void;
};

export function jsonMethodNotAllowed(res: JsonResponse, allow?: string) {
  if (allow) {
    res.setHeader('Allow', allow);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
