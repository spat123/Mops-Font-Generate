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
    dialogTitle: 'Открытая бета',
    menuButton: 'Тарифы',
    showPlans: 'Показать тарифы',
    upgradeHint: 'Войдите в аккаунт, чтобы получить полный доступ на время открытой беты.',
    upgradeHintReceive: 'Войдите в аккаунт, чтобы получить полный доступ на время открытой беты.',
    upgradeCtaSoon: 'Поддержать проект',
    librariesLimitToast: 'Лимит библиотек достигнут. В открытой бете полный доступ выдаётся после входа.',
    generationLimitToast: 'Вы исчерпали лимит генераций. Войдите в аккаунт для полного доступа в открытой бете.',
    tooltipOpenPlans: 'Открытая бета — полный доступ после входа',
    ariaUpgradePlan: 'Открытая бета. Узнать условия доступа',
    badgeTitle: 'Тариф',
    plansSubtitle: 'Во время открытой беты полный доступ бесплатный после регистрации.',
    billingMonthly: 'Месяц',
    billingAnnual: 'Год',
    currentPlanBadge: 'Текущий',
    recommendedBadge: 'Рекомендуем',
    freePlanName: 'Free',
    proPlanName: 'Pro',
    proComingSoonNote: 'Оплата выключена на время открытой беты. Если сервис полезен, поддержите проект.',
  },
  EN: {
    dialogTitle: 'Open beta',
    menuButton: 'Plans',
    showPlans: 'Show plans',
    upgradeHint: 'Sign in to get full access during the open beta.',
    upgradeHintReceive: 'Sign in to get full access during the open beta.',
    upgradeCtaSoon: 'Support the project',
    librariesLimitToast: 'Library limit reached. Full beta access is available after sign-in.',
    generationLimitToast: 'Generation limit reached. Sign in for full access during open beta.',
    tooltipOpenPlans: 'Open beta — full access after sign-in',
    ariaUpgradePlan: 'Open beta. View access details',
    badgeTitle: 'Plan',
    plansSubtitle: 'During open beta, full access is free after registration.',
    billingMonthly: 'Monthly',
    billingAnnual: 'Annual',
    currentPlanBadge: 'Current',
    recommendedBadge: 'Recommended',
    freePlanName: 'Free',
    proPlanName: 'Pro',
    proComingSoonNote: 'Checkout is disabled during open beta. Support the project if it helps you.',
  },
};

export function getBillingCopy(locale: BillingLocale | string = 'RU'): BillingCopyStrings {
  const key = String(locale).toUpperCase() === 'EN' ? 'EN' : 'RU';
  return billingCopy[key];
}
