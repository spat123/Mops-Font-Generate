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
  
  const safeFontFamily = fontFamilyValue || selectedFont.name || 'sans-serif';

  const bgForStyleCells = previewBackgroundImage ? 'transparent' : (backgroundColor || 'transparent');

  /** Подписи и рамки под фон превью; rgba учитывается при смешивании с белой подложкой */
  const chrome = useMemo(() => getPreviewChromeFromBackground(backgroundColor), [backgroundColor]);

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden px-4 pb-8 pt-4 sm:px-6">
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
                          overflow: 'hidden',
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
                          overflow: 'hidden',
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
        <div className="min-w-0 max-w-full overflow-x-hidden">

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
                        overflow: 'hidden',
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
                        overflow: 'hidden',
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
                            overflow: 'hidden',
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
      
      {/* Сообщение, если нет ни статических, ни вариативных стилей */}
      {!showStaticStyles && !hasVariableAxes && (
        <div className="mt-6">
           <div className={chrome.noteBox}>
             <p className={chrome.noteText}>
               <span className={chrome.noteStrong}>Информация о стилях:</span>{' '}
               Не удалось определить доступные статические стили или вариативные возможности для этого шрифта.
               Отображается текущий активный стиль: {findStyleInfoByWeightAndStyle(selectedFont.currentWeight, selectedFont.currentStyle).name}.
             </p>
           </div>
        </div>
      )}
      
      <div className="mt-6 pb-2">
        <div className={chrome.noteBox}>
          <p className={chrome.noteText}>
            <span className={chrome.noteStrong}>Примечание:</span>{' '}
            Показаны только обнаруженные стили и возможности шрифта.
            Если вы не видите некоторые стили или настройки, возможно, шрифт их не поддерживает или они не были корректно распознаны.
          </p>
        </div>
      </div>
    </div>
  );
}

export default StylesMode;
