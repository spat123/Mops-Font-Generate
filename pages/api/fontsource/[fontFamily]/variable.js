/**
 * API-маршрут для загрузки вариативных шрифтов из пакетов Fontsource
 * Проверяет наличие вариативного файла и возвращает его
 */

import fs from 'fs/promises';
import path from 'path';
import { findFontsourcePackagePath } from '../../../../utils/serverUtils';

// Вспомогательная функция для преобразования буфера в base64
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

export default async function handler(req, res) {
  try {
    // Получаем имя шрифта из URL
    const { fontFamily } = req.query;
    const subset = req.query.subset || 'latin'; // По умолчанию используем latin
    // Проверяем, запрашивается ли явно вариативный шрифт
    const forceVariableRequest = req.query.forceVariable === 'true';
    
    if (!fontFamily || typeof fontFamily !== 'string') {
      return res.status(400).json({ 
        error: 'Не указано или неверно указано имя шрифта'
      });
    }
    
    // Нормализуем имя шрифта для поиска пакета
    const packageName = fontFamily.toLowerCase().replace(/\s+/g, '-');
    
    console.log(`[API Variable] Запрос вариативного шрифта для: ${packageName}, подмножество: ${subset}, принудительно вариативный: ${forceVariableRequest}`);
    
    // Шаг 1: Пробуем найти пакет в зависимости от параметра forceVariableRequest
    let packagePath;
    if (forceVariableRequest) {
      // Если явно запрошен вариативный шрифт, ищем только @fontsource-variable пакет
      packagePath = await findFontsourcePackagePath(`variable/${packageName}`);
      if (!packagePath) {
        console.error(`[API Variable] Вариативный пакет @fontsource-variable/${packageName} не найден.`);
        return res.status(404).json({ error: `Пакет @fontsource-variable/${packageName} не найден.` });
      }
    } else {
      // Сначала проверяем вариативный пакет
      packagePath = await findFontsourcePackagePath(`variable/${packageName}`);
      
      // Если вариативный не найден, проверяем обычный
      if (!packagePath) {
        packagePath = await findFontsourcePackagePath(packageName);
        
        if (!packagePath) {
          console.error(`[API Variable] Пакеты @fontsource-variable/${packageName} и @fontsource/${packageName} не найдены.`);
          return res.status(404).json({ error: `Пакеты для ${packageName} не найдены.` });
        }
      }
    }
    
    // Определяем, был ли найден вариативный пакет
    const variablePackageFound = packagePath.includes('@fontsource-variable');
    
    console.log(`[API Variable] Используем пакет: ${packagePath}, специализированный вариативный пакет: ${variablePackageFound}`);
    
    // Проверяем наличие файлов
    let filesDirPath;
    if (variablePackageFound) {
      // Для @fontsource-variable пакетов
      filesDirPath = path.join(packagePath, 'files');
    } else {
      // Для обычных @fontsource пакетов
      filesDirPath = path.join(packagePath, 'files');
    }
    
    // Проверяем файлы в директории
    let files;
    try {
      files = await fs.readdir(filesDirPath);
      console.log(`[API Variable] Найдено ${files.length} файлов в директории`);
    } catch (e) {
      console.error(`[API Variable] Ошибка чтения директории ${filesDirPath}:`, e);
      return res.status(500).json({ error: `Ошибка чтения директории файлов.` });
    }
    
    // Ищем вариативный файл шрифта
    // В @fontsource-variable пакетах он обычно имеет 'variable' в названии
    // или суффикс 'wght' или 'wght-normal' для вариативного веса
    let variableFontFile = files.find(file => 
      file.includes(`${packageName}-${subset}`) && 
      (file.includes('variable') || file.endsWith('.variable.woff2') || 
       file.includes('-wght-') || file.includes('-VF.') || file.includes('VF-'))
    );
    
    if (!variableFontFile) {
      // Если файл с явным указанием переменности не найден, ищем файл с wght для основного шрифта
      variableFontFile = files.find(file => 
        file.includes(`${packageName}-${subset}`) && 
        (file.includes('-wght-normal.') || file.includes('-wght.'))
      );
    }
    
    if (!variableFontFile) {
      console.error(`[API Variable] Вариативный файл шрифта для ${packageName} не найден. Доступные файлы:`, files);
      return res.status(404).json({ error: `Вариативный файл шрифта для ${packageName} не найден.` });
    }
    
    console.log(`[API Variable] Найден вариативный файл шрифта: ${variableFontFile}`);
    
    // Читаем файл шрифта
    let fontBuffer;
    try {
      fontBuffer = await fs.readFile(path.join(filesDirPath, variableFontFile));
      console.log(`[API Variable] Файл шрифта успешно прочитан, размер: ${fontBuffer.length} байт`);
    } catch (e) {
      console.error(`[API Variable] Ошибка чтения файла шрифта:`, e);
      return res.status(500).json({ error: `Ошибка чтения файла шрифта.` });
    }
    
    // Отправляем ответ с данными шрифта
    res.status(200).json({
      fontBufferBase64: bufferToBase64(fontBuffer),
      fileName: variableFontFile,
      subset: subset,
      isVariable: true
    });
    
  } catch (error) {
    console.error('[API Variable] Непредвиденная ошибка:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при получении вариативного шрифта'
    });
  }
} 