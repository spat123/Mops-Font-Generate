import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { decodeLibrarySharePayloadFromQueryParam } from '../../utils/libraryShareLink';
import {
  buildShareViewRows,
  libraryDraftFromSharePayload,
  payloadHasAnyCascadeSizes,
} from '../../utils/libraryShareImport';
import {
  resolveFontsourceCatalogItemFromShareItem,
  resolveGoogleCatalogEntryFromShareItem,
} from '../../utils/libraryShareCatalogResolve';
import { downloadLibraryAsZip } from '../../utils/libraryArchiveDownload';
import { useFontLibraries } from '../../hooks/useFontLibraries';
import { getMaxSavedLibrariesForUser } from '../../utils/authLibraryLimits';
import { toast } from '../../utils/appNotify';
import { Tooltip } from '../ui/Tooltip';
import { CatalogGridModeToggle } from '../catalog/CatalogGridModeToggle';
import { ensureGoogleFontPreviewCss } from '../../utils/googleFontPreviewCss';
import {
  readFontsourceCatalogCache,
  writeFontsourceCatalogCache,
} from '../../utils/fontsourceCatalogCache';
import {
  readGoogleFontCatalogCache,
  writeGoogleFontCatalogCache,
} from '../../utils/googleFontCatalogCache';
import { loadFontsourcePreviewFamily } from '../../utils/fontsourcePreviewRuntimeCache';
import { GoogleFontsCatalogCard } from '../catalog/GoogleFontsCatalogCard';
import { FontsourceCatalogCard } from '../catalog/FontsourceCatalogCard';
import { CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX } from '../catalog/CatalogRowModeCard';
import {
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
} from '../../utils/catalogDownloadActions';
import { AppButton } from '../ui/AppButton';
import { LibraryShareSplitLayout } from './LibraryShareSplitLayout';
import { ShareDownloadPanel } from './ShareDownloadPanel';
import { computeShareFontStats } from '../../utils/libraryShareStats';
import { findOwnedShareLibrary } from '../../utils/libraryShareOwnership';
import {
  EDITOR_MAIN_TAB_LS_KEY,
  FONTS_LIBRARY_INNER_TAB_LS_KEY,
} from '../../utils/editorShellStorage';
import { makeSavedLibraryTabId } from '../../utils/savedLibraryTabIds';
import { OpenGraphHead } from '../seo/OpenGraphHead';

const SHARE_ROW_SAMPLE_TOOLTIP =
  'Дважды щёлкните, чтобы изменить образец в этой строке (только на этой странице)';
const SHARE_ROW_EDITOR_ARIA = 'Редактировать образец превью для этой строки';

function CascadeSizesBadge({ sizes }) {
  if (!Array.isArray(sizes) || sizes.length === 0) return null;
  const label = sizes.join(', ');
  return (
    <Tooltip content={`Каскад в ссылке: ${label} px (в редакторе — позже)`} openDelayMs={120}>
      <span
        className="inline-flex max-w-[12rem] cursor-default truncate rounded-sm border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700"
        aria-label={`Каскад: ${label}`}
      >
        Каскад: {label}
      </span>
    </Tooltip>
  );
}

function ShareCloudRow({ row, isRowMode }) {
  if (isRowMode) {
    return (
      <div
        className="relative w-full min-w-0 border-b border-gray-300 bg-white"
        style={{ minHeight: `${CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX}px` }}
      >
        <div className="flex h-full flex-col justify-center px-4 py-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-800">{row.title}</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
            Локальный файл — предпросмотр и скачивание по ссылке недоступны (данные были только у отправителя).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CascadeSizesBadge sizes={row.cascadeSizes} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-32 h-[10.5rem] min-w-0 flex-col rounded-lg border border-gray-200 bg-surface-card p-4">
      <p className="line-clamp-2 text-sm font-semibold uppercase tracking-wide text-gray-900">{row.title}</p>
      <p className="mt-2 text-xs leading-snug text-gray-500">Локальный файл — недоступен по ссылке</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <CascadeSizesBadge sizes={row.cascadeSizes} />
      </div>
    </div>
  );
}

export function LibrarySharePage({ seo, initialPayload = null }) {
  const router = useRouter();
  const { status, data: session } = useSession();
  const { createLibrary, libraries: savedLibraries } = useFontLibraries();
  const [layout, setLayout] = useState('list');
  const [zipBusy, setZipBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [fontsourcePreviewFamilyBySlug, setFontsourcePreviewFamilyBySlug] = useState({});
  /** Локальный образец ROW на странице share (по ключу строки), не влияет на каталог */
  const [rowSampleByKey, setRowSampleByKey] = useState({});
  /** После записи каталога в session-кэш — перерисовать карточки с полными метаданными */
  const [shareCatalogHydratedTick, setShareCatalogHydratedTick] = useState(0);

  const rawShare =
    typeof router.query.share === 'string'
      ? router.query.share
      : Array.isArray(router.query.share)
        ? router.query.share[0]
        : '';

  const payload = useMemo(() => {
    if (initialPayload) return initialPayload;
    if (!router.isReady || !rawShare) return null;
    return decodeLibrarySharePayloadFromQueryParam(rawShare);
  }, [initialPayload, router.isReady, rawShare]);

  const rows = useMemo(() => (payload ? buildShareViewRows(payload) : []), [payload]);

  useEffect(() => {
    if (typeof window === 'undefined' || !payload || !Array.isArray(payload.items)) return undefined;

    const items = payload.items;
    const needsGoogle = items.some(
      (it) => it?.kind === 'catalog-ref' && String(it.source || '').toLowerCase() === 'google',
    );
    const needsFontsource = items.some(
      (it) => it?.kind === 'catalog-ref' && String(it.source || '').toLowerCase() === 'fontsource',
    );

    let cancelled = false;

    const run = async () => {
      let wrote = false;

      if (needsGoogle && readGoogleFontCatalogCache().length === 0) {
        try {
          const res = await fetch('/api/google-fonts-catalog');
          if (!cancelled && res.ok) {
            const data = await res.json();
            const list = Array.isArray(data?.items) ? data.items : [];
            if (list.length > 0) {
              writeGoogleFontCatalogCache(list);
              wrote = true;
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (needsFontsource && readFontsourceCatalogCache().length === 0) {
        try {
          const res = await fetch('/api/fontsource-catalog');
          if (!cancelled && res.ok) {
            const data = await res.json();
            const list = Array.isArray(data?.items) ? data.items : [];
            if (list.length > 0) {
              writeFontsourceCatalogCache(list);
              wrote = true;
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (!cancelled && wrote) {
        setShareCatalogHydratedTick((n) => n + 1);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const draft = useMemo(
    () => (payload ? libraryDraftFromSharePayload(payload) : { name: '', fonts: [] }),
    [payload],
  );
  const hasCascadeHint = useMemo(() => (payload ? payloadHasAnyCascadeSizes(payload) : false), [payload]);
  const libraryTitle = String(payload?.library?.name || draft.name || 'Библиотека').trim();
  const shareStats = useMemo(
    () => computeShareFontStats(rows),
    [rows, shareCatalogHydratedTick],
  );

  const ownedShareLibrary = useMemo(
    () => (payload ? findOwnedShareLibrary(payload, savedLibraries) : null),
    [payload, savedLibraries],
  );
  const isShareOwner = Boolean(ownedShareLibrary);

  const isRowMode = layout === 'list';
  const gridToggleValue = isRowMode ? 'row' : 'grid';
  const handleGridToggleChange = useCallback((v) => {
    setLayout(v === 'row' ? 'list' : 'grid');
  }, []);

  const googleEntries = useMemo(() => {
    return rows
      .filter((r) => r.kind === 'catalog-ref' && r.catalogSource === 'google' && r.shareItem)
      .map((r) => resolveGoogleCatalogEntryFromShareItem(r.shareItem))
      .filter(Boolean);
  }, [rows, shareCatalogHydratedTick]);

  useEffect(() => {
    googleEntries.forEach((entry) => {
      try {
        ensureGoogleFontPreviewCss(entry);
      } catch {
        /* ignore */
      }
    });
  }, [googleEntries]);

  const fontsourceSlugs = useMemo(() => {
    return rows
      .filter((r) => r.kind === 'catalog-ref' && r.catalogSource === 'fontsource' && r.shareItem)
      .map((r) => String(r.shareItem.key || '').trim())
      .filter(Boolean);
  }, [rows]);

  useEffect(() => {
    let cancelled = false;
    fontsourceSlugs.forEach((slug) => {
      loadFontsourcePreviewFamily(slug)
        .then((fam) => {
          if (cancelled || !fam) return;
          setFontsourcePreviewFamilyBySlug((prev) => {
            const css = `'${fam}', sans-serif`;
            if (prev[slug] === css) return prev;
            return { ...prev, [slug]: css };
          });
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [fontsourceSlugs]);

  const handleZipAll = useCallback(async () => {
    if (!draft.fonts.length) {
      toast.info('В архив попадают только шрифты из каталога (Google / Fontsource)');
      return;
    }
    setZipBusy(true);
    try {
      await downloadLibraryAsZip({ name: draft.name, fonts: draft.fonts });
    } finally {
      setZipBusy(false);
    }
  }, [draft]);

  const handleImport = useCallback(async () => {
    if (isShareOwner && ownedShareLibrary?.id) {
      setImportBusy(true);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(EDITOR_MAIN_TAB_LS_KEY, 'library');
          window.localStorage.setItem(
            FONTS_LIBRARY_INNER_TAB_LS_KEY,
            makeSavedLibraryTabId(ownedShareLibrary.id),
          );
        }
        toast.success(`Открываем «${ownedShareLibrary.name}» в редакторе`);
        await router.push('/');
      } finally {
        setImportBusy(false);
      }
      return;
    }

    if (!draft.fonts.length) {
      toast.info('При сохранении в редактор попадают только шрифты из каталога (Google / Fontsource)');
      return;
    }
    if (status === 'loading') {
      toast.info('Проверка входа…');
      return;
    }
    if (status !== 'authenticated') {
      toast.info('Войдите, чтобы сохранить список в редакторе');
      const callbackUrl =
        typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search || ''}` : '/';
      void signIn(undefined, { callbackUrl });
      return;
    }
    const maxLibs = getMaxSavedLibrariesForUser(Boolean(session?.user?.isPro));
    if (savedLibraries.length >= maxLibs) {
      toast.info(
        `Достигнут лимит библиотек (${maxLibs}). Удалите одну на главной, чтобы импортировать ещё одну.`,
      );
      return;
    }
    setImportBusy(true);
    try {
      const created = createLibrary({ name: draft.name, fonts: draft.fonts });
      if (created) {
        toast.success(`Список «${created.name}» сохранён. Откройте редактор — он появится среди ваших библиотек.`);
      } else {
        toast.error('Не удалось сохранить список');
      }
    } finally {
      setImportBusy(false);
    }
  }, [
    createLibrary,
    draft,
    isShareOwner,
    ownedShareLibrary,
    router,
    savedLibraries.length,
    session?.user?.isPro,
    status,
  ]);

  const commitRowSample = useCallback((rowKey, text) => {
    const t = String(text ?? '').trim();
    setRowSampleByKey((prev) => {
      const next = { ...prev };
      if (!t) delete next[rowKey];
      else next[rowKey] = t;
      return next;
    });
  }, []);

  const pageReady = router.isReady;
  const invalid = Boolean(pageReady && rawShare && !payload);
  const missingShare = Boolean(pageReady && !rawShare);

  const headTitle = invalid
    ? 'Ссылка недействительна — DINAMIC FONT'
    : missingShare
      ? 'Ссылка на шрифты — DINAMIC FONT'
      : `${libraryTitle} — DINAMIC FONT`;

  const pageSeo = seo
    ? { ...seo, title: headTitle }
    : {
        title: headTitle,
        description: 'Список шрифтов по ссылке: скачать архивом или сохранить в редакторе.',
      };

  const emptyStateCard =
    'mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm';

  const handleSignInForImport = useCallback(() => {
    const callbackUrl =
      typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search || ''}` : '/';
    void signIn(undefined, { callbackUrl });
  }, []);

  const renderCatalogRow = (row) => {
    if (row.kind === 'cloud-upload-ref') {
      return <ShareCloudRow row={row} isRowMode={isRowMode} />;
    }
    if (!row.shareItem) return null;

    if (row.catalogSource === 'google') {
      const entry = resolveGoogleCatalogEntryFromShareItem(row.shareItem);
      if (!entry?.family) return null;
      return (
        <>
          {row.cascadeSizes?.length ? (
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 sm:px-6">
              <CascadeSizesBadge sizes={row.cascadeSizes} />
            </div>
          ) : null}
          <GoogleFontsCatalogCard
            entry={entry}
            busy={false}
            selected={false}
            isRowMode={isRowMode}
            shareSurface
            onDownloadPackageZip={downloadGooglePackageZip}
            onDownloadAsFormat={downloadGoogleAsFormat}
            onDownloadVariableVariant={downloadGoogleVariableVariant}
            draggable={false}
            previewText="AaBbCcDdEe"
            rowCatalogPreviewText={rowSampleByKey[row.rowKey]}
            rowPreviewAlign="start"
            rowSampleTooltip={SHARE_ROW_SAMPLE_TOOLTIP}
            rowPreviewEditorAriaLabel={SHARE_ROW_EDITOR_ARIA}
            pinPreviewColumnClassName="items-start"
            onRowGlobalSampleCommit={(text) => commitRowSample(row.rowKey, text)}
            footerRightTooltipContent="По метаданным Google Fonts: число статических начертаний в семействе"
          />
        </>
      );
    }

    if (row.catalogSource === 'fontsource') {
      const item = resolveFontsourceCatalogItemFromShareItem(row.shareItem);
      if (!item) return null;
      const slug = String(item.id || item.slug || '').trim();
      const previewFamily = fontsourcePreviewFamilyBySlug[slug] || 'system-ui, sans-serif';
      return (
        <>
          {row.cascadeSizes?.length ? (
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 sm:px-6">
              <CascadeSizesBadge sizes={row.cascadeSizes} />
            </div>
          ) : null}
          <FontsourceCatalogCard
            item={item}
            previewFamily={previewFamily}
            busy={false}
            selected={false}
            isRowMode={isRowMode}
            shareSurface
            onDownloadPackageZip={downloadFontsourcePackageZip}
            onDownloadAsFormat={downloadFontsourceAsFormat}
            onDownloadVariableVariant={downloadFontsourceVariableVariant}
            draggable={false}
            previewText="AaBbCcDdEe"
            rowCatalogPreviewText={rowSampleByKey[row.rowKey]}
            rowPreviewAlign="start"
            rowSampleTooltip={SHARE_ROW_SAMPLE_TOOLTIP}
            rowPreviewEditorAriaLabel={SHARE_ROW_EDITOR_ARIA}
            pinPreviewColumnClassName="items-start"
            onRowGlobalSampleCommit={(text) => commitRowSample(row.rowKey, text)}
          />
        </>
      );
    }

    return null;
  };

  return (
    <>
      <OpenGraphHead {...pageSeo} />
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {!pageReady ? (
          <main className="flex min-h-screen items-center justify-center px-4 py-12">
            <div className={`${emptyStateCard} text-sm text-gray-600`}>Загрузка…</div>
          </main>
        ) : missingShare || invalid ? (
          <main className="flex min-h-screen items-center justify-center px-4 py-12">
            {missingShare ? (
              <div className={emptyStateCard}>
                <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Нет данных в ссылке</h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Откройте полную ссылку «Поделиться» из редактора — в адресе должен быть параметр{' '}
                  <code className="rounded-sm bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-800">share=</code>.
                </p>
                <AppButton as={Link} href="/" variant="accent" className="mt-8 !rounded-lg">
                  На главную
                </AppButton>
              </div>
            ) : (
              <div className={emptyStateCard}>
                <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                  Ссылка повреждена или устарела
                </h1>
                <p className="mt-3 text-sm text-gray-600">Попросите отправителя сформировать ссылку заново.</p>
                <AppButton as={Link} href="/" variant="accent" className="mt-8 !rounded-lg">
                  На главную
                </AppButton>
              </div>
            )}
          </main>
        ) : (
          <LibraryShareSplitLayout
            listPanel={
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <header className="shrink-0 border-b border-gray-200 px-4 py-3 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-semibold uppercase tracking-wide text-gray-900">
                      <span className="min-w-0 truncate">{libraryTitle}</span>
                      <span className="shrink-0 whitespace-nowrap tabular-nums text-gray-500">
                        {rows.length} шт.
                      </span>
                    </h1>
                    <CatalogGridModeToggle value={gridToggleValue} onChange={handleGridToggleChange} />
                  </div>
                </header>
                {hasCascadeHint ? (
                  <div
                    className="shrink-0 border-b border-accent/30 bg-accent-soft px-4 py-2.5 text-xs leading-relaxed text-gray-800 sm:px-6"
                    role="status"
                  >
                    <span className="font-semibold uppercase tracking-wide text-gray-900">Каскад в ссылке.</span>{' '}
                    Размеры указаны у соответствующих шрифтов.
                  </div>
                ) : null}
                <div className="catalog-scroll-area min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
                  {rows.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-gray-600 sm:px-6">В ссылке нет шрифтов.</p>
                  ) : isRowMode ? (
                    <div className="bg-white">
                      {rows.map((row) => (
                        <React.Fragment key={row.rowKey}>{renderCatalogRow(row)}</React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-2 xl:grid-cols-3">
                      {rows.map((row) => (
                        <li key={row.rowKey} className="min-w-0">
                          {renderCatalogRow(row)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            }
            downloadPanel={
              <ShareDownloadPanel
                stats={shareStats}
                catalogDownloadableCount={draft.fonts.length}
                importBusy={importBusy}
                zipBusy={zipBusy}
                isShareOwner={isShareOwner}
                isAuthenticated={status === 'authenticated'}
                onImport={handleImport}
                onZip={handleZipAll}
                onSignIn={handleSignInForImport}
              />
            }
          />
        )}
      </div>
    </>
  );
}
