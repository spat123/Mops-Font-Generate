import React from 'react';
import { PlusIconGrayCircle } from './PlusIconGrayCircle';

export function UploadFromDiskCard({ onClick }) {
  return (
    <div
      className="group flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors duration-200 hover:bg-gray-50"
      onClick={onClick}
    >
      <PlusIconGrayCircle className="mb-2" />
      <div className="text-sm font-medium">Загрузить с диска</div>
      <div className="mt-1 text-xs text-gray-500">TTF, OTF, WOFF или WOFF2</div>
    </div>
  );
}
