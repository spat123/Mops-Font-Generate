export type BillingLocale = 'RU' | 'EN';

export type BillingCopyStrings = {
  dialogTitle: string;
  menuButton: string;
  showPlans: string;
  upgradeHint: string;
  upgradeHintReceive: string;
  upgradeCtaSoon: string;
  librariesLimitToast: string;
  generationLimitToast: string;
  tooltipOpenPlans: string;
  ariaUpgradePlan: string;
  badgeTitle: string;
  plansSubtitle: string;
  billingMonthly: string;
  billingAnnual: string;
  currentPlanBadge: string;
  recommendedBadge: string;
  freePlanName: string;
  proPlanName: string;
  proComingSoonNote: string;
};

export const billingCopy: Record<BillingLocale, BillingCopyStrings> = {
  RU: {
    dialogTitle: 'Тарифы',
    menuButton: 'Тарифы',
    showPlans: 'Показать тарифы',
    upgradeHint: 'Улучшите тариф, чтобы получить больше возможностей.',
    upgradeHintReceive: 'Улучшите тариф, чтобы получать больше возможностей.',
    upgradeCtaSoon: 'Улучшить тариф (скоро)',
    librariesLimitToast: 'Лимит библиотек достигнут. Посмотрите тарифы, чтобы получить больше возможностей.',
    generationLimitToast: 'Вы исчерпали лимит генераций в этом месяце. Посмотрите тариф Pro.',
    tooltipOpenPlans: 'Лимит библиотек достигнут — открыть тарифы',
    ariaUpgradePlan: 'Лимит библиотек достигнут. Улучшить тариф',
    badgeTitle: 'Тариф',
    plansSubtitle: 'Сравните возможности и выберите тариф для работы со шрифтами.',
    billingMonthly: 'Месяц',
    billingAnnual: 'Год',
    currentPlanBadge: 'Текущий',
    recommendedBadge: 'Рекомендуем',
    freePlanName: 'Free',
    proPlanName: 'Pro',
    proComingSoonNote: 'Оплата появится в ближайших обновлениях — сейчас закрытая бета.',
  },
  EN: {
    dialogTitle: 'Plans',
    menuButton: 'Plans',
    showPlans: 'Show plans',
    upgradeHint: 'Upgrade your plan to unlock more features.',
    upgradeHintReceive: 'Upgrade your plan to get more capabilities.',
    upgradeCtaSoon: 'Upgrade plan (coming soon)',
    librariesLimitToast: 'Library limit reached. View plans for more capacity.',
    generationLimitToast: 'You have used all generations this month. See Pro plans.',
    tooltipOpenPlans: 'Library limit reached — open plans',
    ariaUpgradePlan: 'Library limit reached. Upgrade plan',
    badgeTitle: 'Plan',
    plansSubtitle: 'Compare features and pick the plan that fits your workflow.',
    billingMonthly: 'Monthly',
    billingAnnual: 'Annual',
    currentPlanBadge: 'Current',
    recommendedBadge: 'Recommended',
    freePlanName: 'Free',
    proPlanName: 'Pro',
    proComingSoonNote: 'Checkout is coming soon — we are in closed beta.',
  },
};

export function getBillingCopy(locale: BillingLocale | string = 'RU'): BillingCopyStrings {
  const key = String(locale).toUpperCase() === 'EN' ? 'EN' : 'RU';
  return billingCopy[key];
}
