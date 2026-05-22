import { spawn } from 'child_process';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';
import { consumeStaticGenerationQuota, resolveGenerationQuotaActor } from '../../lib/staticGenerationQuotaServer';
import { sanitizeVariableSettingsForInstancer } from '../../utils/sanitizeVariableSettingsForInstancer';
import {
  canRunNodeWorker,
  describeWebAlchemyRuntime,
  finalizeWebAlchemyOutput,
  instantiateVariableFontInProcess,
  mustUseNodeWorkerOnly,
  runWebAlchemyWorker,
  shouldUseNodeWorkerFirst,
} from '../../utils/webAlchemyFonttoolsServer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const ALLOWED_FORMATS = new Set(['ttf', 'otf', 'woff', 'woff2']);

/** Временные файлы только под /tmp — на Vercel serverless в корень проекта писать нельзя. */
function getTempDir() {
  return path.join(os.tmpdir(), 'dinamic-generate-static-font');
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

function sanitizeNameString(raw, fallback, maxLen = 80) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ');
  const out = cleaned || String(fallback || '').trim() || '';
  return out.slice(0, maxLen) || fallback || 'Font';
}

function buildPostScriptName(family, subfamily) {
  const src = `${String(family || '').trim()}-${String(subfamily || '').trim()}`.trim() || 'Font-Static';
  const ascii = src
    .normalize('NFKD')
    // eslint-disable-next-line no-control-regex -- removing diacritics from NFKD form
    .replace(/[\u0300-\u036f]/g, '');
  const safe = ascii
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
  return safe || 'Font-Static';
}

/** Опции для fontTools.varLib.instancer / instantiateVariableFont */
function toInstancerOptions(variableSettings) {
  return sanitizeVariableSettingsForInstancer(variableSettings);
}

async function generateWithPythonFontTools(fontToolsPython, { inputPath, outputPath, variableSettings, format, rename }) {
  const tempDir = getTempDir();
  const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const scriptPath = path.join(tempDir, `generate-static-${stamp}.py`);

  const axes = toInstancerOptions(variableSettings || {});
  const renamePayload = rename && typeof rename === 'object' ? rename : {};

  const pyCode = `
import json
import sys
import time

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

in_path = sys.argv[1]
out_path = sys.argv[2]
out_format = sys.argv[3].lower()
axes_json = sys.argv[4]
rename_json = sys.argv[5] if len(sys.argv) > 5 else "{}"

axes = json.loads(axes_json) if axes_json else {}
rename = json.loads(rename_json) if rename_json else {}

font = TTFont(in_path)
if "fvar" in font:
    fvar_tags = {str(a.axisTag).strip() for a in font["fvar"].axes if str(getattr(a, "axisTag", "")).strip()}
    axes = {k: v for k, v in axes.items() if k and k in fvar_tags}
inst = instantiateVariableFont(font, axes, inplace=False)

family = (rename.get("family") or "").strip()
subfamily = (rename.get("subfamily") or "").strip() or "Regular"
weight_class = rename.get("weightClass", None)
postscript = (rename.get("postScriptName") or "").strip()
if not postscript:
    # last resort fallback (ASCII-ish slug)
    base = (family + "-" + subfamily).strip() or "Font-Static"
    postscript = "".join([c if (c.isalnum() or c == "-") else "-" for c in base])
    while "--" in postscript:
        postscript = postscript.replace("--", "-")
    postscript = postscript.strip("-")[:63] or "Font-Static"

full_name = (family + " " + subfamily).strip() if family else subfamily

def set_name(name_id, value):
    if not value:
        return
    # Windows (Unicode)
    inst["name"].setName(value, name_id, 3, 1, 0x409)
    # macOS (Roman) — не все строки кодируются в MacRoman (кириллица/emoji).
    # Если не кодируется — просто пропускаем запись (Windows Unicode достаточно).
    try:
        value_mac = value.encode("mac_roman").decode("mac_roman")
    except Exception:
        return
    try:
        inst["name"].setName(value_mac, name_id, 1, 0, 0)
    except Exception:
        pass

if family:
    set_name(1, family)   # Family
    set_name(16, family)  # Typographic family
set_name(2, subfamily)    # Subfamily
set_name(17, subfamily)   # Typographic subfamily
if family:
    set_name(4, full_name)  # Full name
set_name(6, postscript)   # PostScript name
if family:
    unique_id = f"{postscript};{int(time.time())};{full_name}"
    set_name(3, unique_id)

# Вес/курсив для корректного отображения в редакторе и ОС.
try:
    if weight_class is not None and "OS/2" in inst:
        w = int(round(float(weight_class)))
        if w < 1: w = 1
        if w > 1000: w = 1000
        inst["OS/2"].usWeightClass = w
        # Bold bit (heuristic)
        try:
            fs = int(inst["OS/2"].fsSelection)
            if w >= 700:
                fs = fs | (1 << 5)
            else:
                fs = fs & ~(1 << 5)
            inst["OS/2"].fsSelection = fs
        except Exception:
            pass
except Exception:
    pass

try:
    if "head" in inst and "OS/2" in inst:
        w = int(getattr(inst["OS/2"], "usWeightClass", 400) or 400)
        italic = False
        try:
            fs = int(inst["OS/2"].fsSelection)
            italic = (fs & 1) != 0
        except Exception:
            italic = False
        mac = int(inst["head"].macStyle)
        # bit0 bold, bit1 italic
        mac = (mac | 1) if w >= 700 else (mac & ~1)
        mac = (mac | 2) if italic else (mac & ~2)
        inst["head"].macStyle = mac
except Exception:
    pass

if out_format in ("woff", "woff2"):
    inst.flavor = out_format
else:
    inst.flavor = None

inst.save(out_path)
`;

  await writeFile(scriptPath, pyCode, 'utf8');

  try {
    await new Promise((resolve, reject) => {
      const args = [
        scriptPath,
        inputPath,
        outputPath,
        String(format || 'woff2').toLowerCase(),
        JSON.stringify(axes),
        JSON.stringify(renamePayload),
      ];
      const child = spawn(fontToolsPython, args, { windowsHide: true });
      let stderr = '';
      child.on('error', reject);
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `fonttools exit ${code}`));
      });
    });
  } finally {
    await unlink(scriptPath).catch(() => {});
  }
}

async function generateWithWebAlchemyInProcess(buffer, variableSettings, format) {
  const options = toInstancerOptions(variableSettings);
  const { out, subset } = await instantiateVariableFontInProcess(buffer, options);
  return finalizeWebAlchemyOutput(out, format, subset);
}

async function generateWithWebAlchemyViaNodeWorker(buffer, variableSettings, format) {
  const tempDir = getTempDir();
  const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const inputPath = path.join(tempDir, `wa-in-${stamp}.bin`);
  const outputPath = path.join(tempDir, `wa-out-${stamp}.${String(format || 'woff2').toLowerCase()}`);
  const options = toInstancerOptions(variableSettings);

  await writeFile(inputPath, buffer);
  try {
    return await runWebAlchemyWorker(
      tempDir,
      'instantiate',
      inputPath,
      outputPath,
      String(format || 'woff2').toLowerCase(),
      JSON.stringify(options),
    );
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Генерация через @web-alchemy/fonttools (Pyodide).
 * На Bun (ONREZA COMPUTE) — отдельный процесс Node, т.к. Pyodide в Bun часто падает.
 */
async function generateWithWebAlchemy(buffer, variableSettings, format) {
  if (mustUseNodeWorkerOnly()) {
    if (!canRunNodeWorker()) {
      throw new Error(
        'На сервере Bun нет Node.js для Pyodide. Задайте FONT_GEN_NODE_PATH или используйте генерацию в браузере.',
      );
    }
    return generateWithWebAlchemyViaNodeWorker(buffer, variableSettings, format);
  }

  if (shouldUseNodeWorkerFirst()) {
    try {
      return await generateWithWebAlchemyViaNodeWorker(buffer, variableSettings, format);
    } catch (workerErr) {
      console.warn('[generate-static-font] node worker failed:', workerErr?.message);
    }
  }
  try {
    return await generateWithWebAlchemyInProcess(buffer, variableSettings, format);
  } catch (inProcessError) {
    if (canRunNodeWorker()) {
      console.warn(
        '[generate-static-font] in-process failed, retry via node worker:',
        inProcessError?.message,
      );
      return generateWithWebAlchemyViaNodeWorker(buffer, variableSettings, format);
    }
    throw inProcessError;
  }
}

function safeRuntimeInfo() {
  try {
    return describeWebAlchemyRuntime();
  } catch (e) {
    return { runtimeProbeError: e?.message || String(e) };
  }
}

function resolveWebAlchemyEngineLabel() {
  return shouldUseNodeWorkerFirst() ? 'web-alchemy-node' : 'web-alchemy';
}

/**
 * API для генерации статических шрифтов из вариативных
 * Локально: Python fonttools из venv; на Vercel: @web-alchemy/fonttools.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonMethodNotAllowed(res, 'POST');
  }

  try {
    return await handleGenerateStaticFont(req, res);
  } catch (error) {
    console.error('[generate-static-font] unhandled:', error);
    const msg = error?.message || 'Unknown error';
    return res.status(500).json({
      error: 'Failed to generate static font',
      message: msg,
      details: msg,
      runtime: safeRuntimeInfo(),
    });
  }
}

async function handleGenerateStaticFont(req, res) {
  const { fontData, variableSettings, format = 'woff2', probe, rename } = req.body || {};
  const outFormat = String(format || 'woff2').toLowerCase();
  const fontToolsPython = resolveFontToolsPython();

  if (probe === true) {
    return res.status(200).json({
      ok: true,
      probe: true,
      engine: fontToolsPython ? 'python' : resolveWebAlchemyEngineLabel(),
      internalRename: Boolean(fontToolsPython),
      formats: [...ALLOWED_FORMATS],
      runtime: safeRuntimeInfo(),
      hint: mustUseNodeWorkerOnly() && !canRunNodeWorker()
        ? 'Задайте FONT_GEN_NODE_PATH или используйте браузерную генерацию (fallback).'
        : undefined,
    });
  }

  if (!ALLOWED_FORMATS.has(outFormat)) {
    return res.status(400).json({ error: 'Неподдерживаемый формат', allowed: [...ALLOWED_FORMATS] });
  }

  if (!fontData || !variableSettings) {
    return res.status(400).json({ error: 'Missing fontData or variableSettings' });
  }

  let actor;
  try {
    actor = await resolveGenerationQuotaActor(req);
  } catch (authErr) {
    console.warn('[generate-static-font] quota actor:', authErr?.message);
    actor = { userId: null, isPro: false, guestQuotaId: String(req.headers['x-guest-quota-id'] || '').trim() };
  }

  let quotaCheck;
  try {
    quotaCheck = await consumeStaticGenerationQuota(req, { ...actor, dryRun: true });
  } catch (quotaErr) {
    console.warn('[generate-static-font] quota dry-run:', quotaErr?.message);
    quotaCheck = { ok: true };
  }

  if (!quotaCheck.ok) {
    return res.status(quotaCheck.status || 429).json({
      error: 'QUOTA_EXCEEDED',
      message: quotaCheck.message,
      limit: quotaCheck.limit,
      used: quotaCheck.used,
      remaining: quotaCheck.remaining,
      period: quotaCheck.period,
    });
  }

  const tempDir = getTempDir();
  const stamp = Date.now();
  const inputPath = path.join(tempDir, `input-${stamp}.bin`);
  const outputPath = path.join(tempDir, `output-${stamp}.${outFormat}`);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const buffer = Buffer.from(fontData, 'base64');
    await writeFile(inputPath, buffer);

    if (fontToolsPython) {
      const family = sanitizeNameString(rename?.family, 'Font');
      const subfamily = sanitizeNameString(rename?.subfamily, 'Regular');
      const postScriptName = sanitizeNameString(rename?.postScriptName, buildPostScriptName(family, subfamily), 63);

      await generateWithPythonFontTools(fontToolsPython, {
        inputPath,
        outputPath,
        variableSettings,
        format: outFormat,
        rename: { family, subfamily, postScriptName },
      });

      const staticFontData = fs.readFileSync(outputPath);
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});

      const quotaAfter = await consumeStaticGenerationQuota(req, actor);
      return res.status(200).json({
        success: true,
        data: staticFontData.toString('base64'),
        size: staticFontData.length,
        format: outFormat,
        engine: 'python',
        renameApplied: true,
        quota: quotaAfter.ok
          ? { limit: quotaAfter.limit, used: quotaAfter.used, remaining: quotaAfter.remaining, period: quotaAfter.period }
          : undefined,
      });
    }

    // Vercel / окружение без venv
    const staticFontData = await generateWithWebAlchemy(buffer, variableSettings, outFormat);
    await unlink(inputPath).catch(() => {});

    const quotaAfter = await consumeStaticGenerationQuota(req, actor);
    return res.status(200).json({
      success: true,
      data: Buffer.from(staticFontData).toString('base64'),
      size: staticFontData.length,
      format: outFormat,
      engine: resolveWebAlchemyEngineLabel(),
      renameApplied: false,
      quota: quotaAfter.ok
        ? { limit: quotaAfter.limit, used: quotaAfter.used, remaining: quotaAfter.remaining, period: quotaAfter.period }
        : undefined,
    });
  } catch (error) {
    try {
      if (fs.existsSync(inputPath)) await unlink(inputPath);
      if (fs.existsSync(outputPath)) await unlink(outputPath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    console.error('Static font generation error:', error);
    const msg = error?.message || 'Unknown error';
    return res.status(500).json({
      error: 'Failed to generate static font',
      message: msg,
      details: msg,
      runtime: safeRuntimeInfo(),
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
