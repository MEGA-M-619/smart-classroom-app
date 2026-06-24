/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => dismiss(id), 4200);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({
    toast,
    success: (message) => toast(message, 'success'),
    error: (message) => toast(message, 'error'),
    info: (message) => toast(message, 'info'),
  }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="sca-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((item) => (
          <div key={item.id} className={`sca-toast sca-toast-${item.type}`} role="status">
            <span>{item.message}</span>
            <button type="button" className="sca-toast-close" onClick={() => dismiss(item.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
