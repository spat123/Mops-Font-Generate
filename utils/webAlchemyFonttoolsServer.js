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

function hasFonttoolsPackage(dir) {
  return fs.existsSync(path.join(dir, 'node_modules', '@web-alchemy', 'fonttools', 'package.json'));
}

function findProjectRootWithFonttools(startDir) {
  let dir = path.resolve(startDir || process.cwd());
  for (let i = 0; i < 8; i += 1) {
    if (hasFonttoolsPackage(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Каталог с node_modules/@web-alchemy (без ручного FONT_GEN_CWD на ONREZA).
 * Сборка ONREZA идёт из /workspace — не /app.
 */
function resolveWorkerCwd() {
  const fromEnv = String(process.env.FONT_GEN_CWD || '').trim();
  if (fromEnv && hasFonttoolsPackage(fromEnv)) return fromEnv;

  const cwd = process.cwd();
  const execDir = path.dirname(process.execPath || cwd);
  const candidates = [
    cwd,
    execDir,
    path.join(cwd, '.next', 'standalone'),
    path.join(execDir, '.next', 'standalone'),
    '/workspace',
    '/app',
    '/opt/app',
  ];

  for (const dir of candidates) {
    const hit = findProjectRootWithFonttools(dir);
    if (hit) return hit;
  }

  return cwd;
}

function isWoff2Buffer(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.length >= 4 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

function formatWorkerFailure(runtime, code, signal, stderr, outputPath) {
  const prefix = runtime.runtime === 'bun' ? '[bun worker] ' : '[node worker] ';
  const errText = stderr.trim();

  if (outputPath && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return null;
  }

  if (code === null && signal) {
    return (
      `${prefix}процесс остановлен сигналом ${signal}` +
      (signal === 'SIGKILL' || signal === 'SIGTERM'
        ? ' (лимит памяти/времени ONREZA — попробуйте меньший шрифт или FONT_GEN_NODE_PATH=/usr/bin/node)'
        : '') +
      (errText ? `: ${errText.slice(0, 200)}` : '')
    );
  }
  if (code === null) {
    return (
      `${prefix}процесс аварийно завершён (часто OOM или Pyodide не загрузился).` +
      ` cwd=${resolveWorkerCwd()}.` +
      (errText ? ` ${errText.slice(0, 200)}` : ' Задайте FONT_GEN_NODE_PATH или FONT_GEN_CWD.')
    );
  }
  return prefix + (errText || `exit ${code}`);
}

async function runSubprocessWorker(tempDir, args, outputPath) {
  const runtime = resolveWorkerRuntime();
  if (!runtime) {
    throw new Error(
      'Не найден Node.js и Bun для Pyodide-worker. Задайте FONT_GEN_NODE_PATH=/usr/bin/node или FONT_GEN_BUN_PATH.',
    );
  }

  const workerScript = ensureWorkerScriptPath();
  const workerCwd = resolveWorkerCwd();
  const nodeModules = path.join(workerCwd, 'node_modules');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  await new Promise((resolve, reject) => {
    const child = spawn(runtime.bin, [workerScript, ...args], {
      cwd: workerCwd,
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production',
        NODE_PATH: fs.existsSync(nodeModules) ? nodeModules : process.env.NODE_PATH,
      },
    });
    let stderr = '';
    let stdout = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Таймаут генерации (${DEFAULT_TIMEOUT_MS} мс)`));
    }, DEFAULT_TIMEOUT_MS);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const failMsg = formatWorkerFailure(runtime, code, signal, stderr || stdout, outputPath);
      if (failMsg) reject(new Error(failMsg));
      else resolve();
    });
  });

  return runtime;
}

export async function runWebAlchemyWorker(tempDir, command, inputPath, outputPath, arg3, arg4) {
  const workerArgs = [command, inputPath, outputPath, arg3, arg4].filter((v) => v !== undefined);
  await runSubprocessWorker(tempDir, workerArgs, outputPath);
  if (!fs.existsSync(outputPath) || !fs.statSync(outputPath).size) {
    throw new Error('Worker не создал выходной файл шрифта');
  }
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

  const workerCwd = resolveWorkerCwd();

  return {
    bun: isBunRuntime(),
    nodeVersion: process.version,
    execPath: process.execPath,
    cwd: process.cwd(),
    workerCwd,
    fonttoolsInWorkerCwd: hasFonttoolsPackage(workerCwd),
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
