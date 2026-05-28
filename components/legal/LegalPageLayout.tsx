import type { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { AuthLogoLink } from '../auth/AuthSplitLayout';
import { legalMeta } from '../../config/legal';

export function LegalPageLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <>
      <Head>
        <title>
          {title} — {legalMeta.serviceName}
        </title>
        {description ? <meta name="description" content={description} /> : null}
      </Head>
      <div className="min-h-screen bg-gray-50 px-4 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-3xl">
          <AuthLogoLink className="mb-6 sm:mb-8" />
          <article className="w-full bg-white p-6">
            <header className="border-b border-gray-100 pb-5">
              <h1 className="text-lg font-semibold uppercase tracking-tight text-gray-900">{title}</h1>
              <p className="mt-2 text-xs text-gray-500">Действует с {legalMeta.effectiveDate}</p>
            </header>

            <div className="legal-prose mt-6 space-y-6 text-sm leading-relaxed text-gray-600">{children}</div>

            <footer className="mt-8 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-tight text-gray-800 transition-colors hover:border-accent hover:text-accent"
              >
                Регистрация
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-tight text-gray-800 transition-colors hover:border-accent hover:text-accent"
              >
                На главную
              </Link>
            </footer>
          </article>
        </div>
      </div>
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase text-gray-900">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}

export function LegalLi({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-gray-800 underline-offset-2 hover:text-accent hover:underline">
      {children}
    </Link>
  );
}
