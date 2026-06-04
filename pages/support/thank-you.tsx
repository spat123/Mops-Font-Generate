import Link from 'next/link';
import { OpenGraphHead } from '../../components/seo/OpenGraphHead';
import { legalMeta } from '../../config/legal';

const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || legalMeta.siteUrl).replace(/\/$/, '');

export default function SupportThankYouPage() {
  return (
    <>
      <OpenGraphHead
        title={`Спасибо за поддержку — ${legalMeta.serviceName}`}
        description={`Благодарим за добровольную поддержку проекта ${legalMeta.serviceName}.`}
        canonicalUrl={`${siteOrigin}/support/thank-you`}
        noIndex
      />
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Поддержка проекта</p>
        <h1 className="mt-4 text-3xl font-semibold uppercase tracking-tight text-gray-900">
          Спасибо за поддержку
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-600">
          Если оплата прошла успешно, ваш донат поможет развивать {legalMeta.serviceName}. Это добровольное
          пожертвование, а не оплата товара или услуги.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl border border-accent bg-accent px-6 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:border-accent-hover hover:bg-accent-hover"
        >
          Вернуться в редактор
        </Link>
      </main>
    </>
  );
}
