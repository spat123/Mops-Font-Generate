import Document, { Html, Head, Main, NextScript } from 'next/document';

/**
 * Ранний bootstrap UI состояния редактора.
 * Нужен, чтобы SSR-заглушка вкладки «Новый» не мигала:
 * - показываем её только если в localStorage ещё нет сохранённого shell (первый визит),
 * - и делаем это ДО первого paint.
 */
export default class MyDocument extends Document {
  render() {
    const bootstrap = `(function(){try{var ls=window.localStorage;var hasShell=!!(ls.getItem('editorMainTab')||ls.getItem('editorEmptySlots')||ls.getItem('editorClosedFontTabIds')||ls.getItem('fontsLibraryInnerTab'));if(!hasShell){document.documentElement.dataset.editorShowNewFallback='1';}}catch(e){try{document.documentElement.dataset.editorShowNewFallback='1';}catch(_){}}})();`;
    const style = `
      /* По умолчанию скрываем SSR-заглушку «Новый», чтобы она не мигала у пользователей, которые закрыли её. */
      .editor-new-ssr-fallback { display: none !important; }
      html[data-editor-show-new-fallback='1'] .editor-new-ssr-fallback { display: flex !important; }

      /* Убираем «плюсик → потом вкладки»: не показываем строку вкладок, пока shell не восстановлен на клиенте. */
      html:not([data-editor-ui-ready='1']) .editor-tabbar-container { visibility: hidden !important; }
    `;

    return (
      <Html>
        <Head>
          <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
          <style dangerouslySetInnerHTML={{ __html: style }} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

