import React, { useRef, useEffect, memo, useCallback } from 'react';
// Импортируем useSettings
import { useSettings } from '../contexts/SettingsContext';
import { useFontContext } from '../contexts/FontContext';

/**
 * Компонент для редактируемого текста с оптимизацией курсора
 * @param {Object} props - Свойства компонента
 * @param {Object} props.style - Стили текста
 * @param {number} props.size - Размер шрифта (если указан)
 * @param {Object} props.extraStyles - Дополнительные стили
 * @param {boolean} props.isWaterfall - Флаг режима водопада
 * @param {boolean} props.isStyles - Флаг режима стилей
 * @param {string} props.viewMode - Текущий режим отображения
 * @param {string} props.syncId - Идентификатор для синхронизации (напр. 'waterfall', 'styles')
 */
const EditableText = memo(({ 
  style, 
  size, 
  extraStyles, 
  isWaterfall = false, 
  isStyles = false,
  viewMode,
  syncId = 'global',
}) => {
  const { text, setText, settings, backgroundColor } = useSettings();
  const { selectedFont, getFontFamily, getVariationSettings } = useFontContext();

  const contentRef = useRef(null);
  const localTextRef = useRef(text);
  const hasModificationsRef = useRef(false);
  
  // Отладочное сообщение для проверки, что текст обновляется
  // console.log(`EditableText (${syncId}): Текущий текст:`, text);
  
  // Функция для проверки и управления прокруткой
  const adjustScroll = useCallback(() => {
    if (contentRef.current) {
      // Всегда сбрасываем горизонтальную прокрутку для режимов с nowrap
      if (isWaterfall || isStyles) {
        contentRef.current.scrollLeft = 0;
      }
    }
  }, [isWaterfall, isStyles]);
  
  // Синхронизируем локальный текст с глобальным при изменении текста извне или смене режима
  useEffect(() => {
    if (contentRef.current && localTextRef.current !== text) {
      contentRef.current.innerText = text;
      contentRef.current.scrollLeft = 0;
      localTextRef.current = text;
      hasModificationsRef.current = false;
    }
  }, [text, viewMode, syncId]);
  
  // Функция для сохранения изменений в глобальное состояние
  const commitTextChanges = useCallback(() => {
    if (setText && hasModificationsRef.current && localTextRef.current !== text) {
      setText(localTextRef.current);
      hasModificationsRef.current = false;
    }
  }, [setText, text, syncId]);
  
  // Эффект для сохранения изменений при потере фокуса или смене режима/размонтировании
  useEffect(() => {
    const handleBlur = () => {
      if (contentRef.current) {
        contentRef.current.scrollLeft = 0;
      }
      commitTextChanges();
    };

    const elem = contentRef.current;
    if (elem) {
      elem.addEventListener('blur', handleBlur);
    }

    return () => {
      if (elem) {
        elem.removeEventListener('blur', handleBlur);
      }
      commitTextChanges();
    };
  }, [commitTextChanges, viewMode]);
  
  // Обработчик для локального изменения текста
  const handleInput = useCallback((e) => {
    const newText = e.target.innerText;
    localTextRef.current = newText;
    hasModificationsRef.current = true;
    
    setText(newText);

    if (syncId) {
      const selector = `.editable-sync-${syncId}`;
      document.querySelectorAll(selector).forEach(elem => {
        if (elem !== e.target && elem.innerText !== newText) {
          elem.innerText = newText;
          elem.scrollLeft = 0;
        }
      });
    }
    
    adjustScroll();
  }, [setText, syncId, adjustScroll]);
  
  // Обработчик нажатия клавиш для контроля прокрутки при навигации
  const handleKeyUp = useCallback((e) => {
    adjustScroll();
  }, [adjustScroll]);
  
  // Устанавливаем начальное значение при монтировании и настраиваем обработчики событий
  useEffect(() => {
    if (contentRef.current) {
      if (!contentRef.current.innerText && text) {
        contentRef.current.innerText = text;
        localTextRef.current = text;
      }
      
      contentRef.current.scrollLeft = 0;
      
      const handleScroll = () => {
        if ((isWaterfall || isStyles) && contentRef.current) {
          requestAnimationFrame(() => {
            if (contentRef.current) {
              contentRef.current.scrollLeft = 0;
            }
          });
        }
      };
      
      contentRef.current.addEventListener('scroll', handleScroll);
      
      return () => {
        if (contentRef.current) {
          contentRef.current.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [text, isWaterfall, isStyles]);
  
  return (
    <div
      ref={contentRef}
      className={`preview-content pl-8 outline-none editable-sync-${syncId} ${isWaterfall ? 'waterfall-editable' : ''} ${isStyles ? 'styles-editable' : ''}`}
      style={{
        ...style,
        ...(extraStyles || {}),
        ...(size ? { fontSize: `${size}px` } : {})
      }}
      contentEditable="true"
      suppressContentEditableWarning={true}
      onInput={handleInput}
      onKeyUp={handleKeyUp}
    />
  );
});

// Устанавливаем displayName для отладки
EditableText.displayName = 'EditableText';

export default EditableText; 