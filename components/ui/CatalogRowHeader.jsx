import React from 'react';

/**
 * Заголовок строки каталога ROW: имя семейства и мета в одну строку
 * внутри строки: имя слева, мета визуально по центру карточки.
 */
export function CatalogRowHeader({
  family,
  metaItems = [],
  className = '',
  familyClassName =
    'min-w-0 max-w-full truncate text-left text-xs font-medium leading-tight text-gray-800 sm:text-sm',
  metaClassName =
    'flex min-w-0 w-[min(100%,44rem)] flex-nowrap items-center justify-start gap-x-2 text-left text-sm font-semibold uppercase leading-tight text-black sm:gap-x-3',
}) {
  const normalizedMeta = (Array.isArray(metaItems) ? metaItems : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return (
    <div className={`w-full min-w-0 shrink-0 ${className}`.trim()}>
      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,44rem)_minmax(0,1fr)] items-center">
        <div className={familyClassName}>{family}</div>
        {normalizedMeta.length > 0 ? (
          <div className={`${metaClassName} col-start-2`}>
            {normalizedMeta.map((item, index) => (
              <span key={`${item}-${index}`} className="shrink-0 whitespace-nowrap">
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
