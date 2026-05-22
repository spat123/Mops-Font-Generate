# Деплой на Timeweb (Docker)

## Ошибка из лога: `Unable to locate package bun`

Авто-Dockerfile Timeweb часто пишет:

```dockerfile
apt-get install -y curl bun install
```

`bun` и `install` — **не пакеты Debian**, это команда `bun install`. Сборка падает на шаге 2/7.

**Решение:** использовать **`Dockerfile` из корня репозитория** (Node 20 + `npm ci` + `npm run build`), **без Bun**.

---

## Настройка в панели Timeweb

| Параметр | Значение |
|----------|----------|
| Сборка | **Dockerfile** из репозитория (не автогенерация с Bun) |
| Контекст | корень репозитория |
| Порт контейнера | **3000** |
| Переменные | см. `.env.example` (runtime) |

**Не задавайте** в Install/Build команды с `bun install` — всё уже в Dockerfile.

---

## Обязательные переменные окружения

```env
NEXTAUTH_URL=https://dynamicfont.ru
NEXTAUTH_SECRET=<≥32 символов>
NEXT_PUBLIC_SITE_URL=https://dynamicfont.ru
DATABASE_URL=<Neon или Postgres>
AUTH_TRUST_HOST=true
DATABASE_DRIVER=postgres
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
EMAIL_FROM="DINAMIC FONT <onboarding@resend.dev>"
```

Проверка после деплоя:

1. `GET https://ваш-домен/api/auth/ping` → `database.ok: true`
2. `GET https://ваш-домен/api/auth/session` → **200** JSON

---

## DNS (reg.ru)

A-запись `dynamicfont.ru` → **IP сервера Timeweb** (не ONREZA).

Google OAuth redirect: `https://dynamicfont.ru/api/auth/callback/google`

---

## Локальная проверка образа

```bash
docker build -t dinamic-font .
docker run --rm -p 3000:3000 --env-file .env.production dinamic-font
```

---

## Альтернатива без Docker

[VPS REG.ru + Node standalone](./DEPLOY_REG_RU_VPS.md) — проще, если Docker на Timeweb снова мешает.
