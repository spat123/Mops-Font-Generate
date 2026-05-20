# Деплой на Vercel: продакшен и черновик (Preview)

Гайд для проекта **DINAMIC FONT** (Next.js 14 + NextAuth).  
Предполагается, что репозиторий **уже подключён** к Vercel, а сейчас каждый push в `main` сразу попадает к пользователям.

Связанные документы:

- [Настройка входа (OAuth)](./AUTH_SETUP.md)
- Переменные окружения: `.env.example` в корне репозитория
- Конфиг Vercel: `vercel.json` в корне репозитория

---

## 1. Два типа деплоя на одном проекте

| Тип | Ветка / команда | Кто видит | URL |
|-----|-----------------|-----------|-----|
| **Production** | `main` (или ручной `vercel --prod`) | Все пользователи | Ваш домен, `*.vercel.app` (production) |
| **Preview** | любая другая ветка, PR, `vercel` без `--prod` | Вы и те, кому дали ссылку | `*-git-<ветка>-<team>.vercel.app` |

**Правило:** пока изменения только в Preview, пользователи на основном домене видят **старую** production-версию.  
**«Опубликовать»** = обновить Production (merge в `main` или **Promote to Production** в Dashboard).

---

## 2. Целевая схема веток (рекомендуется)

Сейчас всё уходит в `main` → каждый push сразу в прод. Чтобы разделить «для пользователей» и «ещё тестирую»:

```
main      → только проверенный код → Production
develop   → ежедневная разработка   → Preview (новый URL после каждого push)
feature/* → отдельные задачи        → Preview
```

### 2.1. Один раз в Git

```bash
# из актуального main
git checkout main
git pull

git checkout -b develop
git push -u origin develop
```

Дальше работайте в `develop` (или в `feature/...`), в `main` — только через merge, когда готово к релизу.

### 2.2. В Vercel Dashboard

1. Откройте проект → **Settings** → **Git**.
2. **Production Branch** — оставьте `main` (не меняйте на `develop`).
3. Убедитесь, что **Preview Deployments** включены (обычно по умолчанию).

После этого:

- push в `main` → Production;
- push в `develop` / feature / открытый PR → Preview, **без** обновления продакшена.

---

## 3. Переменные окружения

**Settings** → **Environment Variables**.

Для каждой переменной отметьте галочки: **Production**, **Preview**, **Development** (локально — по необходимости).

### 3.1. Обязательные (из `.env.example`)

| Переменная | Production | Preview | Комментарий |
|------------|:----------:|:-------:|-------------|
| `NEXTAUTH_SECRET` | ✅ | ✅ | Один и тот же секрет на все окружения Vercel — проще. Сгенерировать: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | ⚠️ | **Production:** `https://ваш-домен.ru` (без слэша в конце). **Preview:** часто можно **не задавать** — NextAuth возьмёт URL текущего preview-деплоя. Если вход на preview ломается — задайте вручную URL конкретного staging-домена (см. §5) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | ✅ | См. redirect URI в §4 |
| `YANDEX_CLIENT_ID` / `YANDEX_CLIENT_SECRET` | ✅ | ✅ | То же |
| `AUTH_CREDENTIALS_LOGIN` / `AUTH_CREDENTIALS_PASSWORD` | по желанию | по желанию | Демо-вход, если нужен на staging |
| `MIN_OAUTH_ACCOUNT_AGE_DAYS` | по желанию | по желанию | Анти-фрод для OAuth |

Переменные с префиксом `DEV_PRO_*` — **только локально** в `.env.local`, на Vercel не нужны.

После изменения переменных сделайте **Redeploy** нужного деплоя (Variables применяются к **новым** сборкам).

### 3.2. Проверка в UI Vercel

**Deployments** → откройте деплой → вкладка **Environment** — там видно, Production это или Preview и какие переменные подставились.

---

## 4. OAuth (Google / Яндекс) для Production и Preview

Подробности провайдеров: [AUTH_SETUP.md](./AUTH_SETUP.md).

### 4.1. Production

В консолях Google и Яндекса добавьте redirect URI:

- `https://ваш-домен.ru/api/auth/callback/google`
- `https://ваш-домен.ru/api/auth/callback/yandex`

(Если используете только `*.vercel.app` без своего домена — подставьте ваш production-URL вида `https://имя-проекта.vercel.app/...`.)

### 4.2. Preview

Варианты (от простого к стабильному):

1. **Wildcard** (если консоль разрешает):  
   `https://*-ваш-slug.vercel.app/api/auth/callback/google`  
   Не все провайдеры поддерживают — проверьте в Google Cloud / Яндекс OAuth.

2. **Фиксированный staging-домен** (рекомендуется для OAuth):  
   Поддомен `staging.ваш-домен.ru` → привязать к ветке `develop` (§5).  
   В OAuth только:  
   `https://staging.ваш-домен.ru/api/auth/callback/google`  
   и `NEXTAUTH_URL=https://staging.ваш-домен.ru` для Preview **или** отдельного проекта staging.

3. **Без входа на preview** — тестировать UI без OAuth; вход только на production.

Ошибка `redirect_uri mismatch` почти всегда значит: URL в консоли OAuth ≠ реальный URL деплоя.

---

## 5. Домены (опционально)

**Settings** → **Domains**:

| Домен | Назначение |
|-------|------------|
| `ваш-домен.ru` | Production (`main`) |
| `www.ваш-домен.ru` | редирект на apex или наоборот |
| `staging.ваш-домен.ru` | постоянный черновик (ветка `develop`) |

Для поддомена staging: добавьте домен → в настройках укажите **Git Branch** = `develop` (на платных планах также доступно окружение **Staging** в **Settings → Environments**).

На **Hobby** без отдельного Staging-окружения удобно:

- либо только случайные `*.vercel.app` для preview;
- либо **второй проект Vercel** с тем же репо, Production Branch = `develop` (отдельный «staging-сайт»).

---

## 6. Защита черновика от посторонних

**Settings** → **Deployment Protection**:

- включите **Password Protection** для Preview, или  
- **Vercel Authentication** (только члены команды) — на платных планах.

Так preview-ссылки не станут публичным «вторым сайтом» для случайных посетителей.

---

## 7. Ежедневный рабочий процесс

### Разработка (не трогаем пользователей)

```bash
git checkout develop
# ... правки ...
git add .
git commit -m "описание"
git push
```

1. Vercel соберёт **Preview**.
2. В **Deployments** откройте последний деплой → **Visit** — проверьте.
3. Пользователи на production-домене **не** обновятся.

### Релиз для пользователей

**Вариант A (через Git, предпочтительно):**

```bash
git checkout main
git pull
git merge develop   # или merge через Pull Request на GitHub
git push origin main
```

→ автоматический **Production** deploy.

**Вариант B (без merge, из Dashboard):**

1. **Deployments** → выберите успешный **Preview**.
2. **⋯** → **Promote to Production**.

Используйте, если preview уже проверен и нужно выкатить именно эту сборку.

---

## 8. Деплой через CLI (без Git push)

```bash
npm i -g vercel
vercel login
```

| Команда | Результат |
|---------|-----------|
| `vercel` | Preview, production **не** меняется |
| `vercel --prod` | Обновляет Production (осторожно) |

Первый `vercel` в папке проекта свяжет каталог с существующим проектом в аккаунте.

---

## 9. Особенности этого репозитория

### `vercel.json`

- Регион: `sfo1`.
- `github.autoAlias: false` — preview-URL могут быть длиннее; на логику prod/preview не влияет.
- API `pages/api/generate-static-font.js`: `maxDuration: 60` секунд — для тяжёлой генерации шрифтов; на Hobby проверьте лимиты плана Vercel.

### Next.js

- Сборка: `next build` (в Vercel определяется автоматически).
- Node: `>=18` (см. `package.json` → `engines`).

### Данные пользователей

Библиотеки шрифтов сейчас в **localStorage** в браузере; отдельного «staging-бэкенда» для данных нет — на preview и prod у каждого URL своё хранилище в браузере.

---

## 10. Чеклист первой настройки

- [ ] Создана ветка `develop`, запушена в origin.
- [ ] В Vercel **Production Branch** = `main`.
- [ ] В **Environment Variables** заданы `NEXTAUTH_SECRET`, OAuth-ключи; для Production — `NEXTAUTH_URL` с боевым доменом.
- [ ] В Google / Яндекс добавлены redirect URI для production (и при необходимости для staging/preview).
- [ ] Включена **Deployment Protection** для Preview (по желанию).
- [ ] Тест: push в `develop` → появился Preview, production не изменился.
- [ ] Тест: merge в `main` → обновился только Production.

---

## 11. Analytics и Speed Insights

В проекте подключены пакеты `@vercel/analytics` и `@vercel/speed-insights` в `pages/_app.jsx`. Данные появятся **только после включения в панели Vercel** и деплоя с этим кодом.

### 11.1. Включить в Dashboard (важен порядок)

1. [vercel.com](https://vercel.com) → ваш проект.
2. **Analytics** → **Enable**.
3. **Speed Insights** → **Enable**.
4. **Обязательно после Enable:** **Deployments** → последний **Production** → **Redeploy**.

Без redeploy **после** включения в панели скрипты `/_vercel/insights/` и Speed Insights на домене **не появятся** — в UI останется чеклист «выполните инструкцию», хотя код в репозитории уже есть.

Отдельные API-ключи в Environment Variables **не нужны**.

### 11.1a. Проверка в браузере (production)

1. Откройте `https://dynamicfont.ru` **без** блокировщика рекламы (uBlock и т.п. режут `/_vercel/…`).
2. DevTools → **Network** → обновите страницу (F5).
3. Должны быть запросы к путям вроде:
   - `/_vercel/insights/script.js`
   - `/_vercel/speed-insights/script.js`
4. Если **404** на эти URL → снова **Enable** в панели + **Redeploy** production.
5. В консоли не должно быть `[Vercel Web Analytics] Failed to load script`.

Первые цифры в графиках — через **15–60 минут** после успешных запросов. До этого чеклист «по инструкции» может не исчезать — это нормально.

### 11.2. Где смотреть метрики

| Вкладка | Что там |
|---------|---------|
| **Analytics** | Посещения, топ страниц, устройства |
| **Speed Insights** | Скорость загрузки по реальным визитам |

На **localhost** события обычно **не отправляются** — проверяйте на `https://dynamicfont.ru` (или preview URL).

### 11.3. Приватность

Упомяните в [политике конфиденциальности](/legal/privacy) использование аналитики и измерение производительности (Vercel, обезличенные технические данные). Подробнее о ПДн — [AUTH_SETUP.md](./AUTH_SETUP.md), §6.

Тарифы и лимиты free tier — на [vercel.com/pricing](https://vercel.com/pricing).

---

## 12. Частые проблемы

| Симптом | Что проверить |
|---------|----------------|
| Каждый push сразу у пользователей | Пушите не в `main`, а в `develop`; или отключите auto-deploy для production (ниже). |
| OAuth не работает на preview | Redirect URI и `NEXTAUTH_URL` для этого URL. |
| Сессия «слетает» на проде | `NEXTAUTH_URL` должен совпадать с доменом в браузере (HTTPS, без лишнего `/`). |
| Preview не создаётся | **Settings → Git** → Preview Deployments; ветка не заблокирована в Ignored Build Step. |
| Долгая сборка / таймаут API | Лимиты Hobby vs Pro; `maxDuration` в `vercel.json`. |

### Отключить автодеплой Production (только ручной релиз)

**Settings** → **Git** → **Ignored Build Step** — команду, которая пропускает сборку для `main`, пока вы не запустите deploy вручную.  
Или в GitHub: защита ветки `main` + деплой только после merge PR.  
Для большинства команд достаточно ветки `develop` без этой настройки.

---

## 13. Краткая шпаргалка

```
develop  --push-->  Preview URL     (тестируете вы)
main     --push-->  Production URL  (видят пользователи)

Релиз = merge develop → main  ИЛИ  Promote to Production
```

Если что-то из OAuth непонятно — начните с [AUTH_SETUP.md](./AUTH_SETUP.md), §5 «Частые ошибки».
