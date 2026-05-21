/**
 * Диагностика сети — команды в консоли браузера (F12).
 * Глобалы вешаются всегда; сбор логов на сервер — после mfgDiagOn().
 */

const LS_KEY = 'mfgNetworkDiag';
const MAX_EVENTS = 24;
const SLOW_FETCH_MS = 5000;
const FLUSH_MS = 4000;

let enabled = false;
let queue = [];
let flushTimer = null;
let patched = false;
let consoleInstalled = false;

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
  queue.push({ type, t: Date.now(), ...payload });
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
    /* fetch fallback */
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

function readPageTimings() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  return {
    online: navigator.onLine,
    host: window.location.host,
    href: window.location.href,
    effectiveType: conn?.effectiveType ?? null,
    downlinkMbps: conn?.downlink ?? null,
    rttMs: conn?.rtt ?? null,
    dnsMs: nav ? Math.round(nav.domainLookupEnd - nav.domainLookupStart) : null,
    connectMs: nav ? Math.round(nav.connectEnd - nav.connectStart) : null,
    tlsMs:
      nav && nav.secureConnectionStart > 0
        ? Math.round(nav.connectEnd - nav.secureConnectionStart)
        : null,
    ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
    domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadMs: nav ? Math.round(nav.loadEventEnd) : null,
  };
}

function collectBootstrap() {
  pushEvent('bootstrap', {
    ...readPageTimings(),
    ua: navigator.userAgent,
    language: navigator.language,
  });
}

function patchFetch() {
  if (patched || typeof window.fetch !== 'function') return;
  patched = true;
  const original = window.fetch.bind(window);

  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    const track = shouldTrackUrl(url);
    const start = performance.now();
    try {
      const res = await original(input, init);
      const ms = Math.round(performance.now() - start);
      if (track && (enabled || ms >= SLOW_FETCH_MS || !res.ok)) {
        const line = { url: url.slice(0, 120), ms, status: res.status, ok: res.ok };
        if (enabled) pushEvent('fetch', line);
        if (!res.ok || ms >= SLOW_FETCH_MS) console.warn('[mfg] slow/fail fetch', line);
      }
      return res;
    } catch (err) {
      const ms = Math.round(performance.now() - start);
      const line = { url: url.slice(0, 120), ms, error: String(err?.message || err) };
      if (track) {
        if (enabled) pushEvent('fetch_error', line);
        console.error('[mfg] fetch error', line);
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

function startDiagCollection() {
  enabled = true;
  try {
    localStorage.setItem(LS_KEY, '1');
  } catch {
    /* ignore */
  }
  patchFetch();
  patchGlobalErrors();
  collectBootstrap();
  window.addEventListener('pagehide', () => flushEvents());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEvents();
  });
  console.info('[mfg] Запись в Vercel Logs включена ([client-diag]). Выключить: mfgDiagOff()');
}

function stopDiagCollection() {
  enabled = false;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
  flushEvents();
  console.info('[mfg] Запись в Vercel Logs выключена.');
}

/** Проверка Google / Fontsource с сервера Vercel + вывод в консоль. */
export async function runNetworkProbe(options = {}) {
  const { sendToServer = true } = options;
  console.info('[mfg] Проверка сети (сервер Vercel → внешние API)…');
  const t0 = performance.now();
  let data = {};
  try {
    const res = await fetch('/api/diagnostics/network-probe');
    data = await res.json();
    if (!res.ok) console.error('[mfg] probe HTTP', res.status, data);
  } catch (e) {
    console.error('[mfg] probe failed', e);
    return { error: String(e?.message || e) };
  }
  const elapsed = Math.round(performance.now() - t0);
  const rows = Object.entries(data.results || {}).map(([name, r]) => ({
    сервис: name,
    ok: r?.ok,
    ms: r?.ms,
    status: r?.status ?? '—',
    ошибка: r?.error ?? '',
  }));
  console.table(rows);
  console.info('[mfg] probe', { elapsedClientMs: elapsed, vercelRegion: data.vercelRegion, at: data.at });
  if (sendToServer && enabled) {
    pushEvent('network_probe', { result: data });
    flushEvents();
  }
  return data;
}

function printStatus() {
  const timings = readPageTimings();
  console.table(timings);
  console.info('[mfg] diagEnabled:', enabled || isNetworkDiagEnabled());
  return timings;
}

function printHelp() {
  console.info(`
[mfg] Команды в консоли (F12):

  mfgHelp()       — эта справка
  mfgProbe()      — проверка Google / Fontsource с сервера Vercel (таблица в консоли)
  mfgStatus()     — DNS/TTFB/загрузка страницы в этом браузере
  mfgDiagOn()     — включить запись в Vercel Logs (медленные fetch, ошибки)
  mfgDiagOff()    — выключить запись

Логи на сервере: Vercel → Logs → [client-diag] или [network-probe]
`);
}

/** Всегда: команды в window. Опционально: автозапись если ?diag=1 или mfgDiagOn(). */
export function installConsoleDiagnostics() {
  if (typeof window === 'undefined' || consoleInstalled) return;
  consoleInstalled = true;

  window.mfgHelp = printHelp;
  window.mfgProbe = runNetworkProbe;
  window.mfgStatus = printStatus;
  window.mfgDiagOn = startDiagCollection;
  window.mfgDiagOff = stopDiagCollection;

  window.__MFG_RUN_NETWORK_PROBE__ = runNetworkProbe;
  window.__MFG_DIAG_HELP__ = printHelp;

  persistFromQuery();
  if (isNetworkDiagEnabled()) startDiagCollection();
  else {
    try {
      console.info('[mfg] Диагностика сети: введите mfgHelp() в консоль');
    } catch {
      /* ignore */
    }
  }
}

export function initClientNetworkDiagnostics() {
  installConsoleDiagnostics();
}
