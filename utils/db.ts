import type { SessionFontRecord } from '../types/editorFonts';

const DB_NAME = 'DinamicFontDB';
const DB_VERSION = 1;
const STORE_NAME = 'fonts';

type StoredFontRecord = SessionFontRecord & { file: Blob };

let dbPromise: Promise<IDBDatabase> | null = null;

function isStoredFontRecord(font: SessionFontRecord | null | undefined): font is StoredFontRecord {
  return Boolean(font?.id && font.file instanceof Blob);
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Ошибка открытия IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject(new Error('Ошибка открытия IndexedDB'));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
  return dbPromise;
}

export async function saveFont(fontObj: SessionFontRecord | null | undefined): Promise<void> {
  if (!isStoredFontRecord(fontObj)) {
    console.warn('Попытка сохранить некорректный fontObj в IndexedDB', fontObj);
    return;
  }
  if (fontObj.file.size === 0) {
    console.warn('Пропуск сохранения шрифта: пустой или невалидный Blob', fontObj.id, fontObj.name);
    return;
  }
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(fontObj);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = (event) => {
        console.error('Ошибка сохранения шрифта в IndexedDB:', (event.target as IDBRequest).error);
        reject(new Error('Ошибка сохранения шрифта'));
      };
    });
  } catch (error) {
    console.error('Не удалось выполнить транзакцию сохранения в IndexedDB:', error);
  }
}

export async function getAllFonts(): Promise<StoredFontRecord[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(((event.target as IDBRequest<StoredFontRecord[]>).result || []) as StoredFontRecord[]);
      };
      request.onerror = (event) => {
        console.error('Ошибка получения всех шрифтов из IndexedDB:', (event.target as IDBRequest).error);
        reject(new Error('Ошибка получения шрифтов'));
      };
    });
  } catch (error) {
    console.error('Не удалось выполнить транзакцию чтения из IndexedDB:', error);
    return [];
  }
}

export async function deleteFontDB(fontId: string | null | undefined): Promise<void> {
  if (!fontId) return;
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(fontId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = (event) => {
        console.error('Ошибка удаления шрифта из IndexedDB:', (event.target as IDBRequest).error);
        reject(new Error('Ошибка удаления шрифта'));
      };
    });
  } catch (error) {
    console.error('Не удалось выполнить транзакцию удаления из IndexedDB:', error);
  }
}

export async function deleteAllFontsDB(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = (event) => {
        console.error('Ошибка очистки хранилища шрифтов в IndexedDB:', (event.target as IDBRequest).error);
        reject(new Error('Ошибка очистки хранилища шрифтов'));
      };
    });
  } catch (error) {
    console.error('Не удалось выполнить транзакцию очистки хранилища IndexedDB:', error);
  }
}

export async function updateFontSettings(
  fontId: string | null | undefined,
  updates: Partial<SessionFontRecord> | null | undefined,
): Promise<void> {
  if (!fontId || !updates) {
    console.warn('updateFontSettings: некорректные параметры', { fontId, updates });
    return;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(fontId);

    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const existingFont = getRequest.result as StoredFontRecord | undefined;
        if (!existingFont) {
          console.warn(`updateFontSettings: шрифт ${fontId} не найден в IndexedDB`);
          resolve();
          return;
        }

        const updatedFont: StoredFontRecord = {
          ...existingFont,
          ...updates,
          file: existingFont.file,
          lastUpdated: Date.now(),
        };

        const putRequest = store.put(updatedFont);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = (event) => {
          console.error('Ошибка обновления настроек шрифта в IndexedDB:', (event.target as IDBRequest).error);
          reject(new Error('Ошибка обновления настроек шрифта'));
        };
      };

      getRequest.onerror = (event) => {
        console.error(
          'Ошибка получения шрифта для обновления из IndexedDB:',
          (event.target as IDBRequest).error,
        );
        reject(new Error('Ошибка получения шрифта для обновления'));
      };
    });
  } catch (error) {
    console.error('Не удалось выполнить транзакцию обновления в IndexedDB:', error);
  }
}
