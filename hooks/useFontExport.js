import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { generateStaticFont } from '../utils/staticFontGenerator';

/**
 * Хук для экспорта и скачивания шрифтов и CSS
 * 
 * Включает в себя:
 * - Универсальную логику скачивания файлов
 * - Экспорт CSS с возможностью скачивания
 * - Создание статических версий вариативных шрифтов
 * - Подготовка к будущей логике генерации статических шрифтов
 * 
 * @param {Function} exportToCSSFromHook - Функция генерации CSS из useFontCss
 * @returns {Object} Объект с методами экспорта
 */
export function useFontExport(exportToCSSFromHook) {
  /**
   * Универсальная функция скачивания файлов
   * 
   * @param {string|Blob} content - Содержимое файла (строка или Blob)
   * @param {string} filename - Имя файла для скачивания
   * @param {string} mimeType - MIME тип файла (игнорируется если content это Blob)
   * @returns {boolean} Успешность операции
   */
  const downloadFile = useCallback((content, filename, mimeType = 'text/plain') => {
    try {
      let blob;
      if (content instanceof Blob) {
        blob = content;
      } else {
        blob = new Blob([content], { type: mimeType });
      }
      
      const url = URL.createObjectURL(blob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Очищаем ресурсы
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Ошибка скачивания файла:', error);
      toast.error(`Не удалось скачать файл: ${error.message}`);
      return false;
    }
  }, []);

  /**
   * Создает статическую версию вариативного шрифта с текущими настройками осей
   * 
   * @param {Object} selectedFont - Выбранный шрифт
   * @param {string} selectedFontName - Имя выбранного шрифта
   * @param {Object} variableSettings - Настройки вариативных осей
   * @param {Function} setExportedFont - Функция установки экспортированного шрифта
   * @returns {Object|undefined} Объект статического шрифта или undefined
   */
  const createStaticFont = useCallback((selectedFont, selectedFontName, variableSettings, setExportedFont) => {
    if (!selectedFont) {
      return;
    }
    
    // Создаем новое имя для статической версии шрифта
    const staticName = `${selectedFontName.replace(/\.[^/.]+$/, '')}-static`;
    
    // Определяем текущие настройки
    const settings = { ...variableSettings };
    
    // Создаем статический экспортированный шрифт
    const newExportedFont = {
      name: staticName,
      settings: settings,
      isStatic: true,
      originalFont: selectedFontName,
      createdAt: new Date().toISOString()
    };
    
    setExportedFont(newExportedFont);
    
    toast.success(`Создана статическая версия шрифта: ${staticName}`);
    
    return newExportedFont;
  }, []);

  /**
   * Экспортирует текущие настройки шрифта в CSS с возможностью скачивания
   * 
   * @param {Object} selectedFont - Выбранный шрифт
   * @param {string} selectedFontName - Имя выбранного шрифта
   * @param {boolean} download - Если true, автоматически скачивает CSS файл
   * @returns {string} CSS-код для текущего шрифта с примененными настройками
   */
  const exportToCSS = useCallback((selectedFont, selectedFontName, download = false) => {
    // Используем функцию из useFontCss для генерации CSS
    const cssCode = exportToCSSFromHook(selectedFont, selectedFontName);
    
    if (download && cssCode) {
      const filename = `${selectedFontName.replace(/\s+/g, '-').toLowerCase()}-styles.css`;
      const success = downloadFile(cssCode, filename, 'text/css');
      
      if (success) {
        toast.success(`CSS файл ${filename} скачан`);
      }
    }
    
    return cssCode;
  }, [exportToCSSFromHook, downloadFile]);

  /**
   * Генерирует статический шрифт из вариативного используя современные методы
   * 
   * @param {Object} selectedFont - Вариативный шрифт
   * @param {Object} variableSettings - Настройки осей
   * @param {string} format - Формат выходного файла ('woff2', 'woff', 'ttf', 'otf')
   * @returns {Promise<Blob|null>} Blob статического шрифта или null при ошибке
   */
  const generateStaticFontFile = useCallback(async (selectedFont, variableSettings, format = 'woff2') => {
    if (!selectedFont || !selectedFont.isVariableFont) {
      toast.error('Выберите вариативный шрифт для создания статической версии');
      return null;
    }

    if (!selectedFont.url && !selectedFont.arrayBuffer) {
      toast.error('Нет доступа к файлу шрифта для генерации');
      return null;
    }

    try {
      // 1. Импортируем новую утилиту для генерации
      const { generateStaticFont, checkGenerationCapabilities } = await import('../utils/staticFontGenerator');
      
      // 2. Проверяем доступные методы
      const capabilities = await checkGenerationCapabilities();
      
      // Показываем пользователю информацию о методе
      if (capabilities.harfbuzz) {
        toast.info('Используется HarfBuzz для качественной генерации');
      } else if (capabilities.server) {
        toast.info('Используется серверная генерация');
      } else {
        toast.warning('Используется псевдо-статический метод (ограниченная функциональность)');
      }
      
      // 3. Получаем данные шрифта
      let fontData;
      if (selectedFont.arrayBuffer) {
        fontData = selectedFont.arrayBuffer;
      } else if (selectedFont.url) {
        const response = await fetch(selectedFont.url);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить шрифт: ${response.status}`);
        }
        fontData = await response.arrayBuffer();
      } else {
        throw new Error('Нет доступных данных шрифта');
      }

      // Проверяем что fontData это действительно ArrayBuffer
      if (!fontData || !(fontData instanceof ArrayBuffer)) {
        throw new Error(`Неправильный тип данных шрифта. Ожидается ArrayBuffer, получен: ${typeof fontData}`);
      }

      // 4. Генерируем статический шрифт с помощью новой утилиты
      const result = await generateStaticFont(fontData, variableSettings, {
        format,
        fontName: selectedFont.name || 'VariableFont'
      });
      
      // Показываем предупреждение если это псевдо-статический шрифт
      if (result.warning) {
        toast.warning(result.warning);
      }
      
      // Если есть CSS (для псевдо-статического), предлагаем его скачать
      if (result.css) {
        const downloadCSS = window.confirm('Создан псевдо-статический шрифт с CSS. Скачать CSS файл?');
        if (downloadCSS) {
          downloadFile(result.css, `${selectedFont.name}-static.css`, 'text/css');
        }
      }

      // Определяем MIME тип
      let mimeType;
      switch (format.toLowerCase()) {
        case 'ttf':
          mimeType = 'font/ttf';
          break;
        case 'otf':
          mimeType = 'font/otf';
          break;
        case 'woff':
          mimeType = 'font/woff';
          break;
        case 'woff2':
          mimeType = 'font/woff2';
          break;
        default:
          mimeType = 'font/ttf';
      }

      // 5. Создаем Blob
      const blob = new Blob([result.buffer], { type: mimeType });

      const statusMessage = result.isRealStatic 
        ? `Настоящий статический шрифт сгенерирован (${(blob.size / 1024).toFixed(1)} KB)`
        : `Псевдо-статический шрифт создан (${(blob.size / 1024).toFixed(1)} KB)`;
      
      toast.success(statusMessage);
      return blob;

    } catch (error) {
      console.error('[generateStaticFontFile] Ошибка при генерации:', error);
      toast.error(`Ошибка генерации статического шрифта: ${error.message}`);
      return null;
    }
  }, []);

  /**
   * Скачивает статический шрифт, сгенерированный из вариативного
   * 
   * @param {Object} selectedFont - Вариативный шрифт
   * @param {Object} variableSettings - Настройки осей
   * @param {string} format - Формат файла
   * @returns {Promise<boolean>} Успешность операции
   */
  const downloadStaticFont = useCallback(async (selectedFont, variableSettings, format = 'ttf') => {
    if (!selectedFont || !selectedFont.isVariableFont) {
      toast.error('Выберите вариативный шрифт для создания статической версии');
      return false;
    }

    try {
      toast.info('Генерируем статический шрифт...', { autoClose: 2000 });
      
      const fontBlob = await generateStaticFontFile(selectedFont, variableSettings, format);
      
      if (fontBlob) {
        // Создаем описательное имя файла с настройками осей
        const fontBaseName = (selectedFont.name || selectedFont.fontFamily || 'font')
          .replace(/\s+/g, '-')
          .toLowerCase()
          .replace(/[^a-z0-9\-]/g, '');
        
        // Добавляем информацию об основных осях в имя файла
        let axisInfo = '';
        
        // Основные оси (стандартные)
        if (variableSettings.wght && variableSettings.wght !== 400) {
          axisInfo += `_w${Math.round(variableSettings.wght)}`;
        }
        if (variableSettings.wdth && variableSettings.wdth !== 100) {
          axisInfo += `_wd${Math.round(variableSettings.wdth)}`;
        }
        if (variableSettings.slnt && variableSettings.slnt !== 0) {
          axisInfo += `_sl${Math.round(Math.abs(variableSettings.slnt))}`;
        }
        if (variableSettings.opsz && variableSettings.opsz !== 14) {
          axisInfo += `_opsz${Math.round(variableSettings.opsz)}`;
        }
        if (variableSettings.GRAD && variableSettings.GRAD !== 0) {
          axisInfo += `_grad${Math.round(variableSettings.GRAD)}`;
        }
        
        // Параметрические оси (если отличаются от дефолтных значений)
        const parametricAxes = ['XOPQ', 'YOPQ', 'XTRA', 'YTUC', 'YTLC', 'YTAS', 'YTDE', 'YTFI'];
        parametricAxes.forEach(axis => {
          if (variableSettings[axis] !== undefined) {
            const value = Math.round(variableSettings[axis]);
            axisInfo += `_${axis.toLowerCase()}${value}`;
          }
        });
        
        // Ограничиваем длину имени файла (если слишком много осей)
        if (axisInfo.length > 50) {
          axisInfo = axisInfo.substring(0, 47) + '...';
        }
        
        const filename = `${fontBaseName}${axisInfo}_static.${format}`;
        
        const success = downloadFile(fontBlob, filename, `font/${format}`);
        
        if (success) {
          toast.success(`Статический шрифт скачан: ${filename}`);
        }
        
        return success;
      }
      
      return false;
    } catch (error) {
      toast.error(`Ошибка при создании статического шрифта: ${error.message}`);
      return false;
    }
  }, [generateStaticFontFile, downloadFile]);

  return {
    // Универсальные функции
    downloadFile,
    
    // CSS экспорт
    exportToCSS,
    
    // Работа со статическими версиями
    createStaticFont,
    
    // Будущая функциональность генерации статических шрифтов
    generateStaticFontFile,
    downloadStaticFont,
  };
} 