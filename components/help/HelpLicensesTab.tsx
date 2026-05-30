import { useMemo, useState } from 'react';
import { FONT_LICENSE_DEFINITIONS, type FontLicenseDefinition } from '../../config/fontLicenses';

const TAG_CLASS =
  'inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-gray-100 text-gray-600';

function FlagBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        ok ? 'bg-gray-200 text-gray-800' : 'bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-200'
      }`}
    >
      {label}
    </span>
  );
}

function LicenseCard({ license }: { license: FontLicenseDefinition }) {
  return (
    <article
      id={license.id}
      className="flex h-full min-w-0 flex-col scroll-mt-28 rounded-lg border border-gray-200 bg-gray-50/60 p-4 transition-colors hover:border-gray-300 hover:bg-white"
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] text-sm font-semibold uppercase leading-snug text-gray-900">
          {license.label}
        </h3>
        <span className="shrink-0 rounded bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tabular-nums text-gray-500 ring-1 ring-gray-200">
          {license.shortLabel}
        </span>
      </div>
      <p className="mt-2 flex-1 break-words text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere]">
        {license.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <FlagBadge ok={license.flags.commercialUse} label="Коммерция" />
        <FlagBadge ok={license.flags.redistribute} label="Раздача файлов" />
        {license.flags.nonCommercial ? <span className={TAG_CLASS}>Только NC</span> : null}
        {license.flags.copyleft ? <span className={TAG_CLASS}>Copyleft</span> : null}
      </div>
    </article>
  );
}

export function HelpLicensesTab() {
  const [query, setQuery] = useState('');

  const licenses = useMemo(
    () => FONT_LICENSE_DEFINITIONS.filter((d) => d.id !== 'unknown'),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return licenses;
    return licenses.filter((license) => {
      const haystack = [license.id, license.label, license.shortLabel, license.summary].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [licenses, query]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
        Краткий справочник для фильтра каталога. Перед коммерческим проектом читайте полный текст лицензии у
        правообладателя — это не юридическая консультация.
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-0 flex-1 sm:max-w-md">
          <span className="sr-only">Поиск лицензий</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: OFL, GPL, Creative Commons…"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </label>
        <p className="shrink-0 text-xs tabular-nums text-gray-500">
          {filtered.length} из {licenses.length}
        </p>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50/80 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase text-gray-500">Обозначения</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <FlagBadge ok label="Коммерция" />
          <FlagBadge ok={false} label="Раздача файлов" />
          <span className={TAG_CLASS}>Только NC</span>
          <span className={TAG_CLASS}>Copyleft</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
          Лицензия не найдена. Измените запрос.
        </p>
      ) : (
        <ul className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))] lg:items-stretch">
          {filtered.map((license) => (
            <li key={license.id} className="flex min-w-0">
              <LicenseCard license={license} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
