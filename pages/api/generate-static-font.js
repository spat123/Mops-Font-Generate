import { spawn } from 'child_process';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

/** Временные файлы только под /tmp — на Vercel serverless в корень проекта писать нельзя. */
function getTempDir() {
  return path.join(os.tmpdir(), 'mops-generate-static-font');
}

/**
 * Интерпретатор Python из локального venv fonttools (dev).
 * На Vercel задайте FONTTOOLS_PYTHON или используется fallback без Python.
 */
function resolveFontToolsPython() {
  if (process.env.FONTTOOLS_PYTHON && fs.existsSync(process.env.FONTTOOLS_PYTHON)) {
    return process.env.FONTTOOLS_PYTHON;
  }
  const root = process.cwd();
  if (process.platform === 'win32') {
    const winCandidates = [
      path.join(root, 'fonttools-env', 'Scripts', 'python.exe'),
      path.join(root, 'fonttools-env', 'Scripts', 'python3.exe'),
      path.join(root, 'fonttools-env', 'Scripts', 'python3.12.exe'),
    ];
    for (const p of winCandidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }
  const unixCandidates = [
    path.join(root, 'fonttools-env', 'bin', 'python3.12'),
    path.join(root, 'fonttools-env', 'bin', 'python3'),
    path.join(root, 'fonttools-env', 'bin', 'python'),
  ];
  for (const p of unixCandidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function isWoff2Buffer(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.length >= 4 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

/** Опции для fontTools.varLib.instancer / instantiateVariableFont */
function toInstancerOptions(variableSettings) {
  const out = {};
  for (const [axis, value] of Object.entries(variableSettings || {})) {
    if (value === null || value === undefined) continue;
    if (value === 'drop' || value === 'DROP') {
      out[axis] = null;
      continue;
    }
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    out[axis] = Number.isFinite(n) ? n : value;
  }
  return out;
}

/**
 * Генерация через @web-alchemy/fonttools (Pyodide) — работает на Vercel без Python.
 */
async function generateWithWebAlchemy(buffer, variableSettings, format) {
  const { instantiateVariableFont, subset } = await import('@web-alchemy/fonttools');
  const options = toInstancerOptions(variableSettings);
  let out = await instantiateVariableFont(Buffer.from(buffer), options);
  const want = (format || 'woff2').toLowerCase();
  if (want === 'woff2' && !isWoff2Buffer(out)) {
    out = await subset(Buffer.from(out), { '*': true, flavor: 'woff2' });
  }
  return out;
}

/**
 * API для генерации статических шрифтов из вариативных
 * Локально: Python fonttools из venv; на Vercel: @web-alchemy/fonttools.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonMethodNotAllowed(res, 'POST');
  }

  const { fontData, variableSettings, format = 'woff2', probe } = req.body;

  if (probe === true) {
    return res.status(200).json({ ok: true, probe: true });
  }

  if (!fontData || !variableSettings) {
    return res.status(400).json({ error: 'Missing fontData or variableSettings' });
  }

  const tempDir = getTempDir();
  const stamp = Date.now();
  const inputPath = path.join(tempDir, `input-${stamp}.bin`);
  const outputPath = path.join(tempDir, `output-${stamp}.${format}`);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const buffer = Buffer.from(fontData, 'base64');
    await writeFile(inputPath, buffer);

    const fontToolsPython = resolveFontToolsPython();

    if (fontToolsPython) {
      const axisArgs = Object.entries(variableSettings).map(([axis, value]) => `${axis}=${value}`);

      const args = [
        '-m',
        'fontTools.varLib.instancer',
        inputPath,
        ...axisArgs,
        '--output',
        outputPath,
      ];

      await new Promise((resolve, reject) => {
        const child = spawn(fontToolsPython, args, { windowsHide: true });
        let stderr = '';

        child.on('error', reject);

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`fonttools failed with code ${code}: ${stderr}`));
        });
      });

      const staticFontData = fs.readFileSync(outputPath);
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});

      return res.status(200).json({
        success: true,
        data: staticFontData.toString('base64'),
        size: staticFontData.length,
        format,
        engine: 'python',
      });
    }

    // Vercel / окружение без venv
    const staticFontData = await generateWithWebAlchemy(buffer, variableSettings, format);
    await unlink(inputPath).catch(() => {});

    return res.status(200).json({
      success: true,
      data: Buffer.from(staticFontData).toString('base64'),
      size: staticFontData.length,
      format,
      engine: 'web-alchemy',
    });
  } catch (error) {
    try {
      if (fs.existsSync(inputPath)) await unlink(inputPath);
      if (fs.existsSync(outputPath)) await unlink(outputPath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    console.error('Static font generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate static font',
      details: error.message,
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60,
};
