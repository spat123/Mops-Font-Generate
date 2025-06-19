import React, { useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import '../styles/globals.css'; 
import 'react-toastify/dist/ReactToastify.css';
import { SettingsProvider } from '../contexts/SettingsContext';
import { FontProvider } from '../contexts/FontContext';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }) {
  // Очищаем все шрифты при загрузке страницы
  useEffect(() => {
    // Создаем стиль, который очистит все шрифты перед загрузкой
    const clearFontsStyle = document.createElement('style');
    clearFontsStyle.textContent = `
      /* Очистка всех шрифтов */
      @font-face {
        font-family: 'Arial';
        src: local('Arial');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(clearFontsStyle);
    
    return () => {
      // Удаляем стиль при размонтировании
      if (clearFontsStyle.parentNode) {
        clearFontsStyle.parentNode.removeChild(clearFontsStyle);
      }
    };
  }, []);
  
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Font Gauntlet - Инструмент для работы со шрифтами</title>
      </Head>
      
      <SettingsProvider>
        <FontProvider>
          <Component {...pageProps} />
          <ToastContainer 
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </FontProvider>
      </SettingsProvider>
    </>
  );
} 