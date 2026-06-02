import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { ToastContainer } from 'react-toastify';
import '@fontsource/inter/cyrillic-400.css';
import '@fontsource/inter/cyrillic-500.css';
import '@fontsource/inter/cyrillic-600.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '../styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/appToastify.css';
import { SettingsProvider } from '../contexts/SettingsContext';
import { FontProvider } from '../contexts/FontContext';
import { AuthReturningUserMarker } from '../components/auth/AuthReturningUserMarker';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { OpenGraphHead } from '../components/seo/OpenGraphHead';
import { getDefaultSiteSeo } from '../utils/siteSeo';
import type { SiteSeoMeta } from '../utils/siteSeo';
import { installAppCacheConsoleCommands } from '../utils/appCacheConsoleCommands';

const defaultSiteSeo = getDefaultSiteSeo(
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://dynamicfont.ru').replace(
    /\/$/,
    '',
  ),
);

const VercelObservability = dynamic(
  () => import('../components/VercelObservability').then((m) => m.VercelObservability),
  { ssr: false },
);

type AppPageProps = {
  session?: Session | null;
  seo?: SiteSeoMeta;
};

export default function MyApp({
  Component,
  pageProps: { session, seo: pageSeo, ...pageProps },
}: AppProps<AppPageProps>) {
  useEffect(() => {
    installAppCacheConsoleCommands();
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
      if (clearFontsStyle.parentNode) {
        clearFontsStyle.parentNode.removeChild(clearFontsStyle);
      }
    };
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" type="image/png" sizes="120x120" href="/icon-120.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon-120.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </Head>
      {!pageSeo ? (
        <OpenGraphHead
          title={defaultSiteSeo.title}
          description={defaultSiteSeo.description}
          canonicalUrl={defaultSiteSeo.canonicalUrl}
          imageUrl={defaultSiteSeo.imageUrl ?? defaultSiteSeo.canonicalUrl}
          imageWidth={defaultSiteSeo.imageWidth}
          imageHeight={defaultSiteSeo.imageHeight}
          imageType={defaultSiteSeo.imageType}
          imageAlt={defaultSiteSeo.imageAlt}
          siteName={defaultSiteSeo.siteName}
          type={defaultSiteSeo.type}
        />
      ) : null}

      <SessionProvider session={session} refetchOnWindowFocus={false}>
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
              className="app-toast-container"
              {...({ bodyClassName: 'app-toast__body' } as Record<string, string>)}
            />
          </FontProvider>
        </SettingsProvider>
      </SessionProvider>
      <VercelObservability />
    </>
  );
}
