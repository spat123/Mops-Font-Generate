import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import CatalogSessionAddSpinner from './ui/CatalogSessionAddSpinner';

function findFontsourceSessionFont(fonts, slug) {
  return fonts.find((f) => f.source === 'fontsource' && f.name === slug);
}

export default function FontsourceCatalogPanel({ fonts, selectOrAddFontsourceFont }) {
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [addingSlug, setAddingSlug] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/fontsource-catalog');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || 'Ошибка');
          console.error('[FontsourceCatalogPanel]', e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addFont = useCallback(
    async (slug, label) => {
      setAddingSlug(slug);
      try {
        await selectOrAddFontsourceFont(slug, false);
      } catch (e) {
        console.error('[FontsourceCatalogPanel] add', slug, e);
        toast.error(`Не удалось добавить ${label}`);
      } finally {
        setAddingSlug(null);
      }
    },
    [selectOrAddFontsourceFont],
  );

  /** До любых return — иначе «Rendered more hooks than during the previous render» */
  const catalogItemsNotInSession = useMemo(
    () => items.filter(({ slug }) => !findFontsourceSessionFont(fonts, slug)),
    [items, fonts],
  );

  if (loadError) {
    return <p className="text-sm text-red-600 mt-2">Каталог Fontsource: {loadError}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 mt-2">
        В package.json не найдено зависимостей @fontsource/*.
      </p>
    );
  }

  if (catalogItemsNotInSession.length === 0) {
    return (
      <p className="text-sm text-gray-500 mt-2">
        Все пакеты Fontsource из списка уже в сессии. Переключайте шрифты во вкладках над областью просмотра.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-full">
      {catalogItemsNotInSession.map(({ slug, label }) => {
        const busy = addingSlug === slug;
        return (
        <div
          key={slug}
          className="group relative flex flex-col rounded-lg bg-surface-card p-4 pt-3 pr-3 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
        >
          <div
            className={
              'absolute right-2 top-2 z-10 max-w-[min(100%,12rem)] transition-opacity duration-200 ' +
              (busy
                ? 'pointer-events-auto opacity-100'
                : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100')
            }
          >
            <button
              type="button"
              disabled={busy}
              aria-busy={busy}
              aria-label="Добавить в сессию"
              onClick={() => addFont(slug, label)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border-0 bg-transparent px-2 py-1 text-sm font-normal leading-none text-gray-400 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-100"
            >
              <span className="select-none truncate">В сессию</span>
              {busy ? (
                <CatalogSessionAddSpinner />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              )}
            </button>
          </div>
          <div className="font-medium text-sm truncate text-gray-800">{label}</div>
          <div className="mt-2 text-sm text-gray-400 truncate" style={{ fontFamily: 'system-ui, sans-serif' }}>
            AaBbCcDdEe
          </div>
          <div className="mt-1 text-xs text-gray-500">Fontsource</div>
        </div>
        );
      })}
    </div>
  );
}
