import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Условия использования — DINAMIC FONT</title>
      </Head>
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-lg font-semibold uppercase tracking-tight text-gray-900">Условия использования</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Черновик. Позже сюда добавим корректный текст условий использования.
          </p>
          <Link
            href="/auth/signup"
            className="mt-6 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-tight text-gray-800 transition-colors hover:border-accent hover:text-accent"
          >
            Назад
          </Link>
        </div>
      </div>
    </>
  );
}

