import React from 'react';
import { toast as rtToast, type Id, type ToastOptions, type UpdateOptions } from 'react-toastify';
import { SquareToast } from '../components/ui/SquareToast';

type SquareToastOptions = ToastOptions & { autoClose?: number | false };

/**
 * Единая точка уведомлений приложения.
 */
export const toast = {
  info: (...args: Parameters<typeof rtToast.info>) => rtToast.info(...args),
  warning: (...args: Parameters<typeof rtToast.warning>) => rtToast.warning(...args),
  error: (...args: Parameters<typeof rtToast.error>) => rtToast.error(...args),
  success: (_message?: unknown, opts: SquareToastOptions = {}) => squareToast.success(opts),
  loading: (opts: SquareToastOptions = {}) => squareToast.loading(opts),
  dismiss: (...args: Parameters<typeof rtToast.dismiss>) => rtToast.dismiss(...args),
  update: (...args: Parameters<typeof rtToast.update>) => rtToast.update(...args),
  warn: (...args: Parameters<typeof rtToast.warning>) => rtToast.warning(...args),
};

const SQUARE_TOAST_OPTIONS: ToastOptions = {
  className: 'app-toast-square',
  closeButton: false,
  hideProgressBar: true,
  pauseOnHover: false,
  draggable: false,
  closeOnClick: false,
};

export const squareToast = {
  loading: (opts: SquareToastOptions = {}) =>
    rtToast.loading(<SquareToast kind="loading" ariaLabel="" />, {
      ...SQUARE_TOAST_OPTIONS,
      autoClose: false,
      ...opts,
    }),
  success: (opts: SquareToastOptions = {}) => {
    const autoCloseMs =
      opts && typeof opts.autoClose === 'number'
        ? opts.autoClose
        : opts?.autoClose === false
          ? false
          : 1200;
    const id = rtToast(<SquareToast kind="success" ariaLabel="" />, {
      ...SQUARE_TOAST_OPTIONS,
      type: 'success',
      autoClose: autoCloseMs === false ? false : 1200,
      ...opts,
    });
    if (autoCloseMs !== false && typeof window !== 'undefined') {
      window.setTimeout(() => rtToast.dismiss(id), Math.max(0, Number(autoCloseMs) || 1200) + 250);
    }
    return id;
  },
  error: (opts: SquareToastOptions = {}) => {
    const autoCloseMs =
      opts && typeof opts.autoClose === 'number'
        ? opts.autoClose
        : opts?.autoClose === false
          ? false
          : 1800;
    const id = rtToast(<SquareToast kind="error" ariaLabel="" />, {
      ...SQUARE_TOAST_OPTIONS,
      type: 'error',
      autoClose: autoCloseMs === false ? false : 1800,
      ...opts,
    });
    if (autoCloseMs !== false && typeof window !== 'undefined') {
      window.setTimeout(() => rtToast.dismiss(id), Math.max(0, Number(autoCloseMs) || 1800) + 250);
    }
    return id;
  },
  updateToSuccess: (id: Id, opts: UpdateOptions = {}) => {
    rtToast.update(id, {
      render: <SquareToast kind="success" ariaLabel="" />,
      ...SQUARE_TOAST_OPTIONS,
      type: 'success',
      isLoading: false,
      autoClose: 1200,
      ...opts,
    });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => rtToast.dismiss(id), 1400);
    }
  },
  updateToError: (id: Id, opts: UpdateOptions = {}) => {
    rtToast.update(id, {
      render: <SquareToast kind="error" ariaLabel="" />,
      ...SQUARE_TOAST_OPTIONS,
      type: 'error',
      isLoading: false,
      autoClose: 1800,
      ...opts,
    });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => rtToast.dismiss(id), 2200);
    }
  },
};

export const appNotify = {
  info: (...args: Parameters<typeof toast.info>) => toast.info(...args),
  success: (...args: Parameters<typeof toast.success>) => toast.success(...args),
  error: (...args: Parameters<typeof toast.error>) => toast.error(...args),
  warning: (...args: Parameters<typeof toast.warning>) => toast.warning(...args),
};
