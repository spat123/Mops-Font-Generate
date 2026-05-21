import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismissibleLayer } from './useDismissibleLayer';
import { AppButton } from './AppButton';
import { PopupDialogHeader } from './PopupDialogHeader';
import { SegmentedControl } from './SegmentedControl';
import { getBillingCopy } from '../../utils/billingCopy';
import {
  getAnnualSavingsLabel,
  getBillingPeriodOptions,
  getFreePlanFeatures,
  getFreePriceDisplay,
  getProPlanFeatures,
  getProPriceDisplay,
} from '../../utils/billingPlans';

function CheckIcon({ className = 'h-4 w-4 text-accent' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanCard({
  title,
  priceMain,
  priceSuffix,
  priceSub,
  description,
  features = [],
  isCurrent = false,
  highlight = false,
  badge = null,
  action = null,
}) {
  return (
    <div
      className={[
        'relative flex h-full flex-col rounded-xl border p-5 transition-colors',
        isCurrent ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white',
        highlight && !isCurrent ? 'border-accent/35' : '',
      ].join(' ')}
    >
      {badge ? (
        <span
          className={[
            'absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]',
            isCurrent || !highlight ? 'bg-gray-200 text-gray-600' : 'bg-accent/10 text-accent',
          ].join(' ')}
        >
          {badge}
        </span>
      ) : null}

      <div className={badge ? 'pr-24' : undefined}>
        <h3 className="text-sm font-semibold uppercase tracking-tight text-gray-900">{title}</h3>
        <p className="mt-2 min-h-[2.75rem] text-xs leading-relaxed text-gray-500">
          {description || '\u00A0'}
        </p>
      </div>

      <div className="mt-4 flex min-h-[2.75rem] items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-x-1 tabular-nums">
          <span className="text-3xl font-semibold leading-none tracking-tight text-gray-900">{priceMain}</span>
          {priceSuffix ? <span className="text-sm leading-none text-gray-500">{priceSuffix}</span> : null}
        </div>
        {priceSub ? (
          <span className="max-w-[48%] shrink-0 text-right text-xs leading-snug text-gray-500">{priceSub}</span>
        ) : null}
      </div>

      <ul className="mt-2 flex-1 space-y-2.5 border-t border-gray-300 pt-5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600">
            <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PlansDialog({ open, onClose, currentPlan = 'Free', locale = 'RU' }) {
  const panelRef = useRef(null);
  const copy = getBillingCopy(locale);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const periodOptions = getBillingPeriodOptions(locale);
  const savingsLabel = getAnnualSavingsLabel(locale);
  const freePrice = getFreePriceDisplay(locale);
  const proPrice = getProPriceDisplay(locale, billingPeriod);
  const isFreeCurrent = currentPlan !== 'Pro';
  const isProCurrent = currentPlan === 'Pro';

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
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/30 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plans-dialog-title"
    >
      <div
        ref={panelRef}
        className="flex max-h-[min(90vh,820px)] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-xl"
      >
        <PopupDialogHeader title={copy.dialogTitle} onClose={() => onClose?.()} titleClassName="!text-lg" />

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/50 px-6 py-6">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-4">
            <SegmentedControl
              value={billingPeriod}
              onChange={setBillingPeriod}
              options={periodOptions}
              variant="surface"
              label={locale === 'EN' ? 'Billing period' : 'Период оплаты'}
              className="w-full"
            />
            <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
              {savingsLabel}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 md:items-stretch">
            <PlanCard
              title={copy.freePlanName}
              priceMain={freePrice.main}
              priceSuffix={freePrice.suffix}
              priceSub={freePrice.sub}
              description={
                locale === 'EN'
                  ? 'For trying the editor and personal projects.'
                  : 'Для знакомства с редактором и личных проектов.'
              }
              features={getFreePlanFeatures(locale)}
              isCurrent={isFreeCurrent}
              badge={isFreeCurrent ? copy.currentPlanBadge : undefined}
              action={
                isFreeCurrent ? (
                  <AppButton type="button" fullWidth variant="outline" disabled>
                    {locale === 'EN' ? 'Your current plan' : 'Ваш текущий тариф'}
                  </AppButton>
                ) : null
              }
            />

            <PlanCard
              title={copy.proPlanName}
              priceMain={proPrice.main}
              priceSuffix={proPrice.suffix}
              priceSub={proPrice.sub}
              description={
                locale === 'EN'
                  ? 'For designers and teams who work with fonts every day.'
                  : 'Для дизайнеров и команд, которые постоянно работают со шрифтами.'
              }
              features={getProPlanFeatures(locale)}
              isCurrent={isProCurrent}
              highlight
              badge={isProCurrent ? copy.currentPlanBadge : copy.recommendedBadge}
              action={
                isProCurrent ? (
                  <AppButton type="button" fullWidth variant="outline" disabled>
                    {locale === 'EN' ? 'Your current plan' : 'Ваш текущий тариф'}
                  </AppButton>
                ) : (
                  <div className="space-y-2">
                    <AppButton type="button" fullWidth disabled>
                      {copy.upgradeCtaSoon}
                    </AppButton>
                    <p className="text-center text-[11px] leading-relaxed text-gray-500">{copy.proComingSoonNote}</p>
                  </div>
                )
              }
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
