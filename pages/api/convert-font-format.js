import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const ALLOWED_FORMATS = new Set(['ttf', 'otf', 'woff', 'woff2']);

function getTempDir() {
  return path.join(os.tmpdir(), 'mops-convert-font-format');
}

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

async function convertWithPythonFontTools(buffer, targetFormat) {
  const python = resolveFontToolsPython();
  if (!python) {
    throw new Error('Python fonttools недоступен');
  }

  const tempDir = getTempDir();
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const inPath = path.join(tempDir, `in-${stamp}.bin`);
  const outPath = path.join(tempDir, `out-${stamp}.${targetFormat}`);
  const scriptPath = path.join(tempDir, `convert-${stamp}.py`);

  const pyCode = `
from fontTools.ttLib import TTFont
import sys

in_path = sys.argv[1]
out_path = sys.argv[2]
target = sys.argv[3]

font = TTFont(in_path)
if target == "woff":
    font.flavor = "woff"
elif target == "woff2":
    font.flavor = "woff2"
else:
    font.flavor = None
font.save(out_path)
`;

  try {
    await writeFile(inPath, buffer);
    await writeFile(scriptPath, pyCode, 'utf8');

    await new Promise((resolve, reject) => {
      const args = [scriptPath, inPath, outPath, targetFormat];
      const child = spawn(python, args, { windowsHide: true });
      let stderr = '';
      child.on('error', reject);
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `fonttools exit ${code}`));
      });
    });

    const out = fs.readFileSync(outPath);
    if (!out.length) throw new Error('Пустой результат конвертации');
    return out;
  } finally {
    await unlink(inPath).catch(() => {});
    await unlink(outPath).catch(() => {});
    await unlink(scriptPath).catch(() => {});
  }
}

async function convertWithWebAlchemy(buffer, targetFormat) {
  const { subset } = await import('@web-alchemy/fonttools');
  const opts = { '*': true };
  if (targetFormat === 'woff' || targetFormat === 'woff2') {
    opts.flavor = targetFormat;
  }
  const out = await subset(Buffer.from(buffer), opts);
  if (!out || !out.length) {
    throw new Error('web-alchemy вернул пустой результат');
  }
  return Buffer.from(out);
}

function mimeForFormat(format) {
  if (format === 'woff2') return 'font/woff2';
  if (format === 'woff') return 'font/woff';
  if (format === 'otf') return 'font/otf';
  return 'font/ttf';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonMethodNotAllowed(res, 'POST');
  }

  const targetFormat = String(req.body?.targetFormat || '').toLowerCase();
  const fontData = req.body?.fontData;

  if (!ALLOWED_FORMATS.has(targetFormat)) {
    return res.status(400).json({ error: 'Неподдерживаемый формат', allowed: [...ALLOWED_FORMATS] });
  }
  if (!fontData || typeof fontData !== 'string') {
    return res.status(400).json({ error: 'fontData (base64) обязателен' });
  }

  try {
    const buffer = Buffer.from(fontData, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ error: 'Пустой буфер шрифта' });
    }

    let out;
    let engine = 'python';
    try {
      out = await convertWithPythonFontTools(buffer, targetFormat);
    } catch (pythonError) {
      engine = 'web-alchemy';
      out = await convertWithWebAlchemy(buffer, targetFormat);
    }

    return res.status(200).json({
      success: true,
      targetFormat,
      mimeType: mimeForFormat(targetFormat),
      data: out.toString('base64'),
      size: out.length,
      engine,
    });
  } catch (error) {
    console.error('[convert-font-format]', error);
    return res.status(500).json({
      error: 'Не удалось сконвертировать шрифт',
      details: error?.message || 'Unknown error',
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
  maxDuration: 60,
};
