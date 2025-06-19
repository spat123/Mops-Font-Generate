import React, { createContext, useContext } from 'react';
import { useFontManager } from '../hooks/useFontManager';

// 1. Создаем контекст
const FontContext = createContext(null);

// 2. Создаем провайдер
export const FontProvider = ({ children }) => {
  // Вызываем хук useFontManager один раз здесь
  const fontManagerData = useFontManager();

  // Передаем все возвращаемые значения хука через value провайдера
  return (
    <FontContext.Provider value={fontManagerData}>
      {children}
    </FontContext.Provider>
  );
};

// 3. Создаем кастомный хук для удобного доступа к контексту
export const useFontContext = () => {
  const context = useContext(FontContext);
  if (!context) {
    // Эта ошибка сработает, если компонент, использующий useFontContext,
    // не будет обернут в FontProvider
    throw new Error('useFontContext must be used within a FontProvider');
  }
  return context;
}; 