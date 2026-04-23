import React from 'react';

function GridIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RowsIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <rect x="2.5" y="3" width="15" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="8.25" width="15" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="13.5" width="15" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CatalogGridModeToggle({ value = 'grid', onChange }) {
  const buttonBaseClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors';

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label="Режим сетки"
        onClick={() => onChange?.('grid')}
        className={`${buttonBaseClass} ${
          value === 'grid'
            ? 'border-accent bg-accent text-white'
            : 'border-gray-200 bg-white text-gray-800 hover:text-accent'
        }`}
      >
        <GridIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Режим в строку"
        onClick={() => onChange?.('row')}
        className={`${buttonBaseClass} ${
          value === 'row'
            ? 'border-accent bg-accent text-white'
            : 'border-gray-200 bg-white text-gray-800 hover:text-accent'
        }`}
      >
        <RowsIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
