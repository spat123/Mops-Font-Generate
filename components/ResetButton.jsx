import React from 'react';
import { useFontContext } from '../contexts/FontContext';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from '../utils/appNotify';
import { Tooltip } from './ui/Tooltip';

function ResetButton({ onResetSelectedFont }) {
  const { resetApplicationState } = useFontContext();
  const { resetSettings } = useSettings();

  const handleResetClick = () => {
    if (onResetSelectedFont) {
      onResetSelectedFont();
      return;
    }

    if (window.confirm('Вы уверены, что хотите сбросить все настройки и удалить все локально сохраненные шрифты? Это действие необратимо.')) {
      try {
        resetSettings();
        resetApplicationState();
      } catch (error) {
        console.error('[ResetButton] Ошибка при выполнении сброса:', error);
        toast.error('Ошибка при сбросе приложения.');
      }
    }
  };

  const buttonText = onResetSelectedFont ? 'Сбросить настройки' : 'Сбросить всё состояние';
  const title = onResetSelectedFont
    ? 'Сбросить настройки выбранного шрифта'
    : 'Сбросить все настройки приложения и удалить локальные шрифты';

  return (
    <Tooltip
      as="button"
      type="button"
      onClick={handleResetClick}
      className="w-full items-center justify-center text-center text-xs font-medium text-gray-400 opacity-50 uppercase transition-colors hover:text-gray-800 hover:opacity-100 hover:border-accent"
      content={title}
      aria-label={title}
    >
      {buttonText}
    </Tooltip>
  );
}

export default ResetButton; 

