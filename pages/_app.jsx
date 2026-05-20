import React, { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ToastContainer } from 'react-toastify';
import '../styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/appToastify.css';
import { SettingsProvider } from '../contexts/SettingsContext';
import { FontProvider } from '../contexts/FontContext';
import { AuthReturningUserMarker } from '../components/auth/AuthReturningUserMarker';
import Head from 'next/head';

export default function MyApp({ Component, pageProps: { session, ...pageProps } }) {
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
        <title>DINAMIC FONT — инструмент для работы со шрифтами</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32-dark.png"
          media="(prefers-color-scheme: dark)"
        />
      </Head>
      
      <SessionProvider session={session}>
        <AuthReturningUserMarker />
        <SettingsProvider>
          <FontProvider>
            <Component {...pageProps} />
            <ToastContainer
            position="bottom-right"
            theme="light"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            limit={4}
            toastClassName="app-toast"
            bodyClassName="app-toast__body"
            className="app-toast-container"
            />
          </FontProvider>
        </SettingsProvider>
      </SessionProvider>
    </>
  );
} 