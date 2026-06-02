import Link from 'next/link';
import { legalMeta } from '../../config/legal';
import { EDITOR_BETA_VERSION } from '../../data/editorNewsFeed';
import { FONT_LICENSE_DEFINITIONS } from '../../config/fontLicenses';
import { KNOWLEDGE_BASE_GUIDES } from '../../data/knowledgeBaseGuides';
import { KNOWLEDGE_BASE_NAV, type KnowledgeBaseTab } from './knowledgeBaseNav';
import { HelpArrowRightIcon, HelpTabIcon } from './HelpIcons';

const LICENSE_COUNT = FONT_LICENSE_DEFINITIONS.filter((d) => d.id !== 'unknown').length;

export function HelpOverview({ onNavigate }: { onNavigate: (tab: KnowledgeBaseTab) => void }) {
  const sections = KNOWLEDGE_BASE_NAV.filter((item) => item.id !== 'overview');

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-md bg-gray-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
            Бета {EDITOR_BETA_VERSION}
          </span>
          <span className="text-xs text-gray-600">Редактор и справочные материалы обновляются по мере развития продукта</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-800">
          Здесь собраны руководства по работе с DINAMIC FONT, справочник лицензий для каталогов и лента новостей.
          Это не замена юридической консультации — перед коммерческим проектом всегда читайте полный текст лицензии
          у правообладателя.
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Разделы</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {sections.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className="group flex h-full w-full cursor-pointer flex-col rounded-lg border border-gray-200 bg-gray-50/60 p-4 text-left transition-colors outline-none hover:border-gray-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-gray-300"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200">
                    <HelpTabIcon tab={item.id} className="h-5 w-5" />
                  </span>
                </span>
                <span className="mt-3 text-sm font-semibold uppercase tracking-tight text-gray-900">{item.label}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{item.description}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase text-gray-700">
                  Открыть{' '}
                  <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                    <HelpArrowRightIcon className="h-4 w-4" />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-2xl font-semibold tabular-nums text-gray-900">{KNOWLEDGE_BASE_GUIDES.length}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-gray-500">руководств</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-2xl font-semibold tabular-nums text-gray-900">{LICENSE_COUNT}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-gray-500">лицензий в справочнике</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-2xl font-semibold tabular-nums text-gray-900">3</p>
          <p className="mt-1 text-xs font-semibold uppercase text-gray-500">источника каталога</p>
          <p className="mt-1 text-[11px] leading-snug text-gray-500">Google Fonts, Fontsource, Fontshare</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Быстрые ссылки</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          <li>
            <Link
              href="/"
              className="inline-flex rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-tight text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              В редактор
            </Link>
          </li>
          <li>
            <Link
              href="/legal/terms"
              className="inline-flex rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-tight text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              {legalMeta.termsTitle}
            </Link>
          </li>
          <li>
            <Link
              href="/legal/privacy"
              className="inline-flex rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-tight text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Конфиденциальность
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => onNavigate('licenses')}
              className="inline-flex cursor-pointer rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-tight text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Справочник лицензий
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
