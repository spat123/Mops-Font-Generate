import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';

const WORKER_BASENAME = 'fonttoolsWebalchemyWorker.mjs';
const DEFAULT_TIMEOUT_MS = Number(process.env.FONT_GEN_TIMEOUT_MS) || 120000;

let cachedWorkerScriptPath: string | null = null;

export type WorkerRuntime = { bin: string; runtime: 'node' | 'bun' };

export type WebAlchemyRuntimeDescription = {
  bun: boolean;
  nodeVersion: string;
  execPath: string;
  cwd: string;
  workerCwd: string;
  fonttoolsInWorkerCwd: boolean;
  nodeWorkerBinary: string | null;
  bunWorkerBinary: string | null;
  workerRuntime: 'node' | 'bun' | null;
  workerBinary: string | null;
  workerScript: string | null;
  workerScriptExists: boolean;
  preferSubprocessWorker: boolean;
  canRunWorker: boolean;
  engine: string;
};

export function isBunRuntime(): boolean {
  return Boolean(process.versions?.bun);
}

function binaryUsable(bin: string, versionArgs: string[]): boolean {
  try {
    const r = spawnSync(bin, versionArgs, { encoding: 'utf8', timeout: 5000, windowsHide: true });
    return r.status === 0;
  } catch {
    return false;
  }
}

function resolveNodeBinaryViaShell(): string | null {
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
export function resolveNodeBinary(): string | null {
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
  ].filter((v): v is string => Boolean(v));

  for (const bin of candidates) {
    if (bin !== 'node' && !fs.existsSync(bin)) continue;
    if (binaryUsable(bin, ['-v'])) return bin;
  }
  return null;
}

/** Bun для worker, если Node.js нет (ONREZA COMPUTE). */
export function resolveBunBinary(): string | null {
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

export function resolveWorkerRuntime(): WorkerRuntime | null {
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

function workerSourceCandidates(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'utils', WORKER_BASENAME),
    path.join(cwd, 'scripts', 'fonttools-webalchemy-worker.mjs'),
    path.join(cwd, '.next', 'standalone', 'utils', WORKER_BASENAME),
    path.join(cwd, '.next', 'standalone', 'scripts', 'fonttools-webalchemy-worker.mjs'),
  ];
}

function readWorkerSourceFromDisk(): { content: string; source: string } | null {
  for (const candidate of workerSourceCandidates()) {
    if (fs.existsSync(candidate)) {
      return { content: fs.readFileSync(candidate, 'utf8'), source: candidate };
    }
  }
  return null;
}

/** Гарантирует путь к worker-скрипту (копия в /tmp для standalone). */
export function ensureWorkerScriptPath(): string {
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

function hasFonttoolsPackage(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'node_modules', '@web-alchemy', 'fonttools', 'package.json'));
}

function resolveWorkerCwd(): string {
  if (process.env.FONT_GEN_CWD && hasFonttoolsPackage(process.env.FONT_GEN_CWD)) {
    return process.env.FONT_GEN_CWD;
  }
  const cwd = process.cwd();
  const candidates = [cwd, path.join(cwd, '.next', 'standalone'), path.dirname(process.execPath || cwd)];
  for (const dir of candidates) {
    if (hasFonttoolsPackage(dir)) return dir;
  }
  return process.env.FONT_GEN_CWD || cwd;
}

function isWoff2Buffer(buf: Buffer | Uint8Array): boolean {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.length >= 4 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

function formatWorkerFailure(
  runtime: WorkerRuntime,
  code: number | null,
  signal: NodeJS.Signals | null,
  stderr: string,
  outputPath: string,
): string | null {
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

async function runSubprocessWorker(tempDir: string, args: string[], outputPath: string): Promise<WorkerRuntime> {
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

  await new Promise<void>((resolve, reject) => {
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
    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
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

export async function runWebAlchemyWorker(
  tempDir: string,
  command: string,
  inputPath: string,
  outputPath: string,
  arg3?: string,
  arg4?: string,
): Promise<Buffer> {
  const workerArgs = [command, inputPath, outputPath, arg3, arg4].filter((v) => v !== undefined) as string[];
  await runSubprocessWorker(tempDir, workerArgs, outputPath);
  if (!fs.existsSync(outputPath) || !fs.statSync(outputPath).size) {
    throw new Error('Worker не создал выходной файл шрифта');
  }
  return fs.readFileSync(outputPath);
}

export function getLastWorkerRuntime(): WorkerRuntime | null {
  return resolveWorkerRuntime();
}

export async function instantiateVariableFontInProcess(
  buffer: ArrayBuffer | Buffer,
  options: Record<string, unknown>,
): Promise<{
  out: Buffer;
  subset: (buf: Buffer, opts: Record<string, unknown>) => Promise<Buffer>;
}> {
  const { instantiateVariableFont, subset } = await import('@web-alchemy/fonttools');
  const input = buffer instanceof Buffer ? buffer : Buffer.from(new Uint8Array(buffer));
  const out = await instantiateVariableFont(input, options);
  return { out, subset };
}

export async function finalizeWebAlchemyOutput(
  out: Buffer,
  format: string,
  subsetFn: (buf: Buffer, opts: Record<string, unknown>) => Promise<Buffer>,
): Promise<Buffer> {
  const want = String(format || 'woff2').toLowerCase();
  if (want === 'woff2' && !isWoff2Buffer(out)) {
    return subsetFn(Buffer.from(out), { '*': true, flavor: 'woff2' });
  }
  return out;
}

export function canRunWorker(): boolean {
  try {
    ensureWorkerScriptPath();
  } catch {
    return false;
  }
  return Boolean(resolveWorkerRuntime());
}

export function shouldUseSubprocessWorkerFirst(): boolean {
  if (process.env.FONT_GEN_FORCE_NODE_WORKER === '1') return true;
  return isBunRuntime();
}

export function mustUseSubprocessWorkerOnly(): boolean {
  return isBunRuntime();
}

export function resolveWebAlchemyEngineLabel(): string {
  const rt = resolveWorkerRuntime();
  if (!rt) return 'web-alchemy-unavailable';
  if (rt.runtime === 'bun') return 'web-alchemy-bun';
  return 'web-alchemy-node';
}

export function describeWebAlchemyRuntime(): WebAlchemyRuntimeDescription {
  let workerScript: string | null = null;
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
