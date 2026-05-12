import React from 'react';
import toast from 'react-hot-toast';

/**
 * Toast notification utilities for consistent UI feedback
 * Replaces window.alert() with professional toast messages
 */

export const toastSuccess = (message, duration = 3000) => {
  return toast.success(message, {
    duration,
    position: 'top-right',
    style: {
      background: '#10b981',
      color: '#fff',
      borderRadius: '8px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
    },
  });
};

export const toastError = (message, duration = 4000) => {
  return toast.error(message, {
    duration,
    position: 'top-right',
    style: {
      background: '#ef4444',
      color: '#fff',
      borderRadius: '8px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
    },
  });
};

export const toastWarning = (message, duration = 4000) => {
  return toast.custom(
    () =>
      React.createElement(
        'div',
        { className: 'flex items-center gap-3' },
        React.createElement('div', { className: 'text-white text-xl' }, '⚠️'),
        React.createElement('span', null, message)
      ),
    {
      duration,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: '#fff',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
      },
    }
  );
};

export const toastInfo = (message, duration = 3000) => {
  return toast.custom(
    () =>
      React.createElement(
        'div',
        { className: 'flex items-center gap-3' },
        React.createElement('div', { className: 'text-blue-600 text-xl' }, 'ℹ️'),
        React.createElement('span', null, message)
      ),
    {
      duration,
      position: 'top-right',
      style: {
        background: '#dbeafe',
        color: '#1e40af',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
      },
    }
  );
};

export const toastLoading = (message) => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#374151',
      color: '#fff',
      borderRadius: '8px',
      padding: '16px',
      fontSize: '14px',
      fontWeight: '500',
    },
  });
};

export const updateToast = (toastId, message, type = 'success') => {
  const styles = {
    success: {
      background: '#10b981',
      color: '#fff',
    },
    error: {
      background: '#ef4444',
      color: '#fff',
    },
    info: {
      background: '#dbeafe',
      color: '#1e40af',
    },
  };

  toast.custom(
    () =>
      React.createElement(
        'div',
        {
          style: {
            background: styles[type].background,
            color: styles[type].color,
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          className: 'rounded-lg px-4 py-3 text-sm font-medium',
        },
        message
      ),
    {
      id: toastId,
      duration: 3000,
      position: 'top-right',
    }
  );
};

/**
 * Promise-based toast for async operations
 * Usage: toast.promise(asyncFn, { loading: '...', success: '...', error: '...' })
 */
export const toastPromise = (promise, messages) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading || 'Processing...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong',
    },
    {
      position: 'top-right',
      style: {
        borderRadius: '8px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
      },
    }
  );
};

export default {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  loading: toastLoading,
  update: updateToast,
  promise: toastPromise,
};
