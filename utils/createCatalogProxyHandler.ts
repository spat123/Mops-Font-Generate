import { jsonMethodNotAllowed } from './apiResponse';

export class CatalogProxyFetchError extends Error {
  httpStatus: number;
  status?: number;

  constructor(message: string, { httpStatus = 502, status }: { httpStatus?: number; status?: number } = {}) {
    super(message);
    this.name = 'CatalogProxyFetchError';
    this.httpStatus = httpStatus;
    this.status = status;
  }
}

type CatalogProxyRequest = { method?: string };
type CatalogProxyResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): unknown };
};

export type CreateCatalogProxyHandlerOptions = {
  logTag: string;
  cacheTtlMs: number;
  cacheControl: string;
  fetchTimeoutMs?: number;
  fetchItems: () => Promise<unknown[]>;
};

/** GET-прокси каталога с in-memory кэшем (Fontshare, Fontfabric trial, …). */
export function createCatalogProxyHandler({
  logTag,
  cacheTtlMs,
  cacheControl,
  fetchTimeoutMs = 45_000,
  fetchItems,
}: CreateCatalogProxyHandlerOptions) {
  let serverCache: { updatedAt: number; items: unknown[] | null } = {
    updatedAt: 0,
    items: null,
  };

  return async function catalogProxyHandler(req: CatalogProxyRequest, res: CatalogProxyResponse) {
    if (req.method !== 'GET') {
      return jsonMethodNotAllowed(res, 'GET');
    }

    try {
      const now = Date.now();
      if (
        Array.isArray(serverCache.items) &&
        serverCache.items.length > 0 &&
        now - serverCache.updatedAt < cacheTtlMs
      ) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', cacheControl);
        return res.status(200).json({ items: serverCache.items, cached: true });
      }

      const fetchPromise = fetchItems();
      // Важно: Promise.race не "подписывается" на losing-promise — чтобы не словить unhandled rejection.
      void fetchPromise.catch(() => {});
      const items = await Promise.race([
        fetchPromise,
        new Promise<unknown[]>((_, reject) => {
          setTimeout(() => reject(new CatalogProxyFetchError('Таймаут загрузки каталога', { httpStatus: 504 })), fetchTimeoutMs);
        }),
      ]);
      serverCache = { updatedAt: now, items };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', cacheControl);
      return res.status(200).json({ items, count: items.length });
    } catch (e) {
      console.error(`[${logTag}]`, e);
      if (e instanceof CatalogProxyFetchError) {
        return res.status(e.httpStatus).json({
          error: e.message,
          ...(e.status != null ? { status: e.status } : {}),
        });
      }
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: 'Internal error', details: message });
    }
  };
}
