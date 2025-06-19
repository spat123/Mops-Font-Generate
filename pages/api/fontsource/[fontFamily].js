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
      console.log(`[API] Возвращаем только метаданные для ${packageName}`, metadata);
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

    // Строим имя файла на основе запрошенных параметров
    const fontFileName = `${packageName}-${subset}-${weight}-${style}.woff2`;
    const fontFileRelativePath = `files/${fontFileName}`;
    let fontFilePath = path.join(packagePath, fontFileRelativePath);
    
    console.log(`[API] Ищем файл шрифта: ${fontFilePath}`);
    
    // Проверяем наличие файла
    try {
      await fs.access(fontFilePath, fs.constants.F_OK);
      console.log(`[API] Найден запрошенный файл шрифта: ${fontFilePath}`);
    } catch (e) {
      console.log(`[API] Запрошенный файл не найден: ${fontFilePath}. Поиск альтернатив...`);
      
      // Если файл не найден, пробуем найти альтернативы или вывести список доступных файлов
      try {
        const files = await fs.readdir(filesDirPath);
        const woff2Files = files.filter(file => file.endsWith('.woff2'));
        
        console.log(`[API] Доступные woff2 файлы (первые 10): ${woff2Files.slice(0, 10).join(', ')}`);
        
        // Пытаемся найти ближайшую подходящую альтернативу
        let alternativeFile = null;
        
        // Приоритеты поиска: 1) тот же вес, 2) тот же стиль, 3) тот же subset
        const sameWeightFiles = woff2Files.filter(f => f.includes(`-${weight}-`));
        const sameStyleFiles = woff2Files.filter(f => f.includes(`-${style}.woff2`));
        const sameSubsetFiles = woff2Files.filter(f => f.includes(`-${subset}-`));
        
        if (sameWeightFiles.length > 0 && sameStyleFiles.length > 0) {
          // Ищем файл с тем же весом и стилем, но, возможно, другим subset
          for (const file of sameWeightFiles) {
            if (file.includes(`-${style}.woff2`)) {
              alternativeFile = file;
              break;
            }
          }
        } 
        
        // Если не нашли подходящую комбинацию, берем любой файл с тем же весом
        if (!alternativeFile && sameWeightFiles.length > 0) {
          alternativeFile = sameWeightFiles[0];
        } 
        // Или с тем же стилем
        else if (!alternativeFile && sameStyleFiles.length > 0) {
          alternativeFile = sameStyleFiles[0];
        }
        // Или с тем же подмножеством символов
        else if (!alternativeFile && sameSubsetFiles.length > 0) {
          alternativeFile = sameSubsetFiles[0];
        }
        // Если ничего не нашли, берем первый доступный файл
        else if (!alternativeFile && woff2Files.length > 0) {
          alternativeFile = woff2Files[0];
        }
        
        if (alternativeFile) {
          console.log(`[API] Используем альтернативный файл: ${alternativeFile}`);
          // Получаем параметры из имени альтернативного файла
          const fileNameParts = alternativeFile.replace('.woff2', '').split('-');
          // Предполагаем формат: packageName-subset-weight-style
          const actualWeight = fileNameParts.length >= 3 ? fileNameParts[fileNameParts.length - 2] : '400';
          const actualStyle = fileNameParts.length >= 4 ? fileNameParts[fileNameParts.length - 1] : 'normal';
          const actualSubset = fileNameParts.length >= 2 ? fileNameParts[1] : 'latin';
          
          fontFilePath = path.join(filesDirPath, alternativeFile);
          
          // Сохраняем фактические параметры для отправки клиенту
          res.setHeader('X-Font-Weight', actualWeight);
          res.setHeader('X-Font-Style', actualStyle);
          res.setHeader('X-Font-Subset', actualSubset);
        } else {
          return res.status(404).json({ 
            error: `Не найден подходящий файл шрифта для ${packageName} с параметрами weight=${weight}, style=${style}, subset=${subset}.`,
            availableFiles: woff2Files.slice(0, 20) // Показываем первые 20 файлов
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

    // 6. Отправляем ответ
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      metadata: metadata,
      fontBufferBase64: bufferToBase64(fontBuffer),
      fileName: path.basename(fontFilePath),
      weight: res.getHeader('X-Font-Weight') || weight,
      style: res.getHeader('X-Font-Style') || style,
      subset: res.getHeader('X-Font-Subset') || subset
    });

  } catch (error) {
    console.error(`Непредвиденная ошибка в API route /api/fontsource/${packageName}:`, error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
  }
} 