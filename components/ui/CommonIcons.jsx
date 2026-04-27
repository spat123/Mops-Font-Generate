import React from 'react';
import { EditAssetIcon } from './EditAssetIcon';
import { delIconUrl, linkIconUrl, searchIconUrl, shareIconUrl } from './editIconUrls';

export function PlusIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function EditIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 3.487 3.651 3.651M18.39 1.96a2.25 2.25 0 1 1 3.182 3.182L7.5 19.214 3 21l1.786-4.5L18.39 1.96Z" />
    </svg>
  );
}

export function TrashIcon({ className = 'h-4 w-4' }) {
  return <EditAssetIcon src={delIconUrl} className={className} />;
}

/** Открыть во внешнем / в редакторе — стрелка из квадрата */
export function OpenExternalIcon({ className = 'h-4 w-4' }) {
  return <EditAssetIcon src={linkIconUrl} className={className} />;
}

export function ShareIcon({ className = 'h-4 w-4' }) {
  return <EditAssetIcon src={shareIconUrl} className={className} />;
}

export function SearchIcon({ className = 'h-4 w-4' }) {
  return <EditAssetIcon src={searchIconUrl} className={className} />;
}
