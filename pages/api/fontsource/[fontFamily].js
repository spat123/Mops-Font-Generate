// CDN-версия API для работы на Vercel
// Используем внешние CDN вместо локальных node_modules

export default async function handler(req, res) {
  const { fontFamily } = req.query;
  const weight = req.query.weight || '400';
  const style = req.query.style || 'normal';
  const subset = req.query.subset || 'latin';
  const metaOnly = req.query.meta === 'true';

  // Валидация
  if (!fontFamily || typeof fontFamily !== 'string') {
    return res.status(400).json({ error: 'Неверное имя семейства шрифта.' });
  }

  const sanitizedFamily = fontFamily.replace(/[^a-zA-Z0-9\s-]/g, '');
  if (!sanitizedFamily) {
    return res.status(400).json({ error: 'Неверное имя семейства шрифта после очистки.' });
  }

  const packageName = sanitizedFamily.toLowerCase().replace(/\s+/g, '-');
  console.log(`[API] Запрос шрифта: ${packageName}, мета только: ${metaOnly}`);

  try {
    // Если запрашиваются только метаданные
    if (metaOnly) {
      console.log(`[API] Возвращаем метаданные для ${packageName}`);
      
      // Создаем базовые метаданные для популярных шрифтов
      const commonMetadata = {
        id: packageName,
        family: sanitizedFamily,
        subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
        weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
        styles: ['normal', 'italic'],
        defSubset: 'latin',
        variable: false,
        lastModified: new Date().toISOString(),
        category: 'sans-serif',
        version: '1.0.0',
        type: 'google'
      };

      // Для Google Fonts можем попробовать получить реальные метаданные
      try {
        const googleApiUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(sanitizedFamily)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
        const response = await fetch(googleApiUrl);
        
        if (response.ok) {
          console.log(`[API] Google Fonts CSS найден для ${packageName}`);
          return res.status(200).json({ metadata: commonMetadata });
        }
      } catch (e) {
        console.log(`[API] Не удалось получить Google Fonts CSS для ${packageName}:`, e.message);
      }

      // Возвращаем базовые метаданные
      return res.status(200).json({ metadata: commonMetadata });
    }

    // Если нужен сам шрифт, используем Google Fonts API
    const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(sanitizedFamily)}:wght@${weight}&display=swap`;
    
    console.log(`[API] Запрос к Google Fonts: ${googleFontsUrl}`);
    
    const response = await fetch(googleFontsUrl);
    if (!response.ok) {
      return res.status(404).json({ 
        error: `Шрифт ${sanitizedFamily} не найден в Google Fonts` 
      });
    }

    const cssText = await response.text();
    
    // Извлекаем URL woff2 файла из CSS
    const woff2Match = cssText.match(/src:\s*url\(([^)]+\.woff2)\)/);
    if (!woff2Match) {
      return res.status(404).json({ 
        error: `Не удалось найти woff2 файл для ${sanitizedFamily}` 
      });
    }

    const fontUrl = woff2Match[1];
    console.log(`[API] Найден URL шрифта: ${fontUrl}`);

    // Загружаем шрифт
    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) {
      return res.status(404).json({ 
        error: `Не удалось загрузить файл шрифта для ${sanitizedFamily}` 
      });
    }

    const fontBuffer = await fontResponse.arrayBuffer();
    const fontBase64 = Buffer.from(fontBuffer).toString('base64');

    console.log(`[API] Шрифт успешно загружен, размер: ${fontBuffer.byteLength} байт`);

    // Создаем базовые метаданные
    const metadata = {
      id: packageName,
      family: sanitizedFamily,
      subsets: ['latin'],
      weights: [weight],
      styles: [style],
      defSubset: subset,
      variable: false,
      category: 'sans-serif',
      type: 'google'
    };

    return res.status(200).json({
      metadata: metadata,
      fontBufferBase64: fontBase64,
      fileName: `${packageName}-${subset}-${weight}-${style}.woff2`,
      weight: weight,
      style: style,
      subset: subset
    });

  } catch (error) {
    console.error(`[API] Ошибка в /api/fontsource/${packageName}:`, error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
} 