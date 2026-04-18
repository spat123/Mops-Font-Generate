import React from 'react';
import { useFontContext } from '../contexts/FontContext';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'react-toastify';

const ResetButton = () => {
  // Получаем функции сброса из контекстов
  const { resetApplicationState } = useFontContext();
  const { resetSettings } = useSettings();

  const handleResetClick = () => {
    // Запрашиваем подтверждение у пользователя
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

  return (
    <button
      type="button"
      onClick={handleResetClick}
      className="w-full min-h-0 rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400/40 focus:ring-offset-1"
      title="Сбросить все настройки приложения и удалить локальные шрифты"
    >
      Сбросить всё состояние
    </button>
  );
};

export default ResetButton; 