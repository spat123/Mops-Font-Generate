import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

function findFontsourceSessionFont(fonts, slug) {
  return fonts.find((f) => f.source === 'fontsource' && f.name === slug);
}

export default function FontsourceCatalogPanel({
  fonts,
  selectedFont,
  safeSelectFont,
  removeFont,
  selectOrAddFontsourceFont,
  setActiveTab,
}) {
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-full">
      {items.map(({ slug, label }) => {
        const loaded = findFontsourceSessionFont(fonts, slug);
        const isChosen = loaded && selectedFont === loaded;

        if (loaded) {
          return (
            <div
              key={slug}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 relative ${
                isChosen
                  ? 'bg-blue-50 border-blue-300 shadow-sm'
                  : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50'
              }`}
              onClick={() => {
                safeSelectFont(loaded);
                setActiveTab('preview');
              }}
            >
              <div className="font-medium text-sm truncate">{loaded.displayName || label}</div>
              <div
                className="mt-2 truncate"
                style={{
                  fontFamily: loaded.fontFamily
                    ? `'${loaded.fontFamily}'`
                    : `'${loaded.displayName || loaded.name}'`,
                  fontSize: '20px',
                }}
              >
                AaBbCcDdEe
              </div>
              <div className="mt-1 text-xs text-gray-500">Fontsource · в сессии</div>
              <button
                type="button"
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFont(loaded.id);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        }

        return (
          <div
            key={slug}
            className="p-4 rounded-lg border border-dashed border-gray-200 hover:border-blue-200 hover:bg-blue-50/60 transition-all duration-200 flex flex-col"
          >
            <div className="font-medium text-sm truncate text-gray-800">{label}</div>
            <div className="mt-2 text-sm text-gray-400 truncate" style={{ fontFamily: 'system-ui, sans-serif' }}>
              AaBbCcDdEe
            </div>
            <div className="mt-1 text-xs text-gray-500">Fontsource</div>
            <button
              type="button"
              className="mt-3 w-full py-2 text-sm font-medium rounded-md border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
              onClick={() => addFont(slug, label)}
            >
              Добавить в сессию
            </button>
          </div>
        );
      })}
    </div>
  );
}
