import { useEffect, useCallback, useRef } from 'react';
import { toast } from '../utils/appNotify';
import { getAllFonts, deleteAllFontsDB, updateFontSettings, saveFont } from '../utils/db';
import { loadFontFaceIfNeeded, buildVariableFontFaceDescriptors } from '../utils/cssGenerator'; // Нужен для восстановления
import {
  revokeObjectURL,
  buildGoogleStaticSliceFaceDescriptors,
  buildGoogleVariableSliceFaceDescriptors,
} from '../utils/localFontProcessor'; // Для очистки URL и дескрипторов Google-сабсетов
import { buildVariationSettingsCssString } from '../utils/googleFontCatalogAxes';
import { parseFontBuffer, normalizeFvarAxisTag } from '../utils/fontParser';
import { filterPresetStylesForVariableAxes } from '../utils/fontUtilsCommon';

// Ключи localStorage для настроек шрифта
const FONT_SETTINGS_LS_KEYS = {
    LAST_PRESET_NAME: 'lastPresetName',
    LAST_VARIABLE_SETTINGS: 'lastVariableSettings',
    SELECTED_FONT_ID: 'selectedFontId'
};

/** Дополняет урезанный Google VF полным fvar (TTF из github/google/fonts). */
async function enrichGoogleVfAxesFromGithubIfNeeded(font) {
    if (font.source !== 'google' || !font.isVariableFont) return;
    const keys =
        font.variableAxes && typeof font.variableAxes === 'object' ? Object.keys(font.variableAxes) : [];
    const family = String(font.name || '').trim();
    if (!family) return;

    try {
        let changed = false;

        if (keys.length <= 1) {
            const res = await fetch(`/api/google-font-github-vf?family=${encodeURIComponent(family)}`);
            if (res.ok) {
                const blob = await res.blob();
                if (blob instanceof Blob && blob.size >= 10_000) {
                    const buf = await blob.arrayBuffer();
                    const parsed = await parseFontBuffer(buf, family);
                    const axes = parsed?.tables?.fvar?.axes;
                    if (axes?.length) {
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
                        changed = true;
                    }
                }
            }
        }

        const variableAxes = font.variableAxes && typeof font.variableAxes === 'object' ? font.variableAxes : {};
        font.italicMode = variableAxes.ital ? 'axis-ital' : variableAxes.slnt ? 'axis-slnt' : (font.hasItalicStyles ? 'separate-style' : 'none');
        font.availableStyles = filterPresetStylesForVariableAxes(variableAxes, undefined, {
            italicMode: font.italicMode,
        });

        if (font.italicMode === 'separate-style' && font.hasItalicStyles && !(font.googleFontItalicFile instanceof Blob)) {
            try {
                const italicRes = await fetch(`/api/google-font-github-vf?family=${encodeURIComponent(family)}&italic=1`);
                if (italicRes.ok) {
                    const italicBlob = await italicRes.blob();
                    if (italicBlob instanceof Blob && italicBlob.size > 10_000) {
                        font.googleFontItalicFile = italicBlob;
                        changed = true;
                    }
                }
            } catch (italicError) {
                console.warn('[DB] enrichGoogleVfAxesFromGithubIfNeeded italic:', family, italicError);
            }
        }

        if (changed) {
            await saveFont(font);
        }
    } catch (e) {
        console.warn('[DB] enrichGoogleVfAxesFromGithubIfNeeded:', family, e);
    }
}

/** Быстрый проход: только валидация и нормализация имени без arrayBuffer / FontFace / сети. */
function stageFontFromRecord(font) {
    if (!font?.id || !font.file || !(font.file instanceof Blob)) return null;
    if (typeof font.file.size === 'number' && font.file.size === 0) return null;
    const rawFamily = font.fontFamily || `font-${font.id}`;
    const fontFamilyToLoad = String(rawFamily).replace(/^['"]+|['"]+$/g, '').trim() || `font-${font.id}`;
    return {
        ...font,
        url: undefined,
        fontFamily: fontFamilyToLoad,
        lastUsedPresetName: font.lastUsedPresetName || null,
        lastUsedVariableSettings: font.lastUsedVariableSettings || null,
    };
}

/**
 * Полная регистрация @font-face в браузере (после stage можно вызывать в фоне).
 * Ранее это ждало завершения по всем шрифтам + document.fonts.ready и тормозило открытие вкладок.
 */
async function loadFontFacesForRestoredFont(font) {
    const working = { ...font };
    try {
        await enrichGoogleVfAxesFromGithubIfNeeded(working);

        working.url = undefined;
        const fontFamilyToLoad = working.fontFamily;

        let initialVarSettings = {};
        if (working.isVariableFont && working.variableAxes) {
            initialVarSettings = Object.entries(working.variableAxes).reduce((acc, [tag, axis]) => {
                if (axis && typeof axis === 'object' && axis.default !== undefined) acc[tag] = axis.default;
                return acc;
            }, {});
        }
        const fontBinary = await working.file.arrayBuffer();
        let mainFaceDescriptors = {};
        if (working.isVariableFont) {
            mainFaceDescriptors = working.googleFontFirstSliceMeta
                ? buildGoogleVariableSliceFaceDescriptors(working.googleFontFirstSliceMeta, working.variableAxes)
                : buildVariableFontFaceDescriptors(working.variableAxes);
        } else if (working.googleFontFirstSliceMeta) {
            mainFaceDescriptors = buildGoogleStaticSliceFaceDescriptors(working.googleFontFirstSliceMeta);
        }
        await loadFontFaceIfNeeded(
            fontFamilyToLoad,
            fontBinary,
            initialVarSettings,
            working.id,
            mainFaceDescriptors,
        );

        if (working.isVariableFont && working.italicMode === 'separate-style' && working.googleFontItalicFile instanceof Blob) {
            const italicBinary = await working.googleFontItalicFile.arrayBuffer();
            const italicDescriptors = buildVariableFontFaceDescriptors(working.variableAxes, { style: 'italic' });
            await loadFontFaceIfNeeded(
                fontFamilyToLoad,
                italicBinary,
                {},
                `${working.id}-italic`,
                italicDescriptors,
            );
        }

        const extraMeta = working.googleFontExtraSliceMeta;
        const extraBlobs = working.googleFontExtraSliceBlobs;
        if (
            Array.isArray(extraMeta) &&
            Array.isArray(extraBlobs) &&
            extraMeta.length > 0 &&
            extraMeta.length === extraBlobs.length
        ) {
            for (let i = 0; i < extraMeta.length; i++) {
                const buf = await extraBlobs[i].arrayBuffer();
                const exDesc = working.isVariableFont
                    ? buildGoogleVariableSliceFaceDescriptors(extraMeta[i], working.variableAxes)
                    : buildGoogleStaticSliceFaceDescriptors(extraMeta[i]);
                await loadFontFaceIfNeeded(fontFamilyToLoad, buf, {}, `${working.id}-ex-${i}`, exDesc);
            }
        }

        working.url = URL.createObjectURL(working.file);
        return {
            ...working,
            lastUsedPresetName: working.lastUsedPresetName || null,
            lastUsedVariableSettings: working.lastUsedVariableSettings || null,
        };
    } catch (loadError) {
        console.error(`[DB] Ошибка пересоздания FontFace для ${font.name}:`, loadError);
        if (working.url) revokeObjectURL(working.url);
        return null;
    }
}

/** IndexedDB + localStorage: загрузка, восстановление выбора и сброс. */
export function useFontPersistence(
    setFonts,
    setIsLoading,
    setIsInitialLoadComplete,
    setSelectedFont,
    handleVariableSettingsChange,
    applyPresetStyle,
    fonts,
    selectedFont
) {

    // Восстановление выбранного шрифта должно происходить только один раз после гидратации из DB,
    // иначе при переходе на «Новый»/«Все шрифты» эффект снова выберет первый шрифт.
    const hasRestoredSelectedFontRef = useRef(false);

    // --- Начальная загрузка из IndexedDB ---
    useEffect(() => {
        let isMounted = true;
        const loadInitialFonts = async () => {
            setIsLoading(true);
            try {
                const storedFonts = await getAllFonts();
                if (!isMounted) return;

                if (storedFonts && storedFonts.length > 0) {
                    const stagedFonts = storedFonts.map(stageFontFromRecord).filter((f) => f !== null);

                    if (isMounted && stagedFonts.length > 0) {
                        setFonts(stagedFonts);
                        setIsLoading(false);
                        setIsInitialLoadComplete(true);
                    }

                    const processedFonts = await Promise.all(
                        stagedFonts.map((font) => loadFontFacesForRestoredFont(font)),
                    );
                    const validFonts = processedFonts.filter((f) => f !== null);

                    if (isMounted && validFonts.length > 0) {
                        setFonts(validFonts);
                    } else if (isMounted && stagedFonts.length > 0 && validFonts.length === 0) {
                        console.warn('[DB] Ни один шрифт не удалось восстановить в FontFace');
                    }
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
    }, [setFonts, setIsLoading, setIsInitialLoadComplete]); // Зависимости: только сеттеры

    // --- Восстановление выбранного шрифта и его настроек ---
    useEffect(() => {
        // Запускаем только после завершения загрузки из DB и при наличии шрифтов без выбранного.
        if (hasRestoredSelectedFontRef.current) return;
        if (fonts && fonts.length > 0 && !selectedFont) {
            const storedId = localStorage.getItem(FONT_SETTINGS_LS_KEYS.SELECTED_FONT_ID);
            let fontToSelect = null;

            if (storedId) {
                fontToSelect = fonts.find(f => f.id === storedId);
                if (!fontToSelect) {
                    localStorage.removeItem(FONT_SETTINGS_LS_KEYS.SELECTED_FONT_ID);
                }
            }

            if (!fontToSelect && fonts && fonts.length > 0) {
                fontToSelect = fonts[0];
                localStorage.setItem(FONT_SETTINGS_LS_KEYS.SELECTED_FONT_ID, fontToSelect.id); // Save first font ID.
            }

            if (fontToSelect) {
                setSelectedFont(fontToSelect); // Устанавливаем шрифт
                hasRestoredSelectedFontRef.current = true;

                // Используем setTimeout, чтобы применить настройки после установки шрифта.
                setTimeout(() => {
                    const restoredVarSettingsRaw = localStorage.getItem(FONT_SETTINGS_LS_KEYS.LAST_VARIABLE_SETTINGS);
                    const restoredPresetName = localStorage.getItem(FONT_SETTINGS_LS_KEYS.LAST_PRESET_NAME);
                    let settingsApplied = false;

                    if (fontToSelect.isVariableFont && handleVariableSettingsChange) {
                        // Вариативный: сначала оси из IndexedDB для этого шрифта, иначе глобальные оси из LS.
                        // Глобальный lastPresetName нельзя применять раньше осей, иначе перетирается выбранный вес.
                        const dbAxes = fontToSelect.lastUsedVariableSettings;
                        const hasDbAxes = dbAxes && typeof dbAxes === 'object' && Object.keys(dbAxes).length > 0;
                        if (hasDbAxes) {
                            handleVariableSettingsChange(dbAxes, true, fontToSelect);
                            settingsApplied = true;
                        } else if (restoredVarSettingsRaw) {
                            try {
                                const restoredVarSettings = JSON.parse(restoredVarSettingsRaw);
                                handleVariableSettingsChange(restoredVarSettings, true, fontToSelect);
                                settingsApplied = true;
                            } catch (e) {
                                console.error('[Restore] Ошибка парсинга осей из localStorage:', e);
                                localStorage.removeItem(FONT_SETTINGS_LS_KEYS.LAST_VARIABLE_SETTINGS);
                            }
                        } else if (fontToSelect.lastUsedPresetName && applyPresetStyle) {
                            applyPresetStyle(fontToSelect.lastUsedPresetName, fontToSelect);
                            settingsApplied = true;
                        } else if (restoredPresetName && applyPresetStyle) {
                            applyPresetStyle(restoredPresetName, fontToSelect);
                            settingsApplied = true;
                        }
                    } else if (!fontToSelect.isVariableFont) {
                        // Static font: first global preset from LS, then preset saved in IndexedDB.
                        if (restoredPresetName && applyPresetStyle) {
                            applyPresetStyle(restoredPresetName, fontToSelect);
                            settingsApplied = true;
                        } else if (fontToSelect.lastUsedPresetName && applyPresetStyle) {
                            applyPresetStyle(fontToSelect.lastUsedPresetName, fontToSelect);
                            settingsApplied = true;
                        }
                    }

                    if (!settingsApplied) {
                        if (applyPresetStyle) {
                            applyPresetStyle('Regular', fontToSelect);
                        }
                    }
                }, 0);
            }
        }
    // Добавляем fonts и selectedFont в зависимости, чтобы эффект реагировал на их изменения
    }, [fonts, selectedFont, setSelectedFont, applyPresetStyle, handleVariableSettingsChange]);

    // --- Helpers for localStorage management ---

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
        if (typeof window !== 'undefined') {
            localStorage.setItem(FONT_SETTINGS_LS_KEYS.LAST_VARIABLE_SETTINGS, JSON.stringify(settings));
            localStorage.removeItem(FONT_SETTINGS_LS_KEYS.LAST_PRESET_NAME); // Reset preset.
        } else {
            console.warn('[Persistence] window недоступен, сохранение пропущено');
        }
    }, []);

    const saveLastPresetName = useCallback((presetName) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(FONT_SETTINGS_LS_KEYS.LAST_PRESET_NAME, presetName);
            localStorage.removeItem(FONT_SETTINGS_LS_KEYS.LAST_VARIABLE_SETTINGS); // Reset axes.
        }
    }, []);

    const clearFontLocalStorage = useCallback(() => {
        if (typeof window !== 'undefined') {
            Object.values(FONT_SETTINGS_LS_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }, []);

    // --- Функция сброса персистентности ---
    const resetPersistence = useCallback(async () => {
        try {
            await deleteAllFontsDB();
            clearFontLocalStorage();
            toast.info("Хранилища шрифтов (DB и LS) очищены.");
        } catch (error) {
            console.error('[Persistence] Ошибка при сбросе хранилищ:', error);
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

    // Возвращаем функции управления персистентностью
    return {
        saveSelectedFontId,
        saveLastVariableSettings,
        saveLastPresetName,
        clearFontLocalStorage,
        resetPersistence,
        saveFontSettings
    };
} 
