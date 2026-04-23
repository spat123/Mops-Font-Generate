import React from 'react';

export function CatalogRowHeader({
  family,
  metaItems = [],
  className = '',
  familyClassName = 'absolute left-0 top-0 truncate text-left text-sm font-medium text-gray-800',
  metaClassName = 'flex w-full flex-wrap items-center justify-start gap-x-3 gap-y-1 text-left text-sm uppercase font-semibold text-black',
}) {
  const normalizedMeta = (Array.isArray(metaItems) ? metaItems : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return (
    <div className={`relative w-full min-h-[1rem] ${className}`.trim()}>
      <span className={familyClassName}>{family}</span>
      {normalizedMeta.length > 0 ? (
        <div className="grid w-full grid-cols-[1fr_minmax(0,36rem)_1fr]">
          <div className={`col-start-2 ${metaClassName}`.trim()}>
            {normalizedMeta.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
