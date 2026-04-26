import React, { useMemo } from 'react';
import EditableText from './EditableText';
import { findStyleInfoByWeightAndStyle } from '../utils/fontUtilsCommon';
import { useSettings } from '../contexts/SettingsContext';
import { getPreviewChromeFromBackground } from '../utils/previewChromeTheme';
import { generateVariationSettings } from '../utils/fontVariationSettings';
import {
  AXIS_RATIOS,
  ITALIC_VARIATIONS,
  WEIGHT_VARIATIONS,
} from '../utils/stylesPreviewModel';
import alarmIconUrl from '../assets/icon/edit/Alarm.svg';
import ideaIconUrl from '../assets/icon/edit/Idea.svg';

/** Монохром из assets/icon/edit: цвет через `currentColor` (mask + background). */
function EditToolbarIcon({ src, className = '' }) {
  return (
    <span
      className={`inline-block shrink-0 bg-current ${className}`.trim()}
      style={{
        WebkitMaskImage: `url(${src})`,
        WebkitMaskSize: 'contain',
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        maskImage: `url(${src})`,
        maskSize: 'contain',
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
      }}
      aria-hidden
    />
  );
}

/**
 * Компонент для режима отображения стилей шрифта
 * 
 * @param {Object} props - Свойства компонента
 * @param {Object} props.selectedFont - Выбранный шрифт
 * @param {string} props.fontFamilyValue - Семейство шрифтов (передаваемое из FontPreview)
 */
function StylesMode({
  selectedFont,
  fontFamilyValue,
}) {
  const { 
    text,
    stylesFontSize,
    stylesLetterSpacing,
    textColor, 
    backgroundColor,
    previewBackgroundImage,
    textDirection, 
    textAlignment, 
    textCase,
    textDecoration,
  } = useSettings();

  if (!selectedFont) return null;

  const letterSpacingValue = `${(stylesLetterSpacing / 100) * 0.5}em`;

  const hasStaticStyles = selectedFont.availableStyles && selectedFont.availableStyles.length > 1;
  const hasVariableAxes = selectedFont.isVariableFont && selectedFont.variableAxes && Object.keys(selectedFont.variableAxes).length > 0;
  const showStaticStyles = hasStaticStyles && (!selectedFont.isVariableFont || !hasVariableAxes);
  const showStylesInfoTile = !hasStaticStyles && !hasVariableAxes;
  
  const safeFontFamily = fontFamilyValue || selectedFont.name || 'sans-serif';

  const bgForStyleCells = previewBackgroundImage ? 'transparent' : (backgroundColor || 'transparent');

  /** Подписи и рамки под фон превью; rgba учитывается при смешивании с белой подложкой */
  const chrome = useMemo(() => getPreviewChromeFromBackground(backgroundColor), [backgroundColor]);
  const activeStyleName =
    findStyleInfoByWeightAndStyle(selectedFont.currentWeight, selectedFont.currentStyle)?.name || 'Regular';
  const hasAnyStyleContent = Boolean(showStaticStyles || hasVariableAxes);
  const titleUnderlineClass = chrome.isDark ? 'border-white/25' : 'border-gray-900/35';

  return (
    <div className="relative flex min-h-full min-w-0 max-w-full flex-col px-4 pb-8 pt-4 sm:px-6">
      <div className="min-w-0 max-w-full">
        {/* Статические стили шрифта */}
        {showStaticStyles && (
          <div className="mb-8 overflow-x-hidden">
            <h3 className={`${chrome.sectionTitle} mb-3`}>Доступные стили</h3>

          {/* Обычные стили */}
          {selectedFont.availableStyles.filter(s => s.style === 'normal').length > 0 && (
            <div className="mb-8">
              <h4 className={`${chrome.subsectionTitle} mb-2`}>Normal</h4>
              <div className="space-y-4">
                {selectedFont.availableStyles
                  .filter(style => style.style === 'normal')
                  .sort((a, b) => a.weight - b.weight)
                  .map((style, index) => (
                    <div key={`static-normal-${index}`} className={`min-w-0 border-t ${chrome.divider} pt-4`}>
                      <div className="flex min-w-0 items-baseline justify-between gap-3">
                        <div className={`min-w-0 truncate ${chrome.rowTitle}`}>{style.name}</div>
                        <div className={`shrink-0 ${chrome.meta}`}>Weight: {style.weight}</div>
                      </div>
                      <EditableText 
                        style={{
                          fontFamily: safeFontFamily,
                          fontSize: `${stylesFontSize}px`,
                          fontWeight: style.weight,
                          fontStyle: 'normal',
                          letterSpacing: letterSpacingValue,
                          color: textColor,
                          backgroundColor: bgForStyleCells,
                          fontVariationSettings: 'normal',
                          direction: textDirection,
                          textAlign: textAlignment,
                          textTransform: textCase,
                          textDecorationLine: textDecoration === 'none' ? 'none' : textDecoration,
                          whiteSpace: 'nowrap',
                          overflow: 'visible',
                          maxWidth: '100%',
                          scrollBehavior: 'auto',
                        }}
                        isStyles={true}
                        syncId={`styles-static-normal-${index}`}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Курсивные стили */}
          {selectedFont.availableStyles.filter(s => s.style === 'italic').length > 0 && (
            <div>
              <h4 className={`${chrome.subsectionTitle} mb-2`}>Italic</h4>
              <div className="space-y-4">
                {selectedFont.availableStyles
                  .filter(style => style.style === 'italic')
                  .sort((a, b) => a.weight - b.weight)
                  .map((style, index) => (
                    <div key={`static-italic-${index}`} className={`min-w-0 border-t ${chrome.divider} pt-4`}>
                      <div className="flex min-w-0 items-baseline justify-between gap-3">
                        <div className={`min-w-0 truncate ${chrome.rowTitle}`}>{style.name}</div>
                        <div className={`shrink-0 ${chrome.meta}`}>Weight: {style.weight}, Style: italic</div>
                      </div>
                      <EditableText 
                        style={{
                          fontFamily: safeFontFamily,
                          fontSize: `${stylesFontSize}px`,
                          fontWeight: style.weight,
                          fontStyle: 'italic',
                          letterSpacing: letterSpacingValue,
                          color: textColor,
                          backgroundColor: bgForStyleCells,
                          fontVariationSettings: 'normal',
                          direction: textDirection,
                          textAlign: textAlignment,
                          textTransform: textCase,
                          textDecorationLine: textDecoration === 'none' ? 'none' : textDecoration,
                          whiteSpace: 'nowrap',
                          overflow: 'visible',
                          maxWidth: '100%',
                          scrollBehavior: 'auto',
                        }}
                        isStyles={true}
                        syncId={`styles-static-italic-${index}`}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Вариативные возможности шрифта */}
      {hasVariableAxes && (
        <div className="min-w-0 max-w-full">

          {/* Группа Weight стилей */}
          {selectedFont.variableAxes['wght'] !== undefined && (
            <div className="mb-8">
              <h4 className={`${chrome.subsectionTitle} mb-2`}>Вес (wght)</h4>
              <div className="space-y-4">
                {WEIGHT_VARIATIONS.map((style, index) => (
                  <div key={`var-weight-${index}`} className={`min-w-0 border-t ${chrome.divider} pt-4`}>
                    <div className="flex min-w-0 items-baseline justify-between gap-3">
                      <div className={`min-w-0 truncate ${chrome.rowTitle}`}>{style.name}</div>
                      <div className={`shrink-0 ${chrome.meta}`}>Weight: {style.wght}</div>
                    </div>
                    <EditableText 
                      style={{
                        fontFamily: safeFontFamily,
                        fontSize: `${stylesFontSize}px`,
                        color: textColor,
                        backgroundColor: bgForStyleCells,
                        letterSpacing: letterSpacingValue,
                        fontVariationSettings: generateVariationSettings(style, selectedFont.variableAxes),
                        direction: textDirection,
                        textAlign: textAlignment,
                        textTransform: textCase,
                        whiteSpace: 'nowrap',
                        overflow: 'visible',
                        maxWidth: '100%',
                        scrollBehavior: 'auto',
                      }}
                      isStyles={true}
                      syncId={`styles-var-weight-${index}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Группа Italic/Slant стилей */}
          {(selectedFont.variableAxes['ital'] !== undefined || selectedFont.variableAxes['slnt'] !== undefined) && (
            <div className="mb-8 ">
              <h4 className={`${chrome.subsectionTitle} mb-2`}>Курсив / наклон</h4>
              <div className="space-y-4">
                {ITALIC_VARIATIONS.map((style, index) => (
                  <div key={`var-italic-${index}`} className={`min-w-0 border-t ${chrome.divider} pt-4`}>
                    <div className="mb-2 flex min-w-0 items-baseline justify-between gap-3">
                      <div className={`min-w-0 truncate ${chrome.rowTitle}`}>{style.name}</div>
                      <div className={`min-w-0 max-w-[min(100%,18rem)] break-words text-right text-xs leading-snug sm:max-w-[55%] ${chrome.meta}`}>
                        Weight: {style.wght},
                        {selectedFont.variableAxes['ital'] !== undefined && ` Italic: ${style.ital},`}
                        {selectedFont.variableAxes['slnt'] !== undefined && ` Slant: ${style.slnt}`}
                      </div>
                    </div>
                    <EditableText 
                      style={{
                        fontFamily: safeFontFamily,
                        fontSize: `${stylesFontSize}px`,
                        color: textColor,
                        backgroundColor: bgForStyleCells,
                        letterSpacing: letterSpacingValue,
                        fontVariationSettings: generateVariationSettings(style, selectedFont.variableAxes),
                        direction: textDirection,
                        textAlign: textAlignment,
                        textTransform: textCase,
                        whiteSpace: 'nowrap',
                        overflow: 'visible',
                        maxWidth: '100%',
                        scrollBehavior: 'auto',
                      }}
                      isStyles={true}
                      syncId={`styles-var-italic-${index}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Другие вариативные оси */}
          {Object.keys(selectedFont.variableAxes)
            .filter(axis => !['wght', 'ital', 'slnt'].includes(axis))
            .map(axis => (
              <div key={axis} className="mb-8 min-w-0 max-w-full">
                <h4 className={`${chrome.subsectionTitle} mb-2`}>Ось {axis.toUpperCase()}</h4>
                <div className="space-y-4">
                  {AXIS_RATIOS.map((ratio, index) => {
                    const axisInfo = selectedFont.variableAxes[axis];
                    const value = axisInfo.min + (axisInfo.max - axisInfo.min) * ratio;
                    const style = { [axis]: value };
                    
                    return (
                      <div key={`var-${axis}-${index}`} className={`min-w-0 border-t ${chrome.divider} pt-4`}>
                        <div className="flex min-w-0 items-baseline justify-between gap-3">
                          <div className={`min-w-0 truncate ${chrome.rowTitle}`}>
                            {axis.toUpperCase()}: {value}
                          </div>
                        </div>
                        <EditableText 
                          style={{
                            fontFamily: safeFontFamily,
                            fontSize: `${stylesFontSize}px`,
                            color: textColor,
                            backgroundColor: bgForStyleCells,
                            letterSpacing: letterSpacingValue,
                            fontVariationSettings: generateVariationSettings(style, selectedFont.variableAxes),
                            direction: textDirection,
                            textAlign: textAlignment,
                            textTransform: textCase,
                            whiteSpace: 'nowrap',
                            overflow: 'visible',
                            maxWidth: '100%',
                            scrollBehavior: 'auto',
                          }}
                          isStyles={true}
                          syncId={`styles-var-${axis}-${index}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={hasAnyStyleContent ? 'mt-auto pt-6' : 'flex flex-1 items-center justify-center py-10'}>
        <div
          className={[
            'mx-auto flex w-full flex-col items-stretch justify-center gap-4',
            showStylesInfoTile ? 'max-w-5xl sm:flex-row' : 'max-w-3xl',
          ].join(' ')}
        >
          {showStylesInfoTile ? (
            <div className={`${chrome.noteBox} flex min-w-0 flex-1 items-start gap-3`}>
                <div className={`mt-0.5 ${chrome.isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                <EditToolbarIcon src={alarmIconUrl} className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`${chrome.noteStrong} w-full border-b ${titleUnderlineClass} pb-2 text-sm uppercase tracking-wide`}>
                  Информация о стилях
                </div>
                <div className={`${chrome.noteText} mt-2`}>
                  Показаны обнаруженные стили и/или вариативные возможности. Текущий стиль: {activeStyleName}.
                </div>
              </div>
            </div>
          ) : null}

          <div className={`${chrome.noteBox} flex min-w-0 ${showStylesInfoTile ? 'flex-1' : ''} items-start gap-3`}>
            <div className={`mt-0.5 ${chrome.isDark ? 'text-gray-200' : 'text-gray-900'}`}>
              <EditToolbarIcon src={ideaIconUrl} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`${chrome.noteStrong} w-full border-b ${titleUnderlineClass} pb-2 text-sm uppercase tracking-wide`}>
                Примечание
              </div>
              <div className={`${chrome.noteText} mt-2`}>
                Показаны только обнаруженные стили и возможности шрифта. Если вы не видите некоторые стили или настройки,
                возможно, шрифт их не поддерживает или они не были корректно распознаны.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StylesMode;
