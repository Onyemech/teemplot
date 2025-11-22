import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id?: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  visible?: boolean;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  visible = true,
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-white flex-shrink-0" />,
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2 rounded-lg
        bg-[#0F5D5D]
        shadow-sm
        min-w-[320px] max-w-md
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      {/* Icon */}
      {icons[type]}

      {/* Message */}
      <p className="flex-1 text-sm font-semibold text-white">
        {message}
      </p>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-md hover:bg-gray-600 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-[#FF5722]" />
      </button>
    </div>
  );
};

export default Toast;
