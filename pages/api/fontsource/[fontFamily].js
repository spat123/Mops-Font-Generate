import fs from 'fs/promises'; // Используем промисы для асинхронности
import path from 'path';
import { findFontsourcePackagePath } from '../../../utils/serverUtils'; // Нам понадобится утилита для поиска пакета

// --- Вспомогательная функция для преобразования буфера в base64 --- 
// (На клиенте будем декодировать обратно в ArrayBuffer)
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

export default async function handler(req, res) {
  console.log(`[FontsourceAPI] Запрос к API: ${req.url}`);
  console.log(`[FontsourceAPI] Query параметры:`, req.query);
  
  // Извлекаем основные параметры запроса
  const { fontFamily } = req.query;
  const weight = req.query.weight || '400'; // Используем 400 как значение по умолчанию
  const style = req.query.style || 'normal'; // Используем normal как значение по умолчанию
  const subset = req.query.subset || 'latin'; // Используем latin как значение по умолчанию
  const metaOnly = req.query.meta === 'true'; // Проверяем, нужны ли только метаданные

  console.log(`[FontsourceAPI] Обрабатываем шрифт: ${fontFamily}, вес: ${weight}, стиль: ${style}, subset: ${subset}, только мета: ${metaOnly}`);

  if (!fontFamily) {
    console.error(`[FontsourceAPI] Отсутствует fontFamily в запросе`);
    return res.status(400).json({ error: 'fontFamily обязателен' });
  }

  try {
    // Ищем пакет с помощью утилиты
    console.log(`[FontsourceAPI] Ищем пакет для: ${fontFamily}`);
    const packagePath = await findFontsourcePackagePath(fontFamily);
    
    if (!packagePath) {
      console.error(`[FontsourceAPI] Пакет для ${fontFamily} не найден`);
      return res.status(404).json({ error: `Пакет fontsource для ${fontFamily} не найден` });
    }
    
    console.log(`[FontsourceAPI] Найден пакет по пути: ${packagePath}`);

    // Читаем метаданные
    const metadataPath = path.join(packagePath, 'metadata.json');
    console.log(`[FontsourceAPI] Читаем метаданные из: ${metadataPath}`);
    
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    console.log(`[FontsourceAPI] Метаданные прочитаны успешно для: ${metadata.family}`);

    // Если запрошены только метаданные, возвращаем их
    if (metaOnly) {
      console.log(`[FontsourceAPI] Возвращаем только метаданные для: ${fontFamily}`);
      return res.status(200).json(metadata);
    }

    // Логика поиска файла шрифта
    const filesDir = path.join(packagePath, 'files');
    console.log(`[FontsourceAPI] Ищем файлы шрифтов в: ${filesDir}`);
    
    // Проверяем, что директория files существует
    try {
      await fs.access(filesDir);
      console.log(`[FontsourceAPI] Директория files найдена`);
    } catch (error) {
      console.error(`[FontsourceAPI] Директория files не найдена: ${error.message}`);
      return res.status(404).json({ error: `Директория files не найдена для ${fontFamily}` });
    }

    // Строим предполагаемое имя файла
    const expectedFileName = `${fontFamily.toLowerCase()}-${subset}-${weight}-${style}.woff2`;
    const expectedFilePath = path.join(filesDir, expectedFileName);
    
    console.log(`[FontsourceAPI] Ищем файл: ${expectedFileName} по пути: ${expectedFilePath}`);

    let fontFile = null;
    let actualFileName = null;

    // Сначала пробуем точное совпадение
    try {
      await fs.access(expectedFilePath);
      fontFile = await fs.readFile(expectedFilePath);
      actualFileName = expectedFileName;
      console.log(`[FontsourceAPI] ✅ Найден точный файл: ${expectedFileName}`);
    } catch (error) {
      console.log(`[FontsourceAPI] ⚠️ Точный файл не найден: ${error.message}`);
      
      // Если точный файл не найден, ищем альтернативы
      console.log(`[FontsourceAPI] Ищем альтернативные файлы...`);
      
      const allFiles = await fs.readdir(filesDir);
      console.log(`[FontsourceAPI] Доступные файлы в директории:`, allFiles.slice(0, 10)); // Показываем первые 10 файлов
      
      // Пробуем разные комбинации параметров
      const searchPatterns = [
        // Другие subsets с теми же параметрами
        `${fontFamily.toLowerCase()}-latin-${weight}-${style}.woff2`,
        `${fontFamily.toLowerCase()}-cyrillic-${weight}-${style}.woff2`,
        `${fontFamily.toLowerCase()}-greek-${weight}-${style}.woff2`,
        
        // Fallback веса с тем же subset
        `${fontFamily.toLowerCase()}-${subset}-400-${style}.woff2`,
        `${fontFamily.toLowerCase()}-${subset}-${weight}-normal.woff2`,
        
        // Популярные комбинации
        `${fontFamily.toLowerCase()}-latin-400-normal.woff2`,
        `${fontFamily.toLowerCase()}-cyrillic-400-normal.woff2`,
      ];

      for (const pattern of searchPatterns) {
        const patternPath = path.join(filesDir, pattern);
        console.log(`[FontsourceAPI] Проверяем паттерн: ${pattern}`);
        
        try {
          await fs.access(patternPath);
          fontFile = await fs.readFile(patternPath);
          actualFileName = pattern;
          console.log(`[FontsourceAPI] ✅ Найден альтернативный файл: ${pattern}`);
          break;
        } catch (patternError) {
          // Продолжаем поиск
        }
      }

      // Если ничего не нашли с точными паттернами, ищем любой подходящий файл
      if (!fontFile) {
        console.log(`[FontsourceAPI] Ищем любой подходящий файл с помощью регулярного выражения...`);
        
        const fontNameRegex = new RegExp(`^${fontFamily.toLowerCase()}-.*\\.woff2$`, 'i');
        const matchingFiles = allFiles.filter(file => fontNameRegex.test(file));
        
        console.log(`[FontsourceAPI] Найдено подходящих файлов:`, matchingFiles.slice(0, 5));
        
        if (matchingFiles.length > 0) {
          const firstMatchingFile = matchingFiles[0];
          const firstMatchingPath = path.join(filesDir, firstMatchingFile);
          
          try {
            fontFile = await fs.readFile(firstMatchingPath);
            actualFileName = firstMatchingFile;
            console.log(`[FontsourceAPI] ✅ Использован первый подходящий файл: ${firstMatchingFile}`);
          } catch (readError) {
            console.error(`[FontsourceAPI] Ошибка чтения файла ${firstMatchingFile}: ${readError.message}`);
          }
        }
      }
    }

    if (!fontFile) {
      console.error(`[FontsourceAPI] ❌ Не найден ни один подходящий файл шрифта для ${fontFamily}`);
      return res.status(404).json({ error: `Файл шрифта не найден для ${fontFamily} ${weight} ${style} ${subset}` });
    }

    console.log(`[FontsourceAPI] ✅ Успешно найден и прочитан файл: ${actualFileName}, размер: ${fontFile.length} байт`);

    // Возвращаем результат
    const result = {
      metadata,
      fontData: bufferToBase64(fontFile),
      actualFileName: actualFileName,
      requestedParams: { weight, style, subset }
    };

    console.log(`[FontsourceAPI] Возвращаем результат для ${fontFamily}, использован файл: ${actualFileName}`);
    res.status(200).json(result);

  } catch (error) {
    console.error(`[FontsourceAPI] ❌ Критическая ошибка при обработке ${fontFamily}:`, error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
  }
} 