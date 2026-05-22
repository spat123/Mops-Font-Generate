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

function nodeBinaryUsable(bin) {
  try {
    const r = spawnSync(bin, ['-v'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
    return r.status === 0;
  } catch {
    return false;
  }
}

/** Путь к Node.js для Pyodide-worker (Bun не подходит). */
export function resolveNodeBinary() {
  const fromEnv = process.env.FONT_GEN_NODE_PATH || process.env.NODE_BINARY;
  if (fromEnv && fs.existsSync(fromEnv) && nodeBinaryUsable(fromEnv)) {
    return fromEnv;
  }

  const execDir = path.dirname(process.execPath || '');
  const candidates = [
    process.env.npm_node_execpath,
    path.join(execDir, 'node'),
    '/usr/bin/node',
    '/usr/bin/nodejs',
    '/usr/local/bin/node',
    'node',
  ].filter(Boolean);

  for (const bin of candidates) {
    if (bin !== 'node' && !fs.existsSync(bin)) continue;
    if (nodeBinaryUsable(bin)) return bin;
  }
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

/** Гарантирует путь к worker-скрипту (всегда копия в /tmp для standalone). */
export function ensureWorkerScriptPath() {
  const cached = path.join(os.tmpdir(), 'dinamic-font', WORKER_BASENAME);
  const fromDisk = readWorkerSourceFromDisk();

  if (!fromDisk) {
    throw new Error(
      `Worker ${WORKER_BASENAME} не найден (cwd=${process.cwd()}). Запустите npm run build (postbuild copy).`,
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

async function runNodeWorker(tempDir, args) {
  const nodeBin = resolveNodeBinary();
  if (!nodeBin) {
    throw new Error(
      'Node.js не найден для Pyodide. Задайте FONT_GEN_NODE_PATH (например /usr/bin/node) в env ONREZA.',
    );
  }

  const workerScript = ensureWorkerScriptPath();
  const workerCwd = resolveWorkerCwd();

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  await new Promise((resolve, reject) => {
    const child = spawn(nodeBin, [workerScript, ...args], {
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
      else reject(new Error(stderr.trim() || `worker exit ${code}`));
    });
  });
}

export async function runWebAlchemyWorker(tempDir, command, inputPath, outputPath, arg3, arg4) {
  await runNodeWorker(tempDir, [command, inputPath, outputPath, arg3, arg4].filter((v) => v !== undefined));
  return fs.readFileSync(outputPath);
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

export function canRunNodeWorker() {
  try {
    ensureWorkerScriptPath();
  } catch {
    return false;
  }
  return Boolean(resolveNodeBinary());
}

/** На Bun in-process Pyodide часто роняет процесс (HTML 500) — только Node-worker. */
export function shouldUseNodeWorkerFirst() {
  if (process.env.FONT_GEN_FORCE_NODE_WORKER === '1') return true;
  return isBunRuntime();
}

export function mustUseNodeWorkerOnly() {
  return isBunRuntime();
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

  return {
    bun: isBunRuntime(),
    nodeVersion: process.version,
    execPath: process.execPath,
    cwd: process.cwd(),
    nodeWorkerBinary: resolveNodeBinary(),
    workerScript,
    workerScriptExists,
    preferNodeWorker: shouldUseNodeWorkerFirst(),
    canRunNodeWorker: canRunNodeWorker(),
  };
}
