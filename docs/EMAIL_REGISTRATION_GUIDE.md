# Гайд: регистрация по email с подтверждением (Resend + Postgres)

Пошаговая настройка обычной регистрации (имя, email, пароль) с письмом «Подтвердите email» для **DINAMIC FONT**.

Связанные документы: [AUTH_SETUP.md](./AUTH_SETUP.md) (OAuth Google/Яндекс), [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) (деплой).

---

## Что получится в итоге

1. Пользователь открывает **`/auth/signup`**, вводит имя, email, пароль.
2. На почту приходит письмо со ссылкой (через **Resend**).
3. После клика по ссылке email считается подтверждённым.
4. Вход на **`/auth/signin`** тем же email и паролем.

До подтверждения войти **нельзя** — появится подсказка «Подтвердите email».

---

## Что нужно заранее

| Сервис | Зачем | Платно? |
|--------|--------|---------|
| [Resend](https://resend.com) | Отправка писем | Free tier (~100 писем/день) |
| [Neon](https://neon.tech) или Vercel Postgres | Хранение пользователей на проде | Free tier |
| NextAuth (уже в проекте) | Сессия после входа | — |

**Локально** можно обойтись без Neon (файл `data/users.json`) и без Resend (ссылка в консоли терминала).

**На Vercel (dynamicfont.ru)** без Postgres регистрация **не работает** — диск только для чтения.

---

## Шаг 1. Resend — отправка писем

### 1.1 Регистрация

1. Откройте [resend.com](https://resend.com) и создайте аккаунт.
2. В меню слева: **API Keys** → **Create API Key**.
3. Скопируйте ключ (начинается с `re_`) — он показывается **один раз**.

### 1.2 Отправитель для тестов (без своего домена)

На бесплатном тарифе можно слать с адреса Resend:

```env
EMAIL_FROM=DINAMIC FONT <onboarding@resend.dev>
```

Письма уйдут только на **ваш** зарегистрированный в Resend email или на тестовые адреса (см. ограничения в кабинете Resend).

### 1.3 Свой домен (продакшен, dynamicfont.ru)

Когда будете готовы к реальным пользователям:

1. Resend → **Domains** → **Add Domain** → `dynamicfont.ru`.
2. Добавьте DNS-записи (SPF, DKIM), которые покажет Resend — в панели REG.ru / Vercel DNS.
3. Дождитесь статуса **Verified**.
4. Укажите, например:

```env
EMAIL_FROM=DINAMIC FONT <noreply@dynamicfont.ru>
```

### 1.4 Логотип в письме и иконка в списке почты (BIMI)

**В теле письма** — полный wordmark из `public/email-logo.png` (экспорт из `public/logo/Logo Dinamic.svg`).

**Для BIMI / аватар в списке почты** — только квадратный `public/bimi-logo.svg` (знак, как `Logo Mark.svg`).

Пересобрать PNG для писем (после смены wordmark):

```bash
npx --yes -p sharp node -e "require('sharp')('public/logo/Logo Dinamic.svg').resize(478,64,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toFile('public/email-logo.png')"
```

Проверка на проде: `https://dynamicfont.ru/email-logo.png`

**В списке писем** (аватар слева в Gmail и др.) `favicon.ico` с сайта **не используется**. Нужен отдельный DNS-набор:

#### A. BIMI (рекомендуется для Gmail)

1. Убедитесь, что домен **Verified** в Resend (SPF/DKIM из шага 1.3).
2. Файл в репозитории: `public/bimi-logo.svg` → на проде доступен по  
   `https://dynamicfont.ru/bimi-logo.svg`
3. В **Vercel** → проект → **Domains** → DNS для `dynamicfont.ru` добавьте:

| Тип | Имя (Host) | Значение |
|-----|------------|----------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:support@dynamicfont.ru` |
| TXT | `default._bimi` | `v=BIMI1; l=https://dynamicfont.ru/bimi-logo.svg` |

   Политику DMARC при необходимости ужесточите до `p=reject` после проверки доставки.

4. Проверка: [bimigroup.org/bimi-generator](https://bimigroup.org) или BIMI Inspector в поиске.
5. В Gmail логотип может появиться **через несколько дней**, не сразу.

#### B. Gravatar (быстрый дополнительный вариант)

1. [gravatar.com](https://gravatar.com) → аккаунт на **тот же email**, что в `EMAIL_FROM` (если ящик доступен).
2. Загрузите квадратный логотип (можно экспорт из `bimi-logo.svg`).
3. Работает не во всех почтовиках (Яндекс.Почта — без гарантии).

#### C. Переменная для корректных ссылок на логотип

На Vercel задайте (если ещё нет):

```env
NEXT_PUBLIC_SITE_URL=https://dynamicfont.ru
```

Иначе в письмах подставится `NEXTAUTH_URL`.

---

## Шаг 2. Neon — база пользователей (для Vercel)

### 2.1 Создать проект

1. [neon.tech](https://neon.tech) → **New Project**.
2. Регион ближе к пользователям (например EU).
3. Скопируйте **Connection string** (формат `postgresql://user:pass@host/db?sslmode=require`).

### 2.2 Переменная окружения

```env
DATABASE_URL=postgresql://....?sslmode=require
```

Таблица `users` создаётся **автоматически** при первой регистрации — SQL вручную запускать не нужно.

### 2.3 Альтернатива: Vercel Postgres

В Vercel: **Storage** → **Create Database** → Postgres → подключить к проекту.  
Vercel сам добавит `POSTGRES_URL` — в коде также читается `DATABASE_URL`; при необходимости продублируйте значение в `DATABASE_URL`.

---

## Шаг 3. Локальная разработка (`.env.local`)

В корне репозитория файл **`.env.local`** (не коммитится в git):

```env
# Сессия (обязательно)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=ваша_случайная_строка_32_символа

# Письма (опционально локально — без ключа ссылка в консоли)
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=DINAMIC FONT <onboarding@resend.dev>

# База (опционально локально — без неё пишется data/users.json)
# DATABASE_URL=postgresql://...
```

Сгенерировать секрет (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Перезапустите dev-сервер после изменения `.env.local`:

```bash
bun dev
```

---

## Шаг 4. Проверка локально

### Вариант A — без Resend (быстрый тест)

1. Не задавайте `RESEND_API_KEY`.
2. Откройте [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup).
3. Зарегистрируйтесь.
4. В **терминале**, где крутится `bun dev`, появится строка вида:

   ```
   [auth/email] RESEND_API_KEY не задан — письмо в консоль (dev):
     To: you@example.com
     http://localhost:3000/api/auth/verify-email?token=...
   ```

5. Скопируйте URL в браузер → должны попасть на вход с сообщением «Email подтверждён».
6. Войдите на `/auth/signin` с тем же email и паролем.

### Вариант B — с Resend

1. Задайте `RESEND_API_KEY` и `EMAIL_FROM`.
2. Регистрация → проверьте **входящие** и **спам**.
3. Страница `/auth/check-email` — кнопка «Отправить письмо снова».

### Где лежат пользователи локально

- Без `DATABASE_URL`: `data/users.json`
- С `DATABASE_URL`: только в Neon (файл не используется)

---

## Шаг 5. Продакшен на Vercel (dynamicfont.ru)

### 5.1 Переменные в Vercel

**Settings** → **Environment Variables** → для **Production** (и при желании Preview):

| Переменная | Пример / примечание |
|------------|---------------------|
| `NEXTAUTH_SECRET` | Случайная строка (не из dev) |
| `NEXTAUTH_URL` | `https://dynamicfont.ru` без `/` в конце |
| `DATABASE_URL` | Connection string из Neon |
| `RESEND_API_KEY` | `re_...` |
| `EMAIL_FROM` | `DINAMIC FONT <onboarding@resend.dev>` или свой домен |

OAuth (Google/Яндекс) — как в [AUTH_SETUP.md](./AUTH_SETUP.md), отдельно.

### 5.2 Redeploy

**Deployments** → последний деплой → **Redeploy** — иначе новые переменные не подхватятся.

### 5.3 Проверка на проде

1. [https://dynamicfont.ru/auth/signup](https://dynamicfont.ru/auth/signup) — регистрация.
2. Письмо на почту (или ошибка 502 — смотрите логи Vercel).
3. Если регистрация отвечает **503** — не задан `DATABASE_URL`.

---

## Шаг 6. Схема потока (для разработчиков)

```
/auth/signup
    → POST /api/auth/register
        → создать user (emailVerified: false)
        → Resend: письмо со ссылкой
    → /auth/check-email

Клик в письме
    → GET /api/auth/verify-email?token=...
        → emailVerified: true
    → /auth/signin?verified=1

/auth/signin
    → NextAuth credentials (только если emailVerified)
```

Ключевые файлы:

| Файл | Роль |
|------|------|
| `pages/auth/signup.jsx` | Форма регистрации |
| `pages/auth/check-email.jsx` | «Проверьте почту» |
| `pages/api/auth/register.js` | Создание аккаунта + отправка письма |
| `pages/api/auth/verify-email.js` | Подтверждение по токену |
| `lib/auth/sendVerificationEmail.js` | Resend |
| `lib/auth/userStore.js` | File или Postgres |

---

## Частые проблемы

### «Не удалось зарегистрироваться» / 502

- Неверный `RESEND_API_KEY`.
- На free Resend письмо только на разрешённые адреса.
- Логи: Vercel → **Logs** или терминал `bun dev`.

### «Регистрация на сервере требует DATABASE_URL» / 503

- На Vercel не задан `DATABASE_URL`.
- Добавьте Neon connection string → Redeploy.

### Письмо не приходит

- Проверьте **спам**.
- Для `onboarding@resend.dev` — ограничения Resend на получателей.
- Локально без ключа — смотрите **консоль сервера**, не почту.

### «Подтвердите email» при входе

- Не перешли по ссылке из письма.
- Ссылка истекла (**24 часа**) → `/auth/check-email` → «Отправить снова» или регистрация заново.

### Ссылка подтверждения ведёт не туда

- `NEXTAUTH_URL` должен совпадать с реальным сайтом (`http://localhost:3000` локально, `https://dynamicfont.ru` на проде).

### OAuth работает, регистрация — нет

- OAuth не требует Postgres для сессии (см. фикс в AUTH_SETUP).
- Регистрация по email **всегда** требует сохранение пользователя → Postgres на Vercel.

---

## Чеклист перед запуском для пользователей

- [ ] `NEXTAUTH_SECRET` и `NEXTAUTH_URL` на Vercel
- [ ] `DATABASE_URL` (Neon) на Vercel
- [ ] `RESEND_API_KEY` на Vercel
- [ ] `EMAIL_FROM` — тестовый или свой домен с Verified в Resend
- [ ] `NEXT_PUBLIC_SITE_URL=https://dynamicfont.ru` (логотип в письмах)
- [ ] Опционально: DNS `_dmarc` + `default._bimi` для аватара в Gmail (§1.4)
- [ ] Redeploy после всех переменных
- [ ] Тест: signup → письмо → verify → signin на dynamicfont.ru

---

## Стоимость

- **Resend free** — обычно хватает на старт (подтверждения регистрации).
- **Neon free** — хватает на тысячи пользователей на старте.
- Платить начнёте при росте объёма писем или БД — см. тарифы на сайтах сервисов.
