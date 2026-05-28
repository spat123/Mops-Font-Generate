/**
 * Вспомогательная функция для декодирования Base64 в ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  try {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error('Ошибка декодирования base64:', e);
    throw new Error('Не удалось декодировать данные шрифта.');
  }
}
