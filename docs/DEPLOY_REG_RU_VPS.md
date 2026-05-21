# Деплой на VPS REG.ru (production `dynamicfont.ru`)

Продакшен для России: **VPS в REG.ru** + Docker + nginx + Let's Encrypt.  
Vercel можно оставить только для preview или отключить домен после переезда.

Файлы:

| Файл | Назначение |
|------|------------|
| `Dockerfile` | Next.js standalone + Python fonttools |
| `docker-compose.prod.yml` | Запуск на сервере |
| `.env.vps.example` | Шаблон `.env.production` |
| `deploy/nginx/dynamicfont.ru.conf` | nginx → `127.0.0.1:3000` |

---

## 1. VPS в REG.ru

1. **Облако REG.ru** → VPS (Ubuntu **22.04**, минимум **2 GB RAM**, 2 vCPU).
2. Запишите **публичный IP** сервера.
3. SSH: `ssh root@ВАШ_IP`

---

## 2. Установка Docker на сервере

```bash
apt update && apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sh
systemctl enable docker
```

---

## 3. Код на сервер

```bash
mkdir -p /opt/dinamic-font && cd /opt/dinamic-font
git clone https://github.com/spat123/Mops-Font-Generate.git .
# или git pull при обновлениях
```

Скопируйте секреты:

```bash
cp .env.vps.example .env.production
nano .env.production   # NEXTAUTH_SECRET, DATABASE_URL, OAuth, RESEND
chmod 600 .env.production
```

**Обязательно:**

- `NEXTAUTH_URL=https://dynamicfont.ru`
- `NEXT_PUBLIC_SITE_URL=https://dynamicfont.ru`
- `DATABASE_URL` — Neon **или** Postgres на VPS/REG (для VPS: `DATABASE_DRIVER=postgres` при необходимости)
- OAuth redirect: `https://dynamicfont.ru/api/auth/callback/google` и `.../yandex`

---

## 4. Сборка и запуск

```bash
cd /opt/dinamic-font
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app
```

Проверка локально на сервере: `curl -I http://127.0.0.1:3000/`

---

## 5. nginx + SSL

```bash
cp deploy/nginx/dynamicfont.ru.conf /etc/nginx/sites-available/dynamicfont.ru
ln -sf /etc/nginx/sites-available/dynamicfont.ru /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
```

Временно закомментируйте блок `ssl_certificate` в конфиге, если сертификата ещё нет — или сразу:

```bash
certbot --nginx -d dynamicfont.ru -d www.dynamicfont.ru
systemctl reload nginx
```

---

## 6. DNS в REG.ru

| Запись | Значение |
|--------|----------|
| `A` `@` | **IP вашего VPS** |
| `A` или `CNAME` `www` | IP VPS или `@` |

**Уберите** прокси на Vercel (`76.76.21.21`) и **отключите** домен в Vercel Dashboard, когда сайт на VPS открывается стабильно.

Cloudflare (если был): либо **DNS only** (серое облако) на A VPS, либо NS на REG без CF.

---

## 7. Обновление релиза

```bash
cd /opt/dinamic-font
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 8. База данных

| Вариант | Когда |
|---------|--------|
| **Neon** (текущий) | Быстрый старт, `DATABASE_URL` как на Vercel |
| **Postgres на VPS** | `apt install postgresql` или managed REG — меньше задержек из РФ |

Схема создаётся при первом запросе (`ensureUserSchema`).

---

## 9. Частые проблемы

| Симптом | Решение |
|---------|---------|
| 502 Bad Gateway | `docker compose ps`, логи app, порт `127.0.0.1:3000` |
| OAuth redirect mismatch | URI строго `https://dynamicfont.ru/api/auth/callback/...` |
| Код входа не приходит | `RESEND_API_KEY`, SPF/DKIM домена |
| Медленно fontsource | Кэш `s-maxage` на Vercel не работает на VPS — первый запрос к CDN нормален; повтор быстрее за счёт nginx/браузера |

OAuth: [AUTH_SETUP.md](./AUTH_SETUP.md).
