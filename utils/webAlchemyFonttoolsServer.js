import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const WORKER_SCRIPT = path.join(process.cwd(), 'scripts', 'fonttools-webalchemy-worker.mjs');
const DEFAULT_TIMEOUT_MS = Number(process.env.FONT_GEN_TIMEOUT_MS) || 120000;

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

  const candidates = [
    process.env.npm_node_execpath,
    '/usr/bin/node',
    '/usr/local/bin/node',
    'node',
  ].filter(Boolean);

  for (const bin of candidates) {
    if (bin !== 'node' && !fs.existsSync(bin)) continue;
    if (nodeBinaryUsable(bin)) return bin;
  }
  return null;
}

function isWoff2Buffer(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.length >= 4 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

async function runNodeWorker(tempDir, args) {
  const nodeBin = resolveNodeBinary();
  if (!nodeBin) {
    throw new Error(
      'Node.js не найден для Pyodide. Укажите FONT_GEN_NODE_PATH (например /usr/bin/node) или запустите приложение на Node, не на Bun.',
    );
  }
  if (!fs.existsSync(WORKER_SCRIPT)) {
    throw new Error(`Worker не найден: ${WORKER_SCRIPT}`);
  }

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  await new Promise((resolve, reject) => {
    const child = spawn(nodeBin, [WORKER_SCRIPT, ...args], {
      cwd: process.cwd(),
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

export function shouldUseNodeWorkerFirst() {
  return isBunRuntime() || process.env.FONT_GEN_FORCE_NODE_WORKER === '1';
}

export function describeWebAlchemyRuntime() {
  return {
    bun: isBunRuntime(),
    nodeVersion: process.version,
    execPath: process.execPath,
    nodeWorkerBinary: resolveNodeBinary(),
    workerScript: WORKER_SCRIPT,
    workerScriptExists: fs.existsSync(WORKER_SCRIPT),
    preferNodeWorker: shouldUseNodeWorkerFirst(),
  };
}
