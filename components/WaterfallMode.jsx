import React, { useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useSettings } from '../contexts/SettingsContext';
import { useFontContext } from '../contexts/FontContext';
import EditableText from './EditableText';

// Стандартные размеры для режима Waterfall - НАЧИНАЕМ СО 180px
const waterfallSizes = [180, 120, 96, 72, 60, 48, 36, 30, 24, 18, 14, 12, 10, 8];

const WaterfallMode = () => {
  // Получаем все нужные настройки, включая textColor
  const { 
    text, 
    backgroundColor, 
    textAlignment, 
    lineHeight, 
    textCase, 
    textColor 
  } = useSettings();
  
  const { selectedFont, getFontFamily, fontCssProperties } = useFontContext();

  // Как в FontPreview: полный font-family (с sans fallback) + вес/стиль для статики + FVS для VF.
  const baseTextStyle = useMemo(() => {
    const fromHook =
      fontCssProperties && typeof fontCssProperties === 'object' && fontCssProperties.fontFamily
        ? { ...fontCssProperties }
        : { fontFamily: getFontFamily() };
    return {
      ...fromHook,
      textAlign: textAlignment,
      textTransform: textCase === 'none' ? 'none' : textCase,
      color: textColor,
    };
  }, [
    fontCssProperties,
    getFontFamily,
    textAlignment,
    textCase,
    textColor,
  ]);

  // Оборачиваем renderItem в useCallback
  const renderItem = useCallback((index, size) => {
    const uniqueKey = `${selectedFont?.id || 'no-font'}-${size}-${index}`; // Уникальный ключ

    // Собираем itemStyle точно как в оригинале
    const itemStyle = {
      ...baseTextStyle, 
      fontSize: `${size}px`, 
      lineHeight: size > 48 ? 1.0 : lineHeight, // Оригинальная логика lineHeight
      whiteSpace: 'nowrap', 
      overflow: 'hidden', 
      width: '100%', 
      textAlign: textAlignment, // Используем textAlignment из context
    };

    return (
      <div key={uniqueKey} className={`${index > 0 ? 'border-t border-gray-200' : ''} pt-4 pb-4`}>
        <div className="flex items-center">
          <div className="text-xs text-gray-500 pl-8 font-medium shrink-0 text-right">{size}px</div>
          <div className="flex-1 overflow-hidden"> {/* Обертка для EditableText */} 
            <EditableText
              style={itemStyle}
              isStyles={false} 
              syncId={`waterfall-${size}`} 
              viewMode="waterfall"
              isWaterfall={true}
            />
          </div>
        </div>
      </div>
    );
  }, [
    // Добавляем все зависимости, используемые внутри renderItem
    selectedFont, 
    baseTextStyle,
    lineHeight, 
    textAlignment, 
    // text (из useSettings) используется в EditableText, но передается через initialText, 
    // поэтому явно renderItem от него не зависит напрямую для структуры/стилей
    // getFontFamily, getVariationSettings включены через baseTextStyle
  ]);

  return (
    <div
      className="font-preview-area overflow-y-auto w-full h-full"
      style={{ backgroundColor: backgroundColor }} // Применяем фон здесь
    >
      {selectedFont ? (
        <div className="pb-2">
          <Virtuoso
            style={{ height: 'calc(100vh - 100px)' }} // Подбираем высоту, чтобы поместился pb-8 и не было двойного скролла
            data={waterfallSizes} // Передаем отсортированные размеры
            itemContent={renderItem} // Используем восстановленную функцию рендеринга
            overscan={200} // Добавляем overscan
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Выберите или загрузите шрифт для просмотра в режиме Waterfall.
        </div>
      )}
    </div>
  );
};

export default WaterfallMode;