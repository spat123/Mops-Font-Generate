import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Timeweb/прокси должны подключаться снаружи контейнера.
// Если слушать localhost, платформа будет видеть "таймаут" и убивать процесс.
if (!process.env.HOSTNAME) process.env.HOSTNAME = '0.0.0.0';
if (!process.env.PORT) process.env.PORT = '3000';

const standaloneDir = path.join(ROOT, '.next', 'standalone');
const standaloneServer = path.join(standaloneDir, 'server.js');

if (!fs.existsSync(standaloneServer)) {
  console.error('[start-standalone] Missing .next/standalone/server.js. Did you run `npm run build`?');
  process.exit(1);
}

// В standalone Next ожидает запуск из каталога `.next/standalone`.
// Иначе могут ломаться относительные пути и резолв модулей.
process.chdir(standaloneDir);

console.log(
  `[start-standalone] cwd=${process.cwd()} HOSTNAME=${process.env.HOSTNAME} PORT=${process.env.PORT} runtime=${
    process.versions?.bun ? 'bun' : 'node'
  }`,
);

// Standalone server запускается побочным эффектом при импорте.
await import(pathToFileURL(standaloneServer).href);

