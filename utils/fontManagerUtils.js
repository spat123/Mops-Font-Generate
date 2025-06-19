/**
 * Вспомогательная функция для декодирования Base64 в ArrayBuffer.
 * @param {string} base64 - Строка в формате Base64.
 * @returns {ArrayBuffer} - Декодированный ArrayBuffer.
 * @throws {Error} Если декодирование не удалось.
 */
export function base64ToArrayBuffer(base64) {
  try {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error("Ошибка декодирования base64:", e);
    throw new Error("Не удалось декодировать данные шрифта.");
  }
}

// Другие общие утилиты для useFontManager можно будет добавить сюда позже 