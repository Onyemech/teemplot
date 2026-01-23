import React, { useEffect } from 'react';
import { X, Bell, CheckCircle, AlertTriangle,  Clock } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

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
  const { user } = useUser();
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

  const showLogo = notification.data?.companyLogo && user?.companyLogo;
  const isPrompt = notification.data?.action === 'auto_clockin_prompt';

  return (
    <div 
      className="fixed bottom-4 right-4 z-[100] bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-md w-full animate-slide-up cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {showLogo ? (
            <img
              src={user!.companyLogo!}
              alt="Logo"
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
          ) : (
            getIcon()
          )}
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
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {notification.body}
          </p>
          {isPrompt && (
            <div className="mt-3">
              <button
                className="px-3 py-1.5 bg-[#0F5D5D] text-white rounded-lg text-xs font-medium hover:bg-[#0a4545]"
              >
                Clock In Now
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">
            {new Date(notification.created_at).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};
