# Деплой на VPS REG.ru (без Docker)

**Продакшен `dynamicfont.ru`:** [DEPLOY_ONREZA.md](./DEPLOY_ONREZA.md) (ONREZA + DNS в reg.ru).

Ниже — запасной вариант: свой VPS в REG.ru, Node.js standalone, nginx, Let's Encrypt. Docker в репозитории не используется.

---

## Файлы

| Файл | Назначение |
|------|------------|
| `.env.example` | Шаблон переменных → скопировать в `.env.production` на сервере |
| `deploy/nginx/dynamicfont.ru.conf` | nginx → `127.0.0.1:3000` |

---

## 1. VPS в REG.ru

1. **Облако REG.ru** → VPS (Ubuntu **22.04**, минимум **2 GB RAM**, 2 vCPU).
2. Запишите **публичный IP** сервера.
3. SSH: `ssh root@ВАШ_IP`

---

## 2. Node.js на сервере

```bash
apt update && apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20+
```

Опционально для генерации статики через Python fonttools:

```bash
apt install -y python3-fonttools
# в .env.production: FONTTOOLS_PYTHON=/usr/bin/python3
```

---

## 3. Код и сборка

```bash
mkdir -p /opt/dinamic-font && cd /opt/dinamic-font
git clone https://github.com/spat123/Mops-Font-Generate.git .
cp .env.example .env.production
nano .env.production   # NEXTAUTH_SECRET, DATABASE_URL, OAuth, RESEND
chmod 600 .env.production

npm ci
npm run build
```

**Обязательно в `.env.production`:**

- `NEXTAUTH_URL=https://dynamicfont.ru`
- `NEXT_PUBLIC_SITE_URL=https://dynamicfont.ru`
- `DATABASE_URL` — Neon или Postgres
- OAuth redirect: `https://dynamicfont.ru/api/auth/callback/google` и `.../yandex`

Запуск standalone (порт 3000):

```bash
cd /opt/dinamic-font/.next/standalone
set -a && source /opt/dinamic-font/.env.production && set +a
HOSTNAME=0.0.0.0 PORT=3000 node server.js
```

Для постоянной работы — **systemd** (пример unit `/etc/systemd/system/dinamic-font.service`):

```ini
[Unit]
Description=DINAMIC FONT
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/dinamic-font/.next/standalone
EnvironmentFile=/opt/dinamic-font/.env.production
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now dinamic-font
journalctl -u dinamic-font -f
```

Проверка: `curl -I http://127.0.0.1:3000/`

---

## 4. nginx + SSL

```bash
cp deploy/nginx/dynamicfont.ru.conf /etc/nginx/sites-available/dynamicfont.ru
ln -sf /etc/nginx/sites-available/dynamicfont.ru /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
certbot --nginx -d dynamicfont.ru -d www.dynamicfont.ru
systemctl reload nginx
```

---

## 5. DNS в REG.ru

| Запись | Значение |
|--------|----------|
| `A` `@` | **IP вашего VPS** |
| `A` или `CNAME` `www` | IP VPS или `@` |

Уберите старые записи на Vercel (`64.29.17.*`). Подробнее про кэш DNS — см. обсуждение в репозитории / `Logger.md`.

---

## 6. Обновление релиза

```bash
cd /opt/dinamic-font
git pull
npm ci
npm run build
systemctl restart dinamic-font
```

---

## 7. Частые проблемы

| Симптом | Решение |
|---------|---------|
| 502 Bad Gateway | `systemctl status dinamic-font`, `journalctl -u dinamic-font`, порт `127.0.0.1:3000` |
| OAuth redirect mismatch | URI строго `https://dynamicfont.ru/api/auth/callback/...` |
| Генерация VF→static 500 на Bun | см. [DEPLOY_ONREZA.md](./DEPLOY_ONREZA.md) — worker Node, `FONT_GEN_NODE_PATH` |

OAuth: [AUTH_SETUP.md](./AUTH_SETUP.md).
