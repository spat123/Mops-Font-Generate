import React from 'react';
import { useFontContext } from '../contexts/FontContext';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'react-toastify';

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

  const buttonText = onResetSelectedFont ? 'Сбросить настройки шрифта' : 'Сбросить всё состояние';
  const title = onResetSelectedFont
    ? 'Сбросить настройки выбранного шрифта'
    : 'Сбросить все настройки приложения и удалить локальные шрифты';

  return (
    <button
      type="button"
      onClick={handleResetClick}
      className="w-full h-full text-center text-xs font-medium text-gray-600 transition-colors hover:bg-accent hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-400/40 focus:ring-offset-1"
      title={title}
    >
      {buttonText}
    </button>
  );
}

export default ResetButton; 