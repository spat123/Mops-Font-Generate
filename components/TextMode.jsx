import React from 'react';
import EditableText from './EditableText';
import { useSettings } from '../contexts/SettingsContext';
import { useTextDisplayBuffer } from '../hooks/useTextDisplayBuffer';

/**
 * Компонент для режима редактируемого текста с буферизацией
 * @param {Object} props - Свойства компонента
 * @param {Object} props.contentStyle - Стили содержимого
 * @param {string} props.fontFamily - Семейство шрифтов
 * @param {string} props.variationSettingsValue - Настройки вариативных осей
 */
function TextMode({
  contentStyle,
  fontFamily,
  variationSettingsValue,
}) {
  const { text } = useSettings();
  const textContainerRef = useTextDisplayBuffer({
    text,
    contentStyle,
    fontFamily,
    variationSettingsValue,
  });

  return (
    <div
      ref={textContainerRef}
      className="relative flex h-full min-h-full w-full flex-col pb-8 pr-8 animated-text-container"
    >
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
