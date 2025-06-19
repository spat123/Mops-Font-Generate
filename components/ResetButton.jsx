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
        console.log('[ResetButton] Начинаем сброс...');
        // Вызываем сброс настроек интерфейса
        resetSettings();
        console.log('[ResetButton] Настройки SettingsContext сброшены.');
        // Вызываем сброс состояния шрифтов (включая IndexedDB и localStorage для шрифтов)
        resetApplicationState(); // Эта функция уже содержит toast.success
        console.log('[ResetButton] Состояние useFontManager сброшено.');
        // Дополнительно можно перезагрузить страницу для чистоты, но пока не будем
        // window.location.reload();
      } catch (error) {
        console.error('[ResetButton] Ошибка при выполнении сброса:', error);
        toast.error('Ошибка при сбросе приложения.');
      }
    } else {
      console.log('[ResetButton] Сброс отменен пользователем.');
    }
  };

  return (
    <button
      onClick={handleResetClick}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 w-full text-sm"
      title="Сбросить все настройки приложения и удалить локальные шрифты"
    >
      Сбросить всё состояние
    </button>
  );
};

export default ResetButton; 