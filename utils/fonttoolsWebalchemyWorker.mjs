/**
 * Node-only worker для @web-alchemy/fonttools (Pyodide).
 * Запускается из API, когда основной процесс — Bun (ONREZA COMPUTE и т.п.).
 *
 * Команды:
 *   instantiate <input> <output> <format> <optionsJson>
 *   subset <input> <output> <targetFormat>
 */
import { readFile, writeFile } from 'fs/promises';

function isWoff2Buffer(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.length >= 4 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

async function cmdInstantiate(inputPath, outputPath, format, optionsJson) {
  const { instantiateVariableFont, subset } = await import('@web-alchemy/fonttools');
  const buffer = await readFile(inputPath);
  const options = JSON.parse(optionsJson || '{}');
  let out = await instantiateVariableFont(buffer, options);
  const want = String(format || 'woff2').toLowerCase();
  if (want === 'woff2' && !isWoff2Buffer(out)) {
    out = await subset(Buffer.from(out), { '*': true, flavor: 'woff2' });
  }
  await writeFile(outputPath, Buffer.from(out));
}

async function cmdSubset(inputPath, outputPath, targetFormat) {
  const { subset } = await import('@web-alchemy/fonttools');
  const buffer = await readFile(inputPath);
  const opts = { '*': true };
  const fmt = String(targetFormat || '').toLowerCase();
  if (fmt === 'woff' || fmt === 'woff2') {
    opts.flavor = fmt;
  }
  const out = await subset(Buffer.from(buffer), opts);
  if (!out || !out.length) {
    throw new Error('web-alchemy subset вернул пустой результат');
  }
  await writeFile(outputPath, Buffer.from(out));
}

async function main() {
  console.error('[fonttoolsWebalchemyWorker] cwd=', process.cwd());
  const [cmd, inputPath, outputPath, arg3, arg4] = process.argv.slice(2);
  if (!cmd || !inputPath || !outputPath) {
    throw new Error('usage: fonttoolsWebalchemyWorker.mjs <instantiate|subset> ...');
  }
  if (cmd === 'instantiate') {
    await cmdInstantiate(inputPath, outputPath, arg3, arg4);
    return;
  }
  if (cmd === 'subset') {
    await cmdSubset(inputPath, outputPath, arg3);
    return;
  }
  throw new Error(`unknown command: ${cmd}`);
}

main().catch((err) => {
  console.error('[fonttoolsWebalchemyWorker]', err);
  process.exit(1);
});
