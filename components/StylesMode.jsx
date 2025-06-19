import React from 'react';
import EditableText from './EditableText';
import { findStyleInfoByWeightAndStyle } from '../utils/fontUtilsCommon';
import { useSettings } from '../contexts/SettingsContext';

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
  
  return (
    <div className="pt-8 styles-mode">
      {/* Статические стили шрифта */}
      {showStaticStyles && (
        <div className="mb-8 overflow-x-hidden">
          <h3 className="text-lg font-medium text-blue-700 mb-4 pl-8 pr-8">Доступные стили</h3>
          
          {/* Обычные стили */}
          {selectedFont.availableStyles.filter(s => s.style === 'normal').length > 0 && (
            <div className="mb-8">
              <h4 className="text-md font-medium text-blue-600 mb-2 pl-8 pr-8">Normal</h4>
              <div className="space-y-4">
                {selectedFont.availableStyles
                  .filter(style => style.style === 'normal')
                  .sort((a, b) => a.weight - b.weight)
                  .map((style, index) => (
                    <div key={`static-normal-${index}`} className="border-t border-blue-100 pt-4">
                      <div className="flex justify-between items-baseline pr-8 pl-8">
                        <div className="text-sm font-medium text-blue-700">{style.name}</div>
                        <div className="text-xs text-gray-500">Weight: {style.weight}</div>
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
              <h4 className="text-md font-medium text-blue-600 mb-2 pl-8 pr-8">Italic</h4>
              <div className="space-y-4">
                {selectedFont.availableStyles
                  .filter(style => style.style === 'italic')
                  .sort((a, b) => a.weight - b.weight)
                  .map((style, index) => (
                    <div key={`static-italic-${index}`} className="border-t border-blue-100 pt-4">
                      <div className="flex justify-between items-baseline pr-8 pl-8">
                        <div className="text-sm font-medium text-blue-700">{style.name}</div>
                        <div className="text-xs text-gray-500">Weight: {style.weight}, Style: italic</div>
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
          <h3 className="text-lg font-medium text-blue-700 mb-4 pl-8 pr-8">Вариативные возможности</h3>
          
          {/* Группа Weight стилей */}
          {selectedFont.variableAxes['wght'] !== undefined && (
            <div className="mb-8">
              <h4 className="text-md font-medium text-blue-600 mb-2 pl-8 pr-8">Weight Variations</h4>
              <div className="space-y-4">
                {weightVariations.map((style, index) => (
                  <div key={`var-weight-${index}`} className="border-t border-blue-100 pt-4">
                    <div className="flex justify-between items-baseline pl-8 pr-8">
                      <div className="text-sm font-medium text-blue-700">{style.name}</div>
                      <div className="text-xs text-gray-500">Weight: {style.wght}</div>
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
              <h4 className="text-md font-medium text-blue-600 mb-2 pl-8 pr-8">Italic/Slant Variations</h4>
              <div className="space-y-4">
                {italicVariations.map((style, index) => (
                  <div key={`var-italic-${index}`} className="border-t border-blue-100 pt-4">
                    <div className="flex justify-between items-baseline mb-2 pl-8 pr-8">
                      <div className="text-sm font-medium text-blue-700">{style.name}</div>
                      <div className="text-xs text-gray-500">
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
                <h4 className="text-md font-medium text-blue-600 mb-2 pl-8 pr-8">Axis: {axis.toUpperCase()}</h4>
                <div className="space-y-4">
                  {axisRatios.map((ratio, index) => {
                    const axisInfo = selectedFont.variableAxes[axis];
                    const value = axisInfo.min + (axisInfo.max - axisInfo.min) * ratio;
                    const style = { [axis]: value };
                    
                    return (
                      <div key={`var-${axis}-${index}`} className="border-t border-blue-100 pt-4">
                        <div className="flex justify-between items-baseline pr-8 pl-8">
                          <div className="text-sm font-medium text-blue-700">{axis.toUpperCase()}: {value}</div>
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
        <div className="mt-8 pl-8 pr-8">
           <div className="bg-blue-50 p-4 rounded-md">
             <p className="text-sm text-blue-700">
               <strong>Информация о стилях:</strong> Не удалось определить доступные статические стили или вариативные возможности для этого шрифта.
               Отображается текущий активный стиль: {findStyleInfoByWeightAndStyle(selectedFont.currentWeight, selectedFont.currentStyle).name}.
             </p>
           </div>
        </div>
      )}
      
      <div className="mt-8 pl-8 pr-8 pb-8">
        <div className="bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Примечание:</strong> Показаны только обнаруженные стили и возможности шрифта.
            Если вы не видите некоторые стили или настройки, возможно, шрифт их не поддерживает или они не были корректно распознаны.
          </p>
        </div>
      </div>
    </div>
  );
}

export default StylesMode;