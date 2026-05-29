import { useEffect, useMemo, useState } from 'react';
import type { SessionFontRecord } from '../types/editorFonts';
import {
  extractOpenTypeFeatureTagsFromBuffer,
  type OpenTypeFeatureTagReport,
} from '../utils/extractOpenTypeFeatureTagsFromBuffer';

type UseOpenTypeFeaturesResult = {
  loading: boolean;
  report: OpenTypeFeatureTagReport | null;
};

const cache = new Map<string, OpenTypeFeatureTagReport | null>();

function buildCacheKey(font: SessionFontRecord | null | undefined): string {
  if (!font) return '';
  const subset = String((font as any)?.activeSubset || '').trim().toLowerCase();
  const sz = font.file instanceof Blob ? font.file.size : 0;
  const url = typeof font.url === 'string' ? font.url : '';
  return [
    String(font.id || ''),
    subset,
    String((font as any)?.currentWeight ?? ''),
    String((font as any)?.currentStyle ?? ''),
    String(sz),
    // blob-url меняется на каждый createObjectURL; не идеальный ключ, но помогает при отсутствии file
    url ? url.slice(0, 48) : '',
  ].join('|');
}

export function useOpenTypeFeatures(font: SessionFontRecord | null | undefined): UseOpenTypeFeaturesResult {
  const cacheKey = useMemo(() => buildCacheKey(font), [font?.id, (font as any)?.activeSubset, font?.file, font?.url]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<OpenTypeFeatureTagReport | null>(() =>
    cacheKey && cache.has(cacheKey) ? (cache.get(cacheKey) ?? null) : null,
  );

  useEffect(() => {
    let cancelled = false;
    if (!font || !cacheKey) {
      setLoading(false);
      setReport(null);
      return () => {
        cancelled = true;
      };
    }

    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      setLoading(false);
      setReport(cached ?? null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    (async () => {
      try {
        let buf: ArrayBuffer | null = null;
        if (font.file instanceof Blob) {
          buf = await font.file.arrayBuffer();
        } else if (font.arrayBuffer instanceof ArrayBuffer) {
          buf = font.arrayBuffer;
        } else if (typeof font.url === 'string' && font.url) {
          const res = await fetch(font.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          buf = await res.arrayBuffer();
        }
        const next = buf ? await extractOpenTypeFeatureTagsFromBuffer(buf) : null;
        cache.set(cacheKey, next);
        if (cancelled) return;
        setReport(next);
      } catch {
        cache.set(cacheKey, null);
        if (cancelled) return;
        setReport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, font]);

  return { loading, report };
}

