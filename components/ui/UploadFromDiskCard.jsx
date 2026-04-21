import React from 'react';
import { PlusIcon } from './CommonIcons';

export function UploadFromDiskCard({ onClick }) {
  return (
    <div
      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors duration-200 hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
        <PlusIcon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="text-sm font-medium">Загрузить с диска</div>
      <div className="mt-1 text-xs text-gray-500">TTF, OTF, WOFF или WOFF2</div>
    </div>
  );
}
