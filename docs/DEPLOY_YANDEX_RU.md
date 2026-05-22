# Деплой RU-версии на Yandex Cloud

**Global** остаётся на **Vercel** (другой домен / `*.vercel.app`).  
**RU** — `dynamicfont.ru` на Yandex Cloud, тот же репозиторий, другие переменные окружения и **отдельная** PostgreSQL.

---

## 1. Что подготовить

| Компонент | Сервис Yandex |
|-----------|----------------|
| База | [Managed Service for PostgreSQL](https://cloud.yandex.ru/services/managed-postgresql) |
| Образ приложения | [Container Registry](https://cloud.yandex.ru/services/container-registry) |
| Запуск | [Serverless Containers](https://cloud.yandex.ru/services/serverless-containers) или VM |
| Домен | REG.ru → A/CNAME на балансировщик или URL контейнера |

Файлы в репозитории:

- `Dockerfile` — сборка Next.js (standalone) + Python fonttools
- `.env.yandex.example` — список переменных для RU
- `docker-compose.yandex.yml` — локальная проверка образа

---

## 2. PostgreSQL в Yandex

1. Консоль → **Managed PostgreSQL** → кластер (зона `ru-central1-a`, PG 15+).
2. База: `dinamic_font`, пользователь с паролем.
3. **Публичный доступ** — только если подключаетесь снаружи; для контейнера в том же облаке лучше **хост из внутренней сети** (VPC).
4. Строка подключения (пример):

   ```text
   postgresql://dinamic:PASSWORD@c-xxxxx.rw.mdb.yandexcloud.net:6432/dinamic_font?sslmode=require
   ```

5. В переменные контейнера: `DATABASE_URL=...`  
   Драйвер: обычный Postgres (`postgres` npm), Neon URL по-прежнему через `neon.tech` в строке.

Схема таблиц создаётся при первом запросе (`ensureUserSchema`).

---

## 3. Сборка Docker-образа

Локально (нужны Docker и Node не обязателен для build):

```bash
docker build -t dinamic-font-ru:latest .
docker run --rm -p 3000:3000 --env-file .env.local dinamic-font-ru:latest
```

Проверка: http://localhost:3000

---

## 4. Container Registry + push

1. Создайте registry в Yandex Cloud.
2. [Настройте Docker credential helper](https://cloud.yandex.ru/docs/container-registry/operations/authentication) (`yc container registry configure-docker`).
3. Тег и push:

   ```bash
   docker tag dinamic-font-ru:latest cr.yandex/<registry-id>/dinamic-font-ru:latest
   docker push cr.yandex/<registry-id>/dinamic-font-ru:latest
   ```

---

## 5. Serverless Container (рекомендуется для старта)

1. **Serverless Containers** → создать контейнер → ревизия из образа `cr.yandex/.../dinamic-font-ru:latest`.
2. Параметры ревизии:
   - **Память:** 2048 MB (генерация шрифтов тяжёлая)
   - **Таймаут:** 60 с
   - **Порт:** 3000
   - **Сервисный аккаунт** с доступом к VPC (если БД без публичного IP)
3. **Переменные окружения** — из `.env.yandex.example` (секреты через Lockbox или вручную).
4. Включить **публичный URL** контейнера → проверить в браузере.
5. Привязка домена `dynamicfont.ru`:
   - [Application Load Balancer](https://cloud.yandex.ru/docs/application-load-balancer/) → backend → Serverless Container, или
   - CNAME на выданный hostname (см. актуальную документацию Yandex для custom domain).

---

## 6. Переменные окружения (минимум)

| Переменная | Значение RU |
|------------|-------------|
| `NEXTAUTH_URL` | `https://dynamicfont.ru` |
| `NEXT_PUBLIC_SITE_URL` | `https://dynamicfont.ru` |
| `NEXTAUTH_SECRET` | тот же или отдельный секрет (openssl rand -base64 32) |
| `DATABASE_URL` | строка Yandex PostgreSQL |
| `GOOGLE_*` / `YANDEX_*` | OAuth, в консолях добавить redirect `https://dynamicfont.ru/api/auth/callback/...` |
| `RESEND_API_KEY` / SMTP | письма (код входа, регистрация) |

**Не задавайте** `VERCEL` — на RU-хосте его нет; для step-up login нужен `DATABASE_URL`.

---

## 7. DNS (REG.ru) после проверки URL

| Запись | Куда |
|--------|------|
| `@` / `www` | ALB Yandex или IP балансировщика (не Vercel `76.76.21.21`) |

Снимите `dynamicfont.ru` с Vercel Domains, когда RU стабилен.  
Cloudflare: либо NS на REG, либо прокси на новый origin Yandex.

---

## 8. CI (опционально)

Workflow `.github/workflows/deploy-yandex-ru.yml` — сборка и push в CR при наличии secrets:

- `YC_SA_JSON_CREDENTIALS`
- `YC_REGISTRY` (например `cr.yandex/xxx/dinamic-font-ru`)
- `YC_FOLDER_ID`

Без secrets — деплой вручную по шагам 3–5.

---

## 9. Два продакшена из одного `main`

| | Vercel (global) | Yandex (RU) |
|---|-----------------|-------------|
| Домен | `*.vercel.app` / `dynamicfont.com` | `dynamicfont.ru` |
| БД | Neon | Yandex PostgreSQL |
| Деплой | push → Vercel | push образа → Serverless Container |

Пользователи и библиотеки **не синхронизируются** между БД без отдельной миграции.

---

## 10. Частые проблемы

| Симптом | Решение |
|---------|---------|
| 503 step-up storage | Нет `DATABASE_URL` |
| OAuth redirect mismatch | Redirect URI на `https://dynamicfont.ru/...` |
| Генерация шрифта 500 | В образе есть `python3-fonttools`, `FONTTOOLS_PYTHON=/usr/bin/python3` |
| Медленно | Нормально на первом cold start; `min instances = 1` в serverless |

Подробнее по OAuth: [AUTH_SETUP.md](./AUTH_SETUP.md).
