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

- `engine`: `web-alchemy-node` (на Bun) или `web-alchemy` (на Node)
- `runtime.nodeWorkerBinary`: путь к `node`, не `null`
- `runtime.workerScriptExists`: `true`

Если `nodeWorkerBinary` — `null`, в переменных окружения ONREZA задайте:

```env
FONT_GEN_NODE_PATH=/usr/bin/node
```

(точный путь уточните в shell контейнера: `which node`).

### Рекомендуемые настройки ONREZA

| Параметр | Значение |
|----------|----------|
| Build | `npm run build` |
| Start | `npm run start` |
| Node | 20.x (если платформа позволяет выбрать runtime Node вместо только Bun — предпочтительно Node) |
| RAM | минимум **1–2 GB** (Pyodide тяжёлый) |

### Лимит времени

Генерация VF → static может занимать 30–90 с на больших файлах. Если ONREZA обрывает запрос раньше 60 с — увеличьте timeout на стороне платформы или уменьшите размер исходного шрифта.

### Локальный Python (опционально)

На VPS/Docker можно установить `fonttools` в venv — тогда используется движок `python` с переименованием таблиц `name`. На ONREZA без своего Dockerfile это обычно недоступно.
