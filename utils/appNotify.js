import { toast as rtToast } from 'react-toastify';

/**
 * Единая точка уведомлений приложения.
 * Постепенно переводим все вызовы на импорт из этого модуля.
 */
export const toast = rtToast;

export const appNotify = {
  info: (...args) => rtToast.info(...args),
  success: (...args) => rtToast.success(...args),
  error: (...args) => rtToast.error(...args),
  warning: (...args) => rtToast.warning(...args),
};
