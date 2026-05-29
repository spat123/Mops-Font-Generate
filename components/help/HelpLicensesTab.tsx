import { FONT_LICENSE_DEFINITIONS } from '../../config/fontLicenses';

function FlagBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        ok ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {label}
    </span>
  );
}

export function HelpLicensesTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-gray-600">
        Краткий справочник лицензий, которые встречаются в каталогах Google Fonts, Fontsource и Fontshare.
        Это не юридическая консультация: перед коммерческим проектом всегда читайте полный текст лицензии у
        правообладателя.
      </p>
      <ul className="space-y-4">
        {FONT_LICENSE_DEFINITIONS.filter((d) => d.id !== 'unknown').map((license) => (
          <li
            key={license.id}
            id={license.id}
            className="scroll-mt-24 rounded-md border border-gray-200 bg-gray-50/80 p-4"
          >
            <h2 className="text-sm font-semibold uppercase text-gray-900">{license.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{license.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <FlagBadge ok={license.flags.commercialUse} label="Коммерция" />
              <FlagBadge ok={license.flags.redistribute} label="Раздача файлов" />
              {license.flags.nonCommercial ? (
                <span className="inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                  Только NC
                </span>
              ) : null}
              {license.flags.copyleft ? (
                <span className="inline-flex rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-900">
                  Copyleft
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
