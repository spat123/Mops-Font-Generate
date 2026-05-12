import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
import { stampLibraryFontAddedNow } from '../../utils/fontLibraryUtils';
import { toast } from '../../utils/appNotify';
import { Tooltip } from '../ui/Tooltip';
import { CatalogGridModeToggle } from '../ui/CatalogGridModeToggle';
import { IconCircleButton } from '../ui/IconCircleButton';
import { OpenExternalIcon, PlusIcon } from '../ui/CommonIcons';
import { EditAssetIcon } from '../ui/EditAssetIcon';
import { downloudIconUrl } from '../ui/editIconUrls';
import { ensureGoogleFontPreviewCss } from '../../utils/googleFontPreviewCss';
import { loadFontsourcePreviewFamily } from '../../utils/fontsourcePreviewRuntimeCache';
import { GoogleFontsCatalogCard } from '../ui/GoogleFontsCatalogCard';
import { FontsourceCatalogCard } from '../ui/FontsourceCatalogCard';
import { CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX } from '../ui/CatalogRowModeCard';
import {
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
} from '../../utils/catalogDownloadActions';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-sm border border-accent bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-sm border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

const SHARE_ROW_PREVIEW_FALLBACK = 'AaBbCcDdEe';
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

function ShareLogoLink() {
  return (
    <Link href="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-90">
      <img
        src="/logo/Logo%20Mark.svg"
        alt="DINAMIC FONT — знак"
        className="h-8 w-8 select-none"
        draggable={false}
      />
      <img
        src="/logo/Logo%20Text.svg"
        alt="DINAMIC FONT"
        className="h-[1.8rem] w-auto select-none"
        draggable={false}
      />
    </Link>
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

export function LibrarySharePage() {
  const router = useRouter();
  const { libraries: fontLibraries, createLibrary, updateLibrary } = useFontLibraries();
  const [layout, setLayout] = useState('list');
  const [zipBusy, setZipBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [addingKey, setAddingKey] = useState(null);
  const [fontsourcePreviewFamilyBySlug, setFontsourcePreviewFamilyBySlug] = useState({});
  /** Локальный образец ROW на странице share (по ключу строки), не влияет на каталог */
  const [rowSampleByKey, setRowSampleByKey] = useState({});

  const rawShare =
    typeof router.query.share === 'string'
      ? router.query.share
      : Array.isArray(router.query.share)
        ? router.query.share[0]
        : '';

  const payload = useMemo(() => {
    if (!router.isReady || !rawShare) return null;
    return decodeLibrarySharePayloadFromQueryParam(rawShare);
  }, [router.isReady, rawShare]);

  const rows = useMemo(() => (payload ? buildShareViewRows(payload) : []), [payload]);
  const draft = useMemo(
    () => (payload ? libraryDraftFromSharePayload(payload) : { name: '', fonts: [] }),
    [payload],
  );
  const hasCascadeHint = useMemo(() => (payload ? payloadHasAnyCascadeSizes(payload) : false), [payload]);
  const libraryTitle = String(payload?.library?.name || draft.name || 'Библиотека').trim();

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
  }, [rows]);

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
    if (!draft.fonts.length) {
      toast.info('При сохранении в редактор попадают только шрифты из каталога (Google / Fontsource)');
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
  }, [createLibrary, draft]);

  const onAddFontToLibrary = useCallback(
    async (libraryId, libraryEntry) => {
      const lib = fontLibraries.find((l) => l.id === libraryId);
      if (!lib || !libraryEntry) return false;
      setAddingKey(String(libraryEntry.id || ''));
      try {
        if (lib.fonts.some((f) => String(f.id) === String(libraryEntry.id))) {
          toast.info('Этот шрифт уже есть в выбранном списке');
          return false;
        }
        const stamped = stampLibraryFontAddedNow(libraryEntry);
        const nextFonts = [...lib.fonts, stamped];
        const updated = updateLibrary(libraryId, { fonts: nextFonts });
        if (updated) toast.success('Шрифт добавлен в сохранённый список');
        return Boolean(updated);
      } finally {
        setAddingKey(null);
      }
    },
    [fontLibraries, updateLibrary],
  );

  const onRequestCreateLibrary = useCallback(
    (entries) => {
      const stamped = (Array.isArray(entries) ? entries : [])
        .map((e) => stampLibraryFontAddedNow(e))
        .filter(Boolean);
      if (!stamped.length) return;
      createLibrary({
        name: stamped[0].label || 'Библиотека',
        fonts: stamped,
      });
      toast.success('Список создан — откройте редактор');
    },
    [createLibrary],
  );

  const handleOpenGoogleInEditor = useCallback(
    (entry) => {
      const family = String(entry?.family || '').trim();
      if (!family) return;
      const q = {
        openGoogle: family,
        ...(entry?.isVariable === true ? { openGoogleVar: '1' } : {}),
      };
      void router.push({ pathname: '/', query: q });
    },
    [router],
  );

  const handleOpenFontsourceInEditor = useCallback(
    (slug, isVariable) => {
      const s = String(slug || '').trim();
      if (!s) return;
      void router.push({
        pathname: '/',
        query: { openFontsource: s, fontsourceVar: isVariable ? '1' : '0' },
      });
    },
    [router],
  );

  const onCardClick = useCallback((event, key) => {
    event?.preventDefault?.();
    setSelectedKey((prev) => (prev === key ? null : key));
  }, []);

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

  const emptyStateCard =
    'rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm';

  const renderCatalogRow = (row) => {
    if (row.kind === 'cloud-upload-ref') {
      return <ShareCloudRow row={row} isRowMode={isRowMode} />;
    }
    if (!row.shareItem) return null;

    if (row.catalogSource === 'google') {
      const entry = resolveGoogleCatalogEntryFromShareItem(row.shareItem);
      if (!entry?.family) return null;
      const selectionKey = entry.family;
      return (
        <>
          {row.cascadeSizes?.length ? (
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 sm:px-6">
              <CascadeSizesBadge sizes={row.cascadeSizes} />
            </div>
          ) : null}
          <GoogleFontsCatalogCard
            entry={entry}
            busy={Boolean(row.libraryFont?.id && addingKey === row.libraryFont.id)}
            selected={selectedKey === selectionKey}
            isRowMode={isRowMode}
            fontLibraries={fontLibraries}
            onAddFontToLibrary={onAddFontToLibrary}
            onRequestCreateLibrary={onRequestCreateLibrary}
            onOpenInEditor={handleOpenGoogleInEditor}
            onDownloadPackageZip={downloadGooglePackageZip}
            onDownloadAsFormat={downloadGoogleAsFormat}
            onDownloadVariableVariant={downloadGoogleVariableVariant}
            onCardClick={onCardClick}
            draggable={false}
            previewText="AaBbCcDdEe"
            rowCatalogPreviewText={rowSampleByKey[row.rowKey]}
            rowPreviewFallback={SHARE_ROW_PREVIEW_FALLBACK}
            rowPreviewAlign="start"
            rowSampleTooltip={SHARE_ROW_SAMPLE_TOOLTIP}
            rowPreviewEditorAriaLabel={SHARE_ROW_EDITOR_ARIA}
            pinPreviewColumnClassName="items-start"
            onRowGlobalSampleCommit={(text) => commitRowSample(row.rowKey, text)}
            footerRightTooltipContent="По метаданным Google Fonts: статические начертания и поднаборы символов (subsets)"
          />
        </>
      );
    }

    if (row.catalogSource === 'fontsource') {
      const item = resolveFontsourceCatalogItemFromShareItem(row.shareItem);
      if (!item) return null;
      const slug = String(item.id || item.slug || '').trim();
      const selectionKey = slug;
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
            busy={Boolean(row.libraryFont?.id && addingKey === row.libraryFont.id)}
            selected={selectedKey === selectionKey}
            isRowMode={isRowMode}
            fontLibraries={fontLibraries}
            onAddFontToLibrary={onAddFontToLibrary}
            onRequestCreateLibrary={onRequestCreateLibrary}
            onOpenInEditor={handleOpenFontsourceInEditor}
            onDownloadPackageZip={downloadFontsourcePackageZip}
            onDownloadAsFormat={downloadFontsourceAsFormat}
            onDownloadVariableVariant={downloadFontsourceVariableVariant}
            onCardClick={onCardClick}
            draggable={false}
            previewText="AaBbCcDdEe"
            rowCatalogPreviewText={rowSampleByKey[row.rowKey]}
            rowPreviewFallback={SHARE_ROW_PREVIEW_FALLBACK}
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
      <Head>
        <title>{headTitle}</title>
        <meta
          name="description"
          content="Список шрифтов по ссылке: скачать архивом или сохранить в редакторе."
        />
      </Head>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-12 min-h-12 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <ShareLogoLink />
            <Tooltip content="Открыть редактор" openDelayMs={100}>
              <Link href="/" aria-label="Открыть редактор">
                <IconCircleButton as="span" variant="toolbar" size="md">
                  <OpenExternalIcon className="h-5 w-5" />
                </IconCircleButton>
              </Link>
            </Tooltip>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-6">
          {!pageReady ? (
            <div className={`${emptyStateCard} text-sm text-gray-600`}>Загрузка…</div>
          ) : missingShare ? (
            <div className={emptyStateCard}>
              <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Нет данных в ссылке</h1>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Откройте полную ссылку «Поделиться» из редактора — в адресе должен быть параметр{' '}
                <code className="rounded-sm bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-800">share=</code>.
              </p>
              <Link href="/" className={`${btnPrimary} mt-8`}>
                На главную
              </Link>
            </div>
          ) : invalid ? (
            <div className={emptyStateCard}>
              <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                Ссылка повреждена или устарела
              </h1>
              <p className="mt-3 text-sm text-gray-600">Попросите отправителя сформировать ссылку заново.</p>
              <Link href="/" className={`${btnPrimary} mt-8`}>
                На главную
              </Link>
            </div>
          ) : (
            <>
              <div className="bg-white py-3 px-4 sm:px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-sm font-semibold uppercase tracking-wide text-gray-900">
                      <span className="min-w-0 truncate">{libraryTitle}</span>
                      <span className="shrink-0 whitespace-nowrap text-sm font-semibold uppercase tabular-nums text-gray-500">
                        {rows.length} ШТ.
                      </span>
                    </h1>
                    {draft.fonts.length < rows.length ? (
                      <p className="mt-2 text-sm font-semibold uppercase leading-snug text-gray-500">
                        В архив и при сохранении в редактор: {draft.fonts.length} из каталога (Google / Fontsource)
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                    <button type="button" className={btnPrimary} disabled={zipBusy} onClick={handleZipAll}>
                      <EditAssetIcon src={downloudIconUrl} className="h-4 w-4 shrink-0" />
                      {zipBusy ? 'Сборка…' : 'Скачать всё (ZIP)'}
                    </button>
                    <button type="button" className={btnSecondary} disabled={importBusy} onClick={handleImport}>
                      <PlusIcon className="h-4 w-4 shrink-0" />
                      {importBusy ? 'Сохранение…' : 'Сохранить в редактор'}
                    </button>
                  </div>
                </div>
              </div>

              {hasCascadeHint ? (
                <div
                  className="mt-4 border-l-4 border-accent bg-accent-soft px-4 py-3 text-sm leading-relaxed text-gray-800"
                  role="status"
                >
                  <span className="font-semibold uppercase tracking-wide text-gray-900">Каскад в ссылке.</span>{' '}
                  Размеры указаны у соответствующих шрифтов. Автоприменение в редакторе — в следующих версиях.
                </div>
              ) : null}

              <div className="flex flex-wrap border-y border-gray-200 items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5">
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">Шрифты</span>
                <div className="ml-auto flex items-center gap-3">
                  
                  <CatalogGridModeToggle value={gridToggleValue} onChange={handleGridToggleChange} />
                </div>
              </div>

              {rows.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
                  В ссылке нет шрифтов.
                </p>
              ) : isRowMode ? (
                <div className="overflow-hidden bg-white">
                  {rows.map((row) => (
                    <React.Fragment key={row.rowKey}>{renderCatalogRow(row)}</React.Fragment>
                  ))}
                </div>
              ) : (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {rows.map((row) => (
                    <li key={row.rowKey} className="min-w-0">
                      {renderCatalogRow(row)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
