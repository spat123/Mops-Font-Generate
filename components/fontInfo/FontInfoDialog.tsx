import { useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { PopupDialogHeader } from '../ui/PopupDialogHeader';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { findFontSeoPageForFont, type FontSeoPage } from '../../data/fontSeoPages';
import { resolveSessionFontDisplayLabel } from '../../utils/fontSlug';
import { fontNameTableToAdditionalInfoRows } from '../../utils/fontNameTable';
import { pluralRu } from '../../utils/pluralRu';
import type { SessionFontRecord } from '../../types/editorFonts';

type FontInfoDialogProps = {
  open: boolean;
  onClose: () => void;
  font?: SessionFontRecord | null;
  page?: FontSeoPage | null;
};

type ResolvedFontInfo = {
  title: string;
  summary: string;
  description: string[];
  chips: string[];
  licenseName: string;
  licenseDescription: string;
  copyright?: string;
  studio?: string;
  designers: string[];
  externalLinks: FontSeoPage['externalLinks'];
  licenseColumns: FontSeoPage['licenseColumns'];
  additionalInfo: FontSeoPage['additionalInfo'];
};

function IconInfo({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path d="M12 10v7" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 7h.01" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconGithub({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.14c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.8 1.18 1.83 1.18 3.08 0 4.42-2.69 5.39-5.25 5.67.41.35.78 1.05.78 2.12v3.15c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function countLabel(count: unknown, one: string, few: string, many: string): string | null {
  const value = Number(count);
  if (!Number.isFinite(value) || value <= 0) return null;
  return `${value} ${pluralRu(value, one, few, many)}`;
}

function buildGenericInfo(font?: SessionFontRecord | null): ResolvedFontInfo {
  const title = resolveSessionFontDisplayLabel(font);
  const nameTable = font?.nameTable || null;
  const subsets = asStringList(font?.catalogSubsets || font?.subsets);
  const styles = Array.isArray(font?.availableStyles)
    ? font.availableStyles
    : Array.isArray(font?.loadedStyles)
      ? font.loadedStyles
      : [];
  const chips = [
    font?.isVariableFont ? 'Вариативный шрифт' : 'Статический шрифт',
    countLabel(styles.length, 'начертание', 'начертания', 'начертаний'),
    countLabel(subsets.length, 'язык', 'языка', 'языков'),
    font?.hasItalicStyles ? 'italic' : null,
  ].filter((item): item is string => Boolean(item));

  return {
    title,
    summary: `${title} открыт в редакторе DINAMIC FONT.`,
    description: [
      'Для этого шрифта пока нет расширенной SEO-карточки. DINAMIC FONT показывает доступные технические данные из файла и каталога: вариативность, начертания, языковые наборы и текущий источник.',
    ],
    chips,
    licenseName: nameTable?.license ? 'Лицензия из файла шрифта' : 'Лицензия не указана',
    licenseDescription:
      nameTable?.license ||
      'Проверьте условия лицензии у автора или в исходном каталоге шрифта перед коммерческим использованием.',
    copyright: nameTable?.copyright,
    studio: nameTable?.manufacturer,
    designers: nameTable?.designer ? [nameTable.designer] : [],
    externalLinks: [],
    licenseColumns: [
      { title: 'Права доступа', items: ['Зависят от лицензии исходного файла'] },
      { title: 'Ограничения', items: ['Проверьте условия автора или каталога'] },
      { title: 'Условия', items: ['Сохраняйте текст лицензии и copyright, если они есть'] },
    ],
    additionalInfo: [
      { label: 'Font family', value: title },
      { label: 'Source', value: String(font?.source || 'local') },
      { label: 'File name', value: String(font?.originalName || font?.filename || font?.name || title) },
      { label: 'Variable', value: font?.isVariableFont ? 'Yes' : 'No' },
      { label: 'Active subset', value: String(font?.activeSubset || '') },
      ...fontNameTableToAdditionalInfoRows(nameTable),
    ].filter((row) => row.value),
  };
}

export function resolveFontInfo(font?: SessionFontRecord | null, page?: FontSeoPage | null): ResolvedFontInfo {
  const seo = page || findFontSeoPageForFont(font);
  if (!seo) return buildGenericInfo(font);
  const nameTable = font?.nameTable || seo.nameTable || null;

  const chips = [
    seo.isVariable ? 'Вариативный шрифт' : 'Статический шрифт',
    countLabel(seo.fileCount, 'файл', 'файла', 'файлов'),
    countLabel(seo.languageCount, 'язык', 'языка', 'языков'),
    countLabel(seo.styleCount, 'начертание', 'начертания', 'начертаний'),
    countLabel(seo.glyphCount, 'глиф', 'глифа', 'глифов'),
    seo.hasItalic ? 'italic' : null,
  ].filter((item): item is string => Boolean(item));

  return {
    title: seo.title,
    summary: seo.summary,
    description: seo.description,
    chips,
    licenseName: seo.licenseName,
    licenseDescription: nameTable?.license || seo.licenseDescription,
    copyright: nameTable?.copyright || seo.copyright,
    studio: nameTable?.manufacturer || seo.studio,
    designers: nameTable?.designer ? [nameTable.designer] : seo.designers || [],
    externalLinks: seo.externalLinks || [],
    licenseColumns: seo.licenseColumns,
    additionalInfo: [
      ...fontNameTableToAdditionalInfoRows(nameTable),
      ...seo.additionalInfo,
    ].filter((row, index, rows) => {
      const key = String(row.label || '').trim().toLowerCase();
      return Boolean(row.value) && rows.findIndex((item) => String(item.label || '').trim().toLowerCase() === key) === index;
    }),
  };
}

export function FontInfoContent({ font, page }: { font?: SessionFontRecord | null; page?: FontSeoPage | null }) {
  const info = useMemo(() => resolveFontInfo(font, page), [font, page]);

  return (
    <div className="space-y-6 text-sm text-gray-700">
      <section>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold uppercase tracking-tight text-gray-900">{info.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{info.summary}</p>
          </div>

        {info.chips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {info.chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Описание</h3>
        {info.description.map((paragraph) => (
          <p key={paragraph} className="leading-relaxed">
            {paragraph}
          </p>
        ))}
      </section>

      {info.externalLinks.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Ссылки</h3>
          <div className="flex flex-wrap gap-2">
            {info.externalLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-800 transition-colors hover:border-accent/30 hover:text-accent"
              >
                {link.kind === 'github' ? <IconGithub className="h-4 w-4" /> : null}
                {link.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {info.copyright ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Copyright</h3>
          <p className="font-mono text-xs text-gray-800">{info.copyright}</p>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Лицензия</h3>
        <p>
          <Link href="/help?tab=licenses" className="font-semibold text-gray-900 underline underline-offset-4 hover:text-accent">
            {info.licenseName}
          </Link>
        </p>
        <p className="leading-relaxed">{info.licenseDescription}</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Лицензионные условия</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {info.licenseColumns.map((column) => (
            <div key={column.title} className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-900">{column.title}</h4>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-600">
                {column.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {(info.studio || info.designers.length > 0) ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Студия и дизайнеры</h3>
          <p className="leading-relaxed">
            {[info.studio, ...info.designers].filter(Boolean).join(' · ')}
          </p>
        </section>
      ) : null}

      {info.additionalInfo.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Дополнительная информация</h3>
          <dl className="grid grid-cols-[minmax(8rem,13rem)_1fr] gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-white p-4 text-xs">
            {info.additionalInfo.map((row) => (
              <div key={`${row.label}:${row.value}`} className="contents">
                <dt className="text-gray-500">{row.label}</dt>
                <dd className="min-w-0 break-words font-mono text-gray-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

export function FontInfoDialog({ open, onClose, font, page }: FontInfoDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const title = page?.title || resolveSessionFontDisplayLabel(font);

  useDismissibleLayer({
    open,
    refs: [panelRef],
    onDismiss: onClose,
  });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[540] flex items-center justify-center bg-black/30 px-4 py-8"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Информация о шрифте ${title}`}
        className="flex max-h-[min(46rem,calc(100vh-4rem))] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <PopupDialogHeader
          title="Информация о шрифте"
          onClose={onClose}
          titleClassName="!text-base"
          closeAriaLabel="Закрыть информацию о шрифте"
        />
        <div className="min-h-0 overflow-y-auto px-6 py-6">
          <FontInfoContent font={font} page={page} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
