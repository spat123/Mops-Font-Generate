/**
 * Переносит каталог (панели, карточки, хуки useCatalog*, buildCatalog*) в components/catalog/
 * и правит импорты в перенесённых файлах и по всему репозиторию.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'components', 'catalog');
const UI = path.join(ROOT, 'components', 'ui');
const COMPONENTS = path.join(ROOT, 'components');

const FROM_UI = [
  'CatalogAddTargetMenu.jsx',
  'CatalogCardHoverOverlay.jsx',
  'CatalogCheckbox.jsx',
  'CatalogDownloadSplitButton.jsx',
  'CatalogFontCard.jsx',
  'CatalogGridModeToggle.jsx',
  'CatalogLibraryActions.jsx',
  'CatalogPanelToolbar.jsx',
  'CatalogRowHeader.jsx',
  'CatalogRowModeCard.jsx',
  'CatalogSearchButton.jsx',
  'CatalogSearchField.jsx',
  'CatalogSourceCard.jsx',
  'CatalogTextSortControls.jsx',
  'CatalogTopToolbar.jsx',
  'GoogleFontsCatalogCard.jsx',
  'FontsourceCatalogCard.jsx',
  'buildCatalogDownloadButtonProps.js',
  'useCatalogEngine.js',
  'useCatalogSessionExclusion.js',
  'useCatalogToolbarLayout.js',
  'useCatalogToolbarProps.js',
  'useCatalogViewControls.js',
];

const FROM_COMPONENTS = ['GoogleFontsCatalogPanel.jsx', 'FontsourceCatalogPanel.jsx'];

const CATALOG_BASENAMES = new Set(
  [...FROM_UI, ...FROM_COMPONENTS].map((f) => path.basename(f, path.extname(f))),
);

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function moveFile(from, to) {
  mkdirp(path.dirname(to));
  fs.renameSync(from, to);
  console.log('move', path.relative(ROOT, from), '->', path.relative(ROOT, to));
}

function walkDir(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkDir(full, out);
    else out.push(full);
  }
  return out;
}

function fixImportsInCatalogFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  const relFromRoot = path.relative(ROOT, filePath);

  // Панели были в components/: ../utils -> ../../utils
  if (relFromRoot.endsWith('GoogleFontsCatalogPanel.jsx') || relFromRoot.endsWith('FontsourceCatalogPanel.jsx')) {
    s = s.replaceAll("from '../utils/", "from '../../utils/");
    s = s.replaceAll('from "../utils/', 'from "../../utils/');
    // ./ui/X -> ./X или ../ui/X
    s = s.replace(/from ['"]\.\/ui\/([^'"]+)['"]/g, (m, sub) => {
      const base = sub.replace(/\.(jsx|js|tsx|ts)$/, '');
      if (CATALOG_BASENAMES.has(base) || CATALOG_BASENAMES.has(path.basename(sub, path.extname(sub)))) {
        return `from './${sub}'`;
      }
      return `from '../ui/${sub}'`;
    });
  }

  // Файлы из ui: ./Foo -> ../ui/Foo если Foo не в каталоге
  s = s.replace(/from ['"]\.\/([^'"./]+)['"]/g, (fullMatch, sub) => {
    if (sub.startsWith('.')) return fullMatch;
    const base = sub.replace(/\.(jsx|js)$/, '');
    if (CATALOG_BASENAMES.has(base)) return fullMatch;
    return `from '../ui/${sub}'`;
  });

  fs.writeFileSync(filePath, s, 'utf8');
}

/** Глобальные замены путей импортов (строка в кавычках). */
const GLOBAL_REPLACEMENTS = [
  ["'../components/catalog/GoogleFontsCatalogPanel'", "'../components/catalog/GoogleFontsCatalogPanel'"],
  ['"../components/catalog/GoogleFontsCatalogPanel"', '"../components/catalog/GoogleFontsCatalogPanel"'],
  ["'../components/catalog/FontsourceCatalogPanel'", "'../components/catalog/FontsourceCatalogPanel'"],
  ['"../components/catalog/FontsourceCatalogPanel"', '"../components/catalog/FontsourceCatalogPanel"'],
  ["'../catalog/GoogleFontsCatalogPanel'", "'../catalog/GoogleFontsCatalogPanel'"],
  ['"../catalog/GoogleFontsCatalogPanel"', '"../catalog/GoogleFontsCatalogPanel"'],
  ["'../catalog/FontsourceCatalogPanel'", "'../catalog/FontsourceCatalogPanel'"],
  ['"../catalog/FontsourceCatalogPanel"', '"../catalog/FontsourceCatalogPanel"'],
  ["'./catalog/GoogleFontsCatalogPanel'", "'./catalog/GoogleFontsCatalogPanel'"],
  ['"./catalog/GoogleFontsCatalogPanel"', '"./catalog/GoogleFontsCatalogPanel"'],
  ["'./catalog/FontsourceCatalogPanel'", "'./catalog/FontsourceCatalogPanel'"],
  ['"./catalog/FontsourceCatalogPanel"', '"./catalog/FontsourceCatalogPanel"'],
  ["'../components/catalog/buildCatalogDownloadButtonProps'", "'../components/catalog/buildCatalogDownloadButtonProps'"],
  ['"../components/catalog/buildCatalogDownloadButtonProps"', '"../components/catalog/buildCatalogDownloadButtonProps"'],
  ["'./catalog/buildCatalogDownloadButtonProps'", "'./catalog/buildCatalogDownloadButtonProps'"],
  ['"./catalog/buildCatalogDownloadButtonProps"', '"./catalog/buildCatalogDownloadButtonProps"'],
  ["'../catalog/buildCatalogDownloadButtonProps'", "'../catalog/buildCatalogDownloadButtonProps'"],
  ['"../catalog/buildCatalogDownloadButtonProps"', '"../catalog/buildCatalogDownloadButtonProps"'],
  ["'../catalog/GoogleFontsCatalogCard'", "'../catalog/GoogleFontsCatalogCard'"],
  ['"../catalog/GoogleFontsCatalogCard"', '"../catalog/GoogleFontsCatalogCard"'],
  ["'../catalog/FontsourceCatalogCard'", "'../catalog/FontsourceCatalogCard'"],
  ['"../catalog/FontsourceCatalogCard"', '"../catalog/FontsourceCatalogCard"'],
  ["'./catalog/GoogleFontsCatalogCard'", "'./catalog/GoogleFontsCatalogCard'"],
  ['"./catalog/GoogleFontsCatalogCard"', '"./catalog/GoogleFontsCatalogCard"'],
  ["'./catalog/FontsourceCatalogCard'", "'./catalog/FontsourceCatalogCard'"],
  ['"./catalog/FontsourceCatalogCard"', '"./catalog/FontsourceCatalogCard"'],
];

function applyGlobalReplacements(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [a, b] of GLOBAL_REPLACEMENTS) {
    if (s.includes(a)) {
      s = s.split(a).join(b);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, s, 'utf8');
}

function main() {
  mkdirp(CATALOG);

  for (const name of FROM_UI) {
    const from = path.join(UI, name);
    const to = path.join(CATALOG, name);
    if (!fs.existsSync(from)) {
      console.error('missing', from);
      process.exit(1);
    }
    moveFile(from, to);
  }
  for (const name of FROM_COMPONENTS) {
    const from = path.join(COMPONENTS, name);
    const to = path.join(CATALOG, name);
    if (!fs.existsSync(from)) {
      console.error('missing', from);
      process.exit(1);
    }
    moveFile(from, to);
  }

  for (const f of fs.readdirSync(CATALOG)) {
    const ext = path.extname(f);
    if (ext === '.jsx' || ext === '.js') {
      fixImportsInCatalogFile(path.join(CATALOG, f));
    }
  }

  const codeFiles = walkDir(ROOT).filter((f) => /\.(jsx|js|tsx|ts|mjs)$/.test(f) && !f.includes(`${path.sep}node_modules${path.sep}`));

  for (const filePath of codeFiles) {
    if (filePath.startsWith(CATALOG + path.sep)) continue;
    applyGlobalReplacements(filePath);
  }

  console.log('done');
}

main();
