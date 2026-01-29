import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { API_ENDPOINTS, buildApiUrl } from '@/utils/apiHelpers';
import { apiClient } from '@/lib/api';
import { useUser } from './UserContext';
import { Notification, NotificationToast } from '@/components/notifications/NotificationToast';
import { useNavigate } from 'react-router-dom';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: (page?: number) => Promise<void>;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      connectToSSE();
    } else {
      disconnectSSE();
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => disconnectSSE();
  }, [user]);

  const connectToSSE = () => {
    if (eventSourceRef.current) return;

    const url = buildApiUrl(API_ENDPOINTS.NOTIFICATIONS.STREAM);

    try {
      const eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onopen = () => {
        console.log('✅ SSE Connected - Real-time notifications enabled');
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        // Keep alive ping
        if (event.data === ': keepalive') return;

        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') return;

          handleNewNotification(data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.warn('⚠️ SSE Connection error - Real-time notifications disabled', error);
        eventSource.close();
        setIsConnected(false);
        eventSourceRef.current = null;

        // Don't retry on errors - silently fail
        // The app will continue to work without real-time notifications
        // User can still see notifications by refreshing or navigating to notification page
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.warn('⚠️ SSE initialization failed - Real-time notifications disabled', error);
      setIsConnected(false);
    }
  };

  const disconnectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  };

  const handleNewNotification = (notification: Notification) => {
    // Play sound
    playBeep();

    // Show toast
    setActiveToast(notification);

    // Update state
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // Enterprise "Ping" Sound
      oscillator.type = 'sine';
      
      // First tone (higher pitch)
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      // Quick decay
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  const fetchNotifications = async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/api/notifications?page=${page}`);
      const data = res.data;
      if (page === 1) {
        setNotifications(data.data.items);
      } else {
        setNotifications(prev => [...prev, ...data.data.items]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await apiClient.get('/api/notifications/unread-count');
      setUnreadCount(res.data.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleToastClick = () => {
    if (!activeToast) return;

    // Mark as read
    markAsRead(activeToast.id);

    // Navigate based on type/data
    if (activeToast.data?.url) {
      navigate(activeToast.data.url);
    } else if (activeToast.type === 'attendance' || activeToast.type === 'early_departure' || activeToast.type === 'geofence_violation') {
      navigate('/dashboard/attendance');
    } else if (activeToast.type === 'leave') {
      navigate('/dashboard/leave/requests');
    } else if (activeToast.type === 'task') {
      navigate('/dashboard/tasks/status');
    } else if (activeToast.type === 'invitation') {
      navigate('/dashboard/attendance/invites');
    }

    setActiveToast(null);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      fetchNotifications,
      isConnected
    }}>
      {children}
      {activeToast && (
        <NotificationToast
          notification={activeToast}
          onClose={() => setActiveToast(null)}
          onClick={handleToastClick}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
