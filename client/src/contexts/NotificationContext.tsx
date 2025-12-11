import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@/lib/api'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'attendance' | 'leave' | 'task'
  isRead: boolean
  createdAt: string
  actionUrl?: string
  metadata?: Record<string, any>
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  playNotificationSound: () => void
  requestPermission: () => Promise<boolean>
  showBrowserNotification: (title: string, body: string, options?: NotificationOptions) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Generate VAPID key for push notifications
const VAPID_PUBLIC_KEY = 'BKxTzQ9PJrxmOqm8K3HuGZxOYt7cL9vN2wE5rF8sA1bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2vW3xY4zA5bC6dE7f'

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
    setupPushNotifications()
    
    // Listen for real-time notifications via WebSocket or polling
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.isRead).length)
  }, [notifications])

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/api/notifications')
      if (response.data.success) {
        setNotifications(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const setupPushNotifications = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })
        
        // Send subscription to server
        await apiClient.post('/api/notifications/subscribe', {
          subscription: subscription.toJSON()
        })
      } catch (error) {
        console.error('Failed to setup push notifications:', error)
      }
    }
  }

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isRead: false
    }
    
    setNotifications(prev => [newNotification, ...prev])
    playNotificationSound()
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      showBrowserNotification(notification.title, notification.message)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/api/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const removeNotification = async (id: string) => {
    try {
      await apiClient.delete(`/api/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (error) {
      console.error('Failed to remove notification:', error)
    }
  }

  const playNotificationSound = () => {
    try {
      // Create a beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800 // Frequency in Hz
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.error('Failed to play notification sound:', error)
      // Fallback: try to use a simple beep
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
        audio.volume = 0.3
        audio.play().catch(() => {})
      } catch (fallbackError) {
        console.log('Could not play fallback notification sound')
      }
    }
  }

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  const showBrowserNotification = (title: string, body: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: 'teemplot-notification',
        requireInteraction: true,
        ...options
      })
    }
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      playNotificationSound,
      requestPermission,
      showBrowserNotification
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}