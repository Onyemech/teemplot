import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Check, Clock, AlertTriangle, Bell, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '@/components/notifications/NotificationToast';

interface NotificationListProps {
  onClose: () => void;
}

import { useUser } from '@/contexts/UserContext';

export const NotificationList: React.FC<NotificationListProps> = ({ onClose }) => {
  const { notifications, unreadCount, markAllAsRead, markAsRead, isLoading } = useNotifications();
  const { user } = useUser();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    onClose();

    if (notification.data?.url) {
      navigate(notification.data.url);
    } else if (notification.type === 'attendance' || notification.type === 'early_departure' || notification.type === 'geofence_violation') {
      navigate('/dashboard/attendance');
    } else if (notification.type === 'leave') {
      navigate('/dashboard/leave/requests');
    } else if (notification.type === 'task') {
      navigate('/dashboard/tasks/status');
    } else if (notification.type === 'invitation') {
      navigate('/dashboard/attendance/invites');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
      case 'early_departure':
      case 'geofence_violation':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'attendance': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="w-80 max-h-[480px] flex flex-col bg-white rounded-lg shadow-xl border border-gray-200">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''
                  }`}
              >
                <div className="flex gap-3">
                  <div className={`mt-1 flex-shrink-0 ${!notification.is_read ? 'text-primary' : 'text-gray-400'}`}>
                    {notification.data?.companyLogo && user?.companyLogo ? (
                      <img
                        src={user.companyLogo}
                        alt="Logo"
                        className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      getIcon(notification.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="flex-shrink-0 mt-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 bg-gray-50 text-center rounded-b-lg">
        <button
          onClick={() => {/* Navigate to full list if implemented */ }}
          className="text-xs font-medium text-gray-600 hover:text-primary transition-colors"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
};
