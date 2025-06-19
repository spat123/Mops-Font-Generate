import React, { useCallback, useMemo, useRef, useEffect, memo, useState, lazy, Suspense } from 'react';
import FontUploader from './FontUploader';
import { findStyleInfoByWeightAndStyle, getFormatFromExtension, getCharUnicode } from '../utils/fontUtilsCommon';
import { toast } from 'react-toastify';
import { useSettings } from '../contexts/SettingsContext';
import { useFontContext } from '../contexts/FontContext';
// Удаляем импорт getGlyphDataForFont, так как он больше не используется здесь
// import { getGlyphDataForFont } from '../utils/fontParser'; 
// Импортируем новые компоненты
import EditableText from './EditableText';
import dynamic from 'next/dynamic';

// --- Ленивая загрузка компонентов режимов --- 
const PlainTextMode = lazy(() => import('./PlainTextMode'));
const WaterfallMode = dynamic(() => import('./WaterfallMode'), { suspense: true });
const StylesMode = lazy(() => import('./StylesMode'));
const GlyphsMode = lazy(() => import('./GlyphsMode'));
const TextMode = lazy(() => import('./TextMode'));
// --- Конец ленивой загрузки ---

// Ленивая загрузка тяжелых утилит для работы с глифами (можно оставить, если GlyphsMode использует его)
const GlyphUtils = lazy(() => import('../utils/glyphUtils'));

// Удаляем glyphDataCache, так как он теперь внутри GlyphsMode
// const glyphDataCache = new Map();

// После импортов добавляем новую переменную для буферизации текста
// Функция для буферизации обновлений отображения шрифта
const createTextDisplayBuffer = () => {
  // Буфер отображения текста для предотвращения моргания
  const buffer = {
    // Основной и теневой элементы для двойной буферизации
    elements: {
      main: null,
      shadow: null,
    },
    // Контейнер, в котором находятся элементы
    container: null,
    // Таймер для переключения буферов
    switchTimer: null,
    // Флаг, указывающий, идет ли переключение
    switching: false,
    // Инициализирует буфер в контейнере
    init: (containerElement) => {
      if (!containerElement) return false;
      
      // Сохраняем контейнер
      buffer.container = containerElement;
      
      // Создаем основной элемент, если его еще нет
      if (!buffer.elements.main) {
        buffer.elements.main = document.createElement('div');
        buffer.elements.main.className = 'font-display-buffer main';
        buffer.elements.main.style.transition = 'opacity 0.1s ease-in-out';
        buffer.elements.main.style.position = 'absolute';
        buffer.elements.main.style.top = '0';
        buffer.elements.main.style.left = '0';
        buffer.elements.main.style.width = '100%';
        buffer.elements.main.style.height = '100%';
        buffer.elements.main.style.zIndex = '1';
        buffer.container.appendChild(buffer.elements.main);
      }
      
      // Создаем теневой элемент, если его еще нет
      if (!buffer.elements.shadow) {
        buffer.elements.shadow = document.createElement('div');
        buffer.elements.shadow.className = 'font-display-buffer shadow';
        buffer.elements.shadow.style.transition = 'opacity 0.1s ease-in-out';
        buffer.elements.shadow.style.position = 'absolute';
        buffer.elements.shadow.style.top = '0';
        buffer.elements.shadow.style.left = '0';
        buffer.elements.shadow.style.width = '100%';
        buffer.elements.shadow.style.height = '100%';
        buffer.elements.shadow.style.zIndex = '0';
        buffer.elements.shadow.style.opacity = '0';
        buffer.container.appendChild(buffer.elements.shadow);
      }
      
      // Обновляем стили контейнера
      buffer.container.style.position = 'relative';
      buffer.container.style.overflow = 'hidden';
      
      return true;
    },
    // Обновляет содержимое в теневом буфере и переключает буферы
    update: (content, style) => {
      if (!buffer.elements.shadow || !buffer.elements.main) return;
      
      // Если переключение уже запланировано, не создаем новый таймер
      if (buffer.switchTimer) {
        // Просто обновляем содержимое теневого элемента
        buffer.elements.shadow.innerHTML = content;
        Object.assign(buffer.elements.shadow.style, style || {});
        return;
      }
      
      // Обновляем содержимое теневого элемента
      buffer.elements.shadow.innerHTML = content;
      Object.assign(buffer.elements.shadow.style, style || {});
      
      // Планируем переключение с небольшой задержкой (16.7ms ≈ один кадр анимации)
      buffer.switchTimer = setTimeout(() => {
        // Устанавливаем флаг переключения
        buffer.switching = true;
        
        // Меняем z-index элементов
        buffer.elements.main.style.zIndex = '0';
        buffer.elements.shadow.style.zIndex = '1';
        
        // Меняем opacity элементов
        buffer.elements.main.style.opacity = '0';
        buffer.elements.shadow.style.opacity = '1';
        
        // Ожидаем завершения анимации
        setTimeout(() => {
          // Меняем содержимое основного элемента
          buffer.elements.main.innerHTML = buffer.elements.shadow.innerHTML;
          Object.assign(buffer.elements.main.style, buffer.elements.shadow.style);
          
          // Восстанавливаем z-index элементов
          buffer.elements.main.style.zIndex = '1';
          buffer.elements.shadow.style.zIndex = '0';
          
          // Восстанавливаем opacity элементов
          buffer.elements.main.style.opacity = '1';
          buffer.elements.shadow.style.opacity = '0';
          
          // Сбрасываем флаг переключения и таймер
          buffer.switching = false;
          buffer.switchTimer = null;
        }, 100);
      }, 16.7);
    },
    // Очищает буфер и удаляет элементы
    cleanup: () => {
      if (buffer.switchTimer) {
        clearTimeout(buffer.switchTimer);
        buffer.switchTimer = null;
      }
      
      if (buffer.elements.main && buffer.elements.main.parentNode) {
        buffer.elements.main.parentNode.removeChild(buffer.elements.main);
      }
      
      if (buffer.elements.shadow && buffer.elements.shadow.parentNode) {
        buffer.elements.shadow.parentNode.removeChild(buffer.elements.shadow);
      }
      
      buffer.elements.main = null;
      buffer.elements.shadow = null;
      buffer.container = null;
    }
  };
  
  return buffer;
};

// Инициализируем буфер
const textDisplayBuffer = createTextDisplayBuffer();

// Вспомогательная функция для генерации строки font-variation-settings (оставляем здесь, т.к. используется в нескольких местах)
const generateVariationSettings = (styleObj, supportedAxes) => {
  if (!styleObj || !supportedAxes) return '';
  
  const settings = [];
  
  // Добавляем поддерживаемые оси
  if (supportedAxes['wght'] !== undefined && styleObj.wght !== undefined) {
    settings.push(`"wght" ${styleObj.wght}`);
  }
  
  if (supportedAxes['ital'] !== undefined && styleObj.ital !== undefined) {
    settings.push(`"ital" ${styleObj.ital}`);
  }
  
  if (supportedAxes['slnt'] !== undefined && styleObj.slnt !== undefined) {
    settings.push(`"slnt" ${styleObj.slnt}`);
  }
  
  // Добавляем другие оси, если они есть в styleObj
  Object.entries(styleObj).forEach(([key, value]) => {
    if (!['wght', 'ital', 'slnt'].includes(key) && supportedAxes[key] !== undefined) {
      settings.push(`"${key}" ${value}`);
    }
  });
  
  return settings.join(', ');
};

export default function FontPreview({
  selectedFont,
  variableSettings, 
  exportedFont, 
  handleExport,
  handleFontsUploaded,
  handleScreenshotClick, 
  handleCSSClick,
  getFontFamily,
  getVariationSettings,
  fontCssProperties
}) {
  const { 
    text, setText, 
    fontSize, 
    lineHeight, 
    letterSpacing, 
    textColor, 
    backgroundColor, 
    viewMode, 
    textDirection, 
    textAlignment, 
    textCase, 
    textCenter, 
    textFill 
  } = useSettings();

  const styleValues = useMemo(() => {
    const letterSpacingValue = `${(letterSpacing / 100) * 0.5}em`; 
    const lineHeightValue = lineHeight; 
    
    // Используем fontCssProperties для получения правильных значений weight и style
    const fontStyleValue = fontCssProperties?.fontStyle || 'normal';
    const fontWeightValue = fontCssProperties?.fontWeight || 400;
    
    console.log('[FontPreview] styleValues обновлены из fontCssProperties:', {
      fontStyleValue,
      fontWeightValue,
      fontCssProperties
    });
    
    return {
      letterSpacingValue,
      lineHeightValue,
      fontStyleValue,
      fontWeightValue
    };
  }, [letterSpacing, lineHeight, fontCssProperties?.fontWeight, fontCssProperties?.fontStyle, fontCssProperties?.fontFamily]);
  
  const { letterSpacingValue, lineHeightValue, fontStyleValue, fontWeightValue } = styleValues;
  
  const featureSettingsValue = useMemo(() => {
    return '"calt", "liga", "rlig", "rvrn", "kern", "rclt"';
  }, []);
  
  const fontFamilyValue = useMemo(() => {
    return getFontFamily(selectedFont);
  }, [selectedFont, getFontFamily]);
  
  const variationSettingsValue = useMemo(() => {
    return getVariationSettings(selectedFont, variableSettings);
  }, [selectedFont, variableSettings, getVariationSettings]);

  const displayText = useMemo(() => {
    return text || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  }, [text]);
  
  const baseTextStyle = useMemo(() => {
    const styles = {
      fontFamily: fontFamilyValue,
      fontSize: `${fontSize}px`, 
      letterSpacing: letterSpacingValue,
      lineHeight: lineHeightValue,
      color: textColor, 
      fontFeatureSettings: featureSettingsValue,
      direction: textDirection, 
      textAlign: textAlignment, 
      textTransform: textCase, 
    };
    
    if (selectedFont?.isVariableFont) {
      // Для вариативных шрифтов используем только font-variation-settings
      if (variationSettingsValue) {
        styles.fontVariationSettings = variationSettingsValue;
      }
    } else {
      // Для НЕвариативных шрифтов используем font-weight и font-style
      styles.fontStyle = fontStyleValue;
      styles.fontWeight = fontWeightValue;
    }
    
    return styles;
  }, [
    fontFamilyValue, fontSize, letterSpacingValue, fontStyleValue, fontWeightValue, 
    lineHeightValue, textColor, featureSettingsValue, selectedFont, variationSettingsValue,
    textDirection, textAlignment, textCase
  ]);
  
  const containerStyle = useMemo(() => {
    return {
      backgroundColor, 
      ...(textCenter ? { 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%'
      } : {}),
      ...(textFill ? { 
        width: '100%',
        height: '100%'
      } : {})
    };
  }, [backgroundColor, textCenter, textFill]);
  
  const contentStyle = useMemo(() => {
    return {
      ...baseTextStyle,
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      ...(textFill ? { 
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        ...(textCenter ? { justifyContent: 'center' } : {}) 
      } : {
        maxWidth: '100%',
      })
    };
  }, [baseTextStyle, textFill, textCenter]);

  const glyphDisplayStyle = useMemo(() => {
    if (selectedFont?.isVariableFont) {
      // Для вариативных шрифтов используем только font-variation-settings
      return {
        ...(variationSettingsValue ? { fontVariationSettings: variationSettingsValue } : {})
      };
    } else {
      // Для НЕвариативных шрифтов используем font-weight и font-style
      return {
        fontStyle: fontStyleValue,
        fontWeight: fontWeightValue
      };
    }
  }, [fontStyleValue, fontWeightValue, selectedFont, variationSettingsValue]);

  const loadPresetFont = useCallback(async (fontName) => {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    
    fontLink.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap`;
    
    const fontLinkVariable = document.createElement('link');
    fontLinkVariable.rel = 'stylesheet';
    fontLinkVariable.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:ital,wght@0,100..900;1,100..900&display=swap`;
    
    document.head.appendChild(fontLinkVariable);
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'font-loading-indicator';
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.background = 'rgba(255, 255, 255, 0.9)';
    loadingIndicator.style.padding = '20px';
    loadingIndicator.style.borderRadius = '8px';
    loadingIndicator.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    loadingIndicator.style.zIndex = '9999';
    loadingIndicator.innerHTML = `<div style="text-align: center;">
      <div style="margin-bottom: 10px; font-weight: bold; color: #3B82F6;">Загрузка шрифта ${fontName}...</div>
      <div style="height: 4px; width: 200px; background: #EEF2FF; overflow: hidden; border-radius: 4px;">
        <div id="progress-bar" style="height: 100%; width: 0%; background: #3B82F6; transition: width 0.3s;"></div>
      </div>
    </div>`;
    
    document.body.appendChild(loadingIndicator);
    
    let loadProgress = 0;
    const updateProgress = () => {
      loadProgress += 20;
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.style.width = `${Math.min(loadProgress, 90)}%`;
      }
    };
    
    const progressInterval = setInterval(updateProgress, 100);
    
    fontLink.onload = async () => {
      clearInterval(progressInterval);
      
      if (document.getElementById('progress-bar')) {
        document.getElementById('progress-bar').style.width = '100%';
      }
      
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const fontObj = await processGoogleFont(fontName, 400, 'normal');
        
        const loadingIndicator = document.getElementById('font-loading-indicator');
        if (loadingIndicator) {
          document.body.removeChild(loadingIndicator);
        }
        
        handleFontsUploaded([fontObj]);
        
        if (toast) {
          toast.success(`Шрифт ${fontName} успешно загружен`, {
            position: "bottom-right",
            autoClose: 3000
          });
        }
      } catch (error) {
        const basicFontObj = {
          id: Math.random().toString(36).substring(2, 15),
          name: fontName,
          source: 'google',
          family: fontName,
          currentWeight: 400,
          currentStyle: 'normal',
          availableStyles: [
            { name: 'Regular', weight: 400, style: 'normal' },
            { name: 'Bold', weight: 700, style: 'normal' }
          ],
          isVariableFont: false,
          file: new Blob([''], { type: 'font/ttf' }),
          url: fontLink.href
        };
        
        const loadingIndicator = document.getElementById('font-loading-indicator');
        if (loadingIndicator) {
          document.body.removeChild(loadingIndicator);
        }
        
        handleFontsUploaded([basicFontObj]);
        
        if (toast) {
          toast.error(`Проблема при инициализации шрифта ${fontName}. Некоторые функции могут быть недоступны.`, {
            position: "bottom-right",
            autoClose: 5000
          });
        }
      }
    };
    
    fontLink.onerror = (error) => {
      clearInterval(progressInterval);
      
      const loadingIndicator = document.getElementById('font-loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.innerHTML = `<div style="text-align: center; color: #EF4444;">
          <div>Ошибка загрузки шрифта ${fontName}</div>
        </div>`;
        
        setTimeout(() => {
          if (document.getElementById('font-loading-indicator')) {
            document.body.removeChild(document.getElementById('font-loading-indicator'));
          }
        }, 2000);
      }
      
      if (toast) {
        toast.error(`Не удалось загрузить шрифт ${fontName}`, {
          position: "bottom-right",
          autoClose: 5000
        });
      }
    };
    
    document.head.appendChild(fontLink);
  }, [handleFontsUploaded]);
  
  const presetFonts = useMemo(() => {
    return ['Roboto', 'Inter', 'Open Sans', 'Lato'];
  }, []);
  
  const waterfallSizes = useMemo(() => {
    return [160, 144, 128, 112, 96, 80, 72, 64, 56, 48, 40, 36, 32, 28, 24, 20, 18, 16, 14, 12];
  }, []);
  
  const weightVariations = useMemo(() => {
    return [
      { name: 'Thin', wght: 100 }, { name: 'ExtraLight', wght: 200 }, { name: 'Light', wght: 300 },
      { name: 'Regular', wght: 400 }, { name: 'Medium', wght: 500 }, { name: 'SemiBold', wght: 600 },
      { name: 'Bold', wght: 700 }, { name: 'ExtraBold', wght: 800 }, { name: 'Black', wght: 900 }
    ];
  }, []);
  const italicVariations = useMemo(() => {
    return [
      { name: 'Thin Italic', wght: 100, slnt: -10, ital: 1 }, { name: 'Light Italic', wght: 300, slnt: -10, ital: 1 },
      { name: 'Italic', wght: 400, slnt: -10, ital: 1 }, { name: 'Medium Italic', wght: 500, slnt: -10, ital: 1 },
      { name: 'Bold Italic', wght: 700, slnt: -10, ital: 1 }, { name: 'Black Italic', wght: 900, slnt: -10, ital: 1 }
    ];
  }, []);
  const axisRatios = useMemo(() => [0, 0.25, 0.5, 0.75, 1], []);

  if (!selectedFont) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">Загрузите шрифт для начала работы</h2>
          <p className="text-gray-600 mb-6">Загрузите TTF, OTF, WOFF или WOFF2 файл шрифта</p>
          <div className="mb-8">
            <FontUploader onFontsUploaded={handleFontsUploaded} />
          </div>
          <div className="text-sm text-gray-500">
            Или выберите один из наших предустановленных шрифтов ниже:
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {presetFonts.map(fontName => (
              <button 
                key={fontName}
                onClick={() => loadPresetFont(fontName)}
                className="bg-white py-3 px-4 rounded-md border border-blue-200 text-blue-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-400"
                style={{ fontFamily: fontName }}
              >
                {fontName}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white relative flex flex-col h-screen w-full overflow-hidden">
      <div className="flex-1 overflow-auto pb-10 w-full relative pt-10" style={{ backgroundColor }}>
        {viewMode === 'plain' && (
          <Suspense fallback={<div className="p-8">Загрузка режима...</div>}>
            <PlainTextMode
              containerStyle={containerStyle}
              contentStyle={contentStyle}
            />
          </Suspense>
        )}
        
        {viewMode === 'waterfall' && (
          <Suspense fallback={<div className="p-8">Загрузка режима...</div>}>
            <WaterfallMode
              baseTextStyle={baseTextStyle}
              waterfallSizes={waterfallSizes}
            />
          </Suspense>
        )}
        
        {viewMode === 'styles' && (
          <Suspense fallback={<div className="p-8">Загрузка режима...</div>}>
            <StylesMode
              selectedFont={selectedFont}
              fontFamilyValue={fontFamilyValue}
              weightVariations={weightVariations}
              italicVariations={italicVariations}
              axisRatios={axisRatios}
              generateVariationSettings={generateVariationSettings}
            />
          </Suspense>
        )}

        {viewMode === 'glyphs' && (
          <Suspense fallback={<div className="p-8 text-center">Загрузка утилит для глифов...</div>}>
             <GlyphsMode
               key={`${selectedFont?.id}-${viewMode === 'glyphs'}`}
               selectedFont={selectedFont}
               fontFamily={fontFamilyValue}
               glyphDisplayStyle={glyphDisplayStyle}
               isActive={viewMode === 'glyphs'}
             />
          </Suspense>
        )}

        {viewMode === 'text' && (
          <Suspense fallback={<div className="p-8">Загрузка режима...</div>}>
            <TextMode
              contentStyle={contentStyle}
              textDisplayBuffer={textDisplayBuffer}
              fontFamilyValue={fontFamilyValue}
              variationSettingsValue={variationSettingsValue}
            />
          </Suspense>
        )}
      </div>

      <div className="text-xs text-blue-600 p-4 bg-white border-t border-blue-100 flex justify-between items-center absolute bottom-0 left-0 right-0 z-10 shadow-lg">
        <div>
          {selectedFont && (
            <>
              <span className="text-blue-800 font-medium">
                {exportedFont 
                  ? exportedFont.name.replace(/-static$/, '') 
                  : selectedFont.name || selectedFont.family || (selectedFont.fontFamily && selectedFont.source !== 'google' 
                       ? selectedFont.fontFamily : 'Шрифт')}
              </span>
              {' • '}
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                {selectedFont.source === 'google' ? 'Google Font' : 'Пользовательский'}
              </span>
              {(selectedFont.variationSettings || selectedFont.isVariableFont) && (
                <span className="ml-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                  Вариативный
                </span>
              )}
              <span className="ml-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                {selectedFont.currentWeight}
              </span>
              {selectedFont.currentStyle === 'italic' && (
                <span className="ml-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  Italic
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCSSClick}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
          >
            Получить CSS
          </button>
          <button 
            onClick={handleScreenshotClick}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded-sm font-medium hover:bg-blue-600 transition-colors shadow-sm hover:shadow flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
            </svg>
            Скриншот
          </button>
        </div>
      </div>
    </div>
  );
} 