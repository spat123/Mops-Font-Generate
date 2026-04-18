import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

function findFontsourceSessionFont(fonts, slug) {
  return fonts.find((f) => f.source === 'fontsource' && f.name === slug);
}

export default function FontsourceCatalogPanel({ fonts, selectOrAddFontsourceFont }) {
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState(null);

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
      try {
        await selectOrAddFontsourceFont(slug, false);
      } catch (e) {
        console.error('[FontsourceCatalogPanel] add', slug, e);
        toast.error(`Не удалось добавить ${label}`);
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
      {catalogItemsNotInSession.map(({ slug, label }) => (
        <div
          key={slug}
          className="flex flex-col rounded-lg bg-surface-card p-4 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
        >
          <div className="font-medium text-sm truncate text-gray-800">{label}</div>
          <div className="mt-2 text-sm text-gray-400 truncate" style={{ fontFamily: 'system-ui, sans-serif' }}>
            AaBbCcDdEe
          </div>
          <div className="mt-1 text-xs text-gray-500">Fontsource</div>
          <button
            type="button"
            className="mt-3 w-full py-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
            onClick={() => addFont(slug, label)}
          >
            Добавить в сессию
          </button>
        </div>
      ))}
    </div>
  );
}
