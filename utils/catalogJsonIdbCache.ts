const DB_NAME = 'DinamicFontCatalogCache';
const DB_VERSION = 1;
const STORE_NAME = 'json';

let dbPromise: Promise<IDBDatabase> | null = null;

function openCatalogCacheDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
  return dbPromise;
}

export async function readCatalogJsonIdbCache<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): Promise<T | null> {
  try {
    const db = await openCatalogCacheDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(String(key || ''));
      req.onsuccess = () => {
        const value = req.result;
        resolve(typeof isValid === 'function' && isValid(value) ? value : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function writeCatalogJsonIdbCache(key: string, value: unknown): Promise<void> {
  try {
    const db = await openCatalogCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE_NAME).put(value, String(key || ''));
    });
  } catch {
    /* quota / private mode */
  }
}
