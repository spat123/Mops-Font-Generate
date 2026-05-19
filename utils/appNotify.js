import { toast as rtToast } from 'react-toastify';
import { SquareToast } from '../components/ui/SquareToast';

/**
 * Единая точка уведомлений приложения.
 * Постепенно переводим все вызовы на импорт из этого модуля.
 */
/**
 * ВАЖНО: В приложении используем только `toast.<type>()`.
 * Успех/лоадинг — квадратные без текста (по запросу UX).
 * Ошибки/инфо/варнинги оставляем текстовыми.
 */
export const toast = {
  info: (...args) => rtToast.info(...args),
  warning: (...args) => rtToast.warning(...args),
  error: (...args) => rtToast.error(...args),
  success: (_message, opts = {}) => squareToast.success(opts),
  loading: (opts = {}) => squareToast.loading(opts),
  dismiss: (...args) => rtToast.dismiss(...args),
  update: (...args) => rtToast.update(...args),
};

const SQUARE_TOAST_OPTIONS = {
  className: 'app-toast-square',
  closeButton: false,
  hideProgressBar: true,
  pauseOnHover: false,
  draggable: false,
  closeOnClick: false,
};

export const squareToast = {
  loading: (opts = {}) =>
    rtToast.loading(<SquareToast kind="loading" />, {
      ...SQUARE_TOAST_OPTIONS,
      autoClose: false,
      ...opts,
    }),
  success: (opts = {}) =>
    (() => {
      const autoCloseMs =
        opts && typeof opts.autoClose === 'number' ? opts.autoClose : opts?.autoClose === false ? false : 1200;
      const id = rtToast(<SquareToast kind="success" />, {
        ...SQUARE_TOAST_OPTIONS,
        type: 'success',
        autoClose: autoCloseMs === false ? false : 1200,
        ...opts,
      });
      if (autoCloseMs !== false && typeof window !== 'undefined') {
        window.setTimeout(() => rtToast.dismiss(id), Math.max(0, Number(autoCloseMs) || 1200) + 250);
      }
      return id;
    })(),
  error: (opts = {}) =>
    (() => {
      const autoCloseMs =
        opts && typeof opts.autoClose === 'number' ? opts.autoClose : opts?.autoClose === false ? false : 1800;
      const id = rtToast(<SquareToast kind="error" />, {
        ...SQUARE_TOAST_OPTIONS,
        type: 'error',
        autoClose: autoCloseMs === false ? false : 1800,
        ...opts,
      });
      if (autoCloseMs !== false && typeof window !== 'undefined') {
        window.setTimeout(() => rtToast.dismiss(id), Math.max(0, Number(autoCloseMs) || 1800) + 250);
      }
      return id;
    })(),
  updateToSuccess: (id, opts = {}) =>
    (rtToast.update(id, {
      render: <SquareToast kind="success" />,
      ...SQUARE_TOAST_OPTIONS,
      type: 'success',
      isLoading: false,
      autoClose: 1200,
      ...opts,
    }),
    typeof window !== 'undefined' && window.setTimeout(() => rtToast.dismiss(id), 1400)),
  updateToError: (id, opts = {}) =>
    (rtToast.update(id, {
      render: <SquareToast kind="error" />,
      ...SQUARE_TOAST_OPTIONS,
      type: 'error',
      isLoading: false,
      autoClose: 1800,
      ...opts,
    }),
    typeof window !== 'undefined' && window.setTimeout(() => rtToast.dismiss(id), 2200)),
};

export const appNotify = {
  info: (...args) => toast.info(...args),
  success: (...args) => toast.success(...args),
  error: (...args) => toast.error(...args),
  warning: (...args) => toast.warning(...args),
};
