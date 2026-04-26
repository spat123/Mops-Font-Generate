import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CatalogDownloadSplitButton } from './CatalogDownloadSplitButton';
import { EditAssetIcon } from './EditAssetIcon';
import { linkIconUrl } from './editIconUrls';

function OpenInEditorIcon() {
  return <EditAssetIcon src={linkIconUrl} className="h-3.5 w-3.5" />;
}

function SpinnerIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} animate-spin text-red-500`.trim()}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2} />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="14 43"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

function CheckIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      className={`${className} text-red-500`.trim()}
      aria-hidden
    >
      <path
        d="M4.5 10.5L8.25 14.25L15.5 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CatalogCardHoverOverlay({
  centered = false,
  onOpen,
  onRequestCloseHoverUi,
  openAriaLabel,
  openLabel = 'Открыть',
  downloadButtonProps,
}) {
  const resolvedDownloadButtonProps =
    downloadButtonProps && typeof downloadButtonProps === 'object' ? downloadButtonProps : {};
  const rootRef = useRef(null);

  const [openState, setOpenState] = useState('idle'); // idle | loading | done
  const [rowDownloadState, setRowDownloadState] = useState({ busyKey: null, doneKey: null });
  const [useCompactButtons, setUseCompactButtons] = useState(false);
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
  const openDoneTimeoutRef = useRef(null);
  const rowDoneTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (openDoneTimeoutRef.current != null) {
        window.clearTimeout(openDoneTimeoutRef.current);
        openDoneTimeoutRef.current = null;
      }
      if (rowDoneTimeoutRef.current != null) {
        window.clearTimeout(rowDoneTimeoutRef.current);
        rowDoneTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateViewport = () => setViewportW(window.innerWidth);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (centered) {
      setUseCompactButtons(false);
      return undefined;
    }
    const rootEl = rootRef.current;
    if (!rootEl || typeof ResizeObserver === 'undefined') return undefined;
    const updateCompactMode = (width) => {
      const nextCompact = Number(width) > 0 && Number(width) < 320;
      setUseCompactButtons((prev) => (prev === nextCompact ? prev : nextCompact));
    };
    updateCompactMode(rootEl.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const width = entries?.[0]?.contentRect?.width ?? rootEl.getBoundingClientRect().width;
      updateCompactMode(width);
    });
    ro.observe(rootEl);
    return () => ro.disconnect();
  }, [centered]);

  const runOpenWithFeedback = (event) => {
    event.stopPropagation();
    if (!onOpen) return;
    if (openState === 'loading') return;
    if (openDoneTimeoutRef.current != null) {
      window.clearTimeout(openDoneTimeoutRef.current);
      openDoneTimeoutRef.current = null;
    }
    setOpenState('loading');
    void (async () => {
      try {
        const result = onOpen?.();
        const ok = await Promise.resolve(result);
        if (ok === false) {
          setOpenState('idle');
          return;
        }
        setOpenState('done');
        openDoneTimeoutRef.current = window.setTimeout(() => {
          setOpenState('idle');
          openDoneTimeoutRef.current = null;
        }, 900);
      } catch {
        setOpenState('idle');
      }
    })();
  };

  const runRowDownloadWithFeedback = (event, item) => {
    event.stopPropagation();
    if (!item?.onSelect) return;
    if (rowDownloadState.busyKey) return;
    if (rowDoneTimeoutRef.current != null) {
      window.clearTimeout(rowDoneTimeoutRef.current);
      rowDoneTimeoutRef.current = null;
    }
    setRowDownloadState({ busyKey: item.key, doneKey: null });
    void (async () => {
      try {
        const result = item.onSelect?.();
        const ok = await Promise.resolve(result);
        if (ok === false) {
          setRowDownloadState({ busyKey: null, doneKey: null });
          return;
        }
        setRowDownloadState({ busyKey: null, doneKey: item.key });
        rowDoneTimeoutRef.current = window.setTimeout(() => {
          setRowDownloadState({ busyKey: null, doneKey: null });
          rowDoneTimeoutRef.current = null;
        }, 900);
      } catch {
        setRowDownloadState({ busyKey: null, doneKey: null });
      } finally {
        onRequestCloseHoverUi?.();
      }
    })();
  };

  const rowDownloadItems = (
    Array.isArray(resolvedDownloadButtonProps.menuItems) ? resolvedDownloadButtonProps.menuItems : []
  )
    .filter((item) => !item?.hidden)
    .map((item) => ({
      key: item.key,
      label:
        item.key === 'zip'
          ? 'ZIP'
          : item.key === 'variable'
            ? 'VF'
            : String(item.label || '')
                .replace(/\s*\(.*?\)\s*/g, '')
                .trim()
                .toUpperCase(),
      onSelect: item.onSelect,
      disabled: item.disabled,
    }));

  const openIcon = useMemo(() => {
    if (openState === 'loading') return <SpinnerIcon />;
    if (openState === 'done') return <CheckIcon />;
    return <OpenInEditorIcon />;
  }, [openState]);

  const openButton = (
    <button
      type="button"
      data-no-card-select="true"
      onClick={runOpenWithFeedback}
      disabled={openState === 'loading'}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 py-1 text-xs uppercase font-semibold text-gray-800 transition-colors hover:bg-white disabled:cursor-default disabled:opacity-70"
      aria-label={openAriaLabel}
    >
      {openIcon}
      {openLabel}
    </button>
  );

  const compactOpenButton = (
    <button
      type="button"
      data-no-card-select="true"
      onClick={runOpenWithFeedback}
      disabled={openState === 'loading'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-gray-800 transition-colors hover:bg-white disabled:cursor-default disabled:opacity-70"
      aria-label={openAriaLabel}
    >
      {openIcon}
    </button>
  );

  const downloadButton = (
    <CatalogDownloadSplitButton
      className="w-auto"
      hidePrimaryLabel={useCompactButtons || (centered && viewportW < 1024)}
      onActionComplete={onRequestCloseHoverUi}
      {...resolvedDownloadButtonProps}
      layout="comfortable"
    />
  );
  const useRowSplitDownload = centered && viewportW < 1280;
  const useRowIconOnlyActions = centered && viewportW < 1024;

  return centered ? (
    <div ref={rootRef} className="relative h-full w-full">
      <div className="pointer-events-auto absolute bottom-5 right-5 flex max-w-[calc(100%-1.25rem)] flex-wrap justify-end gap-2.5">
        {useRowIconOnlyActions ? compactOpenButton : (
          <button
            type="button"
            data-no-card-select="true"
            onClick={runOpenWithFeedback}
            disabled={openState === 'loading'}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 py-1 text-xs uppercase font-semibold text-gray-800 transition-colors hover:bg-white disabled:cursor-default disabled:opacity-70"
            aria-label={openAriaLabel}
          >
            {openIcon}
            {openLabel}
          </button>
        )}
        {useRowSplitDownload
          ? downloadButton
          : rowDownloadItems.map((item) => (
              <button
                key={item.key}
                type="button"
                data-no-card-select="true"
                disabled={Boolean(item.disabled) || Boolean(rowDownloadState.busyKey)}
                onClick={(event) => runRowDownloadWithFeedback(event, item)}
                className="inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-md bg-white px-3 text-xs uppercase font-semibold text-gray-800 transition-colors hover:bg-white disabled:cursor-default disabled:opacity-50"
              >
                {rowDownloadState.busyKey === item.key ? (
                  <SpinnerIcon className="h-4 w-4" />
                ) : rowDownloadState.doneKey === item.key ? (
                  <CheckIcon className="h-4 w-4" />
                ) : null}
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            ))}
      </div>
    </div>
  ) : (
    <div ref={rootRef} className="relative h-full w-full">
      <div className="pointer-events-auto absolute bottom-4 left-4">
        {useCompactButtons ? compactOpenButton : openButton}
      </div>
      <div className="pointer-events-auto absolute bottom-4 right-4">{downloadButton}</div>
    </div>
  );
}
