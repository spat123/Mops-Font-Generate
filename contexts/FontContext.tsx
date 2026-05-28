import { createContext, useContext, type ReactNode } from 'react';
import { useFontManager } from '../hooks/useFontManager';

type FontContextValue = ReturnType<typeof useFontManager>;

const FontContext = createContext<FontContextValue | null>(null);

export const FontProvider = ({ children }: { children: ReactNode }) => {
  const fontManagerData = useFontManager();
  return <FontContext.Provider value={fontManagerData}>{children}</FontContext.Provider>;
};

export const useFontContext = (): FontContextValue => {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFontContext must be used within a FontProvider');
  }
  return context;
};
