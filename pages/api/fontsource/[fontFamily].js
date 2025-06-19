import fs from 'fs/promises'; // Используем промисы для асинхронности
import path from 'path';
import { findFontsourcePackagePath } from '../../../utils/serverUtils'; // Нам понадобится утилита для поиска пакета

// --- Вспомогательная функция для преобразования буфера в base64 --- 
// (На клиенте будем декодировать обратно в ArrayBuffer)
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

export default async function handler(req, res) {
  // Извлекаем основные параметры запроса
  const { fontFamily } = req.query;
  const weight = req.query.weight || '400'; // Используем 400 как значение по умолчанию
  const style = req.query.style || 'normal'; // Используем normal как значение по умолчанию
  const subset = req.query.subset || 'latin'; // Используем latin как значение по умолчанию
  const metaOnly = req.query.meta === 'true'; // Проверяем, нужны ли только метаданные

  // 1. Валидация и очистка имени семейства
  if (!fontFamily || typeof fontFamily !== 'string') {
    return res.status(400).json({ error: 'Неверное имя семейства шрифта.' });
  }
  // Простое регулярное выражение для базовой безопасности
  const sanitizedFamily = fontFamily.replace(/[^a-zA-Z0-9\s-]/g, '');
  if (!sanitizedFamily) {
    return res.status(400).json({ error: 'Неверное имя семейства шрифта после очистки.' });
  }
  const packageName = sanitizedFamily.toLowerCase().replace(/\s+/g, '-');

  console.log(`[API] Запрос шрифта: ${packageName}, вес: ${weight}, стиль: ${style}, подмножество: ${subset}`);

  try {
    // 2. Находим путь к пакету Fontsource
    const packagePath = await findFontsourcePackagePath(packageName);
    if (!packagePath) {
        return res.status(404).json({ error: `Пакет @fontsource/${packageName} не найден.` });
    }

    // 3. Читаем metadata.json для получения информации о доступных стилях
    const metadataPath = path.join(packagePath, 'metadata.json');
    let metadata;
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch (e) {
      console.error(`Ошибка чтения или парсинга metadata.json для ${packageName}:`, e);
      return res.status(500).json({ error: `Ошибка чтения метаданных для ${packageName}.` });
    }

    // Если запрашиваются только метаданные, возвращаем их
    if (metaOnly) {
      console.log(`[API] Возвращаем только метаданные для ${packageName}`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        metadata: metadata
      });
    }

    // 4. Определяем путь к файлу шрифта для заданных weight, style и subset
    const filesDirPath = path.join(packagePath, 'files');
    
    // Проверяем, есть ли директория файлов
    try {
      await fs.access(filesDirPath, fs.constants.F_OK);
    } catch (e) {
      console.error(`Директория 'files' не найдена в пакете ${packageName}: ${filesDirPath}`);
      return res.status(404).json({ error: `Директория файлов шрифтов не найдена для ${packageName}.` });
    }

    // Исправляем формат имени файла для fontsource
    // Реальный формат: roboto-latin-400-normal.woff2 (не roboto-latin-400-normal.woff2)
    const normalizedStyle = style === 'italic' ? 'italic' : 'normal';
    const fontFileName = `${packageName}-${subset}-${weight}-${normalizedStyle}.woff2`;
    let fontFilePath = path.join(filesDirPath, fontFileName);
    
    console.log(`[API] Ищем файл шрифта: ${fontFilePath}`);
    
    // Проверяем наличие файла
    let foundFile = null;
    try {
      await fs.access(fontFilePath, fs.constants.F_OK);
      foundFile = fontFileName;
      console.log(`[API] Найден запрошенный файл шрифта: ${fontFilePath}`);
    } catch (e) {
      console.log(`[API] Запрошенный файл не найден: ${fontFilePath}. Поиск альтернатив...`);
      
      // Если файл не найден, пробуем найти альтернативы
      try {
        const files = await fs.readdir(filesDirPath);
        const woff2Files = files.filter(file => file.endsWith('.woff2'));
        
        console.log(`[API] Доступные woff2 файлы (всего ${woff2Files.length})`);
        
        // Попробуем разные варианты поиска
        const searchPatterns = [
          // Точное совпадение
          `${packageName}-${subset}-${weight}-${normalizedStyle}.woff2`,
          // Альтернативный subset
          ...['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext'].map(s => 
            `${packageName}-${s}-${weight}-${normalizedStyle}.woff2`
          ),
          // Альтернативный стиль
          `${packageName}-${subset}-${weight}-normal.woff2`,
          // Альтернативный вес
          ...['400', '300', '500', '700'].map(w => 
            `${packageName}-${subset}-${w}-${normalizedStyle}.woff2`
          )
        ];
        
        for (const pattern of searchPatterns) {
          if (woff2Files.includes(pattern)) {
            foundFile = pattern;
            fontFilePath = path.join(filesDirPath, pattern);
            console.log(`[API] Найден альтернативный файл: ${pattern}`);
            break;
          }
        }
        
        // Если ничего не нашли, берем первый доступный файл с подходящими параметрами
        if (!foundFile) {
          const matchingFiles = woff2Files.filter(file => {
            return file.includes(`-${weight}-`) || file.includes(`-${subset}-`) || file.includes(`-${normalizedStyle}`);
          });
          
          if (matchingFiles.length > 0) {
            foundFile = matchingFiles[0];
            fontFilePath = path.join(filesDirPath, foundFile);
            console.log(`[API] Использую частично подходящий файл: ${foundFile}`);
          } else if (woff2Files.length > 0) {
            foundFile = woff2Files[0];
            fontFilePath = path.join(filesDirPath, foundFile);
            console.log(`[API] Использую первый доступный файл: ${foundFile}`);
          }
        }
        
        if (!foundFile) {
          return res.status(404).json({ 
            error: `Не найден подходящий файл шрифта для ${packageName} с параметрами weight=${weight}, style=${style}, subset=${subset}.`,
            availableFiles: woff2Files.slice(0, 10),
            requestedFile: fontFileName
          });
        }
        
      } catch (dirError) {
        console.error(`Ошибка при чтении директории ${filesDirPath}:`, dirError);
        return res.status(500).json({ error: `Ошибка при чтении директории файлов шрифтов.` });
      }
    }

    // 5. Читаем файл шрифта
    console.log(`[API] Читаем файл шрифта: ${fontFilePath}`);
    
    let fontBuffer;
    try {
      fontBuffer = await fs.readFile(fontFilePath);
      console.log(`[API] Файл шрифта успешно прочитан, размер: ${fontBuffer.length} байт`);
    } catch (e) {
      console.error(`Ошибка чтения файла шрифта ${fontFilePath}:`, e);
      return res.status(500).json({ error: `Ошибка чтения файла шрифта для ${packageName}.` });
    }

    // Извлекаем реальные параметры из имени найденного файла
    const actualParams = foundFile.replace('.woff2', '').split('-');
    const actualSubset = actualParams[1] || subset;
    const actualWeight = actualParams[2] || weight;
    const actualStyle = actualParams[3] || style;

    // 6. Отправляем ответ
    res.setHeader('Content-Type', 'application/json');
    const response = {
      metadata: metadata,
      fontBufferBase64: bufferToBase64(fontBuffer),
      fileName: foundFile,
      weight: actualWeight,
      style: actualStyle,
      subset: actualSubset
    };
    
    console.log(`[API] Отправляем ответ для ${packageName}, найденный файл: ${foundFile}`);
    return res.status(200).json(response);

  } catch (error) {
    console.error(`Непредвиденная ошибка в API route /api/fontsource/${packageName}:`, error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
  }
} 