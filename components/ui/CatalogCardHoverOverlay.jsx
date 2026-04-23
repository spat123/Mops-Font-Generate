import React from 'react';
import { CatalogDownloadSplitButton } from './CatalogDownloadSplitButton';

function OpenInEditorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.6"
      stroke="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

export function CatalogCardHoverOverlay({
  centered = false,
  onOpen,
  openAriaLabel,
  openLabel = 'Открыть',
  downloadButtonProps,
}) {
  const resolvedDownloadButtonProps =
    downloadButtonProps && typeof downloadButtonProps === 'object' ? downloadButtonProps : {};

  const openButton = (
    <button
      type="button"
      data-no-card-select="true"
      onClick={(event) => {
        event.stopPropagation();
        onOpen?.();
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white/95 px-2 text-[11px] uppercase font-semibold text-gray-800 transition-colors hover:bg-white"
      aria-label={openAriaLabel}
    >
      <OpenInEditorIcon />
      {openLabel}
    </button>
  );

  const downloadButton = <CatalogDownloadSplitButton className="w-auto" {...resolvedDownloadButtonProps} />;

  return centered ? (
    <div className="flex h-full w-full items-center justify-center">
      <div className="pointer-events-auto flex items-center gap-3">
        {openButton}
        {downloadButton}
      </div>
    </div>
  ) : (
    <div className="relative h-full w-full">
      <div className="pointer-events-auto absolute bottom-2 left-2">{openButton}</div>
      <div className="pointer-events-auto absolute bottom-2 right-2">{downloadButton}</div>
    </div>
  );
}
