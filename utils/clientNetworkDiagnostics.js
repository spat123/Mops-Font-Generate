/**
 * Диагностика сети/DNS/медленных API (прод: Vercel Logs).
 *
 * Включение:
 * - URL: ?diag=1 (сохраняется в localStorage)
 * - localStorage.setItem('mfgNetworkDiag', '1') + перезагрузка
 * - NEXT_PUBLIC_NETWORK_DIAG=1 в env (всегда на staging)
 */

const LS_KEY = 'mfgNetworkDiag';
const MAX_EVENTS = 24;
const SLOW_FETCH_MS = 5000;
const FLUSH_MS = 4000;

let enabled = false;
let queue = [];
let flushTimer = null;
let patched = false;

function safe(fn) {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export function isNetworkDiagEnabled() {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_NETWORK_DIAG === '1') return true;
  try {
    if (window.__MFG_NETWORK_DIAG__ === true) return true;
  } catch {
    /* ignore */
  }
  try {
    if (localStorage.getItem(LS_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  return false;
}

function persistFromQuery() {
  if (typeof window === 'undefined') return;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('diag') === '1') localStorage.setItem(LS_KEY, '1');
    if (q.get('diag') === '0') localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

function shouldTrackUrl(url) {
  const u = String(url || '');
  if (!u) return false;
  if (u.startsWith('/api/')) return true;
  if (u.includes('fonts.gstatic.com') || u.includes('fonts.googleapis.com')) return true;
  if (u.includes('fonts.google.com')) return true;
  if (u.includes('api.fontsource.org')) return true;
  if (u.includes('raw.githubusercontent.com')) return true;
  return false;
}

function pushEvent(type, payload = {}) {
  if (!enabled) return;
  queue.push({
    type,
    t: Date.now(),
    ...payload,
  });
  if (queue.length > MAX_EVENTS) queue = queue.slice(-MAX_EVENTS);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, FLUSH_MS);
}

function flushEvents() {
  if (!enabled || queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  const body = JSON.stringify({
    sessionId: getSessionId(),
    page: safe(() => window.location.href),
    events: batch,
  });

  const url = '/api/diagnostics/client';
  try {
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      if (ok) return;
    }
  } catch {
    /* fallback fetch */
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

function getSessionId() {
  const key = 'mfgDiagSession';
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

function collectBootstrap() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  pushEvent('bootstrap', {
    online: navigator.onLine,
    effectiveType: conn?.effectiveType ?? null,
    downlink: conn?.downlink ?? null,
    rtt: conn?.rtt ?? null,
    saveData: conn?.saveData ?? null,
    ua: navigator.userAgent,
    language: navigator.language,
    host: window.location.host,
    navType: nav?.type ?? null,
    domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadEventMs: nav ? Math.round(nav.loadEventEnd) : null,
    dnsMs: nav ? Math.round(nav.domainLookupEnd - nav.domainLookupStart) : null,
    connectMs: nav ? Math.round(nav.connectEnd - nav.connectStart) : null,
    tlsMs: nav ? Math.round(nav.connectEnd - nav.secureConnectionStart) : null,
    ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
  });
}

function patchFetch() {
  if (patched || typeof window.fetch !== 'function') return;
  patched = true;
  const original = window.fetch.bind(window);

  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    const track = shouldTrackUrl(url);
    const verbose = enabled;
    const start = performance.now();

    try {
      const res = await original(input, init);
      const ms = Math.round(performance.now() - start);
      if (track && (verbose || ms >= SLOW_FETCH_MS || !res.ok)) {
        pushEvent('fetch', {
          url: url.slice(0, 500),
          ms,
          status: res.status,
          ok: res.ok,
        });
      }
      return res;
    } catch (err) {
      const ms = Math.round(performance.now() - start);
      if (track) {
        pushEvent('fetch_error', {
          url: url.slice(0, 500),
          ms,
          message: String(err?.message || err).slice(0, 200),
        });
      }
      throw err;
    }
  };
}

function patchGlobalErrors() {
  window.addEventListener('error', (e) => {
    pushEvent('window_error', {
      message: String(e.message || '').slice(0, 300),
      source: String(e.filename || '').slice(0, 200),
      line: e.lineno,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    pushEvent('unhandled_rejection', {
      message: String(e.reason?.message || e.reason || '').slice(0, 300),
    });
  });
}

/** Запуск сбора метрик (один раз за сессию вкладки). */
export function initClientNetworkDiagnostics() {
  if (typeof window === 'undefined') return;
  persistFromQuery();
  enabled = isNetworkDiagEnabled();
  if (!enabled) return;

  patchFetch();
  patchGlobalErrors();

  if (document.readyState === 'complete') {
    collectBootstrap();
  } else {
    window.addEventListener('load', collectBootstrap, { once: true });
  }

  window.addEventListener('pagehide', () => flushEvents());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEvents();
  });

  try {
    window.__MFG_RUN_NETWORK_PROBE__ = runNetworkProbe;
    console.info(
      '[mfg-diag] Диагностика включена. Логи: Vercel → Logs → [client-diag]. Probe: __MFG_RUN_NETWORK_PROBE__(). Выкл: localStorage.removeItem("mfgNetworkDiag")',
    );
  } catch {
    /* ignore */
  }
}

/** Ручная отправка (например после проверки DNS). */
export async function runNetworkProbe() {
  const res = await fetch('/api/diagnostics/network-probe');
  const data = await res.json().catch(() => ({}));
  pushEvent('network_probe', { result: data });
  flushEvents();
  return data;
}
