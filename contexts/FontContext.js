import React, { createContext, useContext } from 'react';
import { useFontManager } from '../hooks/useFontManager';

const FontContext = createContext(null);

export const FontProvider = ({ children }) => {
  const fontManagerData = useFontManager();
  return <FontContext.Provider value={fontManagerData}>{children}</FontContext.Provider>;
};

export const useFontContext = () => {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFontContext must be used within a FontProvider');
  }
  return context;
};
