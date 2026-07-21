import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now().toString() + Math.random().toString().substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="toast-container" id="global-toast-container">
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onClose={() => removeToast(toast.id)} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto-dismiss after 3s
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${toast.type}`} id={`toast-${toast.id}`}>
      {toast.type === 'success' && <CheckCircle className="toast-icon" />}
      {toast.type === 'error' && <AlertCircle className="toast-icon" />}
      {toast.type === 'info' && <Info className="toast-icon" />}
      
      <div className="toast-content">
        {toast.message}
      </div>
      
      <button className="toast-close" onClick={onClose} aria-label="Dismiss notification">
        <X size={14} />
      </button>
    </div>
  );
}
