import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Timeweb/прокси должны подключаться снаружи контейнера.
// Если слушать localhost, платформа будет видеть "таймаут" и убивать процесс.
if (!process.env.HOSTNAME) process.env.HOSTNAME = '0.0.0.0';
if (!process.env.PORT) process.env.PORT = '3000';

const standaloneServer = path.join(ROOT, '.next', 'standalone', 'server.js');

if (!fs.existsSync(standaloneServer)) {
  console.error('[start-standalone] Missing .next/standalone/server.js. Did you run `npm run build`?');
  process.exit(1);
}

// Standalone server запускается побочным эффектом при импорте.
await import(pathToFileURL(standaloneServer).href);

