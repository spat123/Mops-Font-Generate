import type { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { AuthLogoLink } from '../auth/AuthSplitLayout';
import { legalMeta } from '../../config/legal';

export function HelpPageLayout({
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
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-3xl">
          <AuthLogoLink className="mb-6" />
          <div className="w-full rounded-lg bg-white p-5 sm:p-6">{children}</div>
          <footer className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-tight text-gray-800 transition-colors hover:border-accent hover:text-accent"
            >
              В редактор
            </Link>
            <Link
              href="/legal/terms"
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-tight text-gray-800 transition-colors hover:border-accent hover:text-accent"
            >
              Условия
            </Link>
          </footer>
        </div>
      </div>
    </>
  );
}
