import React, { useRef, useEffect } from 'react';
import EditableText from './EditableText';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Компонент для режима простого текста
 * @param {Object} props - Свойства компонента
 * @param {Object} props.containerStyle - Стили контейнера
 * @param {Object} props.contentStyle - Стили содержимого
 */
function PlainTextMode({ containerStyle, contentStyle }) {
  // Получаем text и setText из контекста
  const { text, setText } = useSettings();
  
  // Используем useRef для ссылки на контейнер, если нужно будет управлять фокусом или другими DOM-манипуляциями
  const containerRef = useRef(null);

  // Обеспечиваем, что текст всегда имеет значение
  const displayText = text || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  return (
    <div ref={containerRef} 
      className="min-h-full pr-8 pb-8 pt-8 w-full relative"
      style={containerStyle}
    >
      <EditableText 
        style={contentStyle} 
        isStyles={false}
        syncId="plain"
      />
      <div className="absolute bottom-8 right-2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-md opacity-50 hover:opacity-100 transition-opacity">
        Нажмите для редактирования текста
      </div>
    </div>
  );
}

export default PlainTextMode; 