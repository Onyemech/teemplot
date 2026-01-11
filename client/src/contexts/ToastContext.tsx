import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useMemo } from 'react';
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

const MAX_MESSAGE_LENGTH = 200;
const MAX_MESSAGES_PER_MINUTE = 3;

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = 'top-right' 
}) => {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);
  const messageTimestamps = useRef<number[]>([]);

  const sanitizeMessage = (message: string): string => {
    // Remove potential sensitive data patterns (e.g., file paths, stack traces)
    let sanitized = message
      .replace(/(\/[a-zA-Z0-9_\-.]+)+/g, '[path_hidden]') // Hide paths
      .replace(/at\s+.+:\d+:\d+/g, '[stack_trace_hidden]') // Hide stack traces
      .replace(/Code:\s*\d+/g, '') // Remove internal error codes
      .trim();

    // Truncate to max length
    if (sanitized.length > MAX_MESSAGE_LENGTH) {
      sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH) + '...';
    }

    return sanitized;
  };

  const isRateLimited = (): boolean => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Filter out old timestamps
    messageTimestamps.current = messageTimestamps.current.filter(ts => ts > oneMinuteAgo);
    
    if (messageTimestamps.current.length >= MAX_MESSAGES_PER_MINUTE) {
      return true;
    }
    
    messageTimestamps.current.push(now);
    return false;
  };

  const showToast = useCallback((rawMessage: string, type: ToastType = 'info', duration = 5000) => {
    if (isRateLimited()) {
      console.warn('Toast rate limit exceeded');
      return;
    }

    const message = sanitizeMessage(rawMessage);
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast = { id, message, type, duration, visible: true };
    
    // Log toast for audit (excluding sensitive info)
    console.log(`[Toast Audit] Type: ${type}, Time: ${new Date().toISOString()}, Message: ${message}`);

    setToasts((prev) => [...prev, newToast]);
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

  // Memoize the context value to prevent unnecessary re-renders in consumers
  const contextValue = useMemo(() => ({
    showToast,
    success,
    error,
    info,
    warning
  }), [showToast, success, error, info, warning]);

  return (
    <ToastContext.Provider value={contextValue}>
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
