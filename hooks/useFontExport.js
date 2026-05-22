import { useCallback } from 'react';
import { squareToast, toast } from '../utils/appNotify';
import { saveBlobAsFile } from '../utils/fileDownloadUtils';
import { slugifyFontFilenameStub, slugifyFontKey } from '../utils/fontSlug';

/** Скачивание файлов, CSS-экспорт, псевдо/реальная генерация статики из VF. */
export function useFontExport(exportToCSSFromHook) {
  const downloadFile = useCallback((content, filename, mimeType = 'text/plain') => {
    try {
      const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
      saveBlobAsFile(blob, filename);
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
    const {
      outputFontName,
      outputFontSubfamily,
      outputPostScriptName,
      outputWeightClass,
      skipPseudoCssPrompt,
      canExportTextCss: allowCssBundle = true,
      allowPseudoStatic = true,
      onQuotaExceeded,
    } = opts;
    if (!selectedFont || !selectedFont.isVariableFont) {
      toast.error('Выберите вариативный шрифт для создания статической версии');
      return null;
    }

    if (!selectedFont.url && !selectedFont.arrayBuffer) {
      toast.error('Нет доступа к файлу шрифта для генерации');
      return null;
    }

    let squareId = null;
    try {
      const { generateStaticFont, checkGenerationCapabilities } = await import('../utils/staticFontGenerator');

      const capabilities = await checkGenerationCapabilities();
      squareId = squareToast.loading({ toastId: 'static-font-generate' });
      // Не показываем отдельный текстовый toast во время процесса.

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

      const familyName = String(outputFontName || selectedFont.name || 'VariableFont').trim() || 'VariableFont';
      const subfamilyName = String(outputFontSubfamily || 'Regular').trim() || 'Regular';
      const displayName = familyName;

      const result = await generateStaticFont(fontData, variableSettings, {
        format,
        fontName: displayName,
        allowPseudoStatic,
        rename: {
          family: familyName,
          subfamily: subfamilyName,
          postScriptName: outputPostScriptName,
          weightClass: outputWeightClass,
        },
      });

      if (result.warning) {
        toast.warn(result.warning);
      }

      if (result.css && !skipPseudoCssPrompt && allowCssBundle) {
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

      if (squareId) {
        squareToast.updateToSuccess(squareId);
      } else {
        squareToast.success();
      }
      return blob;

    } catch (error) {
      console.error('[generateStaticFontFile] Ошибка при генерации:', error);
      if (error?.code === 'QUOTA_EXCEEDED') {
        onQuotaExceeded?.();
        toast.info(error.message || 'Вы исчерпали лимит генераций.');
        if (squareId) squareToast.updateToError(squareId);
        return null;
      }
      if (squareId) {
        squareToast.updateToError(squareId);
      } else {
        squareToast.error();
      }
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

