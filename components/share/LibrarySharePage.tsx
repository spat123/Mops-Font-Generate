import { useCallback, useEffect, useMemo, useRef, useState, memo, Fragment } from 'react';
import type { SiteSeoMeta } from '../../utils/siteSeo';
import type { SavedLibraryRecord } from '../../types/editorFonts';
import type { CatalogViewMode } from '../catalog/CatalogGridModeToggle';
import type { LibrarySharePageProps } from '../../types/libraryScreens';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import {
  decodeLibrarySharePayloadFromQueryParam,
  type LibrarySharePayload,
} from '../../utils/libraryShareLink';
import {
  buildShareViewRows,
  libraryDraftFromSharePayload,
  payloadHasAnyCascadeSizes,
  type ShareCatalogItem,
  type ShareViewRow,
} from '../../utils/libraryShareImport';
import {
  resolveFontfabricTrialCatalogItemFromShareItem,
  resolveFontshareCatalogItemFromShareItem,
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
import { ensureCatalogCachesLoaded } from '../../utils/ensureCatalogCachesLoaded';
import { pickFontsourcePreviewSubsetsForCardText } from '../../utils/catalogPreviewSample';
import { loadFontsourcePreviewFamily } from '../../utils/fontsourcePreviewRuntimeCache';
import { UnifiedCatalogCard } from '../catalog/UnifiedCatalogCard';
import {
  buildCatalogSourceDownloadProps,
  buildCatalogTrialDownloadProps,
} from '../catalog/buildCatalogSourceDownloadProps';
import { buildSingleSourceUnifiedItem } from '../../utils/unifiedCatalogMerge';
import { CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX } from '../catalog/CatalogRowModeCard';
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
import { ShareAutoEditorOverlay } from './ShareAutoEditorOverlay';
import { buildShareAutoEditorOpenQueryFromPayload } from '../../utils/catalogShareLink';

const SHARE_ROW_SAMPLE_TOOLTIP =
  'Дважды щёлкните, чтобы изменить образец в этой строке (только на этой странице)';
const SHARE_ROW_EDITOR_ARIA = 'Редактировать образец превью для этой строки';
const SHARE_GOOGLE_STYLE_TOOLTIP =
  'По метаданным Google Fonts: число статических начертаний в семействе';

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

type ShareCatalogRefRowProps = {
  row: ShareViewRow;
  isRowMode: boolean;
  previewFamily?: string;
  rowSampleText?: string;
  onCommitRowSample?: (rowKey: string, text: string) => void;
  catalogHydratedTick?: number;
};

const ShareCatalogRefRow = memo(function ShareCatalogRefRow({
  row,
  isRowMode,
  previewFamily,
  rowSampleText,
  onCommitRowSample,
  catalogHydratedTick = 0,
}: ShareCatalogRefRowProps) {
  const unifiedItem = useMemo(() => {
    if (!row?.shareItem) return null;
    if (row.catalogSource === 'google') {
      const entry = resolveGoogleCatalogEntryFromShareItem(row.shareItem as ShareCatalogItem);
      return entry ? buildSingleSourceUnifiedItem('google', entry) : null;
    }
    if (row.catalogSource === 'fontsource') {
      const item = resolveFontsourceCatalogItemFromShareItem(row.shareItem as ShareCatalogItem);
      return item ? buildSingleSourceUnifiedItem('fontsource', item) : null;
    }
    if (row.catalogSource === 'fontshare') {
      const item = resolveFontshareCatalogItemFromShareItem(row.shareItem as ShareCatalogItem);
      return item ? buildSingleSourceUnifiedItem('fontshare', item) : null;
    }
    if (row.catalogSource === 'fontfabric-trial') {
      const item = resolveFontfabricTrialCatalogItemFromShareItem(row.shareItem as ShareCatalogItem);
      return item ? buildSingleSourceUnifiedItem('demo', item) : null;
    }
    return null;
  }, [row, catalogHydratedTick]);

  const primarySource = unifiedItem?.primarySource || row.catalogSource;
  const primaryRaw = unifiedItem?.sources?.[0]?.raw || null;

  const downloadButtonProps = useMemo(() => {
    if (!unifiedItem || !primaryRaw) return null;
    if (primarySource === 'demo') {
      return buildCatalogTrialDownloadProps({
        displayName: unifiedItem.displayName,
        raw: primaryRaw,
        onOpenTrialPage: (trialRaw) => {
          const url = String(trialRaw?.trialUrl || trialRaw?.link || '').trim();
          if (typeof window !== 'undefined' && url) {
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        },
      });
    }
    return buildCatalogSourceDownloadProps({
      sourceId: primarySource,
      raw: primaryRaw,
      displayName: unifiedItem.displayName,
      isVariable: unifiedItem.isVariable,
    });
  }, [primaryRaw, primarySource, unifiedItem]);

  const handleCommitSample = useCallback(
    (text: string) => onCommitRowSample?.(row.rowKey, text),
    [onCommitRowSample, row.rowKey],
  );

  if (!unifiedItem || !downloadButtonProps) return null;

  const resolvedPreviewFamily =
    primarySource === 'google'
      ? `'${unifiedItem.displayName}', sans-serif`
      : previewFamily || 'system-ui, sans-serif';
  const shareCardPreviewText = String(unifiedItem.displayName || row.title || '').trim() || 'Шрифт';

  return (
    <>
      {row.cascadeSizes?.length ? (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 sm:px-6">
          <CascadeSizesBadge sizes={row.cascadeSizes} />
        </div>
      ) : null}
      <UnifiedCatalogCard
        item={unifiedItem}
        primarySource={primarySource}
        primaryRaw={primaryRaw}
        previewFamily={resolvedPreviewFamily}
        downloadButtonProps={downloadButtonProps}
        busy={false}
        selected={false}
        isRowMode={isRowMode}
        shareSurface
        draggable={false}
        previewText={shareCardPreviewText}
        rowCatalogPreviewText={rowSampleText || shareCardPreviewText}
        rowPreviewFallback={shareCardPreviewText}
        rowPreviewAlign="start"
        rowSampleTooltip={SHARE_ROW_SAMPLE_TOOLTIP}
        rowPreviewEditorAriaLabel={SHARE_ROW_EDITOR_ARIA}
        pinPreviewColumnClassName="items-start"
        onRowGlobalSampleCommit={handleCommitSample}
        footerRightTooltipContent={
          primarySource === 'google' ? SHARE_GOOGLE_STYLE_TOOLTIP : undefined
        }
      />
    </>
  );
});

function ShareCloudRow({ row, isRowMode }) {
  if (isRowMode) {
    return (
      <div
        className="relative w-full min-w-0 border-b border-gray-200 bg-white"
        style={{ minHeight: `${CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX}px` }}
      >
        <div className="flex h-full items-center gap-6 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-800">{row.title}</p>
            {row.cascadeSizes?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <CascadeSizesBadge sizes={row.cascadeSizes} />
              </div>
            ) : null}
          </div>
          <p className="shrink-0 max-w-[min(100%,28rem)] truncate text-2xl leading-tight text-gray-800">
            {row.title}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-[10.5rem] min-h-32 min-w-0 flex-col rounded-lg border border-gray-200 bg-surface-card p-4">
      <p className="line-clamp-2 text-sm font-semibold uppercase tracking-wide text-gray-900">{row.title}</p>
      <div className="mt-2 flex min-h-0 flex-1 items-end truncate text-2xl leading-tight text-gray-800">
        {row.title}
      </div>
      {row.cascadeSizes?.length ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <CascadeSizesBadge sizes={row.cascadeSizes} />
        </div>
      ) : null}
    </div>
  );
}

export function LibrarySharePage({ seo, initialPayload = null }: LibrarySharePageProps) {
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
  const autoEditorRedirectedRef = useRef(false);
  const [autoEditorRedirecting, setAutoEditorRedirecting] = useState(false);

  const rawShare =
    typeof router.query.share === 'string'
      ? router.query.share
      : Array.isArray(router.query.share)
        ? router.query.share[0]
        : '';

  const shareId =
    typeof router.query.id === 'string'
      ? router.query.id.trim()
      : Array.isArray(router.query.id)
        ? String(router.query.id[0] || '').trim()
        : '';

  const [fetchedPayload, setFetchedPayload] = useState<LibrarySharePayload | null>(null);
  const [shortShareFetchDone, setShortShareFetchDone] = useState(false);

  useEffect(() => {
    if (!router.isReady || initialPayload || rawShare || !shareId) {
      setShortShareFetchDone(true);
      return undefined;
    }
    let cancelled = false;
    setShortShareFetchDone(false);
    (async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { payload?: LibrarySharePayload };
        if (!cancelled && data?.payload) setFetchedPayload(data.payload);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setShortShareFetchDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, initialPayload, rawShare, shareId]);

  const payload = useMemo(() => {
    if (initialPayload) return initialPayload;
    if (fetchedPayload) return fetchedPayload;
    if (!router.isReady) return null;
    if (rawShare) return decodeLibrarySharePayloadFromQueryParam(rawShare);
    return null;
  }, [initialPayload, fetchedPayload, router.isReady, rawShare]);

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
    const needsFontshare = items.some(
      (it) => it?.kind === 'catalog-ref' && String(it.source || '').toLowerCase() === 'fontshare',
    );
    const needsFontfabricTrial = items.some(
      (it) =>
        it?.kind === 'catalog-ref' && String(it.source || '').toLowerCase() === 'fontfabric-trial',
    );

    let cancelled = false;

    void ensureCatalogCachesLoaded({
      needsGoogle,
      needsFontsource,
      needsFontshare,
      needsFontfabricTrial,
    }).then((wrote) => {
      if (!cancelled && wrote) {
        setShareCatalogHydratedTick((n) => n + 1);
      }
    });
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

  /** Клиентский fallback: share с `autoEditor=1` (если SSR-редирект не сработал). */
  useEffect(() => {
    if (!router.isReady || !payload) return;
    if (router.query.autoEditor !== '1') return;
    if (autoEditorRedirectedRef.current) return;
    const editorQuery = buildShareAutoEditorOpenQueryFromPayload(payload);
    if (!editorQuery) return;
    autoEditorRedirectedRef.current = true;
    setAutoEditorRedirecting(true);
    void router.replace({ pathname: '/', query: editorQuery }).finally(() => {
      setAutoEditorRedirecting(false);
    });
  }, [router, router.isReady, router.query.autoEditor, payload]);

  const ownedShareLibrary = useMemo(
    () => (payload ? findOwnedShareLibrary(payload, savedLibraries) : null),
    [payload, savedLibraries],
  );
  const isShareOwner = Boolean(ownedShareLibrary);

  const isRowMode = layout === 'list';
  const gridToggleValue = isRowMode ? 'row' : 'grid';
  const handleGridToggleChange = useCallback((v: CatalogViewMode) => {
    setLayout(v === 'row' ? 'list' : 'grid');
  }, []);

  const googleEntries = useMemo(() => {
    return rows
      .filter((r) => r.kind === 'catalog-ref' && r.catalogSource === 'google' && r.shareItem)
      .map((r) =>
        resolveGoogleCatalogEntryFromShareItem(
          r.shareItem as Parameters<typeof resolveGoogleCatalogEntryFromShareItem>[0],
        ),
      )
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

  const fontsourcePreviewJobs = useMemo(() => {
    return rows
      .filter((r) => r.kind === 'catalog-ref' && r.catalogSource === 'fontsource' && r.shareItem)
      .map((r) => {
        const item = r.shareItem as ShareCatalogItem;
        const slug = String(item?.key || '').trim();
        const label = String(item?.family || slug).trim();
        return slug ? { slug, label } : null;
      })
      .filter((job): job is { slug: string; label: string } => Boolean(job));
  }, [rows]);

  useEffect(() => {
    let cancelled = false;
    fontsourcePreviewJobs.forEach(({ slug, label }) => {
      const subsets = pickFontsourcePreviewSubsetsForCardText(label);
      loadFontsourcePreviewFamily(slug, { subsets })
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
  }, [fontsourcePreviewJobs]);

  const handleZipAll = useCallback(async () => {
    if (!draft.fonts.length) {
      toast.info('В архив попадают только шрифты из каталога (Google / Fontsource)');
      return;
    }
    setZipBusy(true);
    try {
      await downloadLibraryAsZip({
        id: 'share-download',
        name: draft.name,
        fonts: draft.fonts,
      } as SavedLibraryRecord);
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
  const hasShareRef = Boolean(rawShare || shareId || initialPayload);
  const shortShareLoading = Boolean(
    pageReady && shareId && !rawShare && !initialPayload && !shortShareFetchDone,
  );
  const invalid = Boolean(pageReady && hasShareRef && !payload && !shortShareLoading);
  const missingShare = Boolean(pageReady && !hasShareRef);

  const headTitle = invalid
    ? 'Ссылка недействительна — DINAMIC FONT'
    : missingShare
      ? 'Ссылка на шрифты — DINAMIC FONT'
      : `${libraryTitle} — DINAMIC FONT`;

  const pageSeo: SiteSeoMeta = seo
    ? { ...seo, title: headTitle }
    : {
        title: headTitle,
        description: 'Список шрифтов по ссылке: скачать архивом или сохранить в редакторе.',
        canonicalUrl: '/share',
      };

  const emptyStateCard =
    'mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center';

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

    if (row.catalogSource) {
      const slug =
        row.catalogSource === 'fontsource' ? String(row.shareItem.key || '').trim() : '';
      const previewFamily =
        row.catalogSource === 'fontsource'
          ? fontsourcePreviewFamilyBySlug[slug] || 'system-ui, sans-serif'
          : undefined;

      return (
        <ShareCatalogRefRow
          row={row}
          isRowMode={isRowMode}
          previewFamily={previewFamily}
          rowSampleText={rowSampleByKey[row.rowKey]}
          onCommitRowSample={commitRowSample}
          catalogHydratedTick={shareCatalogHydratedTick}
        />
      );
    }

    return null;
  };

  const showAutoEditorOverlay =
    Boolean(autoEditorRedirecting) ||
    (router.isReady && router.query.autoEditor === '1' && Boolean(payload));

  return (
    <>
      <OpenGraphHead {...pageSeo} />
      {showAutoEditorOverlay ? <ShareAutoEditorOverlay /> : null}
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {!pageReady ? (
          <main className="flex min-h-screen items-center justify-center px-4 py-12">
            <div className={`${emptyStateCard} text-sm text-gray-600`}>Загрузка…</div>
          </main>
        ) : shortShareLoading ? (
          <main className="flex min-h-screen items-center justify-center px-4 py-12">
            <div className={`${emptyStateCard} text-sm text-gray-600`}>Загрузка списка шрифтов…</div>
          </main>
        ) : missingShare || invalid ? (
          <main className="flex min-h-screen items-center justify-center px-4 py-12">
            {missingShare ? (
              <div className={emptyStateCard}>
                <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Нет данных в ссылке</h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Откройте полную ссылку «Поделиться» из редактора — в адресе должен быть параметр{' '}
                  <code className="rounded-sm bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-800">id=</code> или{' '}
                  <code className="rounded-sm bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-800">share=</code>.
                </p>
                <Link
                  href="/"
                  className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-accent-hover"
                >
                  На главную
                </Link>
              </div>
            ) : (
              <div className={emptyStateCard}>
                <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                  Ссылка повреждена или устарела
                </h1>
                <p className="mt-3 text-sm text-gray-600">Попросите отправителя сформировать ссылку заново.</p>
                <Link
                  href="/"
                  className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-accent-hover"
                >
                  На главную
                </Link>
              </div>
            )}
          </main>
        ) : (
          <LibraryShareSplitLayout
            listPanel={
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <header className="shrink-0 border-b border-gray-200 px-2 py-3 sm:px-4">
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
                        <Fragment key={row.rowKey}>{renderCatalogRow(row)}</Fragment>
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
