import React from 'react';
import EditableText from './EditableText';
import { PreviewEditTextHint } from './ui/PreviewEditTextHint';

/**
 * Компонент для режима простого текста
 * @param {Object} props - Свойства компонента
 * @param {Object} props.containerStyle - Стили контейнера
 * @param {Object} props.contentStyle - Стили содержимого
 */
function PlainTextMode({ containerStyle, contentStyle, variant = 'default' }) {
  const isFullscreen = variant === 'fullscreen';

  return (
    <div
      className={
        isFullscreen
          ? 'relative box-border min-h-full w-full px-8 pb-8 pt-8'
          : 'relative min-h-full w-full pr-8 pb-8 pt-8'
      }
      style={containerStyle}
    >
      <EditableText 
        style={contentStyle} 
        isStyles={false}
        syncId="plain"
      />
      {!isFullscreen ? <PreviewEditTextHint /> : null}
    </div>
  );
}

export default PlainTextMode; 
