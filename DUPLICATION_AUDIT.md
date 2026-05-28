# Аудит дублирования кода

## Статус

- Дата старта: 2026-04-24
- **Обновление: 2026-05-27** — unified-каталог, cleanup пакет 1–5 (см. ниже)
- Цель: искать дублирование между файлами, мусорный код и функции с разными именами, но одинаковой логикой
- Формат: идем частями по смысловым группам и фиксируем, что уже проверено

## Обновление 2026-05-27 (выполнено)

### Unified-каталог

- Удалены per-source панели: `components/catalog/GoogleFontsCatalogPanel.jsx`, `FontsourceCatalogPanel.jsx`, `GoogleFontsCatalogCard.jsx`, `FontsourceCatalogCard.jsx`
- Единая точка UI: `UnifiedCatalogPanel`, `UnifiedCatalogCard`, `CatalogSourceCard`
- Битых импортов удалённых файлов нет

### Cleanup (пакеты 1–5)

- [x] Удалён неиспользуемый `pages/api/fontsource/[fontFamily]/metadata.js`
- [x] `nodeBufferToBase64` / `base64ToUint8Array` в `utils/base64Utils.js` (API Fontsource + preview cache)
- [x] `utils/createSlugFamilyCatalogCache.js` — fontshare и fontfabric trial cache
- [x] `getCatalogUnionStats` / `formatCatalogUnionAvailabilityShort` удалены; везде `getUnifiedCatalogStats` + `formatUnifiedCatalogAvailabilityShort`
- [x] Удалены неиспользуемые `@deprecated` exports: `googleFontFamilyTags`, `catalogPreviewSample`, `webAlchemyFonttoolsServer`, `previewExportArtifacts`, `fontfabricStyleCount`

### Cleanup (пакеты 6–8, 2026-05-27)

- [x] `utils/createCatalogProxyHandler.js` — `fontshare-catalog.js`, `fontfabric-trial-catalog.js`
- [x] `utils/createPreviewFamilyLoader.js` — fontshare/fontsource preview runtime cache
- [x] `utils/buildEditorExportCssCode.js` — вынесено из `pages/index.jsx` (~65 строк)

### Cleanup (пакет 9, 2026-05-27)

- [x] `hooks/useSavedLibraryActions.js` — CRUD, drag на вкладки, move между библиотеками
- [x] `hooks/useSavedLibraryDerivedState.js` — lookup, фильтры, catalog search, meta карточек
- [x] `hooks/useSavedLibraryToolbarLayout.js` — breakpoints тулбара
- [x] `utils/savedLibraryCatalogLookup.js`, `savedLibraryCatalogFontMeta.js`, `filterSavedLibraryFonts.js`, `searchSavedLibraryCatalog.js`, `savedLibraryFontEntryMatch.js`
- [x] `utils/selectionToolbarActionsState.js` — единая нормализация selection actions

### Cleanup (пакет 10, 2026-05-27)

- [x] `hooks/useCatalogOpenInEditor.js` + `hooks/useEditorFontNav.js` — открытие из каталога
- [x] `hooks/useOpenLibraryFontEntry.js` — открытие из сохранённой библиотеки
- [x] `hooks/useSavedLibraryCardItems.jsx` — `activeSavedLibraryItems` / `activeSavedLibraryCatalogItems`
- [x] `components/library/SavedLibraryCatalogAddCorner.jsx` — кнопка «добавить в библиотеку»

### Cleanup (пакет 11, 2026-05-27)

- [x] `hooks/useSavedLibrarySelection.js` — multi-select, share, download, move
- [x] `utils/savedLibraryFontMove.js` — общая логика переноса между библиотеками
- [x] Убран дублирующий state `savedLibrarySelectionCount` → `selectedSavedLibraryFontIds.size`

### Cleanup (пакет 12, 2026-05-27)

- [x] `utils/libraryFontSessionLookup.js` — build keys, session lookup, resolve, isStored
- [x] `hooks/useLibraryFontSessionLookup.js`

### Cleanup (пакет 13, 2026-05-27)

- [x] `utils/sessionFontCardPreview.js` — `getSessionFontCardPreviewStyle` (Google + session card)
- [x] `utils/editorTabNavigation.js` — `resolveEditorTabAfterFontClose`
- [x] `hooks/useEditorFontTabActions.js` — `pickFont`, `closeFontTab`, `removeFontFromSession`
- [x] `components/editor/EditorTabBarEndActions.jsx` — правая часть таббара (каталог / библиотека / empty / редактор)
- [x] `hooks/useLibraryStatusBar.js` — статус-бар «Все шрифты»
- [x] `useSavedLibraryCardItems` — превью-стиль без пропа из `index.jsx`
- `pages/index.jsx` ~1654 строк (−~160 от пакета 12)

### Cleanup (пакет 14, 2026-05-27)

- [x] `hooks/useLibraryAuth.js` — auth, лимиты, needsLink, Plans
- [x] `hooks/useSavedLibrarySearchQuery.js` + `hooks/useSavedLibrarySearchControls.jsx`
- [x] `hooks/useEditorCatalogDeepLink.js` — openGoogle / openFontsource из query
- [x] `hooks/useEditorExportActions.js` — export / generate / waterfall meta
- [x] `hooks/useEditorTabBarModel.js` — sidebar font, placeholders, tab bar fonts
- [x] `hooks/useEmptyPreviewSlots.js` — empty slots + preview cleanup
- [x] `constants/editorSampleTexts.js`
- `pages/index.jsx` ~1210 строк (−~440 от пакета 13)

### Cleanup (пакет 15, 2026-05-27)

- [x] `hooks/useEditorFileUpload.js`
- [x] `hooks/useEditorPreviewOrchestrator.js` + `utils/fontsourcePrewarmFlag.js`
- [x] `hooks/useEditorShellEffects.js` — валидация вкладок, selection reset, plain preview
- [x] `hooks/useEditorWaterfallLiveSize.js`
- [x] `hooks/useShareRouteRedirect.js`
- [x] `hooks/useSavedLibraryFilters.js` — вкладки, scope, фильтры библиотеки
- [x] Удалены неиспользуемые импорты в `index.jsx`
- `pages/index.jsx` ~992 строк (−~220 от пакета 14)

### Cleanup (пакет 16, 2026-05-27)

- [x] `components/editor/EditorHomeLayout.jsx` — head, модалки, сайдбар, таббар, FontPreview, библиотека
- `pages/index.jsx` ~880 строк (логика + prop wiring; JSX в layout)

### Следующие кандидаты

- `useFontCss.exportToCSS` vs `buildEditorExportCssCode` — разные сценарии (класс vs полный export modal)
- `hooks/useEditorHomePage.js` — собрать все хуки страницы в один orchestrator (опционально)
- Миграция JS → TS (см. ниже) — отдельный эпик, не смешивать с рефакторингом

### Cleanup (пакет 19, 2026-05-27) — Google CSS pipeline

- [x] `fetchGoogleCssFaces` в `googleFontsCssShared.ts`; `fetchWoff2BufferFromGoogleCss` строится поверх него
- [x] `buildGoogleFontsCss2UrlForFaces` / `ForWoff2Download` / `buildGoogleStaticFallbackCssUrl` в `googleApiRouteHelpers.ts`
- [x] `fetchGoogleFontCssFacesForFamily` — единый pipeline для `google-font-faces`
- [x] `google-font.ts`, `google-font-faces.ts` — тонкие handlers

### Cleanup (пакет 23, 2026-05-27) — preset / axes recovery

- [x] `applyFontViewStateRestorePlan` — единое применение плана (`safeSelectFont` + persistence boot)
- [x] `resolveDefaultStaticPresetName`, `resolveRestorablePresetName`, `getFontAvailableStyles` → `fontUtilsCommon`
- [x] `resolveSelectedPresetDisplayName` — UI-имя пресета (из `useFontManager` useMemo)
- [x] `buildVariableSettingsForPresetApply` — VF-оси при `applyPresetStyle`
- [x] Удалён дубль `resolveResetPresetName` ≡ `resolveDefaultStaticPresetName`

### Cleanup (пакет 22, 2026-05-27) — export / font-variation

- [x] `mimeTypeForFontExt` — единый MIME для `ExportModal`, `GenerateFontModal`, `useFontExport`
- [x] `utils/editorTypography.ts` — `letterSpacingPercentToEm` (ExportModal + buildEditorExportCssCode)
- [x] `utils/staticFontExportUtils.ts` — `buildVariableSettingsFilenameSuffix` из `useFontExport`
- [x] `buildEditorExportCssCode` — общий typography block, пресеты wght через `formatFontVariationSettings`
- [x] `fontVariationSettings` — `parseFontVariationSettingsString`, `stringifyFontVariationEntries`, `upsertFontVariationEntry` (из WaterfallMode)
- Ложная тревога: `useFontCss.exportToCSS` (класс) vs `buildEditorExportCssCode` (полный modal) — разные сценарии

### Cleanup (пакет 21, 2026-05-27) — download utils

- [x] `utils/catalogCacheLookup.ts` — lookup Google/Fontsource в session/IDB кэше каталога
- [x] `utils/fontsourceDownloadClient.ts` — API URL, fetch payload, blob из base64
- [x] `utils/catalogStyleDownload.ts` — `downloadCatalogStylesAsFormat` (Google + Fontsource styles zip)
- [x] `fileDownloadUtils.uniqueDownloadFileName`, `fontFormatConvertClient.ensureFontBlobFormat` / `blobFromBase64FontData`
- [x] `savedLibraryFontDownload` → `buildCatalogDownloadButtonProps` (убран дубль menuItems google/fontsource)
- [x] `libraryArchiveDownload` → `catalogCacheLookup`
- Кандидат: общий orchestrator single-file download (google vs fontsource current/zip) — пока разный transport

### Cleanup (пакет 20, 2026-05-27) — cache / catalog utils (старт)

- [x] `utils/catalogPopularityScore.ts` ← inline `pickPopularityScore` в `fontsource-catalog.ts`
- [x] `utils/fetchJsonWithTimeout.ts` ← AbortController-блок в `fontsource-catalog.ts`
- Уже унифицировано ранее: `createSlugFamilyCatalogCache` (Fontshare + Fontfabric), `createPreviewFamilyLoader` (Fontshare + Fontsource preview)
- Ложная тревога: `fontsource-catalog` **не** на `createCatalogProxyHandler` — нужны disk fallback + package.json fallback
- Кандидат пакет 21: `createJsonDiskCatalogCache` для disk read/write в `fontsource-catalog`; IDB-слой Google как у Fontsource (опционально)

### Cleanup (пакет 18, 2026-05-27) — Google API

- [x] `utils/googleApiRouteHelpers.ts` — `apiQueryString`, `parseGoogleFontStyleQuery`, lookup семейства, `resolveGoogleVariableCssContext`
- [x] `utils/googleFontsCatalogSlim.ts` — `buildGoogleCatalogItems` (бывший inline `slimEntry` в catalog route)
- [x] `fetchWoff2BufferFromGoogleCss` → `utils/googleFontsCssShared.ts` (был дубль только в `google-font.ts`)
- [x] `google-fonts-catalog.ts` использует `getGoogleFontsMetadataFamilyList()` — **один** серверный кэш metadata вместо второго fetch
- [x] `google-font.ts`, `google-font-faces.ts`, `google-font-family-axes.ts`, `google-font-github-vf.ts` — общие хелперы
- Ложная тревога: `google-font-proxy.ts` остаётся отдельным (прямой URL gstatic, не CSS2 pipeline)
- ~~Кандидат на пакет 19~~ → сделано

### Cleanup (пакет 17, 2026-05-27)

- [x] `hooks/useEditorHomePage.ts` — orchestrator всей логики страницы
- [x] `hooks/buildEditorHomeLayoutProps.tsx` — сборка пропсов layout
- [x] `types/editorHome.ts`, `types/next-auth.d.ts`
- [x] `pages/index.jsx` ~45 строк (только shell + `getServerSideProps`)

### Миграция JavaScript → TypeScript (старт, 2026-05-27)

- [x] `tsconfig.json` (`allowJs: true`, `strict: false`)
- [x] `typescript`, `@types/react`, `@types/node` (bun)
- [x] Пилот TS: `utils/fontsourcePrewarmFlag.ts`, `hooks/useShareRouteRedirect.ts`, `constants/editorSampleTexts.ts`
- [x] `hooks/useEditorHomePage.ts`, `hooks/buildEditorHomeLayoutProps.tsx`

**Дальше по TS (пакеты 18+):**

1. Перевести в `.ts` хуки редактора из пакетов 13–15 (`useLibraryAuth`, `useEditorExportActions`, …)
2. `components/editor/*.tsx`
3. `utils/catalog*` и кэши
4. `strict: true` — в самом конце

## Метод

- Сначала выделяю смысловую группу файлов
- Потом отмечаю: явный дубль, частичный дубль, ложная тревога, мусор/кандидат на удаление
- Для каждого пункта коротко пишу, что именно совпадает и куда просится вынос

## Проверено

### Пакет 1. Каталоги и API Fontsource

- [x] `components/GoogleFontsCatalogPanel.jsx`
- [x] `components/FontsourceCatalogPanel.jsx`
- [x] `components/ui/CatalogFontCard.jsx`
- [x] `components/ui/FontsourceCatalogCard.jsx`
- [x] `pages/api/fontsource/[fontFamily].js`
- [x] `pages/api/fontsource/[fontFamily]/variable.js`
- [x] `pages/api/fontsource/[fontFamily]/metadata.js`

### Пакет 2. Меню и action-dropdown

- [x] `components/ui/CardActionsMenu.jsx`
- [x] `components/ui/CatalogAddTargetMenu.jsx`
- [x] `components/ui/FontLibraryStatusMenu.jsx`

### Пакет 3. Google API

- [x] `pages/api/google-fonts-catalog.js`
- [x] `pages/api/google-font.js`
- [x] `pages/api/google-font-proxy.js`
- [x] `pages/api/google-font-faces.js`
- [x] `pages/api/google-font-family-axes.js`
- [x] `pages/api/google-font-github-vf.js`
- [x] `utils/googleFontsMetadataServer.js`

### Пакет 4. Hooks и VF state

- [x] `hooks/useFontLoader.js`
- [x] `hooks/useFontManager.js`
- [x] `hooks/useFontStyleManager.js`
- [x] `hooks/useVariableFontControls.js`
- [x] `hooks/useFontCss.js`
- [x] `hooks/useFontPersistence.js`
- [x] `utils/cssGenerator.js`
- [x] `utils/fontUtilsCommon.js`
- [x] `utils/fontVariationSettings.js`
- [x] `utils/googleFontCatalogAxes.js`
- [x] `utils/staticFontGenerator.js`
- [x] `pages/index.jsx` (точечно: CSS export block)

### Пакет 5. Экспорт и скачивание

- [x] `hooks/useFontExport.js`
- [x] `components/ExportModal.jsx`
- [x] `components/CSSModal.jsx`
- [x] `utils/fileDownloadUtils.js`
- [x] `utils/fontFormatConvertClient.js`
- [x] `utils/savedLibraryFontDownload.js`

## Находки

### 1. Сильное дублирование каркаса каталожных панелей — **ЗАКРЫТО (Unified)**

- Было: `components/GoogleFontsCatalogPanel.jsx`, `components/FontsourceCatalogPanel.jsx`
- Сейчас: `components/catalog/UnifiedCatalogPanel.jsx`
- Тип: частичный дубль архитектуры
- Совпадает:
  - инициализация layout через `useCatalogToolbarLayout`
  - selection через `useLongPressMultiSelect`
  - sticky recent add через `useStickyTimedSet`
  - подключение `useCatalogEngine`
  - row/grid режимы
  - общий сценарий `open -> download -> add to library -> multi-select download`
- Разница в основном в источнике данных и в способе загрузки preview/download
- Вывод: просится общий composable-хук или фабрика вида `useRemoteCatalogPanel` плюс отдельные source adapters

### 2. Google panel содержит inline-логику карточки, уже вынесенную для Fontsource

- Файлы: `components/GoogleFontsCatalogPanel.jsx`, `components/ui/FontsourceCatalogCard.jsx`
- Тип: почти прямой дубль UI-логики
- Совпадает:
  - `selectionOverlay`
  - `hoverOverlay` с одинаковым набором download actions
  - `CatalogLibraryActions`
  - переключение между `CatalogRowModeCard` и `CatalogFontCard`
  - footer с category/vf/italic/styleCount/subsetCount
- Отличие: у Fontsource есть отдельный компонент карточки, у Google почти тот же JSX встроен прямо в панель
- Вывод: хороший кандидат на общий `CatalogSourceCard` или хотя бы на отдельный `GoogleCatalogCard`

### 3. Дублирование сценариев скачивания пакетов и форматов

- Файлы: `components/GoogleFontsCatalogPanel.jsx`, `components/FontsourceCatalogPanel.jsx`
- Тип: дубль бизнес-логики с разными transport-функциями
- Совпадает:
  - `download*AsFormat`
  - `download*PackageZip`
  - `downloadSelected*`
  - `downloadSelected*AsFormat`
  - одинаковые toast-сценарии, упаковка в zip, дедуп имен файлов, одиночная и массовая загрузка
- Отличие: Google берет slices/blob, Fontsource берет base64 из API
- Вывод: просится общий downloader-оркестратор с source-specific callbacks: `getPrimaryFile`, `getPackageFiles`, `getVariableSource`

### 4. Повтор base64/blob/mime-конверсий вокруг Fontsource

- Файлы: `components/FontsourceCatalogPanel.jsx`, `pages/api/fontsource/[fontFamily].js`, `pages/api/fontsource/[fontFamily]/variable.js`
- Тип: инфраструктурный дубль
- Совпадает:
  - `bufferToBase64`
  - восстановление из base64
  - определение extension/mime type
  - сборка fallback file name
- Вывод: часть серверной логики можно централизовать в `utils/fontsource...`, а клиентскую декодировку/Blob-сборку вынести в отдельный helper

### 5. Дублирование поиска локального/удаленного файла Fontsource

- Файлы: `pages/api/fontsource/[fontFamily].js`, `pages/api/fontsource/[fontFamily]/variable.js`
- Тип: дубль алгоритма с разными наборами candidate filenames
- Совпадает:
  - `slugifyFontKey`
  - `findFontsourcePackagePath`
  - fallback local -> remote CDN
  - перебор candidate filenames
  - чтение `files` директории и выбор первого подходящего файла
- Отличие: static endpoint ищет обычные `weight/style`, variable endpoint ищет VF-паттерны
- Вывод: просится общий resolver `resolveFontsourceFile({ slug, subset, style, weight, variable })`

### 6. `metadata.js` частично пересекается с `[fontFamily].js`

- Файлы: `pages/api/fontsource/[fontFamily]/metadata.js`, `pages/api/fontsource/[fontFamily].js`
- Тип: возможный лишний endpoint / частичный дубль
- Совпадает:
  - в обоих читается `metadata.json` локального пакета
  - оба валидируют `fontFamily` и ищут пакет через `findFontsourcePackagePath`
- Отличие:
  - `[fontFamily].js` умеет `?meta=true`, remote fallback и сразу отдает данные шрифта
  - `metadata.js` проще, но логически пересекается с тем же use case
- Проверка использования: по коду найден вызов только `?meta=true` у `[fontFamily].js`
- Статус (2026-05-27): endpoint **удалён** — клиентских вызовов не было; metadata читается в `[fontFamily].js`

### 7. Повторяющийся dropdown-state и outside-click logic в меню

- Файлы: `components/ui/CardActionsMenu.jsx`, `components/ui/CatalogAddTargetMenu.jsx`, `components/ui/FontLibraryStatusMenu.jsx`
- Тип: инфраструктурный дубль UI-поведения
- Совпадает:
  - `open` state
  - `rootRef`
  - `useEffect` с закрытием по outside click
  - `Escape` для закрытия
  - позиционированный popover `absolute ... role="menu"`
- Отличия в основном только в контенте меню и кнопке-триггере
- Вывод: просится общий `useDropdownMenu` или базовый `PopupMenu`/`FloatingMenu` примитив

### 8. Явный мусорный тернарник в `CardActionsMenu`

- Файл: `components/ui/CardActionsMenu.jsx`
- Тип: мусорный код
- Деталь:
  - ветка `item.tone === 'danger' ? ... : ...` возвращает одинаковую строку классов в обеих ветках
- Статус: исправлено
- Вывод: это уже не дублирование по смыслу, а чистая мертвая развилка; можно безопасно упростить

### 9. Повтор family lookup и metadata bootstrap в Google API

- Файлы: `pages/api/google-font.js`, `pages/api/google-font-faces.js`, `pages/api/google-font-family-axes.js`, `pages/api/google-font-github-vf.js`
- Тип: повторяющийся серверный шаблон
- Совпадает:
  - чтение `family` из query
  - вызов `getGoogleFontsMetadataFamilyList()`
  - `list.find((x) => x && x.family === family)`
  - одинаковые ветки `404 Family not found`
- Отличие только в том, что дальше один маршрут берет axes, другой URL, третий бинарник
- Вывод: просится helper вроде `getGoogleMetadataEntryOr404(req, res)` или `findGoogleFamilyEntry(family)`

### 10. `google-font.js` и `google-font-faces.js` повторяют variable CSS pipeline

- Файлы: `pages/api/google-font.js`, `pages/api/google-font-faces.js`
- Тип: дубль алгоритма
- Совпадает:
  - разбор `variable`, `italic`, `wghtMin`, `wghtMax`
  - при variable: получение metadata entry, `slimGoogleMetadataAxes`, `resolveGoogleMetadataItalicMode`
  - сборка CSS2 URL через `buildGoogleFontsCss2Url`
  - запрос CSS с `CHROME_UA`
- Отличие в финальном результате: один отдает первый бинарный woff2, второй список `faces`
- Вывод: можно вынести общий этап в `resolveGoogleCssFacesRequest()` / `buildGoogleCssRequestContext()`

### 11. `google-font.js` и `google-font-proxy.js` дублируют загрузку бинарника

- Файлы: `pages/api/google-font.js`, `pages/api/google-font-proxy.js`
- Тип: частичный дубль
- Совпадает:
  - `fetch(..., { headers: { 'User-Agent': CHROME_UA } })`
  - проверка `response.ok`
  - `Buffer.from(await response.arrayBuffer())`
  - защита от пустого буфера
  - `Content-Type: font/woff2` и близкий `Cache-Control`
- Вывод: можно иметь общий `fetchGoogleBinaryFont(url)` и не держать два почти одинаковых обработчика ошибок

### 12. `google-fonts-catalog.js` обходит уже существующий metadata helper

- Файлы: `pages/api/google-fonts-catalog.js`, `utils/googleFontsMetadataServer.js`
- Тип: архитектурный дубль / обход общей точки
- Совпадает:
  - тот же `SOURCE`
  - тот же `User-Agent`
  - тот же `fetch -> text -> JSON.parse`
- Отличие:
  - `google-fonts-catalog.js` потом делает `slimEntry` и сортировку
  - `googleFontsMetadataServer.js` только кэширует и возвращает raw list
- Вывод: fetch metadata уже централизован, но один маршрут это игнорирует; хороший кандидат на унификацию через shared source loader

### 13. Дублирование восстановления выбранного шрифта и его настроек

- Файлы: `hooks/useFontManager.js`, `hooks/useFontPersistence.js`
- Тип: дубль decision-tree
- Совпадает:
  - приоритет `lastUsedVariableSettings`
  - fallback на кэш/LS
  - fallback на `lastUsedPresetName`
  - fallback на `applyPresetStyle('Regular', ...)`
- Отличие:
  - `useFontManager` делает это в `safeSelectFont`
  - `useFontPersistence` делает почти тот же сценарий при initial restore
- Риск:
  - правила легко разъедутся
  - разные ветки уже чуть отличаются по приоритетам LS/DB
- Статус:
  - создан общий planner `utils/fontViewStateRestore.js`
  - `useFontManager` и `useFontPersistence` переведены на него
  - различия сценариев теперь описываются опциями: `Fontsource cache`, `LS axes`, `LS preset`, `staticPresetPriority`
- Вывод: единый helper уже вынесен; decision-tree больше не поддерживается в двух копиях

### 14. Размазанная логика `lastUsedPresetName` / `lastUsedVariableSettings`

- Файлы: `hooks/useFontManager.js`, `hooks/useVariableFontControls.js`, `hooks/useFontStyleManager.js`, `hooks/useFontPersistence.js`
- Тип: дублирование записи и синхронизации состояния
- Совпадает:
  - сброс `lastUsedPresetName` при изменении осей
  - сброс `lastUsedVariableSettings` при статическом пресете
  - запись тех же полей и в `fonts`, и в IndexedDB, и в localStorage
- Отличие только в месте вызова
- Статус:
  - создан `utils/fontViewStateWriter.js`
  - `useVariableFontControls`, `useFontStyleManager` и `useFontManager` переведены на общие patch-builder'ы
  - reset/switch/preset/axes сценарии теперь используют общий слой записи view-state
- Вывод: базовый writer уже вынесен; остатки дублирования в этой зоне заметно сжаты

### 15. Много независимых сборок строки `font-variation-settings`

- Файлы: `hooks/useFontCss.js`, `hooks/useVariableFontControls.js`, `utils/googleFontCatalogAxes.js`, `utils/staticFontGenerator.js`, `pages/index.jsx`, `utils/cssGenerator.js`, `utils/localFontProcessor.js`
- Тип: дубль низкоуровневой логики
- Совпадает:
  - `Object.entries(...).map(([tag, value]) => "\"tag\" value").join(', ')`
  - либо очень близкая версия с `var(--font-tag)`
- Примеры:
  - `useFontCss.getVariationSettings`
  - `useVariableFontControls` формирует `variationSettingsStr`
  - `buildVariationSettingsCssString`
  - `generatePseudoStatic`
  - export CSS в `pages/index.jsx`
- Статус:
  - расширен `utils/fontVariationSettings.js`: общий `formatFontVariationSettings()` + режимы `supportedAxes`, `valueFormatter`, `defaults-from-axes`
  - на него переведены `useFontCss`, `useVariableFontControls`, `googleFontCatalogAxes`, `staticFontGenerator`, `cssGenerator`, `pages/index.jsx`, `localFontProcessor`
- Вывод: единый formatter уже вынесен; локальные ручные сборки строки устранены

### 16. Повторное построение Blob/mime/objectURL для Fontsource VF

- Файлы: `hooks/useFontLoader.js`, `components/FontsourceCatalogPanel.jsx`
- Тип: частичный дубль transport-логики
- Совпадает:
  - получение base64 из Fontsource API
  - вычисление расширения
  - построение `mimeType`
  - создание `Blob` и `URL.createObjectURL`
- Отличие:
  - в панели это download pipeline
  - в loader это runtime registration / file setup
- Вывод: стоит иметь общий helper `fontsourcePayloadToBlob(payload)`

### 17. Повтор применения weight/style в state шрифта

- Файлы: `hooks/useFontStyleManager.js`, `hooks/useFontManager.js`
- Тип: близкая бизнес-логика
- Совпадает:
  - обновление `currentWeight` / `currentStyle`
  - одновременная синхронизация `selectedFont` и элемента в массиве `fonts`
- Отличие:
  - один путь вызывается при применении пресета
  - второй при переключении/сохранении предыдущего шрифта
- Вывод: возможен общий updater для font view state, чтобы не держать параллельно ручные `map(...)`

### 18. `savedLibraryFontDownload.js` дублирует catalog download pipelines

- Файлы: `utils/savedLibraryFontDownload.js`, `components/GoogleFontsCatalogPanel.jsx`, `components/FontsourceCatalogPanel.jsx`
- Тип: почти прямой дубль бизнес-логики
- Совпадает:
  - `getGoogleSlicesForDownload`
  - `fetchGoogleVariableTtfBlob`
  - `downloadGooglePackageZip`
  - `downloadGoogleAsFormat`
  - `downloadGoogleVariableVariant`
  - `downloadFontsourcePackageZip`
  - `downloadFontsourceAsFormat`
  - `downloadFontsourceVariableVariant`
- Отличие:
  - в `savedLibraryFontDownload.js` это обернуто для split-button в сохранённых библиотеках
  - в каталогах те же шаги живут внутри panel-компонентов
- Статус:
  - создан общий util `utils/catalogDownloadActions.js`
  - `utils/savedLibraryFontDownload.js` переведён на него
  - `components/GoogleFontsCatalogPanel.jsx` переведён на него для одиночных Google download actions
  - `components/FontsourceCatalogPanel.jsx` переведён на него для одиночных Fontsource download actions и общей сборки package files
  - обе catalog-panel переведены на общие helper'ы multi-select archive flow: уникальные имена, per-item package zip, общий selection archive
- Вывод: очень хороший кандидат на отдельный shared service уровня `catalogDownloadActions`; базовый вынос уже сделан

### 19. Повтор primitive-функции скачивания файла

- Файлы: `hooks/useFontExport.js`, `utils/fileDownloadUtils.js`, `components/ExportModal.jsx`, `components/CSSModal.jsx`
- Тип: инфраструктурный дубль
- Совпадает:
  - создание `Blob`
  - `URL.createObjectURL`
  - создание `<a>`
  - `click()`
  - удаление/revoke URL
- Отличие только в обвязке toast/UI
- Статус:
  - `hooks/useFontExport.js` переведён на `saveBlobAsFile()`
  - `components/ExportModal.jsx` переведён на `saveBlobAsFile()`
  - `components/CSSModal.jsx` пока ещё содержит ручную legacy-реализацию
- Вывод: `saveBlobAsFile()` уже существует, но используется не везде; хороший cleanup-кандидат

### 20. `CSSModal` и `ExportModal` — две версии одного modal-паттерна

- Файлы: `components/CSSModal.jsx`, `components/ExportModal.jsx`
- Тип: частичный UI-дубль
- Совпадает:
  - `isVisible` animation state
  - body scroll lock/unlock
  - закрытие по backdrop
  - закрытие по `Escape`
  - `textarea` preview
  - copy/download actions
- Отличие:
  - `ExportModal` современнее и имеет выбор формата
  - `CSSModal` старее, с ручным notification DOM
- Проверка использования: по коду найден рендер только `ExportModal`
- Статус: `components/CSSModal.jsx` удалён как неиспользуемый legacy-компонент
- Вывод: `CSSModal` выглядел как legacy-версия `ExportModal` и после проверки использования был удалён

### 21. Экспорт CSS для VF размазан между `useFontCss`, `pages/index.jsx` и `useFontExport`

- Файлы: `hooks/useFontCss.js`, `pages/index.jsx`, `hooks/useFontExport.js`
- Тип: дублирование ответственности
- Совпадает:
  - генерация CSS под текущий выбранный шрифт
  - экспорт в строку
  - скачивание CSS как файла
- Отличие:
  - `useFontCss` делает базовый exporter
  - `pages/index.jsx` содержит отдельный крупный блок `buildExportCssCode`
  - `useFontExport` лишь оборачивает скачивание вокруг export
- Вывод: в проекте, вероятно, два конкурирующих пути CSS-экспорта; нужно проверить, какой реально используется в UI

### 22. `FontLibrarySidebar`: повторные draft-объекты и ручной reset drag-state

- Файл: `components/FontLibrarySidebar.jsx`
- Тип: локальный cleanup-дубль
- Совпадало:
  - сборка почти одинаковых draft-объектов для `edit` и `create with seed`
  - ручной сброс `dropTargetLibraryId` / `draggedLibraryId` / `dragOverLibraryId`
- Статус:
  - добавлены `normalizeDraftFonts()`, `createDraftWithFonts()`, `createEditDraft()`
  - добавлен `clearLibraryDragState()`
- Вывод: локальный шум в sidebar уже схлопнут

### 23. Повтор outside-click / Escape close логики в menu-компонентах

- Файлы: `components/ui/CardActionsMenu.jsx`, `components/ui/CatalogAddTargetMenu.jsx`, `components/ui/CatalogDownloadSplitButton.jsx`, `components/ui/FontLibraryStatusMenu.jsx`, частично `components/ui/CustomSelect.jsx`
- Тип: инфраструктурный UI-дубль
- Совпадает:
  - `if (!open) return`
  - `mousedown` вне `rootRef` => закрыть
  - `Escape` => закрыть
  - cleanup через removeEventListener
- Отличие:
  - `CatalogDownloadSplitButton` дополнительно учитывает `menuRef`
  - `CustomSelect` использует ту же идею, но с другой обвязкой
- Статус:
  - создан общий hook `components/ui/useDismissibleLayer.js`
  - на него переведены `CardActionsMenu`, `CatalogAddTargetMenu`, `CatalogDownloadSplitButton`, `FontLibraryStatusMenu`, `CustomSelect`
- Вывод: общий dismiss-hook уже вынесен; ручные listener-эффекты в этих компонентах устранены

### 24. Обёртки add-to-library / create-library размазаны по нескольким UI-компонентам

- Файлы: `components/ui/CatalogLibraryActions.jsx`, `components/ui/FontLibraryStatusMenu.jsx`, `components/FontLibrarySidebar.jsx`, `components/GoogleFontsCatalogPanel.jsx`, `components/FontsourceCatalogPanel.jsx`
- Тип: смысловой дубль обвязки действий
- Совпадает:
  - вызвать `onAddFontToLibrary(libraryId, entry)`
  - трактовать `!== false` как успех
  - передавать `[entry]` в `onCreateLibrary` / seed-create flow
  - закрывать menu/dialog после успешного действия
- Отличие:
  - названия callback'ов разные (`onMoveToLibrary`, `onRequestCreateLibrary`, `onAddFontToLibrary`)
  - где-то есть busy/completed-state, где-то нет
- Статус:
  - создан `utils/libraryEntryActions.js`
  - на него переведены `CatalogLibraryActions`, `FontLibraryStatusMenu`, `GoogleFontsCatalogPanel`, `FontsourceCatalogPanel`, `FontLibrarySidebar`
- Вывод: общий adapter базового уровня уже вынесен; дальше можно при желании подтянуть к нему menu-specific busy/completed flow

### 25. `FontPreview`: повтор mapping-логики для alignment/layout

- Файл: `components/FontPreview.jsx`
- Тип: локальный смысловой дубль
- Совпадает:
  - `verticalAlignment === 'middle' ? 'center' : verticalAlignment === 'bottom' ? 'flex-end' : 'flex-start'`
  - близкий mapping для `textAlignment`
  - те же режимные ветки для empty-state search layout-классов
- Статус:
  - добавлены `resolvePreviewJustifyContent()`, `resolvePreviewAlignItems()`, `getEmptyStateSearchLayoutClasses()`
  - `FontPreview.jsx` переведён на эти helpers
- Вывод: локальный дубль в `FontPreview` частично закрыт безопасным helper-слоем

### 26. `Sidebar`: крупный hotspot mode-dependent UI логики

- Файл: `components/Sidebar.jsx`
- Тип: hotspot дублирования / сложные тернарники
- Наблюдения:
  - много повторов `viewMode === 'waterfall' ? ... : ...`
  - повтор label/onClick/aria для `rows vs columns`
  - повтор логики around `waterfallRoundPx !== false`
  - много режимных веток с `glyphs/styles/waterfall`
- Статус:
  - добавлены `getSidebarFontSizeControl()` и `getSidebarCountControl()`
  - в `Sidebar.jsx` схлопнуты `font size` switcher, `rows/columns` control и `waterfall round` state/tooltip
  - добавлены локальные флаги `isTextModeDisabled`, `isTextCaseDisabled`, `isTextFillDisabled`
  - settings popover переведён с ручного `mousedown/Escape`-эффекта на общий `useDismissibleLayer`
- Вывод: hotspot частично разгружен; дальше имеет смысл добирать оставшиеся mode-config ветки малыми партиями

### 27. `Sidebar`: локальный дубль цветовых блоков foreground/background

- Файл: `components/Sidebar.jsx`
- Тип: локальный смысловой дубль
- Совпадает:
  - почти одинаковая структура `HEX/RGB toggle -> input/RgbTripletInputs`
  - похожая логика hue-slider knob
  - одинаковая button-обвязка для переключения `hex/rgb`
- Статус:
  - добавлен локальный общий компонент `SidebarColorEditor`
  - оба блока `foreground/background` переведены на него
  - drag-state логика переведена на общий config-layer: `getColorControlState()`, `startColorDrag()`, `stopAllColorDragging()`
  - `mousemove`-обработка теперь использует один active drag handler вместо ручной цепочки из четырёх веток
- Вывод: локальный дубль color editor устранён

### 28. `Sidebar`: повтор рендера quick preset buttons

- Файл: `components/Sidebar.jsx`
- Тип: локальный смысловой дубль
- Совпадает:
  - два почти одинаковых `.map()` для `SAMPLE_QUICK_PRESETS` и `GLYPH_QUICK_PRESETS`
  - одинаковые `disabled/className/onClick`, меняется только namespace (`sample` / `glyph`)
- Статус:
  - `Sidebar.jsx` переведён на общий массив `quickPresetSections`
  - два отдельных `.map()` схлопнуты в одну общую ветку рендера
- Вывод: локальный дубль quick preset buttons устранён

### 29. `Sidebar`: routing-дубль для `letter spacing` и `line height`

- Файл: `components/Sidebar.jsx`
- Тип: локальный смысловой дубль
- Совпадает:
  - `isWaterfallView ? body : heading : styles/default`
  - похожая логика выбора `value` и `onChange`
  - ручной routing в `waterfall/body/heading/styles/default`
- Статус:
  - добавлены `getSidebarLetterSpacingControl()` и `getSidebarLineHeightControl()`
  - оба слайдера переведены на общий routing `value/onChange`
- Вывод: локальный routing-дубль для `letter spacing` и `line height` устранён

## Предварительный приоритет

- ~~Высокий: объединение download-логики Google/Fontsource~~ → `catalogDownloadActions.js` + `buildCatalogSourceDownloadProps`
- ~~Высокий: вынос общего card renderer для каталогов~~ → `CatalogSourceCard` / `UnifiedCatalogCard`
- ~~Высокий: централизовать восстановление preset/axes state шрифта~~ → пакет 23
- ~~Высокий: вынести общие download actions из catalog panels~~ → сделано ранее
- ~~Средний: вынести общий Google metadata/family lookup pipeline~~ → `googleApiRouteHelpers` + единый кэш в catalog (пакет 18)
- Средний: общий dropdown/menu primitive для action-меню
- Средний: общий dismiss-hook для dropdown/menu/select
- Средний: общий adapter для library entry actions
- Средний: cleanup крупных режимных тернарников и mode-switch логики в `Sidebar` / `FontPreview`
- Средний: helpers для alignment/layout mapping в `FontPreview`
- Средний: общий resolver для Fontsource API endpoints
- ~~Средний: удалить `pages/api/fontsource/[fontFamily]/metadata.js`~~ → удалён 2026-05-27
- ~~Средний: один formatter для `font-variation-settings`~~ → `fontVariationSettings.ts` + parse/stringify (пакет 22); остаётся preset/axes recovery
- Средний: слить `CSSModal` в `ExportModal` или удалить legacy-версию
- Низкий: косметически унифицировать пустые loader-компоненты и grid cols helpers

## Следующие пакеты

- ~~`pages/api/google-*`~~ → пакет 18 (2026-05-27)
- `utils/*cache*` — пакет 20; disk cache Fontsource — кандидат
- ~~`utils/*download*` (основное)~~ → пакет 21
- ~~`utils/*google*` (API)~~ → пакеты 18–19
- ~~`components/ExportModal`, `hooks/useFontExport`, `buildEditorExportCssCode`~~ → пакет 22 (частично)
- ~~`components/CSSModal.jsx`~~ — удалён ранее
- `utils/fileDownloadUtils.js`, `utils/fontFormatConvertClient.js`, `utils/savedLibraryFontDownload.js`
- `components/ui/*Toolbar*`, `components/ui/*Search*`, `components/ui/*Select*`
