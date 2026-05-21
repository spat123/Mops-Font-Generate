# Деплой на VPS REG.ru (`dynamicfont.ru`)

Пошаговый гайд: **бесплатный/платный VPS REG** → Docker → nginx → HTTPS.  
Vercel после переезда можно отключить (домен укажет на IP VPS).

Файлы в репозитории:

| Файл | Назначение |
|------|------------|
| `Dockerfile` | Next.js standalone + Python fonttools |
| `docker-compose.prod.yml` | Запуск приложения |
| `.env.vps.example` | Шаблон → скопировать в `.env.production` |
| `deploy/nginx/dynamicfont.ru.conf` | nginx → `127.0.0.1:3000` |

---

## Что понадобится заранее

- **IP VPS** из панели REG (публичный IPv4).
- **Ubuntu 22.04** (или 24.04).
- SSH: логин `root` (или пользователь с `sudo`) + пароль или ключ из REG.
- Секреты как на Vercel: `NEXTAUTH_SECRET`, `DATABASE_URL` (Neon), OAuth Google/Яндекс, `RESEND_API_KEY`.
- Домен **dynamicfont.ru** в REG (DNS).

**RAM:** для сборки Docker желательно **≥2 GB** или **swap 2 GB** (на бесплатном 1 GB без swap сборка может упасть — см. §2).

---

## Управление с Windows (без «ввода в консоль сервера»)

Пароль в SSH **не показывается** при наборе — это норма. Удобнее **вообще без пароля**: только SSH-ключ.

### Ключ (один раз)

Публичный ключ с ПК (`C:\Users\Игорь\.ssh\reg_dynamicfont.pub`) → REG → VPS → **SSH-ключи**  
или в веб-консоль REG на сервере в `~/.ssh/authorized_keys`.

Подключение с ПК:

```powershell
ssh -i $env:USERPROFILE\.ssh\reg_dynamicfont root@194.226.166.79
```

### Файл `.env.production` — пишете на ПК в Cursor

В корне проекта: **`.env.production`** (как `.env.local`, только для VPS).  
Заполните в редакторе → одна команда заливает на сервер. В git не попадает.

Осталось вручную дописать: **`DATABASE_URL`** (Vercel) и **`RESEND_API_KEY`** (если пусто).

### Файлы и команды с ПК (без nano на сервере)

| Задача | Команда |
|--------|---------|
| Залить `.env` | `.\scripts\vps-from-pc.ps1 -Action upload-env` |
| Выполнить команду на сервере | `ssh -i $env:USERPROFILE\.ssh\reg_dynamicfont root@194.226.166.79 "команда"` |
| Окно WinSCP (мышкой) | Хост `194.226.166.79`, пользователь `root`, ключ `reg_dynamicfont` |

Скрипт в репозитории:

```powershell
cd C:\Mops-Font-Generate
.\scripts\vps-from-pc.ps1 -Action upload-env
.\scripts\vps-from-pc.ps1 -Action deploy
.\scripts\vps-from-pc.ps1 -Action status
```

Перед `upload-env` добавьте в **локальный** `.env.local` строку `DATABASE_URL=...` из Vercel (Neon).

---

## 0. Панель REG.ru (до SSH)

1. VPS → ваш сервер → **включён**, статус Running.
2. **Сеть / Firewall** — открыть входящие:
   - `22` (SSH)
   - `80` (HTTP, для Let's Encrypt)
   - `443` (HTTPS)
3. Запишите **публичный IP** (например `185.x.x.x`).

Проверка с вашего ПК (PowerShell):

```powershell
ssh root@ВАШ_IP
```

---

## 1. Подготовка сервера (один раз)

Под root или через `sudo`:

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx ufw

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
apt install -y docker-compose-plugin
```

### Swap (если RAM 1 GB — бесплатный тариф)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

---

## 2. Код и секреты

```bash
mkdir -p /opt/dinamic-font
cd /opt/dinamic-font
git clone https://github.com/spat123/Mops-Font-Generate.git .
```

Секреты (скопируйте с Vercel **Production** или из `.env.local`):

```bash
cp .env.vps.example .env.production
nano .env.production
chmod 600 .env.production
```

**Обязательно заполнить:**

```env
NEXTAUTH_URL=https://dynamicfont.ru
NEXTAUTH_SECRET=...   # openssl rand -base64 32
NEXT_PUBLIC_SITE_URL=https://dynamicfont.ru
DATABASE_URL=...      # Neon — тот же URL, что на Vercel
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
YANDEX_CLIENT_ID=...
YANDEX_CLIENT_SECRET=...
RESEND_API_KEY=...
EMAIL_FROM=DINAMIC FONT <noreply@dynamicfont.ru>
```

OAuth в консолях Google / Яндекс — redirect URI **строго**:

- `https://dynamicfont.ru/api/auth/callback/google`
- `https://dynamicfont.ru/api/auth/callback/yandex`

Подробнее: [AUTH_SETUP.md](./AUTH_SETUP.md).

---

## 3. Сборка и запуск Docker

```bash
cd /opt/dinamic-font
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f app
```

Проверка **на сервере** (должен быть `HTTP/1.1 200` или `307`):

```bash
curl -I http://127.0.0.1:3000/
docker compose -f docker-compose.prod.yml ps
```

Если сборка падает с **Killed** / нехватка памяти — включите swap (§1) и повторите `build`.

---

## 4. nginx (сначала HTTP, потом SSL)

```bash
mkdir -p /var/www/certbot
cp /opt/dinamic-font/deploy/nginx/dynamicfont.ru.conf /etc/nginx/sites-available/dynamicfont.ru
ln -sf /etc/nginx/sites-available/dynamicfont.ru /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
```

**Перед первым certbot** временно отключите редирект на HTTPS и блок `listen 443`  
(закомментируйте второй `server { ... ssl ...}` и в первом `location /` поставьте `proxy_pass http://127.0.0.1:3000;` вместо `return 301`).

Или сразу:

```bash
nginx -t && systemctl reload nginx
certbot --nginx -d dynamicfont.ru -d www.dynamicfont.ru
```

Следуйте подсказкам certbot (email, согласие). После успеха:

```bash
nginx -t && systemctl reload nginx
```

Проверка: `curl -I https://dynamicfont.ru/` с сервера.

---

## 5. DNS в REG.ru (переключение с Vercel)

В DNS домена **dynamicfont.ru**:

| Тип | Имя | Значение |
|-----|-----|----------|
| **A** | `@` | **IP вашего VPS** |
| **A** | `www` | **тот же IP** (или CNAME `www` → `@`) |

Удалите или замените старые записи на Vercel (`76.76.21.21`) и **Cloudflare proxy**, если мешают.

Подождите **5–60 минут**, проверьте с телефона **без VPN**: `https://dynamicfont.ru`

Когда сайт стабилен:

- Vercel → **Domains** → удалить/отключить `dynamicfont.ru` (чтобы не путать).

---

## 6. Обновление после `git push`

```bash
cd /opt/dinamic-font
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app --tail 100
```

---

## 7. База данных

| Вариант | Действие |
|---------|----------|
| **Neon** (проще) | Тот же `DATABASE_URL`, что на Vercel. С VPS в РФ обычно быстрее, чем через Vercel US. |
| **Postgres на VPS** | `apt install postgresql`, создать БД, в URL указать `localhost`, при необходимости `DATABASE_DRIVER=postgres` |

Таблицы создаются при первом обращении к API (`ensureUserSchema`).

---

## 8. Частые проблемы

| Симптом | Решение |
|---------|---------|
| `ssh: connect refused` | VPS выключен, неверный IP, firewall REG |
| `docker build` → Killed | Swap 2G (§1), тариф с 2GB RAM |
| **502 Bad Gateway** | `docker compose ps`, `logs app`; приложение слушает `127.0.0.1:3000` |
| Сайт открывается по IP, не по домену | DNS A-запись, подождать propagation |
| OAuth redirect mismatch | URI = `https://dynamicfont.ru/api/auth/callback/...` |
| Код входа не приходит | `RESEND_API_KEY`, SPF/DKIM (см. [EMAIL_REGISTRATION_GUIDE.md](./EMAIL_REGISTRATION_GUIDE.md)) |
| Старый сайт с Vercel | DNS ещё на `76.76.21.21` или кэш; проверить `ping dynamicfont.ru` |

---

## 9. Краткий чеклист «с нуля»

- [ ] IP VPS, порты 22/80/443
- [ ] SSH, Docker, swap (если 1 GB RAM)
- [ ] `git clone`, `.env.production`
- [ ] `docker compose up -d --build`, `curl 127.0.0.1:3000`
- [ ] nginx + `certbot`
- [ ] DNS A → IP VPS
- [ ] Проверка входа и fontsource без VPN
- [ ] Отключить домен на Vercel

OAuth и почта: [AUTH_SETUP.md](./AUTH_SETUP.md).
