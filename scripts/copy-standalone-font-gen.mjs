/**
 * Копирует worker и pyodide-трейс в .next/standalone после next build.
 * ONREZA/Vercel standalone не включает scripts/ автоматически.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');

if (!fs.existsSync(STANDALONE)) {
  console.warn('[copy-standalone-font-gen] skip: no .next/standalone');
  process.exit(0);
}

const copies = [['utils/fonttoolsWebalchemyWorker.mjs', 'utils/fonttoolsWebalchemyWorker.mjs']];

for (const [relFrom, relTo] of copies) {
  const from = path.join(ROOT, relFrom);
  const to = path.join(STANDALONE, relTo);
  if (!fs.existsSync(from)) continue;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('[copy-standalone-font-gen]', relFrom, '->', path.join('.next/standalone', relTo));
}
