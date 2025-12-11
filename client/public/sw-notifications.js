// Service Worker for PWA Notifications
const CACHE_NAME = 'teemplot-notifications-v1'

// Install event
self.addEventListener('install', (event) => {
  console.log('Notification Service Worker installed')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Notification Service Worker activated')
  event.waitUntil(self.clients.claim())
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)
  
  let notificationData = {
    title: 'Teemplot Notification',
    body: 'You have a new notification',
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: 'teemplot-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ],
    data: {
      url: '/dashboard/notifications'
    }
  }

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json()
      notificationData = {
        ...notificationData,
        ...pushData
      }
    } catch (error) {
      console.error('Error parsing push data:', error)
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()

  const action = event.action
  const notificationData = event.notification.data || {}
  
  if (action === 'dismiss') {
    return
  }

  // Default action or 'view' action
  const urlToOpen = notificationData.url || '/dashboard/notifications'
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus()
          }
        }
        
        // If no existing window/tab, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-notifications') {
    event.waitUntil(syncNotifications())
  }
})

async function syncNotifications() {
  try {
    // Sync any pending notifications when back online
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // Show any new notifications that came while offline
      if (data.notifications && data.notifications.length > 0) {
        for (const notification of data.notifications) {
          await self.registration.showNotification(notification.title, {
            body: notification.message,
            icon: '/logo-192.png',
            badge: '/logo-192.png',
            tag: `notification-${notification.id}`,
            data: {
              id: notification.id,
              url: notification.actionUrl || '/dashboard/notifications'
            }
          })
        }
      }
    }
  } catch (error) {
    console.error('Error syncing notifications:', error)
  }
}

// Handle message from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})