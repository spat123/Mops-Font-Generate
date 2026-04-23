import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { slugifyFontFilenameStub, slugifyFontKey } from '../utils/fontSlug';

/** Скачивание файлов, CSS-экспорт, псевдо/реальная генерация статики из VF. */
export function useFontExport(exportToCSSFromHook) {
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

  const createStaticFont = useCallback((selectedFont, selectedFontName, variableSettings, setExportedFont) => {
    if (!selectedFont) {
      return;
    }

    const staticName = `${selectedFontName.replace(/\.[^/.]+$/, '')}-static`;
    const settings = { ...variableSettings };

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

  const exportToCSS = useCallback((selectedFont, selectedFontName, download = false) => {
    const cssCode = exportToCSSFromHook(selectedFont, selectedFontName);
    
    if (download && cssCode) {
      const filename = `${slugifyFontKey(selectedFontName)}-styles.css`;
      const success = downloadFile(cssCode, filename, 'text/css');
      
      if (success) {
        toast.success(`CSS файл ${filename} скачан`);
      }
    }
    
    return cssCode;
  }, [exportToCSSFromHook, downloadFile]);

  const generateStaticFontFile = useCallback(async (selectedFont, variableSettings, format = 'woff2', opts = {}) => {
    const { outputFontName, skipPseudoCssPrompt } = opts;
    if (!selectedFont || !selectedFont.isVariableFont) {
      toast.error('Выберите вариативный шрифт для создания статической версии');
      return null;
    }

    if (!selectedFont.url && !selectedFont.arrayBuffer) {
      toast.error('Нет доступа к файлу шрифта для генерации');
      return null;
    }

    try {
      const { generateStaticFont, checkGenerationCapabilities } = await import('../utils/staticFontGenerator');

      const capabilities = await checkGenerationCapabilities();
      if (capabilities.server) {
        toast.info('Используется серверная генерация');
      } else {
        toast.warning('Используется псевдо-статический метод (ограниченная функциональность)');
      }

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

      if (!fontData || !(fontData instanceof ArrayBuffer)) {
        throw new Error(`Неправильный тип данных шрифта. Ожидается ArrayBuffer, получен: ${typeof fontData}`);
      }

      const displayName = outputFontName || selectedFont.name || 'VariableFont';

      const result = await generateStaticFont(fontData, variableSettings, {
        format,
        fontName: displayName,
      });

      if (result.warning) {
        toast.warning(result.warning);
      }

      if (result.css && !skipPseudoCssPrompt) {
        const downloadCSS = window.confirm('Создан псевдо-статический шрифт с CSS. Скачать CSS файл?');
        if (downloadCSS) {
          downloadFile(result.css, `${displayName}-static.css`, 'text/css');
        }
      }

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
  }, [downloadFile]);

  const downloadStaticFont = useCallback(async (selectedFont, variableSettings, format = 'ttf') => {
    if (!selectedFont || !selectedFont.isVariableFont) {
      toast.error('Выберите вариативный шрифт для создания статической версии');
      return false;
    }

    try {
      toast.info('Генерируем статический шрифт...', { autoClose: 2000 });
      
      const fontBlob = await generateStaticFontFile(selectedFont, variableSettings, format);
      
      if (fontBlob) {
        const fontBaseName = slugifyFontFilenameStub(selectedFont.name || selectedFont.fontFamily || 'font');

        let axisInfo = '';

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

        const parametricAxes = ['XOPQ', 'YOPQ', 'XTRA', 'YTUC', 'YTLC', 'YTAS', 'YTDE', 'YTFI'];
        parametricAxes.forEach(axis => {
          if (variableSettings[axis] !== undefined) {
            const value = Math.round(variableSettings[axis]);
            axisInfo += `_${axis.toLowerCase()}${value}`;
          }
        });

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
    downloadFile,
    exportToCSS,
    createStaticFont,
    generateStaticFontFile,
    downloadStaticFont,
  };
}
