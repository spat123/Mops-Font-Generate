// utils/db.js

const DB_NAME = 'FontGauntletDB';
const DB_VERSION = 1;
const STORE_NAME = 'fonts';

let dbPromise = null;

/**
 * Открывает (или создает/обновляет) базу данных IndexedDB.
 * @returns {Promise<IDBDatabase>} Промис с объектом базы данных.
 */
function openDB() {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Ошибка открытия IndexedDB:", event.target.error);
      reject("Ошибка открытия IndexedDB");
    };

    request.onsuccess = (event) => {
      console.log("IndexedDB успешно открыта");
      resolve(event.target.result);
    };

    // Вызывается при создании БД или обновлении версии
    request.onupgradeneeded = (event) => {
      console.log("Обновление схемы IndexedDB...");
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.log(`Создание хранилища объектов: ${STORE_NAME}`);
        // Создаем хранилище объектов для шрифтов
        // 'id' будет ключом
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Можно добавить индексы при необходимости, например:
        // store.createIndex('name', 'name', { unique: false });
      }
    };
  });
  return dbPromise;
}

/**
 * Сохраняет объект шрифта в IndexedDB.
 * @param {Object} fontObj - Объект шрифта для сохранения (должен содержать Blob в поле file).
 * @returns {Promise<void>}
 */
export async function saveFont(fontObj) {
  if (!fontObj || !fontObj.id || !fontObj.file) {
      console.warn("Попытка сохранить некорректный fontObj в IndexedDB", fontObj);
      return;
  }
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    // Используем put для вставки или обновления
    const request = store.put(fontObj);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // console.log(`Шрифт ${fontObj.name} (${fontObj.id}) сохранен в IndexedDB`);
        resolve();
      };
      request.onerror = (event) => {
        console.error("Ошибка сохранения шрифта в IndexedDB:", event.target.error);
        reject("Ошибка сохранения шрифта");
      };
    });
  } catch (error) {
      console.error("Не удалось выполнить транзакцию сохранения в IndexedDB:", error);
  }
}

/**
 * Получает все объекты шрифтов из IndexedDB.
 * @returns {Promise<Array<Object>>} Промис с массивом объектов шрифтов.
 */
export async function getAllFonts() {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(event.target.result || []);
      };
      request.onerror = (event) => {
        console.error("Ошибка получения всех шрифтов из IndexedDB:", event.target.error);
        reject("Ошибка получения шрифтов");
      };
    });
  } catch (error) {
      console.error("Не удалось выполнить транзакцию чтения из IndexedDB:", error);
      return []; // Возвращаем пустой массив при ошибке
  }
}

/**
 * Удаляет объект шрифта из IndexedDB по ID.
 * @param {string} fontId - ID шрифта для удаления.
 * @returns {Promise<void>}
 */
export async function deleteFontDB(fontId) {
  if (!fontId) return;
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(fontId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // console.log(`Шрифт ${fontId} удален из IndexedDB`);
        resolve();
      };
      request.onerror = (event) => {
        console.error("Ошибка удаления шрифта из IndexedDB:", event.target.error);
        reject("Ошибка удаления шрифта");
      };
    });
  } catch (error) {
       console.error("Не удалось выполнить транзакцию удаления из IndexedDB:", error);
  }
}

/**
 * Удаляет ВСЕ объекты шрифтов из хранилища IndexedDB.
 * @returns {Promise<void>}
 */
export async function deleteAllFontsDB() {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    // Используем clear() для удаления всех записей
    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`Все шрифты удалены из IndexedDB (хранилище ${STORE_NAME})`);
        resolve();
      };
      request.onerror = (event) => {
        console.error("Ошибка очистки хранилища шрифтов в IndexedDB:", event.target.error);
        reject("Ошибка очистки хранилища шрифтов");
      };
    });
  } catch (error) {
    console.error("Не удалось выполнить транзакцию очистки хранилища IndexedDB:", error);
    // Не пробрасываем ошибку дальше, просто логируем
  }
}

/**
 * Обновляет настройки шрифта в IndexedDB (lastUsedPresetName, lastUsedVariableSettings, currentWeight, currentStyle).
 * @param {string} fontId - ID шрифта для обновления.
 * @param {Object} updates - Объект с обновлениями для шрифта.
 * @returns {Promise<void>}
 */
export async function updateFontSettings(fontId, updates) {
  if (!fontId || !updates) {
    console.warn("updateFontSettings: некорректные параметры", { fontId, updates });
    return;
  }
  
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Сначала получаем существующий объект
    const getRequest = store.get(fontId);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const existingFont = getRequest.result;
        if (!existingFont) {
          console.warn(`updateFontSettings: шрифт ${fontId} не найден в IndexedDB`);
          resolve();
          return;
        }
        
        // Обновляем только нужные поля
        const updatedFont = {
          ...existingFont,
          ...updates,
          // Обновляем timestamp для отслеживания изменений
          lastUpdated: Date.now()
        };
        
        // Сохраняем обновленный объект
        const putRequest = store.put(updatedFont);
        
        putRequest.onsuccess = () => {
          console.log(`Настройки шрифта ${fontId} обновлены в IndexedDB:`, updates);
          resolve();
        };
        
        putRequest.onerror = (event) => {
          console.error("Ошибка обновления настроек шрифта в IndexedDB:", event.target.error);
          reject("Ошибка обновления настроек шрифта");
        };
      };
      
      getRequest.onerror = (event) => {
        console.error("Ошибка получения шрифта для обновления из IndexedDB:", event.target.error);
        reject("Ошибка получения шрифта для обновления");
      };
    });
  } catch (error) {
    console.error("Не удалось выполнить транзакцию обновления в IndexedDB:", error);
  }
} 