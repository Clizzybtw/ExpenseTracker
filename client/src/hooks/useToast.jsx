import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, opts = {}) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, tone: opts.tone || 'ok', action: opts.action }]);
      setTimeout(() => dismiss(id), opts.duration ?? 5000);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push, dismiss, toasts }}>{children}</ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
