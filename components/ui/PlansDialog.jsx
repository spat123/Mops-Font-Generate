import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDismissibleLayer } from './useDismissibleLayer';
import { AppButton } from './AppButton';

function PlanCard({ title, price, features = [], active = false, highlight = false, action = null, badge = null }) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border bg-white p-5',
        highlight ? 'border-accent/30' : 'border-gray-200',
      ].join(' ')}
    >
      {badge ? (
        <div className="absolute right-4 top-4 rounded-full bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
          {badge}
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-tight text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">{price}</p>
        </div>
        {active ? (
          <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-700">
            Текущий
          </span>
        ) : null}
      </div>
      <ul className="mt-4 space-y-2 text-xs text-gray-600">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" aria-hidden />
            <span className="min-w-0">{f}</span>
          </li>
        ))}
      </ul>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PlansDialog({ open, onClose, currentPlan = 'Free' }) {
  const panelRef = useRef(null);

  useDismissibleLayer({
    open,
    refs: [panelRef],
    onDismiss: () => onClose?.(),
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/30 px-4 py-8" role="dialog" aria-modal="true">
      <div
        ref={panelRef}
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white"
      >
        <div className="flex items-stretch border-b border-gray-200 bg-white">
          <div className="flex min-h-12 min-w-0 flex-1 items-center px-6 py-3">
            <h2 className="text-lg font-semibold uppercase tracking-tight text-gray-900">Планы</h2>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="inline-flex w-12 shrink-0 items-center justify-center border-l border-gray-200 text-gray-800 transition-colors hover:text-accent"
            aria-label="Закрыть"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-gray-50/40 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <PlanCard
              title="Free"
              price="0 ₽ / месяц"
              active={currentPlan === 'Free'}
              features={['До 3 библиотек', 'Вход через Google / Яндекс', 'Генерация статических файлов из VF (без CSS-пакета)']}
            />
            <PlanCard
              title="Pro"
              price="Скоро"
              highlight
              badge="Рекомендуем"
              active={currentPlan === 'Pro'}
              features={[
                'Больше библиотек',
                'Экспорт CSS с @font-face: копирование, .css / .txt',
                'Приоритетные обновления',
              ]}
              action={
                <AppButton type="button" fullWidth disabled>
                  Улучшить план (скоро)
                </AppButton>
              }
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

