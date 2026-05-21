/**
 * Авто-сводка сети при загрузке → консоль + Vercel Logs.
 * Ручные команды: mfgReport(), mfgDiagOn() (расширенный сбор).
 */

const LS_KEY = 'mfgNetworkDiag';
const AUTO_REPORT_KEY = 'mfgAutoReportDone';
const MAX_EVENTS = 24;
const SLOW_FETCH_MS = 5000;
const FLUSH_MS = 4000;

let enabled = false;
let queue = [];
let flushTimer = null;
let patched = false;
let consoleInstalled = false;
let autoReportStarted = false;

function safe(fn) {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

function isProductionHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h.endsWith('dynamicfont.ru') || h.endsWith('.vercel.app');
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

function postDiagnostics(events) {
  if (!Array.isArray(events) || events.length === 0) return;
  const body = JSON.stringify({
    sessionId: getSessionId(),
    page: safe(() => window.location.href),
    events,
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
  postDiagnostics(batch);
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

function formatProbeRows(data) {
  return Object.entries(data?.results || {}).map(([name, r]) => ({
    сервис: name,
    ok: r?.ok,
    ms: r?.ms,
    status: r?.status ?? '—',
    ошибка: r?.error ?? '',
  }));
}

function buildSummaryText(timings, probe, probeClientMs) {
  const lines = [];
  lines.push(`Хост: ${timings.host} | online: ${timings.online}`);
  if (timings.dnsMs != null) lines.push(`DNS: ${timings.dnsMs} ms`);
  if (timings.ttfbMs != null) lines.push(`TTFB: ${timings.ttfbMs} ms`);
  if (timings.loadMs != null) lines.push(`Загрузка страницы: ${timings.loadMs} ms`);
  if (timings.effectiveType) lines.push(`Сеть: ${timings.effectiveType}, RTT ${timings.rttMs ?? '—'} ms`);
  if (probe?.vercelRegion) lines.push(`Регион Vercel (probe): ${probe.vercelRegion}`);
  for (const [name, r] of Object.entries(probe?.results || {})) {
    const st = r?.ok ? 'OK' : 'FAIL';
    lines.push(`Probe ${name}: ${st} ${r?.ms ?? '—'} ms${r?.error ? ` (${r.error})` : ''}`);
  }
  if (probeClientMs != null) lines.push(`Probe с клиента: ${probeClientMs} ms`);
  const slowTtfb = timings.ttfbMs != null && timings.ttfbMs > 2000;
  const slowLoad = timings.loadMs != null && timings.loadMs > 6000;
  if (slowTtfb) lines.push('⚠ Медленный TTFB — сеть до сервера или DNS.');
  if (slowLoad) lines.push('⚠ Медленная загрузка — возможны обрывы (reset) или тяжёлый JS.');
  const probeFail = Object.values(probe?.results || {}).some((r) => r && !r.ok);
  if (probeFail) lines.push('⚠ С сервера Vercel недоступен Google или Fontsource.');
  if (!slowTtfb && !slowLoad && !probeFail) lines.push('По метрикам критичных проблем не видно.');
  return lines.join('\n');
}

function printAutoReportToConsole(timings, probe, probeClientMs, summaryText) {
  try {
    console.group('[mfg] Сводка сети (автоматически)');
    console.table(timings);
    if (probe?.results) console.table(formatProbeRows(probe));
    console.info('%c' + summaryText, 'white-space: pre-line; font-family: monospace;');
    console.info('[mfg] Копия отправлена в Vercel Logs → фильтр [client-diag-summary]');
    console.groupEnd();
  } catch {
    console.log('[mfg] summary', { timings, probe, summaryText });
  }
}

async function fetchNetworkProbe() {
  const t0 = performance.now();
  const res = await fetch('/api/diagnostics/network-probe');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return { data, clientMs: Math.round(performance.now() - t0) };
}

/** Одна авто-сводка за вкладку (без ввода команд). */
export async function runAutoReport() {
  if (typeof window === 'undefined') return null;
  try {
    if (sessionStorage.getItem(AUTO_REPORT_KEY) === '1') return null;
    sessionStorage.setItem(AUTO_REPORT_KEY, '1');
  } catch {
    /* continue without session guard */
  }

  const timings = readPageTimings();
  let probe = null;
  let probeClientMs = null;
  let probeError = null;

  try {
    const out = await fetchNetworkProbe();
    probe = out.data;
    probeClientMs = out.clientMs;
  } catch (e) {
    probeError = String(e?.message || e);
  }

  const summaryText = buildSummaryText(timings, probe, probeClientMs);
  printAutoReportToConsole(timings, probe, probeClientMs, summaryText);

  postDiagnostics([
    {
      type: 'auto_summary',
      t: Date.now(),
      summaryText,
      timings,
      probe,
      probeClientMs,
      probeError,
      ua: navigator.userAgent,
    },
  ]);

  return { timings, probe, summaryText, probeError };
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
        console.warn('[mfg] fetch error', line);
      }
      throw err;
    }
  };
}

function patchGlobalErrors() {
  window.addEventListener('error', (e) => {
    const payload = {
      message: String(e.message || '').slice(0, 300),
      source: String(e.filename || '').slice(0, 200),
      line: e.lineno,
    };
    if (enabled) pushEvent('window_error', payload);
    console.warn('[mfg] window error', payload);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const payload = { message: String(e.reason?.message || e.reason || '').slice(0, 300) };
    if (enabled) pushEvent('unhandled_rejection', payload);
    console.warn('[mfg] unhandled rejection', payload);
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
  window.addEventListener('pagehide', () => flushEvents());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEvents();
  });
  console.info('[mfg] Расширенная запись в Logs включена. Выключить: mfgDiagOff()');
}

function stopDiagCollection() {
  enabled = false;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
  flushEvents();
}

export async function runNetworkProbe() {
  try {
    const { data, clientMs } = await fetchNetworkProbe();
    console.table(formatProbeRows(data));
    console.info('[mfg] probe', { clientMs, vercelRegion: data.vercelRegion });
    if (enabled) {
      pushEvent('network_probe', { result: data });
      flushEvents();
    }
    return data;
  } catch (e) {
    console.error('[mfg] probe failed', e);
    return { error: String(e?.message || e) };
  }
}

function scheduleAutoReport() {
  if (autoReportStarted) return;
  autoReportStarted = true;

  const run = () => {
    if (!isProductionHost()) return;
    void runAutoReport();
  };

  if (document.readyState === 'complete') {
    window.setTimeout(run, 800);
  } else {
    window.addEventListener('load', () => window.setTimeout(run, 800), { once: true });
  }
}

export function installConsoleDiagnostics() {
  if (typeof window === 'undefined' || consoleInstalled) return;
  consoleInstalled = true;

  window.mfgReport = runAutoReport;
  window.mfgProbe = runNetworkProbe;
  window.mfgStatus = () => {
    const t = readPageTimings();
    console.table(t);
    return t;
  };
  window.mfgDiagOn = startDiagCollection;
  window.mfgDiagOff = stopDiagCollection;
  window.mfgHelp = () => {
    console.info('[mfg] Сводка пишется сама при загрузке. Повтор: mfgReport(). Vercel Logs: [client-diag-summary]');
  };

  persistFromQuery();
  patchFetch();
  patchGlobalErrors();
  scheduleAutoReport();
  if (isNetworkDiagEnabled()) startDiagCollection();
}

export function initClientNetworkDiagnostics() {
  installConsoleDiagnostics();
}
