# Гайд: свои шрифты на сервере (myskotom → WOFF2 + ZIP)

Пошаговый процесс, как из [Шрифтотеки](https://myskotom.ru) (и похожих источников) завести шрифты в **DINAMIC FONT**: превью на сайте, открытие в редакторе и скачивание пакета для дизайнеров.

Связанные файлы в репозитории:

| Файл | Назначение |
|------|------------|
| `data/myskotom-gap.json` | Список ~1556 шрифтов, которых **нет** в Google / Fontsource / Fontshare / Fontfabric trial |
| `data/myskotom-gap-report.json` | Сводка сопоставления |
| `npm run myskotom:gap` | Пересобрать gap-список |

---

## Зачем это нужно

Каталог myskotom — **кураторская витрина**: карточка на сайте → часто **Google Drive** → архив OTF/TTF. Публичного API «отдай все файлы» нет.

В приложении уже работают:

- **Google / Fontsource** — WOFF2 для превью, без вашего диска;
- **Fontshare** — ZIP с API;
- **Fontfabric trial** — только trial-страница, без полного пакета.

Для шрифтов из gap нужен **свой источник** (`hosted` / `curated`): файлы лежат у вас, вы отвечаете за лицензию и объём диска.

---

## Цепочка в двух слоях

```text
  [myskotom / Drive / Fontesk]
            │
            ▼
     скачать архив (ZIP / папка)
            │
     ┌──────┴──────┐
     ▼             ▼
  WOFF2          ZIP для скачивания
  (веб)          (OTF/TTF + LICENSE)
     │             │
     ▼             ▼
  CDN / VPS     тот же хост
     │             │
     └──────┬──────┘
            ▼
   карточка в каталоге DINAMIC FONT
   · превью / редактор → WOFF2
   · кнопка «Скачать» → ZIP
```

| Слой | Формат | Для чего |
|------|--------|----------|
| **Веб** | WOFF2 (иногда variable `.woff2`) | `@font-face`, превью в каталоге, глифы, сравнение |
| **Скачивание** | ZIP с OTF/TTF (+ `LICENSE` / `OFL.txt`) | Пользователь ставит шрифт в Figma / ОС |

**Не отдавайте только WOFF2 на скачивание** — дизайнерам нужны десктопные форматы. Исходный архив с Drive можно класть как есть, если внутри уже есть лицензия.

---

## Отдельный сервер — имеет смысл

| Где | Что держать |
|-----|-------------|
| **Timeweb** (основной) | Next.js, API, БД, `.cache` каталогов |
| **Отдельный VPS / объектное хранилище** | Статика: `*.woff2`, `*.zip` |

Плюсы: не съедаете 6 ГБ основного тарифа, проще nginx с `Cache-Control`, можно позже CDN.

Пример домена: `https://fonts.dynamicfont.ru` или поддомен на Timeweb только под статику.

---

## Структура папок на файловом сервере

Рекомендуемый шаблон (одно семейство = один `slug`):

```text
/fonts/
  akrobat/
    meta.json              # опционально: title, license, sourceUrl
    web/
      akrobat-regular.woff2
      akrobat-bold.woff2
      akrobat-italic.woff2
    download/
      akrobat-package.zip  # OTF/TTF + LICENSE (оригинал или собранный)
```

Правила именования:

- `slug` — как в `myskotom-gap.json` (`akrobat-8-nachertanii` → лучше упростить до `akrobat`);
- файлы web: `{slug}-{weight}-{style}.woff2` или `{Family}-Regular.woff2`;
- в `meta.json`: `title`, `license`, `myskotomUrl`, `authorUrl`, `addedAt`.

---

## Ручной workflow (один шрифт)

### 1. Взять из очереди

Откройте `data/myskotom-gap.json` → выберите семейство → откройте `url` на myskotom.

### 2. Скачать

- Кнопка на карточке → **Google Drive** (или сайт автора).
- Сохраните ZIP/папку локально, например `inbox/akrobat/`.

### 3. Проверить лицензию

Перед публикацией у вас:

- [ ] free for commercial use / OFL / аналог в архиве;
- [ ] файл лицензии попадёт в ZIP для пользователей;
- [ ] при сомнении — **не заливать** (myskotom тоже перепроверяет вручную).

### 4. Сделать WOFF2

Инструменты (любой один):

- [fonttools](https://github.com/fonttools/fonttools): `pyftsubset` / `woff2_compress`;
- [google/woff2](https://github.com/google/woff2);
- онлайн-конвертеры — только если доверяете приватности файла.

Минимум для каталога: **Regular** + по возможности **Bold**, **Italic**. Variable — один `.woff2`, если в архиве VF.

### 5. Собрать ZIP для скачивания

Вариант **A** — отдать **оригинальный** архив с Drive (быстрее).

Вариант **B** — свой ZIP:

```text
akrobat-package.zip
  Akrobat-Regular.otf
  Akrobat-Bold.otf
  LICENSE.txt
  README.txt          # откуда взято, ссылка на автора
```

### 6. Залить на сервер

```bash
rsync -avz ./out/akrobat/ user@fonts-server:/var/www/fonts/akrobat/
```

Проверка: URL открывается в браузере, для woff2 — `Content-Type: font/woff2`.

### 7. Запись в каталоге (будущая интеграция)

Пока в коде нет источника `hosted` — ведите черновик, например `data/hosted-fonts-manifest.json`:

```json
{
  "slug": "akrobat",
  "family": "Akrobat",
  "category": "sans-serif",
  "subsets": ["cyrillic", "latin"],
  "previewBaseUrl": "https://fonts.example.ru/fonts/akrobat/web",
  "styles": [
    { "weight": 400, "style": "normal", "file": "akrobat-regular.woff2" }
  ],
  "downloadZipUrl": "https://fonts.example.ru/fonts/akrobat/download/akrobat-package.zip",
  "license": "OFL-1.1",
  "sourcePageUrl": "https://myskotom.ru/tproduct/...",
  "authorPageUrl": "https://..."
}
```

Когда появится API `pages/api/hosted-catalog.ts` — manifest станет источником правды.

---

## Оценка места на диске

| На 1 семейство | Примерно |
|----------------|----------|
| WOFF2 (4–8 файлов) | 0.3–2 МБ |
| ZIP (OTF/TTF) | 2–15 МБ |
| **Итого** | ~3–17 МБ |

| Объём сервера | Ориентир семейств (web + zip) |
|---------------|-------------------------------|
| 6 ГБ | ~200–400 (с запасом) |
| 20 ГБ | ~800–1500 |
| 50 ГБ | весь gap теоретически возможен, но руками нереален целиком |

Стартуйте с **whitelist 30–100** популярных из gap, не с полных 1556.

---

## Пересборка gap-списка

Когда обновили каталоги Fontsource / добавили hosted-шрифты:

```bash
npm run myskotom:gap
```

Скрипт: `scripts/build-myskotom-gap-list.ts`  
Логика сопоставления: `utils/catalogFamilyMatchKey.ts`, `utils/catalogFamilyIndex.ts`.

После появления hosted-семейств имеет смысл **дописать скрипт**, чтобы вычитать их из gap (сейчас учитываются только google / fontsource / fontshare / fontfabric-trial).

---

## Nginx (минимум для статики)

```nginx
location /fonts/ {
  alias /var/www/fonts/;
  add_header Access-Control-Allow-Origin *;
  add_header Cache-Control "public, max-age=31536000, immutable";
  types {
    font/woff2 woff2;
    application/zip zip;
  }
}
```

CORS нужен, если домен приложения (`dynamicfont.ru`) ≠ домен шрифтов (`fonts.dynamicfont.ru`).

---

## Юридически (кратко)

- **Myskotom** — витрина; право на использование даёт **автор** и текст лицензии в архиве.
- Массовый парсинг Drive / выдача чужих файлов без права — риск; whitelist + лицензия в ZIP — нормальная модель.
- В UI карточки: «Источник», «Лицензия», ссылка на автора (как у Fontshare/OFL).

---

## Дорожная карта в продукте (не сделано)

1. `data/hosted-fonts-manifest.json` + ручное пополнение.
2. `GET /api/hosted-catalog` — отдаёт manifest.
3. Источник `hosted` в `unifiedCatalogMerge` (`canOpenInEditor`, `canDownloadHere`).
4. Превью: `@font-face` с `previewBaseUrl` (по аналогии с Fontsource).
5. Скачивание: прямая ссылка на `downloadZipUrl` или прокси с логированием.
6. Скрипт `npm run myskotom:gap` — исключать slug из manifest.

---

## Чеклист перед публикацией семейства

- [ ] Лицензия проверена, файл в ZIP
- [ ] WOFF2 проверены в браузере (кириллица, веса)
- [ ] ZIP скачивается и открывается в ОС
- [ ] Запись в manifest / будущий каталог
- [ ] CORS и HTTPS на URL файлов
- [ ] При желании — убрать slug из локальной копии gap или пометить `hosted: true`

---

## Полезные ссылки

- [Шрифтотека (myskotom)](https://myskotom.ru) — FAQ про критерии (кириллица, commercial, не Google)
- [Fontesk — кириллица, commercial](https://fontesk.com/tag/cyrillic/?license=free-for-commercial-use) — частый первичный источник у myskotom
- Деплой основного приложения: [DEPLOY_TIMEWEB.md](./DEPLOY_TIMEWEB.md), [DEPLOY_REG_RU_VPS.md](./DEPLOY_REG_RU_VPS.md)
