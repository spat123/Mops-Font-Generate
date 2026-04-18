import React, { useMemo } from 'react';
import EditableText from './EditableText';
import { findStyleInfoByWeightAndStyle } from '../utils/fontUtilsCommon';
import { useSettings } from '../contexts/SettingsContext';
import { getPreviewChromeFromBackground } from '../utils/previewChromeTheme';

/**
 * Генерирует строку значений font-variation-settings на основе объекта стилей и поддерживаемых осей
 * @param {Object} styleObj - Объект с настройками стилей (wght, ital, slnt и т.д.)
 * @param {Object} supportedAxes - Объект с поддерживаемыми осями (wght, ital, slnt и т.д.)
 * @returns {string} Строка с настройками вариативных осей
 */
const generateVariationSettings = (styleObj, supportedAxes) => {
  if (!styleObj || !supportedAxes) return '';
  
  const settings = [];
  
  // Добавляем поддерживаемые оси
  if (supportedAxes['wght'] !== undefined && styleObj.wght !== undefined) {
    settings.push(`"wght" ${styleObj.wght}`);
  }
  
  if (supportedAxes['ital'] !== undefined && styleObj.ital !== undefined) {
    settings.push(`"ital" ${styleObj.ital}`);
  }
  
  if (supportedAxes['slnt'] !== undefined && styleObj.slnt !== undefined) {
    settings.push(`"slnt" ${styleObj.slnt}`);
  }
  
  // Добавляем другие оси, если они есть в styleObj
  Object.entries(styleObj).forEach(([key, value]) => {
    if (!['wght', 'ital', 'slnt'].includes(key) && supportedAxes[key] !== undefined) {
      settings.push(`"${key}" ${value}`);
    }
  });
  
  return settings.join(', ');
};

/**
 * Компонент для режима отображения стилей шрифта
 * 
 * @param {Object} props - Свойства компонента
 * @param {Object} props.selectedFont - Выбранный шрифт
 * @param {string} props.fontFamilyValue - Семейство шрифтов (передаваемое из FontPreview)
 * @param {Array<Object>} props.weightVariations - Предустановленные вариации веса
 * @param {Array<Object>} props.italicVariations - Предустановленные вариации курсива/наклона
 * @param {Array<number>} props.axisRatios - Соотношения для других осей
 * @param {Function} props.generateVariationSettings - Хелпер для генерации настроек
 */
function StylesMode({
  selectedFont,
  fontFamilyValue,
  weightVariations,
  italicVariations,
  axisRatios,
  generateVariationSettings
}) {
  const { 
    text, setText, 
    fontSize, 
    letterSpacing,
    textColor, 
    backgroundColor, 
    textDirection, 
    textAlignment, 
    textCase 
  } = useSettings();

  if (!selectedFont) return null;

  const letterSpacingValue = `${(letterSpacing / 100) * 0.5}em`;

  const hasStaticStyles = selectedFont.availableStyles && selectedFont.availableStyles.length > 1;
  const hasVariableAxes = selectedFont.isVariableFont && selectedFont.variableAxes && Object.keys(selectedFont.variableAxes).length > 0;
  const showStaticStyles = hasStaticStyles && (!selectedFont.isVariableFont || !hasVariableAxes);
  
  const safeFontFamily = fontFamilyValue || selectedFont.name || 'sans-serif';

  /** Подписи и рамки под фон превью; rgba учитывается при смешивании с белой подложкой */
  const chrome = useMemo(() => getPreviewChromeFromBackground(backgroundColor), [backgroundColor]);

  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
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
                    <div key={`static-normal-${index}`} className={`border-t ${chrome.divider} pt-4`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <div className={chrome.rowTitle}>{style.name}</div>
                        <div className={chrome.meta}>Weight: {style.weight}</div>
                      </div>
                      <EditableText 
                        style={{
                          fontFamily: safeFontFamily,
                          fontSize: `${fontSize}px`,
                          fontWeight: style.weight,
                          fontStyle: 'normal',
                          letterSpacing: letterSpacingValue,
                          color: textColor,
                          backgroundColor: backgroundColor || 'transparent',
                          fontVariationSettings: 'normal',
                          direction: textDirection,
                          textAlign: textAlignment,
                          textTransform: textCase,
                          whiteSpace: 'nowrap',
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
                    <div key={`static-italic-${index}`} className={`border-t ${chrome.divider} pt-4`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <div className={chrome.rowTitle}>{style.name}</div>
                        <div className={chrome.meta}>Weight: {style.weight}, Style: italic</div>
                      </div>
                      <EditableText 
                        style={{
                          fontFamily: safeFontFamily,
                          fontSize: `${fontSize}px`,
                          fontWeight: style.weight,
                          fontStyle: 'italic',
                          letterSpacing: letterSpacingValue,
                          color: textColor,
                          backgroundColor: backgroundColor || 'transparent',
                          fontVariationSettings: 'normal',
                          direction: textDirection,
                          textAlign: textAlignment,
                          textTransform: textCase,
                          whiteSpace: 'nowrap',
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
        <div className="overflow-x-hidden">
          <h3 className={`${chrome.sectionTitle} mb-3`}>Вариативные возможности</h3>

          {/* Группа Weight стилей */}
          {selectedFont.variableAxes['wght'] !== undefined && (
            <div className="mb-8">
              <h4 className={`${chrome.subsectionTitle} mb-2`}>Вес (wght)</h4>
              <div className="space-y-4">
                {weightVariations.map((style, index) => (
                  <div key={`var-weight-${index}`} className={`border-t ${chrome.divider} pt-4`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className={chrome.rowTitle}>{style.name}</div>
                      <div className={chrome.meta}>Weight: {style.wght}</div>
                    </div>
                    <EditableText 
                      style={{
                        fontFamily: safeFontFamily,
                        fontSize: `${fontSize}px`,
                        color: textColor,
                        backgroundColor: backgroundColor || 'transparent',
                        letterSpacing: letterSpacingValue,
                        fontVariationSettings: generateVariationSettings(style, selectedFont.variableAxes),
                        direction: textDirection,
                        textAlign: textAlignment,
                        textTransform: textCase,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
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
                {italicVariations.map((style, index) => (
                  <div key={`var-italic-${index}`} className={`border-t ${chrome.divider} pt-4`}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <div className={chrome.rowTitle}>{style.name}</div>
                      <div className={chrome.meta}>
                        Weight: {style.wght},
                        {selectedFont.variableAxes['ital'] !== undefined && ` Italic: ${style.ital},`}
                        {selectedFont.variableAxes['slnt'] !== undefined && ` Slant: ${style.slnt}`}
                      </div>
                    </div>
                    <EditableText 
                      style={{
                        fontFamily: safeFontFamily,
                        fontSize: `${fontSize}px`,
                        color: textColor,
                        backgroundColor: backgroundColor || 'transparent',
                        letterSpacing: letterSpacingValue,
                        fontVariationSettings: generateVariationSettings(style, selectedFont.variableAxes),
                        direction: textDirection,
                        textAlign: textAlignment,
                        textTransform: textCase,
                        whiteSpace: 'nowrap',
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
              <div key={axis} className="mb-8">
                <h4 className={`${chrome.subsectionTitle} mb-2`}>Ось {axis.toUpperCase()}</h4>
                <div className="space-y-4">
                  {axisRatios.map((ratio, index) => {
                    const axisInfo = selectedFont.variableAxes[axis];
                    const value = axisInfo.min + (axisInfo.max - axisInfo.min) * ratio;
                    const style = { [axis]: value };
                    
                    return (
                      <div key={`var-${axis}-${index}`} className={`border-t ${chrome.divider} pt-4`}>
                        <div className="flex items-baseline justify-between gap-3">
                          <div className={chrome.rowTitle}>
                            {axis.toUpperCase()}: {value}
                          </div>
                        </div>
                        <EditableText 
                          style={{
                            fontFamily: safeFontFamily,
                            fontSize: `${fontSize}px`,
                            color: textColor,
                            backgroundColor: backgroundColor || 'transparent',
                            letterSpacing: letterSpacingValue,
                            fontVariationSettings: generateVariationSettings(style, selectedFont.variableAxes),
                            direction: textDirection,
                            textAlign: textAlignment,
                            textTransform: textCase,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
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