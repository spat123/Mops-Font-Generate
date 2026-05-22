# Деплой на ONREZA (dynamicfont.ru)

## Генерация статических шрифтов

ONREZA **COMPUTE** часто запускает Next.js на **Bun**. Pyodide (`@web-alchemy/fonttools`) в Bun нестабилен — генерация падает с 500, хотя просмотр шрифтов работает.

Проект автоматически вызывает **отдельный процесс Node** (`utils/fonttoolsWebalchemyWorker.mjs`), если обнаружен Bun. После `next build` скрипт `scripts/copy-standalone-font-gen.mjs` копирует worker в `.next/standalone`.

### Проверка после деплоя

В браузере (консоль) или через curl:

```bash
curl -s -X POST https://dynamicfont.ru/api/generate-static-font \
  -H "Content-Type: application/json" \
  -d '{"probe":true}'
```

Ожидаемо:

- `engine`: `web-alchemy-bun` или `web-alchemy-node`
- `runtime.workerBinary`: путь к `bun` или `node`, не `null`
- `runtime.canRunWorker`: `true`
- `runtime.workerScriptExists`: `true`

Если `workerBinary` — `null`, в переменных окружения ONREZA задайте:

```env
FONT_GEN_NODE_PATH=/usr/bin/node
```

(точный путь уточните в shell контейнера: `which node`).

**Важно:** Pyodide (`@web-alchemy/fonttools`) нельзя подключать в клиентский бандл Next.js — сборка упадёт (`Can't resolve 'fs'`, `node:child_process`). Генерация только **на сервере** (Node-worker или Python).

### Команды в панели ONREZA (можно менять вручную)

ONREZA сама включает `NEXT_PRIVATE_STANDALONE=1` для Next.js — это нормально.

| Поле в ONREZA | Рекомендуемое значение | Зачем |
|---------------|------------------------|--------|
| **Install** | `bun install` *(или оставить авто)* | Зависимости |
| **Build** | `bun run build` | **Обязательно полный скрипт из `package.json`**, не голый `next build` |
| **Start** | оставить **авто** (standalone `server.js`) | Обычно ONREZA сама подставляет запуск из манифеста |

**Нельзя** в Build писать только:

```bash
next build
```

Иначе **не выполнится** `node scripts/copy-standalone-font-gen.mjs` и worker для Pyodide не попадёт в `.next/standalone`.

**Правильно** (эквиваленты):

```bash
bun run build
```

```bash
npm run build
```

```bash
next build && node scripts/copy-standalone-font-gen.mjs
```

В логе сборки после `next build` должна быть строка:

```text
[copy-standalone-font-gen] utils/fonttoolsWebalchemyWorker.mjs -> .next/standalone/utils/...
```

### Переменные окружения (ONREZA → Environment)

Обязательные — как на Vercel (`NEXTAUTH_*`, `DATABASE_URL`, OAuth, `RESEND_*`).

Для **серверной** генерации (опционально, если probe показывает `nodeWorkerBinary: null`):

```env
FONT_GEN_NODE_PATH=/usr/bin/node
```

Если Node нет, worker запустится через **тот же Bun**, что и приложение (обычно достаточно без env).

```env
FONT_GEN_BUN_PATH=/usr/bin/bun
FONT_GEN_CWD=/app
```

`FONT_GEN_CWD` — каталог, где лежит `node_modules` и `server.js` (часто корень standalone, уточните в shell: `pwd`).

Таймаут тяжёлой генерации (мс):

```env
FONT_GEN_TIMEOUT_MS=120000
```

### Runtime / RAM

| Параметр | Значение |
|----------|----------|
| Node / Bun | если есть выбор **Node 20** для COMPUTE — лучше; иначе Bun + `FONT_GEN_NODE_PATH` |
| RAM | минимум **1–2 GB** |

### Лимит времени

Генерация VF → static может занимать 30–90 с на больших файлах. Если ONREZA обрывает запрос раньше 60 с — увеличьте timeout на стороне платформы или уменьшите размер исходного шрифта.

### Локальный Python (опционально)

На VPS/Docker можно установить `fonttools` в venv — тогда используется движок `python` с переименованием таблиц `name`. На ONREZA без своего Dockerfile это обычно недоступно.
