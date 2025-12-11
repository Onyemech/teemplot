import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ToastContainer from '../components/ui/ToastContainer';
import { ToastProps, ToastType } from '../components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = 'top-right' 
}) => {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 5000) => {
    // Prevent duplicate toasts with same message and type
    setToasts((prev) => {
      const isDuplicate = prev.some(toast => 
        toast.message === message && 
        toast.type === type && 
        toast.visible
      );
      
      if (isDuplicate) {
        return prev; // Don't add duplicate
      }
      
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast = { id, message, type, duration, visible: true };
      
      // Limit to maximum 5 toasts to prevent accumulation
      const updatedToasts = [...prev, newToast];
      if (updatedToasts.length > 5) {
        return updatedToasts.slice(-5); // Keep only the last 5
      }
      
      return updatedToasts;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, duration = 5000) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration = 5000) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration = 5000) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration = 5000) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} position={position} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
