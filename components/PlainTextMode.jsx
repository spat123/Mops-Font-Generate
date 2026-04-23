import React from 'react';
import EditableText from './EditableText';

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
      {!isFullscreen && (
        <div className="absolute -bottom-1 left-5 text-xs uppercase text-gray-400 opacity-50 hover:opacity-100 transition-opacity">
          Нажмите для редактирования текста
        </div>
      )}
    </div>
  );
}

export default PlainTextMode; 
