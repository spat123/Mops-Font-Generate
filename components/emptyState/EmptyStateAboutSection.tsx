import { useMemo, useState } from 'react';
import { legalMeta } from '../../config/legal';
import { BookOpenIcon } from '../library/KnowledgeBaseNavButton';
import {
  getSupportQuickAmounts,
  openSupportDonation,
} from '../../utils/projectSupport';
import { EditAssetIcon } from '../ui/EditAssetIcon';
import { heartIconUrl } from '../ui/editIconUrls';

function formatRubLabel(amount: number) {
  return `${new Intl.NumberFormat('ru-RU').format(amount)} руб.`;
}

export function EmptyStateAboutToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="dynamic-font-about"
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase backdrop-blur-sm transition-colors ${
        open
          ? 'border-accent bg-accent text-white hover:border-accent-hover hover:bg-accent-hover'
          : 'border-gray-50 bg-gray-50 text-gray-900 hover:border-accent hover:bg-accent hover:text-white'
      }`}
    >
      О DINAMIC FONT
      {open ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="none"
          className="h-3.5 w-3.5"
          aria-hidden
        >
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <span aria-hidden>↓</span>
      )}
    </button>
  );
}

function EmptyStateSupportWidget() {
  const quickAmounts = useMemo(() => getSupportQuickAmounts(), []);
  const [selection, setSelection] = useState<number | 'custom'>(() => quickAmounts[0] ?? 100);
  const [customAmount, setCustomAmount] = useState('');

  const resolvedAmount =
    selection === 'custom' ? Number.parseInt(customAmount.replace(/\s/g, ''), 10) : selection;

  const canDonate = Number.isFinite(resolvedAmount) && resolvedAmount > 0;

  const handleDonate = () => {
    if (!canDonate) return;
    openSupportDonation(resolvedAmount);
  };

  return (
    <div className="rounded-2xl max-w-2xl mx-auto bg-gray-50 px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-2xl font-semibold text-center uppercase tracking-tight text-gray-900">
        Как вам наш проект?
      </h2>
      <p className="mt-1 text-md text-gray-600 text-center">Будем очень признательны за вашу поддержку</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quickAmounts.map((amount) => {
          const selected = selection === amount;
          return (
            <button
              key={amount}
              type="button"
              aria-pressed={selected}
              className={`inline-flex h-11 items-center justify-center rounded-xl border bg-white px-2 text-[11px] font-semibold uppercase tracking-tight transition-colors sm:text-xs ${
                selected
                  ? 'border-accent text-accent'
                  : 'border-white text-gray-900 hover:border-gray-400'
              }`}
              onClick={() => setSelection(amount)}
            >
              {formatRubLabel(amount)}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selection === 'custom'}
          className={`inline-flex h-11 items-center justify-center rounded-xl border bg-white px-2 text-[11px] font-semibold uppercase tracking-tight transition-colors sm:text-xs ${
            selection === 'custom'
              ? 'border-accent text-accent'
              : 'border-gray-200 text-gray-900 hover:border-gray-400'
          }`}
          onClick={() => setSelection('custom')}
        >
          Иная сумма
        </button>
      </div>

      {selection === 'custom' ? (
        <label className="mt-3 block">
          <span className="sr-only">Сумма доната в рублях</span>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
            placeholder="Укажите сумму, ₽"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </label>
      ) : null}

      <button
        type="button"
        disabled={!canDonate}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent bg-accent text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:border-accent-hover hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleDonate}
      >
        <EditAssetIcon src={heartIconUrl} className="h-4 w-4" />
        Поддержать проект
      </button>
    </div>
  );
}

export function EmptyStateAboutSection({
  onClose,
  showTopToggle = true,
}: {
  onClose: () => void;
  showTopToggle?: boolean;
}) {
  return (
    <div className="mx-auto mb-4 w-full max-w-4xl px-4 sm:px-6">
      {showTopToggle ? (
        <div className="flex justify-center pb-5 pt-10">
          <EmptyStateAboutToggle open onToggle={onClose} />
        </div>
      ) : (
        <div className="pt-16" />
      )}

      <section
        id="dynamic-font-seo-info"
        className="border border-gray-200 bg-white text-left"
      >
        <div className="p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Онлайн-инструмент для работы со шрифтами
          </p>
          <h1 className="mt-3 text-4xl font-semibold uppercase leading-tight tracking-tight text-gray-900 sm:text-[3rem] sm:leading-tight">
            DINAMIC FONT — <br /><b>проверка, создание и анимация шрифтов</b>
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-gray-700 sm:text-base">
            Примеряйте шрифты прямо в браузере: загружайте локальные файлы или выбирайте из каталогов.
            Тонко настраивайте вариативные оси, объединяйте гарнитуры в коллекции, делитесь подборками и
            экспортируйте готовый код для ваших проектов.
          </p>
        </div>

        <div className="p-12 grid text-sm text-gray-700 border-t border-gray-200 gap-x-8 gap-y-8 sm:grid-cols-2">
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold uppercase text-gray-900">Каталоги</h2>
            <p className="mt-2 leading-relaxed">
              Поиск и открытие семейств из подключённых каталогов шрифтов.
            </p>
          </div>
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold uppercase text-gray-900">Редактор</h2>
            <p className="mt-2 leading-relaxed">
              Plain, waterfall, glyphs, styles и настройка осей variable fonts.
            </p>
          </div>
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold uppercase text-gray-900">Библиотеки</h2>
            <p className="mt-2 leading-relaxed">
              Сохранение, сравнение, шаринг и скачивание подборок шрифтов.
            </p>
          </div>
          <div className="flex items-end pt-4 border-t">
            <a
              href="/help"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-gray-900 bg-white text-sm font-semibold uppercase tracking-wide text-gray-900 transition-colors hover:bg-gray-900 hover:text-white"
            >
              <BookOpenIcon className="h-4 w-4 shrink-0" />
              База знаний
            </a>
          </div>
        </div>
      </section>

      <div id="dynamic-font-support" className="mt-12">
        <EmptyStateSupportWidget />
      </div>

      <nav className="mt-[6rem] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
        <a className="transition-colors hover:text-gray-900" href="/legal/terms">
          {legalMeta.termsTitle}
        </a>
        <a className="transition-colors hover:text-gray-900" href="/legal/privacy">
          Политика конфиденциальности
        </a>
      </nav>
    </div>
  );
}
