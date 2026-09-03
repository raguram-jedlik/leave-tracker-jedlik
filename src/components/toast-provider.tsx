'use client';

import { useState, useEffect, createContext, useContext } from 'react';

interface ToastData {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastData['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = (type: ToastData['type'], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container — bottom on mobile (thumb reach), top-right on desktop */}
      <div
        aria-live="polite"
        className="fixed inset-x-0 bottom-3 z-[60] flex flex-col items-stretch gap-2 px-3 sm:inset-auto sm:left-auto sm:right-4 sm:top-4 sm:items-end sm:px-0 pointer-events-none"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const className = `toast toast-${toast.type} animate-[slideUp_300ms_ease] sm:animate-[slideIn_300ms_ease]`;

  return (
    <div className={className} onClick={onClose} role="status">
      <span>{toast.message}</span>
    </div>
  );
}
