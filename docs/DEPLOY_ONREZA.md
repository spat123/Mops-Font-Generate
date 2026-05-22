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

| Переменная | Значение |
|------------|----------|
| `NEXTAUTH_URL` | `https://dynamicfont.ru` (без слэша в конце) |
| `NEXTAUTH_SECRET` | случайная строка ≥ 32 символа (`openssl rand -base64 32`) — **обязательна**, иначе `/api/auth/session` → **500** |
| `NEXT_PUBLIC_SITE_URL` | `https://dynamicfont.ru` |
| `DATABASE_URL` | Neon или Postgres |

Проверка после деплоя: `GET https://dynamicfont.ru/api/auth/session` → **200** и JSON `{ user: null }` или объект пользователя (не 500).

Если в Network видите `/_vercel/insights/script.js` или `/_vercel/speed-insights/script.js` с **404** на ONREZA — это нормально до обновления сборки; скрипты Vercel Analytics на ONREZA не нужны.

Для **серверной** генерации (опционально, если probe показывает `nodeWorkerBinary: null`):

```env
FONT_GEN_NODE_PATH=/usr/bin/node
```

Если Node нет, worker запустится через **тот же Bun**, что и приложение — **дополнительные переменные часто не нужны**.

Опционально (только если probe показывает `fonttoolsInWorkerCwd: false`):

```env
FONT_GEN_BUN_PATH=/usr/bin/bun
FONT_GEN_CWD=/путь/к/standalone
```

`FONT_GEN_CWD` — каталог, где есть `node_modules/@web-alchemy` и `server.js`.  
**Не обязательно `/app`** — на ONREZA путь другой; код сам ищет `.next/standalone` и `process.cwd()`.  
Если панель ONREZA не сохраняет переменную — можно не задавать, пока генерация работает.

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

На своём VPS можно установить `python3-fonttools` — тогда используется движок `python` с переименованием таблиц `name` (см. [DEPLOY_REG_RU_VPS.md](./DEPLOY_REG_RU_VPS.md)). На ONREZA это обычно недоступно — используется web-alchemy (Node/Pyodide).
