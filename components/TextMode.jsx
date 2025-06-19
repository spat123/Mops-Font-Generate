import React, { useRef, useEffect } from 'react';
import EditableText from './EditableText';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Компонент для режима редактируемого текста с буферизацией
 * @param {Object} props - Свойства компонента
 * @param {Object} props.contentStyle - Стили содержимого
 * @param {Object} props.textDisplayBuffer - Буфер для отображения текста
 * @param {string} props.fontFamily - Семейство шрифтов
 * @param {string} props.variationSettingsValue - Настройки вариативных осей
 */
function TextMode({
  contentStyle,
  textDisplayBuffer,
  fontFamily,
  variationSettingsValue,
}) {
  const { text, setText } = useSettings();
  const textContainerRef = useRef(null);

  useEffect(() => {
    let initialized = false;
    if (textContainerRef.current) {
      initialized = textDisplayBuffer.init(textContainerRef.current);
    }
    
    return () => {
      if (initialized) {
        textDisplayBuffer.cleanup();
      }
    };
  }, [textDisplayBuffer]);

  useEffect(() => {
    if (textContainerRef.current && textDisplayBuffer.elements.main) {
      const bufferStyle = {
        ...contentStyle,
        fontFamily,
        fontVariationSettings: variationSettingsValue
      };
      textDisplayBuffer.update(text, bufferStyle);
    }
  }, [text, contentStyle, fontFamily, variationSettingsValue, textDisplayBuffer]);

  return (
    <div ref={textContainerRef} className="relative flex flex-col h-full animated-text-container">
      <EditableText
        style={{ ...contentStyle, position: 'relative', zIndex: 10, color: 'transparent', caretColor: contentStyle.color || 'black' }}
        isStyles={false}
        syncId="text"
        autoFocus={true}
      />
    </div>
  );
}

export default TextMode; 