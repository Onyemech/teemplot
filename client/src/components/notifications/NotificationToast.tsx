import React, { useEffect } from 'react';
import { X, Bell, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onClick: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose, onClick }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'attendance': return <Clock className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div 
      className="fixed bottom-4 right-4 z-[100] bg-white rounded-lg shadow-lg border-l-4 border-primary p-4 max-w-md w-full animate-slide-up cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">
              {notification.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="ml-2 text-gray-400 hover:text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {notification.body}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            {new Date(notification.created_at).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};
