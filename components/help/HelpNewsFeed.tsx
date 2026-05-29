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
};

function HelpNewsCard({ item, eagerImage }: { item: HelpNewsItem; eagerImage?: boolean }) {
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
    <article className="overflow-hidden rounded-md border border-gray-200 bg-white">
      {imageUrl ? (
        <div className="relative aspect-[21/9] min-h-[7rem] w-full overflow-hidden border-b border-gray-100 bg-gray-50">
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
      <div className="space-y-2 px-4 py-3">
        <h3 className="flex items-baseline justify-between gap-2 text-sm font-semibold uppercase leading-snug text-gray-900">
          <span className="min-w-0">{item.title}</span>
          {item.date ? (
            <time className="shrink-0 text-sm font-normal uppercase tabular-nums text-gray-500" dateTime={item.date}>
              {formatEditorNewsDate(item.date)}
            </time>
          ) : null}
        </h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{item.body}</p>
      </div>
    </article>
  );
}

export function HelpNewsFeed({ items, emptyLabel }: { items: HelpNewsItem[]; emptyLabel: string }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
        <p className="text-sm font-medium text-gray-700">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <HelpNewsCard key={item.id} item={item} eagerImage={index === 0} />
      ))}
    </div>
  );
}
