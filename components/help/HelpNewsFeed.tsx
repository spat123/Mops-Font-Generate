import { useEffect, useState } from 'react';
import { formatEditorNewsDate } from '../../data/editorNewsFeed';
import { isEditorNewsImageCached, prefetchEditorNewsImage } from '../../utils/editorNewsImageCache';

type HelpNewsItem = {
  id: string;
  kind?: string;
  imageUrl?: string;
  date?: string;
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

function HelpNewsCard({
  item,
  eagerImage,
  featured = false,
}: {
  item: HelpNewsItem;
  eagerImage?: boolean;
  featured?: boolean;
}) {
  const imageUrl = item.imageUrl ? String(item.imageUrl) : '';
  const [imageReady, setImageReady] = useState(() => !imageUrl || isEditorNewsImageCached(imageUrl));

  useEffect(() => {
    if (!imageUrl) {
      setImageReady(false);
      return undefined;
    }
    if (isEditorNewsImageCached(imageUrl)) {
      setImageReady(true);
      return undefined;
    }
    let cancelled = false;
    void prefetchEditorNewsImage(imageUrl).then(() => {
      if (!cancelled) setImageReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return (
    <article
      className={[
        'overflow-hidden rounded-lg border bg-white',
        featured ? 'border-gray-300' : 'border-gray-200',
      ].join(' ')}
    >
      {imageUrl ? (
        <div
          className={[
            'relative w-full overflow-hidden border-b border-gray-100 bg-gray-50',
            featured ? 'aspect-[2.4/1] min-h-[9rem]' : 'aspect-[21/9] min-h-[7rem]',
          ].join(' ')}
        >
          {!imageReady ? <div className="absolute inset-0 animate-pulse bg-gray-100" aria-hidden /> : null}
          <img
            src={imageUrl}
            alt=""
            className={`h-full w-full object-cover object-center transition-opacity duration-200 ${
              imageReady ? 'opacity-100' : 'opacity-0'
            }`}
            loading={eagerImage ? 'eager' : 'lazy'}
            decoding="async"
          />
        </div>
      ) : null}
      <div className={featured ? 'space-y-2.5 px-5 py-4' : 'space-y-2 px-4 py-3'}>
        {featured ? (
          <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-700">
            Последнее
          </span>
        ) : null}
        <h3
          className={[
            'flex flex-wrap items-baseline justify-between gap-2 font-semibold uppercase leading-snug text-gray-900',
            featured ? 'text-base' : 'text-sm',
          ].join(' ')}
        >
          <span className="min-w-0">{item.title}</span>
          {item.date ? (
            <time className="shrink-0 text-sm font-normal uppercase tabular-nums text-gray-500" dateTime={item.date}>
              {formatEditorNewsDate(item.date)}
            </time>
          ) : null}
        </h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{item.body}</p>
        {item.ctaHref && item.ctaLabel ? (
          <a
            href={item.ctaHref}
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold uppercase tracking-tight text-gray-900 transition-colors hover:border-accent hover:bg-accent hover:text-white"
          >
            {item.ctaLabel}
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function HelpNewsFeed({
  items,
  emptyLabel,
  timeline = true,
}: {
  items: HelpNewsItem[];
  emptyLabel: string;
  timeline?: boolean;
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">{emptyLabel}</p>
        <p className="mt-1 text-xs text-gray-500">Записи появятся здесь, когда будут опубликованы.</p>
      </div>
    );
  }

  const [featured, ...rest] = items;

  if (!timeline) {
    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <HelpNewsCard key={item.id} item={item} eagerImage={index === 0} featured={index === 0} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HelpNewsCard item={featured} eagerImage featured />
      {rest.length > 0 ? (
        <ol className="relative space-y-4 border-l border-gray-200 pl-6">
          {rest.map((item) => (
            <li key={item.id} className="relative">
              <span
                className="absolute -left-[1.6rem] top-4 flex h-2.5 w-2.5 rounded-full border-2 border-white bg-gray-300 ring-1 ring-gray-200"
                aria-hidden
              />
              <HelpNewsCard item={item} eagerImage={false} />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
