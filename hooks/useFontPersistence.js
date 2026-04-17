import { useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAllFonts, deleteAllFontsDB, updateFontSettings, saveFont } from '../utils/db';
import { loadFontFaceIfNeeded, buildVariableFontFaceDescriptors } from '../utils/cssGenerator'; // Нужен для восстановления
import {
  revokeObjectURL,
  buildGoogleStaticSliceFaceDescriptors,
  buildGoogleVariableSliceFaceDescriptors,
} from '../utils/localFontProcessor'; // Для очистки URL и дескрипторов сабсетов Google
import { buildVariationSettingsCssString } from '../utils/googleFontCatalogAxes';
import { parseFontBuffer, normalizeFvarAxisTag } from '../utils/fontParser';

// Ключи localStorage для настроек шрифта
const FONT_SETTINGS_LS_KEYS = {
    LAST_PRESET_NAME: 'lastPresetName',
    LAST_VARIABLE_SETTINGS: 'lastVariableSettings',
    SELECTED_FONT_ID: 'selectedFontId'
};

/**
 * Старые записи Google VF в IndexedDB: gstatic-сабсеты без полного fvar.
 * Подменяем файл на полный variable TTF с репозитория google/fonts (как при ручной загрузке).
 */
async function enrichGoogleVfAxesFromGithubIfNeeded(font) {
    if (font.source !== 'google' || !font.isVariableFont) return;
    const keys =
        font.variableAxes && typeof font.variableAxes === 'object' ? Object.keys(font.variableAxes) : [];
    if (keys.length > 1) return;

    const family = String(font.name || '').trim();
    if (!family) return;

    try {
        const res = await fetch(`/api/google-font-github-vf?family=${encodeURIComponent(family)}`);
        if (!res.ok) return;
        const blob = await res.blob();
        if (!(blob instanceof Blob) || blob.size < 10_000) return;

        const buf = await blob.arrayBuffer();
        const parsed = await parseFontBuffer(buf, family);
        const axes = parsed?.tables?.fvar?.axes;
        if (!axes?.length) return;

        const variableAxes = axes.reduce((acc, axis) => {
            const tag = normalizeFvarAxisTag(axis.tag);
            if (!tag) return acc;
            const axisName = axis.name?.en || tag.toUpperCase();
            acc[tag] = {
                name: axisName,
                min: axis.minValue,
                max: axis.maxValue,
                default: axis.defaultValue,
            };
            return acc;
        }, {});

        font.file = blob;
        font.originalName = `${family}.ttf`;
        font.googleFontExtraSliceBlobs = undefined;
        font.googleFontExtraSliceMeta = undefined;
        font.googleFontFirstSliceMeta = undefined;
        font.variableAxes = variableAxes;
        font.supportedAxes = Object.keys(variableAxes);
        font.variationSettings = buildVariationSettingsCssString(variableAxes);

        await saveFont(font);
        console.log('[DB] Google VF обновлён полным TTF (GitHub):', family, font.supportedAxes.length, 'осей');
    } catch (e) {
        console.warn('[DB] enrichGoogleVfAxesFromGithubIfNeeded:', family, e);
    }
}

/**
 * Хук для управления постоянством данных шрифтов (IndexedDB, localStorage).
 * @param {Function} setFonts - Функция установки состояния массива шрифтов.
 * @param {Function} setIsLoading - Функция установки состояния загрузки.
 * @param {Function} setIsInitialLoadComplete - Функция установки флага завершения начальной загрузки.
 * @param {Function} setSelectedFont - Функция установки выбранного шрифта.
 * @param {Function} handleVariableSettingsChange - Функция применения настроек вариативности.
 * @param {Function} applyPresetStyle - Функция применения пресета стиля.
 * @param {Array} fonts - Текущий массив шрифтов (для поиска при восстановлении).
 * @param {Object|null} selectedFont - Текущий выбранный шрифт (для предотвращения повторного восстановления).
 */
export function useFontPersistence(
    setFonts,
    setIsLoading,
    setIsInitialLoadComplete,
    setSelectedFont,
    handleVariableSettingsChange,
    applyPresetStyle,
    fonts, // Передаем текущие fonts
    selectedFont // Передаем selectedFont
) {

    // --- Начальная загрузка из IndexedDB --- 
    useEffect(() => {
        let isMounted = true;
        const loadInitialFonts = async () => {
            console.log('[DB] Загрузка начальных шрифтов...');
            setIsLoading(true);
            try {
                const storedFonts = await getAllFonts();
                if (!isMounted) return;

                if (storedFonts && storedFonts.length > 0) {
                    console.log(`[DB] Найдено ${storedFonts.length} шрифтов.`);
                    const processedFonts = await Promise.all(storedFonts.map(async (font) => {
                        if (!font?.id || !font.file || !(font.file instanceof Blob)) {
                            console.warn('[DB] Пропущен некорректный объект:', font);
                            return null;
                        }
                        if (typeof font.file.size === 'number' && font.file.size === 0) {
                            console.warn('[DB] Пустой Blob шрифта, пропуск:', font.name || font.id);
                            return null;
                        }
                        try {
                            await enrichGoogleVfAxesFromGithubIfNeeded(font);

                            // blob: из прошлой сессии в IndexedDB невалиден; пересоздаём только после успешной загрузки
                            font.url = undefined;
                            // FontFace принимает имя без CSS-кавычек; в БД могло сохраниться "'Roboto'" из Fontsource
                            const rawFamily = font.fontFamily || `font-${font.id}`;
                            const fontFamilyToLoad = String(rawFamily).replace(/^['"]+|['"]+$/g, '').trim() || `font-${font.id}`;
                            font.fontFamily = fontFamilyToLoad;

                            let initialVarSettings = {};
                            if (font.isVariableFont && font.variableAxes) {
                                initialVarSettings = Object.entries(font.variableAxes).reduce((acc, [tag, axis]) => {
                                    if (axis && typeof axis === 'object' && axis.default !== undefined) acc[tag] = axis.default;
                                    return acc;
                                }, {});
                            }
                            // Загрузка из буфера надёжнее, чем из blob: URL после перезагрузки страницы
                            const fontBinary = await font.file.arrayBuffer();
                            let mainFaceDescriptors = {};
                            if (font.isVariableFont) {
                                mainFaceDescriptors = font.googleFontFirstSliceMeta
                                    ? buildGoogleVariableSliceFaceDescriptors(
                                          font.googleFontFirstSliceMeta,
                                          font.variableAxes,
                                      )
                                    : buildVariableFontFaceDescriptors(font.variableAxes);
                            } else if (font.googleFontFirstSliceMeta) {
                                mainFaceDescriptors = buildGoogleStaticSliceFaceDescriptors(font.googleFontFirstSliceMeta);
                            }
                            await loadFontFaceIfNeeded(
                                fontFamilyToLoad,
                                fontBinary,
                                initialVarSettings,
                                font.id,
                                mainFaceDescriptors
                            );

                            const extraMeta = font.googleFontExtraSliceMeta;
                            const extraBlobs = font.googleFontExtraSliceBlobs;
                            if (
                                Array.isArray(extraMeta) &&
                                Array.isArray(extraBlobs) &&
                                extraMeta.length > 0 &&
                                extraMeta.length === extraBlobs.length
                            ) {
                                for (let i = 0; i < extraMeta.length; i++) {
                                    const buf = await extraBlobs[i].arrayBuffer();
                                    const exDesc = font.isVariableFont
                                        ? buildGoogleVariableSliceFaceDescriptors(
                                              extraMeta[i],
                                              font.variableAxes,
                                          )
                                        : buildGoogleStaticSliceFaceDescriptors(extraMeta[i]);
                                    await loadFontFaceIfNeeded(
                                        fontFamilyToLoad,
                                        buf,
                                        {},
                                        `${font.id}-ex-${i}`,
                                        exDesc
                                    );
                                }
                            }

                            font.url = URL.createObjectURL(font.file);
                            // Добавляем недостающие поля сессии, если их нет
                            return {
                                ...font,
                                lastUsedPresetName: font.lastUsedPresetName || null,
                                lastUsedVariableSettings: font.lastUsedVariableSettings || null
                            };
                        } catch (loadError) {
                            console.error(`[DB] Ошибка пересоздания FontFace для ${font.name}:`, loadError);
                            if (font.url) revokeObjectURL(font.url);
                            return null;
                        }
                    }));

                    const validFonts = processedFonts.filter(f => f !== null);
                    if (isMounted) {
                        if (
                            validFonts.length > 0 &&
                            typeof document !== 'undefined' &&
                            document.fonts &&
                            typeof document.fonts.ready?.then === 'function'
                        ) {
                            try {
                                await document.fonts.ready;
                            } catch (e) {
                                console.warn('[DB] document.fonts.ready:', e);
                            }
                        }
                        setFonts(validFonts);
                        console.log(`[DB] ${validFonts.length} шрифтов успешно загружено.`);
                    }
                } else {
                    console.log('[DB] В IndexedDB нет шрифтов.');
                }
            } catch (error) {
                console.error('[DB] Ошибка загрузки шрифтов:', error);
                toast.error('Ошибка загрузки сохраненных шрифтов.');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                    setIsInitialLoadComplete(true);
                }
            }
        };
        loadInitialFonts();
        return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setFonts, setIsLoading, setIsInitialLoadComplete]); // Зависимости только сеттеры

    // --- Восстановление выбранного шрифта и его настроек --- 
    useEffect(() => {
        // Запускаем только после завершения загрузки из DB и если есть шрифты, но ни один не выбран
        if (fonts && fonts.length > 0 && !selectedFont) {
            console.log('[Restore] Попытка восстановить выбор и настройки...');
            const storedId = localStorage.getItem(FONT_SETTINGS_LS_KEYS.SELECTED_FONT_ID);
            let fontToSelect = null;

            if (storedId) {
                fontToSelect = fonts.find(f => f.id === storedId);
                if (fontToSelect) {
                    console.log(`[Restore] Найден шрифт по ID: ${fontToSelect.displayName || fontToSelect.name}`);
                } else {
                    console.log(`[Restore] Шрифт с ID ${storedId} не найден. Удаляем ID.`);
                    localStorage.removeItem(FONT_SETTINGS_LS_KEYS.SELECTED_FONT_ID);
                }
            }

            if (!fontToSelect && fonts && fonts.length > 0) {
                console.log('[Restore] Выбираем первый доступный шрифт.');
                fontToSelect = fonts[0];
                localStorage.setItem(FONT_SETTINGS_LS_KEYS.SELECTED_FONT_ID, fontToSelect.id); // Сохраняем ID первого
            }

            if (fontToSelect) {
                setSelectedFont(fontToSelect); // Устанавливаем шрифт

                // Используем setTimeout для применения настроек после установки шрифта
                setTimeout(() => {
                    console.log(`[Restore] Применение настроек для ${fontToSelect.displayName || fontToSelect.name} через setTimeout`);
                    const restoredVarSettingsRaw = localStorage.getItem(FONT_SETTINGS_LS_KEYS.LAST_VARIABLE_SETTINGS);
                    const restoredPresetName = localStorage.getItem(FONT_SETTINGS_LS_KEYS.LAST_PRESET_NAME);
                    let settingsApplied = false;

                    if (fontToSelect.isVariableFont && handleVariableSettingsChange) {
                        // Вариативный: сначала оси, сохранённые за этим шрифтом в IndexedDB (истина для перезагрузки),
                        // иначе глобальные оси из LS. Глобальный lastPresetName (часто «Thin» от статического теста)
                        // нельзя применять раньше осей — иначе перетирается выбранный вес.
                        const dbAxes = fontToSelect.lastUsedVariableSettings;
                        const hasDbAxes = dbAxes && typeof dbAxes === 'object' && Object.keys(dbAxes).length > 0;
                        if (hasDbAxes) {
                            console.log('[Restore] Восстанавливаем оси из IndexedDB (приоритет):', dbAxes);
                            handleVariableSettingsChange(dbAxes, true, fontToSelect);
                            settingsApplied = true;
                        } else if (restoredVarSettingsRaw) {
                            try {
                                const restoredVarSettings = JSON.parse(restoredVarSettingsRaw);
                                console.log('[Restore] Восстанавливаем оси из localStorage:', restoredVarSettings);
                                handleVariableSettingsChange(restoredVarSettings, true, fontToSelect);
                                settingsApplied = true;
                            } catch (e) {
                                console.error('[Restore] Ошибка парсинга осей из localStorage:', e);
                                localStorage.removeItem(FONT_SETTINGS_LS_KEYS.LAST_VARIABLE_SETTINGS);
                            }
                        } else if (fontToSelect.lastUsedPresetName && applyPresetStyle) {
                            console.log(`[Restore] Вариативный, нет осей — пресет из IndexedDB: ${fontToSelect.lastUsedPresetName}`);
                            applyPresetStyle(fontToSelect.lastUsedPresetName, fontToSelect);
                            settingsApplied = true;
                        } else if (restoredPresetName && applyPresetStyle) {
                            console.log(`[Restore] Вариативный, нет осей в БД — пресет из localStorage: ${restoredPresetName}`);
                            applyPresetStyle(restoredPresetName, fontToSelect);
                            settingsApplied = true;
                        }
                    } else if (!fontToSelect.isVariableFont) {
                        // Статический: глобальный пресет из LS, затем сохранённый в IndexedDB
                        if (restoredPresetName && applyPresetStyle) {
                            console.log(`[Restore] Восстанавливаем пресет из localStorage: ${restoredPresetName}`);
                            applyPresetStyle(restoredPresetName, fontToSelect);
                            settingsApplied = true;
                        } else if (fontToSelect.lastUsedPresetName && applyPresetStyle) {
                            console.log(`[Restore] Восстанавливаем пресет из IndexedDB: ${fontToSelect.lastUsedPresetName}`);
                            applyPresetStyle(fontToSelect.lastUsedPresetName, fontToSelect);
                            settingsApplied = true;
                        }
                    }

                    if (!settingsApplied) {
                        console.log('[Restore] Настройки не восстановлены, применяем дефолтный Regular');
                        if (applyPresetStyle) {
                            applyPresetStyle('Regular', fontToSelect);
                        }
                    }
                }, 0);
            }
        }
    // Добавляем fonts и selectedFont в зависимости, чтобы эффект срабатывал при их изменении
    }, [fonts, selectedFont, setSelectedFont, applyPresetStyle, handleVariableSettingsChange]);

    // --- Функции для управления localStorage --- 

    const saveSelectedFontId = useCallback((fontId) => {
        if (typeof window !== 'undefined') {
            if (fontId) {
                localStorage.setItem(FONT_SETTINGS_LS_KEYS.SELECTED_FONT_ID, fontId);
            } else {
                localStorage.removeItem(FONT_SETTINGS_LS_KEYS.SELECTED_FONT_ID);
            }
        }
    }, []);

    const saveLastVariableSettings = useCallback((settings) => {
        console.log('[Persistence] saveLastVariableSettings вызвана с настройками:', settings);
        if (typeof window !== 'undefined') {
            localStorage.setItem(FONT_SETTINGS_LS_KEYS.LAST_VARIABLE_SETTINGS, JSON.stringify(settings));
            localStorage.removeItem(FONT_SETTINGS_LS_KEYS.LAST_PRESET_NAME); // Сбрасываем пресет
            console.log('[Persistence] Настройки сохранены в localStorage');
        } else {
            console.warn('[Persistence] window недоступен, сохранение пропущено');
        }
    }, []);

    const saveLastPresetName = useCallback((presetName) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(FONT_SETTINGS_LS_KEYS.LAST_PRESET_NAME, presetName);
            localStorage.removeItem(FONT_SETTINGS_LS_KEYS.LAST_VARIABLE_SETTINGS); // Сбрасываем оси
        }
    }, []);

    const clearFontLocalStorage = useCallback(() => {
        if (typeof window !== 'undefined') {
            Object.values(FONT_SETTINGS_LS_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            console.log("[Persistence] localStorage (шрифты) очищен.");
        }
    }, []);

    // --- Функция сброса персистентности --- 
    const resetPersistence = useCallback(async () => {
        try {
            await deleteAllFontsDB();
            clearFontLocalStorage();
            toast.info("Хранилища шрифтов (DB и LS) очищены.");
        } catch (error) {
            console.error("[Persistence] Ошибка при сбросе хранилищ:", error);
            toast.error("Ошибка очистки хранилищ шрифтов.");
        }
    }, [clearFontLocalStorage]);

    // --- Функция сохранения настроек шрифта в IndexedDB ---
    const saveFontSettings = useCallback(async (fontId, settings) => {
        if (!fontId || !settings) return;
        
        try {
            await updateFontSettings(fontId, settings);
        } catch (error) {
            console.error(`[Persistence] Ошибка сохранения настроек шрифта ${fontId}:`, error);
        }
    }, []);

    // Возвращаем функции для управления персистентностью
    return {
        saveSelectedFontId,
        saveLastVariableSettings,
        saveLastPresetName,
        clearFontLocalStorage,
        resetPersistence,
        saveFontSettings
    };
} 