/**
 * API-маршрут для получения метаданных о шрифте Fontsource
 * Позволяет клиенту узнать, какие стили и веса доступны для конкретного шрифта
 * Читает реальный metadata.json из пакета @fontsource/<fontFamily>
 */

import fs from 'fs/promises';
import path from 'path';
import { findFontsourcePackagePath } from '../../../../utils/serverUtils';

export default async function handler(req, res) {
  try {
    // Получаем имя шрифта из URL
    const { fontFamily } = req.query;
    // Проверяем, запрашивается ли вариативный шрифт через параметр запроса
    const isVariableRequest = req.query.variable === 'true';
    
    if (!fontFamily || typeof fontFamily !== 'string') {
      return res.status(400).json({ 
        error: 'Не указано или неверно указано имя шрифта'
      });
    }
    
    // Нормализуем имя шрифта для поиска пакета
    const packageName = fontFamily.toLowerCase().replace(/\s+/g, '-');
    
    console.log(`[API Metadata] Запрос метаданных для пакета: ${packageName}, вариативный: ${isVariableRequest}`);
    
    // Находим путь к пакету Fontsource
    // Для вариативных шрифтов используем префикс variable/
    const packagePath = await findFontsourcePackagePath(isVariableRequest ? `variable/${packageName}` : packageName);
    if (!packagePath) {
      console.error(`[API Metadata] Пакет для ${packageName} не найден (${isVariableRequest ? 'вариативный' : 'обычный'}).`);
      return res.status(404).json({ error: `Пакет ${isVariableRequest ? '@fontsource-variable/' : '@fontsource/'}${packageName} не найден.` });
    }
    
    console.log(`[API Metadata] Найден путь к пакету: ${packagePath}`);
    
    // Читаем metadata.json
    const metadataPath = path.join(packagePath, 'metadata.json');
    let metadata;
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
      console.log(`[API Metadata] Успешно прочитан metadata.json для ${packageName}`);
    } catch (e) {
      console.error(`[API Metadata] Ошибка чтения или парсинга metadata.json для ${packageName}:`, e);
      return res.status(500).json({ error: `Ошибка чтения метаданных для ${packageName}.` });
    }
    
    // Возвращаем метаданные шрифта
    return res.status(200).json({ 
      metadata: metadata 
    });
    
  } catch (error) {
    console.error('[API Metadata] Непредвиденная ошибка:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при получении метаданных шрифта'
    });
  }
} 