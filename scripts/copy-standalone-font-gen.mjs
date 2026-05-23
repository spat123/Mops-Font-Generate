/**
 * После `next build` (output: 'standalone'):
 * - public и .next/static → .next/standalone (иначе 404 на /_next/static/*)
 * - worker / jose для API генерации и NextAuth
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

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

const staticSrc = path.join(ROOT, '.next', 'static');
const staticDest = path.join(STANDALONE, '.next', 'static');
if (fs.existsSync(staticSrc)) {
  copyDirRecursive(staticSrc, staticDest);
  console.log('[copy-standalone-font-gen] .next/static -> .next/standalone/.next/static');
} else {
  console.warn('[copy-standalone-font-gen] skip: no .next/static (run next build first)');
}

const publicSrc = path.join(ROOT, 'public');
const publicDest = path.join(STANDALONE, 'public');
if (fs.existsSync(publicSrc)) {
  copyDirRecursive(publicSrc, publicDest);
  console.log('[copy-standalone-font-gen] public -> .next/standalone/public');
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

const joseSrc = path.join(ROOT, 'node_modules', 'jose');
const joseDest = path.join(STANDALONE, 'node_modules', 'jose');
if (fs.existsSync(joseSrc)) {
  copyDirRecursive(joseSrc, joseDest);
  console.log('[copy-standalone-font-gen] node_modules/jose -> .next/standalone/node_modules/jose');
} else {
  console.warn('[copy-standalone-font-gen] skip: node_modules/jose not found (run bun install)');
}
