import React, { useRef, useEffect, useState } from 'react';

const CSSModal = ({ isOpen, onClose, cssCode, fontName }) => {
  const textareaRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Когда isOpen изменяется, обновляем состояние видимости с задержкой
  useEffect(() => {
    if (isOpen) {
      // Небольшая задержка перед показом для анимации
      document.body.style.overflow = 'hidden'; // Блокируем прокрутку страницы
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Разблокируем прокрутку после закрытия
      setTimeout(() => {
        document.body.style.overflow = '';
      }, 300);
    }
  }, [isOpen]);

  // Функция для копирования текста в буфер обмена
  const copyToClipboard = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      document.execCommand('copy');
      // Показываем уведомление об успешном копировании
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fadeIn';
      notification.textContent = 'CSS скопирован в буфер обмена';
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.classList.add('animate-fadeOut');
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 2000);
    }
  };

  // Функция для скачивания CSS как файла
  const downloadCSS = () => {
    const blob = new Blob([cssCode], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fontName || 'font'}-styles.css`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Закрытие модального окна при клике на фон
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Закрытие модального окна по нажатию Escape
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 ${isVisible ? 'bg-black/30' : 'bg-black/0'} duration-300 ease-in-out flex items-center justify-center z-50`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] flex flex-col transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-blue-700 truncate max-w-[calc(100%-2rem)] group relative" title={fontName ? `CSS код для шрифта: ${fontName}` : 'CSS код для шрифта'}>
            <span className="truncate inline-block">CSS код для шрифта{fontName ? `: ${fontName}` : ''}</span>
            <span className="invisible group-hover:visible absolute left-0 -bottom-1 text-xs text-gray-500 whitespace-normal">
              {fontName && fontName.length > 20 ? fontName : ''}
            </span>
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none hover:bg-gray-100 p-1 rounded-full transition-colors"
            aria-label="Закрыть"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4 flex-1 overflow-auto">
          <div className="bg-gray-50 rounded-md p-4 border border-gray-200 shadow-inner">
            <textarea 
              ref={textareaRef}
              className="w-full h-64 font-mono text-sm bg-transparent focus:outline-none resize-none"
              value={cssCode}
              readOnly
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>Этот CSS код содержит:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Правило @font-face для добавления шрифта на страницу</li>
              <li>Настройки font-variation-settings для вариативных шрифтов</li>
              <li>Базовые стили для использования шрифта</li>
            </ul>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Копировать в буфер
          </button>
          <button
            onClick={downloadCSS}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Скачать CSS файл
          </button>
        </div>
      </div>
    </div>
  );
};

export default CSSModal; 