import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';

const WORKER_BASENAME = 'fonttoolsWebalchemyWorker.mjs';
const DEFAULT_TIMEOUT_MS = Number(process.env.FONT_GEN_TIMEOUT_MS) || 120000;

let cachedWorkerScriptPath = null;

export function isBunRuntime() {
  return Boolean(process.versions?.bun);
}

function binaryUsable(bin, versionArgs) {
  try {
    const r = spawnSync(bin, versionArgs, { encoding: 'utf8', timeout: 5000, windowsHide: true });
    return r.status === 0;
  } catch {
    return false;
  }
}

function resolveNodeBinaryViaShell() {
  if (process.platform === 'win32') return null;
  try {
    const r = spawnSync('sh', ['-c', 'command -v node 2>/dev/null || command -v nodejs 2>/dev/null'], {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    });
    const found = String(r.stdout || '')
      .trim()
      .split('\n')[0]
      .trim();
    if (found && binaryUsable(found, ['-v'])) return found;
  } catch {
    /* ignore */
  }
  return null;
}

/** Путь к Node.js для Pyodide-worker. */
export function resolveNodeBinary() {
  const fromEnv = process.env.FONT_GEN_NODE_PATH || process.env.NODE_BINARY;
  if (fromEnv && fs.existsSync(fromEnv) && binaryUsable(fromEnv, ['-v'])) {
    return fromEnv;
  }

  const fromShell = resolveNodeBinaryViaShell();
  if (fromShell) return fromShell;

  const execDir = path.dirname(process.execPath || '');
  const candidates = [
    process.env.npm_node_execpath,
    path.join(execDir, 'node'),
    '/opt/node/bin/node',
    '/usr/bin/node',
    '/usr/bin/nodejs',
    '/usr/local/bin/node',
    'node',
  ].filter(Boolean);

  for (const bin of candidates) {
    if (bin !== 'node' && !fs.existsSync(bin)) continue;
    if (binaryUsable(bin, ['-v'])) return bin;
  }
  return null;
}

/** Bun для worker, если Node.js нет (ONREZA COMPUTE). */
export function resolveBunBinary() {
  const fromEnv = process.env.FONT_GEN_BUN_PATH;
  if (fromEnv && fs.existsSync(fromEnv) && binaryUsable(fromEnv, ['--version'])) {
    return fromEnv;
  }
  if (isBunRuntime() && process.execPath && fs.existsSync(process.execPath)) {
    return process.execPath;
  }
  const candidates = ['/usr/bin/bun', '/usr/local/bin/bun', 'bun'].filter(Boolean);
  for (const bin of candidates) {
    if (bin !== 'bun' && !fs.existsSync(bin)) continue;
    if (binaryUsable(bin, ['--version'])) return bin;
  }
  return null;
}

/**
 * @returns {{ bin: string, runtime: 'node' | 'bun' } | null}
 */
export function resolveWorkerRuntime() {
  if (process.env.FONT_GEN_FORCE_BUN_WORKER === '1') {
    const bun = resolveBunBinary();
    if (bun) return { bin: bun, runtime: 'bun' };
  }
  const node = resolveNodeBinary();
  if (node) return { bin: node, runtime: 'node' };
  const bun = resolveBunBinary();
  if (bun) return { bin: bun, runtime: 'bun' };
  return null;
}

function workerSourceCandidates() {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'utils', WORKER_BASENAME),
    path.join(cwd, 'scripts', 'fonttools-webalchemy-worker.mjs'),
    path.join(cwd, '.next', 'standalone', 'utils', WORKER_BASENAME),
    path.join(cwd, '.next', 'standalone', 'scripts', 'fonttools-webalchemy-worker.mjs'),
  ];
}

function readWorkerSourceFromDisk() {
  for (const candidate of workerSourceCandidates()) {
    if (fs.existsSync(candidate)) {
      return { content: fs.readFileSync(candidate, 'utf8'), source: candidate };
    }
  }
  return null;
}

/** Гарантирует путь к worker-скрипту (копия в /tmp для standalone). */
export function ensureWorkerScriptPath() {
  const cached = path.join(os.tmpdir(), 'dinamic-font', WORKER_BASENAME);
  const fromDisk = readWorkerSourceFromDisk();

  if (!fromDisk) {
    throw new Error(
      `Worker ${WORKER_BASENAME} не найден (cwd=${process.cwd()}). Запустите bun run build (postbuild copy).`,
    );
  }

  fs.mkdirSync(path.dirname(cached), { recursive: true });
  const needsWrite =
    !fs.existsSync(cached) ||
    fs.statSync(cached).size !== Buffer.byteLength(fromDisk.content, 'utf8');
  if (needsWrite) {
    fs.writeFileSync(cached, fromDisk.content, 'utf8');
  }

  cachedWorkerScriptPath = cached;
  return cached;
}

function resolveWorkerCwd() {
  return process.env.FONT_GEN_CWD || process.cwd();
}

function isWoff2Buffer(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.length >= 4 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

async function runSubprocessWorker(tempDir, args) {
  const runtime = resolveWorkerRuntime();
  if (!runtime) {
    throw new Error(
      'Не найден Node.js и Bun для Pyodide-worker. Задайте FONT_GEN_NODE_PATH=/usr/bin/node или FONT_GEN_BUN_PATH.',
    );
  }

  const workerScript = ensureWorkerScriptPath();
  const workerCwd = resolveWorkerCwd();

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  await new Promise((resolve, reject) => {
    const child = spawn(runtime.bin, [workerScript, ...args], {
      cwd: workerCwd,
      windowsHide: true,
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' },
    });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Таймаут генерации (${DEFAULT_TIMEOUT_MS} мс)`));
    }, DEFAULT_TIMEOUT_MS);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else {
        const prefix = runtime.runtime === 'bun' ? '[bun worker] ' : '[node worker] ';
        reject(new Error(prefix + (stderr.trim() || `exit ${code}`)));
      }
    });
  });

  return runtime;
}

export async function runWebAlchemyWorker(tempDir, command, inputPath, outputPath, arg3, arg4) {
  await runSubprocessWorker(tempDir, [command, inputPath, outputPath, arg3, arg4].filter((v) => v !== undefined));
  return fs.readFileSync(outputPath);
}

export function getLastWorkerRuntime() {
  return resolveWorkerRuntime();
}

export async function instantiateVariableFontInProcess(buffer, options) {
  const { instantiateVariableFont, subset } = await import('@web-alchemy/fonttools');
  let out = await instantiateVariableFont(Buffer.from(buffer), options);
  return { out, subset };
}

export async function finalizeWebAlchemyOutput(out, format, subsetFn) {
  const want = String(format || 'woff2').toLowerCase();
  if (want === 'woff2' && !isWoff2Buffer(out)) {
    return subsetFn(Buffer.from(out), { '*': true, flavor: 'woff2' });
  }
  return out;
}

export function canRunWorker() {
  try {
    ensureWorkerScriptPath();
  } catch {
    return false;
  }
  return Boolean(resolveWorkerRuntime());
}

/** @deprecated use canRunWorker */
export function canRunNodeWorker() {
  return canRunWorker();
}

export function shouldUseSubprocessWorkerFirst() {
  if (process.env.FONT_GEN_FORCE_NODE_WORKER === '1') return true;
  return isBunRuntime();
}

/** @deprecated */
export function shouldUseNodeWorkerFirst() {
  return shouldUseSubprocessWorkerFirst();
}

export function mustUseSubprocessWorkerOnly() {
  return isBunRuntime();
}

/** @deprecated */
export function mustUseNodeWorkerOnly() {
  return mustUseSubprocessWorkerOnly();
}

export function resolveWebAlchemyEngineLabel() {
  const rt = resolveWorkerRuntime();
  if (!rt) return 'web-alchemy-unavailable';
  if (rt.runtime === 'bun') return 'web-alchemy-bun';
  return 'web-alchemy-node';
}

export function describeWebAlchemyRuntime() {
  let workerScript = null;
  let workerScriptExists = false;
  try {
    workerScript = ensureWorkerScriptPath();
    workerScriptExists = true;
  } catch {
    workerScript = workerSourceCandidates().join(' | ');
    workerScriptExists = false;
  }

  const workerRuntime = resolveWorkerRuntime();

  return {
    bun: isBunRuntime(),
    nodeVersion: process.version,
    execPath: process.execPath,
    cwd: process.cwd(),
    nodeWorkerBinary: resolveNodeBinary(),
    bunWorkerBinary: resolveBunBinary(),
    workerRuntime: workerRuntime?.runtime || null,
    workerBinary: workerRuntime?.bin || null,
    workerScript,
    workerScriptExists,
    preferSubprocessWorker: shouldUseSubprocessWorkerFirst(),
    canRunWorker: canRunWorker(),
    engine: resolveWebAlchemyEngineLabel(),
  };
}
